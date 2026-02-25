/**
 * SimpleLineChart Component
 * 
 * Visual line chart component using react-native-gifted-charts.
 * Provides visual representation of time-series data with accessibility support.
 * Includes loading states and empty data handling.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { DataPoint } from '../types';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { LineChart } from 'react-native-gifted-charts';

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

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;

// ============================================================================
// Helper Functions
// ============================================================================

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
        return '#ff0d00ff'; 
      case 'warning':
        return '#b70b0bff'; 
      case 'danger':
        return '#8B0000'; 
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

  const chartData = useMemo(() => {
    return data.map((point, idx) => {
      const d = new Date(point.timestamp);
      const label = idx === 0 || idx === data.length - 1 ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}` : "";
      
      // Get color for this specific data point based on its range
      const pointColor = getColorForRange(point.range || 'normal', settings.contrast);
      
      return {
        value: point.value,
        label,
        dataPointText: `${point.value}`,
        dataPointColor: pointColor,  // Individual point color
        dataPointRadius: mode === 'simplified' ? 6 : 4,
      };
    });
  }, [data, settings.contrast, mode]);


  // Get primary color based on overall data state (just use normal always)
  const primaryColor = useMemo(() => {
    if (data.length === 0) return getColorForRange('normal', settings.contrast);
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

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));

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
      
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={width}
          height={height}
          color={primaryColor}
          thickness={mode === 'simplified' ? 3 : 2.5}
          curved
          hideDataPoints={false}
          hideRules={false}
          rulesColor="#E5E5E5"
          xAxisColor="#E5E5E5"
          yAxisColor="#E5E5E5"
          yAxisTextStyle={{ fontSize: fontSize - 2, color: '#999' }}
          backgroundColor="transparent"
          isAnimated
          animationDuration={800}
          startFillColor={primaryColor}
          startOpacity={0.3}
          endOpacity={0.05}
          areaChart
        />
      </View>

      {/* Data summary */}
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {data.length} data point{data.length !== 1 ? 's' : ''}
          {' • '}
          Range: {minValue} - {maxValue}{unit ? ` ${unit}` : ''}
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
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
