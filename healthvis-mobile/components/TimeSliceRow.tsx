import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { HealthMetric } from "@/types/health-metric";
import { formatSleepDuration, getSleepStageColor } from "@/lib/sleep-utils";

interface TimeSliceRowProps {
  metric: HealthMetric;
  onFocus: () => void;
  accessibilityLabel: string;
}

export function TimeSliceRow({
  metric,
  onFocus,
  accessibilityLabel,
}: TimeSliceRowProps) {
  const isSleepMetric = metric.type === "sleep";

  const color = isSleepMetric
    ? getSleepStageColor(metric.metadata?.sleepStage || "Asleep")
    : metric.range === "danger"
      ? "#FF3B30"
      : metric.range === "warning"
        ? "#FF9500"
        : "#34C759"; // Green for normal

  const displayValue = isSleepMetric
    ? formatSleepDuration(Number(metric.value))
    : `${metric.value} ${metric.unit || "bpm"}`;

  const sleepStage = isSleepMetric ? metric.metadata?.sleepStage : null;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onFocus}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        isSleepMetric
          ? "Double tap for details"
          : "Double tap to hear tone for this time slice"
      }
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        <View style={styles.leftContent}>
          <ThemedText style={[styles.time, { color }]} lightColor={color}>
            {new Date(metric.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </ThemedText>
          {sleepStage && (
            <ThemedText style={styles.sleepStage} lightColor={color}>
              {sleepStage}
            </ThemedText>
          )}
        </View>
        <ThemedText style={[styles.value, { color }]} lightColor={color}>
          {displayValue}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginHorizontal: 4,
    marginVertical: 2,
  },
  rowContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftContent: {
    gap: 2,
  },
  time: { fontSize: 14, fontWeight: "600" },
  sleepStage: { fontSize: 11, fontWeight: "600", opacity: 0.7 },
  value: { fontSize: 18, fontWeight: "900" },
});
