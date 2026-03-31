import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Vibration,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { DataPoint } from "../../types";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import {
  CartesianChart,
  Scatter,
  useChartPressState,
  type CartesianChartRenderArg,
  type PointsArray,
} from "victory-native";
import { Circle, Line as SkiaLine } from "@shopify/react-native-skia";
import { useAnimatedReaction, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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

type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

type TimeScaleConfig = {
  ticks: number[];
  timeLabels: Record<number, string>;
  getX: (date: Date, now: Date) => number;
};

type ChartPoint = {
  x: number;
  y: number;
  label: string;
  fill: string;
  originalPoint: DataPoint;
};

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;

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

  switch (range) {
    case "normal":
      return "#ff0d00ff";
    case "warning":
      return "#b70b0bff";
    case "danger":
      return "#8B0000";
  }
};

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

function getLastSixMonths(now = new Date()): Record<number, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const labels: Record<number, string> = {};

  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
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

function getTimeScaleConfig(
  timeRange: TimeRangeKey,
  now = new Date(),
): TimeScaleConfig {
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
        getX: (date, currentNow) => {
          const diffMinutes = Math.floor(
            (currentNow.getTime() - date.getTime()) / (1000 * 60),
          );
          const x = 60 - diffMinutes;
          return x >= 0 && x <= 60 ? x : -1;
        },
      };

    case "D":
      return {
        ticks: [0, 6, 12, 18, 23],
        timeLabels: {
          0: "12am",
          6: "6am",
          12: "12pm",
          18: "6pm",
          23: "",
        },
        getX: (date) => {
          const hour = date.getHours();
          return hour >= 0 && hour <= 23 ? hour : -1;
        },
      };

    case "W":
      return {
        ticks: [0, 1, 2, 3, 4, 5, 6],
        timeLabels: getLastSevenDays(now),
        getX: (date, currentNow) => {
          const today = new Date(currentNow);
          const current = new Date(date);

          today.setHours(0, 0, 0, 0);
          current.setHours(0, 0, 0, 0);

          const diffDays = Math.floor(
            (today.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
          );

          const x = 6 - diffDays;
          return x >= 0 && x <= 6 ? x : -1;
        },
      };

    case "M":
      return {
        ticks: [1, 8, 15, 22, 29],
        timeLabels: {
          1: "1",
          8: "8",
          15: "15",
          22: "22",
          29: "29",
        },
        getX: (date) => {
          const day = date.getDate();
          return day >= 1 && day <= 31 ? day : -1;
        },
      };

    case "6M":
      return {
        ticks: [0, 1, 2, 3, 4, 5],
        timeLabels: getLastSixMonths(now),
        getX: (date, currentNow) => {
          const monthDiff =
            (currentNow.getFullYear() - date.getFullYear()) * 12 +
            (currentNow.getMonth() - date.getMonth());

          const x = 5 - monthDiff;
          return x >= 0 && x <= 5 ? x : -1;
        },
      };

    case "Y":
      return {
        ticks: [0, 2, 4, 6, 8, 10],
        timeLabels: getLastTwelveMonths(now),
        getX: (date, currentNow) => {
          const monthDiff =
            (currentNow.getFullYear() - date.getFullYear()) * 12 +
            (currentNow.getMonth() - date.getMonth());

          const x = 11 - monthDiff;
          return x >= 0 && x <= 11 ? x : -1;
        },
      };
  }
}

