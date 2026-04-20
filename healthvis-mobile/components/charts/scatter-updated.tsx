import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
  Vibration,
} from "react-native";
import { DataPoint } from "../../types";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { CartesianChart, Scatter, useChartPressState } from "victory-native";
import { Circle, Line as SkiaLine } from "@shopify/react-native-skia";
import { useAnimatedReaction, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ScatterPlotProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  width?: number;
  height?: number;
  isLoading?: boolean;
  accessibilityLabel?: string;
  timeRange?: "H" | "D" | "W" | "M" | "6M" | "Y";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

type TickConfig = {
  ticks: number[];
  timeLabels: Record<number, string>;
};

type HourlyPoint = {
  date: number;
  value: number;
  fill: string;
  originalPoint: DataPoint;
};

type RangeBucket = {
  x: number;
  low: number;
  high: number;
  avg: number;
  count: number;
  fill: string;
  startDate: Date;
  endDate: Date;
  label: string;
};

// "below" | "normal" | "elevated" | "high"
type HapticZone = "below" | "normal" | "elevated" | "high";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 220;

// ─── Helpers: delay ───────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Helpers: color ───────────────────────────────────────────────────────────

const getColorForRange = (
  range: "normal" | "warning" | "danger",
  contrast: "normal" | "high",
): string => {
  if (contrast === "high") {
    switch (range) {
      case "normal":
        return "#000000";
      case "warning":
        return "#B35900";
      case "danger":
        return "#8B0000";
    }
  }
  // Restored old color palette (preferred look)
  switch (range) {
    case "normal":
      return "#ff0d00";
    case "warning":
      return "#b70b0b";
    case "danger":
      return "#8B0000";
  }
};

// ─── Helpers: haptic zone classifier ─────────────────────────────────────────
// Maps a DataPoint range string to one of four haptic zones.
// "normal"  → single soft tick
// "warning" → elevated double tap
// "danger"  → urgent burst
// Values without a range fall back to "normal".

function getHapticZone(range: string | undefined): HapticZone {
  switch (range) {
    case "danger":
      return "high";
    case "warning":
      return "elevated";
    default:
      return "normal";
  }
}

// Maps a RangeBucket's severity (worst point in bucket) to a haptic zone.
function getBucketHapticZone(bucket: RangeBucket): HapticZone {
  // Derive from fill color heuristic — or pass severity directly if available.
  // We use the bucket's fill to back-infer severity since severity isn't
  // stored directly on RangeBucket.
  if (bucket.fill === "#8B0000") return "high";
  if (bucket.fill === "#b70b0b" || bucket.fill === "#B35900") return "elevated";
  return "normal";
}

// ─── Haptic engine ────────────────────────────────────────────────────────────
// Zone-based haptic patterns. Each zone has a distinct rhythm and intensity
// so users can distinguish clinical significance without looking at the screen.
//
//  below    →  · ·   slow double soft pulse   (bradycardic / low)
//  normal   →  ·     single selection tick     (all clear)
//  elevated →  · ·   quick double medium tap   (above baseline)
//  high     →  ·· ·  notification + heavy punch (spike / danger)

async function hapticForZone(zone: HapticZone): Promise<void> {
  try {
    if (Platform.OS === "ios") {
      switch (zone) {
        case "below":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await delay(180);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "normal":
          await Haptics.selectionAsync();
          break;
        case "elevated":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await delay(80);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "high":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          await delay(60);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } else {
      // Android: map to Vibration patterns [delay, vibrate, pause, vibrate, ...]
      const patterns: Record<HapticZone, number[]> = {
        below:    [0, 60, 180, 60],
        normal:   [0, 40],
        elevated: [0, 60, 80, 60],
        high:     [0, 80, 60, 100],
      };
      Vibration.vibrate(patterns[zone]);
    }
  } catch {
    // Haptics not available — fail silently
  }
}

// ─── Helpers: date labels ─────────────────────────────────────────────────────

function getLastSevenDays(now = new Date()): Record<number, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const labels: Record<number, string> = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - i));
    labels[i] = formatter.format(date);
  }
  return labels;
}

