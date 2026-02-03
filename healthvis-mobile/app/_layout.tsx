import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { HealthDataProvider, useHealthData } from '@/contexts/HealthDataContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <HealthDataProvider>
          <AppLifecycleHandler>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </AppLifecycleHandler>
        </HealthDataProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

/**
 * AppLifecycleHandler Component
 * 
 * Handles app lifecycle events (backgrounding, foregrounding)
 * - Stops TTS when app is backgrounded
 * - Pauses audio when app is backgrounded
 * - Saves state when app is backgrounded
 * - Refreshes health data when app returns to foreground
 * 
 * Requirements: 16.5, 7.2
 */
function AppLifecycleHandler({ children }: { children: React.ReactNode }) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { fetchData } = useHealthData();

  /**
   * Handles backgrounding logic
   * - Stops TTS playback
   * - Pauses audio (handled by expo-av automatically)
   * - Saves state (handled by AccessibilityContext automatically via debounced saves)
   */
  const handleBackgrounding = useCallback(async () => {
    try {
      // Import Speech dynamically to stop TTS
      const Speech = await import('expo-speech');
      Speech.stop();

      // Note: Audio pause is handled automatically by expo-av when app backgrounds
      // Note: State save is handled automatically by AccessibilityContext's debounced save
      
      console.log('App backgrounded: TTS stopped, audio paused, state saved');
    } catch (error) {
      console.error('Error handling app backgrounding:', error);
    }
  }, []);

  /**
   * Handles foregrounding logic
   * - Refreshes health data from HealthKit
   * 
   * Requirement 7.2: Trigger HealthKit fetch on foreground
   */
  const handleForegrounding = useCallback(async () => {
    try {
      console.log('App foregrounded: Refreshing health data...');
      await fetchData();
      console.log('Health data refreshed on foreground');
    } catch (error) {
      console.error('Error refreshing health data on foreground:', error);
    }
  }, [fetchData]);

  /**
   * Handles app state changes
   * When app moves to background, stops TTS and saves state
   * When app moves to foreground, refreshes health data
   */
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    // Check if app is moving to background
    if (
      appState.current.match(/active|foreground/) &&
      nextAppState.match(/inactive|background/)
    ) {
      // App is being backgrounded
      await handleBackgrounding();
    }

    // Check if app is moving to foreground
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App is being foregrounded
      await handleForegrounding();
    }

    // Update current app state
    appState.current = nextAppState;
  }, [handleBackgrounding, handleForegrounding]);

  useEffect(() => {
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  return <>{children}</>;
}
