import { Link } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessibleButton } from '@/components/AccessibleButton';
import { ModeSelector } from '@/components/ModeSelector';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { useSpeech } from '@/hooks/useSpeech';
import { HealthMetric } from '@/types';
import { 
  announce, 
  announceSuccess, 
  announceError, 
  announceNavigation,
  announceLoading,
  announceDataUpdate 
} from '@/lib/announcer';

export default function ModalScreen() {
  const { mode, setMode, settings, updateSettings, isLoading, error } = useAccessibility();
  const audio = useAudio();
  const haptics = useHaptics();
  const speech = useSpeech();

  // Mock health metrics data for testing TTS
  const mockMetrics: HealthMetric[] = [
    {
      id: 'heart_rate-test-1',
      category: 'vitals',
      type: 'heart_rate',
      value: 72,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      unit: 'bpm',
      range: 'normal',
    },
    {
      id: 'blood_glucose-test-1',
      category: 'vitals',
      type: 'blood_glucose',
      value: 95,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      unit: 'mg/dL',
      range: 'normal',
    },
    {
      id: 'steps-test-1',
      category: 'activity',
      type: 'steps',
      value: 8500,
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      unit: 'steps',
      range: 'normal',
    },
  ];

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>Accessibility Test</ThemedText>
        
        {error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>Error: {error.message}</ThemedText>
          </View>
        )}

        {/* Mode Selection - Using ModeSelector Component */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Accessibility Mode</ThemedText>
          <ThemedText style={styles.helperText}>
            Select your preferred accessibility mode. Each mode provides different features and interface adaptations.
          </ThemedText>
          <ModeSelector
            currentMode={mode}
            onModeChange={setMode}
          />
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Font Size: {settings.fontSize}</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, settings.fontSize === 'small' && styles.activeButton]} 
              onPress={() => updateSettings({ fontSize: 'small' })}
            >
              <ThemedText style={styles.buttonText}>Small</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, settings.fontSize === 'medium' && styles.activeButton]} 
              onPress={() => updateSettings({ fontSize: 'medium' })}
            >
              <ThemedText style={styles.buttonText}>Medium</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, settings.fontSize === 'large' && styles.activeButton]} 
              onPress={() => updateSettings({ fontSize: 'large' })}
            >
              <ThemedText style={styles.buttonText}>Large</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contrast */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Contrast: {settings.contrast}</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, settings.contrast === 'normal' && styles.activeButton]} 
              onPress={() => updateSettings({ contrast: 'normal' })}
            >
              <ThemedText style={styles.buttonText}>Normal</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, settings.contrast === 'high' && styles.activeButton]} 
              onPress={() => updateSettings({ contrast: 'high' })}
            >
              <ThemedText style={styles.buttonText}>High</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Features</ThemedText>
          <TouchableOpacity 
            style={[styles.toggleButton, settings.audioEnabled && styles.activeButton]} 
            onPress={() => updateSettings({ audioEnabled: !settings.audioEnabled })}
          >
            <ThemedText style={styles.buttonText}>
              Audio: {settings.audioEnabled ? 'ON' : 'OFF'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, settings.hapticsEnabled && styles.activeButton]} 
            onPress={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
          >
            <ThemedText style={styles.buttonText}>
              Haptics: {settings.hapticsEnabled ? 'ON' : 'OFF'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Audio Testing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Test Audio Feedback</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playClickSound()}
            >
              <ThemedText style={styles.buttonText}>Click</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playSuccessSound()}
            >
              <ThemedText style={styles.buttonText}>Success</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playErrorSound()}
            >
              <ThemedText style={styles.buttonText}>Error</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playFocusSound()}
            >
              <ThemedText style={styles.buttonText}>Focus</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playModeChangeSound(mode)}
            >
              <ThemedText style={styles.buttonText}>Mode Sound</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => audio.playHoverSound()}
            >
              <ThemedText style={styles.buttonText}>Hover</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Haptic Testing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Test Haptic Feedback {!haptics.isSupported && '(Not Supported)'}
          </ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerLight()}
            >
              <ThemedText style={styles.buttonText}>Light</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerMedium()}
            >
              <ThemedText style={styles.buttonText}>Medium</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerHeavy()}
            >
              <ThemedText style={styles.buttonText}>Heavy</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerForDataPoint('normal')}
            >
              <ThemedText style={styles.buttonText}>Normal</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerForDataPoint('warning')}
            >
              <ThemedText style={styles.buttonText}>Warning</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => haptics.triggerForDataPoint('danger')}
            >
              <ThemedText style={styles.buttonText}>Danger</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text-to-Speech Testing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Test Text-to-Speech {speech.isSpeaking && '(Speaking...)'}
          </ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => speech.speak('Hello! This is a test of the text to speech system.')}
            >
              <ThemedText style={styles.buttonText}>Speak Test</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, speech.isSpeaking && styles.activeButton]} 
              onPress={() => speech.stop()}
              disabled={!speech.isSpeaking}
            >
              <ThemedText style={styles.buttonText}>Stop</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => speech.speakHealthMetricSummary(mockMetrics)}
            >
              <ThemedText style={styles.buttonText}>Hear Summary</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => speech.speakHealthMetricDetails(mockMetrics[0])}
            >
              <ThemedText style={styles.buttonText}>Hear Details</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Reader Announcements Testing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Test Screen Reader Announcements
          </ThemedText>
          <ThemedText style={styles.helperText}>
            Enable VoiceOver (iOS) or TalkBack (Android) to hear these announcements
          </ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announce('This is a polite announcement', { priority: 'polite' })}
            >
              <ThemedText style={styles.buttonText}>Polite</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announce('This is an assertive announcement', { priority: 'assertive' })}
            >
              <ThemedText style={styles.buttonText}>Assertive</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announceSuccess('Settings saved successfully')}
            >
              <ThemedText style={styles.buttonText}>Success</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announceError('Failed to load data')}
            >
              <ThemedText style={styles.buttonText}>Error</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announceNavigation('Settings', 'Configure your accessibility preferences')}
            >
              <ThemedText style={styles.buttonText}>Navigation</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announceLoading('Loading health data')}
            >
              <ThemedText style={styles.buttonText}>Loading</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => announceDataUpdate('Heart rate data refreshed')}
            >
              <ThemedText style={styles.buttonText}>Data Update</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* AccessibleButton Testing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Test AccessibleButton Component
          </ThemedText>
          <ThemedText style={styles.helperText}>
            These buttons use the new AccessibleButton component with automatic audio/haptic feedback
          </ThemedText>
          <View style={styles.buttonRow}>
            <AccessibleButton
              label="Primary Button"
              hint="This is a primary button with audio and haptic feedback"
              onPress={() => announceSuccess('Primary button pressed')}
              variant="primary"
            />
            <AccessibleButton
              label="Secondary"
              hint="This is a secondary button"
              onPress={() => announceSuccess('Secondary button pressed')}
              variant="secondary"
            />
          </View>
          <View style={styles.buttonRow}>
            <AccessibleButton
              label="Outline Button"
              hint="This is an outline button"
              onPress={() => announceSuccess('Outline button pressed')}
              variant="outline"
            />
            <AccessibleButton
              label="Disabled"
              hint="This button is disabled"
              onPress={() => {}}
              disabled={true}
            />
          </View>
          <ThemedText style={styles.helperText}>
            Notice: In simplified mode, buttons are larger (56x56 minimum). Audio feedback plays in audio/hybrid modes. Haptics trigger when enabled.
          </ThemedText>
        </View>

        <Link href="/" dismissTo style={styles.link}>
          <ThemedText type="link">← Back to Home</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  toggleButton: {
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorBox: {
    padding: 15,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
  },
  link: {
    marginTop: 20,
    paddingVertical: 15,
    alignSelf: 'center',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 10,
    fontStyle: 'italic',
  },
});
