/**
 * SimpleLineChart Component
 *
 * Visual line chart component using react-native-gifted-charts.
 * Provides visual representation of time-series data with accessibility support.
 * Includes loading states and empty data handling.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import React, { useMemo } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { DataPoint } from "../../types";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { LineChart } from "react-native-gifted-charts";

// ============================================================================
// Component Props Interface
// ============================================================================

export interface SimpleLineChartProps {
  /** Array of data points to visualize */
  data: DataPoint[];
  /** Chart title */
  title?: string;
  /** Unit label for values (e.g., "bpm", "mg/dL") */
  unit?: string;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Accessibility label for the chart */
  accessibilityLabel?: string;
  /** Time range for label formatting (H, D, W, M, 6M, Y) */
  timeRange?: "H" | "D" | "W" | "M" | "6M" | "Y";
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;

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
        return "#007AFF"; // iOS blue
      case "warning":
        return "#FF9500"; // iOS orange
      case "danger":
        return "#FF3B30"; // iOS red
    }
  }
};

// SimpleLineChart Component

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
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

  // Memoized Calculations

  /*
   * Todo I have to change the daily tab to only show 24 hours of data
   * (past 24, so if it is 11pm now it would show from 11pm yesterday) and then label the 12-6
   */
  const chartData = useMemo(() => {
    const sortedData = [...data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    });

    return sortedData.map((point) => {
      const d = new Date(point.timestamp);
      let label = "";

      switch (timeRange) {
        case "H": {
          label = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          break;
        }

        case "D": {
          const hour = d.getHours();
          if (
            (hour === 0 || hour === 6 || hour === 12 || hour === 18) &&
            d.getMinutes() === 0
          ) {
            label =
              hour === 0
                ? "12am"
                : hour === 6
                  ? "6am"
                  : hour === 12
                    ? "12pm"
                    : "6pm";
          }
          break;
        }

        case "W": {
          const current = new Date(d);
          current.setHours(0, 0, 0, 0);

          const diffMs = today.getTime() - current.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          // show labels only for the last 7 days
          if (diffDays >= 0 && diffDays <= 6) {
            label = weekdayFormatter.format(current);
          }
          break;
        }

        case "M": {
          const current = new Date(d);
          current.setHours(0, 0, 0, 0);

          const diffMs = today.getTime() - current.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          // show labels roughly weekly across last 30 days
          if ([29, 22, 15, 8, 1].includes(29 - diffDays)) {
            label = `${current.getDate()}`;
          }
          break;
        }

        case "6M": {
          const monthDiff =
            (now.getFullYear() - d.getFullYear()) * 12 +
            (now.getMonth() - d.getMonth());

          // current month = 5, previous = 4, etc.
          const rollingIndex = 5 - monthDiff;

          if (rollingIndex >= 0 && rollingIndex <= 5) {
            label = monthFormatter.format(d);
          }
          break;
        }

        case "Y": {
          const monthDiff =
            (now.getFullYear() - d.getFullYear()) * 12 +
            (now.getMonth() - d.getMonth());

          // current month = 11, previous = 10, etc.
          const rollingIndex = 11 - monthDiff;

          // only label every other month like your scatter ticks
          if (
            rollingIndex >= 0 &&
            rollingIndex <= 11 &&
            [0, 2, 4, 6, 8, 10].includes(rollingIndex)
          ) {
            label = monthFormatter.format(d);
          }
          break;
        }
      }

      const pointColor = getColorForRange(
        point.range || "normal",
        settings.contrast,
      );

      return {
        value: point.value,
        label,
        dataPointText: `${point.value}`,
        dataPointColor: pointColor,
        dataPointRadius: mode === "simplified" ? 6 : 4,
      };
    });
  }, [data, settings.contrast, mode, timeRange]);
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
    `${title || "Line chart"} showing ${data.length} data points`;

  const minValue = Math.round(Math.min(...data.map((d) => d.value)));
  const maxValue = Math.round(Math.max(...data.map((d) => d.value)));

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
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          spacing={Math.max(
            8,
            Math.min(
              24,
              Math.floor(chartWidth / Math.max(chartData.length, 8)),
            ),
          )}
          color={primaryColor}
          thickness={mode === "simplified" ? 3 : 2.5}
          curved
          hideDataPoints
          // showTextOnFocus
          hideRules
          rulesColor="#E5E5E5"
          xAxisColor="#E5E5E5"
          yAxisColor="#E5E5E5"
          yAxisTextStyle={{ fontSize: fontSize - 2, color: "#403e3eff" }}
          backgroundColor="transparent"
          isAnimated
          animationDuration={800}
          startFillColor={primaryColor}
          startOpacity={0.3}
          endOpacity={0.05}
          areaChart
          scrollToEnd={false}
          disableScroll={true}
        />
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
    marginVertical: 8,
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
    marginTop: 8,
    paddingHorizontal: 16,
  },
  summaryText: {
    color: "#666",
    textAlign: "center",
  },
});

export default SimpleLineChart;
