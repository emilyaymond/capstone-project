import React, { useMemo, useCallback, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Vibration,
  FlatList,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useHealthData } from "@/contexts/HealthDataContext";

import { SimpleLineChart } from "@/components/charts/lineChart";
import { SimpleBarChart } from "@/components/charts/barChart";
import { ScatterPlot } from "@/components/charts/scatter";

import { HealthMetric, HealthMetricType } from "@/types/health-metric";
import { DataPoint } from "@/types";
import { BarChart } from "react-native-gifted-charts";
import { getMetricChartKind, getMetricAggregation } from "./metricConfig";

import { useAccessibility } from "@/contexts/AccessibilityContext";
import { TimeSliceRow } from "@/components/TimeSliceRow";
import { AISummary } from "@/components/ai/aiSummary";

// If you already created a helper file, you can import from it instead.
// Example: import { prettyMetricName, shouldUseBarChartForType } from "@/features/summary/utils/metricsSummary";
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

function formatTime(ts: string) {
  const d = new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  // console.log("💜time is ", d)
  return d;
}

// converts HealthMetric array to DataPoint array for chart rendering
// extracts only the essential fields (value, timestamp, range) needed for visualization, stripping away metadata like id, category, type, and unit.
function toPoints(metrics: HealthMetric[]): DataPoint[] {
  return metrics.map((m) => ({
    value: Number(m.value),
    timestamp: m.timestamp,
    range: m.range ?? "normal",
  }));
}

