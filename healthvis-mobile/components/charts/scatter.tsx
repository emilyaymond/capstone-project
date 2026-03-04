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

// Component Props Interface

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

// Constants

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;

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

// Helper Functions

/**
 * Gets color based on data range and accessibility mode
 */
const getColorForRange = (
  range: "normal" | "warning" | "danger",
  contrast: "normal" | "high",
): string => {
  if (contrast === "high") {
    // WCAG AAA compliant high contrast colors
    switch (range) {
      case "normal":
        return "#000000"; // Black
      case "warning":
        return "#B35900"; // Dark orange
      case "danger":
        return "#8B0000"; // Dark red
    }
  } else {
    // Normal contrast colors
    switch (range) {
      case "normal":
        return "#ff0d00ff";
      case "warning":
        return "#b70b0bff";
      case "danger":
        return "#8B0000";
    }
  }
};

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  title,
  unit,
  width,
  height,
  isLoading = false,
  accessibilityLabel,
  timeRange = "D", //default
}) => {
  const { settings, mode } = useAccessibility();

  // Memoized Calculations

  // Calculate ticks and timeLabels based on timeRange (separate from chartData)
  const { ticks, timeLabels } = useMemo(() => {
    let ticks: number[] = [];
    let timeLabels: { [key: number]: string } = {};

    const getLastSixMonths = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
      });

      let labels: Record<number, string> = {};

      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        labels[i] = formatter.format(date);
      }

      return labels;
    };

    const getLastSevenDays = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

      const labels: Record<number, string> = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() - (6 - i));
        labels[i] = formatter.format(date);
      }

      return labels;
    };

    // Set ticks and timeLabels based on timeRange
    switch (timeRange) {
      case "H":
        // Hourly ticks
        ticks = Array.from({ length: 24 }, (_, i) => i);
        timeLabels = {};
        break;
      case "D":
        ticks = [0, 6, 12, 18, 23];
        timeLabels = {
          0: "12am",
          6: "6am",
          12: "12pm",
          18: "6pm",
          23: " ",
        };
        break;
      case "W":
        ticks = [0, 1, 2, 3, 4, 5, 6];
        timeLabels = getLastSevenDays();
        break;
      case "M":
        ticks = [1, 8, 15, 22, 29];
        timeLabels = {
          1: "1",
          8: "8",
          15: "15",
          22: "22",
          29: "29",
        };
        break;
      case "6M":
        ticks = [0, 1, 2, 3, 4, 5];
        timeLabels = getLastSixMonths();
        break;
      case "Y":
        ticks = [0, 2, 4, 6, 8, 10];
        timeLabels = {
          0: "Jan",
          2: "Mar",
          4: "May",
          6: "Jul",
          8: "Sep",
          10: "Nov",
        };
        break;
    }

    return { ticks, timeLabels };
  }, [timeRange]);

  /*
   * Todo I have to change the daily tab to only show 24 hours of data
   * (past 24, so if it is 11pm now it would show from 11pm yesterday) and then label the 12-6
   */
  const chartData = useMemo(() => {
    return data.map((point, idx) => {
      const d = new Date(point.timestamp);

      // Helper function to format timestamp as "mm/dd at hh:mm am/pm"
      const getTime = (ts: Date): string => {
        const timestamp = new Date(ts);
        const month = timestamp.getMonth(); // getMonth() returns 0-11
        const day = timestamp.getDate();
        let hours = timestamp.getHours();
        const minutes = timestamp.getMinutes();

        // Convert to 12-hour format
        const ampm = hours >= 12 ? "pm" : "am";
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12

        // Pad minutes with leading zero if needed
        const minutesStr = minutes.toString().padStart(2, "0");

        return `${month}/${day} at ${hours}:${minutesStr} ${ampm}`;
      };

      let label = "";

      // Format labels based on time range
      switch (timeRange) {
        case "H": // Hourly - show time for all points
          label = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          break;

        case "D": // Day - show 12am, 6am, 12pm, 6pm
          const hour = d.getHours();
          if (hour === 0 || hour === 6 || hour === 12 || hour === 18) {
            label =
              hour === 0
                ? "12am"
                : hour === 6
                  ? "6am"
                  : hour === 12
                    ? "12pm"
                    : "6pm";
          } else label = `${hour}`;

          idx = hour;
          break;

        case "W": // Weekly - show day of week
          const today = new Date();
          const current = new Date(d);

          today.setHours(0, 0, 0, 0);
          current.setHours(0, 0, 0, 0);

          const diffMs = today.getTime() - current.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 0 = today

          // today -> 6, yesterday -> 5, ... 6 days ago -> 0
          idx = 6 - diffDays;

          break;

        case "M": // Monthly - show day of month in increments of ~7
          const dayOfMonth = d.getDate();
          if (
            idx === 0 ||
            idx === data.length - 1 ||
            dayOfMonth % 7 === 1 ||
            dayOfMonth === 1
          ) {
            label = `${dayOfMonth}`;
          }

          idx = d.getDate();
          break;

        case "6M": // 6 months - show month abbreviation
          const months6 = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          // Show label if it's a new month or first/last point
          if (
            idx === 0 ||
            idx === data.length - 1 ||
            (idx > 0 &&
              d.getMonth() !== new Date(data[idx - 1].timestamp).getMonth())
          ) {
            label = months6[d.getMonth()];
          }
          break;

        case "Y": // Yearly - show month abbreviation
          const monthsY = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          // Show label if it's a new month or first/last point
          if (
            idx === 0 ||
            idx === data.length - 1 ||
            (idx > 0 &&
              d.getMonth() !== new Date(data[idx - 1].timestamp).getMonth())
          ) {
            label = monthsY[d.getMonth()];
          }
          break;
      }

      // Get color for this specific data point based on its range
      const pointColor = getColorForRange(
        point.range || "normal",
        settings.contrast,
      );

      const fTime = getTime(point.timestamp);
      // delete
      console.log(
        fTime,
        "🦺 value:",
        point.value,
        "label",
        label,
        "dataPointText:",
        point.value,
        "idx:",
        idx,
      );

      return {
        x: idx, // VictoryScatter needs x coordinate
        y: point.value, // VictoryScatter needs y coordinate
        label: point.value.toString(), // Show the value as label
        fill: pointColor, // Individual point color
      };
    });
  }, [data, settings.contrast, mode, timeRange]);

  // Debug: Log all chart data points
  // console.log('📊 All chartData points:', chartData.map(point => `x:${point.x}, y:${point.y}`).join(' \n '));

  // Get primary color based on overall data state (just use normal always)
  const primaryColor = useMemo(() => {
    if (data.length === 0) return getColorForRange("normal", settings.contrast);
    return getColorForRange("normal", settings.contrast);
  }, [data, settings.contrast]);

  // Font Size Scaling

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

  // Use default dimensions if not provided
  const chartWidth = width || DEFAULT_WIDTH;
  const chartHeight = height || DEFAULT_HEIGHT;

  // Render Loading State

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

  // Render Empty State

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

  // Render Chart

  const chartAccessibilityLabel =
    accessibilityLabel ||
    `${title || "Scatter chart"} showing ${data.length} data points`;

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));

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
          {/* x axis */}
          <VictoryAxis
            tickValues={ticks}
            tickFormat={(t: number) => {
              return timeLabels[t] || "";
            }}
            style={{
              grid: { stroke: "rgba(229, 229, 229, 0.5)" },
              tickLabels: { fontSize: fontSize - 2, fill: "#403e3e", angle: 0 },
              axisLabel: { fontSize: fontSize, fill: "#403e3e" },
            }}
          />
          {/* y axis */}
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
                          // Get the data point that was touched
                          const { datum } = props;
                          const dataPoint = data[datum.x];

                          if (dataPoint) {
                            // Play tone and haptic feedback
                            playToneForValue(
                              dataPoint.value,
                              dataPoint.range || "normal",
                            );

                            // Optionally show the value temporarily
                            console.log(
                              `Touched point: ${dataPoint.value} ${unit || ""} at ${new Date(dataPoint.timestamp).toLocaleTimeString()}`,
                            );
                          }

                          // Temporarily increase size to show feedback
                          return { size: mode === "simplified" ? 10 : 8 };
                        },
                      },
                    ];
                  },
                  onPressOut: () => {
                    return [
                      {
                        target: "data",
                        mutation: () => {
                          // Return to normal size
                          return null;
                        },
                      },
                    ];
                  },
                },
              },
            ]}
          />
        </VictoryChart>
      </View>

      {/* Data summary */}
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {data.length} data point{data.length !== 1 ? "s" : ""}
          {" • "}
          Range: {minValue} - {maxValue}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

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
