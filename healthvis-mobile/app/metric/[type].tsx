/**
 * MetricDetailScreen
 *
 * Universal detail view for all 23 HealthKit metrics.
 *
 * Smart hero stat:
 *   - D  → Steps/cumulative: "today's total"; avg metrics: "avg for today"
 *   - W/M/6M/Y → Steps: "avg steps/day"; Sleep: "avg sleep/night";
 *                all others: average over the period
 *
 * Accessibility:
 *   - Every interactive element has accessibilityRole + accessibilityLabel
 *   - Hero block announced as `accessibilityRole="summary"` with full context
 *   - Chart wrapper read-only (role="image") — VoiceOver skips to stats
 *   - Time-range picker uses role="tablist" + "tab" + accessibilityState
 *   - Data rows use role="list"
 *   - announceNavigation on mount, announceDataUpdate on range change
 */

import React, { useEffect, useMemo } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES, TOUCH_TARGET_SIZES } from "@/constants/accessibility";
import { announceNavigation, announceDataUpdate } from "@/lib/announcer";

import { SimpleLineChart } from "@/components/charts/lineChart";
import { SimpleBarChart } from "@/components/charts/barChart";
import { ScatterPlot, buildRangeBuckets } from "@/components/charts/scatter";
import { SleepChart } from "@/components/charts/sleepChart";
import { SleepStageBreakdown } from "@/components/SleepStageBreakdown";
import { AISummary } from "@/components/ai/aiSummary";
import { TimeSliceRow } from "@/components/TimeSliceRow";

import { HealthMetric, HealthMetricType } from "@/types/health-metric";
import { DataPoint, DataRange } from "@/types";
import {
  getBucketMs,
  getDaysInRange,
  getStartDate,
  isLongRange,
  rangeLabel,
  type TimeRangeKey,
} from "@/lib/time-range";
import {
  getMetric as getMetricConfig,
  getMetricChartKind,
  getMetricAggregation,
  classifyRange,
  hasDefinedRange,
  normalRangeText,
} from "@/lib/metric-registry";
import { aggregateSleepByStage, formatSleepDuration } from "@/lib/sleep-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type TimeRange = TimeRangeKey;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function formatTime(ts: string | Date) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(ts: string | Date) {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(ts: string | Date, range: TimeRange) {
  if (range === "H" || range === "D") return formatTime(ts);
  return formatDate(ts);
}

function toPoints(metrics: HealthMetric[]): DataPoint[] {
  return metrics.map((m) => ({
    value: Number(m.value),
    timestamp: new Date(m.timestamp),
    range: m.range ?? "normal",
  }));
}

function isActualSleepStage(m: HealthMetric): boolean {
  const stage = String(m.metadata?.sleepStage ?? "");
  return !stage.includes("Awake") && !stage.includes("In Bed");
}


/** Number of calendar days in a time range (used for avg/day calculations) */


/** Aggregate raw metrics into time-bucketed array */
function aggregateData(
  data: HealthMetric[],
  bucketSize: number,
  aggregation: "avg" | "sum" | "latest",
): HealthMetric[] {
  if (!data.length) return [];
  const buckets = new Map<number, HealthMetric[]>();
  data.forEach((m) => {
    const k =
      Math.floor(new Date(m.timestamp).getTime() / bucketSize) * bucketSize;
    const arr = buckets.get(k) ?? [];
    arr.push(m);
    buckets.set(k, arr);
  });
  const out: HealthMetric[] = [];
  buckets.forEach((metrics, key) => {
    const vals = metrics.map((m) => Number(m.value)).filter(Number.isFinite);
    let value: number;
    if (aggregation === "sum") value = vals.reduce((a, b) => a + b, 0);
    else if (aggregation === "latest")
      value = Number(metrics[metrics.length - 1]?.value ?? 0);
    else value = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    const type = metrics[0].type;
    out.push({
      ...metrics[0],
      value,
      timestamp: new Date(key),
      range: hasDefinedRange(type) ? classifyRange(type, value) : undefined,
    });
  });
  return out.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/** Format a numeric value for display (handles decimals intelligently) */
function formatValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "—";

  // Sleep hours → "7h 22m" style
  if (unit === "hr") return formatSleepDuration(value);

  // Height in inches → feet+inches
  if (unit === "in") {
    const feet = Math.floor(value / 12);
    const inches = Math.round(value % 12);
    return `${feet}′${inches}″`;
  }

  // 1+ decimal unit types
  if (["°F", "kg/m²", "%", "mi"].includes(unit)) {
    return value.toFixed(1);
  }

  // Large integers
  if (value >= 1000)
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  return String(Math.round(value));
}

