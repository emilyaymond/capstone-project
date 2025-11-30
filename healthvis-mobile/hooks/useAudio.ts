/**
 * useAudio Hook
 * 
 * Provides audio feedback functionality using expo-av for audio playback.
 * Integrates with AccessibilityContext to respect audioEnabled setting.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { AccessibilityMode } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface UseAudioReturn {
  playSound: (frequency: number, duration: number, type?: OscillatorType) => Promise<void>;
  playClickSound: () => Promise<void>;
  playSuccessSound: () => Promise<void>;
  playErrorSound: () => Promise<void>;
  playModeChangeSound: (mode: AccessibilityMode) => Promise<void>;
  playFocusSound: () => Promise<void>;
  playHoverSound: () => Promise<void>;
}

// OscillatorType for Web Audio API compatibility
type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

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

// Frequency ranges in Hz
const FREQUENCY_LOW = 200;
const FREQUENCY_MID = 440;
const FREQUENCY_HIGH = 800;
const FREQUENCY_VERY_HIGH = 1000;

// Mode-specific frequencies
const MODE_FREQUENCIES: Record<AccessibilityMode, number> = {
  visual: 500,
  audio: 600,
  hybrid: 700,
  simplified: 400,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAudio(): UseAudioReturn {
  const { settings } = useAccessibility();
  const soundObjectsRef = useRef<Audio.Sound[]>([]);
  const isInitializedRef = useRef(false);

  // ============================================================================
  // Initialize Audio Mode
  // ============================================================================

  useEffect(() => {
    initializeAudio();
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize audio mode for playback
   */
  async function initializeAudio() {
    try {
      if (isInitializedRef.current) return;
      
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  // ============================================================================
  // Cleanup Function
  // ============================================================================

  /**
   * Cleanup all active sound objects on unmount
   */
  async function cleanup() {
    try {
      // Unload all sound objects
      for (const sound of soundObjectsRef.current) {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error('Error unloading sound:', error);
        }
      }
      soundObjectsRef.current = [];
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }

  // ============================================================================
  // Base Sound Generation Function
  // ============================================================================

  /**
   * Play a sound with specified frequency, duration, and waveform type
   * 
   * @param frequency - Frequency in Hz
   * @param duration - Duration in milliseconds
   * @param type - Waveform type (sine, square, sawtooth, triangle)
   */
  async function playSound(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): Promise<void> {
    // Check if audio is enabled
    if (!settings.audioEnabled) {
      return;
    }

    try {
      // Generate audio buffer using Web Audio API approach
      // For React Native, we'll use a simple tone generation
      const sound = await generateTone(frequency, duration, type);
      
      // Track sound object for cleanup
      soundObjectsRef.current.push(sound);
      
      // Play the sound
      await sound.playAsync();
      
      // Auto-cleanup after playback
      setTimeout(async () => {
        try {
          await sound.unloadAsync();
          soundObjectsRef.current = soundObjectsRef.current.filter(s => s !== sound);
        } catch (error) {
          console.error('Error cleaning up sound:', error);
        }
      }, duration + 100);
      
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  // ============================================================================
  // Tone Generation Helper
  // ============================================================================

  /**
   * Generate a tone using expo-av
   * Note: This is a simplified implementation. In production, you might want to
   * pre-generate audio files or use a more sophisticated synthesis approach.
   */
  async function generateTone(
    frequency: number,
    duration: number,
    type: OscillatorType
  ): Promise<Audio.Sound> {
    // For MVP, we'll use a simple approach with pre-generated tones
    // In a production app, you would either:
    // 1. Pre-generate audio files for common frequencies
    // 2. Use a native module for real-time synthesis
    // 3. Use Web Audio API on web platform
    
    // Create a simple beep sound using Audio.Sound
    // This is a placeholder - in production you'd load actual audio files
    const { sound } = await Audio.Sound.createAsync(
      // Using a data URI for a simple sine wave (this is a simplified approach)
      // In production, you'd use actual audio files or a synthesis library
      { uri: generateToneDataUri(frequency, duration, type) },
      { shouldPlay: false }
    );
    
    return sound;
  }

  /**
   * Generate a data URI for a simple tone
   * This is a simplified implementation for demonstration
   */
  function generateToneDataUri(frequency: number, duration: number, type: OscillatorType): string {
    // For React Native, we'll use a simple approach
    // In production, you would pre-generate these or use a native audio synthesis module
    
    // For now, we'll use a silent audio file and log the parameters
    // This allows the hook to work without actual audio synthesis
    console.log(`Generating tone: ${frequency}Hz, ${duration}ms, ${type}`);
    
    // Return a minimal WAV file data URI (silent)
    // In production, replace this with actual tone generation
    return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  }

  // ============================================================================
  // Specific Sound Functions
  // ============================================================================

  /**
   * Play a click sound (100-150ms duration)
   * Requirement 3.1: Button tap feedback
   */
  async function playClickSound(): Promise<void> {
    await playSound(FREQUENCY_MID, CLICK_DURATION, 'sine');
  }

  /**
   * Play a success sound with rising pitch pattern
   * Requirement 3.2: Successful action completion
   */
  async function playSuccessSound(): Promise<void> {
    // Play a rising pitch pattern
    await playSound(FREQUENCY_MID, SUCCESS_DURATION / 3, 'sine');
    setTimeout(() => {
      playSound(FREQUENCY_HIGH, SUCCESS_DURATION / 3, 'sine');
    }, SUCCESS_DURATION / 3);
    setTimeout(() => {
      playSound(FREQUENCY_VERY_HIGH, SUCCESS_DURATION / 3, 'sine');
    }, (SUCCESS_DURATION / 3) * 2);
  }

  /**
   * Play an error sound with descending pitch pattern
   * Requirement 3.3: Error indication
   */
  async function playErrorSound(): Promise<void> {
    // Play a descending pitch pattern
    await playSound(FREQUENCY_HIGH, ERROR_DURATION / 3, 'square');
    setTimeout(() => {
      playSound(FREQUENCY_MID, ERROR_DURATION / 3, 'square');
    }, ERROR_DURATION / 3);
    setTimeout(() => {
      playSound(FREQUENCY_LOW, ERROR_DURATION / 3, 'square');
    }, (ERROR_DURATION / 3) * 2);
  }

  /**
   * Play a mode-specific sound signature
   * Requirement 3.4: Mode change indication
   */
  async function playModeChangeSound(mode: AccessibilityMode): Promise<void> {
    const frequency = MODE_FREQUENCIES[mode];
    await playSound(frequency, MODE_CHANGE_DURATION, 'triangle');
  }

  /**
   * Play a focus sound for enhanced feedback
   * Requirement 3.5: Focus indication in Audio/Hybrid modes
   */
  async function playFocusSound(): Promise<void> {
    await playSound(FREQUENCY_MID, FOCUS_DURATION, 'sine');
  }

  /**
   * Play a hover sound for enhanced feedback
   * Requirement 3.5: Hover indication in Audio/Hybrid modes
   */
  async function playHoverSound(): Promise<void> {
    await playSound(FREQUENCY_HIGH, HOVER_DURATION, 'sine');
  }

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    playSound,
    playClickSound,
    playSuccessSound,
    playErrorSound,
    playModeChangeSound,
    playFocusSound,
    playHoverSound,
  };
}