function getLastTwelveMonths(now = new Date()): Record<number, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const labels: Record<number, string> = {};
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    labels[i] = formatter.format(date);
  }
  return labels;
}

function getSixMonthWeekLabels(now = new Date()): Record<number, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const labels: Record<number, string> = {};
  const monthStarts: Array<{ tick: number; label: string }> = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const diffDays = Math.floor(
      (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weekIndex = 25 - Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex <= 25) {
      monthStarts.push({ tick: weekIndex, label: formatter.format(monthStart) });
    }
  }

  for (const item of monthStarts) {
    labels[item.tick] = item.label;
  }
  return labels;
}

// ─── Tick config ──────────────────────────────────────────────────────────────

function getTickConfig(timeRange: TimeRangeKey, now = new Date()): TickConfig {
  switch (timeRange) {
    case "H":
      return {
        ticks: [0, 15, 30, 45, 60],
        timeLabels: {
          0: "-60m",
          15: "-45m",
          30: "-30m",
          45: "-15m",
          60: "Now",
        },
      };
    case "D":
      return {
        ticks: [0, 6, 12, 18, 24],
        timeLabels: {
          0: "12am",
          6: "6am",
          12: "12pm",
          18: "6pm",
          24: "",
        },
      };
    case "W":
      return {
        ticks: [0, 1, 2, 3, 4, 5, 6],
        timeLabels: getLastSevenDays(now),
      };
    case "M":
      return {
        ticks: [1, 8, 15, 22, 29],
        timeLabels: { 1: "1", 8: "8", 15: "15", 22: "22", 29: "29" },
      };
    case "6M": {
      const labels = getSixMonthWeekLabels(now);
      const ticks = Object.keys(labels)
        .map(Number)
        .sort((a, b) => a - b);
      return {
        ticks: ticks.length ? ticks : [0, 5, 10, 15, 20, 25],
        timeLabels: labels,
      };
    }
    case "Y":
      return {
        ticks: [0, 2, 4, 6, 8, 10],
        timeLabels: getLastTwelveMonths(now),
      };
  }
}

// ─── Helpers: formatting ──────────────────────────────────────────────────────

