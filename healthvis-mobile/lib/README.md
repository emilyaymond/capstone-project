# Utility Libraries

This directory contains utility functions and helpers used throughout the HealthVis application.

## api-client.ts

Backend API client that provides functions to communicate with the FastAPI backend for health data analysis, AI chat, and file uploads.

### Core Functions

#### `analyzeData(data: Record<string, any>): Promise<AnalysisResponse>`
Sends health data to the backend for AI-powered analysis.

**Parameters:**
- `data`: Health data object to analyze

**Returns:** Analysis results with insights and chart suggestions

**Throws:** `APIError` if the request fails

**Example:**
```typescript
import { analyzeData } from '@/lib/api-client';

const result = await analyzeData({
  heart_rate: [72, 75, 68, 80],
  timestamps: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']
});

console.log(result.analysis.analysis); // AI insights
console.log(result.chart_suggestions); // Visualization recommendations
```

#### `chatWithAI(message: string, data?: Record<string, any>, context?: string): Promise<ChatResponse>`
Sends a message to the AI assistant, optionally with health data context.

**Parameters:**
- `message`: User's message or question
- `data`: Optional health data context
- `context`: Optional additional context

**Returns:** AI response with suggestions and analysis

**Throws:** `APIError` if the request fails

**Example:**
```typescript
import { chatWithAI } from '@/lib/api-client';

const response = await chatWithAI(
  'What does my heart rate data suggest?',
  { heart_rate: [72, 75, 68, 80] }
);

console.log(response.response); // AI's answer
```

#### `uploadFile(file: File | Blob, filename: string): Promise<UploadDataResponse>`
Uploads a CSV or JSON file containing health data for analysis.

**Parameters:**
- `file`: File or Blob to upload
- `filename`: Name of the file (must end with .csv or .json)

**Returns:** Upload results with analysis and data preview

**Throws:** `APIError` if the request fails

**Example:**
```typescript
import { uploadFile } from '@/lib/api-client';

const file = new File([csvContent], 'health-data.csv', { type: 'text/csv' });
const result = await uploadFile(file, 'health-data.csv');

console.log(result.filename); // 'health-data.csv'
console.log(result.data_preview); // First 5 rows
console.log(result.analysis); // AI analysis
```

#### `checkBackendHealth(): Promise<boolean>`
Performs a health check to verify backend connectivity.

**Returns:** `true` if backend is healthy, `false` otherwise

**Example:**
```typescript
import { checkBackendHealth } from '@/lib/api-client';

const isHealthy = await checkBackendHealth();
if (!isHealthy) {
  console.log('Backend is unavailable');
}
```

### Error Handling

The API client includes comprehensive error handling:

#### `APIError` Class
Custom error class with additional context:

**Properties:**
- `message`: Error description
- `statusCode`: HTTP status code (if applicable)
- `isNetworkError`: Whether the error is a network connectivity issue
- `isTimeout`: Whether the error is due to request timeout

**Example:**
```typescript
import { analyzeData, APIError } from '@/lib/api-client';

try {
  const result = await analyzeData(healthData);
} catch (error) {
  if (error instanceof APIError) {
    if (error.isTimeout) {
      console.log('Request timed out');
    } else if (error.isNetworkError) {
      console.log('Network error - check connection');
    } else if (error.statusCode === 400) {
      console.log('Invalid data format');
    }
  }
}
```

### Features

#### Timeout Handling
All requests have a 2-second timeout (configurable via `REQUEST_TIMEOUT` constant). Requests that exceed this timeout will throw an `APIError` with `isTimeout: true`.

#### Retry Logic
Failed requests are automatically retried up to 2 times with exponential backoff:
- First retry: 1 second delay
- Second retry: 2 seconds delay
- Maximum delay: 5 seconds

Client errors (4xx status codes) are not retried.

#### Response Validation
All responses are validated and parsed as JSON. Invalid responses throw an `APIError`.

### Configuration

The API base URL can be configured via environment variable:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Default: `http://localhost:8000`

### Requirements

