/**
 * HealthKit Error Handling Module
 * 
 * This module defines error types, codes, and recovery strategies for HealthKit operations.
 * It provides structured error handling with specific error codes and recovery mechanisms.
 * 
 * Requirements: 6.1, 6.3
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Enumeration of HealthKit error codes
 * Each code represents a specific type of error that can occur during HealthKit operations
 */
export enum HealthKitErrorCode {
  /** HealthKit is not available on this device (e.g., simulator, non-iOS device) */
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  
  /** User denied permission for one or more data types */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  /** Failed to fetch data from HealthKit API */
  FETCH_FAILED = 'FETCH_FAILED',
  
  /** Failed to convert HealthKit sample to app format */
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  
  /** Invalid date range provided (e.g., startDate > endDate) */
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  
  /** No data available in HealthKit for the requested type/range */
  NO_DATA = 'NO_DATA',
  
  /** Partial data fetch - some categories succeeded, others failed */
  PARTIAL_FETCH = 'PARTIAL_FETCH',
  
  /** HealthKit initialization failed */
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  
  /** Unknown or unexpected error */
  UNKNOWN = 'UNKNOWN',
}

// ============================================================================
// Error Recovery Strategies
// ============================================================================

/**
 * Enumeration of error recovery strategies
 * Defines how the app should attempt to recover from different error types
 */
export enum RecoveryStrategy {
  /** No recovery possible - show error to user */
  NONE = 'NONE',
  
  /** Retry the operation immediately */
  RETRY = 'RETRY',
  
  /** Retry with exponential backoff */
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  
  /** Fall back to cached data */
  USE_CACHE = 'USE_CACHE',
  
  /** Prompt user to enable permissions in Settings */
  REQUEST_PERMISSIONS = 'REQUEST_PERMISSIONS',
  
  /** Continue with partial data (for partial fetch failures) */
  CONTINUE_PARTIAL = 'CONTINUE_PARTIAL',
}

// ============================================================================
// Error Metadata
// ============================================================================

/**
 * Additional metadata about the error
 */
export interface ErrorMetadata {
  /** The operation that failed (e.g., 'fetchHeartRate', 'initializeHealthKit') */
  operation?: string;
  
  /** The data type(s) involved in the error */
  dataTypes?: string[];
  
  /** The category of data involved (e.g., 'vitals', 'activity') */
  category?: string;
  
  /** Number of retry attempts made */
  retryCount?: number;
  
  /** Original error from HealthKit API */
  originalError?: any;
  
  /** Timestamp when the error occurred */
  timestamp?: Date;
  
  /** Whether cached data is available as fallback */
  hasCachedData?: boolean;
}

// ============================================================================
// HealthKitError Class
// ============================================================================

/**
 * Custom error class for HealthKit operations
 * 
 * Provides structured error information including:
 * - Error code for programmatic handling
 * - User-friendly message
 * - Recovery strategy recommendation
 * - Whether the error is recoverable
 * - Additional metadata for debugging
 * 
 * Requirements: 6.1, 6.3
 */
export class HealthKitError extends Error {
  /** Error code identifying the type of error */
  public readonly code: HealthKitErrorCode;
  
  /** Whether this error is recoverable */
  public readonly recoverable: boolean;
  
  /** Recommended recovery strategy */
  public readonly recoveryStrategy: RecoveryStrategy;
  
  /** Additional error metadata */
  public readonly metadata: ErrorMetadata;
  
