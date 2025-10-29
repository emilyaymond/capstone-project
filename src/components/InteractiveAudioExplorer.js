/**
 * InteractiveAudioExplorer Component
 * Provides interactive audio exploration capabilities for health data
 * Includes audio cues, trend identification, and customizable settings
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { calculateTrend } from '../models/HealthDataPoint';
import DataSonification, { AUDIO_MAPPINGS } from './DataSonification';
import '../styles/components/InteractiveAudioExplorer.css';

/**
 * Audio exploration modes
 */
const EXPLORATION_MODES = {
  sequential: {
    name: 'Sequential',
    description: 'Navigate through data points one by one',
    shortcut: 'S'
  },
  comparative: {
    name: 'Comparative',
    description: 'Compare selected data points',
    shortcut: 'C'
  },
  trend: {
    name: 'Trend Analysis',
    description: 'Focus on data trends and patterns',
    shortcut: 'T'
  },
  overview: {
    name: 'Overview',
    description: 'High-level summary of all data',
    shortcut: 'O'
  }
};

/**
 * Audio cue types for different interactions
 */
const AUDIO_CUES = {
  navigation: {
    next: { frequency: 880, duration: 0.1, type: 'sine' },
    previous: { frequency: 660, duration: 0.1, type: 'sine' },
    first: { frequency: 1320, duration: 0.15, type: 'sine' },
    last: { frequency: 440, duration: 0.15, type: 'sine' }
  },
  selection: {
    select: { frequency: 1100, duration: 0.2, type: 'triangle' },
    deselect: { frequency: 550, duration: 0.15, type: 'triangle' },
    multiSelect: { frequency: 1100, duration: 0.1, type: 'square' }
  },
  trends: {
    increasing: { frequency: [440, 880], duration: 0.3, type: 'sine' },
    decreasing: { frequency: [880, 440], duration: 0.3, type: 'sine' },
    stable: { frequency: 660, duration: 0.2, type: 'triangle' },
    volatile: { frequency: 660, duration: 0.1, type: 'sawtooth' }
  },
  boundaries: {
    normal: { frequency: 523, duration: 0.15, type: 'sine' },
    high: { frequency: 1046, duration: 0.2, type: 'sawtooth' },
    low: { frequency: 261, duration: 0.2, type: 'sawtooth' },
    critical: { frequency: 220, duration: 0.3, type: 'square' }
  }
};