function formatShortDate(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatShortTime(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTimeRange(
  start: Date | string,
  end: Date | string,
  timeRange: TimeRangeKey,
) {
  if (timeRange === "H") return formatShortTime(end);
  if (timeRange === "D") return `${formatShortTime(start)}–${formatShortTime(end)}`;
  if (timeRange === "W" || timeRange === "M") return formatShortDate(start);
  if (timeRange === "6M" || timeRange === "Y") {
    return `${formatShortDate(start)}–${formatShortDate(end)}`;
  }
  return formatShortDate(end);
}

// ─── Data builders ────────────────────────────────────────────────────────────

function buildHourlyPoints(
  data: DataPoint[],
  contrast: "normal" | "high",
  now = new Date(),
): HourlyPoint[] {
  return data
    .map((point) => {
      const d = new Date(point.timestamp);
      const diffMinutes = Math.floor(
        (now.getTime() - d.getTime()) / (1000 * 60),
      );
      const x = 60 - diffMinutes;
      if (x < 0 || x > 60) return null;
      return {
        date: x,
        value: point.value,
        fill: getColorForRange(point.range || "normal", contrast),
        originalPoint: point,
      };
    })
    .filter((pt): pt is HourlyPoint => pt !== null)
    .sort((a, b) => a.date - b.date);
}

function bucketKeyForDate(
  date: Date,
  timeRange: Exclude<TimeRangeKey, "H">,
  now = new Date(),
): number | null {
  switch (timeRange) {
    case "D":
      return date.getHours();
    case "W": {
      const today = new Date(now);
      const current = new Date(date);
      today.setHours(0, 0, 0, 0);
      current.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (today.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
      );
      const x = 6 - diffDays;
      return x >= 0 && x <= 6 ? x : null;
    }
    case "M": {
      const sameMonth =
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
      return sameMonth ? date.getDate() : null;
    }
    case "6M": {
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor(diffDays / 7);
      const x = 25 - weekIndex;
      return x >= 0 && x <= 25 ? x : null;
    }
    case "Y": {
      const monthDiff =
        (now.getFullYear() - date.getFullYear()) * 12 +
        (now.getMonth() - date.getMonth());
      const x = 11 - monthDiff;
      return x >= 0 && x <= 11 ? x : null;
    }
  }
}

function buildRangeBuckets(
  data: DataPoint[],
  timeRange: Exclude<TimeRangeKey, "H">,
  contrast: "normal" | "high",
  now = new Date(),
): RangeBucket[] {
  const groups = new Map<number, DataPoint[]>();

  for (const point of data) {
    const d = new Date(point.timestamp);
    const key = bucketKeyForDate(d, timeRange, now);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([x, points]) => {
      const values = points.map((p) => p.value);
      const low = Math.min(...values);
      const high = Math.max(...values);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

      const sortedByTime = [...points].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const severity = points.some((p) => p.range === "danger")
        ? "danger"
        : points.some((p) => p.range === "warning")
          ? "warning"
          : "normal";

      return {
        x,
        low,
        high,
        avg,
        count: points.length,
        fill: getColorForRange(severity, contrast),
        startDate: sortedByTime[0].timestamp,
        endDate: sortedByTime[sortedByTime.length - 1].timestamp,
        label:
          low === high
            ? `${Math.round(avg)}`
            : `${Math.round(low)}–${Math.round(high)}`,
      };
    });
}

// ─── Sub-component: HourlyScatterChart ───────────────────────────────────────

type HourlyChartProps = {
  data: HourlyPoint[];
  chartWidth: number;
  chartHeight: number;
  fontSize: number;
  dotRadius: number;
  tickConfig: TickConfig;
  primaryColor: string;
  unit?: string;
  onSelectionChange?: (point: HourlyPoint | null) => void;
};

const HourlyScatterChart: React.FC<HourlyChartProps> = ({
  data,
  chartWidth,
  chartHeight,
  fontSize,
  dotRadius,
  tickConfig,
  primaryColor,
  unit,
  onSelectionChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPressed, setIsPressed] = useState(false);
  const lastZoneRef = useRef<HapticZone | null>(null);

  const activePoint =
    activeIndex >= 0 && activeIndex < data.length ? data[activeIndex] : null;

  const { state: chartPressedState, isActive } = useChartPressState({
    x: 0,
    y: { value: 0 },
  });

  // Zone-aware haptic — fires pattern based on clinical significance of point.
  // Only re-fires if the zone changes, preventing haptic spam on same-zone drag.
  const triggerPointHaptic = useCallback(
    async (index: number) => {
      if (index < 0 || index >= data.length) return;
      const zone = getHapticZone(data[index].originalPoint.range);
      if (zone === lastZoneRef.current) return;
      lastZoneRef.current = zone;
      await hapticForZone(zone);
    },
    [data],
  );

  const updateActiveIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onSelectionChange?.(
        index >= 0 && index < data.length ? data[index] : null,
      );
    },
    [data, onSelectionChange],
  );

  const updatePressed = useCallback(
    (pressed: boolean) => {
      setIsPressed(pressed);
      if (!pressed) {
        setActiveIndex(-1);
        lastZoneRef.current = null;
        onSelectionChange?.(null);
      }
    },
    [onSelectionChange],
  );

  useAnimatedReaction(
    () => chartPressedState.matchedIndex.value,
    (currentIndex, previousIndex) => {
      if (!isActive) return;
      if (currentIndex >= 0 && currentIndex !== previousIndex) {
        runOnJS(updateActiveIndex)(currentIndex);
        runOnJS(triggerPointHaptic)(currentIndex);
      }
    },
  );

  useEffect(() => {
    updatePressed(isActive);
  }, [isActive, updatePressed]);

  return (
    <>
      <View style={{ height: chartHeight - 8, width: chartWidth }}>
        <CartesianChart
          data={data}
          xKey="date"
          yKeys={["value"]}
          chartPressState={chartPressedState}
          padding={{ top: 14, bottom: 24, left: 36, right: 10 }}
          domainPadding={{ left: 8, right: 8, top: 10, bottom: 8 }}
          xAxis={{
            tickValues: tickConfig.ticks,
            formatXLabel: (label) =>
              tickConfig.timeLabels[label as number] ?? "",
            // Restored warm axis label color from old scatter
            labelColor: "#403e3e",
            lineColor: "rgba(229, 229, 229, 0.5)",
            labelOffset: 8,
          }}
          yAxis={[
            {
              labelColor: "rgba(0,0,0,0)",
              lineColor: "rgba(0,0,0,0.04)",
            },
          ]}
        >
          {({ points }) => (
            <>
              <Scatter
                points={points.value}
                shape="circle"
                radius={dotRadius}
                style={{ fill: { color: primaryColor } }}
              />
              {(() => {
                const selectedPoint = points.value[activeIndex];
                if (!activePoint || !selectedPoint || selectedPoint.y == null)
                  return null;
                return (
                  <Circle
                    cx={selectedPoint.x}
                    cy={selectedPoint.y}
                    r={dotRadius + 3}
                    color={primaryColor}
                    opacity={0.22}
                  />
                );
              })()}
            </>
          )}
        </CartesianChart>
      </View>

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 1 }]}>
          {data.length} data point{data.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {isPressed && activePoint && (
        <View style={styles.tooltipContainer}>
          <Text style={[styles.tooltipText, { fontSize }]}>
            {Math.round(activePoint.value)}
            {unit ? ` ${unit}` : ""}
          </Text>
          <Text style={[styles.tooltipSubtext, { fontSize: fontSize - 2 }]}>
            {formatDateTimeRange(
              activePoint.originalPoint.timestamp,
              activePoint.originalPoint.timestamp,
              "H",
            )}
          </Text>
        </View>
      )}
    </>
  );
};

