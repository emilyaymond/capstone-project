/**
 * Settings Screen
 * 
 * Provides user interface for customizing accessibility settings and HealthKit integration:
 * - HealthKit permission status and management
 * - Last sync time and manual sync
 * - Accessibility mode selection (Visual, Audio, Hybrid, Simplified)
 * - Font size options (small, medium, large)
 * - Contrast options (normal, high - WCAG AAA compliant)
 * - Toggle switches for audio feedback and haptics
 * - Immediate setting changes via AccessibilityContext
 * - Screen reader announcements for all changes
 * 
 * Requirements: 5.1, 13.1, 13.2, 13.3, 13.4, 13.5
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModeSelector } from '@/components/ModeSelector';
import { AccessibleButton } from '@/components/AccessibleButton';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useHealthData } from '@/contexts/HealthDataContext';
import {
  FONT_SIZES,
  HIGH_CONTRAST_COLORS,
  NORMAL_CONTRAST_COLORS,
} from '@/constants/accessibility';
import { announceSettingsChange, announceSuccess, announceError } from '@/lib/announcer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Permission item component to display individual permission status
 */
interface PermissionItemProps {
  label: string;
  granted: boolean;
  fontSize: any;
  colors: any;
}

function PermissionItem({ label, granted, fontSize, colors }: PermissionItemProps) {
  return (
    <View style={styles.permissionItem}>
      <ThemedText
        style={[
          styles.permissionLabel,
          { fontSize: fontSize.label, color: colors.text },
        ]}
      >
        {label}
      </ThemedText>
      <View style={[
        styles.permissionBadge,
        { backgroundColor: granted ? '#4CAF50' : '#FF5252' }
      ]}>
        <ThemedText
          style={[
            styles.permissionStatus,
            { fontSize: fontSize.label, color: '#FFFFFF' },
          ]}
        >
          {granted ? 'Granted' : 'Denied'}
        </ThemedText>
      </View>
    </View>
  );
}

// ============================================================================
// Settings Screen Component
// ============================================================================

