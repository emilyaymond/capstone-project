/**
 * useStorage Hook
 * 
 * Provides persistent storage functionality using AsyncStorage.
 * Handles saving, loading, and clearing accessibility settings with error handling
 * and debouncing for save operations.
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

import { useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilitySettings, AccessibilityMode } from '../types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  MODE: 'accessibility_mode',
  SETTINGS: 'accessibility_settings',
} as const;

// ============================================================================
// Hook Return Interface
// ============================================================================

export interface UseStorageReturn {
  saveSettings: (mode: AccessibilityMode, settings: AccessibilitySettings) => Promise<void>;
  loadSettings: () => Promise<{ mode: AccessibilityMode | null; settings: AccessibilitySettings | null }>;
  clearSettings: () => Promise<void>;
  isAvailable: boolean;
}

// ============================================================================
// Debounce Timer Type
// ============================================================================

type DebounceTimer = ReturnType<typeof setTimeout> | null;

// ============================================================================
// useStorage Hook
// ============================================================================

/**
 * Custom hook for persistent storage of accessibility settings
 * 
 * Features:
 * - Save/load/clear operations for accessibility mode and settings
 * - 100ms debounce for save operations to prevent excessive writes
 * - Error handling for storage failures (quota exceeded, corrupted data)
 * - Availability check for AsyncStorage
 * 
 * @returns {UseStorageReturn} Storage operations and availability status
 */
export function useStorage(): UseStorageReturn {
  // Debounce timer reference
  const saveTimerRef = useRef<DebounceTimer>(null);
  
  // Pending save data reference
  const pendingSaveRef = useRef<{
    mode: AccessibilityMode;
    settings: AccessibilitySettings;
  } | null>(null);

  // ============================================================================
  // Check AsyncStorage Availability
  // ============================================================================

  const isAvailable = useCallback((): boolean => {
    try {
      // AsyncStorage should always be available in React Native
      // This check is primarily for edge cases or testing environments
      return typeof AsyncStorage !== 'undefined' && AsyncStorage !== null;
    } catch (error) {
      console.error('AsyncStorage availability check failed:', error);
      return false;
    }
  }, []);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clear any pending debounce timer on unmount
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // Save Settings Function (with 100ms debounce)
  // ============================================================================

  const saveSettings = useCallback(
    async (mode: AccessibilityMode, settings: AccessibilitySettings): Promise<void> => {
      if (!isAvailable()) {
        throw new Error('AsyncStorage is not available');
      }

      // Store the pending save data
      pendingSaveRef.current = { mode, settings };

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set up new debounced save
      return new Promise((resolve, reject) => {
        saveTimerRef.current = setTimeout(async () => {
          try {
            const dataToSave = pendingSaveRef.current;
            if (!dataToSave) {
              resolve();
              return;
            }

            // Perform the actual save operation
            await AsyncStorage.multiSet([
              [STORAGE_KEYS.MODE, dataToSave.mode],
              [STORAGE_KEYS.SETTINGS, JSON.stringify(dataToSave.settings)],
            ]);

            // Clear pending save
            pendingSaveRef.current = null;
            saveTimerRef.current = null;

            resolve();
          } catch (error) {
            // Handle specific storage errors
            if (error instanceof Error) {
              // Check for quota exceeded error
              if (error.message.includes('quota') || error.message.includes('QuotaExceededError')) {
                reject(new Error('Storage quota exceeded. Please clear some data.'));
              } else {
                reject(new Error(`Failed to save settings: ${error.message}`));
              }
            } else {
              reject(new Error('Failed to save settings: Unknown error'));
            }

            // Clear pending save and timer
            pendingSaveRef.current = null;
            saveTimerRef.current = null;
          }
        }, 100); // 100ms debounce as per requirements
      });
    },
    [isAvailable]
  );

  // ============================================================================
  // Load Settings Function
  // ============================================================================

  const loadSettings = useCallback(async (): Promise<{
    mode: AccessibilityMode | null;
    settings: AccessibilitySettings | null;
  }> => {
    if (!isAvailable()) {
      throw new Error('AsyncStorage is not available');
    }

    try {
      // Load both mode and settings in parallel
      const [[, modeValue], [, settingsValue]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.MODE,
        STORAGE_KEYS.SETTINGS,
      ]);

      // Parse mode
      let mode: AccessibilityMode | null = null;
      if (modeValue) {
        // Validate mode value
        const validModes: AccessibilityMode[] = ['visual', 'audio', 'hybrid', 'simplified'];
        if (validModes.includes(modeValue as AccessibilityMode)) {
          mode = modeValue as AccessibilityMode;
        } else {
          console.warn(`Invalid mode value in storage: ${modeValue}`);
        }
      }

      // Parse settings
      let settings: AccessibilitySettings | null = null;
      if (settingsValue) {
        try {
          const parsed = JSON.parse(settingsValue);
          
          // Validate settings structure
          if (
            parsed &&
            typeof parsed === 'object' &&
            'fontSize' in parsed &&
            'contrast' in parsed &&
            'audioEnabled' in parsed &&
            'hapticsEnabled' in parsed
          ) {
            settings = parsed as AccessibilitySettings;
          } else {
            console.warn('Invalid settings structure in storage');
          }
        } catch (parseError) {
          // Handle corrupted data
          console.error('Failed to parse settings from storage (corrupted data):', parseError);
          // Return null to indicate corrupted data
          settings = null;
        }
      }

      return { mode, settings };
    } catch (error) {
      // Handle storage read errors
      if (error instanceof Error) {
        throw new Error(`Failed to load settings: ${error.message}`);
      } else {
        throw new Error('Failed to load settings: Unknown error');
      }
    }
  }, [isAvailable]);

  // ============================================================================
  // Clear Settings Function
  // ============================================================================

  const clearSettings = useCallback(async (): Promise<void> => {
    if (!isAvailable()) {
      throw new Error('AsyncStorage is not available');
    }

    try {
      // Clear any pending saves
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      pendingSaveRef.current = null;

      // Remove both mode and settings from storage
      await AsyncStorage.multiRemove([STORAGE_KEYS.MODE, STORAGE_KEYS.SETTINGS]);
    } catch (error) {
      // Handle storage clear errors
      if (error instanceof Error) {
        throw new Error(`Failed to clear settings: ${error.message}`);
      } else {
        throw new Error('Failed to clear settings: Unknown error');
      }
    }
  }, [isAvailable]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    saveSettings,
    loadSettings,
    clearSettings,
    isAvailable: isAvailable(),
  };
}