function computeMinMax(metrics: HealthMetric[]) {
  const vals = metrics
    .map((m) => Number(m.value))
    .filter((v) => Number.isFinite(v));
  console.log("💜in compute min max", vals);

  if (!vals.length) return { min: undefined, max: undefined };

  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function useBarChart(type: string) {
  // TODO tweak this list to match your app
  return type === "steps" || type === "calories" || type === "active_energy";
}

function formatSliceForVoiceOver(metric: HealthMetric): string {
  const start = new Date(metric.timestamp);
  const end = new Date(new Date(metric.timestamp).getTime() + 5 * 60 * 1000); // 5 min bucket
  const rangeText =
    metric.range === "danger"
      ? "high"
      : metric.range === "warning"
        ? "elevated"
        : "normal";
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} to ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, ${metric.value} beats per minute, ${rangeText} range`;
}

// 2. Map BPM to frequency (using your generate_tones.py logic)
function mapBpmToFrequency(bpm: number): number {
  // Heart rate 40-200 bpm → audible range 261 Hz (C4) to 1047 Hz (C6)
  // Scale linearly: 40 bpm → 261 Hz, 200 bpm → 1047 Hz
  return 261 + ((bpm - 40) * (1047 - 261)) / (200 - 40);
}

// 3. Play tone + haptic for a time slice
function playToneForValue(value: number, range: string) {
  const frequency = mapBpmToFrequency(value);
  const severity = range === "danger" ? 2 : range === "warning" ? 1 : 0;
  const duration = [400, 600, 800][severity];

  // TODO: hook to your generate_tones.py output
  console.log(`Play ${frequency}Hz for ${duration}ms`); // placeholder

  // Haptic works immediately
  const patterns = [[100], [200, 100], [400, 200, 400]];
  Vibration.vibrate(patterns[severity]);
}

/**
 * Aggregates data points by time buckets to reduce chart density
 * @param data - Array of health metrics
 * @param bucketSize - Size of time bucket in milliseconds
 * @returns Aggregated array with averaged values per bucket
 */

function aggregateData(
  data: HealthMetric[],
  bucketSize: number,
  aggregation: "avg" | "sum" | "latest",
): HealthMetric[] {
  if (!data.length) return [];

  const buckets = new Map<number, HealthMetric[]>();

  data.forEach((metric) => {
    const t = new Date(metric.timestamp).getTime(); // t is ms since Jan 1, 1970 00:00:00 UTC isnt that crazyyy
    const key = Math.floor(t / bucketSize) * bucketSize;
    const logTime = formatTime(t);
    //delete
    // console.log(" 👗 heart rate is ", metric.value, " at ", logTime);

    if (!buckets.has(key)) buckets.set(key, []);

    buckets.get(key)!.push(metric);
  });

  const aggregated: HealthMetric[] = [];
  buckets.forEach((metrics, key) => {
    const values = metrics.map((m) => Number(m.value)).filter(Number.isFinite);
    let value: number;

    if (aggregation === "sum") {
      value = Math.round(values.reduce((a, b) => a + b, 0));
      console.log("🧑Value: ", value);
    } else if (aggregation === "latest") {
      value = Math.round(Number(metrics[metrics.length - 1]?.value ?? 0));
      console.log("🧑‍🎤Value: ", value);
    } else {
      value = Math.round(
        values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1),
      );
      // console.log("👚Value: ", value)
    }

    const mostSevereRange = metrics.some((m) => m.range === "danger")
      ? "danger"
      : metrics.some((m) => m.range === "warning")
        ? "warning"
        : "normal";

    aggregated.push({
      ...metrics[0],
      value: Math.round(value),
      timestamp: new Date(key).toISOString(),
      range: mostSevereRange,
    });
  });

  return aggregated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export default function MetricDetailScreen() {
  const { settings } = useAccessibility();
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { healthMetrics, refreshData } = useHealthData();

  const [timeRange, setTimeRange] = React.useState<
    "H" | "D" | "W" | "M" | "6M" | "Y"
  >("D");

  // Refresh data when switching to weekly view to ensure we have data from 6 days ago
  React.useEffect(() => {
    if (timeRange === "W") {
      console.log(
        "📅 Switching to weekly view - checking if refresh needed...",
      );
      // Only refresh if we don't have data old enough
      const now = new Date();
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      console.log(`📅 Six days ago would be: ${sixDaysAgo.toLocaleString()}`);

      // Check if earliest data is newer than 6 days ago
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

        console.log(
          `📅 Earliest data in cache: ${earliestDate.toLocaleString()}`,
        );
        console.log(
          `📅 Is earliest (${earliestDate.getTime()}) > sixDaysAgo (${sixDaysAgo.getTime()})? ${earliestDate > sixDaysAgo}`,
        );

        if (earliestDate > sixDaysAgo) {
          console.log("⚠️ Data too recent, refreshing to get older data...");
          refreshData();
        } else {
          console.log("✅ Cache has data old enough for weekly view");
        }
      } else {
        console.log("⚠️ No data in cache, triggering refresh...");
        refreshData();
      }
    }
  }, [timeRange]);

  const metricType = String(type ?? "") as HealthMetricType;
  const title = prettyName(metricType);
  const agg = getMetricAggregation(metricType); //looks up how that metric should be combined inside each time bucket, and passes that choice into your aggregateData helper

  // Flatten all categories into one array (same as SummaryScreen did)
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

  // filters and sorts all health data to get only the data points for the specific metric being viewed
  const allDataForType: HealthMetric[] = useMemo(() => {
    const filtered = all
      .filter((m) => m.type === metricType) // filters the complete health data array to keep only metrics matching the current type
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ); // sorts the filtered data chronologically (oldest to newest) by converting timestamps to milliseconds and comparing them

    // delete////
    console.log(
      `[${metricType}] Total data points available:`,
      filtered.length,
    );

    if (filtered.length > 0) {
      console.log(
        `[${metricType}] Earliest ${metricType} data: ${new Date(filtered[0].timestamp).toLocaleString()}`,
      );
      console.log(
        `[${metricType}] Latest ${metricType} data: ${new Date(filtered[filtered.length - 1].timestamp).toLocaleString()}`,
      );
    }
    // delete////

    return filtered;
  }, [all, metricType]);

  // Filter data based on selected time range
  const data: HealthMetric[] = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "H": // Last hour
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "D": // From 12AM today
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
      case "W": // Last week
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        console.log(`📅 Weekly startDate: ${startDate.toLocaleString()}`);
        console.log(`📅 Now: ${now.toLocaleString()}`);
        break;
      case "M": // Last month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "6M": // Last 6 months
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "Y": // Last year
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Log the earliest data available before filtering
    if (allDataForType.length > 0) {
      console.log(
        `📊 Earliest available data: ${new Date(allDataForType[0].timestamp).toLocaleString()}`,
      );
      console.log(
        `📊 Latest available data: ${new Date(allDataForType[allDataForType.length - 1].timestamp).toLocaleString()}`,
      );
    }

    // takes allfordatatype and only gets time range requested
    const filtered = allDataForType.filter(
      (m) => new Date(m.timestamp).getTime() >= startDate.getTime(),
    );
    console.log(
      `[${metricType}] After time range filter (${timeRange}):`,
      filtered.length,
      "points",
    );

    if (filtered.length > 0) {
      console.log(
        `📅 Earliest data point: ${new Date(filtered[0].timestamp).toLocaleString()}`,
      );
      console.log(
        `📅 Latest data point: ${new Date(filtered[filtered.length - 1].timestamp).toLocaleString()}`,
      );
    }

    // Aggregate data based on time range to reduce chart density
    let bucketSize: number;
    switch (timeRange) {
      case "H": // Show every data point for last hour
        console.log(`[${metricType}] No aggregation for hourly view`);
        return filtered;
      case "D": // Aggregate to ~5 minute buckets (288 max points)
        bucketSize = 5 * 60 * 1000;
        break;
      case "W": // Aggregate to ~30 minute buckets (336 max points)
        bucketSize = 30 * 60 * 1000;
        break;
      case "M": // Aggregate to ~2 hour buckets (360 max points)
        bucketSize = 2 * 60 * 60 * 1000;
        break;
      case "6M": // Aggregate to ~12 hour buckets (360 max points)
        bucketSize = 12 * 60 * 60 * 1000;
        break;
      case "Y": // Aggregate to ~1 day buckets (365 max points)
        bucketSize = 24 * 60 * 60 * 1000;
        break;
      default:
        bucketSize = 5 * 60 * 1000;
    }

    const aggregated = aggregateData(filtered, bucketSize, agg);
    console.log(
      `[${metricType}] After aggregation (bucket: ${bucketSize}ms):`,
      aggregated.length,
      "points",
    );

    return aggregated;
  }, [allDataForType, timeRange, agg]);

  const latest = data.length ? data[data.length - 1] : undefined; // last point in array
  const { min, max } = useMemo(() => computeMinMax(data), [data]);

  const points = useMemo(() => toPoints(data), [data]);
  const chartKind = getMetricChartKind(metricType);

  // Calculate key stats for highlights
  const keyStats = useMemo(() => {
    if (data.length === 0 || min == null || max == null) return null;

    const values = data.map((d) => Number(d.value)).filter(Number.isFinite);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate variability
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Count outliers and elevated readings
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

  // Simple “highlight” text (you can replace later with smarter logic)
  const highlightText = useMemo(() => {
    if (!latest || min == null || max == null)
      return "No highlight available yet.";
    const unit = latest.unit ?? "";
    return `Your ${title.toLowerCase()} ranged from ${Math.round(min)} to ${Math.round(max)} ${unit} ${timeRange === "H" ? "in the last hour" : timeRange === "D" ? "today" : timeRange === "W" ? "this week" : timeRange === "M" ? "this month" : timeRange === "6M" ? "in the last 6 months" : "this year"}.`;
  }, [latest, min, max, title, timeRange]);

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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header row (back + title + plus button placeholder) */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => {
              console.log("Back button pressed");
              router.back();
            }}
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

        {/* Time Range Selector */}
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

        {/* Range block */}
        <View style={styles.rangeBlock}>
          <ThemedText style={styles.rangeLabel}>RANGE</ThemedText>
          <ThemedText style={styles.rangeValue}>
            {min != null && max != null
              ? `${Math.round(min)}–${Math.round(max)}`
              : "—"}
            {latest?.unit ? ` ${latest.unit}` : ""}
          </ThemedText>
          <ThemedText style={styles.rangeSub}>{rangeSubtitle}</ThemedText>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          {points.length ? (
            chartKind === "scatter" ? (
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

        {/* Latest row */}
        <View style={styles.latestRow}>
          <ThemedText style={styles.latestLeft}>
            Latest: {latest ? formatTime(latest.timestamp) : "—"}
          </ThemedText>
          <ThemedText style={styles.latestRight}>
            {latest ? `${latest.value} ${latest.unit ?? ""}` : "—"}
          </ThemedText>
        </View>

        {/* CTA to “Show More Data” */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/metric/[type]/more",
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

        {/* Highlights */}
        <View style={styles.highlightsHeader}>
          <ThemedText style={styles.highlightsTitle}>Highlights</ThemedText>
        </View>

        {/* Key Stats Card */}
        {keyStats && (
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

        {/* AI Summary Card */}
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

        {/* Time Slice List - VoiceOver accessible */}
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
                  key={item.timestamp}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },

  topRow: {
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 18, fontWeight: "800" },

  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonText: { fontSize: 22, fontWeight: "900", userSelect: "none" },

  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginTop: 12,
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

  rangeBlock: { gap: 2, marginTop: 4 },
  rangeLabel: { fontSize: 12, opacity: 0.6, fontWeight: "800" },
  rangeValue: { fontSize: 40, fontWeight: "900", lineHeight: 48 },
  rangeSub: { opacity: 0.6 },

  chartCard: {
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },

  latestRow: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  latestLeft: { opacity: 0.7, fontWeight: "600" },
  latestRight: { fontWeight: "900" },

  moreButton: { paddingVertical: 4, alignItems: "center" },
  moreText: { color: "#007AFF", fontWeight: "700" },

  highlightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  highlightsTitle: { fontSize: 22, fontWeight: "900" },
  showAll: { color: "#007AFF", fontWeight: "700" },

  highlightCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  highlightTitle: { fontWeight: 800 },
  highlightBody: { fontSize: 16, fontWeight: "600" },

  aiCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },

  timeSlicesList: {
    marginTop: 12,
    gap: 8,
  },

  listHeader: {
    fontSize: 16,
    fontWeight: "800",
    opacity: 0.8,
  },
  list: {
    maxHeight: 240, // scrollable but fits screen
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
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
    opacity: 0.6,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  dangerText: {
    color: "#FF3B30",
  },
  warningText: {
    color: "#FF9500",
  },
});