  /**
   * Create a new HealthKitError
   * 
   * @param message - Human-readable error message
   * @param code - Error code identifying the error type
   * @param recoverable - Whether the error is recoverable (default: true)
   * @param recoveryStrategy - Recommended recovery strategy (default: RETRY)
   * @param metadata - Additional error metadata (default: {})
   */
  constructor(
    message: string,
    code: HealthKitErrorCode,
    recoverable: boolean = true,
    recoveryStrategy: RecoveryStrategy = RecoveryStrategy.RETRY,
    metadata: ErrorMetadata = {}
  ) {
    super(message);
    this.name = 'HealthKitError';
    this.code = code;
    this.recoverable = recoverable;
    this.recoveryStrategy = recoveryStrategy;
    this.metadata = {
      ...metadata,
      timestamp: metadata.timestamp || new Date(),
    };
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HealthKitError);
    }
  }
  
  /**
   * Create a HealthKitError for when HealthKit is not available
   * 
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static notAvailable(metadata: ErrorMetadata = {}): HealthKitError {
    return new HealthKitError(
      'HealthKit is not available on this device. Please use a physical iOS device.',
      HealthKitErrorCode.NOT_AVAILABLE,
      false, // Not recoverable
      RecoveryStrategy.NONE,
      metadata
    );
  }
  
  /**
   * Create a HealthKitError for permission denial
   * 
   * @param dataTypes - Array of data types that were denied
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static permissionDenied(dataTypes: string[] = [], metadata: ErrorMetadata = {}): HealthKitError {
    const typesList = dataTypes.length > 0 ? ` (${dataTypes.join(', ')})` : '';
    return new HealthKitError(
      `HealthKit access denied${typesList}. Enable permissions in Settings to view your health data.`,
      HealthKitErrorCode.PERMISSION_DENIED,
      true,
      RecoveryStrategy.REQUEST_PERMISSIONS,
      {
        ...metadata,
        dataTypes,
      }
    );
  }
  
  /**
   * Create a HealthKitError for fetch failures
   * 
   * @param operation - The operation that failed
   * @param originalError - The original error from HealthKit
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static fetchFailed(
    operation: string,
    originalError?: any,
    metadata: ErrorMetadata = {}
  ): HealthKitError {
    return new HealthKitError(
      `Failed to fetch health data from HealthKit. Pull down to retry.`,
      HealthKitErrorCode.FETCH_FAILED,
      true,
      metadata.hasCachedData ? RecoveryStrategy.USE_CACHE : RecoveryStrategy.RETRY_WITH_BACKOFF,
      {
        ...metadata,
        operation,
        originalError,
      }
    );
  }
  
  /**
   * Create a HealthKitError for conversion failures
   * 
   * @param operation - The operation that failed
   * @param originalError - The original error
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static conversionFailed(
    operation: string,
    originalError?: any,
    metadata: ErrorMetadata = {}
  ): HealthKitError {
    return new HealthKitError(
      'Failed to convert HealthKit data to app format.',
      HealthKitErrorCode.CONVERSION_FAILED,
      true,
      RecoveryStrategy.RETRY,
      {
        ...metadata,
        operation,
        originalError,
      }
    );
  }
  
  /**
   * Create a HealthKitError for invalid date ranges
   * 
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static invalidDateRange(metadata: ErrorMetadata = {}): HealthKitError {
    return new HealthKitError(
      'Invalid date range: start date must be before or equal to end date.',
      HealthKitErrorCode.INVALID_DATE_RANGE,
      true,
      RecoveryStrategy.NONE,
      metadata
    );
  }
  
  /**
   * Create a HealthKitError for when no data is available
   * 
   * @param dataTypes - Array of data types with no data
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static noData(dataTypes: string[] = [], metadata: ErrorMetadata = {}): HealthKitError {
    const typesList = dataTypes.length > 0 ? ` for ${dataTypes.join(', ')}` : '';
    return new HealthKitError(
      `No health data found in HealthKit${typesList} for the selected time range.`,
      HealthKitErrorCode.NO_DATA,
      true,
      RecoveryStrategy.NONE,
      {
        ...metadata,
        dataTypes,
      }
    );
  }
  
  /**
   * Create a HealthKitError for partial fetch failures
   * 
   * @param successfulCategories - Categories that succeeded
   * @param failedCategories - Categories that failed
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static partialFetch(
    successfulCategories: string[],
    failedCategories: string[],
    metadata: ErrorMetadata = {}
  ): HealthKitError {
    return new HealthKitError(
      `Some health data could not be fetched. Failed categories: ${failedCategories.join(', ')}`,
      HealthKitErrorCode.PARTIAL_FETCH,
      true,
      RecoveryStrategy.CONTINUE_PARTIAL,
      {
        ...metadata,
        dataTypes: [...successfulCategories, ...failedCategories],
      }
    );
  }
  
  /**
   * Create a HealthKitError for initialization failures
   * 
   * @param originalError - The original error from HealthKit
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static initializationFailed(originalError?: any, metadata: ErrorMetadata = {}): HealthKitError {
    return new HealthKitError(
      'Failed to initialize HealthKit. Please try again.',
      HealthKitErrorCode.INITIALIZATION_FAILED,
      true,
      RecoveryStrategy.RETRY,
      {
        ...metadata,
        operation: 'initializeHealthKit',
        originalError,
      }
    );
  }
  
  /**
   * Create a HealthKitError for unknown errors
   * 
   * @param originalError - The original error
   * @param metadata - Additional error metadata
   * @returns HealthKitError instance
   */
  static unknown(originalError?: any, metadata: ErrorMetadata = {}): HealthKitError {
    return new HealthKitError(
      'An unexpected error occurred while accessing HealthKit.',
      HealthKitErrorCode.UNKNOWN,
      true,
      RecoveryStrategy.RETRY,
      {
        ...metadata,
        originalError,
      }
    );
  }
  
  /**
   * Convert this error to a user-friendly message
   * 
   * @returns User-friendly error message
   */
  toUserMessage(): string {
    return this.message;
  }
  
  /**
   * Convert this error to a JSON object for logging
   * 
   * @returns JSON representation of the error
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      recoveryStrategy: this.recoveryStrategy,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is a HealthKitError
 * 
 * @param error - The error to check
 * @returns True if the error is a HealthKitError
 */
