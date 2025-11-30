import { Link } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function ModalScreen() {
  const { mode, setMode, settings, updateSettings, isLoading, error } = useAccessibility();

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
