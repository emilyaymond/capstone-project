import React, { useEffect, useState } from 'react';
import './LoadingIndicator.css';

const LoadingIndicator = ({
  type = 'spinner', // 'spinner', 'progress', 'dots'
  size = 'medium', // 'small', 'medium', 'large'
  message = 'Loading...',
  progress = null, // 0-100 for progress bar
  showProgress = false,
  overlay = false,
  className = '',
  announceProgress = true
}) => {
  const [announceTimeout, setAnnounceTimeout] = useState(null);

  useEffect(() => {
    if (announceProgress && progress !== null && showProgress) {
      // Announce progress updates, but throttle them
      if (announceTimeout) {
        clearTimeout(announceTimeout);
      }
      
      const timeout = setTimeout(() => {
        announceToScreenReader(`Loading progress: ${Math.round(progress)}% complete`);
      }, 1000);
      
      setAnnounceTimeout(timeout);
    }

    return () => {
      if (announceTimeout) {
        clearTimeout(announceTimeout);
      }
    };
  }, [progress, showProgress, announceProgress, announceTimeout]);

  const announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
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

  const renderSpinner = () => (
    <div 
      className={`loading-spinner loading-spinner--${size}`}
      role="progressbar"
      aria-label={message}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progress}
    >
      <div className="loading-spinner__circle"></div>
    </div>
  );

  const renderProgressBar = () => (
    <div className="loading-progress">
      <div 
        className="loading-progress__bar"
        role="progressbar"
        aria-label={message}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress || 0}
        aria-valuetext={progress ? `${Math.round(progress)}% complete` : 'Loading...'}
      >
        <div 
          className="loading-progress__fill"
          style={{ width: `${progress || 0}%` }}
        ></div>
      </div>
      {showProgress && progress !== null && (
        <div className="loading-progress__text">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );

  const renderDots = () => (
    <div 
      className={`loading-dots loading-dots--${size}`}
      role="progressbar"
      aria-label={message}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progress}
    >
      <div className="loading-dots__dot"></div>
      <div className="loading-dots__dot"></div>
      <div className="loading-dots__dot"></div>
    </div>
  );

  const renderIndicator = () => {
    switch (type) {
      case 'progress':
        return renderProgressBar();
      case 'dots':
        return renderDots();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div 
      className={`loading-indicator loading-indicator--${size} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {renderIndicator()}
      <div className="loading-indicator__message">
        {message}
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-overlay__backdrop"></div>
        <div className="loading-overlay__content">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Hook for managing loading states
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading...');

  const startLoading = (loadingMessage = 'Loading...') => {
    setMessage(loadingMessage);
    setProgress(0);
    setIsLoading(true);
  };

  const updateProgress = (newProgress, newMessage) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    if (newMessage) {
      setMessage(newMessage);
    }
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(0);
  };

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading
  };
};

// Higher-order component for adding loading states
export const withLoading = (WrappedComponent) => {
  return function LoadingWrapper(props) {
    const { isLoading, loadingProps = {}, ...restProps } = props;

    if (isLoading) {
      return <LoadingIndicator {...loadingProps} />;
    }

    return <WrappedComponent {...restProps} />;
  };
};

export default LoadingIndicator;