import { useEffect, useRef } from 'react';
import './ScreenReaderAnnouncements.css';

const ScreenReaderAnnouncements = () => {
  const politeRegionRef = useRef(null);
  const assertiveRegionRef = useRef(null);

  useEffect(() => {
    // Create global announcement function
    window.announceToScreenReader = (message, priority = 'polite') => {
      if (!message) return;

      const region = priority === 'assertive' ? assertiveRegionRef.current : politeRegionRef.current;
      
      if (region) {
        // Clear the region first to ensure the announcement is heard
        region.textContent = '';
        
        // Use a small delay to ensure the clearing is processed
        setTimeout(() => {
          region.textContent = message;
        }, 10);
      }
    };

    // Cleanup function
    return () => {
      if (window.announceToScreenReader) {
        delete window.announceToScreenReader;
      }
    };
  }, []);

  return (
    <>
      {/* Polite announcements - for non-urgent information */}
      <div
        ref={politeRegionRef}
        id="sr-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        aria-label="Status messages"
      />
      
      {/* Assertive announcements - for urgent information and errors */}
      <div
        ref={assertiveRegionRef}
        id="sr-assertive-region"
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        aria-label="Important alerts"
      />
      
      {/* Additional live regions for specific types of announcements */}
      <div
        id="sr-navigation-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        aria-label="Navigation updates"
      />
      
      <div
        id="sr-settings-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        aria-label="Settings changes"
      />
      
      <div
        id="sr-mode-region"
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="status"
        aria-label="Accessibility mode changes"
      />
    </>
  );
};

// Hook for enhanced screen reader announcements
export const useScreenReaderAnnouncements = () => {
  const announce = (message, priority = 'polite', category = 'general') => {
    if (!message) return;

    // Use specific regions for different categories when available
    let regionId = 'sr-live-region';
    
    switch (category) {
      case 'navigation':
        regionId = 'sr-navigation-region';
        break;
      case 'settings':
        regionId = 'sr-settings-region';
        break;
      case 'mode':
        regionId = 'sr-mode-region';
        priority = 'assertive'; // Mode changes are always important
        break;
      case 'error':
        regionId = 'sr-assertive-region';
        priority = 'assertive';
        break;
      default:
        regionId = priority === 'assertive' ? 'sr-assertive-region' : 'sr-live-region';
    }

    const region = document.getElementById(regionId);
    
    if (region) {
      // Clear the region first
      region.textContent = '';
      
      // Add the new message with a small delay
      setTimeout(() => {
        region.textContent = message;
      }, 10);
    }

    // Also use the global function as fallback
    if (window.announceToScreenReader) {
      window.announceToScreenReader(message, priority);
    }
  };

  const announceSuccess = (action, details = '') => {
    const message = `Success: ${action}${details ? '. ' + details : ''}`;
    announce(message, 'polite');
  };

  const announceError = (action, errorMessage = '', recovery = '') => {
    let message = `Error: ${action}`;
    if (errorMessage) {
      message += `. ${errorMessage}`;
    }
    if (recovery) {
      message += `. ${recovery}`;
    }
    announce(message, 'assertive', 'error');
  };

  const announceNavigation = (destination, context = '') => {
    const message = `Navigated to ${destination}${context ? '. ' + context : ''}`;
    announce(message, 'polite', 'navigation');
  };

  const announceModeChange = (newMode, description = '') => {
    const message = `Accessibility mode changed to ${newMode}${description ? '. ' + description : ''}`;
    announce(message, 'assertive', 'mode');
  };

  const announceSettingsChange = (setting, value, impact = '') => {
    const message = `${setting} changed to ${value}${impact ? '. ' + impact : ''}`;
    announce(message, 'polite', 'settings');
  };

  const announceLoading = (action, isLoading = true) => {
    if (isLoading) {
      announce(`Loading: ${action}. Please wait.`, 'polite');
    } else {
      announce(`Finished loading: ${action}`, 'polite');
    }
  };

  const announceProgress = (action, current, total, unit = 'items') => {
    const message = `${action}: ${current} of ${total} ${unit} completed`;
    announce(message, 'polite');
  };

  return {
    announce,
    announceSuccess,
    announceError,
    announceNavigation,
    announceModeChange,
    announceSettingsChange,
    announceLoading,
    announceProgress
  };
};

export default ScreenReaderAnnouncements;