/** VoiceOver-friendly row description for the data list */
function formatRowForVoiceOver(metric: HealthMetric, range: TimeRange): string {
  const ts = formatTimestamp(metric.timestamp, range);
  const val = formatValue(Number(metric.value), metric.unit ?? "");
  const unit = metric.unit ?? "";

  if (metric.type === "sleep") {
    const stage = metric.metadata?.sleepStage ?? "Sleep";
    return `${ts}: ${stage}, ${val}`;
  }

  const rangeText =
    metric.range === "danger"
      ? ", high"
      : metric.range === "warning"
        ? ", elevated"
        : "";

  return `${ts}: ${val} ${unit}${rangeText}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Range bar: coloured indicator strip */
function RangeBar({
  range,
  color,
}: {
  range: "normal" | "warning" | "danger" | undefined;
  color: string;
}) {
  if (!range) return null;
  const barColor =
    range === "danger" ? "#FF3B30" : range === "warning" ? "#FF9500" : color;
  return <View style={[styles.rangeBar, { backgroundColor: barColor }]} />;
}

/** Stat pill used in the secondary stats list */
function StatPill({
  label,
  value,
  unit,
  highlight,
  color,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
  color?: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      style={styles.statPill}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <ThemedText style={styles.statPillLabel}>{label}</ThemedText>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ThemedText
          style={[
            styles.statPillValue,
            highlight && color ? { color } : undefined,
          ]}
        >
          {value}
        </ThemedText>
        {unit && <ThemedText style={styles.statPillUnit}>{unit}</ThemedText>}
      </View>
    </View>
  );
}

/** Main stat - larger display for primary metric */
function MainStat({
  label,
  value,
  unit,
  color,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      style={styles.mainStat}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <ThemedText style={styles.mainStatLabel}>{label}</ThemedText>
      <ThemedText
        style={[styles.mainStatValue, color ? { color } : undefined]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.5}
      >
        {value}
      </ThemedText>
      <ThemedText style={styles.mainStatUnit}>{unit}</ThemedText>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MetricDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { healthMetrics, refreshData } = useHealthData();
  const { mode, settings } = useAccessibility();

  const metricType = String(type ?? "") as HealthMetricType;
  const cfg = getMetricConfig(metricType);
  const agg = getMetricAggregation(metricType);
  const chartKind = getMetricChartKind(metricType);

  const fontSize = FONT_SIZES[settings.fontSize];
  const touchTargetSize =
    mode === "simplified"
      ? TOUCH_TARGET_SIZES.simplified
      : TOUCH_TARGET_SIZES.minimum;

  const isSleep = metricType === "sleep";
  
  const [timeRange, setTimeRange] = React.useState<TimeRange>("D");

  // ── Announce navigation on mount ──────────────────────────────────────────
  useEffect(() => {
    announceNavigation(
      `${cfg.label} detail`,
      normalRangeText(metricType)
        ? `Normal range: ${normalRangeText(metricType)}`
        : undefined,
    );
  }, [cfg.label, metricType]);

  // ── Collect raw data for this metric ─────────────────────────────────────
  const allRaw: HealthMetric[] = useMemo(
    () =>
      [
        ...healthMetrics.vitals,
        ...healthMetrics.activity,
        ...healthMetrics.body,
        ...healthMetrics.nutrition,
        ...healthMetrics.sleep,
        ...healthMetrics.mindfulness,
      ]
        .filter((m) => m.type === metricType)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
    [healthMetrics, metricType],
  );

  // ── Filter + aggregate to selected time window ───────────────────────────
  const data: HealthMetric[] = useMemo(() => {
    const start = getStartDate(timeRange);
    const filtered = allRaw.filter(
      (m) => new Date(m.timestamp).getTime() >= start.getTime(),
    );

    // Sleep: return raw (SleepChart handles its own layout)
    if (isSleep) return filtered;

    // No aggregation for hourly
    if (timeRange === "H") return filtered;

    // Scatter charts handle their own bucketing for daily view
    if (chartKind === "scatter" && timeRange === "D") return filtered;

    // Width is chart-aware: scatter re-buckets its input, so it takes a finer
    // sampling resolution than the line and bar charts, which plot buckets 1:1.
    return aggregateData(filtered, getBucketMs(timeRange, chartKind), agg);
  }, [allRaw, timeRange, isSleep, agg, chartKind]);

  // ── Hero stat computation ─────────────────────────────────────────────────
  const heroValue = useMemo<string>(() => {
    if (!data.length) return "—";

    const vals = data.map((d) => Number(d.value)).filter(Number.isFinite);
    const unit = data[0]?.unit ?? cfg.unit;

    if (isSleep) {
      // Filter out Awake / In Bed for actual sleep hours
      const sleepData = allRaw
        .filter(
          (m) =>
            new Date(m.timestamp).getTime() >=
            getStartDate(timeRange).getTime(),
        )
        .filter(isActualSleepStage);

      const totalHours = sleepData.reduce((s, m) => s + Number(m.value), 0);

      if (isLongRange(timeRange)) {
        // avg per night
        const nights = getDaysInRange(timeRange);
        return formatValue(totalHours / nights, "hr");
      }
      return formatValue(totalHours, "hr");
    }

    if (cfg.longRangeHeroMode === "avg_per_day" && isLongRange(timeRange)) {
      // For sum metrics (steps, calories, etc.) in W/M/6M/Y — sum all, divide by days
      const total = vals.reduce((a, b) => a + b, 0);
      const days = getDaysInRange(timeRange);
      return formatValue(total / days, unit);
    }

    if (agg === "sum") {
      return formatValue(
        vals.reduce((a, b) => a + b, 0),
        unit,
      );
    }
    if (agg === "latest") {
      return formatValue(vals[vals.length - 1], unit);
    }
    // avg
    return formatValue(vals.reduce((a, b) => a + b, 0) / vals.length, unit);
  }, [data, allRaw, timeRange, isSleep, agg, cfg]);

  const heroLabel = useMemo<string>(() => {
    if (isLongRange(timeRange) && cfg.longRangeHeroLabel)
      return cfg.longRangeHeroLabel;
    if (isSleep)
      return timeRange === "D"
        ? "Time Asleep"
        : (cfg.longRangeHeroLabel ?? "Avg / night");
    if (cfg.dailyIsTotal && timeRange === "D") return cfg.heroLabel;
    return cfg.heroLabel;
  }, [timeRange, isSleep, cfg]);

  const points = useMemo(() => toPoints(data), [data]);

  // ── Values actually plotted on the chart ──────────────────────────────────
  // The scatter chart re-buckets `data` before drawing: on W it turns hourly
  // points into one dot per day. Deriving stats from `data` therefore described
  // a different time resolution than the chart directly below them -- on
  // Steps/W the header reported steps per active hour (avg 488, min 1, max
  // 3,888) while the chart plotted daily totals (1,947-14,315). Reuse the
  // chart's own bucketing so the two agree by construction.
  const displayedSeries = useMemo<
    { value: number; timestamp: Date; range: DataRange }[]
  >(() => {
    if (chartKind === "scatter" && timeRange !== "H") {
      return buildRangeBuckets(
        points,
        timeRange as Exclude<TimeRange, "H">,
        settings.contrast,
        new Date(),
        cfg.color,
        agg === "sum" ? "sum" : "avg",
      ).map((bucket) => ({
        value: bucket.avg,
        timestamp: new Date(bucket.endDate),
        range: bucket.severity,
      }));
    }
    return data
      .map((d) => ({
        value: Number(d.value),
        timestamp: new Date(d.timestamp),
        range: d.range ?? ("normal" as DataRange),
      }))
      .filter((d) => Number.isFinite(d.value));
  }, [
    points,
    data,
    chartKind,
    timeRange,
    agg,
    cfg.color,
    settings.contrast,
  ]);

  // ── Key stats (min / max / outliers) ───────────────────────────────────────
  const keyStats = useMemo(() => {
    const vals = displayedSeries.map((d) => d.value);
    if (!vals.length) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const stdDev = Math.sqrt(
      vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length,
    );
    // With very few buckets (a 7-point week) almost nothing sits beyond 2 sigma
    // in a meaningful sense, so only flag outliers once there is a real
    // distribution to speak of.
    const outlierCount =
      vals.length >= 8 && stdDev > 0
        ? vals.filter((v) => Math.abs(v - avg) > 2 * stdDev).length
        : 0;
    const unit = data[0]?.unit ?? cfg.unit;
    return { min, max, avg, outlierCount, unit };
  }, [displayedSeries, data, cfg]);

  // ── Sleep breakdown ────────────────────────────────────────────────────────
  const sleepBreakdown = useMemo(
    () => (isSleep && data.length ? aggregateSleepByStage(data) : null),
    [isSleep, data],
  );

  /** Reshapes the plotted series into HealthMetrics for downstream consumers. */
  const displayedMetrics = useMemo<HealthMetric[]>(() => {
    const template = data[0];
    return displayedSeries.map((point, index) => ({
      id: `${metricType}-displayed-${index}`,
      category: template?.category ?? "activity",
      type: metricType,
      value: point.value,
      timestamp: point.timestamp,
      unit: template?.unit ?? cfg.unit,
      range: point.range,
    }));
  }, [displayedSeries, data, metricType, cfg.unit]);

  const latestPoint = displayedSeries.length
    ? displayedSeries[displayedSeries.length - 1]
    : undefined;
  const latest = latestPoint
    ? {
        value: latestPoint.value,
        timestamp: latestPoint.timestamp,
        unit: data[0]?.unit ?? cfg.unit,
      }
    : undefined;
  const rangeSubtitle = rangeLabel(timeRange, "title");

  // ── Range picker options ─────────────────────────────────────────────────
  const rangeOptions: TimeRange[] = isSleep
    ? ["D", "W", "M", "6M", "Y"]
    : ["H", "D", "W", "M", "6M", "Y"];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    announceDataUpdate(
      `Showing ${rangeLabel(range, "title").toLowerCase()} data`,
    );
  };

  // ── VoiceOver hero summary ────────────────────────────────────────────────
  const heroA11yLabel = useMemo(() => {
    const parts = [
      `${cfg.label}. ${heroLabel}: ${heroValue} ${isSleep ? "" : (data[0]?.unit ?? cfg.unit)}. ${rangeSubtitle}.`,
    ];
    if (keyStats) {
      parts.push(
        `Range ${formatValue(keyStats.min, keyStats.unit)} to ${formatValue(keyStats.max, keyStats.unit)} ${keyStats.unit}.`,
      );
    }
    // Previously an early return on normalRange meant outliers were never
    // announced for any metric that defines a normal range.
    const rangeText = normalRangeText(metricType);
    if (rangeText) parts.push(`Normal range: ${rangeText}.`);
    if (keyStats?.outlierCount) {
      parts.push(
        `${keyStats.outlierCount} outlier${keyStats.outlierCount > 1 ? "s" : ""} detected.`,
      );
    }
    return parts.join(" ");
  }, [cfg, heroLabel, heroValue, data, rangeSubtitle, keyStats, isSleep]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const screenWidth = Dimensions.get("window").width;

  return (
    <ThemedView style={styles.bg} lightColor="#F2F2F7" darkColor="#000">
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Navigation row ─────────────────────────────────────────── */}
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
              backgroundColor: "transparent",
            }}
          >
            <ThemedText style={styles.circleButtonText}>‹</ThemedText>
          </AccessibleButton>

          <View style={styles.titleBlock} accessible accessibilityRole="header">
            <ThemedText
              style={[styles.screenTitle, { fontSize: fontSize.title }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {cfg.label}
            </ThemedText>
          </View>

          {/* spacer to balance back button */}
          <View style={styles.circleButton} />
        </View>

        {/* ── Time-range picker ──────────────────────────────────────── */}
        <View
          style={styles.timeRangeContainer}
          accessibilityRole="tablist"
          accessibilityLabel="Time range selector"
        >
          {rangeOptions.map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => handleRangeChange(range)}
              style={[
                styles.rangeBtn,
                { minHeight: touchTargetSize },
                timeRange === range && styles.rangeBtnActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel={rangeLabel(range, "title")}
              accessibilityState={{ selected: timeRange === range }}
            >
              <ThemedText
                style={[
                  styles.rangeBtnText,
                  { fontSize: fontSize.label },
                  timeRange === range && styles.rangeBtnTextActive,
                ]}
              >
                {range}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hero stat block ────────────────────────────────────────── */}
        <View
          style={styles.rangeBlock}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={
            keyStats
              ? `Range ${formatValue(keyStats.min, keyStats.unit)} to ${formatValue(keyStats.max, keyStats.unit)} ${keyStats.unit}. ${rangeSubtitle}.`
              : `No data available for ${rangeSubtitle}`
          }
        >
          <ThemedText style={styles.rangeSub}>{rangeSubtitle}</ThemedText>
        </View>
        {/* ── SLEEP-SPECIFIC SECTION ─────────────────────────────────── */}
        {isSleep && (
          <>
            {/* Sleep hero summary card */}
            <View
              style={styles.sleepHeroCard}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`Sleep summary. In bed: ${sleepBreakdown ? formatSleepDuration(sleepBreakdown.totalInBed ?? sleepBreakdown.totalSleep) : "unknown"}. Efficiency: ${sleepBreakdown?.totalInBed && sleepBreakdown.totalInBed > 0 ? `${Math.round((sleepBreakdown.totalSleep / sleepBreakdown.totalInBed) * 100)} percent` : "unknown"}.`}
            >
              <View style={styles.sleepHeroRow}>
                <View style={styles.sleepHeroItem}>
                  <ThemedText style={styles.sleepHeroItemLabel}>
                    In Bed
                  </ThemedText>
                  <ThemedText style={styles.sleepHeroItemValue}>
                    {sleepBreakdown
                      ? formatSleepDuration(
                          sleepBreakdown.totalInBed ??
                            sleepBreakdown.totalSleep,
                        )
                      : "—"}
                  </ThemedText>
                </View>
                <View style={styles.sleepHeroDivider} />
                <View style={styles.sleepHeroItem}>
                  <ThemedText style={styles.sleepHeroItemLabel}>
                    Efficiency
                  </ThemedText>
                  <ThemedText style={styles.sleepHeroItemValue}>
                    {sleepBreakdown?.totalInBed && sleepBreakdown.totalInBed > 0
                      ? `${Math.round((sleepBreakdown.totalSleep / sleepBreakdown.totalInBed) * 100)}%`
                      : "—"}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Sleep stage breakdown */}
            <View
              style={styles.card}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`Sleep stage breakdown for ${rangeSubtitle} Deep sleep: ${sleepBreakdown?.deepSleep != null ? formatSleepDuration(sleepBreakdown.deepSleep) : "unknown"}. Light sleep: ${sleepBreakdown?.lightSleep != null ? formatSleepDuration(sleepBreakdown.lightSleep) : "unknown"}. REM: ${sleepBreakdown?.remSleep != null ? formatSleepDuration(sleepBreakdown.remSleep) : "unknown"}.`}
            >
              <ThemedText
                style={[styles.cardTitle, { fontSize: fontSize.body + 2 }]}
              >
                Stage Breakdown
              </ThemedText>
              {data.length > 0 ? (
                <SleepStageBreakdown
                  sleepMetrics={data}
                  nights={getDaysInRange(timeRange)}
                />
              ) : (
                <ThemedText style={styles.emptyChart}>
                  No stage data available.
                </ThemedText>
              )}
            </View>

            {/* Sleep insights grid */}
            <View
              style={styles.card}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`Sleep insights. Total sleep: ${sleepBreakdown ? formatSleepDuration(sleepBreakdown.totalSleep) : "unknown"}. Deep sleep: ${sleepBreakdown?.deepSleep != null ? formatSleepDuration(sleepBreakdown.deepSleep) : "unknown"}. REM: ${sleepBreakdown?.remSleep != null ? formatSleepDuration(sleepBreakdown.remSleep) : "unknown"}. Light sleep: ${sleepBreakdown?.lightSleep != null ? formatSleepDuration(sleepBreakdown.lightSleep) : "unknown"}. awake: ${sleepBreakdown?.awake != null ? formatSleepDuration(sleepBreakdown.awake) : "unknown"}.`}
            >
              <ThemedText
                style={[styles.cardTitle, { fontSize: fontSize.body + 2 }]}
              >
                Sleep Insights
              </ThemedText>
              <View style={styles.statsGrid}>
                {[
                  {
                    label: "Total Sleep",
                    val: sleepBreakdown
                      ? formatSleepDuration(sleepBreakdown.totalSleep)
                      : "—",
                  },
                  {
                    label: "Deep Sleep",
                    val:
                      sleepBreakdown?.deepSleep != null
                        ? formatSleepDuration(sleepBreakdown.deepSleep)
                        : "—",
                  },
                  {
                    label: "Light Sleep",
                    val:
                      sleepBreakdown?.lightSleep != null
                        ? formatSleepDuration(sleepBreakdown.lightSleep)
                        : "—",
                  },
                  {
                    label: "REM",
                    val:
                      sleepBreakdown?.remSleep != null
                        ? formatSleepDuration(sleepBreakdown.remSleep)
                        : "—",
                  },
                ].map(({ label, val }) => (
                  <View
                    key={label}
                    style={styles.statItem}
                    accessible
                    accessibilityLabel={`${label}: ${val}`}
                  >
                    <ThemedText style={styles.statLabel}>{label}</ThemedText>
                    <ThemedText
                      style={[styles.statValue, { color: cfg.color }]}
                    >
                      {val}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
        {/* ── Key stats row ──────────────────────────────────────────── */}
        {!isSleep && keyStats && (
          <View style={styles.statsContainer}>
            <MainStat
              label={heroLabel}
              value={heroValue}
              unit={isSleep ? "" : keyStats.unit}
              color={cfg.color}
              accessibilityLabel={heroA11yLabel}
            />
            <View style={styles.secondaryStats}>
              <StatPill
                label="Min"
                value={formatValue(keyStats.min, keyStats.unit)}
                unit={isSleep ? "" : keyStats.unit}
                accessibilityLabel={`Minimum: ${formatValue(keyStats.min, keyStats.unit)} ${keyStats.unit}`}
              />
              <StatPill
                label="Max"
                value={formatValue(keyStats.max, keyStats.unit)}
                unit={isSleep ? "" : keyStats.unit}
                accessibilityLabel={`Maximum: ${formatValue(keyStats.max, keyStats.unit)} ${keyStats.unit}`}
              />
              {keyStats.outlierCount > 0 && (
                <StatPill
                  label="Outliers"
                  value={String(keyStats.outlierCount)}
                  unit="pts"
                  accessibilityLabel={`${keyStats.outlierCount} outlier${keyStats.outlierCount > 1 ? "s" : ""} detected`}
                />
              )}
            </View>
          </View>
        )}

        {/* ---- */}
        {/* ── Chart ──────────────────────────────────────────────────── */}
        <View
          style={styles.chartCard}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            keyStats
              ? `${cfg.label} chart for ${rangeSubtitle}. Range ${formatValue(keyStats.min, keyStats.unit)} to ${formatValue(keyStats.max, keyStats.unit)} ${keyStats.unit}.`
              : `${cfg.label} chart. No data for ${rangeSubtitle}.`
          }
        >
          {isSleep ? (
            data.length ? (
              <SleepChart
                data={data}
                width={screenWidth - 35}
                height={260}
                timeRange={timeRange}
                accessibilityLabel={`${cfg.label} chart`}
              />
            ) : (
              <ThemedText style={styles.emptyChart}>
                No sleep data for this period.
              </ThemedText>
            )
          ) : points.length ? (
            chartKind === "scatter" ? (
              <ScatterPlot
                data={points}
                title=""
                unit={data[0]?.unit ?? ""}
                width={screenWidth - 35}
                height={260}
                accessibilityLabel={`${cfg.label} scatter plot`}
                timeRange={timeRange}
                color={cfg.color}
                aggregation={agg === "latest" ? "avg" : agg}
              />
            ) : chartKind === "bar" ? (
              <SimpleBarChart
                data={points}
                title=""
                unit={data[0]?.unit ?? ""}
                width={screenWidth - 35}
                height={260}
                accessibilityLabel={`${cfg.label} bar chart`}
              />
            ) : (
              <SimpleLineChart
                data={points}
                title=""
                unit={data[0]?.unit ?? ""}
                width={screenWidth - 78}
                height={260}
                accessibilityLabel={`${cfg.label} line chart`}
                timeRange={timeRange}
              />
            )
          ) : (
            <ThemedText style={styles.emptyChart}>
              No {cfg.label.toLowerCase()} data for this period.
            </ThemedText>
          )}
        </View>

        {/* ── Latest reading ─────────────────────────────────────────── */}
        {latest && (
          <View
            style={styles.latestRow}
            accessible
            accessibilityLabel={`Latest reading: ${formatTimestamp(latest.timestamp, timeRange)}, ${formatValue(Number(latest.value), latest.unit ?? cfg.unit)} ${latest.unit ?? cfg.unit}`}
          >
            <ThemedText
              style={[styles.latestLeft, { fontSize: fontSize.label }]}
            >
              Latest · {formatTimestamp(latest.timestamp, timeRange)}
            </ThemedText>
            <ThemedText
              style={[
                styles.latestRight,
                { fontSize: fontSize.label, color: cfg.color },
              ]}
            >
              {formatValue(Number(latest.value), latest.unit ?? cfg.unit)}
              {latest.unit && !["hr"].includes(latest.unit)
                ? ` ${latest.unit}`
                : ""}
            </ThemedText>
          </View>
        )}

        {/* ── AI Summary ─────────────────────────────────────────────── */}
        {data.length > 0 && (
          <View style={styles.card}>
            <ThemedText
              style={[styles.cardTitle, { fontSize: fontSize.body + 2 }]}
            >
              {isSleep ? "AI Sleep Summary" : "AI Health Summary"}
            </ThemedText>
            <AISummary
              data={displayedMetrics}
              metricName={cfg.label}
              timeRange={timeRange}
              min={keyStats?.min}
              max={keyStats?.max}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 14, paddingTop: 56, gap: 12 },
  rangeBlock: {
    gap: 2,
    marginTop: 4,
  },
  // Navigation
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonText: { fontSize: 22, fontWeight: "600", color: "#000000ff" },
  titleBlock: { flex: 1, alignItems: "center" },
  screenTitle: {
    fontWeight: "800",
    textAlign: "center",
    paddingTop: 10,
  },
  categoryLabel: { color: "#8E8E93", marginTop: 2, textAlign: "center" },

  // Time-range picker
  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 3,
    gap: 2,
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
  rangeBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
  },
  rangeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  rangeBtnText: { fontWeight: "600", color: "#636366" },
  rangeBtnTextActive: { color: "#1C1C1E", fontWeight: "700" },

  // Hero card
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  rangeBar: {
    height: 3,
    borderRadius: 2,
    width: "100%",
    marginBottom: 8,
  },
  heroLabel: { fontWeight: "700", letterSpacing: 0.8 },
  heroValue: { fontWeight: "800", marginTop: 4 },
  heroUnit: { color: "#8E8E93", fontWeight: "500", marginTop: 2 },
  heroSub: { color: "#8E8E93", marginTop: 6 },

  // Stats container
  statsContainer: {
    flexDirection: "row",
    alignSelf: "stretch",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  mainStat: {
    alignItems: "center",
    justifyContent: "center",
    width: "30%",
    gap: 4,
    margin: 4,
    borderRightColor: "rgba(0,0,0,0.08)",
  },
  mainStatLabel: {
    fontSize: 15,
    color: "#000000ff",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mainStatValue: {
    fontSize: 60,
    fontWeight: "900",
    color: "#1C1C1E",
    lineHeight: 60,
    paddingBottom: 0,
  },
  mainStatUnit: {
    fontSize: 13,
    color: "#000000ff",
    fontWeight: "600",
    lineHeight: 13,
    padding: 0,
    paddingBottom: 0,
    margin: 0,
  },
  secondaryStats: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    justifyContent: "space-around",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 10,
    marginLeft: 4,
  },
  statPillLabel: {
    fontSize: 15,
    color: "#2e2e2eff",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  statPillUnit: {
    fontSize: 12,
    color: "#2e2e2eff",
    marginLeft: 3,
  },

  // Chart
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  emptyChart: { color: "#8E8E93", textAlign: "center", paddingVertical: 32 },

  // Latest row
  latestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  latestLeft: { color: "#636366", fontWeight: "500" },
  latestRight: { fontWeight: "700" },

  // Generic card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontWeight: "800", color: "#1C1C1E" },

  // Sleep-specific
  sleepHeroCard: {
    backgroundColor: "#F0EEF9",
    borderRadius: 20,
    padding: 16,
  },
  sleepHeroRow: { flexDirection: "row", alignItems: "center" },
  sleepHeroItem: { flex: 1, alignItems: "center", gap: 4 },
  sleepHeroItemLabel: {
    fontSize: 12,
    color: "#5856D6",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sleepHeroItemValue: { fontSize: 20, fontWeight: "800", color: "#1C1C1E" },
  sleepHeroDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(88,86,214,0.2)",
  },

  // Stats grid (sleep insights)
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statItem: { width: "46%", gap: 4 },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
});
