import { useCallback, useEffect } from 'react';
import { useKeyboard } from '../hooks/useKeyboard';
import { useAccessibility } from '../context/AccessibilityContext';
import { useModeSpecificBehavior } from '../hooks/useModeSpecificBehavior';
import { useScreenReaderAnnouncements } from './ScreenReaderAnnouncements';
import './Settings.css';

const Settings = ({ settings, onSettingsChange }) => {
  const { announceToScreenReader } = useKeyboard();
  const { mode } = useAccessibility();
  const { getInteractionProps, getModeSpecificClasses, getSimplifiedProps } = useModeSpecificBehavior();
  const { announceSettingsChange, announceSuccess } = useScreenReaderAnnouncements();

  // Handle font size change with immediate feedback
  const handleFontSizeChange = useCallback((fontSize) => {
    const newSettings = { ...settings, fontSize };
    onSettingsChange(newSettings);
    
    const sizeDescriptions = {
      'small': 'Compact text for more content on screen',
      'medium': 'Standard readable text size',
      'large': 'Larger text for improved readability'
    };
    
    announceSettingsChange('Font size', fontSize, sizeDescriptions[fontSize]);
  }, [settings, onSettingsChange, announceSettingsChange]);

  // Handle contrast change with immediate feedback
  const handleContrastChange = useCallback((contrast) => {
    const newSettings = { ...settings, contrast };
    onSettingsChange(newSettings);
    
    const contrastDescriptions = {
      'normal': 'Standard color scheme with balanced contrast',
      'high': 'Enhanced contrast for better visibility and reduced eye strain'
    };
    
    announceSettingsChange('Contrast', contrast, contrastDescriptions[contrast]);
  }, [settings, onSettingsChange, announceSettingsChange]);

  // Handle audio toggle with immediate feedback
  const handleAudioToggle = useCallback(() => {
    const newAudioEnabled = !settings.audioEnabled;
    const newSettings = { ...settings, audioEnabled: newAudioEnabled };
    onSettingsChange(newSettings);
    
    const status = newAudioEnabled ? 'enabled' : 'disabled';
    const impact = newAudioEnabled ? 
      'Sound cues will now play for button clicks, mode changes, and other interactions' :
      'Sound cues are now turned off, visual feedback will continue to work';
    
    announceSettingsChange('Audio feedback', status, impact);
  }, [settings, onSettingsChange, announceSettingsChange]);

  // Announce settings page load with helpful guidance
  useEffect(() => {
    announceToScreenReader(
      'Accessibility settings page loaded. Use tab to navigate between controls. Changes are applied immediately and saved automatically.',
      'polite'
    );
    
    // Provide additional context after a brief delay
    setTimeout(() => {
      announceSuccess('Settings ready', 'All accessibility options are available for customization');
    }, 1500);
  }, [announceToScreenReader, announceSuccess]);

  // Check if audio controls should be shown (for audio and hybrid modes)
  const showAudioControls = mode === 'audio' || mode === 'hybrid';

  return (
    <div className={getModeSpecificClasses("settings")} role="main" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Accessibility Settings</h2>
      <p className="settings-description">
        Customize the interface to match your accessibility needs. Changes are applied immediately.
      </p>
      
      <div className="settings-section">
        <fieldset role="radiogroup" aria-labelledby="font-size-legend">
          <legend id="font-size-legend">Font Size</legend>
          <p className="setting-help">Choose the text size that works best for you.</p>
          <div className="radio-group">
            {[
              { value: 'small', label: 'Small', description: 'Compact text for more content' },
              { value: 'medium', label: 'Medium', description: 'Standard readable text size' },
              { value: 'large', label: 'Large', description: 'Larger text for better readability' }
            ].map((size) => (
              <label key={size.value} className={getModeSpecificClasses("radio-option")}>
                <input
                  type="radio"
                  name="fontSize"
                  value={size.value}
                  checked={settings.fontSize === size.value}
                  onChange={() => handleFontSizeChange(size.value)}
                  aria-describedby={`font-${size.value}-desc`}
                  {...getInteractionProps('radio')}
                  {...(mode === 'simplified' ? getSimplifiedProps() : {})}
                />
                <span className="option-label">{size.label}</span>
                <span id={`font-${size.value}-desc`} className="option-description">
                  {size.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="settings-section">
        <fieldset role="radiogroup" aria-labelledby="contrast-legend">
          <legend id="contrast-legend">Contrast</legend>
          <p className="setting-help">Adjust color contrast for better visibility.</p>
          <div className="radio-group">
            {[
              { value: 'normal', label: 'Normal Contrast', description: 'Standard color scheme' },
              { value: 'high', label: 'High Contrast', description: 'Enhanced contrast for better visibility' }
            ].map((contrast) => (
              <label key={contrast.value} className={getModeSpecificClasses("radio-option")}>
                <input
                  type="radio"
                  name="contrast"
                  value={contrast.value}
                  checked={settings.contrast === contrast.value}
                  onChange={() => handleContrastChange(contrast.value)}
                  aria-describedby={`contrast-${contrast.value}-desc`}
                  {...getInteractionProps('radio')}
                  {...(mode === 'simplified' ? getSimplifiedProps() : {})}
                />
                <span className="option-label">{contrast.label}</span>
                <span id={`contrast-${contrast.value}-desc`} className="option-description">
                  {contrast.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {showAudioControls && (
        <div className="settings-section audio-section">
          <fieldset>
            <legend>Audio Features</legend>
            <p className="setting-help">
              Audio feedback provides sound cues for interactions in {mode} mode.
            </p>
            <label className={getModeSpecificClasses("checkbox-option")}>
              <input
                type="checkbox"
                checked={settings.audioEnabled}
                onChange={handleAudioToggle}
                aria-describedby="audio-feedback-desc"
                {...getInteractionProps('checkbox')}
                {...(mode === 'simplified' ? getSimplifiedProps() : {})}
              />
              <span className="option-label">Enable Audio Feedback</span>
              <span id="audio-feedback-desc" className="option-description">
                Play sounds for button clicks, mode changes, and other interactions
              </span>
            </label>
          </fieldset>
        </div>
      )}

      {!showAudioControls && (
        <div className="settings-section">
          <div className="info-message">
            <p>
              <strong>Audio Features:</strong> Switch to Audio or Hybrid mode to access audio feedback settings.
            </p>
          </div>
        </div>
      )}

      {/* Current settings summary for screen readers */}
      <div className="sr-only" aria-live="polite">
        Current settings: {settings.fontSize} font size, {settings.contrast} contrast
        {showAudioControls && `, audio feedback ${settings.audioEnabled ? 'enabled' : 'disabled'}`}
      </div>

      {/* Settings status */}
      <div className="settings-status" role="status" aria-live="polite">
        Settings are automatically saved and applied immediately.
      </div>
    </div>
  );
};

export default Settings;