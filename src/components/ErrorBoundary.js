import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Announce error to screen readers
    const announcement = `An error occurred in the application. Please try refreshing the page or contact support if the problem persists.`;
    this.announceError(announcement);
  }

  announceError = (message) => {
    // Find or create assertive live region for error announcements
    let liveRegion = document.getElementById('sr-assertive-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'sr-assertive-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('role', 'alert');
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
  };

  handleRetry = () => {
    this.setState({ isRetrying: true });
    
    // Clear error state after a brief delay to allow for retry
    setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isRetrying: false
      });
      
      this.announceError('Retrying application. Please wait...');
    }, 100);
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallback: CustomFallback } = this.props;

      // If a custom fallback is provided, use it
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error}
            onRetry={this.handleRetry}
            onRefresh={this.handleRefresh}
            isRetrying={this.state.isRetrying}
          />
        );
      }

      // Default error UI
      return (
        <div className="error-boundary" role="alert" aria-labelledby="error-heading">
          <div className="error-content">
            <h1 id="error-heading">Something went wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected happened. This error has been logged 
              and we're working to fix it.
            </p>
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="error-button retry-button"
                aria-describedby="retry-description"
              >
                {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
              
              <button 
                onClick={this.handleRefresh}
                className="error-button refresh-button"
                aria-describedby="refresh-description"
              >
                Refresh Page
              </button>
            </div>

            <div className="error-help">
              <h2>What you can do:</h2>
              <ul>
                <li>Click "Try Again" to retry the last action</li>
                <li>Click "Refresh Page" to reload the application</li>
                <li>If the problem continues, try clearing your browser cache</li>
                <li>Contact support if you need additional help</li>
              </ul>
            </div>

            {/* Hidden descriptions for screen readers */}
            <div className="sr-only">
              <div id="retry-description">
                Attempts to recover from the error without losing your current session
              </div>
              <div id="refresh-description">
                Reloads the entire page, which will reset your session
              </div>
            </div>

            {/* Error details for debugging (hidden by default) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-details">
                <summary>Technical Details (Development Only)</summary>
                <pre className="error-stack">
                  {error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;