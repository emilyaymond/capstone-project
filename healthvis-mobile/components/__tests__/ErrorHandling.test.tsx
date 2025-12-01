/**
 * Tests for ErrorBoundary and ErrorDisplay components
 * 
 * Verifies:
 * - ErrorBoundary catches errors and displays fallback UI
 * - ErrorDisplay renders error messages correctly
 * - Error types are detected properly
 * - Retry and dismiss actions work
 * - Accessibility features are present
 */

import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorDisplay } from '../ErrorDisplay';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

// Mock the hooks and utilities
jest.mock('../../hooks/useStorage', () => ({
  useStorage: () => ({
    saveSettings: jest.fn(),
    loadSettings: jest.fn().mockResolvedValue(null),
    clearSettings: jest.fn(),
    isAvailable: true,
  }),
}));

jest.mock('../../hooks/useAudio', () => ({
  useAudio: () => ({
    playClickSound: jest.fn(),
    playSuccessSound: jest.fn(),
    playErrorSound: jest.fn(),
  }),
}));

jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    triggerLight: jest.fn(),
    triggerMedium: jest.fn(),
    triggerHeavy: jest.fn(),
  }),
}));

jest.mock('../../lib/announcer', () => ({
  announce: jest.fn(),
  announceSuccess: jest.fn(),
  announceError: jest.fn(),
  announceNavigation: jest.fn(),
  announceModeChange: jest.fn(),
  announceSettingsChange: jest.fn(),
}));

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
}

// Wrapper component for testing ErrorBoundary
function TestErrorBoundary({ shouldThrow }: { shouldThrow: boolean }) {
  return (
    <ErrorBoundary>
      <ThrowError shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    const { getByText } = renderWithProvider(<TestErrorBoundary shouldThrow={false} />);
    expect(getByText('No error')).toBeTruthy();
  });

  it('catches errors and displays fallback UI', () => {
    const { getByText } = renderWithProvider(<TestErrorBoundary shouldThrow={true} />);
    expect(getByText('Something Went Wrong')).toBeTruthy();
    expect(getByText(/encountered an unexpected error/)).toBeTruthy();
  });

  it('provides restart button in fallback UI', () => {
    const { getByText } = renderWithProvider(<TestErrorBoundary shouldThrow={true} />);
    const restartButton = getByText('Restart App');
    expect(restartButton).toBeTruthy();
  });

  it('calls custom error handler when provided', () => {
    const onError = jest.fn();
    const { getByText } = renderWithProvider(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalled();
    expect(getByText('Something Went Wrong')).toBeTruthy();
  });
});

describe('ErrorDisplay', () => {
  it('does not render when error is null', () => {
    const { queryByText } = renderWithProvider(
      <ErrorDisplay error={null} />
    );
    expect(queryByText('Error')).toBeNull();
  });

  it('renders error message', async () => {
    const error = new Error('Test error message');
    const { getAllByText } = renderWithProvider(
      <ErrorDisplay error={error} />
    );
    
    await waitFor(() => {
      const elements = getAllByText(/Test error message/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('detects network error type', async () => {
    const error = new Error('Network timeout occurred');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} />
    );
    
    await waitFor(() => {
      expect(getByText('Connection Error')).toBeTruthy();
    });
  });

  it('detects parsing error type', async () => {
    const error = new Error('Failed to parse JSON response');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} />
    );
    
    await waitFor(() => {
      expect(getByText('Data Error')).toBeTruthy();
    });
  });

  it('detects storage error type', async () => {
    const error = new Error('AsyncStorage quota exceeded');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} />
    );
    
    await waitFor(() => {
      expect(getByText('Storage Error')).toBeTruthy();
    });
  });

  it('renders retry button when onRetry is provided', async () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} onRetry={onRetry} />
    );
    
    await waitFor(() => {
      const retryButton = getByText('Retry');
      expect(retryButton).toBeTruthy();
    });
  });

  it('calls onRetry when retry button is pressed', async () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} onRetry={onRetry} />
    );
    
    await waitFor(() => {
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
    });
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders dismiss button when onDismiss is provided', async () => {
    const onDismiss = jest.fn();
    const error = new Error('Test error');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} onDismiss={onDismiss} />
    );
    
    await waitFor(() => {
      const dismissButton = getByText('Dismiss');
      expect(dismissButton).toBeTruthy();
    });
  });

  it('calls onDismiss when dismiss button is pressed', async () => {
    const onDismiss = jest.fn();
    const error = new Error('Test error');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} onDismiss={onDismiss} />
    );
    
    await waitFor(() => {
      const dismissButton = getByText('Dismiss');
      fireEvent.press(dismissButton);
    });
    
    expect(onDismiss).toHaveBeenCalled();
  });

  it('hides retry button when showRetry is false', async () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');
    const { queryByText } = renderWithProvider(
      <ErrorDisplay error={error} onRetry={onRetry} showRetry={false} />
    );
    
    await waitFor(() => {
      expect(queryByText('Retry')).toBeNull();
    });
  });

  it('hides dismiss button when showDismiss is false', async () => {
    const onDismiss = jest.fn();
    const error = new Error('Test error');
    const { queryByText } = renderWithProvider(
      <ErrorDisplay error={error} onDismiss={onDismiss} showDismiss={false} />
    );
    
    await waitFor(() => {
      expect(queryByText('Dismiss')).toBeNull();
    });
  });

  it('accepts string errors', async () => {
    const { getByText } = renderWithProvider(
      <ErrorDisplay error="Simple error message" />
    );
    
    await waitFor(() => {
      expect(getByText(/Simple error message/)).toBeTruthy();
    });
  });

  it('uses explicit error type when provided', async () => {
    const error = new Error('Some error');
    const { getByText } = renderWithProvider(
      <ErrorDisplay error={error} errorType="validation" />
    );
    
    await waitFor(() => {
      expect(getByText('Invalid Input')).toBeTruthy();
    });
  });
});

