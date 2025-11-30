/**
 * useSpeech Hook
 * 
 * Provides text-to-speech functionality using expo-speech.
 * Integrates with AccessibilityContext and Expo Router navigation.
 * Includes error handling and automatic cleanup on navigation.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import * as Speech from 'expo-speech';
import { usePathname } from 'expo-router';
import { VitalSign } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
}

export interface UseSpeechReturn {
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  speakSummary: (vitals: VitalSign[]) => Promise<void>;
  speakDetails: (vital: VitalSign) => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LANGUAGE = 'en-US';
const DEFAULT_PITCH = 1.0;
const DEFAULT_RATE = 1.0;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for text-to-speech functionality
 * 
 * Provides functions to speak text, vital sign summaries, and details.
 * Automatically stops speech on navigation and handles errors gracefully.
 */
export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string>(pathname);

  // ============================================================================
  // Stop TTS on Navigation (Requirement 5.5)
  // ============================================================================

  useEffect(() => {
    // Check if pathname has changed
    if (pathname !== previousPathnameRef.current) {
      // Stop any active TTS playback
      stop();
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Stop speech when component unmounts
      Speech.stop();
    };
  }, []);

  // ============================================================================
  // Speak Function (Requirements 5.1, 5.4)
  // ============================================================================

  /**
   * Speaks the provided text using text-to-speech
   * 
   * @param text - The text to speak
   * @param options - Optional speech configuration (language, pitch, rate)
   */
  const speak = useCallback(async (text: string, options?: SpeechOptions): Promise<void> => {
    try {
      // Stop any currently playing speech
      await Speech.stop();

      // Set speaking state
      setIsSpeaking(true);

      // Prepare speech options
      const speechOptions: Speech.SpeechOptions = {
        language: options?.language || DEFAULT_LANGUAGE,
        pitch: options?.pitch || DEFAULT_PITCH,
        rate: options?.rate || DEFAULT_RATE,
        onDone: () => {
          setIsSpeaking(false);
        },
        onStopped: () => {
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('TTS error:', error);
          setIsSpeaking(false);
        },
      };

      // Speak the text
      await Speech.speak(text, speechOptions);
    } catch (error) {
      // Requirement 5.4: Error handling for TTS failures
      console.error('Failed to speak text:', error);
      setIsSpeaking(false);
      
      // Optionally, you could announce the error to screen readers here
      // using AccessibilityInfo.announceForAccessibility
    }
  }, []);

  // ============================================================================
  // Stop Function (Requirement 5.3)
  // ============================================================================

  /**
   * Stops any active text-to-speech playback
   * Provides the "Stop Speaking" button functionality
   */
  const stop = useCallback(() => {
    try {
      Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Failed to stop speech:', error);
      // Force state update even if stop fails
      setIsSpeaking(false);
    }
  }, []);

  // ============================================================================
  // Speak Summary Function (Requirement 5.1)
  // ============================================================================

  /**
   * Speaks a high-level summary of vital signs
   * 
   * @param vitals - Array of vital signs to summarize
   */
  const speakSummary = useCallback(async (vitals: VitalSign[]): Promise<void> => {
    try {
      if (!vitals || vitals.length === 0) {
        await speak('No health data available.');
        return;
      }

      // Build summary text
      const summaryParts: string[] = ['Health data summary:'];

      for (const vital of vitals) {
        const vitalName = formatVitalType(vital.type);
        const rangeDescription = formatRange(vital.range);
        
        summaryParts.push(
          `${vitalName}: ${vital.value} ${vital.unit}, ${rangeDescription}.`
        );
      }

      const summaryText = summaryParts.join(' ');
      await speak(summaryText);
    } catch (error) {
      console.error('Failed to speak summary:', error);
      await speak('Unable to read health data summary.');
    }
  }, [speak]);

  // ============================================================================
  // Speak Details Function (Requirement 5.2)
  // ============================================================================

  /**
   * Speaks detailed information about a single vital sign
   * 
   * @param vital - The vital sign to describe in detail
   */
  const speakDetails = useCallback(async (vital: VitalSign): Promise<void> => {
    try {
      const vitalName = formatVitalType(vital.type);
      const rangeDescription = formatRange(vital.range);
      const timestamp = formatTimestamp(vital.timestamp);

      const detailText = [
        `${vitalName} details:`,
        `Current value: ${vital.value} ${vital.unit}.`,
        `Status: ${rangeDescription}.`,
        `Recorded at: ${timestamp}.`,
      ].join(' ');

      await speak(detailText);
    } catch (error) {
      console.error('Failed to speak details:', error);
      await speak('Unable to read vital sign details.');
    }
  }, [speak]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Formats vital sign type for speech
   */
  function formatVitalType(type: string): string {
    const typeMap: Record<string, string> = {
      heart_rate: 'Heart rate',
      glucose: 'Blood glucose',
      steps: 'Steps',
      sleep: 'Sleep duration',
    };
    return typeMap[type] || type;
  }

  /**
   * Formats data range for speech
   */
  function formatRange(range: string): string {
    const rangeMap: Record<string, string> = {
      normal: 'within normal range',
      warning: 'showing warning signs',
      danger: 'in danger zone',
    };
    return rangeMap[range] || range;
  }

  /**
   * Formats timestamp for speech
   */
  function formatTimestamp(timestamp: Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    speak,
    stop,
    isSpeaking,
    speakSummary,
    speakDetails,
  };
}
