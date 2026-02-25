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
import { HealthMetric, HealthCategory, getDisplayNameForType } from '../types/health-metric';

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
  speakHealthMetricSummary: (metrics: HealthMetric[], category?: HealthCategory) => Promise<void>;
  speakHealthMetricDetails: (metric: HealthMetric) => Promise<void>;
  speakCategorySummary: (category: HealthCategory, metrics: HealthMetric[]) => Promise<void>;
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
  // Speak Health Metric Summary Function
  // ============================================================================

  /**
   * Speaks a summary of health metrics (new unified format)
   * Supports all health metric categories
   * 
   * @param metrics - Array of health metrics to summarize
   * @param category - Optional category filter
   */
  const speakHealthMetricSummary = useCallback(async (
    metrics: HealthMetric[], 
    category?: HealthCategory
  ): Promise<void> => {
    try {
      if (!metrics || metrics.length === 0) {
        await speak('No health data available.');
        return;
      }

      // Build summary text
      const summaryParts: string[] = [];
      
      if (category) {
        summaryParts.push(`${formatCategory(category)} summary:`);
      } else {
        summaryParts.push('Health data summary:');
      }

      // Group metrics by type and get the most recent value for each
      const metricsByType = new Map<string, HealthMetric>();
      for (const metric of metrics) {
        const existing = metricsByType.get(metric.type);
        if (!existing || metric.timestamp > existing.timestamp) {
          metricsByType.set(metric.type, metric);
        }
      }

      // Speak each metric type
      for (const metric of metricsByType.values()) {
        const metricName = getDisplayNameForType(metric.type);
        const rangeDescription = metric.range ? formatRange(metric.range) : '';
        
        if (rangeDescription) {
          summaryParts.push(
            `${metricName}: ${metric.value} ${metric.unit}, ${rangeDescription}.`
          );
        } else {
          summaryParts.push(
            `${metricName}: ${metric.value} ${metric.unit}.`
          );
        }
      }

      const summaryText = summaryParts.join(' ');
      await speak(summaryText);
    } catch (error) {
      console.error('Failed to speak health metric summary:', error);
      await speak('Unable to read health data summary.');
    }
  }, [speak]);

  // ============================================================================
  // Speak Health Metric Details Function
  // ============================================================================

  /**
   * Speaks detailed information about a single health metric
   * 
   * @param metric - The health metric to describe in detail
   */
  const speakHealthMetricDetails = useCallback(async (metric: HealthMetric): Promise<void> => {
    try {
      const metricName = getDisplayNameForType(metric.type);
      const rangeDescription = metric.range ? formatRange(metric.range) : '';
      const timestamp = formatTimestamp(metric.timestamp);
      const categoryName = formatCategory(metric.category);

      const detailParts = [
        `${metricName} details:`,
        `Category: ${categoryName}.`,
        `Current value: ${metric.value} ${metric.unit}.`,
      ];

      if (rangeDescription) {
        detailParts.push(`Status: ${rangeDescription}.`);
      }

      detailParts.push(`Recorded at: ${timestamp}.`);

      // Add metadata if available
      if (metric.metadata && Object.keys(metric.metadata).length > 0) {
        detailParts.push('Additional information:');
        for (const [key, value] of Object.entries(metric.metadata)) {
          detailParts.push(`${key}: ${value}.`);
        }
      }

      const detailText = detailParts.join(' ');
      await speak(detailText);
    } catch (error) {
      console.error('Failed to speak health metric details:', error);
      await speak('Unable to read metric details.');
    }
  }, [speak]);

  // ============================================================================
  // Speak Category Summary Function
  // ============================================================================

  /**
   * Speaks a category-specific summary with contextual information
   * 
   * @param category - The health category
   * @param metrics - Metrics in that category
   */
  const speakCategorySummary = useCallback(async (
    category: HealthCategory,
    metrics: HealthMetric[]
  ): Promise<void> => {
    try {
      if (!metrics || metrics.length === 0) {
        await speak(`No ${formatCategory(category).toLowerCase()} data available.`);
        return;
      }

      const categoryName = formatCategory(category);
      const summaryParts: string[] = [`${categoryName} summary:`];

      // Add category-specific context
      switch (category) {
        case 'vitals':
          summaryParts.push('Your vital signs show:');
          break;
        case 'activity':
          summaryParts.push('Your activity metrics show:');
          break;
        case 'body':
          summaryParts.push('Your body measurements show:');
          break;
        case 'nutrition':
          summaryParts.push('Your nutrition data shows:');
          break;
        case 'sleep':
          summaryParts.push('Your sleep data shows:');
          break;
        case 'mindfulness':
          summaryParts.push('Your mindfulness data shows:');
          break;
      }

      // Group by type and get most recent
      const metricsByType = new Map<string, HealthMetric>();
      for (const metric of metrics) {
        const existing = metricsByType.get(metric.type);
        if (!existing || metric.timestamp > existing.timestamp) {
          metricsByType.set(metric.type, metric);
        }
      }

      // Speak each metric
      for (const metric of metricsByType.values()) {
        const metricName = getDisplayNameForType(metric.type);
        const rangeDescription = metric.range ? formatRange(metric.range) : '';
        
        if (rangeDescription) {
          summaryParts.push(
            `${metricName}: ${metric.value} ${metric.unit}, ${rangeDescription}.`
          );
        } else {
          summaryParts.push(
            `${metricName}: ${metric.value} ${metric.unit}.`
          );
        }
      }

      // Add total count
      summaryParts.push(`Total of ${metrics.length} data points recorded.`);

      const summaryText = summaryParts.join(' ');
      await speak(summaryText);
    } catch (error) {
      console.error('Failed to speak category summary:', error);
      await speak('Unable to read category summary.');
    }
  }, [speak]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Formats health category for speech
   */
  function formatCategory(category: HealthCategory): string {
    const categoryMap: Record<HealthCategory, string> = {
      vitals: 'Vitals',
      activity: 'Activity',
      body: 'Body Measurements',
      nutrition: 'Nutrition',
      sleep: 'Sleep',
      mindfulness: 'Mindfulness',
    };
    return categoryMap[category];
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
    speakHealthMetricSummary,
    speakHealthMetricDetails,
    speakCategorySummary,
  };
}
