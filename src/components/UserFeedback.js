import { useEffect, useRef } from 'react';
import './UserFeedback.css';

const UserFeedback = ({ 
  type = 'info', 
  message, 
  isVisible = false, 
  onDismiss, 
  autoHide = true, 
  duration = 5000,
  actionButton = null 
}) => {
  const timeoutRef = useRef(null);
  const messageRef = useRef(null);

  // Auto-hide functionality
  useEffect(() => {
    if (isVisible && autoHide && duration > 0) {
      timeoutRef.current = setTimeout(() => {
        if (onDismiss) {
          onDismiss();
        }
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, autoHide, duration, onDismiss]);

  // Announce message to screen readers when it becomes visible
  useEffect(() => {
    if (isVisible && message) {
      // Find or create appropriate live region based on message type
      const regionId = type === 'error' ? 'sr-assertive-region' : 'sr-live-region';
      let liveRegion = document.getElementById(regionId);
      
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = regionId;
        liveRegion.className = 'sr-only';
        liveRegion.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        if (type === 'error') {
          liveRegion.setAttribute('role', 'alert');
        } else {
          liveRegion.setAttribute('role', 'status');
        }
        document.body.appendChild(liveRegion);
      }
      
      liveRegion.textContent = message;
    }
  }, [isVisible, message, type]);

  // Handle keyboard interactions
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible || !message) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'loading':
        return '⟳';
      default:
        return 'ℹ';
    }
  };

  const getAriaRole = () => {
    switch (type) {
      case 'error':
        return 'alert';
      case 'warning':
        return 'alert';
      default:
        return 'status';
    }
  };

  return (
    <div 
      ref={messageRef}
      className={`user-feedback user-feedback--${type} ${isVisible ? 'user-feedback--visible' : ''}`}
      role={getAriaRole()}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      tabIndex={onDismiss ? 0 : -1}
    >
      <div className="user-feedback__content">
        <span className="user-feedback__icon" aria-hidden="true">
          {getIcon()}
        </span>
        <span className="user-feedback__message">
          {message}
        </span>
        
        {actionButton && (
          <div className="user-feedback__action">
            {actionButton}
          </div>
        )}
        
        {onDismiss && (
          <button
            className="user-feedback__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss message"
            title="Dismiss message (Press Escape)"
          >
            ✕
          </button>
        )}
      </div>
      
      {type === 'loading' && (
        <div className="user-feedback__progress" aria-hidden="true">
          <div className="user-feedback__progress-bar"></div>
        </div>
      )}
    </div>
  );
};

// Loading state component
export const LoadingFeedback = ({ message = 'Loading...', isVisible = false }) => {
  return (
    <UserFeedback
      type="loading"
      message={message}
      isVisible={isVisible}
      autoHide={false}
    />
  );
};

// Success message component
export const SuccessFeedback = ({ message, isVisible = false, onDismiss, duration = 3000 }) => {
  return (
    <UserFeedback
      type="success"
      message={message}
      isVisible={isVisible}
      onDismiss={onDismiss}
      duration={duration}
    />
  );
};

// Error message component
export const ErrorFeedback = ({ message, isVisible = false, onDismiss, actionButton = null }) => {
  return (
    <UserFeedback
      type="error"
      message={message}
      isVisible={isVisible}
      onDismiss={onDismiss}
      autoHide={false}
      actionButton={actionButton}
    />
  );
};

// Warning message component
export const WarningFeedback = ({ message, isVisible = false, onDismiss, duration = 4000 }) => {
  return (
    <UserFeedback
      type="warning"
      message={message}
      isVisible={isVisible}
      onDismiss={onDismiss}
      duration={duration}
    />
  );
};

export default UserFeedback;