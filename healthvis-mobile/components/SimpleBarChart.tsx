// components/SimpleBarChart.tsx
import React, { useMemo } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { DataPoint } from "../types";
import { useAccessibility } from "../contexts/AccessibilityContext";

export interface SimpleBarChartProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  width?: number;
  height?: number;
  isLoading?: boolean;
  accessibilityLabel?: string;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 220;

const getColorForRange = (
  range: "normal" | "warning" | "danger",
  contrast: "normal" | "high"
): string => {
  if (contrast === "high") {
    if (range === "danger") return "#8B0000";
    if (range === "warning") return "#B35900";
    return "#000000";
  } else {
    if (range === "danger") return "#FF3B30";
    if (range === "warning") return "#FF9500";
    return "#007AFF";
  }
};

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  unit,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  isLoading = false,
  accessibilityLabel,
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

  const primaryColor = useMemo(() => {
    if (!data.length) return getColorForRange("normal", settings.contrast);
    const hasDanger = data.some((d) => d.range === "danger");
    const hasWarning = data.some((d) => d.range === "warning");
    if (hasDanger) return getColorForRange("danger", settings.contrast);
    if (hasWarning) return getColorForRange("warning", settings.contrast);
    return getColorForRange("normal", settings.contrast);
  }, [data, settings.contrast]);

  if (isLoading) {
    return (
      <View style={[styles.container, { width, height: height + 60 }]}>
        {title ? <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text> : null}
        <View style={[styles.stateBox, { height }]}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.stateText, { fontSize }]}>Loading chart data...</Text>
        </View>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View
        style={[styles.container, { width, height: height + 60 }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel || "Empty chart"}
        accessibilityHint="No data available to display"
      >
        {title ? <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text> : null}
        <View style={[styles.stateBox, { height }]}>
          <Text style={[styles.stateText, { fontSize }]}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartData = data.map((p, idx) => ({
    value: Number(p.value) || 0,
    label: "", // keep clean; you can add labels when you bucket by day/week
    frontColor: primaryColor,
    topLabelComponent:
      mode === "simplified"
        ? () => <Text style={{ fontSize: fontSize - 4 }}>{Math.round(Number(p.value) || 0)}</Text>
        : undefined,
  }));

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <View
      style={[styles.container, { width, height: height + 60 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || `${title || "Bar chart"} showing ${data.length} bars`}
    >
      {title ? <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text> : null}

      <BarChart
        data={chartData}
        width={width}
        height={height}
        barWidth={mode === "simplified" ? 18 : 14}
        spacing={mode === "simplified" ? 10 : 8}
        roundedTop
        disablePress={false}
        yAxisThickness={0}
        xAxisThickness={0}
        isAnimated
        animationDuration={700}
      />

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { fontSize: fontSize - 2 }]}>
          {data.length} bar{data.length !== 1 ? "s" : ""} • Range: {minValue}–{maxValue}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 8 },
  title: { fontWeight: "600", marginBottom: 8, color: "#000", textAlign: "center" },
  stateBox: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    width: "100%",
    padding: 20,
  },
  stateText: { marginTop: 12, color: "#666", textAlign: "center" },
  summary: { marginTop: 8, paddingHorizontal: 16 },
  summaryText: { color: "#666", textAlign: "center" },
});

export default SimpleBarChart;
