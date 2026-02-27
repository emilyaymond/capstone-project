import React, { useMemo } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { DataPoint } from '../../types';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import {
  VictoryChart,
  VictoryScatter,
  VictoryAxis,
  VictoryTheme,
} from 'victory-native';

// Component Props Interface

export interface ScatterPlotProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  width?: number;
  height?: number;
  isLoading?: boolean;
  accessibilityLabel?: string;
  timeRange?: 'H' | 'D' | 'W' | 'M' | '6M' | 'Y';
}

// Constants

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;

// Helper Functions

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

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  title,
  unit,
  width,
  height,
  isLoading = false,
  accessibilityLabel,
  timeRange = 'D',
}) => {
  const { settings, mode } = useAccessibility();


  // Memoized Calculations


  /*
  * Todo I have to change the daily tab to only show 24 hours of data 
  * (past 24, so if it is 11pm now it would show from 11pm yesterday) and then label the 12-6
  */
  const chartData = useMemo(() => {
    return data.map((point, idx) => {
      const d = new Date(point.timestamp);
      let label = "";
      
      // Format labels based on time range
      switch (timeRange) {
        case 'H': // Hourly - show time for all points
          label = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          break;
          
        case 'D': // Day - show 12am, 6am, 12pm, 6pm
          const hour = d.getHours();
          if (hour === 0 || hour === 6 || hour === 12 || hour === 18) {
            label = hour === 0 ? '12am' : hour === 6 ? '6am' : hour === 12 ? '12pm' : '6pm';
          }
          else
            label = `${hour}`;

          idx = hour;
          
          break;
          
        case 'W': // Weekly - show day of week
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          // Show label if it's a new day or first/last point
          if (idx === 0 || idx === data.length - 1 || 
              (idx > 0 && d.getDate() !== new Date(data[idx - 1].timestamp).getDate())) {
            label = days[d.getDay()];
          }
          break;
          
        case 'M': // Monthly - show day of month in increments of ~7
          const dayOfMonth = d.getDate();
          if (idx === 0 || idx === data.length - 1 || 
              dayOfMonth % 7 === 1 || dayOfMonth === 1) {
            label = `${dayOfMonth}`;
          }
          break;
          
        case '6M': // 6 months - show month abbreviation
          const months6 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          // Show label if it's a new month or first/last point
          if (idx === 0 || idx === data.length - 1 || 
              (idx > 0 && d.getMonth() !== new Date(data[idx - 1].timestamp).getMonth())) {
            label = months6[d.getMonth()];
          }
          break;
          
        case 'Y': // Yearly - show month abbreviation
          const monthsY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          // Show label if it's a new month or first/last point
          if (idx === 0 || idx === data.length - 1 || 
              (idx > 0 && d.getMonth() !== new Date(data[idx - 1].timestamp).getMonth())) {
            label = monthsY[d.getMonth()];
          }
          break;
      }
      
      // Get color for this specific data point based on its range
      const pointColor = getColorForRange(point.range || 'normal', settings.contrast);

      // delete
      console.log(point.timestamp, "🦺 value:", point.value, "label", label, "dataPointText:", point.value, "idx:", idx);

      return {
        x: idx,  // VictoryScatter needs x coordinate
        y: point.value,  // VictoryScatter needs y coordinate
        label,
        fill: pointColor,  // Individual point color
      };
    });
  }, [data, settings.contrast, mode, timeRange]);


  // Get primary color based on overall data state (just use normal always)
  const primaryColor = useMemo(() => {
    if (data.length === 0) return getColorForRange('normal', settings.contrast);
    return getColorForRange('normal', settings.contrast);
  }, [data, settings.contrast]);

  // Font Size Scaling

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

  // Use default dimensions if not provided
  const chartWidth = width || DEFAULT_WIDTH;
  const chartHeight = height || DEFAULT_HEIGHT;

  // Render Loading State

  if (isLoading) {
    return (
      <View style={[styles.container, { width: chartWidth, height: chartHeight + 60 }]}>
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.loadingContainer, { height: chartHeight }]}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { fontSize }]}>
            Loading chart data...
          </Text>
        </View>
      </View>
    );
  }

  // Render Empty State

  if (data.length === 0) {
    return (
      <View
        style={[styles.container, { width: chartWidth, height: chartHeight + 60 }]}
        accessible={true}
        accessibilityLabel={accessibilityLabel || 'Empty chart'}
        accessibilityHint="No data available to display"
      >
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.emptyContainer, { height: chartHeight }]}>
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

  // Render Chart
  
  const chartAccessibilityLabel = accessibilityLabel || 
    `${title || 'Scatter chart'} showing ${data.length} data points`;

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <View
      style={[styles.container, { width: chartWidth, height: chartHeight + 60 }]}
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
        <VictoryChart
            width={chartWidth}
            height={chartHeight+20}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 25, left: 40, right: 10}}
            domainPadding={{ x: 10, y: [10, 20] }}
        >
          {/* x axis */}
          <VictoryAxis
              tickFormat={(t) => {
                const point = chartData[t];
                return point?.label || 'x';
              }}
              style={{
                grid: { stroke: 'rgba(229, 229, 229, 0.5)' },
                tickLabels: { fontSize: fontSize - 2, fill: '#403e3e', angle: 0 },
                axisLabel: { fontSize: fontSize, fill: '#403e3e' },
              }}
          />
          {/* y axis */}
          <VictoryAxis
              dependentAxis
              label={() => null}
              style={{
                grid: { stroke: 'rgba(255, 255, 255, 0)' },
                tickLabels: { fontSize: fontSize - 2, fill: '#403e3e' },
                axisLabel: { fontSize: fontSize, fill: '#403e3e' },
              }}
          />
          <VictoryScatter
              data={chartData}
              style={{
                data: {
                  fill: ({ datum }) => datum.fill || primaryColor,
                },
                labels: {
                  fill: 'transparent',
                  fontSize: 0,
                },
              }}
              size={mode === 'simplified' ? 8 : 6}
              symbol="circle"
              labels={() => null}
          />
        </VictoryChart>
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
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
    chartWrapper: {
    width: '100%',
    height: '90%',
    alignItems: 'center',
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
    marginTop: 10,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
});

export default ScatterPlot;
