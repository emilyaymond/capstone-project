import { useEffect, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import screenReaderService from '../services/ScreenReaderService';

/**
 * Custom hook for managing screen reader announcements
 * Provides methods to announce messages to screen readers via ARIA live regions
 *  ex:
 *  announcePolite,       "Data loaded successfully"
 *  announceAssertive,    "Error! Action failed"
 *  announceDataPoint,    "Blood pressure: 120/80 at 2:30 PM"
 *  announceNavigation,   "Navigated to Dashboard"
 *  isScreenReaderActive  true/false
 */

export function useScreenReader() {
    const accessibilityContext = useAccessibility();
    const isScreenReaderActive = accessibilityContext?.isScreenReaderActive || false;
    const setScreenReaderActive = accessibilityContext?.setScreenReaderActive || (() => {});

    // Initialize screen reader service on mount
    useEffect(() => {
        try {
            screenReaderService.initialize();
            
            // Detect if screen reader is active
            const detected = screenReaderService.detectScreenReader();
            if (detected !== isScreenReaderActive && setScreenReaderActive) {
                setScreenReaderActive(detected);
            }
        } catch (error) {
            console.error('Error initializing screen reader service:', error);
        }

        // Cleanup on unmount
        return () => {
            // Don't destroy the service as it might be used by other components
            // screenReaderService.destroy();
        };
    }, [isScreenReaderActive, setScreenReaderActive]);

    /**
     * Announce a message immediately (assertive)
     * Use for urgent messages that should interrupt current screen reader output
     */
    const announceAssertive = useCallback((message) => {
        screenReaderService.announce(message, 'assertive');
    }, []);

    /**
     * Announce a message politely (polite)
     * Use for non-urgent messages that can wait for current screen reader output to finish
     */
    const announcePolite = useCallback((message) => {
        screenReaderService.announce(message, 'polite');
    }, []);

    /**
     * Announce status updates
     */
    const announceStatus = useCallback((message) => {
        screenReaderService.announce(message, 'status');
    }, []);

    /**
     * Announce data context for visualizations
     */
    const announceDataContext = useCallback((data) => {
        screenReaderService.announceDataContext(data);
    }, []);

    /**
     * Announce individual data point details
     */
    const announceDataPoint = useCallback((dataPoint) => {
        screenReaderService.announceDataPoint(dataPoint);
    }, []);

    /**
     * Announce navigation changes
     */
    const announceNavigation = useCallback((location) => {
        screenReaderService.announceNavigation(location);
    }, []);

    /**
     * Announce form validation errors
     */
    const announceFormError = useCallback((fieldName, errorMessage) => {
        screenReaderService.announceFormError(fieldName, errorMessage);
    }, []);

    /**
     * Announce successful actions
     */
    const announceSuccess = useCallback((action, details) => {
        screenReaderService.announceSuccess(action, details);
    }, []);

    /**
     * Clear all live region announcements
     */
    const clearAnnouncements = useCallback(() => {
        screenReaderService.clearAllAnnouncements();
    }, []);

    return {
        announceAssertive,
        announcePolite,
        announceStatus,
        announceDataContext,
        announceDataPoint,
        announceNavigation,
        announceFormError,
        announceSuccess,
        clearAnnouncements,
        isScreenReaderActive,
    };
}