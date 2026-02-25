import React from "react";
import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { TimeRangeKey } from "../utils/trendConfig";

export default function TrendSummaryCard(props: {
  timeRange: TimeRangeKey;
  selectedMetricKeys: string[];
  summaryText: string | null; // later from AI
}) {
  const { timeRange, selectedMetricKeys, summaryText } = props;

  return (
    <ThemedView style={styles.card} accessible accessibilityLabel="Insights summary">
      <ThemedText style={styles.title} accessibilityRole="header">
        Insights
      </ThemedText>

      <ThemedText style={styles.body}>
        {summaryText ??
          `AI trend summaries will appear here. (Time range: ${timeRange}. Metrics: ${
            selectedMetricKeys.length ? selectedMetricKeys.join(", ") : "none"
          })`}
      </ThemedText>

      <AccessibleButton
        label="Generate Insights (soon)"
        hint="This will generate a summary of trends using AI"
        onPress={() => {}}
        variant="outline"
      />
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
  title: { fontWeight: "700", fontSize: 18 },
  body: { opacity: 0.8, lineHeight: 20 },
});
