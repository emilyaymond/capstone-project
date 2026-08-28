import { useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { DataRange } from "../types";

// Hook Return Interface
export interface UseHapticsReturn {
  triggerLight: () => void;
  triggerMedium: () => void;
  triggerHeavy: () => void;
  triggerSoft: () => void;
  triggerError: () => void;
  triggerSelected: () => void;
  triggerForDataPoint: (range: DataRange) => void;
  isSupported: boolean;
}

// Haptics are supported on iOS and Android, but not on Web. Platform.OS is
// fixed for the lifetime of the process, so this is a constant rather than
// state — deriving it in an effect left the first render reporting "false"
// and silently dropped any haptic fired during mount.
const HAPTICS_SUPPORTED = Platform.OS === "ios" || Platform.OS === "android";

// useHaptics Hook

/**
 * Custom hook for haptic feedback
 *
 * Provides functions to trigger haptic feedback with different intensities.
 * Automatically respects the hapticsEnabled setting from AccessibilityContext.
 * Includes platform detection for graceful fallback on unsupported platforms.
 */
export function useHaptics(): UseHapticsReturn {
  const { settings } = useAccessibility();
  const isSupported = HAPTICS_SUPPORTED;

  // Trigger Light Haptic
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
      console.error("Error triggering light haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger Medium Haptic
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
      console.error("Error triggering medium haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger Heavy Haptic
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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second heavy impact
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error("Error triggering heavy haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger soft
  const triggerSoft = useCallback(() => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch (error) {
      console.error("Error triggering light haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger Error Haptic
  const triggerError = useCallback(() => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.error("Error triggering light haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger Selected Haptic
  const triggerSelected = useCallback(() => {
    // Check if haptics are enabled in settings
    if (!settings.hapticsEnabled) {
      return;
    }

    // Check if platform supports haptics
    if (!isSupported) {
      return;
    }

    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Error triggering light haptic:", error);
    }
  }, [settings.hapticsEnabled, isSupported]);

  // Trigger Haptic for Data Point

  /**
   * Triggers appropriate haptic feedback based on data range
   * Maps data range to haptic intensity:
   * - normal -> light
   * - warning -> medium
   * - danger -> heavy (double pattern)
   * @param range - The data range classification (normal, warning, danger)
   */
  const triggerForDataPoint = useCallback(
    (range: DataRange) => {
      // Check if haptics are enabled in settings
      if (!settings.hapticsEnabled) {
        return;
      }

      // Check if platform supports haptics
      if (!isSupported) {
        return;
      }

      // Map range to haptic intensity
      switch (range) {
        case "normal":
          triggerLight();
          break;
        case "warning":
          triggerMedium();
          break;
        case "danger":
          triggerHeavy();
          break;
        default:
          console.warn(`Unknown data range: ${range}`);
      }
    },
    [
      settings.hapticsEnabled,
      isSupported,
      triggerLight,
      triggerMedium,
      triggerHeavy,
      triggerSoft,
      triggerError,
      triggerSelected,
    ],
  );

  // Return Hook Interface

  // Memoized so consumers can safely depend on this object; an unstable
  // identity here re-ran every effect that listed it as a dependency.
  return useMemo<UseHapticsReturn>(
    () => ({
      triggerLight,
      triggerMedium,
      triggerHeavy,
      triggerSoft,
      triggerError,
      triggerSelected,
      triggerForDataPoint,
      isSupported,
    }),
    [
      triggerLight,
      triggerMedium,
      triggerHeavy,
      triggerSoft,
      triggerError,
      triggerSelected,
      triggerForDataPoint,
      isSupported,
    ],
  );
}
