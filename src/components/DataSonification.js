/**
 * DataSonification Component
 * Provides comprehensive data sonification capabilities with Web Audio API
 * Transforms health data into accessible audio representations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { calculateTrend } from '../models/HealthDataPoint';
import './DataSonification.css';

/**
 * Audio mapping configurations for different data types
 */
const AUDIO_MAPPINGS = {
  vitals: {
    heartRate: { 
      baseFrequency: 440, 
      range: [300, 800], 
      waveform: 'sine',
      rhythm: true // Heart rate gets rhythmic playback
    },
    bloodPressure: { 
      baseFrequency: 330, 
      range: [250, 600], 
      waveform: 'triangle',
      dualTone: true // Systolic/diastolic
    },
    temperature: { 
      baseFrequency: 523, 
      range: [400, 700], 
      waveform: 'sine' 
    },
    oxygenSaturation: { 
      baseFrequency: 659, 
      range: [500, 900], 
      waveform: 'sine' 
    }
  },
  symptoms: {
    pain: { 
      baseFrequency: 220, 
      range: [150, 400], 
      waveform: 'sawtooth' // Harsh sound for pain
    },
    fatigue: { 
      baseFrequency: 196, 
      range: [130, 350], 
      waveform: 'triangle' 
    }
  },
  activity: {
    steps: { 
      baseFrequency: 880, 
      range: [600, 1200], 
      waveform: 'square',
      percussive: true // Steps get percussive sounds
    },
    sleep: { 
      baseFrequency: 261, 
      range: [200, 400], 
      waveform: 'sine' 
    }
  },
  medication: {
    dosage: { 
      baseFrequency: 392, 
      range: [300, 500], 
      waveform: 'sine' 
    }
  }
};

/**
 * Playback speed options
 */
const PLAYBACK_SPEEDS = {
  slow: { multiplier: 0.5, label: 'Slow' },
  normal: { multiplier: 1.0, label: 'Normal' },
  fast: { multiplier: 1.5, label: 'Fast' },
  veryFast: { multiplier: 2.0, label: 'Very Fast' }
};

