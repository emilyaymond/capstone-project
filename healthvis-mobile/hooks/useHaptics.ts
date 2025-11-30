/**
 * useHaptics Hook
 * 
 * Provides haptic feedback functionality with intensity mapping for data ranges.
 * Integrates with AccessibilityContext to respect hapticsEnabled setting.
 * Includes graceful fallback for unsupported platforms (Web).
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { DataRange } from '../types';

// ============================================================================
// Hook Return Interface
// ============================================================================

export interface UseHapticsReturn {
  triggerLight: () => void;
  triggerMedium: () => void;
  triggerHeavy: () => void;
  triggerForDataPoint: (range: DataRange) => void;
  isSupported: boolean;
}

// ============================================================================
// useHaptics Hook
// ============================================================================

/**
 * Custom hook for haptic feedback
 * 
 * Provides functions to trigger haptic feedback with different intensities.
 * Automatically respects the hapticsEnabled setting from AccessibilityContext.
 * Includes platform detection for graceful fallback on unsupported platforms.
 */
export function useHaptics(): UseHapticsReturn {
  const { settings } = useAccessibility();
  const [isSupported, setIsSupported] = useState<boolean>(false);

  // ============================================================================
  // Check Platform Support
  // ============================================================================

  useEffect(() => {
    // Haptics are supported on iOS and Android, but not on Web
    const supported = Platform.OS === 'ios' || Platform.OS === 'android';
    setIsSupported(supported);

    if (!supported) {
      console.warn('Haptic feedback is not supported on this platform');
    }
  }, []);

  // ============================================================================
  // Trigger Light Haptic
  // ============================================================================

  /**
   * Triggers a light haptic pulse
   * Used for normal data points and subtle interactions
   * 
   * Requirement 4.1: Light haptic for normal range data
   */
  const triggerLight = useCallback(() => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error triggering light haptic:', error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // ============================================================================
  // Trigger Medium Haptic
  // ============================================================================

  /**
   * Triggers a medium haptic pulse
   * Used for warning data points and moderate interactions
   * 
   * Requirement 4.2: Medium haptic for warning range data
   */
  const triggerMedium = useCallback(() => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error triggering medium haptic:', error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // ============================================================================
  // Trigger Heavy Haptic
  // ============================================================================

  /**
   * Triggers a heavy haptic pulse with double pattern
   * Used for danger data points and critical interactions
   * 
   * Requirement 4.3: Heavy haptic with double pattern for danger range data
   */
  const triggerHeavy = useCallback(async () => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      // First heavy impact
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Short delay for double pattern
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second heavy impact
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error('Error triggering heavy haptic:', error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // ============================================================================
  // Trigger Haptic for Data Point
  // ============================================================================

  /**
   * Triggers appropriate haptic feedback based on data range
   * Maps data range to haptic intensity:
   * - normal -> light
   * - warning -> medium
   * - danger -> heavy (double pattern)
   * 
   * Requirements 4.1, 4.2, 4.3: Range-based haptic mapping
   * 
   * @param range - The data range classification (normal, warning, danger)
   */
  const triggerForDataPoint = useCallback((range: DataRange) => {
    // Check if haptics are enabled in settings (Requirement 4.4)
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics (Requirement 4.5)
    if (!isSupported) {
      return;
    }

    // Map range to haptic intensity
    switch (range) {
      case 'normal':
        triggerLight();
        break;
      case 'warning':
        triggerMedium();
        break;
      case 'danger':
        triggerHeavy();
        break;
      default:
        console.warn(`Unknown data range: ${range}`);
    }
  }, [settings.hapticsEnabled, isSupported, triggerLight, triggerMedium, triggerHeavy]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerForDataPoint,
    isSupported,
  };
}
