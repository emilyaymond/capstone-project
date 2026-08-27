import React, { useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { DataPoint, DataRange } from "../../types";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { useHaptics } from "../../hooks/useHaptics";
import { CartesianChart, Scatter, useChartPressState } from "victory-native";
import { Circle, Line as SkiaLine } from "@shopify/react-native-skia";
import { useChartScrubbing } from "./useChartScrubbing";
import type { TimeRangeKey } from "@/lib/time-range";

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
  color?: string;
  aggregation?: "avg" | "sum";
}

// ─── Types ────────────────────────────────────────────────────────────────────


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
  severity: "normal" | "warning" | "danger";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 250;

// ─── Helpers: Y-axis ticks ────────────────────────────────────────────────────

function getYTickValues(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];

  const range = max - min;
  const rawStep = range / (count - 1);

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep = magnitude;
  if (normalized >= 5) niceStep = 5 * magnitude;
  else if (normalized >= 2) niceStep = 2 * magnitude;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 0.0001; v += niceStep) {
    ticks.push(v);
  }

  return ticks;
}

/**
 * Computes the left axis padding needed to fit the widest Y tick label on one line.
 *
 * A fixed gutter silently wrapped 5-digit labels ("16000" rendered as "160 00")
 * on high-magnitude metrics like steps; 2-3 digit vitals happened to fit.
 */
function getAxisLeftPad(yTicks: number[], fontSize: number): number {
  const widestLabel = yTicks.reduce(
    (widest, tick) => Math.max(widest, `${Math.round(tick)}`.length),
    1,
  );
  // Labels render at fontSize - 2, roughly 0.62em per digit, and
  // ManualAxisTicks subtracts a 10px gutter from leftPad for the tick line.
  return Math.max(
    38,
    Math.ceil(widestLabel * (fontSize - 2) * 0.62) + 14,
  );
}

function getChartValueBounds(values: number[]) {
  if (!values.length) return { min: 0, max: 100 };

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return { min: min - 5, max: max + 5 };
  }

  const padding = (max - min) * 0.1;
  return {
    min: Math.floor(min - padding),
    max: Math.ceil(max + padding),
  };
}

// ─── Helpers: color ───────────────────────────────────────────────────────────

/**
 * Darkens a hex color by a percentage
 * @param hex - Color in #RRGGBB format
 * @param percent - Percentage to darken (0-100)
 */
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Darken by reducing each channel
  const factor = 1 - percent / 100;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

