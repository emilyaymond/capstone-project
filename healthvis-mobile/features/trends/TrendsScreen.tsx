/**
 * TrendsScreen
 *
 * Faceted multi-metric trends view with:
 *  - Time-range picker (H / D / W / M / 6M / Y)
 *  - Horizontally-scrollable metric-selector chips
 *  - AI summary card (cross-metric comparison via OpenAI gpt-4o-mini)
 *  - One FacetedMetricChart card per selected metric
 *
 * Accessibility:
 *  - VoiceOver: each chart reads ONLY range + outliers (see FacetedMetricChart)
 *  - announceNavigation() on mount
 *  - announceForAccessibility on time-range change
 *  - All interactive elements have accessibilityRole + accessibilityLabel
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES } from "@/constants/accessibility";
import { announceNavigation } from "@/lib/announcer";

import FacetedMetricChart, {
  FacetedPoint,
} from "@/features/trends/components/FacetedMetricChart";
import TrendsAISummary, {
  SeriesSummary,
} from "@/features/trends/components/TrendsAISummary";
import ExploreModesCard from "@/features/trends/components/ExploreModesCard";
import * as Haptics from "expo-haptics";

import {
  DEFAULT_COMPARE_METRICS,
  getBucketMs,
  getStartDate,
  METRIC_CHIPS,
  METRIC_MAP,
  rangeLabel,
  TimeRangeKey,
  TIME_RANGES,
} from "@/features/trends/utils/trendConfig";

// ── aggregation helpers ───────────────────────────────────────────────────────

function bucketPoints(
  raw: { value: number; timestamp: Date }[],
  bucketMs: number,
  aggregation: "avg" | "sum" | "latest"
): FacetedPoint[] {
  if (!raw.length) return [];

  const groups = new Map<number, number[]>();
  for (const pt of raw) {
    const bucket = Math.floor(pt.timestamp.getTime() / bucketMs) * bucketMs;
    const arr = groups.get(bucket) ?? [];
    arr.push(pt.value);
    groups.set(bucket, arr);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => {
      let value: number;
      switch (aggregation) {
        case "sum":
          value = values.reduce((s, v) => s + v, 0);
          break;
        case "latest":
          value = values[values.length - 1];
          break;
        case "avg":
        default:
          value = values.reduce((s, v) => s + v, 0) / values.length;
      }
      return { value, timestamp: new Date(ts) };
    });
}

function computeSeriesSummary(
  key: string,
  label: string,
  unit: string,
  pts: FacetedPoint[]
): SeriesSummary | null {
  if (!pts.length) return null;
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  );
  const outlierCount = values.filter((v) => Math.abs(v - avg) > 2 * stdDev)
    .length;
  return { key, label, unit, min, max, avg, count: values.length, outlierCount };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function TrendsScreen() {
  const { healthMetrics, fetchData } = useHealthData();
  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("W");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    DEFAULT_COMPARE_METRICS
  );

  // Announce navigation on mount
  useEffect(() => {
    announceNavigation("Trends", "View your health metric trends");
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── time range picker ────────────────────────────────────────────────────────

  const handleTimeRangeChange = useCallback((range: TimeRangeKey) => {
    setTimeRange(range);
    AccessibilityInfo.announceForAccessibility(
      `Showing ${rangeLabel(range)} trends`
    );
  }, []);

  // ── metric chip toggle ───────────────────────────────────────────────────────

  const toggleMetric = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // must keep at least one
        const next = prev.filter((k) => k !== key);
        AccessibilityInfo.announceForAccessibility(
          `${METRIC_MAP.get(key)?.label ?? key} removed`
        );
        return next;
      } else {
        const next = [...prev, key];
        AccessibilityInfo.announceForAccessibility(
          `${METRIC_MAP.get(key)?.label ?? key} added`
        );
        return next;
      }
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // ── data aggregation ──────────────────────────────────────────────────────────

  const allRaw = useMemo(
    () => [
      ...healthMetrics.vitals,
      ...healthMetrics.activity,
      ...healthMetrics.body,
      ...healthMetrics.nutrition,
      ...healthMetrics.sleep,
      ...healthMetrics.mindfulness,
    ],
    [healthMetrics]
  );

  /**
   * For each selected metric key, returns:
   *   { chip, points: FacetedPoint[], summary: SeriesSummary | null }
   */
  const facetedSeries = useMemo(() => {
    const start = getStartDate(timeRange);
    const bucketMs = getBucketMs(timeRange);

    return selectedKeys.map((key) => {
      const chip = METRIC_MAP.get(key)!;

      // Filter raw data to the selected time window
      let filtered = allRaw.filter(
        (m) =>
          m.type === key &&
          new Date(m.timestamp).getTime() >= start.getTime()
      );

      // Sleep: drop "Awake" / "In Bed" stage entries so we only count actual
      // sleep duration, convert seconds→hours
      if (key === "sleep") {
        filtered = filtered.filter((m) => {
          const stage: string = (m.metadata as any)?.sleepStage ?? "";
          return !stage.includes("Awake") && !stage.includes("In Bed");
        });
        // HealthKit sleep entries are in seconds — convert to hours
        filtered = filtered.map((m) => ({
          ...m,
          value: typeof m.value === "number" ? m.value / 3600 : parseFloat(String(m.value)) / 3600,
        }));
      }

      const rawPoints: { value: number; timestamp: Date }[] = filtered
        .map((m) => {
          const v =
            typeof m.value === "number"
              ? m.value
              : parseFloat(String(m.value));
          if (!isFinite(v)) return null;
          return { value: v, timestamp: new Date(m.timestamp) };
        })
        .filter((p): p is { value: number; timestamp: Date } => p !== null)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const points = bucketPoints(rawPoints, bucketMs, chip.aggregation);
      const summary = computeSeriesSummary(key, chip.label, chip.unit, points);

      return { chip, points, summary };
    });
  }, [allRaw, timeRange, selectedKeys]);

  // Summaries passed to TrendsAISummary
  const aiSeries = useMemo(
    () => facetedSeries.flatMap((s) => (s.summary ? [s.summary] : [])),
    [facetedSeries]
  );

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Title */}
      <ThemedText
        style={[styles.title, { fontSize: fontSize.title }]}
        accessibilityRole="header"
      >
        Trends
      </ThemedText>

      {/* ── Time-range picker ─────────────────────────────────────────────── */}
      <View
        style={styles.timeRangePicker}
        accessibilityRole="tablist"
        accessibilityLabel="Time range selector"
      >
        {TIME_RANGES.map(({ key, label }) => {
          const isActive = timeRange === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleTimeRangeChange(key)}
              style={[styles.rangeBtn, isActive && styles.rangeBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel={`${label} view`}
              accessibilityState={{ selected: isActive }}
            >
              <ThemedText
                style={[
                  styles.rangeBtnText,
                  { fontSize: fontSize.label },
                  isActive && styles.rangeBtnTextActive,
                ]}
              >
                {key}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Metric chip selector ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
        accessibilityRole="menu"
        accessibilityLabel="Select metrics to display"
      >
        {METRIC_CHIPS.map((chip) => {
          const isSelected = selectedKeys.includes(chip.key);
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => toggleMetric(chip.key)}
              style={[
                styles.chip,
                isSelected && { backgroundColor: chip.color },
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel={`${chip.label}${isSelected ? ", selected" : ""}`}
              accessibilityState={{ selected: isSelected }}
              accessibilityHint={
                isSelected
                  ? "Double-tap to remove from trends"
                  : "Double-tap to add to trends"
              }
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { fontSize: fontSize.label },
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {chip.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── AI Trend Summary ─────────────────────────────────────────────── */}
      <TrendsAISummary timeRange={timeRange} series={aiSeries} />

      {/* ── Faceted charts — one per selected metric ─────────────────────── */}
      {facetedSeries.map(({ chip, points }) => (
        <FacetedMetricChart
          key={chip.key}
          metricKey={chip.key}
          label={chip.label}
          unit={chip.unit}
          color={chip.color}
          points={points}
          timeRange={timeRange}
        />
      ))}

      {/* ── Explore modes card ───────────────────────────────────────────── */}
      <ExploreModesCard
        onPressSonification={() => {}}
        onPressHaptics={() => {}}
      />

      {/* Bottom spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, gap: 14 },

  title: { fontWeight: "700" },

  // Time-range picker
  timeRangePicker: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  rangeBtnText: {
    fontWeight: "600",
    color: "#636366",
  },
  rangeBtnTextActive: {
    color: "#1C1C1E",
    fontWeight: "700",
  },

  // Metric chips
  chipsScroll: { flexGrow: 0 },
  chipsContent: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipText: {
    fontWeight: "600",
    color: "#3C3C43",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
});
