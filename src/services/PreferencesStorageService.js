/**
 * Service for persisting user preferences to localStorage
 * Handles storage, retrieval, validation, and migration of user settings
 */

import { DEFAULT_USER_PREFERENCES, validateUserPreferences, mergeWithDefaults } from '../models/UserPreferences';

const STORAGE_KEY = 'healthvis_user_preferences';
const STORAGE_VERSION = '1.0';
const VERSION_KEY = 'healthvis_preferences_version';

export class PreferencesStorageService {
  /**
   * Save user preferences to localStorage
   * @param {Object} preferences - User preferences to save
   * @returns {Promise<boolean>} - Success status
   */
  static async savePreferences(preferences) {
    try {
      const validation = validateUserPreferences(preferences);
      if (!validation.isValid) {
        console.error('Invalid preferences:', validation.errors);
        return false;
      }

      const completePreferences = mergeWithDefaults(preferences);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completePreferences));
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }

  /**
   * Load user preferences from localStorage
   * @returns {Promise<Object>} - User preferences or defaults if none exist
   */
  static async loadPreferences() {
    try {
      const storedPreferences = localStorage.getItem(STORAGE_KEY);
      const storedVersion = localStorage.getItem(VERSION_KEY);

      if (!storedPreferences) {
        // No stored preferences, return defaults
        return { ...DEFAULT_USER_PREFERENCES };
      }

      const parsedPreferences = JSON.parse(storedPreferences);

      // Check if migration is needed
      if (storedVersion !== STORAGE_VERSION) {
        const migratedPreferences = await this.migratePreferences(parsedPreferences, storedVersion);
        const validation = validateUserPreferences(migratedPreferences);
        if (validation.isValid) {
          await this.savePreferences(migratedPreferences);
          return migratedPreferences;
        } else {
          console.warn('Migrated preferences are invalid, using defaults:', validation.errors);
          return { ...DEFAULT_USER_PREFERENCES };
        }
      }

      const validation = validateUserPreferences(parsedPreferences);
      if (!validation.isValid) {
        console.warn('Stored preferences are invalid, using defaults:', validation.errors);
        return { ...DEFAULT_USER_PREFERENCES };
      }

      return mergeWithDefaults(parsedPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return { ...DEFAULT_USER_PREFERENCES };
    }
  }

  /**
   * Clear all stored preferences
   * @returns {Promise<boolean>} - Success status
   */
  static async clearPreferences() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(VERSION_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear preferences:', error);
      return false;
    }
  }

  /**
   * Check if preferences exist in storage
   * @returns {boolean} - Whether preferences are stored
   */
  static hasStoredPreferences() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Migrate preferences from older versions
   * @param {Object} oldPreferences - Preferences in old format
   * @param {string} oldVersion - Version of old preferences
   * @returns {Promise<Object>} - Migrated preferences
   */
  static async migratePreferences(oldPreferences, oldVersion) {
    console.log(`Migrating preferences from version ${oldVersion} to ${STORAGE_VERSION}`);
    
    // For now, we only have version 1.0, so just merge with defaults
    // Future migrations would handle version-specific transformations here
    
    try {
      const migratedPreferences = mergeWithDefaults(oldPreferences);
      console.log('Preferences migration completed successfully');
      return migratedPreferences;
    } catch (error) {
      console.error('Preferences migration failed, using defaults:', error);
      return { ...DEFAULT_USER_PREFERENCES };
    }
  }

  /**
   * Update specific preference section
   * @param {string} section - Section to update ('visualSettings', 'audioSettings', etc.)
   * @param {Object} updates - Updates to apply to the section
   * @returns {Promise<boolean>} - Success status
   */
  static async updatePreferenceSection(section, updates) {
    try {
      const currentPreferences = await this.loadPreferences();
      
      if (!currentPreferences[section]) {
        console.error(`Invalid preference section: ${section}`);
        return false;
      }

      const updatedPreferences = {
        ...currentPreferences,
        [section]: {
          ...currentPreferences[section],
          ...updates
        }
      };

      return await this.savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Failed to update preference section:', error);
      return false;
    }
  }

  /**
   * Export preferences as JSON string
   * @returns {Promise<string|null>} - JSON string of preferences or null if error
   */
  static async exportPreferences() {
    try {
      const preferences = await this.loadPreferences();
      return JSON.stringify(preferences, null, 2);
    } catch (error) {
      console.error('Failed to export preferences:', error);
      return null;
    }
  }

  /**
   * Import preferences from JSON string
   * @param {string} jsonString - JSON string of preferences
   * @returns {Promise<boolean>} - Success status
   */
  static async importPreferences(jsonString) {
    try {
      const preferences = JSON.parse(jsonString);
      return await this.savePreferences(preferences);
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
}