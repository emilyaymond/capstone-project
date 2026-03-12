import React, { useMemo } from "react";
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

import { HealthMetric, HealthMetricType } from "@/types/health-metric";
import { DataPoint } from "@/types";
import { getMetricChartKind, getMetricAggregation } from "./metricConfig";

import { useAccessibility } from "@/contexts/AccessibilityContext";
import { TimeSliceRow } from "@/components/TimeSliceRow";
import { AISummary } from "@/components/ai/aiSummary";
import { SleepStageBreakdown } from "@/components/SleepStageBreakdown";
import { aggregateSleepByStage, formatSleepDuration } from "@/lib/sleep-utils";

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

    const mostSevereRange = metrics.some((m) => m.range === "danger")
      ? "danger"
      : metrics.some((m) => m.range === "warning")
        ? "warning"
        : "normal";

    aggregated.push({
      ...metrics[0],
      value: Math.round(value),
      timestamp: new Date(key),
      range: mostSevereRange,
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

    return aggregateData(filtered, bucketSize, agg);
  }, [allDataForType, timeRange, agg]);

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

  return (
    <ThemedView style={styles.bg} lightColor="#F2F2F7" darkColor="#000">
      {isSleepMetric ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.circleButton}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.circleButtonText}>‹</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.screenTitle}>{title}</ThemedText>
            <View style={styles.circleButton} />
          </View>
          <View style={styles.rangeBlock}>
            <ThemedText style={styles.rangeLabel}>
              {timeRange === "D" ? "TIME ASLEEP" : "AVERAGE TIME ASLEEP"}
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
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.circleButton}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.circleButtonText}>‹</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.screenTitle}>{title}</ThemedText>
            <View style={styles.circleButton} />
          </View>

          <View style={styles.timeRangeContainer}>
            {(["H", "D", "W", "M", "6M", "Y"] as const).map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setTimeRange(range)}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${range === "H" ? "hourly" : range === "D" ? "daily" : range === "W" ? "weekly" : range === "M" ? "monthly" : range === "6M" ? "6 month" : "yearly"} data`}
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

          <View style={styles.rangeBlock}>
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
              {latest
                ? isSleepMetric
                  ? `${formatSleepDuration(Number(latest.value))} ${latest.metadata?.sleepStage || ""}`
                  : `${latest.value} ${latest.unit ?? ""}`
                : "—"}
            </ThemedText>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/metric/[type]",
                params: { type: metricType },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Show more ${title} data`}
            style={styles.moreButton}
          >
            <ThemedText style={styles.moreText}>
              Show More {title} Data
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.highlightsHeader}>
            <ThemedText style={styles.highlightsTitle}>Highlights</ThemedText>
          </View>

          {isSleepMetric && data.length > 0 && (
            <View style={styles.highlightCard}>
              <ThemedText style={styles.highlightTitle}>
                Sleep Analysis ({rangeSubtitle})
              </ThemedText>
              <SleepStageBreakdown sleepMetrics={data} />
            </View>
          )}

          {keyStats && !isSleepMetric && (
            <View style={styles.highlightCard}>
              <ThemedText style={styles.highlightTitle}>
                {title} Stats ({rangeSubtitle})
              </ThemedText>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statLabel}>Average</ThemedText>
                  <ThemedText style={styles.statValue}>
                    {keyStats.avg} {keyStats.unit}
                  </ThemedText>
                </View>
                {keyStats.outlierCount > 0 && (
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Outliers</ThemedText>
                    <ThemedText style={styles.statValue}>
                      {keyStats.outlierCount} spike
                      {keyStats.outlierCount > 1 ? "s" : ""}
                    </ThemedText>
                  </View>
                )}
                {keyStats.dangerCount > 0 && (
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>
                      High Readings
                    </ThemedText>
                    <ThemedText style={[styles.statValue, styles.dangerText]}>
                      {keyStats.dangerCount}
                    </ThemedText>
                  </View>
                )}
                {keyStats.warningCount > 0 && (
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Elevated</ThemedText>
                    <ThemedText style={[styles.statValue, styles.warningText]}>
                      {keyStats.warningCount}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

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
    color: "#6B7280",
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
    color: "#007AFF",
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
});
