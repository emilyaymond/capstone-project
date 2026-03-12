/**
 * SleepStageBreakdown
 *
 * Displays a breakdown of sleep stages with visual indicators and durations.
 * Shows Light Sleep, Deep Sleep, REM Sleep, and time awake.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { HealthMetric } from "@/types/health-metric";
import {
  aggregateSleepByStage,
  formatSleepDuration,
  getSleepStageColor,
  calculateSleepEfficiency,
  calculateSleepQuality,
} from "@/lib/sleep-utils";

interface SleepStageBreakdownProps {
  sleepMetrics: HealthMetric[];
}

export function SleepStageBreakdown({
  sleepMetrics,
}: SleepStageBreakdownProps) {
  const breakdown = aggregateSleepByStage(sleepMetrics);
  const efficiency = calculateSleepEfficiency(breakdown);
  const quality = calculateSleepQuality(breakdown);

  const stages = [
    {
      label: "Deep Sleep",
      duration: breakdown.deepSleep,
      color: getSleepStageColor("Deep"),
      icon: "●",
    },
    {
      label: "REM Sleep",
      duration: breakdown.remSleep,
      color: getSleepStageColor("REM"),
      icon: "●",
    },
    {
      label: "Light Sleep",
      duration: breakdown.lightSleep,
      color: getSleepStageColor("Light"),
      icon: "●",
    },
    {
      label: "Awake",
      duration: breakdown.awake,
      color: getSleepStageColor("Awake"),
      icon: "○",
    },
  ].filter((stage) => stage.duration > 0);

  const qualityColors = {
    excellent: "#34C759",
    good: "#30D158",
    fair: "#FF9500",
    poor: "#FF3B30",
  };

  const qualityLabels = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Total Sleep</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {formatSleepDuration(breakdown.totalSleep)}
          </ThemedText>
        </View>

        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Efficiency</ThemedText>
          <ThemedText style={styles.summaryValue}>{efficiency}%</ThemedText>
        </View>

        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Quality</ThemedText>
          <ThemedText
            style={[styles.summaryValue, { color: qualityColors[quality] }]}
          >
            {qualityLabels[quality]}
          </ThemedText>
        </View>
      </View>

      <View style={styles.stagesContainer}>
        <ThemedText style={styles.stagesTitle}>Sleep Stages</ThemedText>
        {stages.map((stage, index) => {
          const percentage =
            breakdown.totalInBed > 0
              ? (stage.duration / breakdown.totalInBed) * 100
              : 0;

          return (
            <View
              key={stage.label}
              style={styles.stageRow}
              accessibilityLabel={`${stage.label}: ${formatSleepDuration(stage.duration)}, ${Math.round(percentage)}% of time in bed`}
            >
              <View style={styles.stageInfo}>
                <ThemedText style={[styles.stageIcon, { color: stage.color }]}>
                  {stage.icon}
                </ThemedText>
                <ThemedText style={styles.stageLabel}>{stage.label}</ThemedText>
              </View>

              <View style={styles.stageData}>
                <ThemedText style={styles.stageDuration}>
                  {formatSleepDuration(stage.duration)}
                </ThemedText>
                <ThemedText style={styles.stagePercentage}>
                  {Math.round(percentage)}%
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>

      {breakdown.inBed > 0 && (
        <View style={styles.inBedNote}>
          <ThemedText style={styles.inBedText}>
            Time in bed: {formatSleepDuration(breakdown.totalInBed)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  stagesContainer: {
    gap: 8,
  },
  stagesTitle: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.8,
    marginBottom: 4,
  },
  stageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageIcon: {
    fontSize: 16,
    fontWeight: "900",
  },
  stageLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  stageData: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageDuration: {
    fontSize: 15,
    fontWeight: "700",
  },
  stagePercentage: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  inBedNote: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  inBedText: {
    fontSize: 13,
    opacity: 0.6,
    fontStyle: "italic",
  },
});
