# Components

This directory contains reusable UI components for the HealthVis Expo application.

## AccessibleButton

A fully accessible button component with built-in audio and haptic feedback.

### Features

- **Accessibility Labels**: Proper `accessibilityLabel` and `accessibilityHint` props for screen readers
- **Mode-Specific Behavior**: Automatically adapts to the current accessibility mode
  - Audio/Hybrid modes: Plays click sound on press
  - All modes: Triggers haptic feedback when enabled
- **Large Touch Targets**: Minimum 44x44 points (iOS HIG), 56x56 in simplified mode
- **Disabled State**: Visual and functional disabled state handling
- **Fast Feedback**: Provides feedback within 50ms for responsiveness
- **Variants**: Primary, secondary, and outline button styles
- **High Contrast Support**: Automatically adapts colors for high contrast mode

### Usage

```tsx
import { AccessibleButton } from '@/components/AccessibleButton';

// Basic usage
<AccessibleButton
  label="Save Settings"
  onPress={() => saveSettings()}
/>

// With hint and variant
<AccessibleButton
  label="Delete Account"
  hint="This action cannot be undone"
  onPress={() => deleteAccount()}
  variant="outline"
/>

// Disabled state
<AccessibleButton
  label="Submit"
  onPress={() => submit()}
  disabled={!isValid}
/>
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onPress` | `() => void` | Yes | - | Button press handler |
| `label` | `string` | Yes | - | Accessibility label describing the button's purpose |
| `hint` | `string` | No | - | Optional accessibility hint providing additional context |
| `disabled` | `boolean` | No | `false` | Whether the button is disabled |
| `children` | `React.ReactNode` | No | - | Visual content (defaults to label if not provided) |
| `style` | `ViewStyle` | No | - | Custom style for the button container |
| `textStyle` | `TextStyle` | No | - | Custom style for the button text |
| `accessibilityRole` | `AccessibilityRole` | No | `'button'` | Accessibility role |
| `variant` | `'primary' \| 'secondary' \| 'outline'` | No | `'primary'` | Button visual style variant |

### Requirements Satisfied

- **Requirement 1.5**: Large touch targets for simplified mode (44x44 minimum)
- **Requirement 3.1**: Audio feedback on button tap
- **Requirement 4.1**: Haptic feedback on button tap
- **Requirement 8.1**: Proper accessibility labels for all interactive elements
- **Requirement 16.1**: Feedback within 50ms for responsiveness

### Testing

The AccessibleButton component can be tested in the Accessibility Test Screen (modal):

1. Start the app: `npm start`
2. Navigate to the Accessibility Test Screen
3. Scroll to the "Test AccessibleButton Component" section
4. Test different variants (primary, secondary, outline, disabled)
5. Verify audio feedback in audio/hybrid modes
6. Verify haptic feedback when enabled
7. Verify larger touch targets in simplified mode
8. Test with VoiceOver/TalkBack to verify accessibility labels

## Other Components

- **ThemedText**: Text component with theme support
- **ThemedView**: View component with theme support
- **HapticTab**: Tab component with haptic feedback
- **HelloWave**: Animated wave component
- **ParallaxScrollView**: Scroll view with parallax header effect
- **ExternalLink**: Link component for external URLs


## ModeSelector

A radio group component for selecting accessibility modes (Visual, Audio, Hybrid, Simplified).
Provides proper accessibility labels, audio feedback, and screen reader announcements.

### Features

- **Radio Group Interface**: Proper `accessibilityRole="radiogroup"` for screen readers
- **Four Mode Options**: Visual, Audio, Hybrid, and Simplified modes
- **Visual Indicators**: Radio buttons with checked/unchecked states
- **Mode Descriptions**: Each mode includes a description for screen readers
- **Audio Feedback**: Plays mode-specific sound on selection
- **Screen Reader Announcements**: Announces mode changes with assertive priority
- **Responsive Touch Targets**: Larger touch targets in simplified mode
- **High Contrast Support**: Automatically adapts colors for high contrast mode
- **Immediate Application**: Mode changes apply immediately via AccessibilityContext

### Usage

```tsx
import { ModeSelector } from '@/components/ModeSelector';
import { useAccessibility } from '@/contexts/AccessibilityContext';

function SettingsScreen() {
  const { mode, setMode } = useAccessibility();
  
  return (
    <ModeSelector
      currentMode={mode}
      onModeChange={setMode}
    />
  );
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `currentMode` | `AccessibilityMode` | Yes | - | Current accessibility mode |
| `onModeChange` | `(mode: AccessibilityMode) => void` | Yes | - | Callback when mode changes |
| `style` | `ViewStyle` | No | - | Custom container style |

### Mode Options

| Mode | Label | Description |
|------|-------|-------------|
| `visual` | Visual | Visual mode with standard interface and visual charts |
| `audio` | Audio | Audio mode with enhanced sound feedback and text-to-speech |
| `hybrid` | Hybrid | Hybrid mode combining visual and audio features |
| `simplified` | Simplified | Simplified mode with larger touch targets and reduced complexity |

### Requirements Satisfied

- **Requirement 1.1**: Present four accessibility mode options on launch
- **Requirement 1.2**: Apply mode-specific interface adaptations immediately
- **Requirement 1.6**: Announce mode changes with assertive priority to screen readers

### Testing

The ModeSelector component can be tested in the Accessibility Test Screen (modal):

1. Start the app: `npm start`
2. Navigate to the Accessibility Test Screen
3. Find the "Accessibility Mode" section at the top
4. Test selecting each mode (Visual, Audio, Hybrid, Simplified)
5. Verify radio indicators update correctly
6. Verify selected mode is highlighted
7. Verify mode descriptions are visible
8. Verify audio feedback plays when audio is enabled
9. Test with VoiceOver/TalkBack to verify:
   - Radio group is announced
   - Each option is announced as a radio button
   - Mode descriptions are read
   - Mode changes are announced automatically

### Accessibility Features

- **Screen Reader Support**: Full VoiceOver and TalkBack support
- **Keyboard Navigation**: Supports keyboard navigation on web platform
- **Focus Management**: Proper focus indicators and management
- **ARIA Attributes**: Correct ARIA roles and states for web accessibility
- **Touch Targets**: Minimum 44x44 points (56x56 in simplified mode)
- **Color Contrast**: Meets WCAG AAA standards in high contrast mode
