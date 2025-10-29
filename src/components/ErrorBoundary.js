import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Announce error to screen readers
    const announcement = `An error has occurred: ${error.message}. Please try refreshing the page or contact support if the problem persists.`;
    this.announceToScreenReader(announcement);
  }

  announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    this.announceToScreenReader('Retrying application. Please wait.');
  };

  handleReload = () => {
    this.announceToScreenReader('Reloading page. Please wait.');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="error-boundary" role="alert" aria-labelledby="error-title">
          <div className="error-boundary__container">
            <h1 id="error-title" className="error-boundary__title">
              Something went wrong
            </h1>
            
            <div className="error-boundary__message">
              <p>
                We're sorry, but an unexpected error has occurred. 
                This may be a temporary issue.
              </p>
              
              {error && (
                <div className="error-boundary__details">
                  <h2>Error Details:</h2>
                  <p className="error-boundary__error-message">
                    {error.message || 'Unknown error occurred'}
                  </p>
                </div>
              )}
            </div>

            <div className="error-boundary__actions">
              <h2>What you can do:</h2>
              <ul className="error-boundary__suggestions">
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Try again in a few minutes</li>
              </ul>
              
              <div className="error-boundary__buttons">
                <button 
                  onClick={this.handleRetry}
                  className="error-boundary__button error-boundary__button--primary"
                  aria-describedby="retry-description"
                >
                  Try Again
                </button>
                <div id="retry-description" className="sr-only">
                  Attempts to reload the application without refreshing the page
                </div>
                
                <button 
                  onClick={this.handleReload}
                  className="error-boundary__button error-boundary__button--secondary"
                  aria-describedby="reload-description"
                >
                  Reload Page
                </button>
                <div id="reload-description" className="sr-only">
                  Refreshes the entire page to start fresh
                </div>
              </div>
            </div>

            {isDevelopment && this.state.errorInfo && (
              <details className="error-boundary__debug">
                <summary>Technical Details (Development Only)</summary>
                <pre className="error-boundary__stack">
                  {error && error.stack}
                  {this.state.errorInfo.componentStack}
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