/**
 * User preferences data model and default settings
 * Supports visual, audio, and interaction customization for accessibility
 */

export const DEFAULT_USER_PREFERENCES = {
  visualSettings: {
    fontSize: 16, // 12-24px range
    contrast: 'normal', // 'normal' | 'high' | 'custom'
    colorScheme: 'light', // 'light' | 'dark' | 'custom'
    reducedMotion: false
  },
  audioSettings: {
    enableSonification: true,
    speechRate: 1.0, // 0.5-2.0 range
    audioVolume: 0.7, // 0.0-1.0 range
    preferredVoice: null // Will be set to available voice
  },
  interactionSettings: {
    keyboardShortcuts: true,
    hapticFeedback: false,
    progressiveDisclosure: true,
    simplifiedMode: false
  },
  accessibilityMode: {
    primary: 'visual', // 'visual' | 'audio' | 'tactile'
    features: {
      screenReader: false,
      sonification: false,
      hapticFeedback: false,
      keyboardOnly: false,
      simplifiedUI: false
    }
  }
};

/**
 * Validates user preferences object structure and values
 * @param {Object} preferences - User preferences to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateUserPreferences = (preferences) => {
  const errors = [];

  if (!preferences || typeof preferences !== 'object') {
    return { isValid: false, errors: ['Preferences must be an object'] };
  }

  // Validate visual settings
  if (preferences.visualSettings) {
    const { fontSize, contrast, colorScheme } = preferences.visualSettings;
    
    if (fontSize && (fontSize < 12 || fontSize > 24)) {
      errors.push('Font size must be between 12 and 24 pixels');
    }
    
    if (contrast && !['normal', 'high', 'custom'].includes(contrast)) {
      errors.push('Contrast must be normal, high, or custom');
    }
    
    if (colorScheme && !['light', 'dark', 'custom'].includes(colorScheme)) {
      errors.push('Color scheme must be light, dark, or custom');
    }
  }

  // Validate audio settings
  if (preferences.audioSettings) {
    const { speechRate, audioVolume } = preferences.audioSettings;
    
    if (speechRate && (speechRate < 0.5 || speechRate > 2.0)) {
      errors.push('Speech rate must be between 0.5 and 2.0');
    }
    
    if (audioVolume && (audioVolume < 0.0 || audioVolume > 1.0)) {
      errors.push('Audio volume must be between 0.0 and 1.0');
    }
  }

  // Validate accessibility mode
  if (preferences.accessibilityMode) {
    const { primary } = preferences.accessibilityMode;
    
    if (primary && !['visual', 'audio', 'tactile'].includes(primary)) {
      errors.push('Primary accessibility mode must be visual, audio, or tactile');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Merges user preferences with defaults, ensuring all required fields exist
 * @param {Object} userPrefs - User-provided preferences
 * @returns {Object} - Complete preferences object with defaults filled in
 */
export const mergeWithDefaults = (userPrefs) => {
  if (!userPrefs) return { ...DEFAULT_USER_PREFERENCES };

  return {
    visualSettings: {
      ...DEFAULT_USER_PREFERENCES.visualSettings,
      ...userPrefs.visualSettings
    },
    audioSettings: {
      ...DEFAULT_USER_PREFERENCES.audioSettings,
      ...userPrefs.audioSettings
    },
    interactionSettings: {
      ...DEFAULT_USER_PREFERENCES.interactionSettings,
      ...userPrefs.interactionSettings
    },
    accessibilityMode: {
      ...DEFAULT_USER_PREFERENCES.accessibilityMode,
      ...userPrefs.accessibilityMode,
      features: {
        ...DEFAULT_USER_PREFERENCES.accessibilityMode.features,
        ...userPrefs.accessibilityMode?.features
      }
    }
  };
};