/**
 * LoadingIndicator Component
 * 
 * Reusable loading indicator with accessibility support.
 * Announces loading state to screen readers and provides visual feedback.
 * Includes timeout handling for long-running operations.
 * 
 * Requirements: 16.2
 */

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { announceLoading } from '../lib/announcer';

// ============================================================================
// Component Props
// ============================================================================

export interface LoadingIndicatorProps {
  /** Loading message to display and announce */
  message?: string;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
  /** Custom color for the indicator */
  color?: string;
  /** Whether to show the text message */
  showMessage?: boolean;
  /** Timeout in milliseconds for long-running operations */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Whether to center the indicator */
  centered?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_MESSAGE = 'Loading';
const DEFAULT_SIZE = 'large';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Component
// ============================================================================

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = DEFAULT_MESSAGE,
  size = DEFAULT_SIZE,
  color,
  showMessage = true,
  timeout = DEFAULT_TIMEOUT,
  onTimeout,
  style,
  centered = true,
}) => {
  const { settings } = useAccessibility();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnnouncedRef = useRef(false);

  // ============================================================================
  // Determine Colors Based on Settings
  // ============================================================================

  const indicatorColor = color || (settings.contrast === 'high' ? '#000000' : '#007AFF');
  const textColor = settings.contrast === 'high' ? '#000000' : '#666666';

  // ============================================================================
  // Determine Font Size Based on Settings
  // ============================================================================

  const fontSize = settings.fontSize === 'small' ? 14 : settings.fontSize === 'large' ? 20 : 16;

  // ============================================================================
  // Announce Loading State on Mount
  // ============================================================================

  useEffect(() => {
    // Announce loading state to screen readers (only once)
    if (!hasAnnouncedRef.current) {
      announceLoading(message);
      hasAnnouncedRef.current = true;
    }

    // Set up timeout for long-running operations
    if (timeout && onTimeout) {
      timeoutRef.current = setTimeout(() => {
        console.warn(`Loading operation timed out after ${timeout}ms`);
        onTimeout();
      }, timeout);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, timeout, onTimeout]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View
      style={[
        centered ? styles.centeredContainer : styles.container,
        style,
      ]}
      accessible={true}
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      testID="loading-container"
    >
      <ActivityIndicator
        size={size}
        color={indicatorColor}
        testID="loading-indicator"
      />
      {showMessage && (
        <Text
          style={[
            styles.message,
            { color: textColor, fontSize },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
  },
});

export default LoadingIndicator;
