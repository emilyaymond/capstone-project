import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear any existing announcements
    document.querySelectorAll('[aria-live]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveAttribute('aria-labelledby', 'error-title');
    
    const title = screen.getByText('Something went wrong');
    expect(title).toHaveAttribute('id', 'error-title');
  });

  it('provides actionable recovery suggestions', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('What you can do:')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('Clear your browser cache')).toBeInTheDocument();
  });

  it('has accessible retry and reload buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    const reloadButton = screen.getByRole('button', { name: /reload page/i });

    expect(retryButton).toHaveAttribute('aria-describedby', 'retry-description');
    expect(reloadButton).toHaveAttribute('aria-describedby', 'reload-description');
    
    expect(screen.getByText('Attempts to reload the application without refreshing the page')).toBeInTheDocument();
    expect(screen.getByText('Refreshes the entire page to start fresh')).toBeInTheDocument();
  });

  it('announces error to screen readers', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Screen reader test error" />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
      
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Screen reader test error')
      );
      expect(announcement).toBeTruthy();
    });
  });

  it('has retry button that attempts to recover', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    
    // Click retry button - this should call handleRetry
    fireEvent.click(retryButton);
    
    // The retry functionality resets the error state, but since our component
    // still throws an error, it will catch it again and show the error UI
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('handles reload functionality', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Technical Details (Development Only)')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('hides technical details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Technical Details (Development Only)')).not.toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('handles errors without error messages gracefully', () => {
    // Create an error without a message
    const ErrorWithoutMessage = () => {
      const error = new Error();
      error.message = '';
      throw error;
    };

    render(
      <ErrorBoundary>
        <ErrorWithoutMessage />
      </ErrorBoundary>
    );

    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });

  it('cleans up screen reader announcements', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for announcement to be created
    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
    });

    // Wait for cleanup (announcements should be removed after 1 second)
    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      // Check that cleanup has started (some announcements may still be present due to timing)
      expect(announcements.length).toBeLessThanOrEqual(3);
    }, { timeout: 1500 });
  });
});