// ─── Sub-component: BucketedRangeChart ───────────────────────────────────────

type RangeChartProps = {
  data: RangeBucket[];
  chartWidth: number;
  chartHeight: number;
  fontSize: number;
  tickConfig: TickConfig;
  primaryColor: string;
  timeRange: Exclude<TimeRangeKey, "H">;
  unit?: string;
  onSelectionChange?: (bucket: RangeBucket | null) => void;
};

const BucketedRangeChart: React.FC<RangeChartProps> = ({
  data,
  chartWidth,
  chartHeight,
  fontSize,
  tickConfig,
  primaryColor,
  timeRange,
  unit,
  onSelectionChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPressed, setIsPressed] = useState(false);
  const lastZoneRef = useRef<HapticZone | null>(null);

  const activeBucket =
    activeIndex >= 0 && activeIndex < data.length ? data[activeIndex] : null;

  const { state: chartPressedState, isActive } = useChartPressState({
    x: 0,
    y: { low: 0, high: 0, avg: 0 },
  });

  // Zone-aware haptic — fires a distinct pattern per clinical zone.
  // Suppresses repeat fires when dragging within the same zone.
  const triggerBucketHaptic = useCallback(
    async (index: number) => {
      if (index < 0 || index >= data.length) return;
      const zone = getBucketHapticZone(data[index]);
      if (zone === lastZoneRef.current) return;
      lastZoneRef.current = zone;
      await hapticForZone(zone);
    },
    [data],
  );

  const updateActiveIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onSelectionChange?.(
        index >= 0 && index < data.length ? data[index] : null,
      );
    },
    [data, onSelectionChange],
  );

  const updatePressed = useCallback(
    (pressed: boolean) => {
      setIsPressed(pressed);
      if (!pressed) {
        setActiveIndex(-1);
        lastZoneRef.current = null;
        onSelectionChange?.(null);
      }
    },
    [onSelectionChange],
  );

  useAnimatedReaction(
    () => chartPressedState.matchedIndex.value,
    (currentIndex, previousIndex) => {
      if (!isActive) return;
      if (currentIndex >= 0 && currentIndex !== previousIndex) {
        runOnJS(updateActiveIndex)(currentIndex);
        runOnJS(triggerBucketHaptic)(currentIndex);
      }
    },
  );

  useEffect(() => {
    updatePressed(isActive);
  }, [isActive, updatePressed]);

  const strokeWidth = timeRange === "D" ? 10 : 8;

  return (
    <>
      <View style={{ height: chartHeight - 8, width: chartWidth }}>
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={["low", "high", "avg"]}
          chartPressState={chartPressedState}
          padding={{ top: 14, bottom: 24, left: 36, right: 10 }}
          domainPadding={{ left: 8, right: 8, top: 10, bottom: 8 }}
          xAxis={{
            tickValues: tickConfig.ticks,
            formatXLabel: (label) =>
              tickConfig.timeLabels[label as number] ?? "",
            // Restored warm axis label color from old scatter
            labelColor: "#403e3e",
            lineColor: "rgba(229, 229, 229, 0.5)",
            labelOffset: 8,
          }}
          yAxis={[
            {
              labelColor: "rgba(0,0,0,0)",
              lineColor: "rgba(0,0,0,0.04)",
            },
          ]}
        >
          {({ points }) => (
            <>
              {points.low.map((lowPt, i) => {
                const highPt = points.high[i];
                const avgPt = points.avg[i];
                const bucket = data[i];

                if (!lowPt || !highPt || !avgPt || !bucket) return null;
                if (
                  lowPt.y == null ||
                  highPt.y == null ||
                  avgPt.y == null
                ) {
                  return null;
                }

                const selected = i === activeIndex;
                const singleValue = Math.abs(bucket.high - bucket.low) < 0.5;

                if (singleValue) {
                  return (
                    <Circle
                      key={`single-${i}`}
                      cx={avgPt.x}
                      cy={avgPt.y}
                      r={selected ? 5.5 : 4.5}
                      color={selected ? primaryColor : bucket.fill}
                    />
                  );
                }

                return (
                  <SkiaLine
                    key={`range-${i}`}
                    p1={{ x: highPt.x, y: highPt.y }}
                    p2={{ x: lowPt.x, y: lowPt.y }}
                    color={selected ? primaryColor : bucket.fill}
                    strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
                    strokeCap="round"
                  />
                );
              })}

              {(() => {
                const selectedAvgPoint = points.avg[activeIndex];
                if (
                  !activeBucket ||
                  !selectedAvgPoint ||
                  selectedAvgPoint.y == null
                ) {
                  return null;
                }
                return (
                  <Circle
                    cx={selectedAvgPoint.x}
                    cy={selectedAvgPoint.y}
                    r={3.5}
                    color="#FFFFFF"
                  />
                );
              })()}
            </>
          )}
        </CartesianChart>
      </View>

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 1 }]}>
          {data.reduce((sum, bucket) => sum + bucket.count, 0)} data point
          {data.reduce((sum, bucket) => sum + bucket.count, 0) !== 1 ? "s" : ""}
        </Text>
      </View>

      {isPressed && activeBucket && (
        <View style={styles.tooltipContainer}>
          <Text style={[styles.tooltipText, { fontSize }]}>
            {Math.round(activeBucket.low)}–{Math.round(activeBucket.high)}
            {unit ? ` ${unit}` : ""}
          </Text>
          <Text style={[styles.tooltipSubtext, { fontSize: fontSize - 2 }]}>
            {formatDateTimeRange(
              activeBucket.startDate,
              activeBucket.endDate,
              timeRange,
            )}
          </Text>
        </View>
      )}
    </>
  );
};

