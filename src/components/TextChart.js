import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useScreenReader } from '../hooks/useScreenReader';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import '../styles/components/TextChart.css';

const TextChart = ({ 
  data = [], 
  title = 'Data Chart',
  description = '',
  onDataPointFocus,
  showSummary = true,
  sortable = true,
  className = '',
  ...props 
}) => {
  const { announceToScreenReader } = useScreenReader();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const tableRef = useRef(null);
  const rowRefs = useRef([]);

  // Sort data based on current sort configuration
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Convert to strings for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
    announceToScreenReader(`Table sorted by ${key} in ${direction}ending order`);
  };

  // Keyboard navigation for table rows
  const handleRowKeyDown = useCallback((event, index) => {
    if (!sortedData.length) return;

    let newIndex = index;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(index + 1, sortedData.length - 1);
        break;
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
        newIndex = sortedData.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onDataPointFocus) {
          onDataPointFocus(sortedData[index]);
        }
        return;
      default:
        return;
    }

    if (newIndex !== index && rowRefs.current[newIndex]) {
      setFocusedIndex(newIndex);
      rowRefs.current[newIndex].focus();
      announceDataPoint(newIndex);
    }
  }, [sortedData, onDataPointFocus]);

  // Announce data point information
  const announceDataPoint = useCallback((index) => {
    if (index >= 0 && index < sortedData.length) {
      const dataPoint = sortedData[index];
      const announcement = `Row ${index + 1} of ${sortedData.length}: ${dataPoint.accessibility?.audioDescription || `${dataPoint.value} ${dataPoint.unit}`}`;
      announceToScreenReader(announcement);
    }
  }, [sortedData, announceToScreenReader]);

  // Generate table summary
  const getTableSummary = () => {
    if (!sortedData.length) return 'No data available';
    
    const values = sortedData.map(d => d.value).filter(v => typeof v === 'number');
    if (values.length === 0) return `Table contains ${sortedData.length} data points`;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return `Table contains ${sortedData.length} data points. Values range from ${min} to ${max}, with an average of ${avg.toFixed(2)}`;
  };

  // Get sort indicator for column headers
  const getSortIndicator = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) return '';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Announce table information when data changes
  useEffect(() => {
    if (sortedData.length > 0) {
      const announcement = `${title}. ${description || 'Data table'}. ${getTableSummary()}. Use arrow keys to navigate, Enter to select.`;
      announceToScreenReader(announcement);
    }
  }, [sortedData, title, description, announceToScreenReader]);

  return (
    <div 
      className={`text-chart ${className}`}
      ref={tableRef}
      role="region"
      aria-label={title}
      {...props}
    >
      {showSummary && (
        <div className="table-summary" aria-live="polite">
          <h3 className="table-title">{title}</h3>
          {description && <p className="table-description">{description}</p>}
          <p className="summary-stats">{getTableSummary()}</p>
        </div>
      )}
      
      <div className="table-container">
        <table 
          className="accessible-data-table"
          role="table"
          aria-label={`${title} data table`}
          aria-describedby="table-instructions"
        >
          <caption className="sr-only">
            {title} - {getTableSummary()}
            {sortable && ' - Click column headers to sort'}
          </caption>
          
          <thead>
            <tr>
              <th 
                scope="col"
                className={sortable ? 'sortable' : ''}
                onClick={() => handleSort('index')}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('index')}
                tabIndex={sortable ? 0 : -1}
                aria-sort={sortConfig.key === 'index' ? sortConfig.direction : 'none'}
              >
                Point{getSortIndicator('index')}
              </th>
              <th 
                scope="col"
                className={sortable ? 'sortable' : ''}
                onClick={() => handleSort('value')}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('value')}
                tabIndex={sortable ? 0 : -1}
                aria-sort={sortConfig.key === 'value' ? sortConfig.direction : 'none'}
              >
                Value{getSortIndicator('value')}
              </th>
              <th 
                scope="col"
                className={sortable ? 'sortable' : ''}
                onClick={() => handleSort('unit')}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('unit')}
                tabIndex={sortable ? 0 : -1}
                aria-sort={sortConfig.key === 'unit' ? sortConfig.direction : 'none'}
              >
                Unit{getSortIndicator('unit')}
              </th>
              <th 
                scope="col"
                className={sortable ? 'sortable' : ''}
                onClick={() => handleSort('accessibility.trendIndicator')}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('accessibility.trendIndicator')}
                tabIndex={sortable ? 0 : -1}
                aria-sort={sortConfig.key === 'accessibility.trendIndicator' ? sortConfig.direction : 'none'}
              >
                Trend{getSortIndicator('accessibility.trendIndicator')}
              </th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((point, index) => {
                const originalIndex = data.findIndex(d => d.id === point.id) + 1;
                return (
                  <tr 
                    key={point.id || index}
                    className={focusedIndex === index ? 'focused' : ''}
                    ref={el => rowRefs.current[index] = el}
                    tabIndex={0}
                    role="row"
                    aria-rowindex={index + 2} // +2 because header is row 1
                    onClick={() => {
                      setFocusedIndex(index);
                      if (onDataPointFocus) onDataPointFocus(point);
                    }}
                    onKeyDown={(e) => handleRowKeyDown(e, index)}
                    onFocus={() => {
                      setFocusedIndex(index);
                      announceDataPoint(index);
                    }}
                  >
                    <td role="gridcell">{originalIndex}</td>
                    <td role="gridcell" className="value-cell">
                      <span className="value">{point.value}</span>
                      {point.normalRange && (
                        <span className="normal-range sr-only">
                          Normal range: {point.normalRange.min} to {point.normalRange.max}
                        </span>
                      )}
                    </td>
                    <td role="gridcell">{point.unit}</td>
                    <td role="gridcell">
                      <span className={`trend-indicator trend-${point.accessibility?.trendIndicator || 'stable'}`}>
                        {point.accessibility?.trendIndicator || 'stable'}
                      </span>
                    </td>
                    <td role="gridcell" className="description-cell">
                      {point.accessibility?.audioDescription || point.description || 'No description available'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div id="table-instructions" className="sr-only">
        Use arrow keys to navigate between rows. Press Enter or Space to select a data point.
        {sortable && ' Click column headers or press Enter on them to sort the table.'}
      </div>
    </div>
  );
};

export default TextChart;