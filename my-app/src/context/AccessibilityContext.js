import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

// Valid accessibility modes
const ACCESSIBILITY_MODES = ['visual', 'audio', 'hybrid', 'simplified'];

// Default settings
const DEFAULT_SETTINGS = {
  fontSize: 'medium',
  contrast: 'normal',
  audioEnabled: false
};

// Storage key
const STORAGE_KEY = 'healthvis-accessibility-settings';

// Check if localStorage is available and working
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Validate mode
const validateMode = (mode) => {
  return ACCESSIBILITY_MODES.includes(mode) ? mode : 'visual';
};

// Validate settings
const validateSettings = (settings) => {
  const validFontSizes = ['small', 'medium', 'large'];
  const validContrasts = ['normal', 'high'];
  
  return {
    fontSize: validFontSizes.includes(settings?.fontSize) ? settings.fontSize : DEFAULT_SETTINGS.fontSize,
    contrast: validContrasts.includes(settings?.contrast) ? settings.contrast : DEFAULT_SETTINGS.contrast,
    audioEnabled: typeof settings?.audioEnabled === 'boolean' ? settings.audioEnabled : DEFAULT_SETTINGS.audioEnabled
  };
};

export const AccessibilityProvider = ({ children }) => {
  const [mode, setModeState] = useState('visual');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        // Check if localStorage is available
        if (!isLocalStorageAvailable()) {
          console.warn('localStorage is not available, using default settings');
          return;
        }

        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          
          // Validate and apply loaded settings
          const validatedMode = validateMode(parsed.mode);
          const validatedSettings = validateSettings(parsed.settings);
          
          setModeState(validatedMode);
          setSettings(validatedSettings);
          
          console.log('Accessibility settings loaded successfully');
        }
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error);
        
        // Try to clear corrupted data
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (clearError) {
          console.warn('Failed to clear corrupted settings:', clearError);
        }
        
        // Reset to defaults on error
        setModeState('visual');
        setSettings(DEFAULT_SETTINGS);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    const saveSettings = () => {
      try {
        // Check if localStorage is available
        if (!isLocalStorageAvailable()) {
          console.warn('localStorage is not available, settings will not persist');
          return;
        }

        const settingsToSave = { mode, settings };
        const serialized = JSON.stringify(settingsToSave);
        
        // Check if we can actually write to localStorage
        localStorage.setItem(STORAGE_KEY, serialized);
        
        // Verify the save was successful
        const verification = localStorage.getItem(STORAGE_KEY);
        if (verification !== serialized) {
          throw new Error('Settings verification failed after save');
        }
        
      } catch (error) {
        console.warn('Failed to save accessibility settings:', error);
        
        // If it's a quota exceeded error, try to clear and retry once
        if (error.name === 'QuotaExceededError') {
          try {
            localStorage.clear();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, settings }));
            console.log('Settings saved after clearing localStorage');
          } catch (retryError) {
            console.error('Failed to save settings even after clearing localStorage:', retryError);
          }
        }
      }
    };

    // Only save if we have non-default values or this is not the initial load
    if (mode !== 'visual' || JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)) {
      saveSettings();
    }
  }, [mode, settings]);

  // Clear error state
  const clearError = () => {
    setError(null);
  };

  // Mode setter with validation and error handling
  const setMode = (newMode) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const validatedMode = validateMode(newMode);
      setModeState(validatedMode);
      
      // Simulate brief loading for mode switching
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      
    } catch (err) {
      console.error('Failed to set accessibility mode:', err);
      setError({
        type: 'mode-change',
        message: 'Failed to switch accessibility mode. Please try again.',
        originalError: err
      });
      setIsLoading(false);
    }
  };

  // Settings updater with validation and error handling
  const updateSettings = (newSettings) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const validatedSettings = validateSettings({ ...settings, ...newSettings });
      setSettings(validatedSettings);
      
      // Simulate brief loading for settings update
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      
    } catch (err) {
      console.error('Failed to update accessibility settings:', err);
      setError({
        type: 'settings-update',
        message: 'Failed to save accessibility settings. Your changes may not be preserved.',
        originalError: err
      });
      setIsLoading(false);
    }
  };

  const value = {
    mode,
    setMode,
    settings,
    updateSettings,
    availableModes: ACCESSIBILITY_MODES,
    error,
    clearError,
    isLoading
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};