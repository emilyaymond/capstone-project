/**
 * Feedback Testing Screen
 * 
 * A dedicated screen for testing audio and haptic feedback features.
 * This is a development/testing tool - not part of the main app flow.
 * 
 * Features tested:
 * - Audio button clicks
 * - Mode change sounds
 * - Text-to-speech
 * - Data sonification
 * - Haptic feedback (light, medium, heavy)
 * - Touch-to-explore with haptics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { AccessibleButton } from '@/components/AccessibleButton';
import { TouchExploreChart } from '@/components/TouchExploreChart';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { useSpeech } from '@/hooks/useSpeech';
import { playDataSeries, isSonificationPlaying } from '@/lib/sonification';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { DataPoint, AccessibilityMode } from '@/types';

export default function TestFeedbackScreen() {
  // ============================================================================
  // State
  // ============================================================================

  const [lastAction, setLastAction] = useState<string>('Ready to test');
  const [isSonifying, setIsSonifying] = useState(false);
  const [sonificationControl, setSonificationControl] = useState<any>(null);

  // ============================================================================
  // Hooks
  // ============================================================================

  const { playClickSound, playSuccessSound, playErrorSound, playModeChangeSound } = useAudio();
  const { triggerLight, triggerMedium, triggerHeavy, triggerForDataPoint } = useHaptics();
  const { speak, stop, isSpeaking } = useSpeech();
  const { mode, setMode, settings } = useAccessibility();

  // ============================================================================
  // Test Data
  // ============================================================================

  const testDataPoints: DataPoint[] = [
    { value: 70, timestamp: new Date('2024-01-01T08:00'), range: 'normal' },
    { value: 72, timestamp: new Date('2024-01-01T09:00'), range: 'normal' },
    { value: 75, timestamp: new Date('2024-01-01T10:00'), range: 'normal' },
    { value: 82, timestamp: new Date('2024-01-01T11:00'), range: 'warning' },
    { value: 88, timestamp: new Date('2024-01-01T12:00'), range: 'warning' },
    { value: 95, timestamp: new Date('2024-01-01T13:00'), range: 'danger' },
    { value: 92, timestamp: new Date('2024-01-01T14:00'), range: 'danger' },
    { value: 85, timestamp: new Date('2024-01-01T15:00'), range: 'warning' },
    { value: 78, timestamp: new Date('2024-01-01T16:00'), range: 'normal' },
    { value: 73, timestamp: new Date('2024-01-01T17:00'), range: 'normal' },
  ];

  // ============================================================================
  // Test Handlers
  // ============================================================================

  const handleTestClick = () => {
    playClickSound();
    setLastAction('✓ Played click sound');
  };

  const handleTestSuccess = () => {
    playSuccessSound();
    setLastAction('✓ Played success sound (rising pitch)');
  };

  const handleTestError = () => {
    playErrorSound();
    setLastAction('✓ Played error sound (descending pitch)');
  };

  const handleTestModeSound = (testMode: AccessibilityMode) => {
    playModeChangeSound(testMode);
    setLastAction(`✓ Played ${testMode} mode sound`);
  };

  const handleTestTTS = () => {
    if (isSpeaking) {
      stop();
      setLastAction('✓ Stopped speech');
    } else {
      speak('This is a test of the text to speech system. Audio feedback is working correctly.');
      setLastAction('✓ Started text-to-speech');
    }
  };

  const handleTestSonification = async () => {
    if (isSonifying) {
      if (sonificationControl) {
        await sonificationControl.stop();
        setSonificationControl(null);
      }
      setIsSonifying(false);
      setLastAction('✓ Stopped sonification');
    } else {
      setIsSonifying(true);
      setLastAction('✓ Started sonification (listen for tones)');
      
      try {
        const control = await playDataSeries(testDataPoints, {
          onProgress: (current, total) => {
            setLastAction(`♪ Playing tone ${current}/${total}`);
          },
          onComplete: () => {
            setIsSonifying(false);
            setSonificationControl(null);
            setLastAction('✓ Sonification complete');
          },
          onError: (error) => {
            setIsSonifying(false);
            setSonificationControl(null);
            setLastAction(`✗ Sonification error: ${error.message}`);
          },
        });
        
        setSonificationControl(control);
      } catch (error: any) {
        setIsSonifying(false);
        setLastAction(`✗ Failed to start: ${error.message}`);
      }
    }
  };

  const handleTestHapticLight = () => {
    triggerLight();
    setLastAction('✓ Triggered light haptic');
  };

  const handleTestHapticMedium = () => {
    triggerMedium();
    setLastAction('✓ Triggered medium haptic');
  };

  const handleTestHapticHeavy = () => {
    triggerHeavy();
    setLastAction('✓ Triggered heavy haptic');
  };

  const handleTestHapticNormal = () => {
    triggerForDataPoint('normal');
    setLastAction('✓ Triggered normal range haptic');
  };

  const handleTestHapticWarning = () => {
    triggerForDataPoint('warning');
    setLastAction('✓ Triggered warning range haptic');
  };

  const handleTestHapticDanger = () => {
    triggerForDataPoint('danger');
    setLastAction('✓ Triggered danger range haptic');
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Test Audio & Haptics',
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Status Display */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Last Action:</Text>
            <Text style={styles.statusText}>{lastAction}</Text>
          </View>

          {/* Current Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Settings</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.settingText}>Mode: {mode}</Text>
              <Text style={styles.settingText}>
                Audio: {settings.audioEnabled ? 'ON' : 'OFF'}
              </Text>
              <Text style={styles.settingText}>
                Haptics: {settings.hapticsEnabled ? 'ON' : 'OFF'}
              </Text>
              <Text style={styles.settingText}>
                Platform: {Platform.OS}
              </Text>
            </View>
          </View>

          {/* Audio Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊 Audio Tests</Text>
            
            <AccessibleButton
              label="Test Click Sound"
              hint="Play a short click sound"
              onPress={handleTestClick}
              style={styles.button}
            />
            
            <AccessibleButton
              label="Test Success Sound"
              hint="Play a rising pitch success sound"
              onPress={handleTestSuccess}
              style={styles.button}
            />
            
            <AccessibleButton
              label="Test Error Sound"
              hint="Play a descending pitch error sound"
              onPress={handleTestError}
              style={styles.button}
            />
          </View>

          {/* Mode Change Sounds */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Mode Change Sounds</Text>
            
            <View style={styles.buttonRow}>
              <AccessibleButton
                label="Visual"
                hint="Play visual mode sound"
                onPress={() => handleTestModeSound('visual')}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Audio"
                hint="Play audio mode sound"
                onPress={() => handleTestModeSound('audio')}
                style={styles.smallButton}
              />
            </View>
            
            <View style={styles.buttonRow}>
              <AccessibleButton
                label="Hybrid"
                hint="Play hybrid mode sound"
                onPress={() => handleTestModeSound('hybrid')}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Simplified"
                hint="Play simplified mode sound"
                onPress={() => handleTestModeSound('simplified')}
                style={styles.smallButton}
              />
            </View>
          </View>

          {/* TTS Test */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗣️ Text-to-Speech</Text>
            
            <AccessibleButton
              label={isSpeaking ? 'Stop Speaking' : 'Test TTS'}
              hint={isSpeaking ? 'Stop the speech' : 'Speak a test message'}
              onPress={handleTestTTS}
              variant={isSpeaking ? 'outline' : 'primary'}
              style={styles.button}
            />
          </View>

          {/* Sonification Test */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>♪ Data Sonification</Text>
            <Text style={styles.sectionDescription}>
              Plays 10 data points as tones. Listen for low (normal), medium (normal), 
              and high (warning/danger) frequencies.
            </Text>
            
            <AccessibleButton
              label={isSonifying ? 'Stop Sonification' : 'Play Data as Sound'}
              hint={isSonifying ? 'Stop the sonification' : 'Play test data as audio tones'}
              onPress={handleTestSonification}
              variant={isSonifying ? 'outline' : 'primary'}
              style={styles.button}
            />
          </View>

          {/* Haptic Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📳 Haptic Feedback</Text>
            <Text style={styles.sectionDescription}>
              Note: Haptics work best on physical iPhone devices (6S or newer).
              Simulator may not provide haptic feedback.
            </Text>
            
            <Text style={styles.subsectionTitle}>Basic Haptics:</Text>
            <View style={styles.buttonRow}>
              <AccessibleButton
                label="Light"
                hint="Trigger light haptic feedback"
                onPress={handleTestHapticLight}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Medium"
                hint="Trigger medium haptic feedback"
                onPress={handleTestHapticMedium}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Heavy"
                hint="Trigger heavy haptic feedback"
                onPress={handleTestHapticHeavy}
                style={styles.smallButton}
              />
            </View>
            
            <Text style={styles.subsectionTitle}>Data Range Haptics:</Text>
            <View style={styles.buttonRow}>
              <AccessibleButton
                label="Normal"
                hint="Trigger normal range haptic"
                onPress={handleTestHapticNormal}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Warning"
                hint="Trigger warning range haptic"
                onPress={handleTestHapticWarning}
                style={styles.smallButton}
              />
              <AccessibleButton
                label="Danger"
                hint="Trigger danger range haptic"
                onPress={handleTestHapticDanger}
                style={styles.smallButton}
              />
            </View>
          </View>

          {/* Touch-to-Explore Test */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👆 Touch-to-Explore</Text>
            <Text style={styles.sectionDescription}>
              Drag your finger across the chart. You should hear announcements 
              and feel haptic feedback for each data point.
            </Text>
            
            <TouchExploreChart
              data={testDataPoints}
              accessibilityLabel="Test chart with 10 data points"
              accessibilityHint="Drag your finger to explore data and feel haptic feedback"
              title="Test Data (Heart Rate)"
              unit="bpm"
            />
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Testing Checklist</Text>
            <Text style={styles.instruction}>✓ Audio enabled in Settings</Text>
            <Text style={styles.instruction}>✓ Haptics enabled in Settings</Text>
            <Text style={styles.instruction}>✓ Device volume turned up</Text>
            <Text style={styles.instruction}>✓ Silent mode OFF (iOS)</Text>
            <Text style={styles.instruction}>✓ Testing on physical device (for haptics)</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#000',
  },
  settingsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#000',
  },
  button: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  smallButton: {
    flex: 1,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 6,
    color: '#000',
  },
});
