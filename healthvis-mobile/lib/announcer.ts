import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Priority levels for screen reader announcements
 * - polite: Announcement waits for current speech to finish
 * - assertive: Announcement interrupts current speech
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Options for announcements
 */
export interface AnnounceOptions {
  priority?: AnnouncementPriority;
  queue?: boolean;
}

/**
 * Core announcement function that sends messages to screen readers
 * Uses AccessibilityInfo.announceForAccessibility from react-native
 * 
 * @param message - The message to announce
 * @param options - Announcement options (priority, queue)
 */
export const announce = (
  message: string,
  options: AnnounceOptions = {}
): void => {
  const { priority = 'polite', queue = false } = options;

  if (!message || message.trim().length === 0) {
    console.warn('[Announcer] Attempted to announce empty message');
    return;
  }

  try {
    // On iOS, AccessibilityInfo.announceForAccessibility supports priority
    // On Android, it always interrupts (assertive behavior)
    // On Web, we need to use ARIA live regions (handled by components)
    
    if (Platform.OS === 'web') {
      // For web, we'll dispatch a custom event that components can listen to
      // This allows proper ARIA live region integration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('accessibility-announcement', {
            detail: { message, priority, queue },
          })
        );
      }
    } else {
      // For iOS and Android, use the native API
      AccessibilityInfo.announceForAccessibility(message);
    }
  } catch (error) {
    console.error('[Announcer] Failed to announce message:', error);
  }
};

/**
 * Announces a success message with assertive priority
 * Used for successful operations like saving settings, completing actions
 * 
 * @param message - Success message to announce
 */
export const announceSuccess = (message: string): void => {
  announce(`Success: ${message}`, { priority: 'assertive' });
};

/**
 * Announces an error message with assertive priority
 * Used for errors, failures, and validation issues
 * 
 * @param message - Error message to announce
 */
export const announceError = (message: string): void => {
  announce(`Error: ${message}`, { priority: 'assertive' });
};

/**
 * Announces navigation to a new screen with polite priority
 * Used when user navigates to a different screen or section
 * 
 * @param screenName - Name of the destination screen
 * @param description - Optional description of the screen content
 */
export const announceNavigation = (
  screenName: string,
  description?: string
): void => {
  const message = description
    ? `Navigated to ${screenName}. ${description}`
    : `Navigated to ${screenName}`;
  
  announce(message, { priority: 'polite' });
};

/**
 * Announces an accessibility mode change with assertive priority
 * Used when user switches between Visual, Audio, Hybrid, or Simplified modes
 * 
 * @param mode - The new accessibility mode
 */
export const announceModeChange = (
  mode: 'visual' | 'audio' | 'hybrid' | 'simplified'
): void => {
  const modeDescriptions = {
    visual: 'Visual mode activated. Standard visual interface with optional audio feedback.',
    audio: 'Audio mode activated. Enhanced audio feedback and text-to-speech for all interactions.',
    hybrid: 'Hybrid mode activated. Combination of visual and audio features for maximum accessibility.',
    simplified: 'Simplified mode activated. Larger touch targets and simplified interface for easier interaction.',
  };

  const description = modeDescriptions[mode];
  announce(description, { priority: 'assertive' });
};

/**
 * Announces a settings change with polite priority
 * Used when user modifies accessibility settings
 * 
 * @param settingName - Name of the setting that changed
 * @param newValue - New value of the setting
 */
export const announceSettingsChange = (
  settingName: string,
  newValue: string | boolean | number
): void => {
  let valueDescription: string;

  if (typeof newValue === 'boolean') {
    valueDescription = newValue ? 'enabled' : 'disabled';
  } else {
    valueDescription = String(newValue);
  }

  const message = `${settingName} changed to ${valueDescription}`;
  announce(message, { priority: 'polite' });
};

/**
 * Announces loading state with polite priority
 * Used when data is being fetched or processed
 * 
 * @param message - Optional custom loading message
 */
export const announceLoading = (message: string = 'Loading'): void => {
  announce(message, { priority: 'polite' });
};

/**
 * Announces data update with polite priority
 * Used when health data or other content is updated
 * 
 * @param message - Description of what was updated
 */
export const announceDataUpdate = (message: string): void => {
  announce(`Data updated: ${message}`, { priority: 'polite' });
};
