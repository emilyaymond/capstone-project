import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES } from "@/constants/accessibility";
import { announceNavigation } from "@/lib/announcer";

import CompareChartCard from "@/features/trends/components/CompareChartCard";
import TrendSummaryCard from "@/features/trends/components/insights";
import ExploreModesCard from "@/features/trends/components/ExploreModesCard";
import { DEFAULT_COMPARE_METRICS, TimeRangeKey } from "@/features/trends/utils/trendConfig";

export default function TrendsScreen() {
  const { healthMetrics, fetchData } = useHealthData();
  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("D");
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>(DEFAULT_COMPARE_METRICS);
//   const [compareMode, setCompareMode] = useState<"normalized" | "raw">("normalized");

  useEffect(() => {
    announceNavigation("Trends");
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for time range changes with accessibility announcement
  const handleTimeRangeChange = (range: TimeRangeKey) => {
    setTimeRange(range);
    
    // Announce the change for screen readers
    const rangeLabels: Record<TimeRangeKey, string> = {
      H: "hourly",
      D: "daily",
      W: "weekly",
      M: "monthly",
      "6M": "6 month",
      Y: "yearly",
    };
    
    console.log(`Time range changed to: ${rangeLabels[range]}`);
  };

  // You can keep this flexible: later you’ll pull from healthMetrics by key.
  const availableSeries = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'H':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const allMetrics = [
      ...healthMetrics.vitals,
      ...healthMetrics.activity,
      ...healthMetrics.body,
      ...healthMetrics.nutrition,
      ...healthMetrics.sleep,
      ...healthMetrics.mindfulness,
    ];

    // Debug: Log sleep metrics
    const sleepMetrics = healthMetrics.sleep;
    if (sleepMetrics.length > 0) {
      console.log('Sleep metrics available:', sleepMetrics.length);
      console.log('Sample sleep metric:', sleepMetrics[0]);
    }

    return selectedMetricKeys.map((key) => {
      const filtered = allMetrics
        .filter((m) => m.type === key && new Date(m.timestamp).getTime() >= startDate.getTime())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Debug: Log filtered data for each key
      if (filtered.length > 0) {
        console.log(`${key}: ${filtered.length} data points`);
        console.log(`Sample ${key} value:`, filtered[0].value, typeof filtered[0].value);
      }

      return {
        key,
        label: key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        unit: filtered[0]?.unit || "",
        points: filtered
          .map((m) => {
            // Ensure value is a valid number
            const numValue = typeof m.value === 'number' ? m.value : parseFloat(String(m.value));
            
            // Skip invalid values
            if (isNaN(numValue) || !isFinite(numValue)) {
              console.warn(`Invalid value for ${key}:`, m.value);
              return null;
            }
            
            return {
              value: numValue,
              timestamp: new Date(m.timestamp),
            };
          })
          .filter((p): p is { value: number; timestamp: Date } => p !== null),
      };
    });
  }, [healthMetrics, timeRange, selectedMetricKeys]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText style={[styles.title, { fontSize: fontSize.title }]} accessibilityRole="header">
        Trends
      </ThemedText>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['H', 'D', 'W', 'M', '6M', 'Y'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => handleTimeRangeChange(range)}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Show ${range === 'H' ? 'hourly' : range === 'D' ? 'daily' : range === 'W' ? 'weekly' : range === 'M' ? 'monthly' : range === '6M' ? '6 month' : 'yearly'} trends`}
            accessibilityState={{ selected: timeRange === range }}
          >
            <ThemedText
              style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}
            >
              {range}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <CompareChartCard
        timeRange={timeRange}
        onChangeTimeRange={setTimeRange}
        selectedMetricKeys={selectedMetricKeys}
        onChangeSelectedMetricKeys={setSelectedMetricKeys}
        // compareMode={compareMode}
        // onChangeCompareMode={setCompareMode}
        series={availableSeries}
      />

      <TrendSummaryCard
        timeRange={timeRange}
        selectedMetricKeys={selectedMetricKeys}
        // later: pass computed insight text from AI
        summaryText={null}
      />

      <ExploreModesCard
        // later: wire these to real exploration + settings
        onPressSonification={() => {}}
        onPressHaptics={() => {}}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, gap: 14 },
  title: { fontWeight: "700" },
  
  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  timeRangeButtonActive: {
    backgroundColor: "white",
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  timeRangeTextActive: {
    color: "#000",
    fontWeight: "700",
  },
});
