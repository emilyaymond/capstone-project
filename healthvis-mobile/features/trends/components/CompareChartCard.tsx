import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { METRIC_CHIPS, TimeRangeKey } from "../utils/trendConfig";
import { LineChart } from "react-native-gifted-charts";

// Color palette for different metrics
const METRIC_COLORS: Record<string, string> = {
  heart_rate: "#FF3B30", // Red for heart rate
  sleep: "#5856D6", // Purple for sleep
  steps: "#34C759", // Green for steps
  glucose: "#FF9500", // Orange for glucose
};

type Series = {
  key: string;
  label: string;
  unit?: string;
  points: { value: number; timestamp: Date }[];
};

export default function CompareChartCard(props: {
  timeRange: TimeRangeKey;
  onChangeTimeRange: (v: TimeRangeKey) => void;

  selectedMetricKeys: string[];
  onChangeSelectedMetricKeys: (keys: string[]) => void;

  series: Series[];
}) {
  const { selectedMetricKeys, onChangeSelectedMetricKeys, series } = props;

  const [showPicker, setShowPicker] = useState(false);

  const toggleMetric = (key: string) => {
    const next =
      selectedMetricKeys.includes(key)
        ? selectedMetricKeys.filter((k) => k !== key)
        : [...selectedMetricKeys, key];

    onChangeSelectedMetricKeys(next);
  };

  // Normalize each series to 0-100 so different units can be compared on one chart
  const normalized = useMemo(() => {
    return series
      .filter((s) => s.points.length > 0)
      .map((s) => {
        const values = s.points.map((p) => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        return {
          key: s.key,
          label: s.label,
          unit: s.unit ?? "",
          originalMin: min,
          originalMax: max,
          points: s.points.map((p) => ({
            timestamp: p.timestamp,
            value: Math.max(0, Math.min(100, ((p.value - min) / range) * 100)),
          })),
        };
      });
  }, [series]);

  const hasData = normalized.length > 0;

  return (
    <ThemedView style={styles.card} accessible accessibilityLabel="Compare chart">
      <View style={styles.headerRow}>
        <ThemedText style={styles.cardTitle} accessibilityRole="header">
          Compare
        </ThemedText>

        <AccessibleButton
          label={showPicker ? "Done" : "Compare other data"}
          hint="Choose which metrics to compare"
          onPress={() => setShowPicker((v) => !v)}
          variant="outline"
          style={styles.compareBtn}
        />
      </View>

      {/* SINGLE combined chart */}
      {hasData ? (
        <>
          <ThemedText style={styles.subLabel}>
            {normalized.map((s) => {
              const pointCount = s.points.length;
              return `${s.label} (${Math.round(s.originalMin)}–${Math.round(s.originalMax)} ${s.unit}, ${pointCount} ${pointCount === 1 ? 'point' : 'points'})`;
            }).join("  •  ")}
          </ThemedText>

          <View style={styles.chartContainer}>
            <LineChart
              data={normalized[0]?.points.map((p, idx) => ({
                value: p.value,
                dataPointText: `${Math.round(normalized[0].originalMin + (p.value / 100) * (normalized[0].originalMax - normalized[0].originalMin))}`,
              })) || []}
              data2={normalized[1]?.points.map((p) => ({
                value: p.value,
                dataPointText: `${Math.round(normalized[1].originalMin + (p.value / 100) * (normalized[1].originalMax - normalized[1].originalMin))}`,
              }))}
              height={190}
              width={320}
              color={METRIC_COLORS[normalized[0]?.key] || "#FF3B30"}
              color2={METRIC_COLORS[normalized[1]?.key] || "#5856D6"}
              thickness={2.5}
              thickness2={2.5}
              curved
              hideDataPoints={false}
              dataPointsRadius={4}
              dataPointsColor={METRIC_COLORS[normalized[0]?.key] || "#FF3B30"}
              dataPointsColor2={METRIC_COLORS[normalized[1]?.key] || "#5856D6"}
              hideRules
              hideYAxisText
              xAxisColor="#E5E5E5"
              yAxisColor="#E5E5E5"
              backgroundColor="transparent"
              isAnimated
              animationDuration={800}
              accessible
              accessibilityLabel="Comparison chart showing multiple metrics over time"
              accessibilityRole="image"
            />
          </View>

          {/* mini legend (simple + readable) */}
          <View style={styles.legendRow}>
            {normalized.map((s) => (
              <View key={s.key} style={styles.legendItem}>
                <View 
                  style={[
                    styles.legendDot, 
                    { backgroundColor: METRIC_COLORS[s.key] || "#111" }
                  ]} 
                />
                <ThemedText style={styles.legendText}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : (
        <ThemedView style={styles.chartShell} accessibilityLabel="Chart area">
          <ThemedText style={styles.placeholderText}>
            No data yet. Tap “Compare other data” to pick metrics.
          </ThemedText>
        </ThemedView>
      )}

      {/* HIDDEN metric picker (chips BELOW the chart) */}
      {showPicker && (
        <View style={styles.pickerWrap} accessibilityLabel="Metric picker">
          <ThemedText style={styles.pickerTitle}>Metrics</ThemedText>
          <View style={styles.chipsRow}>
            {METRIC_CHIPS.map((m) => {
              const active = selectedMetricKeys.includes(m.key);
              return (
                <AccessibleButton
                  key={m.key}
                  label={m.label}
                  hint={active ? "Remove from comparison" : "Add to comparison"}
                  onPress={() => toggleMetric(m.key)}
                  variant={active ? "primary" : "outline"}
                  style={styles.chipSmall}
                />
              );
            })}
          </View>
        </View>
      )}
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: { fontWeight: "700", fontSize: 18 },
  compareBtn: { paddingHorizontal: 10 },

  subLabel: { opacity: 0.7, fontSize: 12, lineHeight: 16 },

  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  chartShell: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ededed",
    padding: 14,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { opacity: 0.7, textAlign: "center" },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 999, 
  },
  legendText: { fontSize: 12, opacity: 0.85 },

  pickerWrap: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  pickerTitle: { fontSize: 13, fontWeight: "700", opacity: 0.85 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // SMALLER chips
  chipSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 0,
  },
});
