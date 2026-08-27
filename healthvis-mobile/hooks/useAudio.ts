/**
 * useAudio Hook
 *
 * Provides audio feedback by synthesising tones with react-native-audio-api.
 * Integrates with AccessibilityContext to respect audioEnabled setting.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useEffect, useMemo, useRef } from "react";
import { AudioContext } from "react-native-audio-api";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { AccessibilityMode } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface UseAudioReturn {
  playSound: (
    frequency: number,
    duration: number,
    type?: OscillatorType,
  ) => Promise<void>;
  playClickSound: () => Promise<void>;
  playSuccessSound: () => Promise<void>;
  playErrorSound: () => Promise<void>;
  playModeChangeSound: (mode: AccessibilityMode) => Promise<void>;
  playFocusSound: () => Promise<void>;
  playHoverSound: () => Promise<void>;
}

type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

// ============================================================================
// Constants
// ============================================================================

// Sound durations in milliseconds
const CLICK_DURATION = 100;
const SUCCESS_DURATION = 300;
const ERROR_DURATION = 400;
const MODE_CHANGE_DURATION = 250;
const FOCUS_DURATION = 80;
const HOVER_DURATION = 60;

// Frequency landmarks in Hz
const FREQUENCY_LOW = 300;
const FREQUENCY_MID = 500;
const FREQUENCY_HIGH = 800;
const FREQUENCY_VERY_HIGH = 1100;

// Mode-specific signatures
const MODE_FREQUENCIES: Record<AccessibilityMode, number> = {
  visual: 500,
  audio: 800,
  hybrid: 650,
  simplified: 300,
};

/** Peak gain for UI feedback tones. Quieter than sonification notes. */
const UI_GAIN = 0.14;

/** Edge fade that keeps short tones from clicking. */
const FADE_SECONDS = 0.008;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAudio(): UseAudioReturn {
  const { settings } = useAccessibility();
  const contextRef = useRef<AudioContext | null>(null);

  // Read settings through a ref so the returned API can stay referentially
  // stable. Consumers put this object in useCallback/useEffect dependency
  // arrays; a new object every render made those effects re-run every render.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    return () => {
      contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    };
  }, []);

  /** Returns the shared AudioContext, creating it on first use. */
  function getContext(): AudioContext {
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    return contextRef.current;
  }

  /**
   * Plays a tone at an exact frequency.
   *
   * Previously this mapped the requested frequency onto one of three recorded
   * WAV files, so every distinct pitch collapsed into low, medium or high.
   */
  async function playSound(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ): Promise<void> {
    if (!settingsRef.current.audioEnabled) return;

    try {
      const context = getContext();
      const now = context.currentTime;
      const seconds = duration / 1000;
      const fade = Math.min(FADE_SECONDS, seconds / 3);

      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(UI_GAIN, now + fade);
      gain.gain.setValueAtTime(UI_GAIN, now + seconds - fade);
      gain.gain.linearRampToValueAtTime(0, now + seconds);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(now);
      oscillator.stop(now + seconds);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  // Specific Sound Functions

  /**
   * Play a click sound (100-150ms duration)
   * Requirement 3.1: Button tap feedback
   */
  async function playClickSound(): Promise<void> {
    await playSound(FREQUENCY_MID, CLICK_DURATION, "sine");
  }

  /**
   * Play a success sound with rising pitch pattern
   * Requirement 3.2: Successful action completion
   */
  async function playSuccessSound(): Promise<void> {
    // Play a rising pitch pattern
    await playSound(FREQUENCY_MID, SUCCESS_DURATION / 3, "sine");
    setTimeout(() => {
      playSound(FREQUENCY_HIGH, SUCCESS_DURATION / 3, "sine");
    }, SUCCESS_DURATION / 3);
    setTimeout(
      () => {
        playSound(FREQUENCY_VERY_HIGH, SUCCESS_DURATION / 3, "sine");
      },
      (SUCCESS_DURATION / 3) * 2,
    );
  }

  /**
   * Play an error sound with descending pitch pattern
   * Requirement 3.3: Error indication
   */
  async function playErrorSound(): Promise<void> {
    // Play a descending pitch pattern
    await playSound(FREQUENCY_HIGH, ERROR_DURATION / 3, "square");
    setTimeout(() => {
      playSound(FREQUENCY_MID, ERROR_DURATION / 3, "square");
    }, ERROR_DURATION / 3);
    setTimeout(
      () => {
        playSound(FREQUENCY_LOW, ERROR_DURATION / 3, "square");
      },
      (ERROR_DURATION / 3) * 2,
    );
  }

  /**
   * Play a mode-specific sound signature
   * Requirement 3.4: Mode change indication
   */
  async function playModeChangeSound(mode: AccessibilityMode): Promise<void> {
    const frequency = MODE_FREQUENCIES[mode];
    await playSound(frequency, MODE_CHANGE_DURATION, "triangle");
  }

  /**
   * Play a focus sound for enhanced feedback
   * Requirement 3.5: Focus indication in Audio/Hybrid modes
   */
  async function playFocusSound(): Promise<void> {
    await playSound(FREQUENCY_MID, FOCUS_DURATION, "sine");
  }

  /**
   * Play a hover sound for enhanced feedback
   * Requirement 3.5: Hover indication in Audio/Hybrid modes
   */
  async function playHoverSound(): Promise<void> {
    await playSound(FREQUENCY_HIGH, HOVER_DURATION, "sine");
  }

  // Return Hook Interface

  // Memoized with an empty dependency list: every function above reads mutable
  // state through refs, so the first render's closures stay correct forever.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo<UseAudioReturn>(
    () => ({
      playSound,
      playClickSound,
      playSuccessSound,
      playErrorSound,
      playModeChangeSound,
      playFocusSound,
      playHoverSound,
    }),
    [],
  );
}
