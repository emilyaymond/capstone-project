/**
 * Trends Screen
 * 
 * Displays health data trends with interactive charts.
 * Features:
 * - Weekly summaries display
 * - TouchExploreChart for interactive data exploration
 * - Chart type selector (line, bar)
 * - Time range selector (week, month, year)
 * - Integration with HealthDataContext
 * - Loading and error states
 * 
 * Requirements: 7.4, 11.1, 11.2
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessibleButton } from '@/components/AccessibleButton';
import { TouchExploreChart } from '@/components/TouchExploreChart';
import { SimpleLineChart } from '@/components/SimpleLineChart';
import { SimpleBarChart } from '@/components/SimpleBarChart';
import { useHealthData } from '@/contexts/HealthDataContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { DataPoint, ChartType, VitalSignType } from '@/types';
import { FONT_SIZES } from '@/constants/accessibility';
import { announceNavigation } from '@/lib/announcer';

// ============================================================================
// Types
// ============================================================================

type TimeRange = 'week' | 'month' | 'year';

interface WeeklySummary {
  vitalType: VitalSignType;
  average: number;
  min: number;
  max: number;
  unit: string;
  dataPoints: DataPoint[];
}

// ============================================================================
// Trends Screen Component
// ============================================================================

export default function TrendsScreen() {
  // ============================================================================
  // State
  // ============================================================================

  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('week');
  const [selectedVitalType, setSelectedVitalType] = useState<VitalSignType>('heart_rate');

  // ============================================================================
  // Contexts
  // ============================================================================

  const { vitals, isLoading, error, fetchData } = useHealthData();
  const { settings } = useAccessibility();

  // ============================================================================
  // Effects
  // ============================================================================

  // Announce screen on mount (Requirement 8.5)
  useEffect(() => {
    announceNavigation('Trends');
  }, []);

  // Fetch data on mount if not already loaded
  useEffect(() => {
    if (vitals.length === 0 && !isLoading && !error) {
      fetchData();
    }
  }, []);

  // ============================================================================
  // Computed Data
  // ============================================================================

  /**
   * Filter vitals by selected time range
   */
  const filteredVitals = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedTimeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return vitals.filter(vital => new Date(vital.timestamp) >= cutoffDate);
  }, [vitals, selectedTimeRange]);

  /**
   * Calculate weekly summaries for all vital types (Requirement 7.4)
   */
  const weeklySummaries = useMemo<WeeklySummary[]>(() => {
    const vitalTypes: VitalSignType[] = ['heart_rate', 'glucose', 'steps', 'sleep'];
    
    return vitalTypes.map(type => {
      const typeVitals = filteredVitals.filter(v => v.type === type);
      
      if (typeVitals.length === 0) {
        return {
          vitalType: type,
          average: 0,
          min: 0,
          max: 0,
          unit: getUnitForVitalType(type),
          dataPoints: [],
        };
      }

      const values = typeVitals.map(v => v.value);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      const dataPoints: DataPoint[] = typeVitals.map(v => ({
        value: v.value,
        timestamp: new Date(v.timestamp),
        range: v.range,
      }));

      return {
        vitalType: type,
        average,
        min,
        max,
        unit: getUnitForVitalType(type),
        dataPoints,
      };
    });
  }, [filteredVitals]);

  /**
   * Get data points for selected vital type
   */
  const selectedDataPoints = useMemo(() => {
    const summary = weeklySummaries.find(s => s.vitalType === selectedVitalType);
    return summary?.dataPoints || [];
  }, [weeklySummaries, selectedVitalType]);

  // ============================================================================
  // Computed Styles
  // ============================================================================

  const fontSize = FONT_SIZES[settings.fontSize];

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ActivityIndicator size="large" accessibilityLabel="Loading trends data" />
          <ThemedText style={[styles.statusText, { fontSize: fontSize.body }]}>
            Loading trends...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={[styles.errorText, { fontSize: fontSize.body }]}>
            Error loading trends: {error.message}
          </ThemedText>
          <AccessibleButton
            label="Retry"
            hint="Tap to retry loading trends data"
            onPress={fetchData}
            style={styles.retryButton}
          />
        </ThemedView>
      </ThemedView>
    );
  }

  /**
   * Render empty state
   */
  if (vitals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={[styles.statusText, { fontSize: fontSize.body }]}>
            No health data available. Upload data to see trends.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedText
          style={[styles.title, { fontSize: fontSize.title }]}
          accessibilityRole="header"
        >
          Health Trends
        </ThemedText>

        {/* Weekly Summaries Section (Requirement 7.4) */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Weekly Summary
          </ThemedText>
          
          {weeklySummaries.map(summary => (
            <ThemedView
              key={summary.vitalType}
              style={styles.summaryCard}
              accessible={true}
              accessibilityLabel={`${formatVitalTypeName(summary.vitalType)}: Average ${summary.average.toFixed(1)} ${summary.unit}, Range ${summary.min.toFixed(1)} to ${summary.max.toFixed(1)}`}
            >
              <ThemedText style={[styles.summaryTitle, { fontSize: fontSize.body }]}>
                {formatVitalTypeName(summary.vitalType)}
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { fontSize: fontSize.heading }]}>
                Avg: {summary.average.toFixed(1)} {summary.unit}
              </ThemedText>
              <ThemedText style={[styles.summaryRange, { fontSize: fontSize.label }]}>
                Range: {summary.min.toFixed(1)} - {summary.max.toFixed(1)} {summary.unit}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        {/* Time Range Selector */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Time Range
          </ThemedText>
          <ThemedView style={styles.buttonGroup}>
            <AccessibleButton
              label="Week"
              hint="Show data from the past week"
              onPress={() => setSelectedTimeRange('week')}
              variant={selectedTimeRange === 'week' ? 'primary' : 'outline'}
              style={styles.rangeButton}
            />
            <AccessibleButton
              label="Month"
              hint="Show data from the past month"
              onPress={() => setSelectedTimeRange('month')}
              variant={selectedTimeRange === 'month' ? 'primary' : 'outline'}
              style={styles.rangeButton}
            />
            <AccessibleButton
              label="Year"
              hint="Show data from the past year"
              onPress={() => setSelectedTimeRange('year')}
              variant={selectedTimeRange === 'year' ? 'primary' : 'outline'}
              style={styles.rangeButton}
            />
          </ThemedView>
        </ThemedView>

        {/* Vital Type Selector */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Select Vital Sign
          </ThemedText>
          <ThemedView style={styles.buttonGroup}>
            <AccessibleButton
              label="Heart Rate"
              hint="Show heart rate trends"
              onPress={() => setSelectedVitalType('heart_rate')}
              variant={selectedVitalType === 'heart_rate' ? 'primary' : 'outline'}
              style={styles.vitalButton}
            />
            <AccessibleButton
              label="Glucose"
              hint="Show glucose trends"
              onPress={() => setSelectedVitalType('glucose')}
              variant={selectedVitalType === 'glucose' ? 'primary' : 'outline'}
              style={styles.vitalButton}
            />
            <AccessibleButton
              label="Steps"
              hint="Show steps trends"
              onPress={() => setSelectedVitalType('steps')}
              variant={selectedVitalType === 'steps' ? 'primary' : 'outline'}
              style={styles.vitalButton}
            />
            <AccessibleButton
              label="Sleep"
              hint="Show sleep trends"
              onPress={() => setSelectedVitalType('sleep')}
              variant={selectedVitalType === 'sleep' ? 'primary' : 'outline'}
              style={styles.vitalButton}
            />
          </ThemedView>
        </ThemedView>

        {/* Chart Type Selector (Requirement 11.1) */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Chart Type
          </ThemedText>
          <ThemedView style={styles.buttonGroup}>
            <AccessibleButton
              label="Line Chart"
              hint="Display data as a line chart"
              onPress={() => setSelectedChartType('line')}
              variant={selectedChartType === 'line' ? 'primary' : 'outline'}
              style={styles.chartTypeButton}
            />
            <AccessibleButton
              label="Bar Chart"
              hint="Display data as a bar chart"
              onPress={() => setSelectedChartType('bar')}
              variant={selectedChartType === 'bar' ? 'primary' : 'outline'}
              style={styles.chartTypeButton}
            />
          </ThemedView>
        </ThemedView>

        {/* Visual Chart (Requirement 11.1) */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Visual Chart
          </ThemedText>
          {selectedDataPoints.length > 0 ? (
            <ThemedView style={styles.chartContainer}>
              {selectedChartType === 'line' ? (
                <SimpleLineChart
                  data={selectedDataPoints}
                  width={Platform.OS === 'web' ? 600 : 350}
                  height={250}
                  title={`${formatVitalTypeName(selectedVitalType)} - ${selectedTimeRange}`}
                />
              ) : (
                <SimpleBarChart
                  data={selectedDataPoints}
                  width={Platform.OS === 'web' ? 600 : 350}
                  height={250}
                  title={`${formatVitalTypeName(selectedVitalType)} - ${selectedTimeRange}`}
                />
              )}
            </ThemedView>
          ) : (
            <ThemedText style={[styles.noDataText, { fontSize: fontSize.body }]}>
              No data available for {formatVitalTypeName(selectedVitalType)} in the selected time range.
            </ThemedText>
          )}
        </ThemedView>

        {/* Touch-to-Explore Chart (Requirement 11.2) */}
        <ThemedView style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { fontSize: fontSize.heading }]}
            accessibilityRole="header"
          >
            Touch to Explore
          </ThemedText>
          {selectedDataPoints.length > 0 ? (
            <TouchExploreChart
              data={selectedDataPoints}
              accessibilityLabel={`Interactive chart for ${formatVitalTypeName(selectedVitalType)}`}
              accessibilityHint="Drag your finger across the chart to hear data values"
            />
          ) : (
            <ThemedText style={[styles.noDataText, { fontSize: fontSize.body }]}>
              No data available for touch exploration.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get unit string for a vital type
 */
function getUnitForVitalType(type: VitalSignType): string {
  switch (type) {
    case 'heart_rate':
      return 'bpm';
    case 'glucose':
      return 'mg/dL';
    case 'steps':
      return 'steps';
    case 'sleep':
      return 'hours';
    default:
      return '';
  }
}

/**
 * Format vital type name for display
 */
function formatVitalTypeName(type: VitalSignType): string {
  switch (type) {
    case 'heart_rate':
      return 'Heart Rate';
    case 'glucose':
      return 'Blood Glucose';
    case 'steps':
      return 'Steps';
    case 'sleep':
      return 'Sleep Duration';
    default:
      return type;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryRange: {
    opacity: 0.7,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeButton: {
    flex: 1,
    minWidth: 80,
  },
  vitalButton: {
    flex: 1,
    minWidth: 100,
  },
  chartTypeButton: {
    flex: 1,
    minWidth: 120,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  statusText: {
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 16,
  },
});
