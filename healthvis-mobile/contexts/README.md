# AccessibilityContext

The AccessibilityContext manages accessibility mode and user preferences for the HealthVis application.

## Features

- **Mode Management**: Supports four accessibility modes (visual, audio, hybrid, simplified)
- **Settings Management**: Manages font size, contrast, audio feedback, and haptics preferences
- **Validation**: Validates all mode and settings values, using defaults for invalid values
- **Persistence**: Automatically saves and loads preferences from AsyncStorage
- **Error Handling**: Provides error state and recovery mechanisms

## Usage

### 1. Wrap your app with the provider

```tsx
import { AccessibilityProvider } from './contexts/AccessibilityContext';

export default function App() {
  return (
    <AccessibilityProvider>
      {/* Your app content */}
    </AccessibilityProvider>
  );
}
```

### 2. Use the hook in your components

```tsx
import { useAccessibility } from './contexts/AccessibilityContext';

function MyComponent() {
  const { mode, setMode, settings, updateSettings, isLoading, error } = useAccessibility();

  if (isLoading) {
    return <Text>Loading preferences...</Text>;
  }

  return (
    <View>
      <Text>Current Mode: {mode}</Text>
      <Button title="Switch to Audio Mode" onPress={() => setMode('audio')} />
      
      <Text>Font Size: {settings.fontSize}</Text>
      <Button 
        title="Increase Font Size" 
        onPress={() => updateSettings({ fontSize: 'large' })} 
      />
    </View>
  );
}
```

## API

### AccessibilityContextValue

```typescript
interface AccessibilityContextValue {
  mode: AccessibilityMode;                                    // Current accessibility mode
  setMode: (mode: AccessibilityMode) => void;                 // Change accessibility mode
  settings: AccessibilitySettings;                            // Current settings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void; // Update settings
  isLoading: boolean;                                         // Loading state
  error: Error | null;                                        // Error state
  clearError: () => void;                                     // Clear error
}
```

### AccessibilityMode

```typescript
type AccessibilityMode = 'visual' | 'audio' | 'hybrid' | 'simplified';
```

### AccessibilitySettings

```typescript
interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large';
  contrast: 'normal' | 'high';
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}
```

## Validation

The context automatically validates all inputs:

- **Mode**: Must be one of 'visual', 'audio', 'hybrid', or 'simplified'
- **Font Size**: Must be 'small', 'medium', or 'large'
- **Contrast**: Must be 'normal' or 'high'
- **Audio/Haptics**: Must be boolean values

Invalid values are replaced with defaults:
- Default mode: 'visual'
- Default fontSize: 'medium'
- Default contrast: 'normal'
- Default audioEnabled: true
- Default hapticsEnabled: true

## Persistence

Settings are automatically saved to AsyncStorage when changed and loaded on app startup. The context handles:

- Automatic saving with 100ms debounce (via AsyncStorage)
- Loading on mount
- Validation of loaded values
- Graceful fallback to defaults if storage fails

## Error Handling

The context provides error state for:
- Storage failures
- Invalid mode values
- Settings update failures

Errors don't prevent the app from functioning - the context continues with in-memory state.

## Requirements Satisfied

- **1.2**: Mode selection and application
- **1.3**: Mode switching preserves settings
- **2.4**: Settings validation
- **2.5**: Invalid settings use defaults

---

# HealthDataContext

The HealthDataContext manages health data state and backend communication for the HealthVis application.

## Features

- **Data Management**: Manages vital signs data with loading and error states
- **Backend Integration**: Provides functions for data analysis, file upload, and AI chat
- **Offline Support**: Caches data in AsyncStorage for offline access
- **Accessibility Integration**: Triggers TTS, haptics, and audio feedback based on backend responses
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Usage

### 1. Wrap your app with the provider

```tsx
import { HealthDataProvider } from './contexts/HealthDataContext';

export default function App() {
  return (
    <HealthDataProvider>
      {/* Your app content */}
    </HealthDataProvider>
  );
}
```

### 2. Use the hook in your components

```tsx
import { useHealthData } from './contexts/HealthDataContext';

function MyComponent() {
  const { 
    vitals, 
    isLoading, 
    error, 
    fetchData, 
    uploadFile, 
    requestAnalysis,
    requestChat 
  } = useHealthData();

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <Text>Loading health data...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <View>
      <Text>Vitals: {vitals.length}</Text>
      {vitals.map((vital, index) => (
        <Text key={index}>
          {vital.type}: {vital.value} {vital.unit}
        </Text>
      ))}
    </View>
  );
}
```

## API

### HealthDataContextValue

```typescript
interface HealthDataContextValue {
  vitals: VitalSign[];                                        // Current vital signs data
  isLoading: boolean;                                         // Loading state
  error: Error | null;                                        // Error state
  fetchData: () => Promise<void>;                             // Fetch health data
  uploadFile: (file: File | Blob, filename: string) => Promise<UploadDataResponse>;
  requestAnalysis: (data: Record<string, any>) => Promise<AnalysisResponse>;
  requestChat: (message: string, context?: any) => Promise<ChatResponse>;
  clearError: () => void;                                     // Clear error state
  refreshData: () => Promise<void>;                           // Force refresh data
}
```

### VitalSign

```typescript
interface VitalSign {
  type: 'heart_rate' | 'glucose' | 'steps' | 'sleep';
  value: number;
  timestamp: Date;
  unit: string;
  range: 'normal' | 'warning' | 'danger';
}
```

## Backend Integration

The context integrates with the FastAPI backend through three main endpoints:

### 1. Data Analysis (POST /api/analyze)

```tsx
const response = await requestAnalysis({
  heart_rate: [72, 75, 78],
  glucose: [95, 100, 105]
});
```

### 2. File Upload (POST /api/upload-data)

```tsx
const response = await uploadFile(file, 'health_data.csv');
```

### 3. AI Chat (POST /api/chat)

```tsx
const response = await requestChat('What does my heart rate data show?');
```

## Caching and Offline Support

The context implements caching for offline support:

- **Vitals Cache**: Stores vital signs data for 5 minutes
- **Analysis Cache**: Stores last analysis response
- **Automatic Loading**: Loads cached data on mount
- **Cache Expiration**: Automatically expires stale data

## Accessibility Integration

The context automatically triggers accessibility outputs based on backend responses:

- **Haptic Feedback**: Triggers appropriate intensity based on data ranges
  - Normal range → Light haptic
  - Warning range → Medium haptic
  - Danger range → Heavy haptic (double pattern)
- **Audio Feedback**: Plays success/error sounds for operations
- **Screen Reader Announcements**: Announces operation results

## Error Handling

The context handles various error scenarios:

- **Network Errors**: Displays user-friendly messages with retry options
- **Timeout Errors**: Handles request timeouts gracefully
- **Parsing Errors**: Handles invalid backend responses
- **Storage Errors**: Continues functioning even if cache fails

## Requirements Satisfied

- **10.1**: Backend API integration for data analysis
- **10.2**: Response parsing and validation
- **10.3**: AI chat functionality
- **10.4**: File upload functionality
- **10.7**: Offline support with caching
- **10.8**: Accessibility outputs triggered by backend insights