Validates requirements:
- **10.1**: Backend API calls use correct endpoints
- **10.2**: Backend response parsing succeeds
- **10.3**: AI chat functionality
- **10.4**: File upload functionality
- **10.6**: Error handling with retry logic

### Best Practices

1. Always wrap API calls in try-catch blocks
2. Check for specific error types (timeout, network, etc.)
3. Provide user feedback for errors
4. Use the health check before making requests if connectivity is uncertain
5. Handle offline scenarios gracefully

## announcer.ts

Screen reader announcement system that provides accessibility announcements to users with assistive technologies.

### Core Functions

#### `announce(message: string, options?: AnnounceOptions)`
Core announcement function that sends messages to screen readers.

**Options:**
- `priority`: 'polite' (default) or 'assertive'
  - **polite**: Announcement waits for current speech to finish
  - **assertive**: Announcement interrupts current speech
- `queue`: Whether to queue the announcement (default: false)

**Example:**
```typescript
import { announce } from '@/lib/announcer';

announce('Data loaded successfully', { priority: 'polite' });
announce('Critical error occurred', { priority: 'assertive' });
```

### Helper Functions

#### `announceSuccess(message: string)`
Announces a success message with assertive priority. Automatically prefixes with "Success:".

**Example:**
```typescript
announceSuccess('Settings saved successfully');
// Announces: "Success: Settings saved successfully"
```

#### `announceError(message: string)`
Announces an error message with assertive priority. Automatically prefixes with "Error:".

**Example:**
```typescript
announceError('Failed to load data');
// Announces: "Error: Failed to load data"
```

#### `announceNavigation(screenName: string, description?: string)`
Announces navigation to a new screen with polite priority.

**Example:**
```typescript
announceNavigation('Settings', 'Configure your accessibility preferences');
// Announces: "Navigated to Settings. Configure your accessibility preferences"
```

#### `announceModeChange(mode: AccessibilityMode)`
Announces an accessibility mode change with assertive priority. Includes a description of the mode.

**Example:**
```typescript
announceModeChange('audio');
// Announces: "Audio mode activated. Enhanced audio feedback and text-to-speech for all interactions."
```

#### `announceSettingsChange(settingName: string, newValue: string | boolean | number)`
Announces a settings change with polite priority.

**Example:**
```typescript
announceSettingsChange('font size', 'large');
// Announces: "font size changed to large"

announceSettingsChange('audio enabled', true);
// Announces: "audio enabled changed to enabled"
```

#### `announceLoading(message?: string)`
Announces loading state with polite priority.

**Example:**
```typescript
announceLoading('Loading health data');
// Announces: "Loading health data"
```

#### `announceDataUpdate(message: string)`
Announces data update with polite priority. Automatically prefixes with "Data updated:".

**Example:**
```typescript
announceDataUpdate('Heart rate data refreshed');
// Announces: "Data updated: Heart rate data refreshed"
```

### Platform Support

- **iOS**: Uses `AccessibilityInfo.announceForAccessibility` with VoiceOver support
- **Android**: Uses `AccessibilityInfo.announceForAccessibility` with TalkBack support
- **Web**: Dispatches custom events that can be handled by ARIA live regions

### Testing

To test screen reader announcements:

1. **iOS**: Enable VoiceOver (Settings → Accessibility → VoiceOver)
2. **Android**: Enable TalkBack (Settings → Accessibility → TalkBack)
3. **Web**: Use browser screen readers (NVDA, JAWS, or browser built-in)

### Integration

The announcer is automatically integrated with:
- **AccessibilityContext**: Announces mode and settings changes
- **Error boundaries**: Can be used to announce errors
- **Navigation**: Can be used to announce screen transitions
- **Data loading**: Can be used to announce loading states

### Requirements

Validates requirements:
- **8.3**: Important events trigger announcements
- **8.5**: Navigation announces destination screen name

### Best Practices

1. Use **polite** priority for informational messages that don't require immediate attention
2. Use **assertive** priority for errors, warnings, and critical information
3. Keep messages concise and clear
4. Avoid announcing too frequently (can overwhelm users)
5. Test with actual screen readers to ensure announcements are helpful
