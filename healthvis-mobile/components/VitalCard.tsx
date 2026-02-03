/**
 * VitalCard Component
 * 
 * Displays a vital sign summary with progressive disclosure.
 * Features:
 * - Expand/collapse functionality with state management
 * - "Hear Summary" button that triggers TTS
 * - Proper accessibility labels that update with expanded/collapsed state
 * - Haptic feedback on tap
 * - "Collapse" button available when expanded
 * 
 * Requirements: 7.2, 7.3, 8.1, 8.2
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { AccessibleButton } from './AccessibleButton';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useHaptics } from '../hooks/useHaptics';
import { useSpeech } from '../hooks/useSpeech';
import { VitalSign, HealthMetric } from '../types';
import { getDisplayNameForType, hasDefinedRange } from '../types/health-metric';
import { FONT_SIZES, TOUCH_TARGET_SIZES } from '../constants/accessibility';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface VitalCardProps {
  /** The vital sign data to display (legacy) */
  vital?: VitalSign;
  
  /** The health metric data to display (new) */
  metric?: HealthMetric;
  
  /** Optional custom style for the card container */
  style?: ViewStyle;
}

// ============================================================================
// VitalCard Component
// ============================================================================

export function VitalCard({ vital, metric, style }: VitalCardProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [expanded, setExpanded] = useState<boolean>(false);

  // ============================================================================
  // Hooks
  // ============================================================================

  const { mode, settings } = useAccessibility();
  const { triggerForDataPoint } = useHaptics();
  const { speakDetails, isSpeaking, stop } = useSpeech();

  // ============================================================================
  // Computed Values - Support both VitalSign and HealthMetric
  // ============================================================================

  // Use metric if provided, otherwise use vital (backwards compatibility)
  const data = metric || vital;
  
  // Extract common properties (with defaults to avoid null issues)
  const value = data?.value ?? 0;
  const unit = data?.unit ?? '';
  const timestamp = data?.timestamp ?? new Date();
  const range = data?.range;
  
  // Get display name
  const displayName = metric 
    ? getDisplayNameForType(metric.type)
    : vital ? formatVitalType(vital.type) : '';
  
  // Get icon
  const icon = metric ? getIconForMetricType(metric.type) : vital ? getIconForMetricType(vital.type) : '📊';
  
  // Check if this metric has a defined range
  const showRange = metric ? hasDefinedRange(metric.type) : true;
  
  // Format range for display
  const rangeText = range ? formatRange(range) : 'N/A';
  
  // Format timestamp for display
  const timeText = formatTimestamp(timestamp);
  
  // Determine font size based on settings
  const fontSize = FONT_SIZES[settings.fontSize];
  
  // Determine touch target size based on mode
  const touchTargetSize = mode === 'simplified' 
    ? TOUCH_TARGET_SIZES.simplified 
    : TOUCH_TARGET_SIZES.minimum;

  // ============================================================================
  // Accessibility Labels (Requirement 8.1, 8.2)
  // ============================================================================

  // Accessibility label that updates with expanded/collapsed state
  const cardAccessibilityLabel = expanded
    ? `${displayName}: ${value} ${unit}${showRange ? `, ${rangeText}` : ''}. Expanded. Double tap to collapse.`
    : `${displayName}: ${value} ${unit}${showRange ? `, ${rangeText}` : ''}. Collapsed. Double tap to expand for details.`;

  const cardAccessibilityHint = expanded
    ? 'Shows detailed information. Double tap to collapse.'
    : 'Double tap to expand and see detailed information.';

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handles card tap to expand/collapse
   * Requirement 7.2: Expand to show detailed information
   * Requirement 7.3: Provide collapse button when expanded
   */
  const handleToggle = useCallback(() => {
    // Trigger haptic feedback based on data range (if available)
    if (range) {
      triggerForDataPoint(range);
    }
    
    // Toggle expanded state
    setExpanded(prev => !prev);
  }, [range, triggerForDataPoint]);

  /**
   * Handles "Hear Summary" button press
   * Triggers TTS to speak vital sign details
   */
  const handleHearSummary = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      // For backwards compatibility, convert HealthMetric to VitalSign if needed
      if (vital) {
        speakDetails(vital);
      } else if (metric) {
        // Create a temporary VitalSign-like object for TTS
        const vitalForTTS: VitalSign = {
          type: metric.type as any, // Type conversion for compatibility
          value: metric.value,
          timestamp: metric.timestamp,
          unit: metric.unit,
          range: metric.range || 'normal',
        };
        speakDetails(vitalForTTS);
      }
    }
  }, [vital, metric, speakDetails, isSpeaking, stop]);

  // ============================================================================
  // Early Return - No Data
  // ============================================================================
  
  if (!data) {
    return null; // No data to display
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <ThemedView style={[styles.card, style]}>
      {/* Main Card Touchable Area */}
      <TouchableOpacity
        onPress={handleToggle}
        style={[
          styles.cardHeader,
          { minHeight: touchTargetSize },
        ]}
        accessible={true}
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityHint={cardAccessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerContent}>
          {/* Icon and Vital Sign Name */}
          <View style={styles.nameContainer}>
            <ThemedText style={[styles.icon, { fontSize: fontSize.heading }]}>
              {icon}
            </ThemedText>
            <ThemedText
              style={[
                styles.vitalName,
                { fontSize: fontSize.heading },
              ]}
              type="defaultSemiBold"
            >
              {displayName}
            </ThemedText>
          </View>

          {/* Value and Unit */}
          <View style={styles.valueContainer}>
            <ThemedText
              style={[
                styles.value,
                { fontSize: fontSize.title },
                range && showRange ? getRangeColor(range, settings.contrast) : {},
              ]}
              type="title"
            >
              {value}
            </ThemedText>
            <ThemedText
              style={[
                styles.unit,
                { fontSize: fontSize.body },
              ]}
            >
              {unit}
            </ThemedText>
          </View>

          {/* Range Status (only if metric has defined range) */}
          {showRange && range && (
            <ThemedText
              style={[
                styles.range,
                { fontSize: fontSize.body },
                getRangeColor(range, settings.contrast),
              ]}
            >
              {rangeText}
            </ThemedText>
          )}

          {/* Expand/Collapse Indicator */}
          <ThemedText
            style={[
              styles.expandIndicator,
              { fontSize: fontSize.body },
            ]}
          >
            {expanded ? '▼' : '▶'}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {/* Expanded Details Section */}
      {expanded && (
        <View style={styles.detailsContainer}>
          {/* Timestamp */}
          <View style={styles.detailRow}>
            <ThemedText
              style={[
                styles.detailLabel,
                { fontSize: fontSize.body },
              ]}
              type="defaultSemiBold"
            >
              Recorded:
            </ThemedText>
            <ThemedText
              style={[
                styles.detailValue,
                { fontSize: fontSize.body },
              ]}
            >
              {timeText}
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Hear Summary Button */}
            <AccessibleButton
              onPress={handleHearSummary}
              label={isSpeaking ? 'Stop Speaking' : 'Hear Summary'}
              hint={isSpeaking ? 'Stop reading vital sign details' : 'Hear detailed information about this vital sign'}
              variant="primary"
              style={styles.button}
            />

            {/* Collapse Button (Requirement 7.3) */}
            <AccessibleButton
              onPress={handleToggle}
              label="Collapse"
              hint="Hide detailed information and return to summary view"
              variant="outline"
              style={styles.button}
            />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats vital sign type for display
 */
function formatVitalType(type: string): string {
  const typeMap: Record<string, string> = {
    heart_rate: 'Heart Rate',
    glucose: 'Blood Glucose',
    steps: 'Steps',
    sleep: 'Sleep Duration',
  };
  return typeMap[type] || type;
}

/**
 * Gets an icon/emoji for a health metric type
 */
function getIconForMetricType(type: string): string {
  const iconMap: Record<string, string> = {
    // Vitals
    heart_rate: '❤️',
    blood_pressure_systolic: '🩺',
    blood_pressure_diastolic: '🩺',
    respiratory_rate: '🫁',
    body_temperature: '🌡️',
    oxygen_saturation: '🫁',
    blood_glucose: '🩸',
    glucose: '🩸',
    
    // Activity
    steps: '👟',
    distance: '🏃',
    flights_climbed: '🪜',
    active_energy: '🔥',
    exercise_minutes: '⏱️',
    
    // Body
    weight: '⚖️',
    height: '📏',
    bmi: '📊',
    body_fat_percentage: '📊',
    
    // Nutrition
    dietary_energy: '🍽️',
    water: '💧',
    protein: '🥩',
    carbohydrates: '🍞',
    fats: '🥑',
    
    // Sleep & Mindfulness
    sleep: '😴',
    mindfulness: '🧘',
  };
  return iconMap[type] || '📊';
}

/**
 * Formats data range for display
 */
function formatRange(range: string): string {
  const rangeMap: Record<string, string> = {
    normal: 'Normal',
    warning: 'Warning',
    danger: 'Danger',
  };
  return rangeMap[range] || range;
}

/**
 * Formats timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
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

/**
 * Gets color style based on data range and contrast mode
 */
function getRangeColor(range: string, contrast: 'normal' | 'high'): { color: string } {
  const isHighContrast = contrast === 'high';

  const colorMap: Record<string, { normal: string; high: string }> = {
    normal: {
      normal: '#4caf50',
      high: '#00ff00',
    },
    warning: {
      normal: '#ff9800',
      high: '#ffff00',
    },
    danger: {
      normal: '#f44336',
      high: '#ff0000',
    },
  };

  const colors = colorMap[range] || { normal: '#757575', high: '#ffffff' };
  return { color: isHighContrast ? colors.high : colors.normal };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardHeader: {
    padding: 16,
    minHeight: TOUCH_TARGET_SIZES.minimum,
  },

  headerContent: {
    flex: 1,
  },

  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },

  icon: {
    lineHeight: 24,
  },

  vitalName: {
    flex: 1,
  },

  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },

  value: {
    marginRight: 8,
  },

  unit: {
    opacity: 0.7,
  },

  range: {
    marginBottom: 4,
  },

  expandIndicator: {
    marginTop: 8,
    opacity: 0.6,
  },

  detailsContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  detailLabel: {
    opacity: 0.7,
  },

  detailValue: {
    flex: 1,
    textAlign: 'right',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  button: {
    flex: 1,
  },
});
