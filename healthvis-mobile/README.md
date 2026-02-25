# HealthVis Mobile

Accessible health data visualization app built with Expo and React Native. Integrates directly with Apple HealthKit to provide comprehensive health and fitness data visualization.

## Features

- 🏥 **Direct HealthKit Integration**: Access comprehensive health data including vitals, activity, body measurements, nutrition, sleep, and mindfulness
- 🎯 **4 Accessibility Modes**: Visual, Audio, Hybrid, Simplified
- 🔊 **Audio Feedback**: Button clicks, mode changes, data sonification
- 📳 **Haptic Feedback**: Touch-based feedback for data exploration
- 🗣️ **Text-to-Speech**: Spoken summaries of health data
- 👆 **Touch-to-Explore**: Interactive charts with audio/haptic feedback
- 📊 **Data Visualization**: Line and bar charts with accessibility features
- ⚙️ **Customizable Settings**: Font size, contrast, audio/haptic toggles
- 💾 **Offline Support**: Cached data for offline viewing

## Quick Start

```bash
# Install dependencies
npm install

# iOS Setup (Required for HealthKit)
cd ios && pod install && cd ..

# Start the development server with Expo Dev Client
npx expo start --dev-client

# Press 'i' for iOS simulator (limited HealthKit support)
# Or scan QR code with Expo Go on physical iOS device for full HealthKit access
```

### Running on Physical Device (Recommended for HealthKit)

Since HealthKit requires a physical iOS device, use one of these methods:

**Option 1: Expo Dev Client (Easiest - No Code Signing)**

```bash
npx expo start --dev-client
# Scan QR code with camera or Expo Go app
```

**Option 2: Build with Xcode (Requires Apple Developer Account)**

```bash
# Open in Xcode
open ios/healthvismobile.xcworkspace

# In Xcode:
# 1. Select healthvismobile target
# 2. Go to Signing & Capabilities
# 3. Enable "Automatically manage signing"
# 4. Select your development team
# 5. Build and run (Cmd+R)
```

**Option 3: Expo Build**

```bash
# Build for iOS device
npx expo run:ios --device
```

## HealthKit Setup

### Prerequisites

- Physical iOS device (HealthKit is not fully supported in simulator)
- iOS 13.0 or later
- For Xcode builds: Xcode 12.0 or later and Apple Developer account
- For Expo Dev Client: No code signing required

### Running Without Code Signing Issues

The easiest way to run the app is using Expo Dev Client:

```bash
cd healthvis-mobile
npx expo start --dev-client
```

This bypasses code signing requirements and works on both simulator and physical devices.

### Permissions

On first launch, the app will request permissions to access the following HealthKit data:

**Vitals:**

- Heart Rate
- Blood Pressure
- Respiratory Rate
- Body Temperature
- Oxygen Saturation
- Blood Glucose

**Activity:**

- Steps
- Distance
- Flights Climbed
- Active Energy
- Exercise Minutes

**Body Measurements:**

- Weight
- Height
- BMI
- Body Fat Percentage

**Nutrition:**

- Dietary Energy (Calories)
- Water Intake
- Protein, Carbohydrates, Fats

**Sleep & Mindfulness:**

- Sleep Analysis
- Mindfulness Minutes

### Enabling Permissions

If you deny permissions initially, you can enable them later:

1. Open iOS Settings
2. Navigate to Privacy & Security → Health
3. Select HealthVis
4. Enable the data types you want to share

## Testing

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- healthkit-service.test.ts
```

### Integration Testing

For comprehensive integration testing on physical devices:

- **Detailed Guide**: See `INTEGRATION_TESTING_GUIDE.md` for complete test procedures
- **Quick Checklist**: See `INTEGRATION_TEST_CHECKLIST.md` for quick reference
- **Feature Testing**: Navigate to `/test-feedback` in the app to test audio and haptic features

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

- `INTEGRATION_TESTING_GUIDE.md` - Comprehensive integration testing procedures for physical devices
- `INTEGRATION_TEST_CHECKLIST.md` - Quick reference checklist for integration testing
- `TESTING_GUIDE.md` - Testing audio and haptic features
- `CODE_REVIEW.md` - Current implementation status
- `.kiro/specs/apple-healthkit-migration/` - Apple HealthKit migration spec
- `.kiro/specs/expo-accessibility-migration/` - Accessibility features spec

## Tech Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router (file-based routing)
- react-native-health (HealthKit integration)
- expo-av (audio)
- expo-haptics (haptic feedback)
- expo-speech (text-to-speech)
- AsyncStorage (persistence)

## Health Data Categories

The app organizes health data into six main categories:

1. **Vitals**: Heart rate, blood pressure, respiratory rate, body temperature, oxygen saturation, blood glucose
2. **Activity**: Steps, distance, flights climbed, active energy, exercise minutes
3. **Body**: Weight, height, BMI, body fat percentage
4. **Nutrition**: Dietary energy, water, protein, carbohydrates, fats
5. **Sleep**: Sleep analysis with sleep stages
6. **Mindfulness**: Mindfulness session minutes

## Data Synchronization

- **Automatic Sync**: Data refreshes when app comes to foreground
- **Manual Sync**: Pull-to-refresh on home screen
- **Offline Access**: Cached data available when offline
- **Time Range**: Configurable in settings (7/30/90 days)