export function isHealthKitError(error: any): error is HealthKitError {
  return error instanceof HealthKitError;
}

/**
 * Convert a generic error to a HealthKitError
 * 
 * @param error - The error to convert
 * @param operation - The operation that failed
 * @returns HealthKitError instance
 */
export function toHealthKitError(error: any, operation?: string): HealthKitError {
  if (isHealthKitError(error)) {
    return error;
  }
  
  // Try to infer error type from error message
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('not available') || errorMessage.includes('unavailable')) {
    return HealthKitError.notAvailable({ operation, originalError: error });
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('authorized')) {
    return HealthKitError.permissionDenied([], { operation, originalError: error });
  }
  
  if (errorMessage.includes('date') || errorMessage.includes('range')) {
    return HealthKitError.invalidDateRange({ operation, originalError: error });
  }
  
  // Default to unknown error
  return HealthKitError.unknown(error, { operation });
}

/**
 * User-facing error messages for each error code
 */
export const ERROR_MESSAGES: Record<HealthKitErrorCode, string> = {
  [HealthKitErrorCode.NOT_AVAILABLE]: 
    'HealthKit is not available on this device. Please use a physical iOS device.',
  [HealthKitErrorCode.PERMISSION_DENIED]: 
    'HealthKit access denied. Enable permissions in Settings to view your health data.',
  [HealthKitErrorCode.FETCH_FAILED]: 
    'Failed to fetch health data. Pull down to retry.',
  [HealthKitErrorCode.CONVERSION_FAILED]: 
    'Failed to process health data. Please try again.',
  [HealthKitErrorCode.INVALID_DATE_RANGE]: 
    'Invalid date range selected. Please check your date selection.',
  [HealthKitErrorCode.NO_DATA]: 
    'No health data found in HealthKit for the selected time range.',
  [HealthKitErrorCode.PARTIAL_FETCH]: 
    'Some health data could not be fetched. Showing available data.',
  [HealthKitErrorCode.INITIALIZATION_FAILED]: 
    'Failed to initialize HealthKit. Please try again.',
  [HealthKitErrorCode.UNKNOWN]: 
    'An unexpected error occurred. Please try again.',
};
