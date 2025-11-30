/**
 * ModeSelector Component
 * 
 * Allows users to switch between accessibility modes (Visual, Audio, Hybrid, Simplified).
 * Provides a radio group interface with proper accessibility labels and audio feedback.
 * 
 * Requirements: 1.1, 1.2, 1.6
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { ThemedText } from './themed-text';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAudio } from '../hooks/useAudio';
import { AccessibilityMode } from '../types';
import { 
  ACCESSIBILITY_MODES, 
  MODE_DESCRIPTIONS,
  FONT_SIZES,
  TOUCH_TARGET_SIZES,
  HIGH_CONTRAST_COLORS,
  NORMAL_CONTRAST_COLORS,
} from '../constants/accessibility';
import { announceModeChange } from '../lib/announcer';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface ModeSelectorProps {
  /** Current accessibility mode */
  currentMode: AccessibilityMode;
  
  /** Callback when mode changes */
  onModeChange: (mode: AccessibilityMode) => void;
  
  /** Custom container style */
  style?: ViewStyle;
}

// ============================================================================
// Mode Display Names
// ============================================================================

const MODE_LABELS: Record<AccessibilityMode, string> = {
  visual: 'Visual',
  audio: 'Audio',
  hybrid: 'Hybrid',
  simplified: 'Simplified',
};

// ============================================================================
// ModeSelector Component
// ============================================================================

export function ModeSelector({
  currentMode,
  onModeChange,
  style,
}: ModeSelectorProps) {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { settings, mode: contextMode } = useAccessibility();
  const { playModeChangeSound } = useAudio();

  // ============================================================================
  // Handle Mode Selection
  // ============================================================================

  /**
   * Handles mode selection with audio feedback and announcements
   * Requirement 1.2: Apply mode-specific interface adaptations immediately
   * Requirement 1.6: Announce mode changes with assertive priority
   */
  const handleModeSelect = (selectedMode: AccessibilityMode) => {
    if (selectedMode === currentMode) {
      return; // No change needed
    }

    // Play mode-specific sound (Requirement 3.4)
    if (settings.audioEnabled) {
      playModeChangeSound(selectedMode);
    }

    // Announce mode change to screen readers (Requirement 1.6)
    announceModeChange(selectedMode);

    // Trigger the mode change callback
    onModeChange(selectedMode);
  };

  // ============================================================================
  // Compute Styles Based on Settings
  // ============================================================================

  const fontSize = FONT_SIZES[settings.fontSize].body;
  const labelFontSize = FONT_SIZES[settings.fontSize].label;
  const colors = settings.contrast === 'high' 
    ? HIGH_CONTRAST_COLORS 
    : NORMAL_CONTRAST_COLORS;

  // Touch target size based on mode
  const touchTargetSize = contextMode === 'simplified'
    ? TOUCH_TARGET_SIZES.simplified
    : TOUCH_TARGET_SIZES.minimum;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View
      style={[styles.container, style]}
      // Radio group accessibility (Requirement 1.1)
      accessible={false} // Allow children to be individually accessible
      accessibilityRole="radiogroup"
      accessibilityLabel="Accessibility mode selection"
    >
      {ACCESSIBILITY_MODES.map((mode) => {
        const isSelected = mode === currentMode;
        const label = MODE_LABELS[mode];
        const description = MODE_DESCRIPTIONS[mode];

        return (
          <TouchableOpacity
            key={mode}
            onPress={() => handleModeSelect(mode)}
            style={[
              styles.option,
              {
                minHeight: touchTargetSize,
                backgroundColor: isSelected 
                  ? colors.primary 
                  : colors.surface,
                borderColor: colors.border,
              },
            ]}
            // Accessibility props
            accessible={true}
            accessibilityRole="radio"
            accessibilityLabel={`${label} mode`}
            accessibilityHint={description}
            accessibilityState={{
              selected: isSelected,
              checked: isSelected,
            }}
          >
            <View style={styles.optionContent}>
              {/* Radio indicator */}
              <View
                style={[
                  styles.radioIndicator,
                  {
                    borderColor: isSelected ? colors.text : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioIndicatorInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>

              {/* Mode label and description */}
              <View style={styles.textContainer}>
                <ThemedText
                  style={[
                    styles.label,
                    {
                      fontSize,
                      color: isSelected 
                        ? (settings.contrast === 'high' ? '#000000' : '#ffffff')
                        : colors.text,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {label}
                </ThemedText>
                
                <ThemedText
                  style={[
                    styles.description,
                    {
                      fontSize: labelFontSize,
                      color: isSelected
                        ? (settings.contrast === 'high' ? '#000000' : 'rgba(255, 255, 255, 0.8)')
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {description}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  
  option: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    
    // Platform-specific adjustments
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  radioIndicatorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  textContainer: {
    flex: 1,
    gap: 4,
  },
  
  label: {
    fontWeight: '600',
  },
  
  description: {
    lineHeight: 18,
  },
});
