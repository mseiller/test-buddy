/**
 * Firebase Retry Logic
 * Provides consistent retry behavior for Firebase operations
 */

import { FirebaseError } from './FirebaseError';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  timeout?: number;
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffFactor: 2,
  jitter: true,
  timeout: 60000,     // 60 seconds
};

export class FirebaseRetry {
  /**
   * Execute an operation with retry logic
   */
  static async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    operationName: string = 'Firebase operation'
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;
    
    // Set up timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new FirebaseError(
          'timeout-error' as any,
          `${operationName} timed out after ${config.timeout}ms`
        ));
      }, config.timeout);
    });
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`${operationName}: Attempt ${attempt}/${config.maxAttempts}`);
        
        // Race between the operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);
        
        if (attempt > 1) {
          console.log(`${operationName}: Succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Convert to FirebaseError if it isn't already
        const firebaseError = error instanceof FirebaseError 
          ? error 
          : FirebaseError.fromFirebaseError(error, { operationName, attempt });
        
        console.error(`${operationName}: Failed on attempt ${attempt}/${config.maxAttempts}:`, {
          code: firebaseError.code,
          message: firebaseError.message,
          retryable: firebaseError.retryable
        });
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt >= config.maxAttempts || !firebaseError.retryable) {
          throw firebaseError;
        }
        
        // Calculate delay with exponential backoff and optional jitter
        const baseDelay = Math.min(
          config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        const delay = config.jitter 
          ? baseDelay + Math.random() * baseDelay * 0.1 // Add up to 10% jitter
          : baseDelay;
        
        console.log(`${operationName}: Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
  }
  
  /**
   * Execute multiple operations in parallel with individual retry logic
   */
  static async executeParallel<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      options?: RetryOptions;
    }>
  ): Promise<T[]> {
    const promises = operations.map(({ operation, name, options }) =>
      this.execute(operation, options, name)
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Execute operations in sequence with retry logic
   */
  static async executeSequence<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      options?: RetryOptions;
    }>
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (const { operation, name, options } of operations) {
      const result = await this.execute(operation, options, name);
      results.push(result);
    }
    
    return results;
  }
}
