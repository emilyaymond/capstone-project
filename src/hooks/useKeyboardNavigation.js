import { useEffect, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import keyboardNavigationService from '../services/KeyboardNavigationService';

/**
 * Custom hook for keyboard navigation functionality
 * Provides methods to manage keyboard shortcuts, focus, and navigation
 */
export function useKeyboardNavigation() {
  const accessibilityContext = useAccessibility();
  const preferences = accessibilityContext?.preferences || {
    interactionSettings: { keyboardShortcuts: true }
  };

  // Initialize keyboard navigation service on mount
  useEffect(() => {
    try {
      if (preferences?.interactionSettings?.keyboardShortcuts) {
        keyboardNavigationService.initialize();
      }
    } catch (error) {
      console.error('Error initializing keyboard navigation service:', error);
    }

    return () => {
      // Don't destroy the service as it might be used by other components
      // keyboardNavigationService.destroy();
    };
  }, [preferences?.interactionSettings?.keyboardShortcuts]);

  /**
   * Register a keyboard shortcut
   */
  const registerShortcut = useCallback((key, modifiers, handler, description) => {
    keyboardNavigationService.registerShortcut(key, modifiers, handler, description);
  }, []);

  /**
   * Register multiple keyboard shortcuts at once
   */
  const registerKeyboardShortcuts = useCallback((shortcuts) => {
    try {
      if (!shortcuts || typeof shortcuts !== 'object') {
        console.warn('registerKeyboardShortcuts: shortcuts must be an object');
        return;
      }
      
      Object.entries(shortcuts).forEach(([shortcut, handler]) => {
        if (typeof handler !== 'function') {
          console.warn(`registerKeyboardShortcuts: handler for ${shortcut} must be a function`);
          return;
        }
        
        // Parse shortcut string like "Alt+1" or "Ctrl+,"
        const parts = shortcut.split('+');
        const key = parts[parts.length - 1];
        const modifiers = parts.slice(0, -1);
        keyboardNavigationService.registerShortcut(key, modifiers, handler, `Shortcut: ${shortcut}`);
      });
    } catch (error) {
      console.error('Error registering keyboard shortcuts:', error);
    }
  }, []);

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((key, modifiers) => {
    keyboardNavigationService.unregisterShortcut(key, modifiers);
  }, []);

  /**
   * Unregister multiple keyboard shortcuts at once
   */
  const unregisterKeyboardShortcuts = useCallback((shortcuts) => {
    shortcuts.forEach((shortcut) => {
      const parts = shortcut.split('+');
      const key = parts[parts.length - 1];
      const modifiers = parts.slice(0, -1);
      keyboardNavigationService.unregisterShortcut(key, modifiers);
    });
  }, []);

  /**
   * Enable or disable a shortcut
   */
  const toggleShortcut = useCallback((key, modifiers, enabled) => {
    keyboardNavigationService.toggleShortcut(key, modifiers, enabled);
  }, []);

  /**
   * Focus an element safely
   */
  const focusElement = useCallback((element) => {
    keyboardNavigationService.focusElement(element);
  }, []);

  /**
   * Focus the first focusable element
   */
  const focusFirst = useCallback(() => {
    keyboardNavigationService.focusFirst();
  }, []);

  /**
   * Focus the last focusable element
   */
  const focusLast = useCallback(() => {
    keyboardNavigationService.focusLast();
  }, []);

  /**
   * Navigate to the next focusable element
   */
  const navigateToNext = useCallback(() => {
    keyboardNavigationService.navigateToNext();
  }, []);

  /**
   * Navigate to the previous focusable element
   */
  const navigateToPrevious = useCallback(() => {
    keyboardNavigationService.navigateToPrevious();
  }, []);

  /**
   * Navigate to the next landmark
   */
  const navigateToNextLandmark = useCallback(() => {
    keyboardNavigationService.navigateToNextLandmark();
  }, []);

  /**
   * Show skip links
   */
  const showSkipLinks = useCallback(() => {
    keyboardNavigationService.showSkipLinks();
  }, []);

  /**
   * Set up focus trap for modals
   */
  const setupFocusTrap = useCallback((container) => {
    keyboardNavigationService.setupFocusTrap(container);
  }, []);

  /**
   * Exit focus trap
   */
  const exitFocusTrap = useCallback(() => {
    keyboardNavigationService.exitFocusTrap();
  }, []);

  /**
   * Get all registered shortcuts
   */
  const getShortcuts = useCallback(() => {
    return keyboardNavigationService.getShortcuts();
  }, []);

  /**
   * Update focusable elements (useful after dynamic content changes)
   */
  const updateFocusableElements = useCallback(() => {
    keyboardNavigationService.updateFocusableElements();
  }, []);

  return {
    registerShortcut,
    registerKeyboardShortcuts,
    unregisterShortcut,
    unregisterKeyboardShortcuts,
    toggleShortcut,
    focusElement,
    focusFirst,
    focusLast,
    navigateToNext,
    navigateToPrevious,
    navigateToNextLandmark,
    showSkipLinks,
    setupFocusTrap,
    exitFocusTrap,
    getShortcuts,
    updateFocusableElements,
    isKeyboardNavigationEnabled: preferences.interactionSettings.keyboardShortcuts,
  };
}