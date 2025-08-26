/**
 * Advanced Transaction Manager
 * Provides sophisticated transaction support with rollback capabilities,
 * distributed locking, and advanced error handling
 */

import {
  runTransaction,
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Transaction,
  DocumentReference,
  DocumentSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirebaseError, FirebaseErrorCode } from '../firebase/FirebaseError';
import { FirebaseRetry, RetryOptions } from '../firebase/FirebaseRetry';

export interface TransactionStep {
  id: string;
  type: 'read' | 'write' | 'validate' | 'compensate';
  collection: string;
  docId: string;
  operation?: 'set' | 'update' | 'delete' | 'increment';
  data?: any;
  condition?: (snapshot: DocumentSnapshot) => boolean;
  compensationData?: any;
  rollbackOperation?: 'set' | 'update' | 'delete';
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackExecuted?: boolean;
  failedStep?: string;
  executedSteps: string[];
  executionTime: number;
}

export interface DistributedLock {
  lockId: string;
  resource: string;
  ownerId: string;
  expiresAt: Date;
  acquiredAt: Date;
}

export interface TransactionOptions {
  retryOptions?: RetryOptions;
  enableRollback?: boolean;
  distributedLock?: {
    resource: string;
    ttl?: number; // milliseconds
    retryInterval?: number;
    maxRetries?: number;
  };
  timeout?: number;
  isolationLevel?: 'read-uncommitted' | 'read-committed' | 'repeatable-read';
}

export class TransactionManager {
  private static readonly DEFAULT_LOCK_TTL = 30000; // 30 seconds
  private static readonly DEFAULT_LOCK_RETRY_INTERVAL = 100; // 100ms
  private static readonly DEFAULT_LOCK_MAX_RETRIES = 100; // 10 seconds total
  private static readonly TRANSACTION_TIMEOUT = 60000; // 60 seconds

