# HealthVis Mobile

Accessible health data visualization app built with Expo and React Native.

## Features

- 🎯 **4 Accessibility Modes**: Visual, Audio, Hybrid, Simplified
- 🔊 **Audio Feedback**: Button clicks, mode changes, data sonification
- 📳 **Haptic Feedback**: Touch-based feedback for data exploration
- 🗣️ **Text-to-Speech**: Spoken summaries of health data
- 👆 **Touch-to-Explore**: Interactive charts with audio/haptic feedback
- 📊 **Data Visualization**: Line and bar charts with accessibility features
- ⚙️ **Customizable Settings**: Font size, contrast, audio/haptic toggles

## Quick Start

```bash
# Install dependencies
npm install

# Start the app
npm start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR code for physical device
```

## Testing

See `TESTING_GUIDE.md` for detailed testing instructions.

Quick test: Navigate to `/test-feedback` in the app to test all audio and haptic features.

## Project Structure

```
app/              # Screens (file-based routing)
components/       # Reusable components
contexts/         # React contexts (Accessibility, HealthData)
hooks/            # Custom hooks (useAudio, useHaptics, useSpeech)
lib/              # Utilities (API client, announcer, sonification)
types/            # TypeScript type definitions
constants/        # App constants (theme, accessibility)
```

## Documentation

- `TESTING_GUIDE.md` - Testing audio and haptic features
- `CODE_REVIEW.md` - Current implementation status
- `.kiro/specs/expo-accessibility-migration/` - Full spec documentation

## Tech Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router (file-based routing)
- expo-av (audio)
- expo-haptics (haptic feedback)
- expo-speech (text-to-speech)
- AsyncStorage (persistence)
