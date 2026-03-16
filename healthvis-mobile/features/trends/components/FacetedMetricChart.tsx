/**
 * FacetedMetricChart
 *
 * Renders a single metric as a self-contained card with:
 *  - Its own line chart (area fill, color-coded by metric)
 *  - Key stats bar: min / avg / max
 *  - VoiceOver-specific accessibilityLabel that reads ONLY range + outliers
 *    (not the full chart) when the user taps the chart in VoiceOver mode
 *
 * Requirements: accessibility-first, WCAG AA
 */

import React, { useMemo } from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  AccessibilityInfo,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { ThemedText } from "@/components/themed-text";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES } from "@/constants/accessibility";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 64; // card padding × 2 + outer padding × 2

export type FacetedPoint = {
  value: number;
  timestamp: Date;
};

type Props = {
  metricKey: string;
  label: string;
  unit: string;
  color: string;
  points: FacetedPoint[];
  timeRange: string;
};

// ── stat helpers ──────────────────────────────────────────────────────────────

function computeStats(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  // Outlier = more than 2 standard deviations from mean
  const outliers = values.filter((v) => Math.abs(v - avg) > 2 * stdDev);
  return { min, max, avg, stdDev, outliers, count: values.length };
}

// ── VoiceOver accessibility label ────────────────────────────────────────────
// Reads ONLY range and outliers — nothing else.

function buildVoiceOverLabel(
  label: string,
  unit: string,
  stats: ReturnType<typeof computeStats>,
  timeRange: string,
): string {
  if (!stats) return `${label} chart. No data available.`;

  const rangeText = `Range: ${Math.round(stats.min)} to ${Math.round(stats.max)} ${unit}.`;
  const avgText = `Average: ${stats.avg.toFixed(1)} ${unit}.`;

  let outlierText = "";
  if (stats.outliers.length > 0) {
    const outlierValues = stats.outliers.map((v) => Math.round(v)).join(", ");
    outlierText =
      stats.outliers.length === 1
        ? ` 1 outlier detected at ${outlierValues} ${unit}.`
        : ` ${stats.outliers.length} outliers detected: ${outlierValues} ${unit}.`;
  } else {
    outlierText = " No outliers detected.";
  }

  return `${label} chart, ${timeRange}. ${rangeText} ${avgText}${outlierText}`;
}

// ── chart label formatter ────────────────────────────────────────────────────

function formatChartLabel(idx: number, total: number, timestamp: Date, timeRange: string): string {
  // Show a sparse set of x-axis labels to avoid clutter
  const showEvery = Math.max(1, Math.floor(total / 5));
  if (idx % showEvery !== 0 && idx !== total - 1) return "";

  switch (timeRange) {
    case "H": {
      return timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    case "D": {
      const h = timestamp.getHours();
      if (h === 0) return "12am";
      if (h === 6) return "6am";
      if (h === 12) return "12pm";
      if (h === 18) return "6pm";
      return "";
    }
    case "W": {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][timestamp.getDay()];
    }
    case "M": {
      return String(timestamp.getDate());
    }
    case "6M":
    case "Y": {
      return timestamp.toLocaleDateString([], { month: "short" });
    }
    default:
      return "";
  }
}

// ── component ────────────────────────────────────────────────────────────────

