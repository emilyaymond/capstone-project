import React, { useMemo, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Vibration,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useHealthData } from "@/contexts/HealthDataContext";

import { SimpleLineChart } from "@/components/charts/lineChart";
import { SimpleBarChart } from "@/components/charts/barChart";
import { ScatterPlot } from "@/components/charts/scatter";
import { SleepChart } from "@/components/charts/sleepChart";

import {
  HealthMetric,
  HealthMetricType,
  classifyRange,
  hasDefinedRange,
} from "@/types/health-metric";
import { DataPoint } from "@/types";
import { getMetricChartKind, getMetricAggregation } from "./metricConfig";

import { useAccessibility } from "@/contexts/AccessibilityContext";
import { AccessibleButton } from "@/components/AccessibleButton";
import { TimeSliceRow } from "@/components/TimeSliceRow";
import { AISummary } from "@/components/ai/aiSummary";
import { SleepStageBreakdown } from "@/components/SleepStageBreakdown";
import { aggregateSleepByStage, formatSleepDuration } from "@/lib/sleep-utils";
import {
  announceNavigation,
  announceDataUpdate,
  announce,
} from "@/lib/announcer";
import { TOUCH_TARGET_SIZES } from "@/constants/accessibility";

function prettyName(type: string) {
  switch (type) {
    case "heart_rate":
      return "Heart Rate";
    case "steps":
      return "Steps";
    case "sleep":
      return "Sleep";
    default:
      return type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatTime(ts: string | Date) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toPoints(metrics: HealthMetric[]): DataPoint[] {
  return metrics.map((m) => ({
    value: Number(m.value),
    timestamp: new Date(m.timestamp),
    range: m.range ?? "normal",
  }));
}

function computeMinMax(metrics: HealthMetric[]) {
  const vals = metrics
    .map((m) => Number(m.value))
    .filter((v) => Number.isFinite(v));

  if (!vals.length) return { min: undefined, max: undefined };

  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function formatSliceForVoiceOver(metric: HealthMetric): string {
  const start = new Date(metric.timestamp);

  if (metric.type === "sleep") {
    const duration = formatSleepDuration(Number(metric.value));
    const stage = metric.metadata?.sleepStage || "Sleep";
    return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, ${stage}, ${duration}`;
  }

  const end = new Date(new Date(metric.timestamp).getTime() + 5 * 60 * 1000);
  const rangeText =
    metric.range === "danger"
      ? "high"
      : metric.range === "warning"
        ? "elevated"
        : "normal";
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} to ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, ${metric.value} ${metric.unit || "beats per minute"}, ${rangeText} range`;
}

function mapBpmToFrequency(bpm: number): number {
  return 261 + ((bpm - 40) * (1047 - 261)) / (200 - 40);
}

function playToneForValue(value: number, range: string) {
  const frequency = mapBpmToFrequency(value);
  const severity = range === "danger" ? 2 : range === "warning" ? 1 : 0;
  const duration = [400, 600, 800][severity];

  console.log(`Play ${frequency}Hz for ${duration}ms`);

  const patterns = [[100], [200, 100], [400, 200, 400]];
  Vibration.vibrate(patterns[severity]);
}

function aggregateData(
  data: HealthMetric[],
  bucketSize: number,
  aggregation: "avg" | "sum" | "latest",
): HealthMetric[] {
  if (!data.length) return [];

  const buckets = new Map<number, HealthMetric[]>();

  data.forEach((metric) => {
    const t = new Date(metric.timestamp).getTime();
    const key = Math.floor(t / bucketSize) * bucketSize;

    if (!buckets.has(key)) buckets.set(key, []);

    buckets.get(key)!.push(metric);
  });

  const aggregated: HealthMetric[] = [];
  buckets.forEach((metrics, key) => {
    const values = metrics.map((m) => Number(m.value)).filter(Number.isFinite);
    let value: number;

    if (aggregation === "sum") {
      value = Math.round(values.reduce((a, b) => a + b, 0));
    } else if (aggregation === "latest") {
      value = Math.round(Number(metrics[metrics.length - 1]?.value ?? 0));
    } else {
      value = Math.round(
        values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1),
      );
    }

    // Recalculate range based on the aggregated value, not the most severe in bucket
    const metricType = metrics[0].type;
    const range = hasDefinedRange(metricType)
      ? classifyRange(metricType, value)
      : undefined;

    aggregated.push({
      ...metrics[0],
      value: Math.round(value),
      timestamp: new Date(key),
      range,
    });
  });

  return aggregated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export default function MetricDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { healthMetrics, refreshData } = useHealthData();
  const { mode, settings } = useAccessibility();

  const [timeRange, setTimeRange] = React.useState<
    "H" | "D" | "W" | "M" | "6M" | "Y"
  >("D");

  React.useEffect(() => {
    if (timeRange === "W") {
      const now = new Date();
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      const allMetrics = [
        ...healthMetrics.vitals,
        ...healthMetrics.activity,
        ...healthMetrics.body,
        ...healthMetrics.nutrition,
        ...healthMetrics.sleep,
        ...healthMetrics.mindfulness,
      ];

      if (allMetrics.length > 0) {
        const earliestTimestamp = Math.min(
          ...allMetrics.map((m) => new Date(m.timestamp).getTime()),
        );
        const earliestDate = new Date(earliestTimestamp);

        if (earliestDate > sixDaysAgo) {
          refreshData();
        }
      } else {
        refreshData();
      }
    }
  }, [timeRange]);

  const metricType = String(type ?? "") as HealthMetricType;
  const title = prettyName(metricType);
  const agg = getMetricAggregation(metricType);

  // Announce screen navigation on mount
  useEffect(() => {
    announceNavigation(`${title} detail screen. ${rangeSubtitle}.`);
  }, [title]);

  const all: HealthMetric[] = useMemo(() => {
    return [
      ...healthMetrics.vitals,
      ...healthMetrics.activity,
      ...healthMetrics.body,
      ...healthMetrics.nutrition,
      ...healthMetrics.sleep,
      ...healthMetrics.mindfulness,
    ];
  }, [healthMetrics]);

  const allDataForType: HealthMetric[] = useMemo(() => {
    const filtered = all
      .filter((m) => m.type === metricType)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    return filtered;
  }, [all, metricType]);

  const data: HealthMetric[] = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "H":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "D":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        );
        break;
      case "W":
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        break;
      case "M":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case "6M":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "Y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const filtered = allDataForType.filter(
      (m) => new Date(m.timestamp).getTime() >= startDate.getTime(),
    );

    let bucketSize: number;

    // Don't aggregate sleep data - show raw samples
    if (metricType === "sleep") {
      return filtered;
    } else {
      switch (timeRange) {
        case "H":
          return filtered;
        case "D":
          bucketSize = 5 * 60 * 1000;
          break;
        case "W":
          bucketSize = 30 * 60 * 1000;
          break;
        case "M":
          bucketSize = 2 * 60 * 60 * 1000;
          break;
        case "6M":
          bucketSize = 12 * 60 * 60 * 1000;
          break;
        case "Y":
          bucketSize = 24 * 60 * 60 * 1000;
          break;
        default:
          bucketSize = 5 * 60 * 1000;
      }
    }
    return aggregateData(filtered, bucketSize, agg);
  }, [allDataForType, timeRange, agg]);

  // Log sleep data for debugging
  React.useEffect(() => {
    if (metricType === "sleep") {
      console.log(`🛌 Sleep data for ${timeRange}: ${data.length} samples`);
      if (data.length > 0 && data.length <= 20) {
        data.forEach((d, i) => {
          console.log(
            `  ${i}: ${d.metadata?.sleepStage} - ${d.metadata?.durationMinutes}min at ${new Date(d.timestamp).toLocaleTimeString()}`,
          );
        });
      }
    }
  }, [data, metricType, timeRange]);

  const latest = data.length ? data[data.length - 1] : undefined;
  const { min, max } = useMemo(() => computeMinMax(data), [data]);

  // Special handling for sleep metrics
  const isSleepMetric = metricType === "sleep";
  const sleepBreakdown = useMemo(() => {
    if (isSleepMetric && data.length > 0) {
      return aggregateSleepByStage(data);
    }
    return null;
  }, [isSleepMetric, data]);

  const points = useMemo(() => toPoints(data), [data]);
  const chartKind = getMetricChartKind(metricType);

  const keyStats = useMemo(() => {
    if (data.length === 0 || min == null || max == null) return null;

    const values = data.map((d) => Number(d.value)).filter(Number.isFinite);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    const outliers = values.filter((v) => Math.abs(v - avg) > 2 * stdDev);
    const dangerCount = data.filter((d) => d.range === "danger").length;
    const warningCount = data.filter((d) => d.range === "warning").length;

    return {
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      outlierCount: outliers.length,
      dangerCount,
      warningCount,
      unit: latest?.unit ?? "",
    };
  }, [data, min, max, latest]);

  const rangeSubtitle = useMemo(() => {
    switch (timeRange) {
      case "H":
        return "Last Hour";
      case "D":
        return "Today";
      case "W":
        return "This Week";
      case "M":
        return "This Month";
      case "6M":
        return "Last 6 Months";
      case "Y":
        return "This Year";
      default:
        return "Today";
    }
  }, [timeRange]);

  // Handle time range changes with announcements
  const handleTimeRangeChange = (range: typeof timeRange) => {
    setTimeRange(range);
    const rangeText =
      range === "H"
        ? "last hour"
        : range === "D"
          ? "today"
          : range === "W"
            ? "this week"
            : range === "M"
              ? "this month"
              : range === "6M"
                ? "last 6 months"
                : "this year";
    announceDataUpdate(`Showing ${rangeText} data`);
  };

  // Announce data updates
  useEffect(() => {
    if (data.length > 0) {
      const dataDescription = isSleepMetric
        ? `${data.length} sleep segments`
        : `${data.length} data points`;
      announce(`Loaded ${dataDescription} for ${rangeSubtitle}`);
    }
  }, [data.length, rangeSubtitle, isSleepMetric]);

  // Calculate touch target size based on mode
  const touchTargetSize =
    mode === "simplified"
      ? TOUCH_TARGET_SIZES.simplified
      : TOUCH_TARGET_SIZES.minimum;

  return (
    <ThemedView style={styles.bg} lightColor="#F2F2F7" darkColor="#000">
      {isSleepMetric ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <AccessibleButton
              label="Back"
              hint="Return to previous screen"
              onPress={() => router.back()}
              variant="secondary"
              style={{
                ...styles.circleButton,
                minWidth: touchTargetSize,
                minHeight: touchTargetSize,
              }}
            >
              <ThemedText style={styles.circleButtonText}>‹</ThemedText>
            </AccessibleButton>
            <ThemedText style={styles.screenTitle}>{title}</ThemedText>
            <View style={styles.circleButton} />
          </View>

          <View style={styles.timeRangeContainer}>
            {(["D", "W", "M", "6M", "Y"] as const).map((range) => (
              <AccessibleButton
                key={range}
                label={`Show ${
                  range === "D"
                    ? "daily"
                    : range === "W"
                      ? "weekly"
                      : range === "M"
                        ? "monthly"
                        : range === "6M"
                          ? "6 month"
                          : "yearly"
                } sleep data`}
                hint={`View sleep data for ${
                  range === "D"
                    ? "today"
                    : range === "W"
                      ? "this week"
                      : range === "M"
                        ? "this month"
                        : range === "6M"
                          ? "the last 6 months"
                          : "this year"
                }`}
                onPress={() => handleTimeRangeChange(range)}
                variant="secondary"
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 0,
                  borderRadius: 7,
                  backgroundColor:
                    timeRange === range ? "#FFFFFF" : "transparent",
                  minHeight: touchTargetSize,
                  minWidth: 0,
                }}
              >
                <ThemedText
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range}
                </ThemedText>
              </AccessibleButton>
            ))}
          </View>

          <View style={styles.rangeBlock}>
            <ThemedText style={styles.rangeLabel}>
              {timeRange === "D" ? "TIME ASLEEP" : "AVERAGE TIME ASLEEP"}
            </ThemedText>
            <ThemedText style={styles.rangeValue}>
              {sleepBreakdown
                ? formatSleepDuration(sleepBreakdown.totalSleep)
                : "—"}
            </ThemedText>
            <ThemedText style={styles.rangeSub}>{rangeSubtitle}</ThemedText>
          </View>

          <View
            style={styles.sleepHeroCard}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Sleep summary. Time in bed: ${
              sleepBreakdown
                ? formatSleepDuration(
                    sleepBreakdown.totalInBed ?? sleepBreakdown.totalSleep,
                  )
                : "unknown"
            }. Sleep efficiency: ${
              sleepBreakdown?.totalInBed && sleepBreakdown.totalInBed > 0
                ? `${Math.round((sleepBreakdown.totalSleep / sleepBreakdown.totalInBed) * 100)} percent`
                : "unknown"
            }. ${data.length} sleep sessions. Latest stage: ${latest?.metadata?.sleepStage ?? "unknown"}.`}
          >
            <View style={styles.sleepHeroRow}>
              <View>
                <ThemedText style={styles.sleepHeroLabel}>In Bed</ThemedText>
                <ThemedText style={styles.sleepHeroValue}>
                  {sleepBreakdown
                    ? formatSleepDuration(
                        sleepBreakdown.totalInBed ?? sleepBreakdown.totalSleep,
                      )
                    : "—"}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={styles.sleepHeroLabel}>
                  Efficiency
                </ThemedText>
                <ThemedText style={styles.sleepHeroValue}>
                  {sleepBreakdown?.totalInBed && sleepBreakdown.totalInBed > 0
                    ? `${Math.round((sleepBreakdown.totalSleep / sleepBreakdown.totalInBed) * 100)}%`
                    : "—"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.sleepHeroDivider} />

            <View style={styles.sleepHeroRow}>
              <View>
                <ThemedText style={styles.sleepHeroLabel}>Sessions</ThemedText>
                <ThemedText style={styles.sleepHeroValue}>
                  {data.length}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={styles.sleepHeroLabel}>
                  Latest Stage
                </ThemedText>
                <ThemedText style={styles.sleepHeroValue}>
                  {latest?.metadata?.sleepStage ?? "—"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.chartCard}>
            {data.length ? (
              <SleepChart
                data={data}
                width={Dimensions.get("window").width - 35}
                height={260}
                timeRange={timeRange}
                accessibilityLabel={`${title} sleep stages chart`}
              />
            ) : (
              <ThemedText style={{ opacity: 0.6 }}>
                No sleep data yet.
              </ThemedText>
            )}
          </View>

          <View style={styles.latestRow}>
            <ThemedText style={styles.latestLeft}>
              Latest: {latest ? formatTime(latest.timestamp) : "—"}
            </ThemedText>
            <ThemedText style={styles.latestRight}>
              {latest
                ? `${formatSleepDuration(Number(latest.value))} ${latest.metadata?.sleepStage || ""}`
                : "—"}
            </ThemedText>
          </View>

          <View style={styles.highlightsHeader}>
            <ThemedText style={styles.highlightsTitle}>
              Sleep Highlights
            </ThemedText>
          </View>

          <View
            style={styles.highlightCard}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Stage breakdown for ${rangeSubtitle}`}
          >
            <ThemedText style={styles.highlightTitle}>
              Stage Breakdown ({rangeSubtitle})
            </ThemedText>
            {data.length > 0 ? (
              <SleepStageBreakdown sleepMetrics={data} />
            ) : (
              <ThemedText style={styles.emptyStateText}>
                No sleep stage data available.
              </ThemedText>
            )}
          </View>

          <View
            style={styles.highlightCard}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Sleep insights. Total sleep: ${
              sleepBreakdown
                ? formatSleepDuration(sleepBreakdown.totalSleep)
                : "unknown"
            }. Deep sleep: ${
              sleepBreakdown?.deepSleep != null
                ? formatSleepDuration(sleepBreakdown.deepSleep)
                : "unknown"
            }. Light sleep: ${
              sleepBreakdown?.lightSleep != null
                ? formatSleepDuration(sleepBreakdown.lightSleep)
                : "unknown"
            }. REM sleep: ${
              sleepBreakdown?.remSleep != null
                ? formatSleepDuration(sleepBreakdown.remSleep)
                : "unknown"
            }.`}
          >
            <ThemedText style={styles.highlightTitle}>
              Sleep Insights
            </ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>Total Sleep</ThemedText>
                <ThemedText style={styles.statValue}>
                  {sleepBreakdown
                    ? formatSleepDuration(sleepBreakdown.totalSleep)
                    : "—"}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>Deep Sleep</ThemedText>
                <ThemedText style={styles.statValue}>
                  {sleepBreakdown?.deepSleep != null
                    ? formatSleepDuration(sleepBreakdown.deepSleep)
                    : "—"}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>Light Sleep</ThemedText>
                <ThemedText style={styles.statValue}>
                  {sleepBreakdown?.lightSleep != null
                    ? formatSleepDuration(sleepBreakdown.lightSleep)
                    : "—"}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>REM Sleep</ThemedText>
                <ThemedText style={styles.statValue}>
                  {sleepBreakdown?.remSleep != null
                    ? formatSleepDuration(sleepBreakdown.remSleep)
                    : "—"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.highlightCard}>
            <ThemedText style={styles.highlightTitle}>
              AI Sleep Summary
            </ThemedText>
            <View style={styles.aiPlaceholderCard}>
              <ThemedText style={styles.aiPlaceholderText}>
                AI summary placeholder:
              </ThemedText>
              <ThemedText style={styles.aiPlaceholderSubtext}>
                Add bedtime consistency, wake trend, sleep debt, recovery score,
                and suggested patterns here.
              </ThemedText>
            </View>
            {/* Later you can replace this block with:
      <AISummary
        data={data}
        metricName="Sleep"
        timeRange={timeRange}
        min={min}
        max={max}
      />
      */}
          </View>

          <View style={styles.highlightCard}>
            <ThemedText style={styles.highlightTitle}>
              Weekly / Monthly Trend
            </ThemedText>
            <View style={styles.chartPlaceholder}>
              <ThemedText style={styles.chartPlaceholderText}>
                Placeholder for nightly sleep duration trend chart
              </ThemedText>
            </View>
          </View>

          <View style={styles.timeSlicesList}>
            <ThemedText style={styles.listHeader}>Sleep Segments</ThemedText>
            <ScrollView
              style={styles.list}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              accessibilityRole="list"
              accessibilityLabel={`${data.length} sleep segments`}
            >
              {data.slice(0, 40).map((item) => (
                <TimeSliceRow
                  key={item.timestamp.toString()}
                  metric={item}
                  onFocus={() => Vibration.vibrate(20)}
                  accessibilityLabel={formatSliceForVoiceOver(item)}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <AccessibleButton
              label="Back"
              hint="Return to previous screen"
              onPress={() => router.back()}
              variant="secondary"
              style={{
                ...styles.circleButton,
                minWidth: touchTargetSize,
                minHeight: touchTargetSize,
              }}
            >
              <ThemedText style={styles.circleButtonText}>‹</ThemedText>
            </AccessibleButton>
            <ThemedText style={styles.screenTitle}>{title}</ThemedText>
            <View style={styles.circleButton} />
          </View>

          <View style={styles.timeRangeContainer}>
            {(["H", "D", "W", "M", "6M", "Y"] as const).map((range) => (
              <AccessibleButton
                key={range}
                label={`Show ${range === "H" ? "hourly" : range === "D" ? "daily" : range === "W" ? "weekly" : range === "M" ? "monthly" : range === "6M" ? "6 month" : "yearly"} data`}
                hint={`View ${title} data for ${
                  range === "H"
                    ? "the last hour"
                    : range === "D"
                      ? "today"
                      : range === "W"
                        ? "this week"
                        : range === "M"
                          ? "this month"
                          : range === "6M"
                            ? "the last 6 months"
                            : "this year"
                }`}
                onPress={() => handleTimeRangeChange(range)}
                variant="secondary"
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 0,
                  borderRadius: 7,
                  backgroundColor:
                    timeRange === range ? "#FFFFFF" : "transparent",
                  minHeight: touchTargetSize,
                  minWidth: 0,
                }}
              >
                <ThemedText
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range}
                </ThemedText>
              </AccessibleButton>
            ))}
          </View>

          <View
            style={styles.rangeBlock}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={
              isSleepMetric && sleepBreakdown
                ? `${timeRange === "D" ? "Time asleep" : "Average time asleep"}: ${formatSleepDuration(sleepBreakdown.totalSleep)}. ${rangeSubtitle}.`
                : min != null && max != null
                  ? `Range: ${Math.round(min)} to ${Math.round(max)} ${latest?.unit ?? ""}. ${rangeSubtitle}.`
                  : `No data available for ${rangeSubtitle}`
            }
          >
            <ThemedText style={styles.rangeLabel}>
              {isSleepMetric
                ? timeRange === "D"
                  ? "TIME ASLEEP"
                  : "AVERAGE TIME ASLEEP"
                : "RANGE"}
            </ThemedText>
            <ThemedText style={styles.rangeValue}>
              {isSleepMetric && sleepBreakdown
                ? formatSleepDuration(sleepBreakdown.totalSleep)
                : min != null && max != null
                  ? `${Math.round(min)}–${Math.round(max)}`
                  : "—"}
              {!isSleepMetric && latest?.unit ? ` ${latest.unit}` : ""}
            </ThemedText>
            <ThemedText style={styles.rangeSub}>{rangeSubtitle}</ThemedText>
          </View>

          <View style={styles.chartCard}>
            {points.length ? (
              isSleepMetric ? (
                <SleepChart
                  data={data}
                  width={Dimensions.get("window").width - 35}
                  height={260}
                  timeRange={timeRange}
                  accessibilityLabel={`${title} sleep stages chart`}
                />
              ) : chartKind === "scatter" ? (
                <ScatterPlot
                  data={points}
                  title=""
                  unit={latest?.unit ?? ""}
                  width={Dimensions.get("window").width - 35}
                  height={260}
                  accessibilityLabel={`${title} scatter plot`}
                  timeRange={timeRange}
                />
              ) : chartKind === "bar" ? (
                <SimpleBarChart
                  data={points}
                  title=""
                  unit={latest?.unit ?? ""}
                  width={360}
                  height={260}
                  accessibilityLabel={`${title} bar chart`}
                />
              ) : (
                <SimpleLineChart
                  data={points}
                  title=""
                  unit={latest?.unit ?? ""}
                  width={Dimensions.get("window").width - 78}
                  height={260}
                  accessibilityLabel={`${title} line chart`}
                  timeRange={timeRange}
                />
              )
            ) : (
              <ThemedText style={{ opacity: 0.6 }}>No data yet.</ThemedText>
            )}
          </View>

          <View style={styles.latestRow}>
            <ThemedText style={styles.latestLeft}>
              Latest: {latest ? formatTime(latest.timestamp) : "—"}
            </ThemedText>
            <ThemedText style={styles.latestRight}>
              {latest ? `${latest.value} ${latest.unit ?? ""}` : "—"}
            </ThemedText>
          </View>

          <AccessibleButton
            label={`Show more ${title} data`}
            hint={`View additional ${title} metrics and details`}
            onPress={() =>
              router.push({
                pathname: "/metric/[type]",
                params: { type: metricType },
              })
            }
            variant="secondary"
            style={{
              ...styles.moreButton,
              minHeight: touchTargetSize,
            }}
          >
            <ThemedText style={styles.moreText}>
              Show More {title} Data
            </ThemedText>
          </AccessibleButton>

          <View style={styles.highlightsHeader}>
            <ThemedText style={styles.highlightsTitle}>Highlights</ThemedText>
          </View>

          {data.length > 0 && (
            <View style={styles.highlightCard}>
              <ThemedText style={styles.highlightTitle}>
                AI Health Summary
              </ThemedText>
              <AISummary
                data={data}
                metricName={title}
                timeRange={timeRange}
                min={min}
                max={max}
              />
            </View>
          )}

          {data.length > 0 && (
            <View style={styles.timeSlicesList}>
              <ThemedText style={styles.listHeader}>Time Slices</ThemedText>
              <ScrollView
                style={styles.list}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                accessibilityRole="list"
                accessibilityLabel={`${data.length} time slices for ${title}`}
              >
                {data.slice(0, 24).map((item) => (
                  <TimeSliceRow
                    key={item.timestamp.toString()}
                    metric={item}
                    onFocus={() =>
                      playToneForValue(item.value, item.range ?? "normal")
                    }
                    accessibilityLabel={formatSliceForVoiceOver(item)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },

  topRow: {
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  circleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(118,118,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },

  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(118,118,128,0.12)",
    borderRadius: 9,
    padding: 2,
    gap: 2,
    marginTop: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  timeRangeButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000ff",
  },
  timeRangeTextActive: {
    color: "#111827",
    fontWeight: "700",
  },

  rangeBlock: {
    gap: 2,
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  rangeValue: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    color: "#111111",
  },
  rangeSub: {
    fontSize: 15,
    color: "#8E8E93",
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.12)",
  },

  latestRow: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  latestLeft: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  latestRight: {
    fontSize: 13,
    color: "#111111",
    fontWeight: "600",
  },

  moreButton: {
    paddingTop: 2,
    paddingBottom: 8,
    alignItems: "center",
  },
  moreText: {
    paddingTop: 4,
    color: "#000000ff",
    fontWeight: "600",
    fontSize: 16,
  },

  highlightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  highlightsTitle: {
    fontSize: 28,
    fontWeight: "800",
    padding: 6,
  },

  highlightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.10)",
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  timeSlicesList: {
    marginTop: 8,
    gap: 8,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.8,
  },
  list: {
    maxHeight: 240,
    borderRadius: 12,
    backgroundColor: "rgba(118,118,128,0.08)",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    minWidth: "45%",
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  dangerText: { color: "#FF3B30" },
  warningText: { color: "#FF9500" },
  sleepHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.10)",
  },

  sleepHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sleepHeroLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 4,
  },

  sleepHeroValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },

  sleepHeroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(60,60,67,0.12)",
  },

  aiPlaceholderCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(118,118,128,0.08)",
    gap: 4,
  },

  aiPlaceholderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  aiPlaceholderSubtext: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  chartPlaceholder: {
    height: 180,
    borderRadius: 12,
    backgroundColor: "rgba(118,118,128,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  chartPlaceholderText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: "#8E8E93",
  },
});
