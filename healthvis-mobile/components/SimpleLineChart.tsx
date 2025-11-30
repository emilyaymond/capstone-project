/**
 * SimpleLineChart Component
 * 
 * Visual line chart component using react-native-svg.
 * Provides visual representation of time-series data with accessibility support.
 * Includes loading states and empty data handling.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { DataPoint } from '../types';
import { useAccessibility } from '../contexts/AccessibilityContext';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface SimpleLineChartProps {
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
const POINT_RADIUS = 4;

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
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Add 10% padding to the range
  const padding = (max - min) * 0.1;
  return {
    min: Math.floor(min - padding),
    max: Math.ceil(max + padding),
  };
};

/**
 * Maps data points to SVG coordinates
 */
const mapDataToCoordinates = (
  data: DataPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number
): { x: number; y: number; point: DataPoint }[] => {
  if (data.length === 0) {
    return [];
  }

  const chartWidth = width - PADDING * 2;
  const chartHeight = height - PADDING * 2;
  const valueRange = maxValue - minValue;

  return data.map((point, index) => {
    const x = PADDING + (index / (data.length - 1 || 1)) * chartWidth;
    const y = PADDING + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return { x, y, point };
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
// SimpleLineChart Component
// ============================================================================

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
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

  const coordinates = useMemo(
    () => mapDataToCoordinates(data, width, height, min, max),
    [data, width, height, min, max]
  );

  const polylinePoints = useMemo(
    () => coordinates.map(c => `${c.x},${c.y}`).join(' '),
    [coordinates]
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
    `${title || 'Line chart'} showing ${data.length} data points`;

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
        {/* Gradient for area under line (optional visual enhancement) */}
        <Defs>
          <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={primaryColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={primaryColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

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

        {/* Line connecting data points */}
        {coordinates.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={primaryColor}
            strokeWidth={mode === 'simplified' ? 3 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {coordinates.map((coord, index) => {
          const pointColor = getColorForRange(coord.point.range, settings.contrast);
          const pointRadius = mode === 'simplified' ? POINT_RADIUS + 2 : POINT_RADIUS;
          
          return (
            <Circle
              key={index}
              cx={coord.x}
              cy={coord.y}
              r={pointRadius}
              fill={pointColor}
              stroke={settings.contrast === 'high' ? '#000' : '#fff'}
              strokeWidth={mode === 'simplified' ? 2 : 1}
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

export default SimpleLineChart;
