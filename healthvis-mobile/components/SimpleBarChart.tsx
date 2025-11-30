/**
 * SimpleBarChart Component
 * 
 * Visual bar chart component using react-native-svg.
 * Provides visual representation of time-series data with accessibility support.
 * Includes loading states and empty data handling.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { DataPoint } from '../types';
import { useAccessibility } from '../contexts/AccessibilityContext';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface SimpleBarChartProps {
  /** Array of data points to visualize */
  data: DataPoint[];
  /** Chart title */
  title?: string;
  /** Unit label for values (e.g., "bpm", "mg/dL") */
  unit?: string;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Accessibility label for the chart */
  accessibilityLabel?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 200;
const PADDING = 40;
const BAR_SPACING = 4;
const MIN_BAR_WIDTH = 8;
const MAX_BAR_WIDTH = 40;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates min and max values from data points
 */
const getDataRange = (data: DataPoint[]): { min: number; max: number } => {
  if (data.length === 0) {
    return { min: 0, max: 100 };
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values, 0); // Include 0 in range for bar charts
  const max = Math.max(...values);
  
  // Add 10% padding to the top
  const padding = (max - min) * 0.1;
  return {
    min: Math.floor(min),
    max: Math.ceil(max + padding),
  };
};

/**
 * Calculates bar dimensions and positions
 */
const calculateBarDimensions = (
  data: DataPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number
): { x: number; y: number; width: number; height: number; point: DataPoint }[] => {
  if (data.length === 0) {
    return [];
  }

  const chartWidth = width - PADDING * 2;
  const chartHeight = height - PADDING * 2;
  const valueRange = maxValue - minValue;

  // Calculate bar width based on number of bars
  const totalSpacing = BAR_SPACING * (data.length + 1);
  const availableWidth = chartWidth - totalSpacing;
  let barWidth = availableWidth / data.length;
  
  // Clamp bar width to reasonable range
  barWidth = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, barWidth));

  return data.map((point, index) => {
    const barHeight = ((point.value - minValue) / valueRange) * chartHeight;
    const x = PADDING + BAR_SPACING + index * (barWidth + BAR_SPACING);
    const y = PADDING + chartHeight - barHeight;

    return {
      x,
      y,
      width: barWidth,
      height: barHeight,
      point,
    };
  });
};

/**
 * Gets color based on data range and accessibility mode
 */
const getColorForRange = (
  range: 'normal' | 'warning' | 'danger',
  contrast: 'normal' | 'high'
): string => {
  if (contrast === 'high') {
    // WCAG AAA compliant high contrast colors
    switch (range) {
      case 'normal':
        return '#000000'; // Black
      case 'warning':
        return '#B35900'; // Dark orange
      case 'danger':
        return '#8B0000'; // Dark red
    }
  } else {
    // Normal contrast colors
    switch (range) {
      case 'normal':
        return '#007AFF'; // Blue
      case 'warning':
        return '#FF9500'; // Orange
      case 'danger':
        return '#FF3B30'; // Red
    }
  }
};

// ============================================================================
// SimpleBarChart Component
// ============================================================================

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  unit,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  isLoading = false,
  accessibilityLabel,
}) => {
  const { settings, mode } = useAccessibility();

  // ============================================================================
  // Memoized Calculations
  // ============================================================================

  const { min, max } = useMemo(() => getDataRange(data), [data]);

  const bars = useMemo(
    () => calculateBarDimensions(data, width, height, min, max),
    [data, width, height, min, max]
  );

  // Get primary color based on overall data state
  const primaryColor = useMemo(() => {
    if (data.length === 0) return getColorForRange('normal', settings.contrast);
    
    // Use the most severe range in the dataset
    const hasDanger = data.some(d => d.range === 'danger');
    const hasWarning = data.some(d => d.range === 'warning');
    
    if (hasDanger) return getColorForRange('danger', settings.contrast);
    if (hasWarning) return getColorForRange('warning', settings.contrast);
    return getColorForRange('normal', settings.contrast);
  }, [data, settings.contrast]);

  // ============================================================================
  // Font Size Scaling
  // ============================================================================

  const fontSize = useMemo(() => {
    switch (settings.fontSize) {
      case 'small':
        return 12;
      case 'large':
        return 18;
      default:
        return 14;
    }
  }, [settings.fontSize]);

  const titleFontSize = useMemo(() => {
    switch (settings.fontSize) {
      case 'small':
        return 16;
      case 'large':
        return 22;
      default:
        return 18;
    }
  }, [settings.fontSize]);

  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <View style={[styles.container, { width, height: height + 60 }]}>
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.loadingContainer, { height }]}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { fontSize }]}>
            Loading chart data...
          </Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // Render Empty State
  // ============================================================================

  if (data.length === 0) {
    return (
      <View
        style={[styles.container, { width, height: height + 60 }]}
        accessible={true}
        accessibilityLabel={accessibilityLabel || 'Empty chart'}
        accessibilityHint="No data available to display"
      >
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={[styles.emptyText, { fontSize }]}>
            No data available
          </Text>
          <Text style={[styles.emptyHint, { fontSize: fontSize - 2 }]}>
            Upload or sync data to view chart
          </Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // Render Chart
  // ============================================================================

  const chartAccessibilityLabel = accessibilityLabel || 
    `${title || 'Bar chart'} showing ${data.length} data points`;

  return (
    <View
      style={[styles.container, { width, height: height + 60 }]}
      accessible={true}
      accessibilityLabel={chartAccessibilityLabel}
      accessibilityRole="image"
    >
      {title && (
        <Text style={[styles.title, { fontSize: titleFontSize }]}>
          {title}
        </Text>
      )}
      
      <Svg width={width} height={height}>
        {/* Y-axis */}
        <Line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={height - PADDING}
          stroke={settings.contrast === 'high' ? '#000' : '#999'}
          strokeWidth="2"
        />

        {/* X-axis */}
        <Line
          x1={PADDING}
          y1={height - PADDING}
          x2={width - PADDING}
          y2={height - PADDING}
          stroke={settings.contrast === 'high' ? '#000' : '#999'}
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        <SvgText
          x={PADDING - 10}
          y={PADDING}
          fontSize={fontSize - 2}
          fill={settings.contrast === 'high' ? '#000' : '#666'}
          textAnchor="end"
          alignmentBaseline="middle"
        >
          {max}{unit ? ` ${unit}` : ''}
        </SvgText>
        <SvgText
          x={PADDING - 10}
          y={height - PADDING}
          fontSize={fontSize - 2}
          fill={settings.contrast === 'high' ? '#000' : '#666'}
          textAnchor="end"
          alignmentBaseline="middle"
        >
          {min}{unit ? ` ${unit}` : ''}
        </SvgText>

        {/* Bars */}
        {bars.map((bar, index) => {
          const barColor = getColorForRange(bar.point.range, settings.contrast);
          const strokeColor = settings.contrast === 'high' ? '#000' : barColor;
          const strokeWidth = mode === 'simplified' ? 2 : 1;

          return (
            <Rect
              key={index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={barColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              rx={mode === 'simplified' ? 0 : 2}
            />
          );
        })}
      </Svg>

      {/* Data summary */}
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {data.length} data point{data.length !== 1 ? 's' : ''}
          {' • '}
          Range: {min} - {max}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
    padding: 20,
  },
  emptyText: {
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyHint: {
    color: '#999',
    textAlign: 'center',
  },
  summary: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default SimpleBarChart;