// ─── Main component: ScatterPlot ──────────────────────────────────────────────

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  title,
  unit,
  width,
  height,
  isLoading = false,
  accessibilityLabel,
  timeRange = "D",
}) => {
  const { settings, mode } = useAccessibility();

  const fontSize = useMemo(() => {
    switch (settings.fontSize) {
      case "small":
        return 12;
      case "large":
        return 18;
      default:
        return 14;
    }
  }, [settings.fontSize]);

  const titleFontSize = useMemo(() => {
    switch (settings.fontSize) {
      case "small":
        return 16;
      case "large":
        return 22;
      default:
        return 18;
    }
  }, [settings.fontSize]);

  const chartWidth = width || DEFAULT_WIDTH;
  const chartHeight = height || DEFAULT_HEIGHT;
  // Restored dot radius to match old scatter preferred look (was 4.5)
  const dotRadius = mode === "simplified" ? 7 : 5.5;
  const now = useMemo(() => new Date(), []);
  const tickConfig = useMemo(
    () => getTickConfig(timeRange, now),
    [timeRange, now],
  );

  const primaryColor = useMemo(() => {
    return getColorForRange("normal", settings.contrast);
  }, [settings.contrast]);

  const hourlyData = useMemo(
    () =>
      timeRange === "H" ? buildHourlyPoints(data, settings.contrast, now) : [],
    [data, settings.contrast, timeRange, now],
  );

  const bucketedData = useMemo(
    () =>
      timeRange !== "H"
        ? buildRangeBuckets(
            data,
            timeRange as Exclude<TimeRangeKey, "H">,
            settings.contrast,
            now,
          )
        : [],
    [data, settings.contrast, timeRange, now],
  );

  const visibleValues =
    timeRange === "H"
      ? hourlyData.map((d) => d.value)
      : bucketedData.flatMap((d) => [d.low, d.high]);

  const minValue = visibleValues.length
    ? Math.round(Math.min(...visibleValues))
    : 0;
  const maxValue = visibleValues.length
    ? Math.round(Math.max(...visibleValues))
    : 0;

  const chartCount =
    timeRange === "H" ? hourlyData.length : bucketedData.length;
  const chartAccessibilityLabel =
    accessibilityLabel ||
    `${title || "Heart rate chart"} showing ${chartCount} ${
      timeRange === "H" ? "points" : "buckets"
    }. Range ${minValue} to ${maxValue}${unit ? ` ${unit}` : ""}.`;

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { width: chartWidth, height: chartHeight + 72 },
        ]}
      >
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.loadingContainer, { height: chartHeight }]}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { fontSize }]}>
            Loading chart data...
          </Text>
        </View>
      </View>
    );
  }

  if (chartCount === 0) {
    return (
      <View
        style={[
          styles.container,
          { width: chartWidth, height: chartHeight + 72 },
        ]}
        accessible
        accessibilityLabel={accessibilityLabel || "Empty chart"}
        accessibilityHint="No data available to display"
      >
        {title && (
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        )}
        <View style={[styles.emptyContainer, { height: chartHeight }]}>
          <Text style={[styles.emptyText, { fontSize }]}>No data available</Text>
          <Text style={[styles.emptyHint, { fontSize: fontSize - 2 }]}>
            Upload or sync data to view chart
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { width: chartWidth, minHeight: chartHeight + 92 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={chartAccessibilityLabel}
    >
      {title && (
        <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
      )}

      <View style={styles.chartWrapper}>
        {timeRange === "H" ? (
          <HourlyScatterChart
            data={hourlyData}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            fontSize={fontSize}
            dotRadius={dotRadius}
            tickConfig={tickConfig}
            primaryColor={primaryColor}
            unit={unit}
          />
        ) : (
          <BucketedRangeChart
            data={bucketedData}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            fontSize={fontSize}
            tickConfig={tickConfig}
            primaryColor={primaryColor}
            timeRange={timeRange as Exclude<TimeRangeKey, "H">}
            unit={unit}
          />
        )}
      </View>

      <View style={styles.rangeFooter}>
        <Text style={[styles.rangeFooterText, { fontSize: fontSize - 1 }]}>
          Range: {minValue} - {maxValue}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: 8,
  },
  title: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
    textAlign: "center",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    padding: 20,
  },
  emptyText: {
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyHint: {
    color: "#999",
    textAlign: "center",
  },
  tooltipContainer: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 8,
    alignItems: "center",
  },
  tooltipText: {
    color: "#fff",
    fontWeight: "700",
  },
  tooltipSubtext: {
    color: "#ddd",
    marginTop: 2,
  },
  summary: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: "#6E6E73",
    textAlign: "center",
  },
  rangeFooter: {
    marginTop: 4,
  },
  rangeFooterText: {
    color: "#6E6E73",
    textAlign: "center",
  },
});

export default ScatterPlot;
