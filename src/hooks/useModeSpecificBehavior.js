import { useCallback, useEffect } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAudio } from './useAudio';

export const useModeSpecificBehavior = () => {
  const { mode, settings } = useAccessibility();
  const { playEnhancedFeedback } = useAudio();

  // Enhanced button interaction for audio and hybrid modes
  const handleButtonInteraction = useCallback((element, action) => {
    if (!element || (!settings.audioEnabled && mode !== 'audio')) {
      return;
    }

    switch (action) {
      case 'hover':
        if (mode === 'audio' || mode === 'hybrid') {
          playEnhancedFeedback('button-hover', mode);
        }
        break;
      case 'focus':
        if (mode === 'audio' || mode === 'hybrid') {
          playEnhancedFeedback('button-focus', mode);
        }
        break;
      case 'click':
        playEnhancedFeedback('click', mode);
        break;
      default:
        break;
    }
  }, [mode, settings.audioEnabled, playEnhancedFeedback]);

  // Add enhanced event listeners for audio and hybrid modes
  const addEnhancedInteractionListeners = useCallback((element) => {
    if (!element || (mode !== 'audio' && mode !== 'hybrid')) {
      return () => {}; // Return cleanup function
    }

    const handleMouseEnter = () => handleButtonInteraction(element, 'hover');
    const handleFocus = () => handleButtonInteraction(element, 'focus');
    const handleClick = () => handleButtonInteraction(element, 'click');

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('click', handleClick);

    // Return cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('click', handleClick);
    };
  }, [mode, handleButtonInteraction]);

  // Apply mode-specific DOM enhancements
  useEffect(() => {
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    const cleanupFunctions = [];

    buttons.forEach(button => {
      const cleanup = addEnhancedInteractionListeners(button);
      cleanupFunctions.push(cleanup);
    });

    // Cleanup all listeners when mode changes or component unmounts
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [mode, addEnhancedInteractionListeners]);

  // Mode-specific focus management
  const enhanceFocusIndicators = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      // Remove existing mode-specific classes
      element.classList.remove('focus-visual', 'focus-audio', 'focus-hybrid', 'focus-simplified');
      
      // Add mode-specific focus class
      element.classList.add(`focus-${mode}`);
    });
  }, [mode]);

  // Apply focus enhancements when mode changes
  useEffect(() => {
    enhanceFocusIndicators();
  }, [mode, enhanceFocusIndicators]);

  // Mode-specific interaction helpers
  const getInteractionProps = useCallback((elementType = 'button') => {
    const baseProps = {};

    switch (mode) {
      case 'audio':
        return {
          ...baseProps,
          'aria-describedby': 'audio-mode-help',
          onMouseEnter: (e) => handleButtonInteraction(e.target, 'hover'),
          onFocus: (e) => handleButtonInteraction(e.target, 'focus'),
          onClick: (e) => handleButtonInteraction(e.target, 'click'),
        };
      
      case 'hybrid':
        return {
          ...baseProps,
          onMouseEnter: (e) => handleButtonInteraction(e.target, 'hover'),
          onFocus: (e) => handleButtonInteraction(e.target, 'focus'),
          onClick: (e) => handleButtonInteraction(e.target, 'click'),
        };
      
      case 'simplified':
        return {
          ...baseProps,
          'aria-describedby': 'simplified-mode-help',
        };
      
      case 'visual':
      default:
        return baseProps;
    }
  }, [mode, handleButtonInteraction]);

  // Mode-specific styling helpers
  const getModeSpecificClasses = useCallback((baseClasses = '') => {
    const modeClass = `mode-${mode}`;
    const fontClass = `font-${settings.fontSize}`;
    const contrastClass = `contrast-${settings.contrast}`;
    
    return `${baseClasses} ${modeClass} ${fontClass} ${contrastClass}`.trim();
  }, [mode, settings.fontSize, settings.contrast]);

  // Simplified interface helpers for simplified mode
  const getSimplifiedProps = useCallback(() => {
    if (mode !== 'simplified') {
      return {};
    }

    return {
      'aria-describedby': 'simplified-mode-description',
      style: {
        fontSize: '1.2em',
        padding: '1.25rem 2rem',
        minHeight: '52px',
        fontWeight: '600',
        letterSpacing: '0.5px'
      }
    };
  }, [mode]);

  return {
    mode,
    handleButtonInteraction,
    addEnhancedInteractionListeners,
    enhanceFocusIndicators,
    getInteractionProps,
    getModeSpecificClasses,
    getSimplifiedProps
  };
};