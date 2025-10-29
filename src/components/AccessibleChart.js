import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useScreenReader } from '../hooks/useScreenReader';
import './AccessibleChart.css';

const AccessibleChart = ({ 
  data = [], 
  chartType = 'line', 
  title = 'Health Data Chart',
  onDataPointFocus,
  className = '',
  ...props 
}) => {
  const { mode, preferences } = useAccessibility();
  const { announceToScreenReader } = useScreenReader();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [chartMode, setChartMode] = useState('visual');
  const [userSelectedMode, setUserSelectedMode] = useState(false);
  const chartRef = useRef(null);
  const dataPointRefs = useRef([]);

  // Detect chart type and set accessibility metadata
  const chartMetadata = {
    line: {
      description: 'Line chart showing data trends over time',
      navigationHint: 'Use arrow keys to navigate between data points',
      audioMapping: 'pitch'
    },
    bar: {
      description: 'Bar chart comparing values across categories',
      navigationHint: 'Use arrow keys to navigate between bars',
      audioMapping: 'volume'
    },
    scatter: {
      description: 'Scatter plot showing relationship between variables',
      navigationHint: 'Use arrow keys to navigate between points',
      audioMapping: 'frequency'
    }
  };

  const currentMetadata = chartMetadata[chartType] || chartMetadata.line;

  // Set chart mode based on accessibility preferences (only if user hasn't manually selected)
  useEffect(() => {
    if (!userSelectedMode) {
      if (mode === 'audio' || preferences.interactionSettings.simplifiedMode) {
        setChartMode('text');
      } else if (mode === 'simplified') {
        setChartMode('simplified');
      } else {
        setChartMode('visual');
      }
    }
  }, [mode, preferences, userSelectedMode]);

  // Keyboard navigation handler for table rows
  const handleRowKeyDown = useCallback((event, index) => {
    if (!data.length) return;

    let newIndex = index;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(index + 1, data.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(index - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = data.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onDataPointFocus) {
          onDataPointFocus(data[index]);
        }
        return; // Don't change focus for Enter/Space
      default:
        return;
    }

    if (newIndex !== index && dataPointRefs.current[newIndex]) {
      setFocusedIndex(newIndex);
      dataPointRefs.current[newIndex].focus();
      focusDataPoint(newIndex);
    }
  }, [data, onDataPointFocus]);

  // Focus management for data points
  const focusDataPoint = useCallback((index) => {
    if (index >= 0 && index < data.length) {
      const dataPoint = data[index];
      const announcement = `Data point ${index + 1} of ${data.length}: ${dataPoint.accessibility?.audioDescription || `${dataPoint.value} ${dataPoint.unit}`}`;
      announceToScreenReader(announcement);
      
      // Focus the corresponding DOM element if available
      if (dataPointRefs.current[index]) {
        dataPointRefs.current[index].focus();
      }
    }
  }, [data, announceToScreenReader]);

  // Initialize keyboard navigation (handled directly on table rows)
  useKeyboardNavigation(chartRef, () => {}, {
    trapFocus: false,
    autoFocus: false
  });

  // Announce chart information when component mounts or data changes
  useEffect(() => {
    if (data.length > 0) {
      const announcement = `${title}. ${currentMetadata.description}. Contains ${data.length} data points. ${currentMetadata.navigationHint}`;
      announceToScreenReader(announcement);
    }
  }, [data, title, currentMetadata, announceToScreenReader]);

  // Get chart summary for screen readers
  const getChartSummary = () => {
    if (!data.length) return 'No data available';
    
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return `Chart summary: ${data.length} data points ranging from ${min} to ${max}, with an average of ${avg.toFixed(2)}`;
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setChartMode(newMode);
    setUserSelectedMode(true);
  };

  // Render mode selector
  const renderModeSelector = () => (
    <div className="chart-mode-selector" role="radiogroup" aria-label="Chart display mode">
      {['visual', 'text', 'simplified'].map(modeOption => (
        <label key={modeOption} className="mode-option">
          <input
            type="radio"
            name="chartMode"
            value={modeOption}
            checked={chartMode === modeOption}
            onChange={(e) => handleModeChange(e.target.value)}
            aria-describedby={`mode-${modeOption}-description`}
          />
          <span className="mode-label">
            {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)} Mode
          </span>
        </label>
      ))}
    </div>
  );

  // Render visual chart placeholder (to be implemented by specific chart types)
  const renderVisualChart = () => (
    <div 
      className="visual-chart-container"
      role="img"
      aria-label={`${title} - ${currentMetadata.description}`}
      aria-describedby="chart-summary"
    >
      <div className="chart-placeholder">
        Visual {chartType} chart will be rendered here
      </div>
      <div id="chart-summary" className="sr-only">
        {getChartSummary()}
      </div>
    </div>
  );

  // Render text-based chart representation
  const renderTextChart = () => (
    <div className="text-chart-container">
      <table 
        className="data-table"
        role="table"
        aria-label={`${title} data table`}
        aria-describedby="table-summary"
      >
        <caption id="table-summary">
          {title} - {getChartSummary()}
        </caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            <th scope="col">Value</th>
            <th scope="col">Unit</th>
            <th scope="col">Trend</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => (
            <tr 
              key={point.id || index}
              className={focusedIndex === index ? 'focused' : ''}
              ref={el => dataPointRefs.current[index] = el}
              tabIndex={0}
              onClick={() => {
                setFocusedIndex(index);
                if (onDataPointFocus) onDataPointFocus(point);
              }}
              onKeyDown={(e) => handleRowKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
            >
              <td>{index + 1}</td>
              <td>{point.value}</td>
              <td>{point.unit}</td>
              <td>{point.accessibility?.trendIndicator || 'stable'}</td>
              <td>{point.accessibility?.audioDescription || point.description || 'No description'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render simplified chart view
  const renderSimplifiedChart = () => (
    <div className="simplified-chart-container">
      <div className="chart-summary-card">
        <h3>{title}</h3>
        <p>{getChartSummary()}</p>
        <div className="key-insights">
          <h4>Key Insights:</h4>
          <ul>
            {data.length > 0 && (
              <>
                <li>Highest value: {Math.max(...data.map(d => d.value))} {data[0].unit}</li>
                <li>Lowest value: {Math.min(...data.map(d => d.value))} {data[0].unit}</li>
                <li>Total data points: {data.length}</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className={`accessible-chart ${className}`}
      ref={chartRef}
      role="region"
      aria-label={title}
      tabIndex={-1}
      {...props}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        {renderModeSelector()}
      </div>
      
      <div className="chart-content">
        {chartMode === 'visual' && renderVisualChart()}
        {chartMode === 'text' && renderTextChart()}
        {chartMode === 'simplified' && renderSimplifiedChart()}
      </div>
      
      <div className="chart-instructions sr-only">
        {currentMetadata.navigationHint}
        Press Enter or Space to select a data point.
      </div>
    </div>
  );
};

export default AccessibleChart;