# Custom Hooks

This directory contains custom React hooks for the HealthVis Expo application.

## Available Hooks

### useStorage
**File:** `useStorage.ts`

Provides persistent storage functionality using AsyncStorage.

**Features:**
- Save and load accessibility settings
- Debounced save operations (100ms)
- Error handling for storage failures
- Platform availability checking

**Requirements:** 2.1, 2.2, 2.3

---

### useAudio
**File:** `useAudio.ts`

Provides audio feedback functionality using expo-av.

**Features:**
- Play sounds with specified frequency, duration, and waveform
- Pre-defined sounds: click, success, error, focus, hover, mode change
- Integrates with AccessibilityContext to respect audioEnabled setting
- Automatic cleanup on unmount

**Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

---

### useHaptics
**File:** `useHaptics.ts`

Provides haptic feedback functionality using expo-haptics.

**Features:**
- Light, medium, and heavy haptic intensities
- Data range-based haptic mapping (normal → light, warning → medium, danger → heavy)
- Platform detection with graceful fallback for Web
- Integrates with AccessibilityContext to respect hapticsEnabled setting

**Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5

---

### useSpeech
**File:** `useSpeech.ts`

Provides text-to-speech functionality using expo-speech.

**Features:**
- Speak arbitrary text with customizable options (language, pitch, rate)
- Speak health data summaries (multiple vital signs)
- Speak detailed information about individual vital signs
- Stop button functionality during active speech
- Automatic speech stop on navigation
- Error handling for TTS failures
- isSpeaking state tracking

**Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5

**Usage Example:**
```typescript
import { useSpeech } from '@/hooks/useSpeech';

function MyComponent() {
  const speech = useSpeech();
  
  // Speak simple text
  await speech.speak('Hello, world!');
  
  // Speak with options
  await speech.speak('Hello!', { pitch: 1.2, rate: 0.9 });
  
  // Speak vital signs summary
  await speech.speakSummary(vitalsArray);
  
  // Speak vital sign details
  await speech.speakDetails(singleVital);
  
  // Stop speech
  speech.stop();
  
  // Check if speaking
  if (speech.isSpeaking) {
    // Show stop button
  }
}
```

---

## Integration with AccessibilityContext

All hooks integrate with the `AccessibilityContext` to respect user preferences:

- **useAudio**: Respects `settings.audioEnabled`
- **useHaptics**: Respects `settings.hapticsEnabled`
- **useSpeech**: Always available (TTS is independent of audio feedback setting)

## Testing

All hooks can be tested using the Accessibility Test Screen (modal screen):

1. Start the app: `npm start`
2. Navigate to the test screen
3. Test each hook's functionality with the provided buttons

See `TESTING.md` for detailed testing instructions.
