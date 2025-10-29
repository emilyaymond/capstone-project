import React, { useEffect, useRef } from 'react';
import './ConfirmationDialog.css';

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'default', // 'default', 'warning', 'danger'
  autoFocus = 'cancel' // 'confirm', 'cancel', 'none'
}) => {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the dialog
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
      
      // Set initial focus based on autoFocus prop
      setTimeout(() => {
        if (autoFocus === 'confirm' && confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        } else if (autoFocus === 'cancel' && cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 100);

      // Announce dialog opening to screen readers
      announceToScreenReader(`Dialog opened: ${title}. ${message}`);
    } else if (previousActiveElement.current) {
      // Restore focus when dialog closes
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen, title, message, autoFocus]);

  const announceToScreenReader = (message) => {
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

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Tab') {
      // Trap focus within dialog
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const handleConfirm = () => {
    announceToScreenReader('Action confirmed');
    onConfirm();
  };

  const handleCancel = () => {
    announceToScreenReader('Action cancelled');
    onCancel();
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="confirmation-dialog__backdrop"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className={`confirmation-dialog confirmation-dialog--${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="confirmation-dialog__content">
          <div className="confirmation-dialog__header">
            <h2 id="dialog-title" className="confirmation-dialog__title">
              {title}
            </h2>
          </div>
          
          <div className="confirmation-dialog__body">
            <p id="dialog-message" className="confirmation-dialog__message">
              {message}
            </p>
          </div>
          
          <div className="confirmation-dialog__footer">
            <button
              ref={cancelButtonRef}
              type="button"
              className="confirmation-dialog__button confirmation-dialog__button--secondary"
              onClick={handleCancel}
              aria-describedby="cancel-description"
            >
              {cancelText}
            </button>
            <div id="cancel-description" className="sr-only">
              Closes the dialog without performing the action
            </div>
            
            <button
              ref={confirmButtonRef}
              type="button"
              className={`confirmation-dialog__button confirmation-dialog__button--${type === 'danger' ? 'danger' : 'primary'}`}
              onClick={handleConfirm}
              aria-describedby="confirm-description"
            >
              {confirmText}
            </button>
            <div id="confirm-description" className="sr-only">
              Confirms and performs the requested action
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;