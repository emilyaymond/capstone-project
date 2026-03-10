import React, { useMemo } from "react";
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
  VictoryChart,
  VictoryScatter,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from "victory-native";

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

  const primaryColor = useMemo(() => {
    return getColorForRange("normal", settings.contrast);
  }, [settings.contrast]);

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
  const minValue = visibleValues.length ? Math.min(...visibleValues) : 0;
  const maxValue = visibleValues.length ? Math.max(...visibleValues) : 0;

  const chartAccessibilityLabel =
    accessibilityLabel ||
    `${title || "Scatter chart"} showing ${chartData.length} data point${
      chartData.length !== 1 ? "s" : ""
    }. Range ${minValue} to ${maxValue}${unit ? ` ${unit}` : ""}.`;

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

      <View style={styles.chartWrapper}>
        <VictoryChart
          width={chartWidth}
          height={chartHeight + 20}
          theme={VictoryTheme.material}
          padding={{ top: 20, bottom: 25, left: 40, right: 10 }}
          domainPadding={{ x: 10, y: [10, 20] }}
        >
          <VictoryAxis
            tickValues={timeScale.ticks}
            tickFormat={(t: number) => timeScale.timeLabels[t] || ""}
            style={{
              grid: { stroke: "rgba(229, 229, 229, 0.5)" },
              tickLabels: { fontSize: fontSize - 2, fill: "#403e3e", angle: 0 },
              axisLabel: { fontSize: fontSize, fill: "#403e3e" },
            }}
          />

          <VictoryAxis
            dependentAxis
            label={() => null}
            style={{
              grid: { stroke: "rgba(255, 255, 255, 0)" },
              tickLabels: { fontSize: fontSize - 2, fill: "#403e3e" },
              axisLabel: { fontSize: fontSize, fill: "#403e3e" },
            }}
          />

          <VictoryScatter
            data={chartData}
            style={{
              data: {
                fill: ({ datum }) => datum.fill || primaryColor,
              },
              labels: {
                fill: "transparent",
                fontSize: 0,
              },
            }}
            size={mode === "simplified" ? 7 : 5.5}
            symbol="circle"
            labelComponent={<VictoryLabel dy={-15} />}
            events={[
              {
                target: "data",
                eventHandlers: {
                  onPressIn: () => {
                    return [
                      {
                        target: "data",
                        mutation: (props) => {
                          const { datum } = props;
                          const dataPoint = datum.originalPoint as DataPoint;

                          if (dataPoint) {
                            playToneForValue(
                              dataPoint.value,
                              dataPoint.range || "normal",
                            );

                            console.log(
                              `Touched point: ${dataPoint.value}${unit ? ` ${unit}` : ""} at ${new Date(
                                dataPoint.timestamp,
                              ).toLocaleTimeString()}`,
                            );
                          }

                          return { size: mode === "simplified" ? 10 : 8 };
                        },
                      },
                    ];
                  },
                  onPressOut: () => {
                    return [
                      {
                        target: "data",
                        mutation: () => null,
                      },
                    ];
                  },
                },
              },
            ]}
          />
        </VictoryChart>
      </View>

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {chartData.length} data point{chartData.length !== 1 ? "s" : ""}
          {" • "}
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
    height: "90%",
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
