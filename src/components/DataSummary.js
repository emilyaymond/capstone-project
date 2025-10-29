import React, { useState, useRef, useEffect } from 'react';
import { useScreenReader } from '../hooks/useScreenReader';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import './DataSummary.css';

/**
 * DataSummary component provides high-level overviews with drill-down navigation
 * and simplified view options with detail expansion
 */
const DataSummary = ({
  data,
  summaryConfig = {},
  onDrillDown,
  onViewChange,
  className = '',
  'aria-label': ariaLabel = 'Health data summary'
}) => {
  const [currentView, setCurrentView] = useState('summary');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [focusedItem, setFocusedItem] = useState(null);
  const { announceToScreenReader } = useScreenReader();
  const { registerKeyboardShortcuts, unregisterKeyboardShortcuts } = useKeyboardNavigation();
  const containerRef = useRef(null);

  // Register keyboard shortcuts for navigation
  useEffect(() => {
    const shortcuts = {
      'ArrowDown': () => navigateItems('down'),
      'ArrowUp': () => navigateItems('up'),
      'Enter': () => handleItemAction(),
      'Space': () => handleItemAction(),
      'Escape': () => setCurrentView('summary'),
      'd': () => handleDrillDown(),
      's': () => setCurrentView('summary'),
      'e': () => setCurrentView('expanded')
    };

    registerKeyboardShortcuts(shortcuts);
    return () => unregisterKeyboardShortcuts(Object.keys(shortcuts));
  }, [focusedItem, currentView, registerKeyboardShortcuts, unregisterKeyboardShortcuts]);

  const navigateItems = (direction) => {
    const items = getSummaryItems();
    if (items.length === 0) return;

    const currentIndex = focusedItem ? items.findIndex(item => item.id === focusedItem) : -1;
    let newIndex;

    if (direction === 'down') {
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    }

    const newItem = items[newIndex];
    setFocusedItem(newItem.id);
    announceToScreenReader(`Focused on ${newItem.title}: ${newItem.summary}`);
  };

  const handleItemAction = () => {
    if (focusedItem) {
      toggleItemExpansion(focusedItem);
    }
  };

  const handleDrillDown = (itemId = focusedItem) => {
    if (itemId && onDrillDown) {
      const item = getSummaryItems().find(item => item.id === itemId);
      if (item) {
        onDrillDown(item);
        announceToScreenReader(`Drilling down into ${item.title}`);
      }
    }
  };

  const toggleItemExpansion = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
      announceToScreenReader(`Collapsed ${itemId} details`);
    } else {
      newExpanded.add(itemId);
      announceToScreenReader(`Expanded ${itemId} details`);
    }
    setExpandedItems(newExpanded);
  };

  const changeView = (newView) => {
    setCurrentView(newView);
    onViewChange?.(newView);
    announceToScreenReader(`Switched to ${newView} view`);
  };

  const getSummaryItems = () => {
    if (!data || !data.metrics) return [];

    return data.metrics.map(metric => ({
      id: metric.id || metric.type,
      title: metric.name || metric.type,
      value: metric.currentValue,
      unit: metric.unit,
      trend: metric.trend,
      status: metric.status,
      summary: generateSummaryText(metric),
      details: metric.details || {},
      drillDownAvailable: metric.hasDetails || false
    }));
  };

  const generateSummaryText = (metric) => {
    const value = `${metric.currentValue} ${metric.unit || ''}`.trim();
    const trend = metric.trend ? `, trending ${metric.trend}` : '';
    const status = metric.status ? `, status: ${metric.status}` : '';
    return `${value}${trend}${status}`;
  };

  const renderViewControls = () => (
    <div className="data-summary__view-controls" role="tablist" aria-label="View options">
      <button
        role="tab"
        className={`data-summary__view-button ${
          currentView === 'summary' ? 'data-summary__view-button--active' : ''
        }`}
        onClick={() => changeView('summary')}
        aria-selected={currentView === 'summary'}
        aria-controls="summary-content"
        id="summary-tab"
      >
        Summary View
      </button>
      <button
        role="tab"
        className={`data-summary__view-button ${
          currentView === 'expanded' ? 'data-summary__view-button--active' : ''
        }`}
        onClick={() => changeView('expanded')}
        aria-selected={currentView === 'expanded'}
        aria-controls="expanded-content"
        id="expanded-tab"
      >
        Detailed View
      </button>
    </div>
  );

  const renderSummaryItem = (item, isExpanded) => {
    const isFocused = focusedItem === item.id;
    
    return (
      <div
        key={item.id}
        className={`data-summary__item ${
          isFocused ? 'data-summary__item--focused' : ''
        } ${
          isExpanded ? 'data-summary__item--expanded' : ''
        }`}
        role="listitem"
        tabIndex={isFocused ? 0 : -1}
        aria-expanded={isExpanded}
        aria-describedby={`item-help-${item.id}`}
        onFocus={() => setFocusedItem(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleItemExpansion(item.id);
          }
        }}
      >
        <div className="data-summary__item-header">
          <button
            className="data-summary__item-toggle"
            onClick={() => toggleItemExpansion(item.id)}
            aria-expanded={isExpanded}
            aria-controls={`item-content-${item.id}`}
            aria-describedby={`item-help-${item.id}`}
          >
            <span className="data-summary__item-icon" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="data-summary__item-title">{item.title}</span>
          </button>
          
          <div className="data-summary__item-summary">
            <span className="data-summary__item-value">
              {item.value} {item.unit}
            </span>
            {item.trend && (
              <span className={`data-summary__item-trend data-summary__item-trend--${item.trend}`}>
                {item.trend === 'up' ? '↗' : item.trend === 'down' ? '↘' : '→'}
                <span className="sr-only">{item.trend}</span>
              </span>
            )}
            {item.status && (
              <span className={`data-summary__item-status data-summary__item-status--${item.status}`}>
                {item.status}
              </span>
            )}
          </div>

          {item.drillDownAvailable && (
            <button
              className="data-summary__drill-down-button"
              onClick={() => handleDrillDown(item.id)}
              aria-label={`View detailed analysis for ${item.title}`}
              title="View detailed analysis"
            >
              🔍
            </button>
          )}
        </div>

        <div
          id={`item-content-${item.id}`}
          className={`data-summary__item-content ${
            isExpanded ? '' : 'data-summary__item-content--collapsed'
          }`}
          aria-hidden={!isExpanded}
        >
          {item.details && (
            <div className="data-summary__item-details">
              {item.details.description && (
                <p className="data-summary__item-description">
                  {item.details.description}
                </p>
              )}
              {item.details.range && (
                <div className="data-summary__item-range">
                  <strong>Normal Range:</strong> {item.details.range.min} - {item.details.range.max} {item.unit}
                </div>
              )}
              {item.details.lastUpdated && (
                <div className="data-summary__item-timestamp">
                  <strong>Last Updated:</strong> {new Date(item.details.lastUpdated).toLocaleString()}
                </div>
              )}
              {item.details.recommendations && (
                <div className="data-summary__item-recommendations">
                  <strong>Recommendations:</strong>
                  <ul>
                    {item.details.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <span id={`item-help-${item.id}`} className="sr-only">
          {isExpanded ? 'Collapse' : 'Expand'} {item.title} details. 
          {item.drillDownAvailable ? ' Press D for detailed analysis.' : ''}
        </span>
      </div>
    );
  };

  const renderBreadcrumb = () => {
    if (!data.context) return null;

    return (
      <nav className="data-summary__breadcrumb" aria-label="Data context navigation">
        <ol className="data-summary__breadcrumb-list">
          {data.context.path?.map((item, index) => (
            <li key={index} className="data-summary__breadcrumb-item">
              <button
                className="data-summary__breadcrumb-link"
                onClick={() => data.context.onNavigate?.(item, index)}
                aria-current={index === data.context.path.length - 1 ? 'page' : undefined}
              >
                {item.name}
              </button>
              {index < data.context.path.length - 1 && (
                <span className="data-summary__breadcrumb-separator" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  const summaryItems = getSummaryItems();

  if (!data || summaryItems.length === 0) {
    return (
      <div className="data-summary__empty" role="alert">
        <p>No health data available to summarize.</p>
      </div>
    );
  }

  return (
    <div 
      className={`data-summary ${className}`}
      ref={containerRef}
      aria-label={ariaLabel}
      role="region"
    >
      {/* Breadcrumb Navigation */}
      {renderBreadcrumb()}

      {/* View Controls */}
      {renderViewControls()}

      {/* Summary Content */}
      <div
        id="summary-content"
        className="data-summary__content"
        role="tabpanel"
        aria-labelledby={currentView === 'summary' ? 'summary-tab' : 'expanded-tab'}
      >
        {/* Overall Summary */}
        {data.overallSummary && (
          <div className="data-summary__overall">
            <h3 className="data-summary__overall-title">Health Overview</h3>
            <p className="data-summary__overall-text">{data.overallSummary}</p>
            {data.overallStatus && (
              <div className={`data-summary__overall-status data-summary__overall-status--${data.overallStatus}`}>
                Overall Status: {data.overallStatus}
              </div>
            )}
          </div>
        )}

        {/* Summary Items */}
        <div className="data-summary__items" role="list" aria-label="Health metrics summary">
          {summaryItems.map(item => 
            renderSummaryItem(item, currentView === 'expanded' || expandedItems.has(item.id))
          )}
        </div>

        {/* Keyboard Help */}
        <div className="data-summary__help sr-only" aria-live="polite">
          Use arrow keys to navigate items, Enter or Space to expand details, 
          D to drill down, S for summary view, E for expanded view.
        </div>
      </div>
    </div>
  );
};

export default DataSummary;