/**
 * Accessibility constants for HealthVis Expo application
 */

import { AccessibilityMode, AccessibilitySettings } from '../types';

// ============================================================================
// Accessibility Modes
// ============================================================================

/**
 * Available accessibility modes
 */
export const ACCESSIBILITY_MODES: AccessibilityMode[] = [
  'visual',
  'audio',
  'hybrid',
  'simplified',
];

/**
 * Mode descriptions for screen readers
 */
export const MODE_DESCRIPTIONS: Record<AccessibilityMode, string> = {
  visual: 'Visual mode with standard interface and visual charts',
  audio: 'Audio mode with enhanced sound feedback and text-to-speech',
  hybrid: 'Hybrid mode combining visual and audio features',
  simplified: 'Simplified mode with larger touch targets and reduced complexity',
};

// ============================================================================
// Font Sizes
// ============================================================================

/**
 * Font size scale values (in points)
 */
export const FONT_SIZES = {
  small: {
    body: 14,
    heading: 18,
    title: 22,
    label: 12,
  },
  medium: {
    body: 16,
    heading: 20,
    title: 26,
    label: 14,
  },
  large: {
    body: 20,
    heading: 26,
    title: 32,
    label: 18,
  },
} as const;

// ============================================================================
// Contrast Levels
// ============================================================================

/**
 * Color contrast ratios for WCAG AAA compliance
 */
export const CONTRAST_RATIOS = {
  normal: {
    text: 4.5, // WCAG AA for normal text
    largeText: 3.0, // WCAG AA for large text
  },
  high: {
    text: 7.0, // WCAG AAA for normal text
    largeText: 4.5, // WCAG AAA for large text
  },
} as const;

/**
 * High contrast color palette (WCAG AAA compliant)
 */
export const HIGH_CONTRAST_COLORS = {
  background: '#000000',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#e0e0e0',
  primary: '#00ff00',
  secondary: '#00ccff',
  error: '#ff0000',
  warning: '#ffff00',
  success: '#00ff00',
  border: '#ffffff',
} as const;

/**
 * Normal contrast color palette
 */
export const NORMAL_CONTRAST_COLORS = {
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
  primary: '#2196f3',
  secondary: '#03a9f4',
  error: '#f44336',
  warning: '#ff9800',
  success: '#4caf50',
  border: '#e0e0e0',
} as const;

// ============================================================================
// Touch Targets
// ============================================================================

/**
 * Minimum touch target sizes (in points)
 */
export const TOUCH_TARGET_SIZES = {
  minimum: 44, // iOS Human Interface Guidelines minimum
  comfortable: 48, // Material Design recommended
  simplified: 56, // Larger for simplified mode
} as const;

// ============================================================================
// Audio Feedback
// ============================================================================

/**
 * Audio feedback durations (in milliseconds)
 */
export const AUDIO_DURATIONS = {
  click: 100,
  clickMax: 150,
  success: 300,
  error: 400,
  modeChange: 500,
  focus: 80,
  hover: 60,
} as const;

/**
 * Audio frequencies (in Hz)
 */
export const AUDIO_FREQUENCIES = {
  click: 800,
  success: { start: 400, end: 800 },
  error: { start: 600, end: 200 },
  focus: 600,
  hover: 500,
  modeChange: {
    visual: 440,
    audio: 554,
    hybrid: 659,
    simplified: 523,
  },
} as const;

// ============================================================================
// Haptic Feedback
// ============================================================================

/**
 * Haptic intensity levels
 */
export const HAPTIC_INTENSITY = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
} as const;

/**
 * Data range to haptic intensity mapping
 */
export const DATA_RANGE_HAPTICS = {
  normal: 'light',
  warning: 'medium',
  danger: 'heavy',
} as const;

// ============================================================================
// Performance Targets
// ============================================================================

/**
 * Performance timing targets (in milliseconds)
 */
export const PERFORMANCE_TARGETS = {
  interactionFeedback: 50,
  ttsStart: 200,
  chartUpdate: 300,
  settingsSave: 100,
  apiTimeout: 2000,
  announcementDelay: 50,
} as const;

// ============================================================================
// Default Settings
// ============================================================================

/**
 * Default accessibility settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  audioEnabled: true,
  hapticsEnabled: true,
};

/**
 * Default accessibility mode
 */
export const DEFAULT_ACCESSIBILITY_MODE: AccessibilityMode = 'visual';

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * AsyncStorage keys for persistence
 */
export const STORAGE_KEYS = {
  accessibilityMode: '@healthvis/accessibility_mode',
  accessibilitySettings: '@healthvis/accessibility_settings',
  userData: '@healthvis/user_data',
  cachedData: '@healthvis/cached_data',
} as const;

// ============================================================================
// Announcement Priorities
// ============================================================================

/**
 * Screen reader announcement priorities
 */
export const ANNOUNCEMENT_PRIORITY = {
  polite: 'polite',
  assertive: 'assertive',
} as const;
