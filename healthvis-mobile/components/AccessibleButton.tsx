/**
 * AccessibleButton Component
 * 
 * A reusable button component with built-in accessibility features including:
 * - Proper accessibility labels and hints
 * - Mode-specific behavior (audio feedback, haptics)
 * - Large touch targets for simplified mode (44x44 minimum)
 * - Disabled state handling
 * - Fast feedback within 50ms for responsiveness
 * 
 * Requirements: 1.5, 3.1, 4.1, 8.1, 16.1
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  Platform,
} from 'react-native';
import { ThemedText } from './themed-text';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { TOUCH_TARGET_SIZES, FONT_SIZES } from '../constants/accessibility';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface AccessibleButtonProps {
  /** Button press handler */
  onPress: () => void;
  
  /** Accessibility label describing the button's purpose */
  label: string;
  
  /** Optional accessibility hint providing additional context */
  hint?: string;
  
  /** Whether the button is disabled */
  disabled?: boolean;
  
  /** Visual text to display (defaults to label if not provided) */
  children?: React.ReactNode;
  
  /** Custom style for the button container */
  style?: ViewStyle;
  
  /** Custom style for the button text */
  textStyle?: TextStyle;
  
  /** Accessibility role (defaults to 'button') */
  accessibilityRole?: AccessibilityRole;
  
  /** Button variant for different visual styles */
  variant?: 'primary' | 'secondary' | 'outline';
}

// ============================================================================
// AccessibleButton Component
// ============================================================================

export function AccessibleButton({
  onPress,
  label,
  hint,
  disabled = false,
  children,
  style,
  textStyle,
  accessibilityRole = 'button',
  variant = 'primary',
}: AccessibleButtonProps) {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { mode, settings } = useAccessibility();
  const { playClickSound } = useAudio();
  const { triggerLight } = useHaptics();

  // ============================================================================
  // Handle Press with Feedback
  // ============================================================================

  /**
   * Handles button press with audio and haptic feedback
   * Ensures feedback is provided within 50ms (Requirement 16.1)
   */
  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }

    // Trigger feedback immediately for responsiveness (< 50ms)
    // Audio feedback (Requirement 3.1)
    if (settings.audioEnabled && (mode === 'audio' || mode === 'hybrid')) {
      playClickSound();
    }

    // Haptic feedback (Requirement 4.1)
    if (settings.hapticsEnabled) {
      triggerLight();
    }

    // Execute the actual button action
    onPress();
  }, [disabled, settings.audioEnabled, settings.hapticsEnabled, mode, playClickSound, triggerLight, onPress]);

  // ============================================================================
  // Compute Styles Based on Mode and Settings
  // ============================================================================

  // Determine touch target size based on mode (Requirement 1.5)
  const touchTargetSize = mode === 'simplified' 
    ? TOUCH_TARGET_SIZES.simplified 
    : TOUCH_TARGET_SIZES.minimum;

  // Determine font size based on settings
  const fontSize = FONT_SIZES[settings.fontSize].body;

  // Compute button style
  const buttonStyle: ViewStyle = {
    minHeight: touchTargetSize,
    minWidth: touchTargetSize,
    opacity: disabled ? 0.5 : 1,
  };

  // Compute variant-specific styles
  const variantStyle = getVariantStyle(variant, settings.contrast);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.button,
        buttonStyle,
        variantStyle,
        style,
      ]}
      // Accessibility props (Requirement 8.1)
      accessible={true}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
      // Ensure proper focus behavior
      accessibilityElementsHidden={disabled}
      importantForAccessibility={disabled ? 'no-hide-descendants' : 'yes'}
    >
      {children ? (
        children
      ) : (
        <ThemedText
          style={[
            styles.text,
            { fontSize },
            textStyle,
          ]}
        >
          {label}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get variant-specific styles based on button variant and contrast mode
 */
function getVariantStyle(
  variant: 'primary' | 'secondary' | 'outline',
  contrast: 'normal' | 'high'
): ViewStyle {
  const isHighContrast = contrast === 'high';

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: isHighContrast ? '#00ff00' : '#2196f3',
        borderWidth: 0,
      };
    
    case 'secondary':
      return {
        backgroundColor: isHighContrast ? '#00ccff' : '#03a9f4',
        borderWidth: 0,
      };
    
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: isHighContrast ? '#ffffff' : '#2196f3',
      };
    
    default:
      return {};
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  button: {
    // Layout
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    
    // Alignment
    justifyContent: 'center',
    alignItems: 'center',
    
    // Ensure proper touch target
    minHeight: TOUCH_TARGET_SIZES.minimum,
    minWidth: TOUCH_TARGET_SIZES.minimum,
    
    // Platform-specific adjustments
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
