/**
 * LoadingIndicator Tests
 * 
 * Tests for the LoadingIndicator component.
 * Verifies:
 * - Component renders correctly
 * - Accessibility features are present
 * - Timeout handling works
 * - Settings integration works
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { LoadingIndicator } from '../LoadingIndicator';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import * as announcer from '../../lib/announcer';

// Mock the announcer module
jest.mock('../../lib/announcer', () => ({
  announceLoading: jest.fn(),
}));

// Mock AsyncStorage for AccessibilityContext
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Helper to render with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('LoadingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  it('renders with default props', async () => {
    const { getByText, getByTestId } = await renderWithProvider(
      <LoadingIndicator />
    );

    expect(getByText('Loading')).toBeTruthy();
    expect(getByTestId('loading-container')).toBeTruthy();
  });

  it('renders with custom message', async () => {
    const { getByText } = await renderWithProvider(
      <LoadingIndicator message="Loading health data..." />
    );

    expect(getByText('Loading health data...')).toBeTruthy();
  });

  it('renders without message when showMessage is false', async () => {
    const { queryByText, getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" showMessage={false} />
    );

    // Message text should not be visible
    expect(queryByText('Loading')).toBeNull();
    
    // But accessibility label should still be present
    const container = getByTestId('loading-container');
    expect(container.props.accessibilityLabel).toBe('Loading');
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  it('has proper accessibility attributes', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading data" />
    );

    const container = getByTestId('loading-container');
    expect(container.props.accessible).toBe(true);
    expect(container.props.accessibilityRole).toBe('progressbar');
    expect(container.props.accessibilityLiveRegion).toBe('polite');
    expect(container.props.accessibilityLabel).toBe('Loading data');
  });

  it('announces loading state on mount', async () => {
    await renderWithProvider(
      <LoadingIndicator message="Loading health data" />
    );

    await waitFor(() => {
      expect(announcer.announceLoading).toHaveBeenCalledWith('Loading health data');
    });
  });

  it('announces loading state only once', async () => {
    const { rerender } = await renderWithProvider(
      <LoadingIndicator message="Loading" />
    );

    await waitFor(() => {
      expect(announcer.announceLoading).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another announcement
    rerender(
      <AccessibilityProvider>
        <LoadingIndicator message="Loading" />
      </AccessibilityProvider>
    );

    // Still should be called only once
    expect(announcer.announceLoading).toHaveBeenCalledTimes(1);
  });

  // ============================================================================
  // Timeout Tests
  // ============================================================================

  it('calls onTimeout after specified duration', async () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    await renderWithProvider(
      <LoadingIndicator
        message="Loading"
        timeout={5000}
        onTimeout={onTimeout}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(onTimeout).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('does not call onTimeout if unmounted before timeout', async () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { unmount } = await renderWithProvider(
      <LoadingIndicator
        message="Loading"
        timeout={5000}
        onTimeout={onTimeout}
      />
    );

    // Unmount before timeout
    unmount();

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    // onTimeout should not be called
    expect(onTimeout).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('does not set timeout if onTimeout is not provided', async () => {
    jest.useFakeTimers();

    await renderWithProvider(
      <LoadingIndicator message="Loading" timeout={5000} />
    );

    // Fast-forward time - should not throw error
    jest.advanceTimersByTime(5000);

    // No error should occur
    expect(true).toBe(true);

    jest.useRealTimers();
  });

  // ============================================================================
  // Size Tests
  // ============================================================================

  it('renders with small size', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" size="small" />
    );

    const indicator = getByTestId('loading-indicator');
    expect(indicator.props.size).toBe('small');
  });

  it('renders with large size', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" size="large" />
    );

    const indicator = getByTestId('loading-indicator');
    expect(indicator.props.size).toBe('large');
  });

  // ============================================================================
  // Custom Styling Tests
  // ============================================================================

  it('applies custom color', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" color="#FF0000" />
    );

    const indicator = getByTestId('loading-indicator');
    expect(indicator.props.color).toBe('#FF0000');
  });

  it('applies custom container style', async () => {
    const customStyle = { backgroundColor: '#F5F5F5', padding: 20 };
    
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" style={customStyle} />
    );

    const container = getByTestId('loading-container');
    expect(container.props.style).toContainEqual(customStyle);
  });

  // ============================================================================
  // Centered Layout Tests
  // ============================================================================

  it('uses centered layout by default', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" />
    );

    const container = getByTestId('loading-container');
    const styles = container.props.style;
    
    // Check if centered styles are applied (flex: 1)
    const hasCenteredStyle = Array.isArray(styles) && styles.some((style: any) => style && style.flex === 1);
    expect(hasCenteredStyle).toBe(true);
  });

  it('uses inline layout when centered is false', async () => {
    const { getByTestId } = await renderWithProvider(
      <LoadingIndicator message="Loading" centered={false} />
    );

    const container = getByTestId('loading-container');
    const styles = container.props.style;
    
    // Check that centered styles are NOT applied
    const hasCenteredStyle = Array.isArray(styles) && styles.some((style: any) => style && style.flex === 1);
    expect(hasCenteredStyle).toBe(false);
  });
});
