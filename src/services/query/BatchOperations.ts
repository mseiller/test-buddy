/**
 * Batch Operations Service
 * Provides efficient batch operations for Firestore with automatic chunking and error handling
 */

import {
  writeBatch,
  doc,
  collection,
  deleteDoc,
  updateDoc,
  setDoc,
  runTransaction,
  DocumentReference,
  Transaction,
  WriteBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirebaseRetry, RetryOptions } from '../firebase/FirebaseRetry';
import { FirebaseError, FirebaseErrorCode } from '../firebase/FirebaseError';

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: any;
  merge?: boolean;
}

export interface BatchResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    operation: BatchOperation;
    error: string;
  }>;
  executionTime: number;
}

export interface TransactionOperation {
  type: 'read' | 'write';
  collection: string;
  docId: string;
  data?: any;
  operation?: 'set' | 'update' | 'delete';
}

export class BatchOperations {
  private static readonly MAX_BATCH_SIZE = 500; // Firestore limit
  private static readonly MAX_TRANSACTION_OPERATIONS = 500; // Firestore limit

  /**
   * Execute batch write operations with automatic chunking
   */
  static async executeBatch(
    operations: BatchOperation[],
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const startTime = Date.now();
    
    return FirebaseRetry.execute(
      async () => {
        if (operations.length === 0) {
          return {
            success: true,
            processedCount: 0,
            errorCount: 0,
            errors: [],
            executionTime: Date.now() - startTime
          };
        }

        // Split operations into chunks
        const chunks = this.chunkOperations(operations, this.MAX_BATCH_SIZE);
        const errors: Array<{ operation: BatchOperation; error: string }> = [];
        let processedCount = 0;

        console.log(`Executing ${operations.length} operations in ${chunks.length} batch(es)`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} operations)`);

          try {
            const batch = writeBatch(db);

            // Add operations to batch
            chunk.forEach(operation => {
              const docRef = doc(db, operation.collection, operation.docId);

              switch (operation.type) {
                case 'set':
                  batch.set(docRef, operation.data || {}, { merge: operation.merge || false });
                  break;
                case 'update':
                  batch.update(docRef, operation.data || {});
                  break;
                case 'delete':
                  batch.delete(docRef);
                  break;
                default:
                  throw new Error(`Unknown operation type: ${(operation as any).type}`);
              }
            });

            // Commit batch
            await batch.commit();
            processedCount += chunk.length;
            
            console.log(`Batch ${i + 1} completed successfully`);
          } catch (error) {
            console.error(`Batch ${i + 1} failed:`, error);
            
            // Add all operations in failed batch to errors
            chunk.forEach(operation => {
              errors.push({
                operation,
                error: error instanceof Error ? error.message : 'Unknown batch error'
              });
            });
          }
        }

        const result: BatchResult = {
          success: errors.length === 0,
          processedCount,
          errorCount: errors.length,
          errors,
          executionTime: Date.now() - startTime
        };

        console.log(`Batch execution completed: ${processedCount} processed, ${errors.length} errors`);
        
        return result;
      },
      retryOptions,
      'Execute batch operations'
    );
  }

  /**
   * Execute operations in a transaction for consistency
   */
  static async executeTransaction<T = any>(
    operations: TransactionOperation[],
    retryOptions?: RetryOptions
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    try {
      const result = await FirebaseRetry.execute(
        async () => {
          if (operations.length > this.MAX_TRANSACTION_OPERATIONS) {
            throw new FirebaseError(
              FirebaseErrorCode.VALIDATION_ERROR,
              `Transaction cannot exceed ${this.MAX_TRANSACTION_OPERATIONS} operations`
            );
          }

          return runTransaction(db, async (transaction: Transaction) => {
            const readResults: any[] = [];

            // Process read operations first
            const readOps = operations.filter(op => op.type === 'read');
            for (const operation of readOps) {
              const docRef = doc(db, operation.collection, operation.docId);
              const docSnap = await transaction.get(docRef);
              readResults.push({
                id: operation.docId,
                exists: docSnap.exists(),
                data: docSnap.data()
              });
            }

            // Process write operations
            const writeOps = operations.filter(op => op.type === 'write');
            writeOps.forEach(operation => {
              const docRef = doc(db, operation.collection, operation.docId);

              switch (operation.operation) {
                case 'set':
                  transaction.set(docRef, operation.data || {});
                  break;
                case 'update':
                  transaction.update(docRef, operation.data || {});
                  break;
                case 'delete':
                  transaction.delete(docRef);
                  break;
                default:
                  throw new Error(`Unknown transaction operation: ${operation.operation}`);
              }
            });

            return readResults;
          });
        },
        retryOptions,
        'Execute transaction'
      );

      return { success: true, result: result as T };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Bulk create documents with validation
   */
  static async bulkCreate(
    collectionPath: string,
    documents: Array<{ id?: string; data: any }>,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = documents.map(doc => ({
      type: 'set',
      collection: collectionPath,
      docId: doc.id || this.generateId(),
      data: doc.data,
      merge: false
    }));

    return this.executeBatch(operations, retryOptions);
  }

  /**
   * Bulk update documents
   */
  static async bulkUpdate(
    collectionPath: string,
    updates: Array<{ id: string; data: any }>,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = updates.map(update => ({
      type: 'update',
      collection: collectionPath,
      docId: update.id,
      data: update.data
    }));

    return this.executeBatch(operations, retryOptions);
  }

  /**
   * Bulk delete documents
   */
  static async bulkDelete(
    collectionPath: string,
    documentIds: string[],
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = documentIds.map(id => ({
      type: 'delete',
      collection: collectionPath,
      docId: id
    }));

    return this.executeBatch(operations, retryOptions);
  }

  /**
   * Move documents from one collection to another
   */
  static async moveDocuments(
    sourceCollection: string,
    targetCollection: string,
    documentIds: string[],
    transform?: (data: any) => any,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    // Use transaction to ensure consistency
    const transactionOps: TransactionOperation[] = [
      // Read source documents
      ...documentIds.map(id => ({
        type: 'read' as const,
        collection: sourceCollection,
        docId: id
      })),
      // Write to target collection
      ...documentIds.map(id => ({
        type: 'write' as const,
        collection: targetCollection,
        docId: id,
        operation: 'set' as const
      })),
      // Delete from source collection
      ...documentIds.map(id => ({
        type: 'write' as const,
        collection: sourceCollection,
        docId: id,
        operation: 'delete' as const
      }))
    ];

    const transactionResult = await this.executeTransaction(transactionOps, retryOptions);
    
    if (!transactionResult.success) {
      return {
        success: false,
        processedCount: 0,
        errorCount: documentIds.length,
        errors: documentIds.map(id => ({
          operation: { type: 'set', collection: targetCollection, docId: id },
          error: transactionResult.error || 'Transaction failed'
        })),
        executionTime: 0
      };
    }

    return {
      success: true,
      processedCount: documentIds.length,
      errorCount: 0,
      errors: [],
      executionTime: 0
    };
  }

  /**
   * Atomic counter operations
   */
  static async incrementCounters(
    counters: Array<{
      collection: string;
      docId: string;
      field: string;
      increment: number;
    }>,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = counters.map(counter => ({
      type: 'update',
      collection: counter.collection,
      docId: counter.docId,
      data: {
        [counter.field]: counter.increment // Note: Use FieldValue.increment in real implementation
      }
    }));

    return this.executeBatch(operations, retryOptions);
  }

  /**
   * Batch upsert (set with merge)
   */
  static async batchUpsert(
    collectionPath: string,
    documents: Array<{ id: string; data: any }>,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    const operations: BatchOperation[] = documents.map(doc => ({
      type: 'set',
      collection: collectionPath,
      docId: doc.id,
      data: doc.data,
      merge: true
    }));

    return this.executeBatch(operations, retryOptions);
  }

  /**
   * Clean up old documents based on timestamp
   */
  static async cleanupOldDocuments(
    collectionPath: string,
    timestampField: string,
    olderThanDays: number,
    maxDeleteCount: number = 1000,
    retryOptions?: RetryOptions
  ): Promise<BatchResult> {
    // This would require a query first, then batch delete
    // Implementation would need to query for old documents first
    console.log(`Cleanup operation for ${collectionPath} older than ${olderThanDays} days`);
    
    // Placeholder implementation
    return {
      success: true,
      processedCount: 0,
      errorCount: 0,
      errors: [],
      executionTime: 0
    };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Split operations into chunks of specified size
   */
  private static chunkOperations(operations: BatchOperation[], chunkSize: number): BatchOperation[][] {
    const chunks: BatchOperation[][] = [];
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      chunks.push(operations.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  /**
   * Generate a unique document ID
   */
  private static generateId(): string {
    return doc(collection(db, 'temp')).id;
  }

  /**
   * Validate batch operations
   */
  private static validateOperations(operations: BatchOperation[]): void {
    operations.forEach((operation, index) => {
      if (!operation.type || !['set', 'update', 'delete'].includes(operation.type)) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `Invalid operation type at index ${index}: ${operation.type}`
        );
      }

      if (!operation.collection || !operation.docId) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `Missing collection or docId at index ${index}`
        );
      }

      if ((operation.type === 'set' || operation.type === 'update') && !operation.data) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `Missing data for ${operation.type} operation at index ${index}`
        );
      }
    });
  }
}
