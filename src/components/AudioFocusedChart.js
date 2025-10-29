import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import DataSonification from './DataSonification';
import './AudioFocusedChart.css';

const AudioFocusedChart = ({ data, title, description, onDataPointFocus }) => {
  const { modeFeatures, announceToScreenReader } = useAccessibility();
  const { playDataPoint, playTrend } = useAudioFeedback();
  const currentPointRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (modeFeatures.enhancedSonification && data?.length > 0) {
      // Announce chart availability
      announceToScreenReader(
        `Audio-focused chart loaded: ${title}. ${data.length} data points available. Use arrow keys to explore or press Space to play trend.`
      );
    }
  }, [data, title, modeFeatures.enhancedSonification, announceToScreenReader]);

  const handleKeyDown = (event) => {
    if (!data || data.length === 0) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        currentPointRef.current = Math.min(currentPointRef.current + 1, data.length - 1);
        exploreDataPoint(currentPointRef.current);
        break;
      
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        currentPointRef.current = Math.max(currentPointRef.current - 1, 0);
        exploreDataPoint(currentPointRef.current);
        break;
      
      case 'Home':
        event.preventDefault();
        currentPointRef.current = 0;
        exploreDataPoint(currentPointRef.current);
        break;
      
      case 'End':
        event.preventDefault();
        currentPointRef.current = data.length - 1;
        exploreDataPoint(currentPointRef.current);
        break;
      
      case ' ':
      case 'Enter':
        event.preventDefault();
        playFullTrend();
        break;
      
      case 'Escape':
        event.preventDefault();
        stopPlayback();
        break;
      
      default:
        break;
    }
  };

  const exploreDataPoint = (index) => {
    const point = data[index];
    if (!point) return;

    // Play audio cue for the data point
    playDataPoint(point.value, point.normalRange);

    // Announce detailed information
    const announcement = `Point ${index + 1} of ${data.length}: ${point.value} ${point.unit}. ${point.accessibility?.audioDescription || ''}`;
    announceToScreenReader(announcement);

    // Call parent callback
    if (onDataPointFocus) {
      onDataPointFocus(point, index);
    }
  };

  const playFullTrend = () => {
    if (!data || data.length === 0) return;

    announceToScreenReader('Playing full data trend');
    playTrend(data);
  };

  const stopPlayback = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    announceToScreenReader('Playback stopped');
  };

  const getSummaryStats = () => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return { min, max, avg: avg.toFixed(1) };
  };

  const stats = getSummaryStats();

  return (
    <div 
      className="audio-focused-chart"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label={`Audio chart: ${title}`}
      aria-describedby="audio-chart-instructions"
    >
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {description && (
          <p className="chart-description">{description}</p>
        )}
      </div>

      {stats && (
        <div className="chart-summary" aria-live="polite">
          <h4>Data Summary</h4>
          <ul>
            <li>Minimum: {stats.min}</li>
            <li>Maximum: {stats.max}</li>
            <li>Average: {stats.avg}</li>
            <li>Total points: {data.length}</li>
          </ul>
        </div>
      )}

      <div 
        id="audio-chart-instructions" 
        className="chart-instructions"
        aria-live="polite"
      >
        <h4>Navigation Instructions</h4>
        <ul>
          <li>Arrow keys: Navigate between data points</li>
          <li>Space/Enter: Play full trend</li>
          <li>Home/End: Jump to first/last point</li>
          <li>Escape: Stop playback</li>
        </ul>
      </div>

      {modeFeatures.enhancedSonification && (
        <DataSonification 
          data={data}
          autoPlay={false}
          showControls={true}
          enhanced={true}
        />
      )}

      <div className="current-position" aria-live="assertive" aria-atomic="true">
        {data && data.length > 0 && (
          <span className="sr-only">
            Current position: {currentPointRef.current + 1} of {data.length}
          </span>
        )}
      </div>

      {/* Minimal visual representation for non-audio modes */}
      {!modeFeatures.prioritizeAudio && data && data.length > 0 && (
        <div className="minimal-visual" aria-hidden="true">
          <svg width="200" height="100" viewBox="0 0 200 100">
            <title>Minimal chart visualization</title>
            {data.map((point, index) => {
              const x = data.length > 1 ? (index / (data.length - 1)) * 180 + 10 : 100;
              const range = (stats?.max || 1) - (stats?.min || 0);
              const y = range > 0 ? 90 - ((point.value - (stats?.min || 0)) / range) * 80 : 50;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index === currentPointRef.current ? 4 : 2}
                  fill={index === currentPointRef.current ? '#007acc' : '#666666'}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

export default AudioFocusedChart;