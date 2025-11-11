import { useCallback } from 'react';

export const useKeyboard = () => {
  const registerShortcuts = useCallback((shortcuts) => {
    const handleKeyDown = (event) => {
      const key = event.key;
      const modifiers = [];
      
      if (event.ctrlKey) modifiers.push('Ctrl');
      if (event.altKey) modifiers.push('Alt');
      if (event.metaKey) modifiers.push('Meta');
      if (event.shiftKey) modifiers.push('Shift');
      
      const shortcutKey = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
      
      if (shortcuts[shortcutKey]) {
        event.preventDefault();
        shortcuts[shortcutKey]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const focusElement = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
    }
  }, []);

  const announceToScreenReader = useCallback((message, priority = 'polite') => {
    const liveRegion = document.getElementById(
      priority === 'assertive' ? 'sr-assertive-region' : 'sr-live-region'
    );
    
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  return {
    registerShortcuts,
    focusElement,
    announceToScreenReader
  };
};