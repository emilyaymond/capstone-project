import React, { useState, useCallback, useEffect } from 'react';
import '../styles/components/NotificationSystem.css';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      dismissible: true,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss if duration is set
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    // Announce to screen readers
    announceToScreenReader(newNotification);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const announceToScreenReader = (notification) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', notification.type === 'error' ? 'assertive' : 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    
    const typeText = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    }[notification.type] || 'Notification';
    
    announcement.textContent = `${typeText}: ${notification.message}`;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  };

  // Expose methods globally for easy access
  useEffect(() => {
    window.showNotification = addNotification;
    window.hideNotification = removeNotification;
    window.clearNotifications = clearAllNotifications;

    return () => {
      delete window.showNotification;
      delete window.hideNotification;
      delete window.clearNotifications;
    };
  }, [addNotification, removeNotification, clearAllNotifications]);

  return (
    <div 
      className="notification-system"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const Notification = ({ notification, onDismiss }) => {
  const { type, title, message, dismissible, actions = [] } = notification;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && dismissible) {
      onDismiss();
    }
  };

  const getIcon = () => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  };

  return (
    <div
      className={`notification notification--${type}`}
      role="alert"
      aria-labelledby={title ? `notification-title-${notification.id}` : undefined}
      aria-describedby={`notification-message-${notification.id}`}
      onKeyDown={handleKeyDown}
      tabIndex={dismissible ? 0 : -1}
    >
      <div className="notification__content">
        <div className="notification__icon" aria-hidden="true">
          {getIcon()}
        </div>
        
        <div className="notification__text">
          {title && (
            <h3 
              id={`notification-title-${notification.id}`}
              className="notification__title"
            >
              {title}
            </h3>
          )}
          <p 
            id={`notification-message-${notification.id}`}
            className="notification__message"
          >
            {message}
          </p>
        </div>
        
        {actions.length > 0 && (
          <div className="notification__actions">
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
                className={`notification__action notification__action--${action.type || 'secondary'}`}
                onClick={action.onClick}
                aria-describedby={`action-description-${notification.id}-${index}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        
        {dismissible && (
          <button
            type="button"
            className="notification__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            aria-describedby={`dismiss-description-${notification.id}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      
      {/* Hidden descriptions for screen readers */}
      {actions.map((action, index) => (
        <div 
          key={index}
          id={`action-description-${notification.id}-${index}`}
          className="sr-only"
        >
          {action.description || `Performs ${action.label} action`}
        </div>
      ))}
      
      {dismissible && (
        <div id={`dismiss-description-${notification.id}`} className="sr-only">
          Closes this notification
        </div>
      )}
    </div>
  );
};

// Helper functions for common notification types
export const showSuccess = (message, options = {}) => {
  if (window.showNotification) {
    return window.showNotification({
      type: 'success',
      message,
      ...options
    });
  }
};

export const showError = (message, options = {}) => {
  if (window.showNotification) {
    return window.showNotification({
      type: 'error',
      message,
      duration: 0, // Don't auto-dismiss errors
      ...options
    });
  }
};

export const showWarning = (message, options = {}) => {
  if (window.showNotification) {
    return window.showNotification({
      type: 'warning',
      message,
      duration: 7000, // Longer duration for warnings
      ...options
    });
  }
};

export const showInfo = (message, options = {}) => {
  if (window.showNotification) {
    return window.showNotification({
      type: 'info',
      message,
      ...options
    });
  }
};

export default NotificationSystem;