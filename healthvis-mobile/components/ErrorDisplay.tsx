/**
 * ErrorDisplay Component
 * 
 * Displays error messages with recovery actions for various error types.
 * Provides clear descriptions, retry buttons, and screen reader announcements.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.5
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { announceError } from '../lib/announcer';
import { AccessibleButton } from './AccessibleButton';

// ============================================================================
// Error Type Classification
// ============================================================================

export type ErrorType = 
  | 'network'      // Network/connection errors
  | 'parsing'      // Data parsing errors
  | 'storage'      // Storage/persistence errors
  | 'permission'   // Permission denied errors
  | 'validation'   // User input validation errors
  | 'unknown';     // Unknown/generic errors

// ============================================================================
// Props Interface
// ============================================================================

export interface ErrorDisplayProps {
  error: Error | string | null;
  errorType?: ErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showDismiss?: boolean;
  style?: ViewStyle;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines error type from error object or message
 */
function detectErrorType(error: Error | string): ErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('network') || 
      lowerMessage.includes('fetch') || 
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('connection')) {
    return 'network';
  }

  if (lowerMessage.includes('parse') || 
      lowerMessage.includes('json') || 
      lowerMessage.includes('invalid data')) {
    return 'parsing';
  }

  if (lowerMessage.includes('storage') || 
      lowerMessage.includes('asyncstorage') ||
      lowerMessage.includes('quota')) {
    return 'storage';
  }

  if (lowerMessage.includes('permission') || 
      lowerMessage.includes('denied') ||
      lowerMessage.includes('not authorized')) {
    return 'permission';
  }

  if (lowerMessage.includes('validation') || 
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Gets user-friendly error message and recovery guidance based on error type
 */
function getErrorContent(errorType: ErrorType, originalError: Error | string): {
  title: string;
  message: string;
  recoveryHint: string;
} {
  const errorMessage = typeof originalError === 'string' ? originalError : originalError.message;

  switch (errorType) {
    case 'network':
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        recoveryHint: 'Tap Retry to attempt the request again',
      };

    case 'parsing':
      return {
        title: 'Data Error',
        message: 'The data received from the server could not be processed. This may be a temporary issue.',
        recoveryHint: 'Tap Retry to reload the data',
      };

    case 'storage':
      return {
        title: 'Storage Error',
        message: 'Unable to save or load data from device storage. Your device may be low on storage space.',
        recoveryHint: 'Free up storage space and try again',
      };

    case 'permission':
      return {
        title: 'Permission Required',
        message: 'This feature requires permission that has not been granted. Please enable the required permission in your device settings.',
        recoveryHint: 'Open device settings to grant permission',
      };

    case 'validation':
      return {
        title: 'Invalid Input',
        message: errorMessage || 'The information provided is not valid. Please check your input and try again.',
        recoveryHint: 'Correct the input and try again',
      };

    case 'unknown':
    default:
      return {
        title: 'Error',
        message: errorMessage || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
        recoveryHint: 'Tap Retry to try again',
      };
  }
}

// ============================================================================
// ErrorDisplay Component
// ============================================================================

/**
 * Displays error messages with recovery actions
 * 
 * Usage:
 * ```tsx
 * <ErrorDisplay
 *   error={error}
 *   errorType="network"
 *   onRetry={handleRetry}
 *   onDismiss={handleDismiss}
 * />
 * ```
 */
export function ErrorDisplay({
  error,
  errorType,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = true,
  style,
}: ErrorDisplayProps): React.ReactElement | null {
  // Don't render if no error
  if (!error) {
    return null;
  }

  // Detect error type if not provided
  const detectedType = errorType || detectErrorType(error);

  // Get error content
  const { title, message, recoveryHint } = getErrorContent(detectedType, error);

  // Announce error to screen readers when component mounts or error changes
  useEffect(() => {
    // Announce with assertive priority (Requirement 15.2)
    announceError(`${title}. ${message}. ${recoveryHint}`);
  }, [error, title, message, recoveryHint]);

  // Handle retry action
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Handle dismiss action (Requirement 15.5)
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon} accessibilityLabel="Error icon">⚠️</Text>
        </View>

        {/* Error Title */}
        <Text 
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {/* Error Message */}
        <Text style={styles.message}>
          {message}
        </Text>

        {/* Recovery Hint */}
        {recoveryHint && (
          <Text style={styles.hint}>
            {recoveryHint}
          </Text>
        )}

        {/* Development-only error details */}
        {__DEV__ && typeof error !== 'string' && (
          <View style={styles.devDetails}>
            <Text style={styles.devTitle}>Debug Info:</Text>
            <Text style={styles.devText}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.devStack} numberOfLines={5}>
                {error.stack}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Retry Button (Requirement 15.3) */}
          {showRetry && onRetry && (
            <View style={styles.button}>
              <AccessibleButton
                onPress={handleRetry}
                label="Retry"
                hint={recoveryHint}
              />
            </View>
          )}

          {/* Dismiss Button (Requirement 15.5) */}
          {showDismiss && onDismiss && (
            <View style={styles.button}>
              <AccessibleButton
                onPress={handleDismiss}
                label="Dismiss"
                hint="Close this error message"
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    marginVertical: 8,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#856404',
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#856404',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  devDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  devText: {
    fontSize: 11,
    color: '#dc3545',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  devStack: {
    fontSize: 9,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  button: {
    minWidth: 100,
  },
});

