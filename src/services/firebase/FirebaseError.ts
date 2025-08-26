/**
 * Custom Firebase Error Classes
 * Provides structured error handling for different Firebase operation types
 */

export enum FirebaseErrorCode {
  // Authentication Errors
  AUTH_USER_NOT_FOUND = 'auth/user-not-found',
  AUTH_WRONG_PASSWORD = 'auth/wrong-password',
  AUTH_EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD = 'auth/weak-password',
  AUTH_INVALID_EMAIL = 'auth/invalid-email',
  AUTH_USER_DISABLED = 'auth/user-disabled',
  AUTH_TOO_MANY_REQUESTS = 'auth/too-many-requests',
  
  // Firestore Errors
  FIRESTORE_PERMISSION_DENIED = 'permission-denied',
  FIRESTORE_UNAVAILABLE = 'unavailable',
  FIRESTORE_NOT_FOUND = 'not-found',
  FIRESTORE_ALREADY_EXISTS = 'already-exists',
  FIRESTORE_RESOURCE_EXHAUSTED = 'resource-exhausted',
  FIRESTORE_FAILED_PRECONDITION = 'failed-precondition',
  FIRESTORE_ABORTED = 'aborted',
  FIRESTORE_OUT_OF_RANGE = 'out-of-range',
  FIRESTORE_UNIMPLEMENTED = 'unimplemented',
  FIRESTORE_INTERNAL = 'internal',
  FIRESTORE_DATA_LOSS = 'data-loss',
  FIRESTORE_UNAUTHENTICATED = 'unauthenticated',
  
  // Network Errors
  NETWORK_ERROR = 'network-error',
  TIMEOUT_ERROR = 'timeout-error',
  
  // Validation Errors
  VALIDATION_ERROR = 'validation-error',
  
  // Unknown Error
  UNKNOWN_ERROR = 'unknown-error'
}

export class FirebaseError extends Error {
  public readonly code: FirebaseErrorCode;
  public readonly originalError?: any;
  public readonly context?: Record<string, any>;
  public readonly retryable: boolean;
  
  constructor(
    code: FirebaseErrorCode,
    message: string,
    originalError?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'FirebaseError';
    this.code = code;
    this.originalError = originalError;
    this.context = context;
    this.retryable = this.isRetryable(code);
  }
  
  private isRetryable(code: FirebaseErrorCode): boolean {
    const retryableCodes = [
      FirebaseErrorCode.FIRESTORE_UNAVAILABLE,
      FirebaseErrorCode.FIRESTORE_RESOURCE_EXHAUSTED,
      FirebaseErrorCode.FIRESTORE_ABORTED,
      FirebaseErrorCode.FIRESTORE_INTERNAL,
      FirebaseErrorCode.NETWORK_ERROR,
      FirebaseErrorCode.TIMEOUT_ERROR,
      FirebaseErrorCode.AUTH_TOO_MANY_REQUESTS
    ];
    return retryableCodes.includes(code);
  }
  
  static fromFirebaseError(error: any, context?: Record<string, any>): FirebaseError {
    const code = error.code as string;
    const message = error.message || 'An unknown Firebase error occurred';
    
    // Map Firebase error codes to our custom error codes
    const errorCodeMap: Record<string, FirebaseErrorCode> = {
      // Auth errors
      'auth/user-not-found': FirebaseErrorCode.AUTH_USER_NOT_FOUND,
      'auth/wrong-password': FirebaseErrorCode.AUTH_WRONG_PASSWORD,
      'auth/email-already-in-use': FirebaseErrorCode.AUTH_EMAIL_ALREADY_IN_USE,
      'auth/weak-password': FirebaseErrorCode.AUTH_WEAK_PASSWORD,
      'auth/invalid-email': FirebaseErrorCode.AUTH_INVALID_EMAIL,
      'auth/user-disabled': FirebaseErrorCode.AUTH_USER_DISABLED,
      'auth/too-many-requests': FirebaseErrorCode.AUTH_TOO_MANY_REQUESTS,
      
      // Firestore errors
      'permission-denied': FirebaseErrorCode.FIRESTORE_PERMISSION_DENIED,
      'unavailable': FirebaseErrorCode.FIRESTORE_UNAVAILABLE,
      'not-found': FirebaseErrorCode.FIRESTORE_NOT_FOUND,
      'already-exists': FirebaseErrorCode.FIRESTORE_ALREADY_EXISTS,
      'resource-exhausted': FirebaseErrorCode.FIRESTORE_RESOURCE_EXHAUSTED,
      'failed-precondition': FirebaseErrorCode.FIRESTORE_FAILED_PRECONDITION,
      'aborted': FirebaseErrorCode.FIRESTORE_ABORTED,
      'out-of-range': FirebaseErrorCode.FIRESTORE_OUT_OF_RANGE,
      'unimplemented': FirebaseErrorCode.FIRESTORE_UNIMPLEMENTED,
      'internal': FirebaseErrorCode.FIRESTORE_INTERNAL,
      'data-loss': FirebaseErrorCode.FIRESTORE_DATA_LOSS,
      'unauthenticated': FirebaseErrorCode.FIRESTORE_UNAUTHENTICATED,
    };
    
    const mappedCode = errorCodeMap[code] || FirebaseErrorCode.UNKNOWN_ERROR;
    
    return new FirebaseError(mappedCode, message, error, context);
  }
  
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case FirebaseErrorCode.AUTH_USER_NOT_FOUND:
        return 'No account found with this email address.';
      case FirebaseErrorCode.AUTH_WRONG_PASSWORD:
        return 'Incorrect password. Please try again.';
      case FirebaseErrorCode.AUTH_EMAIL_ALREADY_IN_USE:
        return 'An account with this email already exists.';
      case FirebaseErrorCode.AUTH_WEAK_PASSWORD:
        return 'Password is too weak. Please choose a stronger password.';
      case FirebaseErrorCode.AUTH_INVALID_EMAIL:
        return 'Please enter a valid email address.';
      case FirebaseErrorCode.AUTH_USER_DISABLED:
        return 'This account has been disabled. Please contact support.';
      case FirebaseErrorCode.AUTH_TOO_MANY_REQUESTS:
        return 'Too many failed attempts. Please try again later.';
      case FirebaseErrorCode.FIRESTORE_PERMISSION_DENIED:
        return 'You don\'t have permission to perform this action.';
      case FirebaseErrorCode.FIRESTORE_UNAVAILABLE:
        return 'Service temporarily unavailable. Please try again.';
      case FirebaseErrorCode.FIRESTORE_NOT_FOUND:
        return 'The requested data was not found.';
      case FirebaseErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      case FirebaseErrorCode.TIMEOUT_ERROR:
        return 'Operation timed out. Please try again.';
      case FirebaseErrorCode.VALIDATION_ERROR:
        return 'Invalid data provided. Please check your input.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}
