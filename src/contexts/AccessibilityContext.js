import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial accessibility state
const initialState = {
  mode: 'visual', // 'visual' | 'audio' | 'hybrid' | 'simplified'
  preferences: { //prefs- this is the heart of accessibility system
    visualSettings: {
      fontSize: 16,
      contrast: 'normal',
      colorScheme: 'light',
      reducedMotion: false,
    },
    audioSettings: {
      enableSonification: false,
      speechRate: 1,
      audioVolume: 0.7,
      preferredVoice: null,
    },
    interactionSettings: {
      keyboardShortcuts: true,
      hapticFeedback: false,
      progressiveDisclosure: true,
      simplifiedMode: false,
    },
  },
  isScreenReaderActive: false,
};

// Action types
const ACCESSIBILITY_ACTIONS = {
  SET_MODE: 'SET_MODE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  SET_SCREEN_READER_ACTIVE: 'SET_SCREEN_READER_ACTIVE',
  ANNOUNCE_TO_SCREEN_READER: 'ANNOUNCE_TO_SCREEN_READER',
};

// Reducer function
function accessibilityReducer(state, action) {
  switch (action.type) {
    case ACCESSIBILITY_ACTIONS.SET_MODE:
      return {
        ...state,
        mode: action.payload,
      };
    case ACCESSIBILITY_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
    case ACCESSIBILITY_ACTIONS.SET_SCREEN_READER_ACTIVE:
      return {
        ...state,
        isScreenReaderActive: action.payload,
      };
    default:
      return state;
  }
}

// Create context
const AccessibilityContext = createContext();

// Context provider component
export function AccessibilityProvider({ children }) {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState); //state is initial/default and reducer is function that handles state transitions

  // Load preferences and mode from localStorage on start
  useEffect(() => {
    const savedPreferences = localStorage.getItem('healthvis-accessibility-preferences'); 
    const savedMode = localStorage.getItem('healthvis-accessibility-mode');
    
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        dispatch({
          type: ACCESSIBILITY_ACTIONS.UPDATE_PREFERENCES,
          payload: parsed,
        });
      } catch (error) {
        console.warn('Failed to load accessibility preferences:', error);
      }
    }
    
    if (savedMode) {
      dispatch({
        type: ACCESSIBILITY_ACTIONS.SET_MODE,
        payload: savedMode,
      });
    }
  }, []);

  // Save preferences to localStorage when they change so next startup begins on same accessibility prefs
  useEffect(() => {
    localStorage.setItem(
      'healthvis-accessibility-preferences',
      JSON.stringify(state.preferences)
    );
  }, [state.preferences]);

  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('healthvis-accessibility-mode', state.mode);
  }, [state.mode]);

  // Mode-specific feature toggles -> feature flags are boolean flags act as switches that turn accessibility features on/off based on the user's chosen mode
  const getModeFeatures = (mode) => {
    switch (mode) {
      case 'audio':
        return {
          prioritizeAudio: true,
          enhancedSonification: true,
          reduceVisualComplexity: true,
          enableVoiceDescriptions: true,
          keyboardOptimized: true,
        };
      case 'simplified':
        return {
          prioritizeAudio: false,
          enhancedSonification: false,
          reduceVisualComplexity: true,
          enableVoiceDescriptions: false,
          keyboardOptimized: false,
          hideAdvancedFeatures: true,
          largerTargets: true,
        };
      case 'hybrid':
        return {
          prioritizeAudio: true,
          enhancedSonification: true,
          reduceVisualComplexity: false,
          enableVoiceDescriptions: true,
          keyboardOptimized: true,
        };
      case 'visual':
      default:
        return {
          prioritizeAudio: false,
          enhancedSonification: false,
          reduceVisualComplexity: false,
          enableVoiceDescriptions: false,
          keyboardOptimized: false,
        };
    }
  };

  // Context value with actions
  const contextValue = {
    ...state,
    modeFeatures: getModeFeatures(state.mode),
    setMode: (mode) => {
      dispatch({ type: ACCESSIBILITY_ACTIONS.SET_MODE, payload: mode });
    },
    updatePreferences: (preferences) => {
      dispatch({ type: ACCESSIBILITY_ACTIONS.UPDATE_PREFERENCES, payload: preferences });
    },
    setScreenReaderActive: (active) => {
      dispatch({ type: ACCESSIBILITY_ACTIONS.SET_SCREEN_READER_ACTIVE, payload: active });
    },
    announceToScreenReader: (message) => {
      // This will be implemented with ARIA live regions
      const announcement = new CustomEvent('screenReaderAnnouncement', {
        detail: { message },
      });
      window.dispatchEvent(announcement);
    },
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Custom hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

export { ACCESSIBILITY_ACTIONS };