const InteractiveAudioExplorer = ({
  data = [],
  initialMode = 'sequential',
  autoAnnounce = true,
  enableKeyboardShortcuts = true,
  customAudioSettings = {},
  onDataPointFocus,
  onSelectionChange,
  onModeChange,
  className = ''
}) => {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSettings, setAudioSettings] = useState({
    volume: 0.7,
    speechRate: 1.0,
    enableAudioCues: true,
    enableTrendSounds: true,
    enableBoundaryAlerts: true,
    ...customAudioSettings
  });
  const [audioContext, setAudioContext] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const containerRef = useRef(null);
  const announcementRef = useRef(null);

  /**
   * Initialize Web Audio API for interactive exploration
   */
  const initializeAudio = useCallback(async () => {
    if (isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }

      const context = new AudioContextClass();
      if (context.state === 'suspended') {
        await context.resume();
      }

      setAudioContext(context);
      setIsInitialized(true);
    } catch (error) {
      console.warn('Failed to initialize audio for exploration:', error);
    }
  }, [isInitialized]);

  /**
   * Play audio cue for user interactions
   */
  const playAudioCue = useCallback(async (cueType, cueSubtype, options = {}) => {
    if (!audioContext || !audioSettings.enableAudioCues) return;

    const cueConfig = AUDIO_CUES[cueType]?.[cueSubtype];
    if (!cueConfig) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Handle frequency sweeps for trend cues
      if (Array.isArray(cueConfig.frequency)) {
        const [startFreq, endFreq] = cueConfig.frequency;
        oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(
          endFreq, 
          audioContext.currentTime + cueConfig.duration
        );
      } else {
        oscillator.frequency.setValueAtTime(cueConfig.frequency, audioContext.currentTime);
      }

      oscillator.type = cueConfig.type;

      // Configure gain envelope
      const volume = (options.volume || audioSettings.volume) * 0.5;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + cueConfig.duration);

      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + cueConfig.duration);
    } catch (error) {
      console.warn('Failed to play audio cue:', error);
    }
  }, [audioContext, audioSettings]);

  /**
   * Announce data point information
   */
  const announceDataPoint = useCallback((dataPoint, index, context = {}) => {
    if (!autoAnnounce || !dataPoint) return;

    const { isComparison = false, trendInfo = null } = context;
    
    let announcement = '';
    
    if (isComparison) {
      announcement += `Comparing: `;
    } else {
      announcement += `Data point ${index + 1} of ${data.length}: `;
    }

    announcement += `${dataPoint.value} ${dataPoint.unit}`;
    
    if (dataPoint.timestamp) {
      const time = dataPoint.timestamp.toLocaleTimeString();
      announcement += ` at ${time}`;
    }

    // Add normal range context
    if (dataPoint.normalRange) {
      const { min, max } = dataPoint.normalRange;
      const isNormal = dataPoint.value >= min && dataPoint.value <= max;
      const status = isNormal ? 'normal' : 
                    dataPoint.value > max ? 'high' : 'low';
      announcement += `. ${status} range`;
      
      // Play boundary alert if outside normal range
      if (!isNormal && audioSettings.enableBoundaryAlerts) {
        const alertType = dataPoint.value > max ? 'high' : 'low';
        playAudioCue('boundaries', alertType);
      }
    }

    // Add trend information
    if (trendInfo && audioSettings.enableTrendSounds) {
      announcement += `. Trend: ${trendInfo.description}`;
      playAudioCue('trends', trendInfo.trend);
    }

    // Announce to screen reader
    if (announcementRef.current) {
      announcementRef.current.textContent = announcement;
    }

    // Call callback
    onDataPointFocus?.(dataPoint, index, context);
  }, [data.length, autoAnnounce, audioSettings, playAudioCue, onDataPointFocus]);

  /**
   * Navigate to specific data point
   */
  const navigateToIndex = useCallback((newIndex, playSound = true) => {
    if (newIndex < 0 || newIndex >= data.length) return;

    const oldIndex = currentIndex;
    setCurrentIndex(newIndex);

    // Play navigation sound
    if (playSound && audioSettings.enableAudioCues) {
      if (newIndex === 0) {
        playAudioCue('navigation', 'first');
      } else if (newIndex === data.length - 1) {
        playAudioCue('navigation', 'last');
      } else if (newIndex > oldIndex) {
        playAudioCue('navigation', 'next');
      } else {
        playAudioCue('navigation', 'previous');
      }
    }

    // Announce current data point
    const currentData = data[newIndex];
    if (currentData) {
      // Calculate trend context if in trend mode
      let trendInfo = null;
      if (currentMode === 'trend' && newIndex > 0) {
        const recentData = data.slice(Math.max(0, newIndex - 2), newIndex + 1);
        trendInfo = calculateTrend(recentData);
      }

      announceDataPoint(currentData, newIndex, { trendInfo });
    }
  }, [currentIndex, data, currentMode, audioSettings, playAudioCue, announceDataPoint]);

  /**
   * Navigate to next data point
   */
  const navigateNext = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, data.length - 1);
    navigateToIndex(nextIndex);
  }, [currentIndex, data.length, navigateToIndex]);

  /**
   * Navigate to previous data point
   */
  const navigatePrevious = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    navigateToIndex(prevIndex);
  }, [currentIndex, navigateToIndex]);

  /**
   * Toggle selection of current data point
   */
  const toggleSelection = useCallback(() => {
    const newSelection = new Set(selectedIndices);
    
    if (newSelection.has(currentIndex)) {
      newSelection.delete(currentIndex);
      playAudioCue('selection', 'deselect');
    } else {
      newSelection.add(currentIndex);
      playAudioCue('selection', newSelection.size > 1 ? 'multiSelect' : 'select');
    }

    setSelectedIndices(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  }, [currentIndex, selectedIndices, playAudioCue, onSelectionChange]);

  /**
   * Change exploration mode
   */
  const changeMode = useCallback((newMode) => {
    if (newMode === currentMode) return;

    setCurrentMode(newMode);
    onModeChange?.(newMode);

    // Announce mode change
    const modeInfo = EXPLORATION_MODES[newMode];
    if (announcementRef.current && modeInfo) {
      announcementRef.current.textContent = `Switched to ${modeInfo.name} mode. ${modeInfo.description}`;
    }

    // Re-announce current data point with new context
    if (data[currentIndex]) {
      setTimeout(() => {
        announceDataPoint(data[currentIndex], currentIndex);
      }, 500);
    }
  }, [currentMode, data, currentIndex, announceDataPoint, onModeChange]);

  /**
   * Compare selected data points
   */
  const compareSelected = useCallback(() => {
    if (selectedIndices.size < 2) {
      if (announcementRef.current) {
        announcementRef.current.textContent = 'Select at least 2 data points to compare';
      }
      return;
    }

    const selectedData = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(index => ({ data: data[index], index }));

    // Announce comparison
    let comparison = `Comparing ${selectedData.length} data points: `;
    selectedData.forEach(({ data: point, index }, i) => {
      if (i > 0) comparison += ', ';
      comparison += `${point.value} ${point.unit} at position ${index + 1}`;
    });

    // Calculate trend across selected points
    const trendInfo = calculateTrend(selectedData.map(item => item.data));
    comparison += `. Overall trend: ${trendInfo.description}`;

    if (announcementRef.current) {
      announcementRef.current.textContent = comparison;
    }

    // Play trend sound
    if (audioSettings.enableTrendSounds) {
      playAudioCue('trends', trendInfo.trend);
    }
  }, [selectedIndices, data, audioSettings, playAudioCue]);

  /**
   * Provide overview of all data
   */
  const provideOverview = useCallback(() => {
    if (!data.length) return;

    const values = data.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const trendInfo = calculateTrend(data);

    const categories = [...new Set(data.map(point => point.category))];
    
    let overview = `Data overview: ${data.length} points across ${categories.length} categories. `;
    overview += `Range from ${min} to ${max}, average ${avg.toFixed(1)}. `;
    overview += trendInfo.description;

    if (announcementRef.current) {
      announcementRef.current.textContent = overview;
    }

    // Play trend sound for overall trend
    if (audioSettings.enableTrendSounds) {
      playAudioCue('trends', trendInfo.trend);
    }
  }, [data, audioSettings, playAudioCue]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((event) => {
    if (!enableKeyboardShortcuts) return;

    // Don't interfere with form inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'arrowright':
      case 'j':
        event.preventDefault();
        navigateNext();
        break;
      case 'arrowleft':
      case 'k':
        event.preventDefault();
        navigatePrevious();
        break;
      case 'home':
        event.preventDefault();
        navigateToIndex(0);
        break;
      case 'end':
        event.preventDefault();
        navigateToIndex(data.length - 1);
        break;
      case ' ':
      case 'enter':
        event.preventDefault();
        toggleSelection();
        break;
      case 'c':
        if (event.ctrlKey || event.metaKey) return; // Don't interfere with copy
        event.preventDefault();
        if (currentMode === 'comparative') {
          compareSelected();
        } else {
          changeMode('comparative');
        }
        break;
      case 's':
        event.preventDefault();
        changeMode('sequential');
        break;
      case 't':
        event.preventDefault();
        changeMode('trend');
        break;
      case 'o':
        event.preventDefault();
        if (currentMode === 'overview') {
          provideOverview();
        } else {
          changeMode('overview');
        }
        break;
      case 'escape':
        event.preventDefault();
        setSelectedIndices(new Set());
        onSelectionChange?.([]);
        break;
    }
  }, [
    enableKeyboardShortcuts, 
    navigateNext, 
    navigatePrevious, 
    navigateToIndex, 
    toggleSelection, 
    compareSelected, 
    changeMode, 
    provideOverview, 
    currentMode, 
    data.length, 
    onSelectionChange
  ]);

  // Initialize audio on mount
  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enableKeyboardShortcuts, handleKeyDown]);

  // Announce initial data point
  useEffect(() => {
    if (data.length > 0 && currentIndex < data.length) {
      announceDataPoint(data[currentIndex], currentIndex);
    }
  }, [data, currentIndex, announceDataPoint]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContext && audioContext.close) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  if (!data.length) {
    return (
      <div className={`interactive-audio-explorer ${className}`}>
        <div className="explorer-message">
          <p>No data available for audio exploration</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`interactive-audio-explorer ${className}`}
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Interactive audio data explorer"
    >
      {/* Screen reader announcements */}
      <div 
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Mode selector */}
      <div className="mode-selector">
        <h3>Exploration Mode</h3>
        <div className="mode-buttons" role="radiogroup" aria-label="Exploration mode">
          {Object.entries(EXPLORATION_MODES).map(([key, mode]) => (
            <button
              key={key}
              className={`mode-button ${currentMode === key ? 'active' : ''}`}
              onClick={() => changeMode(key)}
              role="radio"
              aria-checked={currentMode === key}
              aria-describedby={`mode-${key}-desc`}
            >
              <span className="mode-name">{mode.name}</span>
              <span className="mode-shortcut">({mode.shortcut})</span>
            </button>
          ))}
        </div>
        
        {/* Mode descriptions */}
        {Object.entries(EXPLORATION_MODES).map(([key, mode]) => (
          <div
            key={key}
            id={`mode-${key}-desc`}
            className="sr-only"
          >
            {mode.description}
          </div>
        ))}
      </div>

      {/* Navigation controls */}
      <div className="navigation-controls">
        <h3>Navigation</h3>
        <div className="nav-buttons">
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            aria-label="Previous data point (Left arrow or K)"
          >
            ← Previous
          </button>
          
          <span className="position-indicator">
            {currentIndex + 1} of {data.length}
            {selectedIndices.has(currentIndex) && ' (Selected)'}
          </span>
          
          <button
            onClick={navigateNext}
            disabled={currentIndex === data.length - 1}
            aria-label="Next data point (Right arrow or J)"
          >
            Next →
          </button>
        </div>

        <button
          className="selection-button"
          onClick={toggleSelection}
          aria-label={`${selectedIndices.has(currentIndex) ? 'Deselect' : 'Select'} current data point (Space or Enter)`}
        >
          {selectedIndices.has(currentIndex) ? '☑' : '☐'} 
          {selectedIndices.has(currentIndex) ? 'Deselect' : 'Select'}
        </button>
      </div>

      {/* Mode-specific actions */}
      <div className="mode-actions">
        {currentMode === 'comparative' && (
          <div className="comparative-actions">
            <p>Selected: {selectedIndices.size} data points</p>
            <button
              onClick={compareSelected}
              disabled={selectedIndices.size < 2}
              aria-label="Compare selected data points (C)"
            >
              Compare Selected
            </button>
          </div>
        )}

        {currentMode === 'overview' && (
          <div className="overview-actions">
            <button
              onClick={provideOverview}
              aria-label="Provide data overview (O)"
            >
              Get Overview
            </button>
          </div>
        )}
      </div>

      {/* Audio settings */}
      <div className="audio-settings">
        <h3>Audio Settings</h3>
        <div className="settings-grid">
          <label>
            <input
              type="checkbox"
              checked={audioSettings.enableAudioCues}
              onChange={(e) => setAudioSettings(prev => ({
                ...prev,
                enableAudioCues: e.target.checked
              }))}
            />
            Navigation sounds
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={audioSettings.enableTrendSounds}
              onChange={(e) => setAudioSettings(prev => ({
                ...prev,
                enableTrendSounds: e.target.checked
              }))}
            />
            Trend audio cues
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={audioSettings.enableBoundaryAlerts}
              onChange={(e) => setAudioSettings(prev => ({
                ...prev,
                enableBoundaryAlerts: e.target.checked
              }))}
            />
            Boundary alerts
          </label>

          <label>
            Volume: {Math.round(audioSettings.volume * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioSettings.volume}
              onChange={(e) => setAudioSettings(prev => ({
                ...prev,
                volume: parseFloat(e.target.value)
              }))}
              aria-label="Audio volume"
            />
          </label>
        </div>
      </div>

      {/* Sonification integration */}
      <div className="sonification-section">
        <DataSonification
          data={selectedIndices.size > 0 ? 
            Array.from(selectedIndices).map(i => data[i]) : 
            data
          }
          isPlaying={isPlaying}
          onPlayStateChange={setIsPlaying}
          volume={audioSettings.volume}
          showControls={true}
        />
      </div>

      {/* Keyboard shortcuts help */}
      <details className="keyboard-help">
        <summary>Keyboard Shortcuts</summary>
        <dl>
          <dt>← / K</dt><dd>Previous data point</dd>
          <dt>→ / J</dt><dd>Next data point</dd>
          <dt>Home</dt><dd>First data point</dd>
          <dt>End</dt><dd>Last data point</dd>
          <dt>Space / Enter</dt><dd>Select/deselect current point</dd>
          <dt>S</dt><dd>Sequential mode</dd>
          <dt>C</dt><dd>Comparative mode / Compare selected</dd>
          <dt>T</dt><dd>Trend analysis mode</dd>
          <dt>O</dt><dd>Overview mode / Get overview</dd>
          <dt>Escape</dt><dd>Clear selection</dd>
        </dl>
      </details>
    </div>
  );
};

InteractiveAudioExplorer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    timestamp: PropTypes.instanceOf(Date).isRequired,
    normalRange: PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired
    })
  })).isRequired,
  initialMode: PropTypes.oneOf(['sequential', 'comparative', 'trend', 'overview']),
  autoAnnounce: PropTypes.bool,
  enableKeyboardShortcuts: PropTypes.bool,
  customAudioSettings: PropTypes.object,
  onDataPointFocus: PropTypes.func,
  onSelectionChange: PropTypes.func,
  onModeChange: PropTypes.func,
  className: PropTypes.string
};

export default InteractiveAudioExplorer;
export { EXPLORATION_MODES, AUDIO_CUES };