const DataSonification = ({ 
  data = [], 
  isPlaying = false, 
  onPlayStateChange,
  playbackSpeed = 'normal',
  volume = 0.7,
  autoPlay = false,
  showControls = true,
  onSonificationComplete,
  className = ''
}) => {
  const [audioContext, setAudioContext] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const playbackRef = useRef(null);
  const scheduledNodesRef = useRef([]);
  const animationFrameRef = useRef(null);

  /**
   * Initialize Web Audio API context
   */
  const initializeAudio = useCallback(async () => {
    if (isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check for Web Audio API support
      if (!window.AudioContext && !window.webkitAudioContext) {
        throw new Error('Web Audio API not supported in this browser');
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();

      // Resume context if suspended (required by modern browsers)
      if (context.state === 'suspended') {
        await context.resume();
      }

      setAudioContext(context);
      setIsInitialized(true);
    } catch (err) {
      setError(`Failed to initialize audio: ${err.message}`);
      console.error('DataSonification: Audio initialization failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Calculate sonification parameters for data points
   */
  const calculateSonificationParams = useCallback((dataPoints) => {
    if (!dataPoints.length) return [];

    // Group data by category and type for better audio mapping
    const groupedData = dataPoints.reduce((acc, point) => {
      const key = `${point.category}_${point.unit}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(point);
      return acc;
    }, {});

    const sonificationParams = [];

    Object.entries(groupedData).forEach(([key, points]) => {
      const [category] = key.split('_');
      const mapping = AUDIO_MAPPINGS[category] || AUDIO_MAPPINGS.vitals.heartRate;
      
      // Calculate value range for frequency mapping
      const values = points.map(p => p.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue || 1;

      points.forEach((point, index) => {
        // Normalize value to 0-1 range
        const normalizedValue = (point.value - minValue) / valueRange;
        
        // Map to frequency range
        const frequency = mapping.range[0] + 
          (normalizedValue * (mapping.range[1] - mapping.range[0]));

        // Calculate timing
        const startTime = index * 0.3; // 300ms between notes
        const duration = mapping.percussive ? 0.1 : 0.25;

        sonificationParams.push({
          ...point,
          frequency,
          startTime,
          duration,
          waveform: mapping.waveform,
          volume: volume * 0.8, // Slightly reduce volume for comfort
          mapping,
          normalizedValue
        });
      });
    });

    // Sort by start time
    return sonificationParams.sort((a, b) => a.startTime - b.startTime);
  }, [volume]);

  /**
   * Create and schedule audio nodes for sonification
   */
  const scheduleAudioNodes = useCallback((params, startTime = 0) => {
    if (!audioContext || !params.length) return;

    const speedMultiplier = PLAYBACK_SPEEDS[playbackSpeed].multiplier;
    const nodes = [];

    params.forEach((param) => {
      const {
        frequency,
        startTime: paramStartTime,
        duration,
        waveform,
        volume: paramVolume,
        mapping
      } = param;

      const actualStartTime = startTime + (paramStartTime / speedMultiplier);
      const actualDuration = duration / speedMultiplier;

      // Create oscillator and gain nodes
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();

      // Configure oscillator
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, actualStartTime);

      // Add slight frequency modulation for more interesting sound
      if (mapping.rhythm && waveform === 'sine') {
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        
        lfo.frequency.setValueAtTime(2, actualStartTime); // 2Hz modulation
        lfoGain.gain.setValueAtTime(5, actualStartTime); // 5Hz depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        lfo.start(actualStartTime);
        lfo.stop(actualStartTime + actualDuration);
        
        nodes.push(lfo, lfoGain);
      }

      // Configure filter for tone shaping
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(frequency * 2, actualStartTime);
      filterNode.Q.setValueAtTime(1, actualStartTime);

      // Configure gain envelope
      gainNode.gain.setValueAtTime(0, actualStartTime);
      gainNode.gain.linearRampToValueAtTime(paramVolume, actualStartTime + 0.01);
      
      if (mapping.percussive) {
        // Sharp attack, quick decay for percussive sounds
        gainNode.gain.exponentialRampToValueAtTime(0.001, actualStartTime + actualDuration * 0.3);
      } else {
        // Sustained tone with gentle release
        gainNode.gain.setValueAtTime(paramVolume, actualStartTime + actualDuration * 0.7);
        gainNode.gain.exponentialRampToValueAtTime(0.001, actualStartTime + actualDuration);
      }

      // Connect audio graph
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Schedule playback
      oscillator.start(actualStartTime);
      oscillator.stop(actualStartTime + actualDuration);

      nodes.push(oscillator, gainNode, filterNode);
    });

    scheduledNodesRef.current = nodes;
    
    // Calculate total duration
    const totalDuration = Math.max(...params.map(p => p.startTime + p.duration)) / speedMultiplier;
    setDuration(totalDuration);

    return totalDuration;
  }, [audioContext, playbackSpeed]);

  /**
   * Start sonification playback
   */
  const startPlayback = useCallback(async () => {
    if (!audioContext || !data.length) return;

    try {
      // Stop any existing playback
      stopPlayback();

      // Calculate sonification parameters
      const params = calculateSonificationParams(data);
      if (!params.length) {
        throw new Error('No valid data points for sonification');
      }

      // Schedule audio nodes
      const totalDuration = scheduleAudioNodes(params, audioContext.currentTime);
      
      // Start position tracking
      const startTime = audioContext.currentTime;
      playbackRef.current = {
        startTime,
        totalDuration,
        params
      };

      // Update position during playback
      const updatePosition = () => {
        if (playbackRef.current) {
          const elapsed = audioContext.currentTime - playbackRef.current.startTime;
          const progress = Math.min(elapsed / playbackRef.current.totalDuration, 1);
          setCurrentPosition(progress);

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(updatePosition);
          } else {
            // Playback complete
            setCurrentPosition(0);
            onPlayStateChange?.(false);
            onSonificationComplete?.();
            playbackRef.current = null;
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(updatePosition);
      onPlayStateChange?.(true);

    } catch (err) {
      setError(`Playback failed: ${err.message}`);
      console.error('DataSonification: Playback failed', err);
    }
  }, [audioContext, data, calculateSonificationParams, scheduleAudioNodes, onPlayStateChange, onSonificationComplete]);

  /**
   * Stop sonification playback
   */
  const stopPlayback = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop all scheduled audio nodes
    scheduledNodesRef.current.forEach(node => {
      try {
        if (node.stop) {
          node.stop();
        } else if (node.disconnect) {
          node.disconnect();
        }
      } catch (err) {
        // Node may already be stopped
      }
    });
    scheduledNodesRef.current = [];

    // Reset state
    setCurrentPosition(0);
    playbackRef.current = null;
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  /**
   * Toggle playback state
   */
  const togglePlayback = useCallback(async () => {
    if (!isInitialized) {
      await initializeAudio();
      return;
    }

    if (isPlaying) {
      stopPlayback();
    } else {
      await startPlayback();
    }
  }, [isInitialized, isPlaying, initializeAudio, stopPlayback, startPlayback]);

  /**
   * Get trend description for screen readers
   */
  const getTrendDescription = useCallback(() => {
    if (!data.length) return 'No data available for sonification';

    const trend = calculateTrend(data);
    const dataCount = data.length;
    const categories = [...new Set(data.map(d => d.category))];
    
    return `Sonification ready for ${dataCount} data points across ${categories.length} categories. ${trend.description}`;
  }, [data]);

  // Initialize audio on mount
  useEffect(() => {
    if (autoPlay) {
      initializeAudio();
    }
  }, [autoPlay, initializeAudio]);

  // Auto-play when data changes (if enabled)
  useEffect(() => {
    if (autoPlay && isInitialized && data.length && !isPlaying) {
      startPlayback();
    }
  }, [autoPlay, isInitialized, data, isPlaying, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContext && audioContext.state !== 'closed' && audioContext.close) {
        audioContext.close();
      }
    };
  }, [audioContext, stopPlayback]);

  return (
    <div className={`data-sonification ${className}`}>
      <div className="sonification-info">
        <h3>Data Sonification</h3>
        <p className="sr-only" aria-live="polite">
          {getTrendDescription()}
        </p>
        
        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            {error}
          </div>
        )}
      </div>

      {showControls && (
        <div className="sonification-controls">
          <button
            className={`play-button ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
            disabled={isLoading || !data.length}
            aria-label={isPlaying ? 'Stop sonification' : 'Play sonification'}
          >
            {isLoading ? (
              <span className="loading-spinner" aria-hidden="true">⏳</span>
            ) : isPlaying ? (
              <span aria-hidden="true">⏸️</span>
            ) : (
              <span aria-hidden="true">▶️</span>
            )}
            {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Play'}
          </button>

          {duration > 0 && (
            <div className="progress-container">
              <div 
                className="progress-bar"
                role="progressbar"
                aria-valuenow={Math.round(currentPosition * 100)}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Sonification progress"
              >
                <div 
                  className="progress-fill"
                  style={{ width: `${currentPosition * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {Math.round(currentPosition * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      <div className="sonification-stats">
        <span className="stat">
          <strong>Data Points:</strong> {data.length}
        </span>
        <span className="stat">
          <strong>Speed:</strong> {PLAYBACK_SPEEDS[playbackSpeed].label}
        </span>
        {duration > 0 && (
          <span className="stat">
            <strong>Duration:</strong> {duration.toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
};

DataSonification.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    timestamp: PropTypes.instanceOf(Date).isRequired
  })).isRequired,
  isPlaying: PropTypes.bool,
  onPlayStateChange: PropTypes.func,
  playbackSpeed: PropTypes.oneOf(['slow', 'normal', 'fast', 'veryFast']),
  volume: PropTypes.number,
  autoPlay: PropTypes.bool,
  showControls: PropTypes.bool,
  onSonificationComplete: PropTypes.func,
  className: PropTypes.string
};

export default DataSonification;
export { AUDIO_MAPPINGS, PLAYBACK_SPEEDS };