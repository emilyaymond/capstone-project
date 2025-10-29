import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import './SimplifiedChart.css';

const SimplifiedChart = ({ data, title, description }) => {
  const { announceToScreenReader } = useAccessibility();

  if (!data || data.length === 0) {
    return (
      <div className="simplified-chart empty">
        <h3>{title}</h3>
        <p>No data available</p>
      </div>
    );
  }

  // Calculate simple statistics
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : latest;
  const trend = latest > previous ? 'rising' : latest < previous ? 'falling' : 'stable';

  // Get trend description
  const getTrendDescription = () => {
    const change = Math.abs(latest - previous);
    const percentChange = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0;
    
    switch (trend) {
      case 'rising':
        return `increasing by ${change.toFixed(1)} (${percentChange}% higher)`;
      case 'falling':
        return `decreasing by ${change.toFixed(1)} (${percentChange}% lower)`;
      default:
        return 'staying the same';
    }
  };

  // Announce summary when component loads
  React.useEffect(() => {
    const summary = `${title}: Latest value is ${latest}. Trend is ${getTrendDescription()}.`;
    announceToScreenReader(summary);
  }, [title, latest, trend, announceToScreenReader]);

  // Create simple visual bars
  const createBars = () => {
    const range = max - min;
    return data.slice(-5).map((point, index) => {
      const height = range > 0 ? ((point.value - min) / range) * 100 : 50;
      const isLatest = index === data.slice(-5).length - 1;
      
      return (
        <div key={index} className="bar-container">
          <div 
            className={`bar ${isLatest ? 'latest' : ''}`}
            style={{ height: `${height}%` }}
            aria-label={`${point.value} ${point.unit || ''}`}
          />
          <span className="bar-label">{point.value}</span>
        </div>
      );
    });
  };

  return (
    <div className="simplified-chart">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {description && (
          <p className="chart-description">{description}</p>
        )}
      </div>

      <div className="key-metrics">
        <div className="metric current-value">
          <span className="metric-label">Current</span>
          <span className="metric-value">{latest}</span>
          <span className="metric-unit">{data[data.length - 1]?.unit || ''}</span>
        </div>

        <div className={`metric trend ${trend}`}>
          <span className="metric-label">Trend</span>
          <span className="metric-value">
            {trend === 'rising' && '↗️'}
            {trend === 'falling' && '↘️'}
            {trend === 'stable' && '➡️'}
            {trend}
          </span>
        </div>

        <div className="metric range">
          <span className="metric-label">Range</span>
          <span className="metric-value">{min} - {max}</span>
        </div>
      </div>

      <div className="simple-visualization" role="img" aria-label={`Bar chart showing last 5 values with trend ${trend}`}>
        <h4 className="viz-title">Recent Values</h4>
        <div className="bars-container">
          {createBars()}
        </div>
      </div>

      <div className="trend-summary">
        <h4>Summary</h4>
        <p>
          Your latest reading is <strong>{latest}</strong>. 
          Compared to the previous reading, it is <strong>{getTrendDescription()}</strong>.
        </p>
        {data[data.length - 1]?.normalRange && (
          <p>
            Normal range: {data[data.length - 1].normalRange.min} - {data[data.length - 1].normalRange.max}
          </p>
        )}
      </div>

      <div className="simple-actions">
        <button 
          className="action-button primary"
          onClick={() => announceToScreenReader(`Current value: ${latest}. Trend: ${getTrendDescription()}`)}
        >
          Repeat Summary
        </button>
      </div>
    </div>
  );
};

export default SimplifiedChart;