  /**
   * Execute a complex transaction with rollback support
   */
  static async executeAdvancedTransaction<T = any>(
    steps: TransactionStep[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const executedSteps: string[] = [];
    let rollbackExecuted = false;

    try {
      // Acquire distributed lock if specified
      let lockId: string | null = null;
      if (options.distributedLock) {
        lockId = await this.acquireDistributedLock(
          options.distributedLock.resource,
          options.distributedLock.ttl || this.DEFAULT_LOCK_TTL,
          options.distributedLock.retryInterval || this.DEFAULT_LOCK_RETRY_INTERVAL,
          options.distributedLock.maxRetries || this.DEFAULT_LOCK_MAX_RETRIES
        );
      }

      try {
        const result = await FirebaseRetry.execute(
          async () => {
            return runTransaction(db, async (transaction: Transaction) => {
              const readResults: any[] = [];
              const writeOperations: Array<() => void> = [];

              // Phase 1: Execute reads and validations
              for (const step of steps) {
                if (step.type === 'read' || step.type === 'validate') {
                  const docRef = doc(db, step.collection, step.docId);
                  const docSnap = await transaction.get(docRef);

                  if (step.type === 'validate' && step.condition) {
                    if (!step.condition(docSnap)) {
                      throw new FirebaseError(
                        FirebaseErrorCode.FIRESTORE_FAILED_PRECONDITION,
                        `Validation failed for step ${step.id}: condition not met`
                      );
                    }
                  }

                  if (step.type === 'read') {
                    readResults.push({
                      stepId: step.id,
                      id: step.docId,
                      exists: docSnap.exists(),
                      data: docSnap.data()
                    });
                  }

                  executedSteps.push(step.id);
                }
              }

              // Phase 2: Prepare write operations
              for (const step of steps) {
                if (step.type === 'write') {
                  const docRef = doc(db, step.collection, step.docId);

                  writeOperations.push(() => {
                    switch (step.operation) {
                      case 'set':
                        transaction.set(docRef, {
                          ...step.data,
                          updatedAt: serverTimestamp()
                        });
                        break;
                      case 'update':
                        transaction.update(docRef, {
                          ...step.data,
                          updatedAt: serverTimestamp()
                        });
                        break;
                      case 'delete':
                        transaction.delete(docRef);
                        break;
                      case 'increment':
                        // Note: In real implementation, use FieldValue.increment
                        const currentDoc = readResults.find(r => r.id === step.docId);
                        const currentValue = currentDoc?.data?.[Object.keys(step.data)[0]] || 0;
                        const incrementValue = Object.values(step.data)[0] as number;
                        transaction.update(docRef, {
                          [Object.keys(step.data)[0]]: currentValue + incrementValue,
                          updatedAt: serverTimestamp()
                        });
                        break;
                      default:
                        throw new Error(`Unknown write operation: ${step.operation}`);
                    }
                  });

                  executedSteps.push(step.id);
                }
              }

              // Phase 3: Execute all write operations
              writeOperations.forEach(operation => operation());

              return { readResults, executedSteps };
            });
          },
          options.retryOptions,
          'Advanced transaction'
        );

        return {
          success: true,
          data: result as T,
          executedSteps,
          executionTime: Date.now() - startTime
        };
      } finally {
        // Release distributed lock
        if (lockId) {
          await this.releaseDistributedLock(lockId);
        }
      }
    } catch (error) {
      console.error('Transaction failed:', error);

      // Execute rollback if enabled
      if (options.enableRollback && executedSteps.length > 0) {
        try {
          await this.executeRollback(steps, executedSteps);
          rollbackExecuted = true;
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
        rollbackExecuted,
        failedStep: executedSteps[executedSteps.length - 1],
        executedSteps,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute rollback operations for failed transaction
   */
  private static async executeRollback(
    originalSteps: TransactionStep[],
    executedStepIds: string[]
  ): Promise<void> {
    console.log('Executing transaction rollback...');

    const rollbackSteps = originalSteps
      .filter(step => executedStepIds.includes(step.id) && step.type === 'write')
      .reverse() // Execute in reverse order
      .map(step => ({
        ...step,
        type: 'compensate' as const,
        operation: step.rollbackOperation || this.getInverseOperation(step.operation!),
        data: step.compensationData || this.getCompensationData(step)
      }));

    if (rollbackSteps.length === 0) {
      return;
    }

    await runTransaction(db, async (transaction: Transaction) => {
      for (const step of rollbackSteps) {
        const docRef = doc(db, step.collection, step.docId);

        switch (step.operation) {
          case 'set':
            transaction.set(docRef, step.data);
            break;
          case 'update':
            transaction.update(docRef, step.data);
            break;
          case 'delete':
            transaction.delete(docRef);
            break;
        }
      }
    });

    console.log(`Rollback completed for ${rollbackSteps.length} operations`);
  }

  /**
   * Acquire distributed lock for resource
   */
  private static async acquireDistributedLock(
    resource: string,
    ttl: number,
    retryInterval: number,
    maxRetries: number
  ): Promise<string> {
    const lockId = this.generateLockId();
    const ownerId = this.getOwnerId();
    const expiresAt = new Date(Date.now() + ttl);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const lockDoc = doc(db, 'distributed_locks', resource);
        const existingLock = await getDoc(lockDoc);

        if (existingLock.exists()) {
          const lockData = existingLock.data() as DistributedLock;
          
          // Check if lock has expired
          const expiresAt = lockData.expiresAt instanceof Date 
            ? lockData.expiresAt 
            : (lockData.expiresAt as any)?.toDate ? (lockData.expiresAt as any).toDate() : new Date(lockData.expiresAt);
          if (new Date() > expiresAt) {
            // Lock expired, we can acquire it
            await updateDoc(lockDoc, {
              lockId,
              ownerId,
              expiresAt,
              acquiredAt: new Date()
            });
            
            console.log(`Acquired expired lock for resource: ${resource}`);
            return lockId;
          }

          // Lock still valid, wait and retry
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            continue;
          } else {
            throw new FirebaseError(
              FirebaseErrorCode.FIRESTORE_RESOURCE_EXHAUSTED,
              `Could not acquire lock for resource: ${resource} after ${maxRetries} attempts`
            );
          }
        } else {
          // No existing lock, acquire it
          await setDoc(lockDoc, {
            lockId,
            resource,
            ownerId,
            expiresAt,
            acquiredAt: new Date()
          });
          
          console.log(`Acquired new lock for resource: ${resource}`);
          return lockId;
        }
      } catch (error) {
        if (attempt === maxRetries - 1) {
                  throw new FirebaseError(
          FirebaseErrorCode.FIRESTORE_RESOURCE_EXHAUSTED,
          `Failed to acquire lock for resource: ${resource}`
        );
        }
        
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    throw new FirebaseError(
      FirebaseErrorCode.FIRESTORE_RESOURCE_EXHAUSTED,
      `Could not acquire lock for resource: ${resource}`
    );
  }

  /**
   * Release distributed lock
   */
  private static async releaseDistributedLock(lockId: string): Promise<void> {
    try {
      // Find and delete the lock document
      // In a real implementation, you'd query by lockId
      const lockDoc = doc(db, 'distributed_locks', lockId);
      await deleteDoc(lockDoc);
      
      console.log(`Released lock: ${lockId}`);
    } catch (error) {
      console.error('Failed to release lock:', error);
      // Don't throw - lock will expire naturally
    }
  }

  /**
   * Create saga pattern transaction with compensation
   */
  static async executeSaga<T = any>(
    steps: TransactionStep[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const executedSteps: string[] = [];
    const compensationStack: TransactionStep[] = [];

    try {
      // Execute steps sequentially
      for (const step of steps) {
        try {
          await this.executeSingleStep(step);
          executedSteps.push(step.id);
          
          // Add to compensation stack if it's a write operation
          if (step.type === 'write') {
            compensationStack.unshift(step); // Add to front for reverse order
          }
        } catch (error) {
          console.error(`Saga step ${step.id} failed:`, error);
          
          // Execute compensation for all completed steps
          if (options.enableRollback && compensationStack.length > 0) {
            await this.executeCompensation(compensationStack);
          }
          
          throw error;
        }
      }

      return {
        success: true,
        executedSteps,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Saga failed',
        rollbackExecuted: options.enableRollback && compensationStack.length > 0,
        executedSteps,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute single transaction step
   */
  private static async executeSingleStep(step: TransactionStep): Promise<any> {
    const docRef = doc(db, step.collection, step.docId);

    switch (step.type) {
      case 'read':
        const docSnap = await getDoc(docRef);
        return docSnap.data();
      
      case 'write':
        switch (step.operation) {
          case 'set':
            await setDoc(docRef, step.data);
            break;
          case 'update':
            await updateDoc(docRef, step.data);
            break;
          case 'delete':
            await deleteDoc(docRef);
            break;
        }
        break;
      
      case 'validate':
        const validateSnap = await getDoc(docRef);
        if (step.condition && !step.condition(validateSnap)) {
          throw new Error(`Validation failed for step ${step.id}`);
        }
        break;
    }
  }

  /**
   * Execute compensation operations
   */
  private static async executeCompensation(compensationStack: TransactionStep[]): Promise<void> {
    console.log('Executing saga compensation...');

    for (const step of compensationStack) {
      try {
        const compensationStep: TransactionStep = {
          ...step,
          id: `${step.id}_compensation`,
          operation: step.rollbackOperation || this.getInverseOperation(step.operation!),
          data: step.compensationData || this.getCompensationData(step)
        };

        await this.executeSingleStep(compensationStep);
      } catch (error) {
        console.error(`Compensation failed for step ${step.id}:`, error);
        // Continue with other compensations
      }
    }

    console.log(`Compensation completed for ${compensationStack.length} operations`);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private static getInverseOperation(operation: string): 'set' | 'update' | 'delete' {
    switch (operation) {
      case 'set':
      case 'update':
        return 'delete'; // Default inverse
      case 'delete':
        return 'set';
      default:
        return 'delete';
    }
  }

  private static getCompensationData(step: TransactionStep): any {
    // In a real implementation, this would contain the original data
    // before the operation was executed
    return {};
  }

  private static generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private static getOwnerId(): string {
    // In a real implementation, this would be the instance/process ID
    return `process_${Date.now()}`;
  }

  /**
   * Health check for transaction system
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      // Test basic transaction
      const testSteps: TransactionStep[] = [
        {
          id: 'health_check',
          type: 'read',
          collection: 'health_checks',
          docId: 'test'
        }
      ];

      const result = await this.executeAdvancedTransaction(testSteps, {
        retryOptions: { maxAttempts: 1, timeout: 5000 }
      });

      return {
        status: result.success ? 'healthy' : 'unhealthy',
        details: result.success 
          ? 'Transaction system is working correctly'
          : `Transaction system error: ${result.error}`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Transaction health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
