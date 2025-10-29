/**
 * Tests for PreferencesStorageService
 */

import { PreferencesStorageService } from '../PreferencesStorageService';
import { DEFAULT_USER_PREFERENCES } from '../../models/UserPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PreferencesStorageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset the mock store completely
    localStorageMock.getItem.mockImplementation((key) => null);
  });

  describe('savePreferences', () => {
    it('should save valid preferences to localStorage', async () => {
      const preferences = {
        visualSettings: {
          fontSize: 18,
          contrast: 'high'
        }
      };

      const result = await PreferencesStorageService.savePreferences(preferences);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'healthvis_user_preferences',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'healthvis_preferences_version',
        '1.0'
      );
    });

    it('should reject invalid preferences', async () => {
      const invalidPreferences = {
        visualSettings: {
          fontSize: 50 // Invalid: outside 12-24 range
        }
      };

      const result = await PreferencesStorageService.savePreferences(invalidPreferences);
      
      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = await PreferencesStorageService.savePreferences(DEFAULT_USER_PREFERENCES);
      
      expect(result).toBe(false);
    });
  });

  describe('loadPreferences', () => {
    it('should return defaults when no preferences are stored', async () => {
      const result = await PreferencesStorageService.loadPreferences();
      
      expect(result).toEqual(DEFAULT_USER_PREFERENCES);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('healthvis_user_preferences');
    });

    it('should load and validate stored preferences', async () => {
      const storedPreferences = {
        visualSettings: {
          fontSize: 20,
          contrast: 'high'
        }
      };

      // Mock the getItem to return our test data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return JSON.stringify(storedPreferences);
        }
        if (key === 'healthvis_preferences_version') {
          return '1.0';
        }
        return null;
      });

      const result = await PreferencesStorageService.loadPreferences();
      
      expect(result.visualSettings.fontSize).toBe(20);
      expect(result.visualSettings.contrast).toBe('high');
      // Should merge with defaults
      expect(result.audioSettings).toEqual(DEFAULT_USER_PREFERENCES.audioSettings);
    });

    it('should return defaults for invalid stored preferences', async () => {
      const invalidPreferences = {
        visualSettings: {
          fontSize: 100 // Invalid
        }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return JSON.stringify(invalidPreferences);
        }
        return null;
      });

      const result = await PreferencesStorageService.loadPreferences();
      
      expect(result).toEqual(DEFAULT_USER_PREFERENCES);
    });

    it('should handle JSON parsing errors', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return 'invalid json';
        }
        return null;
      });

      const result = await PreferencesStorageService.loadPreferences();
      
      expect(result).toEqual(DEFAULT_USER_PREFERENCES);
    });

    it('should trigger migration for old version preferences', async () => {
      const oldPreferences = {
        visualSettings: {
          fontSize: 18
        }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return JSON.stringify(oldPreferences);
        }
        if (key === 'healthvis_preferences_version') {
          return '0.9';
        }
        return null;
      });

      const result = await PreferencesStorageService.loadPreferences();
      
      // Should have migrated and saved new version
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'healthvis_preferences_version',
        '1.0'
      );
      expect(result.visualSettings.fontSize).toBe(18);
    });
  });

  describe('clearPreferences', () => {
    it('should remove preferences from localStorage', async () => {
      localStorageMock.setItem('healthvis_user_preferences', 'test');
      localStorageMock.setItem('healthvis_preferences_version', '1.0');

      const result = await PreferencesStorageService.clearPreferences();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('healthvis_user_preferences');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('healthvis_preferences_version');
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await PreferencesStorageService.clearPreferences();
      
      expect(result).toBe(false);
    });
  });

  describe('hasStoredPreferences', () => {
    it('should return true when preferences exist', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return 'test';
        }
        return null;
      });
      
      expect(PreferencesStorageService.hasStoredPreferences()).toBe(true);
    });

    it('should return false when no preferences exist', () => {
      localStorageMock.getItem.mockImplementation(() => null);
      
      expect(PreferencesStorageService.hasStoredPreferences()).toBe(false);
    });
  });

  describe('updatePreferenceSection', () => {
    it('should update specific preference section', async () => {
      // Mock existing preferences
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return JSON.stringify(DEFAULT_USER_PREFERENCES);
        }
        if (key === 'healthvis_preferences_version') {
          return '1.0';
        }
        return null;
      });

      const updates = {
        fontSize: 22,
        contrast: 'high'
      };

      const result = await PreferencesStorageService.updatePreferenceSection('visualSettings', updates);
      
      expect(result).toBe(true);
      
      // Verify the save was called with updated preferences
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'healthvis_user_preferences',
        expect.stringContaining('"fontSize":22')
      );
    });

    it('should reject invalid section names', async () => {
      const result = await PreferencesStorageService.updatePreferenceSection('invalidSection', {});
      
      expect(result).toBe(false);
    });
  });

  describe('exportPreferences', () => {
    it('should export preferences as JSON string', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'healthvis_user_preferences') {
          return JSON.stringify(DEFAULT_USER_PREFERENCES);
        }
        if (key === 'healthvis_preferences_version') {
          return '1.0';
        }
        return null;
      });
      
      const exported = await PreferencesStorageService.exportPreferences();
      
      expect(exported).toBeTruthy();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual(DEFAULT_USER_PREFERENCES);
    });
  });

  describe('importPreferences', () => {
    it('should import preferences from JSON string', async () => {
      const preferences = {
        visualSettings: {
          fontSize: 20,
          contrast: 'high'
        }
      };
      
      const jsonString = JSON.stringify(preferences);
      const result = await PreferencesStorageService.importPreferences(jsonString);
      
      expect(result).toBe(true);
      
      // Verify the save was called with imported preferences
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'healthvis_user_preferences',
        expect.stringContaining('"fontSize":20')
      );
    });

    it('should reject invalid JSON', async () => {
      const result = await PreferencesStorageService.importPreferences('invalid json');
      
      expect(result).toBe(false);
    });
  });

  describe('migratePreferences', () => {
    it('should migrate preferences from older versions', async () => {
      const oldPreferences = {
        visualSettings: {
          fontSize: 18
        }
      };

      const migrated = await PreferencesStorageService.migratePreferences(oldPreferences, '0.9');
      
      expect(migrated.visualSettings.fontSize).toBe(18);
      // Should have all default sections
      expect(migrated.audioSettings).toEqual(DEFAULT_USER_PREFERENCES.audioSettings);
      expect(migrated.interactionSettings).toEqual(DEFAULT_USER_PREFERENCES.interactionSettings);
    });

    it('should handle migration errors gracefully', async () => {
      // Pass invalid data that would cause merge to fail
      const invalidOldPreferences = null;

      const migrated = await PreferencesStorageService.migratePreferences(invalidOldPreferences, '0.9');
      
      expect(migrated).toEqual(DEFAULT_USER_PREFERENCES);
    });
  });
});