/**
 * AISummary Component
 *
 * Generates AI-powered health metric summaries via the HealthVis backend.
 * Provides coach/clinician-friendly narratives about health data trends.
 *
 * The model call happens server-side: the app posts precomputed statistics and
 * never holds an API key.
 */

import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { HealthMetric } from "@/types/health-metric";
import {
  aggregateSleepByStage,
  calculateSleepEfficiency,
  calculateSleepQuality,
  formatSleepDuration,
} from "@/lib/sleep-utils";
import { getDaysInRange, type TimeRangeKey } from "@/lib/time-range";
import { generateSummary as requestSummary } from "@/lib/api-client";



interface AISummaryProps {
  data: HealthMetric[];
  metricName: string;
  timeRange: string;
  min?: number;
  max?: number;
}

/** Nights covered by a time range, for per-night sleep averages. */
function nightsInRange(timeRange: string): number {
  return getDaysInRange(timeRange as TimeRangeKey) || 1;
}

/** Returns a stage's share of total sleep as a whole percentage. */
function pctOfSleep(stage: number, totalSleep: number): number {
  return totalSleep > 0 ? Math.round((stage / totalSleep) * 100) : 0;
}

export function AISummary({
  data,
  metricName,
  timeRange,
  min,
  max,
}: AISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (data.length > 0) {
      generateSummary();
    }
  }, [data, timeRange]);

  const calculateStats = () => {
    const values = data.map((d) => Number(d.value)).filter(Number.isFinite);

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate variability (standard deviation)
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Identify outliers (values beyond 2 standard deviations)
    const outliers = values.filter((v) => Math.abs(v - avg) > 2 * stdDev);

    // Count range classifications
    const dangerCount = data.filter((d) => d.range === "danger").length;
    const warningCount = data.filter((d) => d.range === "warning").length;
    const normalCount = data.filter((d) => d.range === "normal").length;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(avg * 10) / 10,
      median: Math.round(median * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      outlierCount: outliers.length,
      dangerCount,
      warningCount,
      normalCount,
      totalReadings: values.length,
    };
  };

  const generateSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const isSleep = data[0]?.type === "sleep";

      if (isSleep) {
        // Sleep-specific summary generation
        const sleepBreakdown = aggregateSleepByStage(data);
        const sleepQuality = calculateSleepQuality(
          sleepBreakdown,
          nightsInRange(timeRange),
        );
        const sleepEfficiency = calculateSleepEfficiency(sleepBreakdown);

        const timeRangeText =
          timeRange === "D"
            ? "last night"
            : timeRange === "W"
              ? "this week"
              : timeRange === "M"
                ? "this month"
                : timeRange === "6M"
                  ? "last 6 months"
                  : "this year";

        const response = await requestSummary({
          kind: "sleep",
          time_range_text: timeRangeText,
          sleep: {
            total_in_bed: formatSleepDuration(sleepBreakdown.totalInBed),
            total_sleep: formatSleepDuration(sleepBreakdown.totalSleep),
            efficiency: sleepEfficiency,
            quality: String(sleepQuality),
            deep_sleep: formatSleepDuration(sleepBreakdown.deepSleep),
            deep_pct: pctOfSleep(sleepBreakdown.deepSleep, sleepBreakdown.totalSleep),
            rem_sleep: formatSleepDuration(sleepBreakdown.remSleep),
            rem_pct: pctOfSleep(sleepBreakdown.remSleep, sleepBreakdown.totalSleep),
            light_sleep: formatSleepDuration(sleepBreakdown.lightSleep),
            light_pct: pctOfSleep(sleepBreakdown.lightSleep, sleepBreakdown.totalSleep),
            awake: formatSleepDuration(sleepBreakdown.awake),
            sessions: data.length,
          },
        });

        setSummary(
          response.configured && response.summary
            ? response.summary
            : "AI summary is unavailable right now.",
        );
      } else {
        // Regular metric summary generation
        const stats = calculateStats();

        if (!stats) {
          setSummary("Not enough data to generate summary.");
          setLoading(false);
          return;
        }

        const unit = data[0]?.unit || "";
        const timeRangeText =
          timeRange === "H"
            ? "last hour"
            : timeRange === "D"
              ? "today"
              : timeRange === "W"
                ? "this week"
                : timeRange === "M"
                  ? "this month"
                  : timeRange === "6M"
                    ? "last 6 months"
                    : "this year";

        const response = await requestSummary({
          kind: "metric",
          time_range_text: timeRangeText,
          metric: {
            metric_name: metricName,
            unit,
            min: stats.min,
            max: stats.max,
            avg: stats.avg,
            median: stats.median,
            std_dev: stats.stdDev,
            outlier_count: stats.outlierCount,
            normal_count: stats.normalCount,
            warning_count: stats.warningCount,
            danger_count: stats.dangerCount,
            total_readings: stats.totalReadings,
          },
        });

        setSummary(
          response.configured && response.summary
            ? response.summary
            : "AI summary is unavailable right now.",
        );
      }
    } catch (err) {
      console.error("AI Summary error:", err);
      setError("Unable to generate AI summary at this time.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <ThemedText style={styles.loadingText}>
          Generating AI summary...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.summaryText}>{summary}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    opacity: 0.8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
});
