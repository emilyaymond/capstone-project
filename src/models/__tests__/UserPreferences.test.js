/**
 * Tests for UserPreferences data model
 */

import { 
  DEFAULT_USER_PREFERENCES, 
  validateUserPreferences, 
  mergeWithDefaults 
} from '../UserPreferences';

describe('UserPreferences', () => {
  describe('DEFAULT_USER_PREFERENCES', () => {
    it('should have all required sections', () => {
      expect(DEFAULT_USER_PREFERENCES).toHaveProperty('visualSettings');
      expect(DEFAULT_USER_PREFERENCES).toHaveProperty('audioSettings');
      expect(DEFAULT_USER_PREFERENCES).toHaveProperty('interactionSettings');
      expect(DEFAULT_USER_PREFERENCES).toHaveProperty('accessibilityMode');
    });

    it('should have valid default values', () => {
      const { visualSettings, audioSettings, interactionSettings, accessibilityMode } = DEFAULT_USER_PREFERENCES;
      
      // Visual settings
      expect(visualSettings.fontSize).toBe(16);
      expect(visualSettings.contrast).toBe('normal');
      expect(visualSettings.colorScheme).toBe('light');
      expect(visualSettings.reducedMotion).toBe(false);
      
      // Audio settings
      expect(audioSettings.enableSonification).toBe(true);
      expect(audioSettings.speechRate).toBe(1.0);
      expect(audioSettings.audioVolume).toBe(0.7);
      expect(audioSettings.preferredVoice).toBe(null);
      
      // Interaction settings
      expect(interactionSettings.keyboardShortcuts).toBe(true);
      expect(interactionSettings.hapticFeedback).toBe(false);
      expect(interactionSettings.progressiveDisclosure).toBe(true);
      expect(interactionSettings.simplifiedMode).toBe(false);
      
      // Accessibility mode
      expect(accessibilityMode.primary).toBe('visual');
      expect(accessibilityMode.features.screenReader).toBe(false);
    });
  });

  describe('validateUserPreferences', () => {
    it('should validate correct preferences', () => {
      const result = validateUserPreferences(DEFAULT_USER_PREFERENCES);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined preferences', () => {
      expect(validateUserPreferences(null).isValid).toBe(false);
      expect(validateUserPreferences(undefined).isValid).toBe(false);
      expect(validateUserPreferences('string').isValid).toBe(false);
    });

    it('should validate font size range', () => {
      const invalidSmall = {
        visualSettings: { fontSize: 10 }
      };
      const invalidLarge = {
        visualSettings: { fontSize: 30 }
      };
      const valid = {
        visualSettings: { fontSize: 18 }
      };

      expect(validateUserPreferences(invalidSmall).isValid).toBe(false);
      expect(validateUserPreferences(invalidLarge).isValid).toBe(false);
      expect(validateUserPreferences(valid).isValid).toBe(true);
    });

    it('should validate contrast values', () => {
      const invalid = {
        visualSettings: { contrast: 'invalid' }
      };
      const valid = {
        visualSettings: { contrast: 'high' }
      };

      expect(validateUserPreferences(invalid).isValid).toBe(false);
      expect(validateUserPreferences(valid).isValid).toBe(true);
    });

    it('should validate speech rate range', () => {
      const invalidSlow = {
        audioSettings: { speechRate: 0.3 }
      };
      const invalidFast = {
        audioSettings: { speechRate: 3.0 }
      };
      const valid = {
        audioSettings: { speechRate: 1.5 }
      };

      expect(validateUserPreferences(invalidSlow).isValid).toBe(false);
      expect(validateUserPreferences(invalidFast).isValid).toBe(false);
      expect(validateUserPreferences(valid).isValid).toBe(true);
    });

    it('should validate audio volume range', () => {
      const invalidLow = {
        audioSettings: { audioVolume: -0.1 }
      };
      const invalidHigh = {
        audioSettings: { audioVolume: 1.5 }
      };
      const valid = {
        audioSettings: { audioVolume: 0.8 }
      };

      expect(validateUserPreferences(invalidLow).isValid).toBe(false);
      expect(validateUserPreferences(invalidHigh).isValid).toBe(false);
      expect(validateUserPreferences(valid).isValid).toBe(true);
    });

    it('should validate accessibility mode primary value', () => {
      const invalid = {
        accessibilityMode: { primary: 'invalid' }
      };
      const valid = {
        accessibilityMode: { primary: 'audio' }
      };

      expect(validateUserPreferences(invalid).isValid).toBe(false);
      expect(validateUserPreferences(valid).isValid).toBe(true);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should return defaults when given null or undefined', () => {
      expect(mergeWithDefaults(null)).toEqual(DEFAULT_USER_PREFERENCES);
      expect(mergeWithDefaults(undefined)).toEqual(DEFAULT_USER_PREFERENCES);
    });

    it('should merge partial preferences with defaults', () => {
      const partial = {
        visualSettings: {
          fontSize: 20
        },
        audioSettings: {
          speechRate: 1.5
        }
      };

      const result = mergeWithDefaults(partial);
      
      expect(result.visualSettings.fontSize).toBe(20);
      expect(result.visualSettings.contrast).toBe('normal'); // from defaults
      expect(result.audioSettings.speechRate).toBe(1.5);
      expect(result.audioSettings.audioVolume).toBe(0.7); // from defaults
      expect(result.interactionSettings).toEqual(DEFAULT_USER_PREFERENCES.interactionSettings);
    });

    it('should handle nested accessibility mode features', () => {
      const partial = {
        accessibilityMode: {
          primary: 'audio',
          features: {
            screenReader: true,
            sonification: true
          }
        }
      };

      const result = mergeWithDefaults(partial);
      
      expect(result.accessibilityMode.primary).toBe('audio');
      expect(result.accessibilityMode.features.screenReader).toBe(true);
      expect(result.accessibilityMode.features.sonification).toBe(true);
      expect(result.accessibilityMode.features.hapticFeedback).toBe(false); // from defaults
    });

    it('should preserve all user preferences when complete', () => {
      const complete = {
        ...DEFAULT_USER_PREFERENCES,
        visualSettings: {
          ...DEFAULT_USER_PREFERENCES.visualSettings,
          fontSize: 22
        }
      };

      const result = mergeWithDefaults(complete);
      expect(result.visualSettings.fontSize).toBe(22);
      expect(result).toEqual(complete);
    });
  });
});