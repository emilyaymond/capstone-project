import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { HealthMetric } from "@/types/health-metric";

type Props = {
  metric: HealthMetric;
  title: string;
  subtitle?: string;
};

export function MetricSummaryCard({ metric, title, subtitle }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/metric/[type]",
          params: { type: metric.type },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${metric.value} ${metric.unit ?? ""}. Opens details.`}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </View>

      <View style={styles.valueRow}>
        <ThemedText style={styles.value}>{String(metric.value)}</ThemedText>
        {!!metric.unit && (
          <ThemedText style={styles.unit}>{metric.unit}</ThemedText>
        )}
      </View>

      {!!subtitle && (
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "700" },
  chevron: { fontSize: 22, opacity: 0.35, fontWeight: "700" },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 10,
  },
  value: { fontSize: 36, fontWeight: "800", lineHeight: 48 },
  unit: { fontSize: 16, opacity: 0.6, fontWeight: "600" },
  subtitle: { marginTop: 6, opacity: 0.65, fontSize: 14 },
});
