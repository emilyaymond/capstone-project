/**
 * Accessible Settings Panel Component
 * Provides form controls for user preferences including font size, contrast, 
 * color scheme, and accessibility mode toggles
 */

import React, { useState, useEffect } from 'react';
import { PreferencesStorageService } from '../services/PreferencesStorageService';
import { DEFAULT_USER_PREFERENCES } from '../models/UserPreferences';
import '../styles/components/SettingsPanel.css';

const SettingsPanel = ({ onPreferencesChange, onClose }) => {
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const loadedPreferences = await PreferencesStorageService.loadPreferences();
      setPreferences(loadedPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    
    try {
      const success = await PreferencesStorageService.savePreferences(preferences);
      if (success) {
        setSaveStatus('Settings saved successfully');
        if (onPreferencesChange) {
          onPreferencesChange(preferences);
        }
      } else {
        setSaveStatus('Failed to save settings. Please check your inputs.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('An error occurred while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setPreferences({ ...DEFAULT_USER_PREFERENCES });
    setSaveStatus('Settings reset to defaults');
  };

  const updateVisualSettings = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      visualSettings: {
        ...prev.visualSettings,
        [key]: value
      }
    }));
  };

  const updateAudioSettings = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      audioSettings: {
        ...prev.audioSettings,
        [key]: value
      }
    }));
  };

  const updateInteractionSettings = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      interactionSettings: {
        ...prev.interactionSettings,
        [key]: value
      }
    }));
  };

  const updateAccessibilityMode = (key, value) => {
    if (key === 'primary') {
      setPreferences(prev => ({
        ...prev,
        accessibilityMode: {
          ...prev.accessibilityMode,
          primary: value
        }
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        accessibilityMode: {
          ...prev.accessibilityMode,
          features: {
            ...prev.accessibilityMode.features,
            [key]: value
          }
        }
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="settings-panel" role="dialog" aria-labelledby="settings-title">
        <div className="settings-loading" aria-live="polite">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel" role="dialog" aria-labelledby="settings-title">
      <div className="settings-header">
        <h2 id="settings-title">Accessibility Settings</h2>
        <button
          className="settings-close"
          onClick={onClose}
          aria-label="Close settings panel"
          type="button"
        >
          ×
        </button>
      </div>

      <div className="settings-content">
        {/* Visual Settings Section */}
        <fieldset className="settings-section">
          <legend>Visual Settings</legend>
          
          <div className="setting-group">
            <label htmlFor="font-size">
              Font Size: {preferences.visualSettings.fontSize}px
            </label>
            <input
              id="font-size"
              type="range"
              min="12"
              max="24"
              step="1"
              value={preferences.visualSettings.fontSize}
              onChange={(e) => updateVisualSettings('fontSize', parseInt(e.target.value))}
              aria-describedby="font-size-help"
            />
            <div id="font-size-help" className="setting-help">
              Adjust text size from 12px to 24px
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="contrast">Contrast</label>
            <select
              id="contrast"
              value={preferences.visualSettings.contrast}
              onChange={(e) => updateVisualSettings('contrast', e.target.value)}
              aria-describedby="contrast-help"
            >
              <option value="normal">Normal</option>
              <option value="high">High Contrast</option>
              <option value="custom">Custom</option>
            </select>
            <div id="contrast-help" className="setting-help">
              Choose contrast level for better visibility
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="color-scheme">Color Scheme</label>
            <select
              id="color-scheme"
              value={preferences.visualSettings.colorScheme}
              onChange={(e) => updateVisualSettings('colorScheme', e.target.value)}
              aria-describedby="color-scheme-help"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="custom">Custom</option>
            </select>
            <div id="color-scheme-help" className="setting-help">
              Select preferred color theme
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.visualSettings.reducedMotion}
                onChange={(e) => updateVisualSettings('reducedMotion', e.target.checked)}
                aria-describedby="reduced-motion-help"
              />
              Reduce Motion
            </label>
            <div id="reduced-motion-help" className="setting-help">
              Minimize animations and transitions
            </div>
          </div>
        </fieldset>

        {/* Audio Settings Section */}
        <fieldset className="settings-section">
          <legend>Audio Settings</legend>
          
          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.audioSettings.enableSonification}
                onChange={(e) => updateAudioSettings('enableSonification', e.target.checked)}
                aria-describedby="sonification-help"
              />
              Enable Data Sonification
            </label>
            <div id="sonification-help" className="setting-help">
              Convert data to audio representations
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="speech-rate">
              Speech Rate: {preferences.audioSettings.speechRate}x
            </label>
            <input
              id="speech-rate"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={preferences.audioSettings.speechRate}
              onChange={(e) => updateAudioSettings('speechRate', parseFloat(e.target.value))}
              aria-describedby="speech-rate-help"
            />
            <div id="speech-rate-help" className="setting-help">
              Adjust text-to-speech playback speed
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="audio-volume">
              Audio Volume: {Math.round(preferences.audioSettings.audioVolume * 100)}%
            </label>
            <input
              id="audio-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={preferences.audioSettings.audioVolume}
              onChange={(e) => updateAudioSettings('audioVolume', parseFloat(e.target.value))}
              aria-describedby="audio-volume-help"
            />
            <div id="audio-volume-help" className="setting-help">
              Control audio feedback volume
            </div>
          </div>
        </fieldset>

        {/* Interaction Settings Section */}
        <fieldset className="settings-section">
          <legend>Interaction Settings</legend>
          
          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.interactionSettings.keyboardShortcuts}
                onChange={(e) => updateInteractionSettings('keyboardShortcuts', e.target.checked)}
                aria-describedby="keyboard-shortcuts-help"
              />
              Enable Keyboard Shortcuts
            </label>
            <div id="keyboard-shortcuts-help" className="setting-help">
              Use keyboard shortcuts for faster navigation
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.interactionSettings.hapticFeedback}
                onChange={(e) => updateInteractionSettings('hapticFeedback', e.target.checked)}
                aria-describedby="haptic-feedback-help"
              />
              Enable Haptic Feedback
            </label>
            <div id="haptic-feedback-help" className="setting-help">
              Provide tactile responses on supported devices
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.interactionSettings.progressiveDisclosure}
                onChange={(e) => updateInteractionSettings('progressiveDisclosure', e.target.checked)}
                aria-describedby="progressive-disclosure-help"
              />
              Progressive Disclosure
            </label>
            <div id="progressive-disclosure-help" className="setting-help">
              Show information step by step to reduce complexity
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.interactionSettings.simplifiedMode}
                onChange={(e) => updateInteractionSettings('simplifiedMode', e.target.checked)}
                aria-describedby="simplified-mode-help"
              />
              Simplified Mode
            </label>
            <div id="simplified-mode-help" className="setting-help">
              Use simplified interface with reduced complexity
            </div>
          </div>
        </fieldset>

        {/* Accessibility Mode Section */}
        <fieldset className="settings-section">
          <legend>Accessibility Mode</legend>
          
          <div className="setting-group">
            <label htmlFor="primary-mode">Primary Interaction Mode</label>
            <select
              id="primary-mode"
              value={preferences.accessibilityMode.primary}
              onChange={(e) => updateAccessibilityMode('primary', e.target.value)}
              aria-describedby="primary-mode-help"
            >
              <option value="visual">Visual</option>
              <option value="audio">Audio-Focused</option>
              <option value="tactile">Tactile</option>
            </select>
            <div id="primary-mode-help" className="setting-help">
              Choose your preferred interaction method
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.accessibilityMode.features.screenReader}
                onChange={(e) => updateAccessibilityMode('screenReader', e.target.checked)}
                aria-describedby="screen-reader-help"
              />
              Screen Reader Optimized
            </label>
            <div id="screen-reader-help" className="setting-help">
              Optimize interface for screen reader users
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.accessibilityMode.features.keyboardOnly}
                onChange={(e) => updateAccessibilityMode('keyboardOnly', e.target.checked)}
                aria-describedby="keyboard-only-help"
              />
              Keyboard-Only Mode
            </label>
            <div id="keyboard-only-help" className="setting-help">
              Ensure all functionality is accessible via keyboard
            </div>
          </div>
        </fieldset>
      </div>

      <div className="settings-footer">
        <div className="settings-actions">
          <button
            type="button"
            onClick={handleReset}
            className="settings-button settings-button-secondary"
            disabled={isSaving}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="settings-button settings-button-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        {saveStatus && (
          <div 
            className={`settings-status ${saveStatus.includes('success') ? 'success' : 'error'}`}
            role="status"
            aria-live="polite"
          >
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;