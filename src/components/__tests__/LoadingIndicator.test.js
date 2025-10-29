import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingIndicator, { useLoading, withLoading } from '../LoadingIndicator';

describe('LoadingIndicator', () => {
  beforeEach(() => {
    // Clear any existing announcements
    document.querySelectorAll('[aria-live]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  it('renders spinner by default', () => {
    render(<LoadingIndicator message="Loading data" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading data')).toBeInTheDocument();
  });

  it('renders different types of indicators', () => {
    const { rerender } = render(<LoadingIndicator type="spinner" />);
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();

    rerender(<LoadingIndicator type="progress" />);
    expect(document.querySelector('.loading-progress')).toBeInTheDocument();

    rerender(<LoadingIndicator type="dots" />);
    expect(document.querySelector('.loading-dots')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<LoadingIndicator size="small" />);
    expect(document.querySelector('.loading-indicator--small')).toBeInTheDocument();

    rerender(<LoadingIndicator size="medium" />);
    expect(document.querySelector('.loading-indicator--medium')).toBeInTheDocument();

    rerender(<LoadingIndicator size="large" />);
    expect(document.querySelector('.loading-indicator--large')).toBeInTheDocument();
  });

  it('displays progress bar with progress value', () => {
    render(<LoadingIndicator type="progress" progress={75} showProgress={true} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuetext', '75% complete');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingIndicator message="Loading content" progress={50} />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Loading content');

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders with overlay', () => {
    render(<LoadingIndicator overlay={true} message="Loading..." />);
    
    expect(document.querySelector('.loading-overlay')).toBeInTheDocument();
    expect(document.querySelector('.loading-overlay__backdrop')).toBeInTheDocument();
    expect(document.querySelector('.loading-overlay__content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingIndicator className="custom-loading" />);
    
    expect(document.querySelector('.custom-loading')).toBeInTheDocument();
  });

  it('announces progress updates to screen readers', async () => {
    const { rerender } = render(
      <LoadingIndicator 
        type="progress" 
        progress={25} 
        showProgress={true}
        announceProgress={true}
      />
    );

    // Update progress
    rerender(
      <LoadingIndicator 
        type="progress" 
        progress={75} 
        showProgress={true}
        announceProgress={true}
      />
    );

    // Wait for announcement (throttled to 1 second)
    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="polite"]');
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Loading progress: 75% complete')
      );
      expect(announcement).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('does not announce progress when disabled', () => {
    render(
      <LoadingIndicator 
        type="progress" 
        progress={50} 
        announceProgress={false}
      />
    );

    // Should not create progress announcements
    const announcements = document.querySelectorAll('[aria-live="polite"]');
    const progressAnnouncement = Array.from(announcements).find(el => 
      el.textContent.includes('Loading progress')
    );
    expect(progressAnnouncement).toBeFalsy();
  });
});

describe('useLoading hook', () => {
  const TestComponent = () => {
    const { isLoading, progress, message, startLoading, updateProgress, stopLoading } = useLoading();

    return (
      <div>
        <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
        <div data-testid="progress">{progress}</div>
        <div data-testid="message">{message}</div>
        <button onClick={() => startLoading('Custom loading...')}>Start</button>
        <button onClick={() => updateProgress(75, 'Almost done...')}>Update</button>
        <button onClick={stopLoading}>Stop</button>
      </div>
    );
  };

  it('manages loading state correctly', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('progress')).toHaveTextContent('0');
    expect(screen.getByTestId('message')).toHaveTextContent('Loading...');
  });

  it('starts loading with custom message', () => {
    render(<TestComponent />);
    
    const startButton = screen.getByRole('button', { name: 'Start' });
    startButton.click();
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('message')).toHaveTextContent('Custom loading...');
  });

  it('updates progress and message', () => {
    render(<TestComponent />);
    
    const startButton = screen.getByRole('button', { name: 'Start' });
    const updateButton = screen.getByRole('button', { name: 'Update' });
    
    startButton.click();
    updateButton.click();
    
    expect(screen.getByTestId('progress')).toHaveTextContent('75');
    expect(screen.getByTestId('message')).toHaveTextContent('Almost done...');
  });

  it('stops loading and resets state', () => {
    render(<TestComponent />);
    
    const startButton = screen.getByRole('button', { name: 'Start' });
    const updateButton = screen.getByRole('button', { name: 'Update' });
    const stopButton = screen.getByRole('button', { name: 'Stop' });
    
    startButton.click();
    updateButton.click();
    stopButton.click();
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('progress')).toHaveTextContent('0');
  });
});

describe('withLoading HOC', () => {
  const TestComponent = ({ message }) => <div>{message}</div>;
  const LoadingTestComponent = withLoading(TestComponent);

  it('renders loading indicator when isLoading is true', () => {
    render(
      <LoadingTestComponent 
        isLoading={true} 
        loadingProps={{ message: 'Loading component...' }}
      />
    );
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading component...')).toBeInTheDocument();
  });

  it('renders wrapped component when isLoading is false', () => {
    render(
      <LoadingTestComponent 
        isLoading={false} 
        message="Component loaded!"
      />
    );
    
    expect(screen.getByText('Component loaded!')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('passes through props to wrapped component', () => {
    render(
      <LoadingTestComponent 
        isLoading={false} 
        message="Test message"
        extraProp="extra value"
      />
    );
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});