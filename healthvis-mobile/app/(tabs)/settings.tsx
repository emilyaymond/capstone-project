/**
 * Settings Screen
 * 
 * Provides user interface for customizing accessibility settings including:
 * - Accessibility mode selection (Visual, Audio, Hybrid, Simplified)
 * - Font size options (small, medium, large)
 * - Contrast options (normal, high - WCAG AAA compliant)
 * - Toggle switches for audio feedback and haptics
 * - Immediate setting changes via AccessibilityContext
 * - Screen reader announcements for all changes
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModeSelector } from '@/components/ModeSelector';
import { AccessibleButton } from '@/components/AccessibleButton';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import {
  FONT_SIZES,
  HIGH_CONTRAST_COLORS,
  NORMAL_CONTRAST_COLORS,
} from '@/constants/accessibility';
import { announceSettingsChange } from '@/lib/announcer';

// ============================================================================
// Settings Screen Component
// ============================================================================

export default function SettingsScreen() {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { mode, setMode, settings, updateSettings } = useAccessibility();

  // ============================================================================
  // Compute Styles Based on Settings
  // ============================================================================

  const fontSize = FONT_SIZES[settings.fontSize];
  const colors = settings.contrast === 'high' 
    ? HIGH_CONTRAST_COLORS 
    : NORMAL_CONTRAST_COLORS;

  // ============================================================================
  // Font Size Handlers
  // ============================================================================

  /**
   * Handles font size change
   * Requirement 13.2: Apply font size changes immediately to all text
   * Requirement 13.5: Announce setting changes to screen readers
   */
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    updateSettings({ fontSize: size });
    announceSettingsChange('font size', size);
  };

  // ============================================================================
  // Contrast Handlers
  // ============================================================================

  /**
   * Handles contrast mode change
   * Requirement 13.3: Update colors to meet WCAG AAA contrast ratios
   * Requirement 13.5: Announce setting changes to screen readers
   */
  const handleContrastChange = (contrast: 'normal' | 'high') => {
    updateSettings({ contrast });
    announceSettingsChange('contrast', contrast);
  };

  // ============================================================================
  // Audio Feedback Handler
  // ============================================================================

  /**
   * Handles audio feedback toggle
   * Requirement 13.4: Stop interaction sounds but preserve TTS functionality
   * Requirement 13.5: Announce setting changes to screen readers
   */
  const handleAudioToggle = (enabled: boolean) => {
    updateSettings({ audioEnabled: enabled });
    announceSettingsChange('audio feedback', enabled);
  };

  // ============================================================================
  // Haptics Handler
  // ============================================================================

  /**
   * Handles haptics toggle
   * Requirement 13.5: Announce setting changes to screen readers
   */
  const handleHapticsToggle = (enabled: boolean) => {
    updateSettings({ hapticsEnabled: enabled });
    announceSettingsChange('haptic feedback', enabled);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      accessible={false}
      accessibilityLabel="Settings screen"
    >
      {/* Header */}
      <ThemedView style={[styles.header, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.title,
            { fontSize: fontSize.title, color: colors.text },
          ]}
        >
          Settings
        </ThemedText>
        <ThemedText
          style={[
            styles.subtitle,
            { fontSize: fontSize.body, color: colors.textSecondary },
          ]}
        >
          Customize your accessibility experience
        </ThemedText>
      </ThemedView>

      {/* Accessibility Mode Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.sectionTitle,
            { fontSize: fontSize.heading, color: colors.text },
          ]}
        >
          Accessibility Mode
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { fontSize: fontSize.label, color: colors.textSecondary },
          ]}
        >
          Choose how you want to interact with the app
        </ThemedText>
        
        {/* Mode Selector Component - Requirement 13.1 */}
        <ModeSelector
          currentMode={mode}
          onModeChange={setMode}
          style={styles.modeSelector}
        />
      </ThemedView>

      {/* Font Size Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.sectionTitle,
            { fontSize: fontSize.heading, color: colors.text },
          ]}
        >
          Font Size
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { fontSize: fontSize.label, color: colors.textSecondary },
          ]}
        >
          Adjust text size for better readability
        </ThemedText>
        
        {/* Font Size Buttons - Requirement 13.2 */}
        <View style={styles.buttonGroup}>
          <AccessibleButton
            onPress={() => handleFontSizeChange('small')}
            label="Small font size"
            hint="Set font size to small"
            variant={settings.fontSize === 'small' ? 'primary' : 'outline'}
            style={styles.groupButton}
          >
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: settings.fontSize === 'small'
                    ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                    : colors.text,
                },
              ]}
            >
              Small
            </ThemedText>
          </AccessibleButton>

          <AccessibleButton
            onPress={() => handleFontSizeChange('medium')}
            label="Medium font size"
            hint="Set font size to medium"
            variant={settings.fontSize === 'medium' ? 'primary' : 'outline'}
            style={styles.groupButton}
          >
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: settings.fontSize === 'medium'
                    ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                    : colors.text,
                },
              ]}
            >
              Medium
            </ThemedText>
          </AccessibleButton>

          <AccessibleButton
            onPress={() => handleFontSizeChange('large')}
            label="Large font size"
            hint="Set font size to large"
            variant={settings.fontSize === 'large' ? 'primary' : 'outline'}
            style={styles.groupButton}
          >
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: settings.fontSize === 'large'
                    ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                    : colors.text,
                },
              ]}
            >
              Large
            </ThemedText>
          </AccessibleButton>
        </View>
      </ThemedView>

      {/* Contrast Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.sectionTitle,
            { fontSize: fontSize.heading, color: colors.text },
          ]}
        >
          Contrast
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { fontSize: fontSize.label, color: colors.textSecondary },
          ]}
        >
          High contrast mode meets WCAG AAA standards
        </ThemedText>
        
        {/* Contrast Buttons - Requirement 13.3 */}
        <View style={styles.buttonGroup}>
          <AccessibleButton
            onPress={() => handleContrastChange('normal')}
            label="Normal contrast"
            hint="Use normal contrast colors"
            variant={settings.contrast === 'normal' ? 'primary' : 'outline'}
            style={styles.groupButton}
          >
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: settings.contrast === 'normal'
                    ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                    : colors.text,
                },
              ]}
            >
              Normal
            </ThemedText>
          </AccessibleButton>

          <AccessibleButton
            onPress={() => handleContrastChange('high')}
            label="High contrast"
            hint="Use high contrast colors for better visibility"
            variant={settings.contrast === 'high' ? 'primary' : 'outline'}
            style={styles.groupButton}
          >
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: settings.contrast === 'high'
                    ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                    : colors.text,
                },
              ]}
            >
              High
            </ThemedText>
          </AccessibleButton>
        </View>
      </ThemedView>

      {/* Audio Feedback Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText
              style={[
                styles.sectionTitle,
                { fontSize: fontSize.heading, color: colors.text },
              ]}
            >
              Audio Feedback
            </ThemedText>
            <ThemedText
              style={[
                styles.sectionDescription,
                { fontSize: fontSize.label, color: colors.textSecondary },
              ]}
            >
              Play sounds for button clicks and interactions
            </ThemedText>
          </View>
          
          {/* Audio Toggle - Requirement 13.4 */}
          <Switch
            value={settings.audioEnabled}
            onValueChange={handleAudioToggle}
            accessible={true}
            accessibilityLabel="Audio feedback toggle"
            accessibilityHint={`Audio feedback is currently ${settings.audioEnabled ? 'enabled' : 'disabled'}. Toggle to ${settings.audioEnabled ? 'disable' : 'enable'}.`}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.audioEnabled }}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            ios_backgroundColor={colors.border}
          />
        </View>
      </ThemedView>

      {/* Haptics Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText
              style={[
                styles.sectionTitle,
                { fontSize: fontSize.heading, color: colors.text },
              ]}
            >
              Haptic Feedback
            </ThemedText>
            <ThemedText
              style={[
                styles.sectionDescription,
                { fontSize: fontSize.label, color: colors.textSecondary },
              ]}
            >
              Feel vibrations for interactions and data states
            </ThemedText>
          </View>
          
          {/* Haptics Toggle */}
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={handleHapticsToggle}
            accessible={true}
            accessibilityLabel="Haptic feedback toggle"
            accessibilityHint={`Haptic feedback is currently ${settings.hapticsEnabled ? 'enabled' : 'disabled'}. Toggle to ${settings.hapticsEnabled ? 'disable' : 'enable'}.`}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.hapticsEnabled }}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            ios_backgroundColor={colors.border}
          />
        </View>
      </ThemedView>

      {/* Info Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.infoText,
            { fontSize: fontSize.label, color: colors.textSecondary },
          ]}
        >
          All settings are saved automatically and will be restored when you reopen the app.
        </ThemedText>
      </ThemedView>

      {/* Developer Testing Section */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.sectionTitle,
            { fontSize: fontSize.heading, color: colors.text },
          ]}
        >
          Developer Tools
        </ThemedText>
        <Link href="/modal" style={styles.testLink}>
          <ThemedText
            style={[
              styles.linkText,
              { fontSize: fontSize.body, color: colors.primary },
            ]}
          >
            Open Accessibility Test Screen →
          </ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    paddingTop: 60,
  },
  
  header: {
    marginBottom: 24,
  },
  
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  
  subtitle: {
    lineHeight: 22,
  },
  
  section: {
    marginBottom: 32,
  },
  
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  
  sectionDescription: {
    lineHeight: 20,
    marginBottom: 16,
  },
  
  modeSelector: {
    marginTop: 8,
  },
  
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  
  groupButton: {
    flex: 1,
  },
  
  buttonText: {
    fontWeight: '600',
  },
  
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  toggleTextContainer: {
    flex: 1,
  },
  
  infoText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },

  testLink: {
    padding: 12,
    alignItems: 'center',
  },

  linkText: {
    textDecorationLine: 'underline',
  },
});
