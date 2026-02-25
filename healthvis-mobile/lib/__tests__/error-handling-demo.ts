/**
 * Error Handling Demonstration
 * 
 * This file demonstrates the error handling capabilities implemented in task 12.
 * It's not a test file, but rather a demonstration of the API.
 */

import {
  HealthKitError,
  HealthKitErrorCode,
  RecoveryStrategy,
  toHealthKitError,
  isHealthKitError,
  ERROR_MESSAGES,
} from '../healthkit-error';

import {
  retryWithBackoff,
  retryWithBackoffSafe,
  RetryOptions,
} from '../retry-utils';

// ============================================================================
// Demonstration 1: Creating HealthKit Errors
// ============================================================================

console.log('=== Demonstration 1: Creating HealthKit Errors ===\n');

// Create a "not available" error
const notAvailableError = HealthKitError.notAvailable({
  operation: 'initializeHealthKit',
});
console.log('Not Available Error:', {
  message: notAvailableError.message,
  code: notAvailableError.code,
  recoverable: notAvailableError.recoverable,
  recoveryStrategy: notAvailableError.recoveryStrategy,
});

// Create a "permission denied" error
const permissionError = HealthKitError.permissionDenied(['heart_rate', 'steps'], {
  operation: 'fetchHeartRate',
});
console.log('\nPermission Denied Error:', {
  message: permissionError.message,
  code: permissionError.code,
  recoverable: permissionError.recoverable,
  recoveryStrategy: permissionError.recoveryStrategy,
  dataTypes: permissionError.metadata.dataTypes,
});

// Create a "fetch failed" error
const fetchError = HealthKitError.fetchFailed('fetchHeartRate', 'Network timeout', {
  hasCachedData: true,
});
console.log('\nFetch Failed Error:', {
  message: fetchError.message,
  code: fetchError.code,
  recoverable: fetchError.recoverable,
  recoveryStrategy: fetchError.recoveryStrategy,
});

// ============================================================================
// Demonstration 2: Error Conversion
// ============================================================================

console.log('\n=== Demonstration 2: Error Conversion ===\n');

// Convert a generic error to HealthKitError
const genericError = new Error('HealthKit not available on simulator');
const convertedError = toHealthKitError(genericError, 'initializeHealthKit');
console.log('Converted Error:', {
  message: convertedError.message,
  code: convertedError.code,
  isHealthKitError: isHealthKitError(convertedError),
});

// ============================================================================
// Demonstration 3: Retry Logic
// ============================================================================

console.log('\n=== Demonstration 3: Retry Logic ===\n');

// Simulate an operation that fails twice then succeeds
let attemptCount = 0;
const unreliableOperation = async (): Promise<string> => {
  attemptCount++;
  console.log(`Attempt ${attemptCount}`);
  
  if (attemptCount < 3) {
    throw new Error('Transient failure');
  }
  
  return 'Success!';
};

// Retry with backoff
(async () => {
  try {
    const result = await retryWithBackoff(unreliableOperation, {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      useJitter: false, // Disable jitter for predictable demo
      onRetry: (error, attempt, delay) => {
        console.log(`  Retrying (attempt ${attempt}) after ${delay}ms delay`);
      },
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Failed after all retries:', error);
  }
})();

// ============================================================================
// Demonstration 4: Safe Retry (Returns Result Object)
// ============================================================================

console.log('\n=== Demonstration 4: Safe Retry ===\n');

// Operation that always fails
const failingOperation = async (): Promise<string> => {
  throw new Error('This always fails');
};

(async () => {
  const result = await retryWithBackoffSafe(failingOperation, {
    maxAttempts: 2,
    initialDelay: 100,
    useJitter: false,
  });
  
  console.log('Safe Retry Result:', {
    success: result.success,
    attempts: result.attempts,
    error: result.error?.message,
  });
})();

// ============================================================================
// Demonstration 5: Error Messages
// ============================================================================

console.log('\n=== Demonstration 5: Error Messages ===\n');

console.log('Predefined Error Messages:');
Object.entries(ERROR_MESSAGES).forEach(([code, message]) => {
  console.log(`  ${code}: ${message}`);
});

// ============================================================================
// Demonstration 6: Error JSON Serialization
// ============================================================================

console.log('\n=== Demonstration 6: Error JSON Serialization ===\n');

const error = HealthKitError.partialFetch(
  ['vitals', 'activity'],
  ['nutrition', 'sleep'],
  { operation: 'fetchAllHealthData' }
);

console.log('Error JSON:', JSON.stringify(error.toJSON(), null, 2));

console.log('\n=== Demonstration Complete ===\n');
