/**
 * AccessibilityContext
 * 
 * Manages accessibility mode and user preferences for the HealthVis application.
 * Provides mode validation, settings validation, and persistence integration.
 * 
 * Requirements: 1.2, 1.3, 2.4, 2.5
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilityMode, AccessibilitySettings } from '../types';

// ============================================================================
// Context Value Interface
// ============================================================================

export interface AccessibilityContextValue {
  mode: AccessibilityMode;
  setMode: (mode: AccessibilityMode) => void;
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_MODE: AccessibilityMode = 'visual';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  audioEnabled: true,
  hapticsEnabled: true,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates if a given string is a valid AccessibilityMode
 */
function isValidMode(mode: any): mode is AccessibilityMode {
  return ['visual', 'audio', 'hybrid', 'simplified'].includes(mode);
}

/**
 * Validates if a given value is a valid font size
 */
function isValidFontSize(size: any): size is 'small' | 'medium' | 'large' {
  return ['small', 'medium', 'large'].includes(size);
}

/**
 * Validates if a given value is a valid contrast level
 */
function isValidContrast(contrast: any): contrast is 'normal' | 'high' {
  return ['normal', 'high'].includes(contrast);
}

/**
 * Validates and sanitizes accessibility settings
 * Invalid values are replaced with defaults
 */
function validateSettings(settings: Partial<AccessibilitySettings>): AccessibilitySettings {
  return {
    fontSize: isValidFontSize(settings.fontSize) ? settings.fontSize : DEFAULT_SETTINGS.fontSize,
    contrast: isValidContrast(settings.contrast) ? settings.contrast : DEFAULT_SETTINGS.contrast,
    audioEnabled: typeof settings.audioEnabled === 'boolean' ? settings.audioEnabled : DEFAULT_SETTINGS.audioEnabled,
    hapticsEnabled: typeof settings.hapticsEnabled === 'boolean' ? settings.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
  };
}

// ============================================================================
// Context Creation
// ============================================================================

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface AccessibilityProviderProps {
  children: ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [mode, setModeState] = useState<AccessibilityMode>(DEFAULT_MODE);
  const [settings, setSettingsState] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // ============================================================================
  // Load Settings on Mount
  // ============================================================================

  useEffect(() => {
    loadSettings();
  }, []);

  // ============================================================================
  // Load Settings Function
  // ============================================================================

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Integrate with useStorage hook when available (Task 4)
      // For now, we'll use a placeholder that can be replaced
      // const storage = useStorage();
      // const savedSettings = await storage.loadSettings();
      
      // Placeholder: Check AsyncStorage directly
      // This will be replaced when useStorage hook is implemented
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      
      const savedMode = await AsyncStorage.getItem('accessibility_mode');
      const savedSettingsJson = await AsyncStorage.getItem('accessibility_settings');

      // Load and validate mode
      if (savedMode && isValidMode(savedMode)) {
        setModeState(savedMode as AccessibilityMode);
      }

      // Load and validate settings
      if (savedSettingsJson) {
        try {
          const parsedSettings = JSON.parse(savedSettingsJson);
          const validatedSettings = validateSettings(parsedSettings);
          setSettingsState(validatedSettings);
        } catch (parseError) {
          // Invalid JSON, use defaults
          console.warn('Failed to parse saved settings, using defaults:', parseError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load settings');
      setError(errorMessage);
      console.error('Error loading accessibility settings:', errorMessage);
      // Continue with defaults
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // Save Settings Function
  // ============================================================================

  async function saveSettings(newMode: AccessibilityMode, newSettings: AccessibilitySettings) {
    try {
      // TODO: Integrate with useStorage hook when available (Task 4)
      // For now, we'll use a placeholder that can be replaced
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      
      await AsyncStorage.setItem('accessibility_mode', newMode);
      await AsyncStorage.setItem('accessibility_settings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Error saving accessibility settings:', err);
      // Don't throw - settings are still applied in memory
    }
  }

  // ============================================================================
  // Set Mode Function with Validation
  // ============================================================================

  const setMode = (newMode: AccessibilityMode) => {
    try {
      // Validate mode
      if (!isValidMode(newMode)) {
        throw new Error(`Invalid accessibility mode: ${newMode}`);
      }

      // Update state
      setModeState(newMode);

      // Persist to storage (async, non-blocking)
      saveSettings(newMode, settings);

      // Clear any previous errors
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to set mode');
      setError(errorMessage);
      console.error('Error setting accessibility mode:', errorMessage);
    }
  };

  // ============================================================================
  // Update Settings Function with Validation
  // ============================================================================

  const updateSettings = (partialSettings: Partial<AccessibilitySettings>) => {
    try {
      // Merge with current settings
      const mergedSettings = {
        ...settings,
        ...partialSettings,
      };

      // Validate merged settings
      const validatedSettings = validateSettings(mergedSettings);

      // Update state
      setSettingsState(validatedSettings);

      // Persist to storage (async, non-blocking)
      saveSettings(mode, validatedSettings);

      // Clear any previous errors
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to update settings');
      setError(errorMessage);
      console.error('Error updating accessibility settings:', errorMessage);
    }
  };

  // ============================================================================
  // Clear Error Function
  // ============================================================================

  const clearError = () => {
    setError(null);
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AccessibilityContextValue = {
    mode,
    setMode,
    settings,
    updateSettings,
    isLoading,
    error,
    clearError,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access the AccessibilityContext
 * Throws an error if used outside of AccessibilityProvider
 */
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  
  return context;
}
