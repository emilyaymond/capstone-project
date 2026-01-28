/**
 * ErrorBoundary Component
 *
 * React Error Boundary that catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 *
 * Requirements: 15.4
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { announceError } from "../lib/announcer";

// ============================================================================
// Props and State Interfaces
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

/**
 * Error Boundary component that catches crashes and displays recovery UI
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method called when an error is thrown in a child component
   * Updates state to trigger fallback UI rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been thrown
   * Used for error logging and side effects
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // Store error info in state
    this.setState({ errorInfo });

    // Announce error to screen readers with assertive priority
    announceError(
      "Application error occurred. Please restart or contact support.",
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send error to logging service
    // Example: logErrorToService(error, errorInfo);
  }

  /**
   * Resets the error boundary state, allowing the app to try rendering again
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Renders either the children or the fallback UI based on error state
   */
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // If custom fallback is provided, use it
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // Otherwise, render default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              Something Went Wrong
            </Text>

            <Text style={styles.message}>
              The application encountered an unexpected error. You can try
              restarting the app or contact support if the problem persists.
            </Text>

            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>
                  Error Details (Development Only):
                </Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Pressable
                onPress={this.resetError}
                accessibilityLabel="Restart App"
                accessibilityHint="Attempts to restart the application and clear the error"
                style={styles.plainButton}
              >
                <Text style={styles.plainButtonText}>Restart App</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    // No error, render children normally
    return children;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    maxWidth: 500,
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 24,
    textAlign: "center",
  },
  errorDetails: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
  },
  buttonContainer: {
    alignItems: "center",
  },
  plainButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007aff",
    borderRadius: 8,
  },
  plainButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