export default function SettingsScreen() {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { mode, setMode, settings, updateSettings } = useAccessibility();
  const { 
    permissions, 
    isInitialized, 
    isLoading, 
    fetchData, 
    refreshData 
  } = useHealthData();

  // ============================================================================
  // Local State
  // ============================================================================

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataRange, setDataRange] = useState<7 | 30 | 90>(30); // Default 30 days

  // ============================================================================
  // Load Last Sync Time and Data Range
  // ============================================================================

  useEffect(() => {
    loadLastSyncTime();
    loadDataRange();
  }, []);

  async function loadLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem('health_data_last_fetch');
      if (timestamp) {
        setLastSyncTime(new Date(parseInt(timestamp, 10)));
      }
    } catch (error) {
      console.error('Failed to load last sync time:', error);
    }
  }

  async function loadDataRange() {
    try {
      const range = await AsyncStorage.getItem('health_data_range');
      if (range) {
        setDataRange(parseInt(range, 10) as 7 | 30 | 90);
      }
    } catch (error) {
      console.error('Failed to load data range:', error);
    }
  }

  // ============================================================================
  // Manual Sync Handler
  // ============================================================================

  /**
   * Handles manual sync button press
   * Requirement 5.1: Add manual sync button
   */
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      announceSuccess('Syncing health data...');
      
      await refreshData();
      
      const now = new Date();
      setLastSyncTime(now);
      await AsyncStorage.setItem('health_data_last_fetch', now.getTime().toString());
      
      announceSuccess('Health data synced successfully');
    } catch (error) {
      console.error('Manual sync failed:', error);
      announceError('Failed to sync health data');
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Opens iOS Settings app
   * Requirement 5.1: Add link to iOS Settings
   */
  const handleOpenSettings = () => {
    Linking.openSettings();
    announceSuccess('Opening iOS Settings');
  };

  /**
   * Handles data range change
   * Requirement 2.7: Add data range configuration
   */
  const handleDataRangeChange = async (range: 7 | 30 | 90) => {
    try {
      setDataRange(range);
      await AsyncStorage.setItem('health_data_range', range.toString());
      announceSettingsChange('data range', `${range} days`);
      
      // Trigger a refresh with the new range
      setIsSyncing(true);
      await refreshData();
      
      const now = new Date();
      setLastSyncTime(now);
      await AsyncStorage.setItem('health_data_last_fetch', now.getTime().toString());
      
      announceSuccess(`Data range updated to ${range} days`);
    } catch (error) {
      console.error('Failed to update data range:', error);
      announceError('Failed to update data range');
    } finally {
      setIsSyncing(false);
    }
  };

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
          Manage HealthKit and accessibility settings
        </ThemedText>
      </ThemedView>

      {/* HealthKit Section - Requirement 5.1 */}
      <ThemedView style={[styles.section, { backgroundColor: colors.background }]}>
        <ThemedText
          style={[
            styles.sectionTitle,
            { fontSize: fontSize.heading, color: colors.text },
          ]}
        >
          HealthKit Integration
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { fontSize: fontSize.label, color: colors.textSecondary },
          ]}
        >
          Manage your health data permissions and synchronization
        </ThemedText>

        {/* Last Sync Time */}
        {lastSyncTime && (
          <View style={styles.syncInfoRow}>
            <ThemedText
              style={[
                styles.syncLabel,
                { fontSize: fontSize.body, color: colors.text },
              ]}
            >
              Last synced:
            </ThemedText>
            <ThemedText
              style={[
                styles.syncValue,
                { fontSize: fontSize.body, color: colors.textSecondary },
              ]}
            >
              {lastSyncTime.toLocaleString()}
            </ThemedText>
          </View>
        )}

        {/* Manual Sync Button */}
        <AccessibleButton
          onPress={handleManualSync}
          label="Sync health data"
          hint="Fetch latest health data from HealthKit"
          variant="primary"
          style={styles.syncButton}
          disabled={isSyncing || isLoading}
        >
          {isSyncing || isLoading ? (
            <View style={styles.syncingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <ThemedText
                style={[
                  styles.buttonText,
                  {
                    fontSize: fontSize.body,
                    color: colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff',
                    marginLeft: 8,
                  },
                ]}
              >
                Syncing...
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              style={[
                styles.buttonText,
                {
                  fontSize: fontSize.body,
                  color: colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff',
                },
              ]}
            >
              Sync Now
            </ThemedText>
          )}
        </AccessibleButton>

        {/* Data Range Configuration - Requirement 2.7 */}
        <View style={styles.dataRangeContainer}>
          <ThemedText
            style={[
              styles.dataRangeTitle,
              { fontSize: fontSize.body, color: colors.text, marginTop: 16, marginBottom: 12 },
            ]}
          >
            Data Time Range
          </ThemedText>
          <ThemedText
            style={[
              styles.dataRangeDescription,
              { fontSize: fontSize.label, color: colors.textSecondary, marginBottom: 12 },
            ]}
          >
            Select how far back to fetch health data
          </ThemedText>
          
          <View style={styles.buttonGroup}>
            <AccessibleButton
              onPress={() => handleDataRangeChange(7)}
              label="7 days"
              hint="Fetch health data from the last 7 days"
              variant={dataRange === 7 ? 'primary' : 'outline'}
              style={styles.groupButton}
              disabled={isSyncing || isLoading}
            >
              <ThemedText
                style={[
                  styles.buttonText,
                  {
                    fontSize: fontSize.body,
                    color: dataRange === 7
                      ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                      : colors.text,
                  },
                ]}
              >
                7 Days
              </ThemedText>
            </AccessibleButton>

            <AccessibleButton
              onPress={() => handleDataRangeChange(30)}
              label="30 days"
              hint="Fetch health data from the last 30 days"
              variant={dataRange === 30 ? 'primary' : 'outline'}
              style={styles.groupButton}
              disabled={isSyncing || isLoading}
            >
              <ThemedText
                style={[
                  styles.buttonText,
                  {
                    fontSize: fontSize.body,
                    color: dataRange === 30
                      ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                      : colors.text,
                  },
                ]}
              >
                30 Days
              </ThemedText>
            </AccessibleButton>

            <AccessibleButton
              onPress={() => handleDataRangeChange(90)}
              label="90 days"
              hint="Fetch health data from the last 90 days"
              variant={dataRange === 90 ? 'primary' : 'outline'}
              style={styles.groupButton}
              disabled={isSyncing || isLoading}
            >
              <ThemedText
                style={[
                  styles.buttonText,
                  {
                    fontSize: fontSize.body,
                    color: dataRange === 90
                      ? (colors === HIGH_CONTRAST_COLORS ? '#000000' : '#ffffff')
                      : colors.text,
                  },
                ]}
              >
                90 Days
              </ThemedText>
            </AccessibleButton>
          </View>
        </View>

        {/* Permission Status - Grouped by Category */}
        {permissions && (
          <View style={styles.permissionsContainer}>
            <ThemedText
              style={[
                styles.permissionsTitle,
                { fontSize: fontSize.body, color: colors.text, marginTop: 16, marginBottom: 12 },
              ]}
            >
              Permission Status
            </ThemedText>

            {/* Vitals Category */}
            <View style={styles.categoryContainer}>
              <ThemedText
                style={[
                  styles.categoryTitle,
                  { fontSize: fontSize.body, color: colors.text },
                ]}
              >
                Vitals
              </ThemedText>
              <View style={styles.permissionsList}>
                <PermissionItem
                  label="Heart Rate"
                  granted={permissions.heartRate}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Blood Pressure"
                  granted={permissions.bloodPressure}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Respiratory Rate"
                  granted={permissions.respiratoryRate}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Body Temperature"
                  granted={permissions.bodyTemperature}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Oxygen Saturation"
                  granted={permissions.oxygenSaturation}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Blood Glucose"
                  granted={permissions.bloodGlucose}
                  fontSize={fontSize}
                  colors={colors}
                />
              </View>
            </View>

            {/* Activity Category */}
            <View style={styles.categoryContainer}>
              <ThemedText
                style={[
                  styles.categoryTitle,
                  { fontSize: fontSize.body, color: colors.text },
                ]}
              >
                Activity
              </ThemedText>
              <View style={styles.permissionsList}>
                <PermissionItem
                  label="Steps"
                  granted={permissions.steps}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Distance"
                  granted={permissions.distance}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Flights Climbed"
                  granted={permissions.flightsClimbed}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Active Energy"
                  granted={permissions.activeEnergy}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Exercise Minutes"
                  granted={permissions.exerciseMinutes}
                  fontSize={fontSize}
                  colors={colors}
                />
              </View>
            </View>

            {/* Body Category */}
            <View style={styles.categoryContainer}>
              <ThemedText
                style={[
                  styles.categoryTitle,
                  { fontSize: fontSize.body, color: colors.text },
                ]}
              >
                Body Measurements
              </ThemedText>
              <View style={styles.permissionsList}>
                <PermissionItem
                  label="Weight"
                  granted={permissions.weight}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Height"
                  granted={permissions.height}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="BMI"
                  granted={permissions.bmi}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Body Fat %"
                  granted={permissions.bodyFatPercentage}
                  fontSize={fontSize}
                  colors={colors}
                />
              </View>
            </View>

            {/* Nutrition Category */}
            <View style={styles.categoryContainer}>
              <ThemedText
                style={[
                  styles.categoryTitle,
                  { fontSize: fontSize.body, color: colors.text },
                ]}
              >
                Nutrition
              </ThemedText>
              <View style={styles.permissionsList}>
                <PermissionItem
                  label="Dietary Energy"
                  granted={permissions.dietaryEnergy}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Water"
                  granted={permissions.water}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Protein"
                  granted={permissions.protein}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Carbohydrates"
                  granted={permissions.carbohydrates}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Fats"
                  granted={permissions.fats}
                  fontSize={fontSize}
                  colors={colors}
                />
              </View>
            </View>

            {/* Sleep & Mindfulness Category */}
            <View style={styles.categoryContainer}>
              <ThemedText
                style={[
                  styles.categoryTitle,
                  { fontSize: fontSize.body, color: colors.text },
                ]}
              >
                Sleep & Mindfulness
              </ThemedText>
              <View style={styles.permissionsList}>
                <PermissionItem
                  label="Sleep Analysis"
                  granted={permissions.sleep}
                  fontSize={fontSize}
                  colors={colors}
                />
                <PermissionItem
                  label="Mindfulness"
                  granted={permissions.mindfulness}
                  fontSize={fontSize}
                  colors={colors}
                />
              </View>
            </View>
          </View>
        )}

        {/* Open iOS Settings Button */}
        <AccessibleButton
          onPress={handleOpenSettings}
          label="Open iOS Settings"
          hint="Open iOS Settings to manage HealthKit permissions"
          variant="outline"
          style={styles.settingsButton}
        >
          <ThemedText
            style={[
              styles.buttonText,
              {
                fontSize: fontSize.body,
                color: colors.text,
              },
            ]}
          >
            Open iOS Settings
          </ThemedText>
        </AccessibleButton>
      </ThemedView>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

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

  // HealthKit Settings Styles
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  syncLabel: {
    fontWeight: '600',
  },

  syncValue: {
    flex: 1,
  },

  syncButton: {
    marginBottom: 8,
  },

  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsButton: {
    marginTop: 12,
  },

  dataRangeContainer: {
    marginTop: 8,
  },

  dataRangeTitle: {
    fontWeight: '600',
  },

  dataRangeDescription: {
    lineHeight: 18,
  },

  permissionsContainer: {
    marginTop: 8,
  },

  permissionsTitle: {
    fontWeight: '600',
  },

  categoryContainer: {
    marginTop: 12,
    marginBottom: 8,
  },

  categoryTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },

  permissionsList: {
    gap: 6,
  },

  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  permissionLabel: {
    flex: 1,
  },

  permissionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  permissionStatus: {
    fontWeight: '600',
    fontSize: 11,
  },

  divider: {
    height: 1,
    marginVertical: 24,
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
