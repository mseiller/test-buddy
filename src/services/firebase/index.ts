/**
 * Firebase Services Index
 * Central export point for all Firebase utilities
 */

export { CentralizedFirebaseService } from './CentralizedFirebaseService';
export { FirebaseError, FirebaseErrorCode } from './FirebaseError';
export { FirebaseRetry, DEFAULT_RETRY_OPTIONS } from './FirebaseRetry';
export { FirebaseValidation } from './FirebaseValidation';

export type { RetryOptions } from './FirebaseRetry';
export type { PaginationOptions, QueryOptions } from './CentralizedFirebaseService';

// Re-export the centralized service as the default Firebase service
export { CentralizedFirebaseService as FirebaseService } from './CentralizedFirebaseService';
