import { Link } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { useSpeech } from '@/hooks/useSpeech';
import { VitalSign } from '@/types';

export default function ModalScreen() {
  const { mode, setMode, settings, updateSettings, isLoading, error } = useAccessibility();
  const audio = useAudio();
  const haptics = useHaptics();
  const speech = useSpeech();

  // Mock vital signs data for testing TTS
  const mockVitals: VitalSign[] = [
    {
      type: 'heart_rate',
      value: 72,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      unit: 'bpm',
      range: 'normal',
    },
    {
      type: 'glucose',
      value: 95,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      unit: 'mg/dL',
      range: 'normal',
    },
    {
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

        {/* Mode Selection */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Current Mode: {mode}</ThemedText>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, mode === 'visual' && styles.activeButton]} 
              onPress={() => setMode('visual')}
            >
              <ThemedText style={styles.buttonText}>Visual</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, mode === 'audio' && styles.activeButton]} 
              onPress={() => setMode('audio')}
            >
              <ThemedText style={styles.buttonText}>Audio</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, mode === 'hybrid' && styles.activeButton]} 
              onPress={() => setMode('hybrid')}
            >
              <ThemedText style={styles.buttonText}>Hybrid</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, mode === 'simplified' && styles.activeButton]} 
              onPress={() => setMode('simplified')}
            >
              <ThemedText style={styles.buttonText}>Simplified</ThemedText>
            </TouchableOpacity>
          </View>
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
              onPress={() => speech.speakSummary(mockVitals)}
            >
              <ThemedText style={styles.buttonText}>Hear Summary</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => speech.speakDetails(mockVitals[0])}
            >
              <ThemedText style={styles.buttonText}>Hear Details</ThemedText>
            </TouchableOpacity>
          </View>
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
});