export default function FacetedMetricChart({
  metricKey,
  label,
  unit,
  color,
  points,
  timeRange,
}: Props) {
  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const values = useMemo(() => points.map((p) => p.value), [points]);
  const stats = useMemo(() => computeStats(values), [values]);

  const voiceOverLabel = useMemo(
    () => buildVoiceOverLabel(label, unit, stats, timeRange),
    [label, unit, stats, timeRange]
  );

  const chartData = useMemo(() => {
    if (!points.length) return [];
    return points.map((p, idx) => ({
      value: p.value,
      label: formatChartLabel(idx, points.length, p.timestamp, timeRange),
      dataPointColor: color,
    }));
  }, [points, timeRange, color]);

  const hasData = points.length > 0;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <ThemedText style={[styles.title, { fontSize: fontSize.body + 2 }]}>
          {label}
        </ThemedText>
        {stats && (
          <ThemedText style={[styles.countBadge, { fontSize: fontSize.label }]}>
            {stats.count} readings
          </ThemedText>
        )}
      </View>

      {/* Chart — accessibilityLabel reads range+outliers only in VoiceOver */}
      <View
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={voiceOverLabel}
        style={styles.chartWrap}
      >
        {hasData ? (
          <LineChart
            data={chartData}
            width={CHART_W}
            height={120}
            color={color}
            thickness={2}
            curved
            hideDataPoints
            areaChart
            startFillColor={color}
            startOpacity={0.25}
            endOpacity={0.02}
            hideRules={false}
            rulesColor="rgba(0,0,0,0.06)"
            xAxisColor="rgba(0,0,0,0.1)"
            yAxisColor="rgba(0,0,0,0.1)"
            yAxisTextStyle={{ fontSize: 10, color: "#8E8E93" }}
            xAxisLabelTextStyle={{ fontSize: 10, color: "#8E8E93" }}
            backgroundColor="transparent"
            isAnimated
            animationDuration={600}
            disableScroll
            // Show data point on press (gives sighted users exact values)
            focusEnabled
            showTextOnFocus
            textFontSize={11}
            textColor="#1C1C1E"
          />
        ) : (
          <View style={styles.emptyChart}>
            <ThemedText style={[styles.emptyText, { fontSize: fontSize.label }]}>
              No {label.toLowerCase()} data for this period
            </ThemedText>
          </View>
        )}
      </View>

      {/* Stats bar: min / avg / max */}
      {stats && (
        <View
          style={styles.statsRow}
          accessible={true}
          accessibilityLabel={`${label} stats: min ${Math.round(stats.min)}, average ${stats.avg.toFixed(1)}, max ${Math.round(stats.max)} ${unit}`}
        >
          <StatPill label="Min" value={Math.round(stats.min)} unit={unit} fontSize={fontSize.label} />
          <View style={styles.statDivider} />
          <StatPill label="Avg" value={parseFloat(stats.avg.toFixed(1))} unit={unit} fontSize={fontSize.label} highlight color={color} />
          <View style={styles.statDivider} />
          <StatPill label="Max" value={Math.round(stats.max)} unit={unit} fontSize={fontSize.label} />

          {stats.outliers.length > 0 && (
            <>
              <View style={styles.statDivider} />
              <View
                style={styles.outlierBadge}
                accessible={true}
                accessibilityLabel={`${stats.outliers.length} outlier${stats.outliers.length > 1 ? "s" : ""} detected`}
              >
                <ThemedText style={[styles.outlierText, { fontSize: fontSize.label - 1 }]}>
                  ⚠ {stats.outliers.length} outlier{stats.outliers.length > 1 ? "s" : ""}
                </ThemedText>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function StatPill({
  label,
  value,
  unit,
  fontSize,
  highlight,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  fontSize: number;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.statPill}>
      <ThemedText style={[styles.statLabel, { fontSize: fontSize - 1 }]}>
        {label}
      </ThemedText>
      <ThemedText
        style={[
          styles.statValue,
          { fontSize: fontSize + 1 },
          highlight && color ? { color } : undefined,
        ]}
      >
        {value}
        <ThemedText style={[styles.statUnit, { fontSize: fontSize - 2 }]}>
          {" "}{unit}
        </ThemedText>
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  title: {
    fontWeight: "700",
    color: "#1C1C1E",
    flex: 1,
  },
  countBadge: {
    color: "#8E8E93",
    fontWeight: "500",
  },
  chartWrap: {
    alignItems: "center",
  },
  emptyChart: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    width: "100%",
  },
  emptyText: {
    color: "#8E8E93",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    color: "#8E8E93",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    fontWeight: "700",
    color: "#1C1C1E",
  },
  statUnit: {
    color: "#8E8E93",
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  outlierBadge: {
    backgroundColor: "rgba(255,149,0,0.12)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  outlierText: {
    color: "#C07000",
    fontWeight: "600",
  },
});
