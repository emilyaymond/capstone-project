/**
 * Retry Utilities Module
 * 
 * Provides utility functions for retrying operations with exponential backoff.
 * Used for robust error handling in HealthKit operations.
 * 
 * Requirements: 6.3
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  
  /** Whether to add random jitter to delays (default: true) */
  useJitter?: boolean;
  
  /** Function to determine if an error should trigger a retry (default: always retry) */
  shouldRetry?: (error: any, attempt: number) => boolean;
  
  /** Callback invoked before each retry attempt */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** The result value (if successful) */
  value?: T;
  
  /** The error (if failed) */
  error?: any;
  
  /** Number of attempts made */
  attempts: number;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  useJitter: true,
};

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Calculate the delay for a retry attempt using exponential backoff
 * 
 * @param attempt - The current attempt number (0-indexed)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>): number {
  // Calculate exponential delay: initialDelay * (backoffMultiplier ^ attempt)
  let delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  
  // Cap at maxDelay
  delay = Math.min(delay, options.maxDelay);
  
  // Add jitter if enabled (random value between 0 and delay)
  if (options.useJitter) {
    delay = Math.random() * delay;
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * 
 * This function will attempt to execute the provided operation up to maxAttempts times.
 * If the operation fails, it will wait with exponential backoff before retrying.
 * 
 * @param operation - The async operation to retry
 * @param options - Retry options
 * @returns Promise resolving to the operation result
 * @throws The last error if all retry attempts fail
 * 
 * Requirements: 6.3
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Merge with default options
  const opts: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };
  
  let lastError: any;
  
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      // Attempt the operation
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts - 1) {
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts);
      
      // Invoke onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt + 1, delay);
      }
      
      // Log retry attempt
      console.log(
        `Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms delay`,
        error
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry an async operation with exponential backoff, returning a result object
 * instead of throwing errors
 * 
 * This is useful when you want to handle failures gracefully without try-catch blocks.
 * 
 * @param operation - The async operation to retry
 * @param options - Retry options
 * @returns Promise resolving to a RetryResult object
 * 
 * Requirements: 6.3
 */
export async function retryWithBackoffSafe<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };
  
  let lastError: any;
  let attempts = 0;
  
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    attempts++;
    
    try {
      const result = await operation();
      return {
        success: true,
        value: result,
        attempts,
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
        return {
          success: false,
          error,
          attempts,
        };
      }
      
      // If this was the last attempt, return failure
      if (attempt === opts.maxAttempts - 1) {
        return {
          success: false,
          error,
          attempts,
        };
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts);
      
      // Invoke onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt + 1, delay);
      }
      
      // Log retry attempt
      console.log(
        `Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms delay`,
        error
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  return {
    success: false,
    error: lastError,
    attempts,
  };
}

/**
 * Retry a batch of operations in parallel with individual retry logic
 * 
 * Each operation is retried independently. If some operations fail after all retries,
 * the function returns the successful results and logs the failures.
 * 
 * @param operations - Array of async operations to retry
 * @param options - Retry options
 * @returns Promise resolving to array of successful results
 * 
 * Requirements: 6.3
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  // Execute all operations with retry logic
  const results = await Promise.all(
    operations.map(op => retryWithBackoffSafe(op, options))
  );
  
  // Extract successful results
  const successfulResults: T[] = [];
  const failures: any[] = [];
  
  results.forEach((result, index) => {
    if (result.success && result.value !== undefined) {
      successfulResults.push(result.value);
    } else {
      failures.push({
        index,
        error: result.error,
        attempts: result.attempts,
      });
    }
  });
  
  // Log failures
  if (failures.length > 0) {
    console.warn(`${failures.length} operations failed after retries:`, failures);
  }
  
  return successfulResults;
}

/**
 * Create a retry wrapper for a function
 * 
 * This creates a new function that automatically retries the original function
 * with the specified options.
 * 
 * @param fn - The function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry logic
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
