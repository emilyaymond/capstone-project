import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useHealthData } from "@/contexts/HealthDataContext";

// Use your existing chart component(s)
import { SimpleLineChart } from "@/components/SimpleLineChart";
import { SimpleBarChart } from "@/components/SimpleBarChart";

import { HealthMetric, HealthMetricType } from "@/types/health-metric";
import { DataPoint } from "@/types";
import { BarChart } from 'react-native-gifted-charts';
import { getMetricChartKind, getMetricAggregation } from "./metricConfig";


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
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  const vals = metrics.map((m) => Number(m.value)).filter((v) => Number.isFinite(v));
  if (!vals.length) return { min: undefined, max: undefined };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function useBarChart(type: string) {
  // tweak this list to match your app
  return type === "steps" || type === "calories" || type === "active_energy";
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
  aggregation: "avg" | "sum" | "latest"
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
    if (aggregation === "sum") value = values.reduce((a, b) => a + b, 0);
    else if (aggregation === "latest") value = Number(metrics[metrics.length - 1]?.value ?? 0);
    else value = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);

    const mostSevereRange =
      metrics.some((m) => m.range === "danger") ? "danger" :
      metrics.some((m) => m.range === "warning") ? "warning" : "normal";

    aggregated.push({
      ...metrics[0],
      value: Math.round(value),
      timestamp: new Date(key).toISOString(),
      range: mostSevereRange,
    });
  });

  return aggregated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}


export default function MetricDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { healthMetrics } = useHealthData();

  const [timeRange, setTimeRange] = React.useState<'H' | 'D' | 'W' | 'M' | '6M' | 'Y'>('D');

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
    return all
      .filter((m) => m.type === metricType) // filters the complete health data array to keep only metrics matching the current type
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // sorts the filtered data chronologically (oldest to newest) by converting timestamps to milliseconds and comparing them
  }, [all, metricType]);

  // Filter data based on selected time range
  const data: HealthMetric[] = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'H': // Last hour
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'D': // Last day (24 hours)
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'W': // Last week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'M': // Last month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6M': // Last 6 months
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'Y': // Last year
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    
    const filtered = allDataForType.filter((m) => new Date(m.timestamp).getTime() >= startDate.getTime());

    // Aggregate data based on time range to reduce chart density
    let bucketSize: number;
    switch (timeRange) {
      case 'H': // Show every data point for last hour
        return filtered;
      case 'D': // Aggregate to ~5 minute buckets (288 max points)
        bucketSize = 5 * 60 * 1000;
        break;
      case 'W': // Aggregate to ~30 minute buckets (336 max points)
        bucketSize = 30 * 60 * 1000;
        break;
      case 'M': // Aggregate to ~2 hour buckets (360 max points)
        bucketSize = 2 * 60 * 60 * 1000;
        break;
      case '6M': // Aggregate to ~12 hour buckets (360 max points)
        bucketSize = 12 * 60 * 60 * 1000;
        break;
      case 'Y': // Aggregate to ~1 day buckets (365 max points)
        bucketSize = 24 * 60 * 60 * 1000;
        break;
      default:
        bucketSize = 5 * 60 * 1000;
    }

    return aggregateData(filtered, bucketSize, agg);
  }, [allDataForType, timeRange]);

  const latest = data.length ? data[data.length - 1] : undefined;
  const { min, max } = useMemo(() => computeMinMax(data), [data]);

  const points = useMemo(() => toPoints(data), [data]);
  const showBar = getMetricChartKind(metricType) === "bar";
  

  // Simple “highlight” text (you can replace later with smarter logic)
  const highlightText = useMemo(() => {
    if (!latest || min == null || max == null) return "No highlight available yet.";
    const unit = latest.unit ?? "";
    return `Your ${title.toLowerCase()} ranged from ${Math.round(min)} to ${Math.round(max)} ${unit} ${timeRange === 'H' ? 'in the last hour' : timeRange === 'D' ? 'today' : timeRange === 'W' ? 'this week' : timeRange === 'M' ? 'this month' : timeRange === '6M' ? 'in the last 6 months' : 'this year'}.`;
  }, [latest, min, max, title, timeRange]);

  const rangeSubtitle = useMemo(() => {
    switch (timeRange) {
      case 'H': return 'Last Hour';
      case 'D': return 'Today';
      case 'W': return 'This Week';
      case 'M': return 'This Month';
      case '6M': return 'Last 6 Months';
      case 'Y': return 'This Year';
      default: return 'Today';
    }
  }, [timeRange]);


  return (
    <ThemedView style={styles.bg} lightColor="#F2F2F7" darkColor="#000">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header row (back + title + plus button placeholder) */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => {
              console.log('Back button pressed');
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
          {(['H', 'D', 'W', 'M', '6M', 'Y'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show ${range === 'H' ? 'hourly' : range === 'D' ? 'daily' : range === 'W' ? 'weekly' : range === 'M' ? 'monthly' : range === '6M' ? '6 month' : 'yearly'} data`}
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
            {min != null && max != null ? `${Math.round(min)}–${Math.round(max)}` : "—"}
            {latest?.unit ? ` ${latest.unit}` : ""}
          </ThemedText>
          <ThemedText style={styles.rangeSub}>{rangeSubtitle}</ThemedText>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          {points.length ? (
            showBar ? (
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
                width={352}
                height={260}
                accessibilityLabel={`${title} line chart`}
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
          <ThemedText style={styles.moreText}>Show More {title} Data</ThemedText>
        </TouchableOpacity>

        {/* Highlights */}
        <View style={styles.highlightsHeader}>
          <ThemedText style={styles.highlightsTitle}>Highlights</ThemedText>
          <ThemedText style={styles.showAll}>Show All</ThemedText>
        </View>

        <View style={styles.highlightCard}>
          <ThemedText style={styles.highlightTitle}>{title}: Today</ThemedText>
          <ThemedText style={styles.highlightBody}>{highlightText}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },

  topRow: { paddingTop: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
    borderRadius: 14,
    padding: 16,
    alignItems: "flex-start",
    marginTop: 4,
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

  moreButton: { paddingVertical: 10, alignItems: "center" },
  moreText: { color: "#007AFF", fontWeight: "700" },

  highlightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  highlightsTitle: { fontSize: 22, fontWeight: "900" },
  showAll: { color: "#007AFF", fontWeight: "700" },

  highlightCard: { backgroundColor: "white", borderRadius: 14, padding: 16, gap: 8 },
  highlightTitle: { fontWeight: "800" },
  highlightBody: { fontSize: 16, fontWeight: "600" },



});