type CartesianDataPoint = {
  date: number;
  value: number;
};

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
  const [isPressed, setIsPressed] = useState(false);

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

  const timeScale = useMemo(() => getTimeScaleConfig(timeRange), [timeRange]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const now = new Date();

    return data
      .map((point) => {
        const d = new Date(point.timestamp);
        const x = timeScale.getX(d, now);

        if (x < 0) return null;

        const pointColor = getColorForRange(
          point.range || "normal",
          settings.contrast,
        );
        console.log(
          `<3 point value is ${point.value} and range is ${point.range}`,
        );

        return {
          x,
          y: point.value,
          label: point.value.toString(),
          fill: pointColor,
          originalPoint: point,
        };
      })
      .filter((point): point is ChartPoint => point !== null);
  }, [data, settings.contrast, timeScale]);

  const cartesianData = useMemo<CartesianDataPoint[]>(() => {
    return chartData
      .map((pt) => ({ date: pt.x, value: pt.y }))
      .sort((a, b) => a.date - b.date);
  }, [chartData]);

  const colorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const pt of chartData) {
      map[`${pt.x}_${pt.y}`] = pt.fill;
    }
    return map;
  }, [chartData]);

  const primaryColor = useMemo(() => {
    return getColorForRange("normal", settings.contrast);
  }, [settings.contrast]);

  const { state: chartPressedState } = useChartPressState({
    x: 0 as number,
    y: { value: 0 },
  });

  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const setPressed = useCallback((pressed: boolean) => {
    setIsPressed(pressed);
  }, []);

  const onSelectData = useCallback(
    (index: number) => {
      if (index >= 0 && index < chartData.length) {
        const pt = chartData[index];
        if (pt) {
          playToneForValue(pt.originalPoint.value, pt.originalPoint.range || "normal");
          console.log(
            `Touched point: ${pt.originalPoint.value}${unit ? ` ${unit}` : ""} at ${new Date(
              pt.originalPoint.timestamp,
            ).toLocaleTimeString()}`,
          );
        }
      }
    },
    [chartData, unit],
  );

  // Trigger haptic when matched index changes during active press
  useAnimatedReaction(
    () => ({
      index: chartPressedState.matchedIndex.value,
      active: chartPressedState.isActive.value,
    }),
    (current, previous) => {
      if (current.active && previous && current.index !== previous.index) {
        runOnJS(triggerHaptic)();
      }
    },
  );

  // Sync isActive to React state for conditional rendering outside Skia
  useAnimatedReaction(
    () => chartPressedState.isActive.value,
    (active, previousActive) => {
      if (active !== previousActive) {
        runOnJS(setPressed)(active);
      }
    },
  );

  // Fire onSelectData callback when matched index changes
  useAnimatedReaction(
    () => ({
      index: chartPressedState.matchedIndex.value,
      active: chartPressedState.isActive.value,
    }),
    (current, previous) => {
      if (current.active && previous && current.index !== previous.index) {
        runOnJS(onSelectData)(current.index);
      }
    },
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { width: chartWidth, height: chartHeight + 60 },
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

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { width: chartWidth, height: chartHeight + 60 },
        ]}
        accessible={true}
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

  const visibleValues = chartData.map((d) => d.y);
  const minValue = visibleValues.length
    ? Math.round(Math.min(...visibleValues))
    : 0;
  const maxValue = visibleValues.length
    ? Math.round(Math.max(...visibleValues))
    : 0;

  const chartAccessibilityLabel =
    accessibilityLabel ||
    `${title || "Scatter chart"} showing ${chartData.length} data point${
      chartData.length !== 1 ? "s" : ""
    }. Range ${minValue} to ${maxValue}${unit ? ` ${unit}` : ""}.`;

  const dotRadius = mode === "simplified" ? 7 : 5.5;

  return (
    <View
      style={[
        styles.container,
        { width: chartWidth, height: chartHeight + 60 },
      ]}
      accessible={true}
      accessibilityLabel={chartAccessibilityLabel}
      accessibilityRole="image"
    >
      {title && (
        <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
      )}

      <View style={[styles.chartWrapper, { height: chartHeight + 20 }]}>
        <CartesianChart
          data={cartesianData}
          xKey="date"
          yKeys={["value"]}
          chartPressState={chartPressedState}
          padding={{ top: 20, bottom: 25, left: 40, right: 10 }}
          domainPadding={{ top: 20, bottom: 10, left: 10, right: 10 }}
          xAxis={{
            tickValues: timeScale.ticks,
            formatXLabel: (label: string | number) => timeScale.timeLabels[label as number] ?? "",
            labelColor: "#403e3e",
            lineColor: "rgba(229, 229, 229, 0.5)",
          }}
          yAxis={[{
            labelColor: "#403e3e",
            lineColor: "rgba(255, 255, 255, 0)",
          }]}
        >
          {({ points, chartBounds }: CartesianChartRenderArg<CartesianDataPoint, "value">) => (
            <>
              {/* Render scatter points with per-point colors */}
              {points.value.map((pt, i) => {
                if (pt.y == null) return null;
                const key = `${pt.xValue}_${pt.yValue}`;
                const color = colorMap[key] ?? primaryColor;
                return (
                  <Circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={dotRadius}
                    color={color}
                  />
                );
              })}

              {/* Crosshair and highlight when pressed */}
              {isPressed && (
                <>
                  <SkiaLine
                    p1={{ x: chartPressedState.x.position.value, y: chartBounds.top }}
                    p2={{ x: chartPressedState.x.position.value, y: chartBounds.bottom }}
                    color="rgba(0,0,0,0.3)"
                    strokeWidth={1}
                  />
                  {chartPressedState.y.value.position.value != null && (
                    <Circle
                      cx={chartPressedState.x.position.value}
                      cy={chartPressedState.y.value.position.value}
                      r={dotRadius + 3}
                      color={primaryColor}
                      opacity={0.4}
                    />
                  )}
                </>
              )}
            </>
          )}
        </CartesianChart>
      </View>

      {isPressed && (
        <View style={styles.tooltipContainer}>
          <Text style={[styles.tooltipText, { fontSize: fontSize - 1 }]}>
            {chartPressedState.y.value.value.value.toFixed(1)}
            {unit ? ` ${unit}` : ""}
          </Text>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {chartData.length} data point{chartData.length !== 1 ? "s" : ""}
          {" \u2022 "}
          Range: {minValue} - {maxValue}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
    </View>
  );
};

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
    width: "100%",
    alignItems: "center",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    width: "100%",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    marginTop: 4,
  },
  tooltipText: {
    color: "#fff",
    fontWeight: "600",
  },
  summary: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: "#666",
    textAlign: "center",
    marginBottom: 2,
  },
});

export default ScatterPlot;
