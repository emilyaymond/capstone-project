import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useKeyboard } from '../hooks/useKeyboard';
import { useModeSpecificBehavior } from '../hooks/useModeSpecificBehavior';
import { useScreenReaderAnnouncements } from './ScreenReaderAnnouncements';
import './ModeSelector.css';

const ModeSelector = ({ currentMode, onModeChange }) => {
  const { announceToScreenReader } = useKeyboard();
  const { getInteractionProps, getModeSpecificClasses } = useModeSpecificBehavior();
  const { announceModeChange, announceSuccess } = useScreenReaderAnnouncements();
  const previousModeRef = useRef(currentMode);

  const modes = useMemo(() => [
    { id: 'visual', label: 'Visual Mode', description: 'Standard visual interface with full color and styling' },
    { id: 'audio', label: 'Audio Mode', description: 'Enhanced audio feedback and screen reader support with simplified visuals' },
    { id: 'hybrid', label:'Hybrid Mode', description: 'Combination of visual and audio features for flexible interaction' },
    { id: 'simplified', label: 'Simplified Mode', description: 'Minimal complexity with larger elements and high contrast' }
  ], []);

  // Handle mode change with immediate feedback
  const handleModeChange = useCallback((newMode) => {
    if (newMode !== currentMode) {
      onModeChange(newMode);
      
      // Enhanced announcement with mode benefits
      const selectedMode = modes.find(mode => mode.id === newMode);
      if (selectedMode) {
        const benefits = {
          'visual': 'Full visual interface with colors and styling',
          'audio': 'Enhanced sound feedback for all interactions',
          'hybrid': 'Best of both visual and audio accessibility features',
          'simplified': 'Cleaner interface with larger, easier-to-use controls'
        };
        
        announceModeChange(selectedMode.label, selectedMode.description);
        
        // Provide additional context about what changed
        setTimeout(() => {
          announceSuccess('Mode activated', benefits[newMode] || 'Mode change completed successfully');
        }, 500);
      }
    }
  }, [currentMode, onModeChange, modes, announceModeChange, announceSuccess]);

  // Announce initial mode on component mount with helpful context
  useEffect(() => {
    if (previousModeRef.current !== currentMode) {
      const currentModeInfo = modes.find(mode => mode.id === currentMode);
      if (currentModeInfo) {
        announceToScreenReader(
          `Current accessibility mode: ${currentModeInfo.label}. ${currentModeInfo.description}. Use arrow keys to explore other modes.`,
          'polite'
        );
      }
      previousModeRef.current = currentMode;
    }
  }, [currentMode, announceToScreenReader, modes]);

  return (
    <fieldset className={getModeSpecificClasses("mode-selector")} aria-labelledby="mode-selector-legend">
      <legend id="mode-selector-legend">Accessibility Mode</legend>
      <div className="mode-options">
        {modes.map((mode) => (
          <label 
            key={mode.id} 
            className={getModeSpecificClasses(`mode-option ${currentMode === mode.id ? 'selected' : ''}`)}
          >
            <input
              type="radio"
              name="accessibility-mode"
              value={mode.id}
              checked={currentMode === mode.id}
              onChange={() => handleModeChange(mode.id)}
              aria-describedby={`${mode.id}-description`}
              aria-label={`${mode.label}: ${mode.description}`}
              {...getInteractionProps('radio')}
            />
            <span className="mode-label">{mode.label}</span>
            <span id={`${mode.id}-description`} className="mode-description">
              {mode.description}
            </span>
          </label>
        ))}
      </div>
      
      {/* Status announcement for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Current mode: {modes.find(mode => mode.id === currentMode)?.label}
      </div>
    </fieldset>
  );
};

export default ModeSelector;