const getColorForRange = (
  range: "normal" | "warning" | "danger",
  contrast: "normal" | "high",
  baseColor?: string,
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

  // If base color provided, use shades of that color
  if (baseColor) {
    switch (range) {
      case "normal":
        return baseColor;
      case "warning":
        return darkenColor(baseColor, 25); // 25% darker
      case "danger":
        return darkenColor(baseColor, 45); // 45% darker
    }
  }

  // Default red palette for heart rate
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
// Maps a RangeBucket's severity (worst point in bucket) to a haptic zone.
function getBucketHapticZone(
  bucket: RangeBucket,
): "normal" | "elevated" | "high" {
  switch (bucket.severity) {
    case "danger":
      return "high";
    case "warning":
      return "elevated";
    default:
      return "normal";
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
      monthStarts.push({
        tick: weekIndex,
        label: formatter.format(monthStart),
      });
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
    case "H": {
      const formatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return {
        ticks: [0, 15, 30, 45, 60],
        timeLabels: {
          0: formatter.format(new Date(now.getTime() - 60 * 60 * 1000)),
          15: formatter.format(new Date(now.getTime() - 45 * 60 * 1000)),
          30: formatter.format(new Date(now.getTime() - 30 * 60 * 1000)),
          45: formatter.format(new Date(now.getTime() - 15 * 60 * 1000)),
          60: formatter.format(now),
        },
      };
    }
    case "D":
      return {
        ticks: [0, 6, 12, 18, 24],
        timeLabels: {
          0: "12am",
          6: "6am",
          12: "12pm",
          18: "6pm",
          24: "12am",
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
  if (timeRange === "D")
    return `${formatShortTime(start)}–${formatShortTime(end)}`;
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
  baseColor?: string,
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
        fill: getColorForRange(point.range || "normal", contrast, baseColor),
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

/** Names the time unit each plotted bucket represents, for chart captions. */
function bucketNoun(
  timeRange: Exclude<TimeRangeKey, "H">,
  count: number,
): string {
  const singular =
    timeRange === "D"
      ? "hour"
      : timeRange === "6M"
        ? "week"
        : timeRange === "Y"
          ? "month"
          : "day";
  return count === 1 ? singular : `${singular}s`;
}

export function buildRangeBuckets(
  data: DataPoint[],
  timeRange: Exclude<TimeRangeKey, "H">,
  contrast: "normal" | "high",
  now = new Date(),
  baseColor?: string,
  aggregation: "avg" | "sum" = "avg",
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

      // For sum aggregation, we want the total as both low and high (single value)
      // For avg aggregation, we want the range (min to max)
      let low: number;
      let high: number;
      let avg: number;

      if (aggregation === "sum") {
        const total = values.reduce((sum, v) => sum + v, 0);
        low = total;
        high = total;
        avg = total;
      } else {
        low = Math.min(...values);
        high = Math.max(...values);
        avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      }

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
        fill: getColorForRange(severity, contrast, baseColor),
        startDate: sortedByTime[0].timestamp,
        endDate: sortedByTime[sortedByTime.length - 1].timestamp,
        label:
          low === high
            ? `${Math.round(avg)}`
            : `${Math.round(low)}–${Math.round(high)}`,
        severity,
      };
    });
}

// ─── Sub-component: ManualAxisTicks ──────────────────────────────────────────

type AxisTicksProps = {
  xTicks: number[];
  xLabels: Record<number, string>;
  yTicks: number[];
  chartWidth: number;
  chartHeight: number;
  leftPad: number;
  rightPad: number;
  topPad: number;
  bottomPad: number;
  fontSize: number;
};

const ManualAxisTicks: React.FC<AxisTicksProps> = ({
  xTicks,
  xLabels,
  yTicks,
  chartWidth,
  chartHeight,
  leftPad,
  rightPad,
  topPad,
  bottomPad,
  fontSize,
}) => {
  const innerWidth = chartWidth - leftPad - rightPad;
  const innerHeight = chartHeight - topPad - bottomPad;

  const minX = Math.min(...xTicks);
  const maxX = Math.max(...xTicks);

  // Account for domainPadding in the chart (8px on each side)
  const domainPaddingX = 8;
  const effectiveInnerWidth = innerWidth - 2 * domainPaddingX;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { width: chartWidth, height: chartHeight },
      ]}
    >
      {/* X tick labels */}
      {xTicks.map((tick) => {
        const ratio = maxX === minX ? 0 : (tick - minX) / (maxX - minX);
        const x = leftPad + domainPaddingX + ratio * effectiveInnerWidth;

        return (
          <Text
            key={`x-${tick}`}
            style={[
              styles.manualXTick,
              {
                left: x - 24,
                top: chartHeight - bottomPad + 10,
                width: 48,
                fontSize: fontSize - 2,
              },
            ]}
          >
            {xLabels[tick] ?? ""}
          </Text>
        );
      })}

      {/* Y tick labels */}
      {yTicks.map((tick, index) => {
        const ratio = yTicks.length <= 1 ? 0 : index / (yTicks.length - 1);
        const y = chartHeight - bottomPad - ratio * innerHeight;

        return (
          <Text
            key={`y-${tick}`}
            numberOfLines={1}
            style={[
              styles.manualYTick,
              {
                top: y - 10,
                width: leftPad - 10,
                fontSize: fontSize - 2,
              },
            ]}
          >
            {Math.round(tick)}
          </Text>
        );
      })}
    </View>
  );
};

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
  title?: string;
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
  title,
}) => {
  const rightPad = 18;
  const topPad = 16;
  const bottomPad = 34;

  const yBounds = getChartValueBounds(data.map((d) => d.value));
  const yTicks = getYTickValues(yBounds.min, yBounds.max, 4);
  const leftPad = getAxisLeftPad(yTicks, fontSize);

  const press = useChartPressState({ x: 0, y: { value: 0 } });

  const severityForIndex = useCallback(
    (index: number): DataRange => data[index]?.originalPoint.range ?? "normal",
    [data],
  );

  const valueForIndex = useCallback(
    (index: number): number => data[index]?.value ?? 0,
    [data],
  );

  const { activeIndex, isPressed, voiceOverOn, selectIndex } =
    useChartScrubbing(press, {
      itemCount: data.length,
      severityForIndex,
      valueForIndex,
      valueBounds: yBounds,
    });

  const activePoint =
    activeIndex >= 0 && activeIndex < data.length ? data[activeIndex] : null;


  return (
    <View
      accessible={voiceOverOn}
      accessibilityRole={voiceOverOn ? "adjustable" : undefined}
      accessibilityLabel={`${title || "Heart rate"} chart. ${data.length} data point${data.length !== 1 ? "s" : ""}.`}
      accessibilityValue={{
        text: activePoint
          ? `${Math.round(activePoint.value)}${unit ? " " + unit : ""}, ${formatShortTime(activePoint.originalPoint.timestamp)}`
          : `Range ${data.length > 0 ? Math.round(Math.min(...data.map((d) => d.value))) : 0} to ${data.length > 0 ? Math.round(Math.max(...data.map((d) => d.value))) : 0}${unit ? " " + unit : ""}`,
        min: 0,
        max: Math.max(data.length - 1, 0),
        now: activeIndex >= 0 ? activeIndex : 0,
      }}
      accessibilityHint={
        voiceOverOn ? "Swipe up to advance, swipe down to go back" : undefined
      }
      accessibilityActions={
        voiceOverOn ? [{ name: "increment" }, { name: "decrement" }] : undefined
      }
      onAccessibilityAction={
        voiceOverOn
          ? (event) => {
              if (event.nativeEvent.actionName === "increment") {
                selectIndex(Math.min(activeIndex + 1, data.length - 1));
              } else if (event.nativeEvent.actionName === "decrement") {
                selectIndex(Math.max(activeIndex - 1, 0));
              }
            }
          : undefined
      }
    >
      <View
        style={{
          width: chartWidth,
          height: chartHeight,
          position: "relative",
          alignSelf: "center",
        }}
      >
        <CartesianChart
          data={data}
          xKey="date"
          yKeys={["value"]}
          chartPressState={press.state}
          padding={{
            top: topPad,
            bottom: bottomPad,
            left: leftPad,
            right: rightPad,
          }}
          domainPadding={{ left: 8, right: 8, top: 10, bottom: 8 }}
          xAxis={{
            tickValues: tickConfig.ticks,
            formatXLabel: () => "",
            labelColor: "rgba(0,0,0,0)",
            lineColor: "rgba(229, 229, 229, 0.5)",
            labelOffset: 0,
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
                style="fill"
                color={primaryColor}
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
        <ManualAxisTicks
          xTicks={tickConfig.ticks}
          xLabels={tickConfig.timeLabels}
          yTicks={yTicks}
          chartWidth={chartWidth}
          chartHeight={chartHeight}
          leftPad={leftPad}
          rightPad={rightPad}
          topPad={topPad}
          bottomPad={bottomPad}
          fontSize={fontSize}
        />
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
    </View>
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
  title?: string;
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
  title,
}) => {
  const rightPad = 20;
  const topPad = 16;
  const bottomPad = 34;

  const bucketValues = data.flatMap((d) => [d.low, d.high]);
  const yBounds = getChartValueBounds(bucketValues);
  const yTicks = getYTickValues(yBounds.min, yBounds.max, 4);
  const leftPad = getAxisLeftPad(yTicks, fontSize);

  const press = useChartPressState({ x: 0, y: { low: 0, high: 0, avg: 0 } });

  const severityForIndex = useCallback(
    (index: number): DataRange => data[index]?.severity ?? "normal",
    [data],
  );

  const valueForIndex = useCallback(
    (index: number): number => data[index]?.avg ?? 0,
    [data],
  );

  const { activeIndex, isPressed, voiceOverOn, selectIndex } =
    useChartScrubbing(press, {
      itemCount: data.length,
      severityForIndex,
      valueForIndex,
      valueBounds: yBounds,
    });

  const activeBucket =
    activeIndex >= 0 && activeIndex < data.length ? data[activeIndex] : null;

  const strokeWidth = timeRange === "D" ? 10 : 8;


  return (
    <View
      accessible={voiceOverOn}
      accessibilityRole={voiceOverOn ? "adjustable" : undefined}
      accessibilityLabel={`${title || "Heart rate"} range chart. ${data.reduce((s, b) => s + b.count, 0)} data points.`}
      accessibilityValue={{
        text: activeBucket
          ? `${Math.round(activeBucket.low)} to ${Math.round(activeBucket.high)}${unit ? " " + unit : ""}, ${formatDateTimeRange(activeBucket.startDate, activeBucket.endDate, timeRange)}`
          : `${data.length} buckets`,
        min: 0,
        max: Math.max(data.length - 1, 0),
        now: activeIndex >= 0 ? activeIndex : 0,
      }}
      accessibilityHint={
        voiceOverOn ? "Swipe up to advance, swipe down to go back" : undefined
      }
      accessibilityActions={
        voiceOverOn ? [{ name: "increment" }, { name: "decrement" }] : undefined
      }
      onAccessibilityAction={
        voiceOverOn
          ? (event) => {
              if (event.nativeEvent.actionName === "increment") {
                selectIndex(Math.min(activeIndex + 1, data.length - 1));
              } else if (event.nativeEvent.actionName === "decrement") {
                selectIndex(Math.max(activeIndex - 1, 0));
              }
            }
          : undefined
      }
    >
      <View
        style={{
          width: chartWidth,
          height: chartHeight,
          position: "relative",
          alignSelf: "center",
        }}
      >
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={["low", "high", "avg"]}
          chartPressState={press.state}
          padding={{
            top: topPad,
            bottom: bottomPad,
            left: leftPad,
            right: rightPad,
          }}
          domainPadding={{ left: 8, right: 8, top: 10, bottom: 8 }}
          xAxis={{
            tickValues: tickConfig.ticks,
            formatXLabel: () => "",
            labelColor: "rgba(0, 0, 0, 1)",
            lineColor: "rgba(0, 0, 0, 0.2)",
            labelOffset: 0,
          }}
          yAxis={[
            {
              labelColor: "rgba(0,0,0,0)",
              lineColor: "rgba(0,0,0,0)",
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
                if (lowPt.y == null || highPt.y == null || avgPt.y == null) {
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
        <ManualAxisTicks
          xTicks={tickConfig.ticks}
          xLabels={tickConfig.timeLabels}
          yTicks={yTicks}
          chartWidth={chartWidth}
          chartHeight={chartHeight}
          leftPad={leftPad}
          rightPad={rightPad}
          topPad={topPad}
          bottomPad={bottomPad}
          fontSize={fontSize}
        />
      </View>

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 1 }]}>
          {data.length} {bucketNoun(timeRange, data.length)} &middot;{" "}
          {data.reduce((sum, bucket) => sum + bucket.count, 0)} samples
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
    </View>
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
  color,
  aggregation = "avg",
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
    return color || getColorForRange("normal", settings.contrast);
  }, [color, settings.contrast]);

  const hourlyData = useMemo(
    () =>
      timeRange === "H"
        ? buildHourlyPoints(data, settings.contrast, now, color)
        : [],
    [data, settings.contrast, timeRange, now, color],
  );

  const bucketedData = useMemo(
    () =>
      timeRange !== "H"
        ? buildRangeBuckets(
            data,
            timeRange as Exclude<TimeRangeKey, "H">,
            settings.contrast,
            now,
            color,
            aggregation,
          )
        : [],
    [data, settings.contrast, timeRange, now, color, aggregation],
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
          <Text style={[styles.emptyText, { fontSize }]}>
            No data available
          </Text>
          <Text style={[styles.emptyHint, { fontSize: fontSize - 2 }]}>
            Upload or sync data to view chart
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: chartWidth, minHeight: chartHeight + 56 },
      ]}
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
            title={title}
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
            title={title}
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
    marginTop: 4,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: "#6E6E73",
    textAlign: "center",
  },
  rangeFooter: {
    marginTop: 2,
  },
  rangeFooterText: {
    color: "#6E6E73",
    textAlign: "center",
  },
  manualXTick: {
    paddingLeft: 14,
    position: "absolute",
    color: "#6e6e73",
    textAlign: "center",
    includeFontPadding: false,
  },
  manualYTick: {
    position: "absolute",
    left: 0,
    color: "#6e6e73",
    textAlign: "right",
    includeFontPadding: false,
  },
});

export default ScatterPlot;
