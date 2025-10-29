import React, { useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import '../styles/components/AccessibilityModeSelector.css';

const AccessibilityModeSelector = () => {
  const { mode, setMode, announceToScreenReader } = useAccessibility();
  const radioGroupRef = useRef(null);

  const modes = [
    {
      id: 'visual',
      label: 'Visual Mode',
      description: 'Standard visual interface with charts and graphics',
      icon: '',
    },
    {
      id: 'audio',
      label: 'Audio-Focused Mode',
      description: 'Enhanced audio feedback with sonification and voice descriptions',
      icon: '',
    },
    {
      id: 'hybrid',
      label: 'Hybrid Mode',
      description: 'Combination of visual and audio features for optimal accessibility',
      icon: '',
    },
    {
      id: 'simplified',
      label: 'Simplified Mode',
      description: 'Reduced complexity interface with essential features only',
      icon: '',
    },
  ];

  const handleModeChange = (newMode) => {
    setMode(newMode);
    const selectedMode = modes.find(m => m.id === newMode);
    announceToScreenReader(`Switched to ${selectedMode.label}. ${selectedMode.description}`);
  };

  const handleKeyDown = (event) => {
    const currentIndex = modes.findIndex(m => m.id === mode);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % modes.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex === 0 ? modes.length - 1 : currentIndex - 1;
        break;
      default:
        return;
    }

    const nextMode = modes[nextIndex];
    handleModeChange(nextMode.id);
    
    // Focus the newly selected radio button
    const nextRadio = document.getElementById(`mode-${nextMode.id}`);
    if (nextRadio) {
      nextRadio.focus();
    }
  };

  return (
    <div className="accessibility-mode-selector" role="group" aria-labelledby="mode-selector-heading">
      <h2 id="mode-selector-heading" className="mode-selector-title">
        Accessibility Mode
      </h2>
      <p className="mode-selector-description">
        Choose the interaction mode that works best for your needs
      </p>
      
      <div 
        className="mode-options" 
        role="radiogroup" 
        aria-labelledby="mode-selector-heading"
        ref={radioGroupRef}
        onKeyDown={handleKeyDown}
      >
        {modes.map((modeOption) => (
          <label
            key={modeOption.id}
            className={`mode-option ${mode === modeOption.id ? 'selected' : ''}`}
            htmlFor={`mode-${modeOption.id}`}
          >
            <input
              type="radio"
              id={`mode-${modeOption.id}`}
              name="accessibility-mode"
              value={modeOption.id}
              checked={mode === modeOption.id}
              onChange={() => handleModeChange(modeOption.id)}
              onKeyDown={handleKeyDown}
              className="mode-radio"
            />
            <div className="mode-content">
              <div className="mode-header">
                <span className="mode-icon" aria-hidden="true">
                  {modeOption.icon}
                </span>
                <span className="mode-label">{modeOption.label}</span>
              </div>
              <p className="mode-description">{modeOption.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="current-mode-status" aria-live="polite" aria-atomic="true">
        <span className="sr-only">Current mode: </span>
        {modes.find(m => m.id === mode)?.label}
      </div>
    </div>
  );
};

export default AccessibilityModeSelector;