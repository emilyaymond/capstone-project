import React, { useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useHealthData } from "@/contexts/HealthDataContext";
import { getDisplayNameForType } from "@/types/health-metric";

const CATEGORY_LABELS: Record<string, string> = {
  activity: "Activity",
  heart: "Heart",
  sleep: "Sleep",
  nutrition: "Nutrition",
  vitals: "Vitals",
  body: "Body Measurements",
  mindfulness: "Mental Wellbeing",
  respiratory: "Respiratory",
  mobility: "Mobility",
  hearing: "Hearing",
  medications: "Medications",
  cycle: "Cycle Tracking",
};

export default function CategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();

  const label = CATEGORY_LABELS[category ?? ""] ?? "Category";

  const { getMetricsByCategory } = useHealthData();

  // Map Apple-like keys to your internal keys
  const internalCategory = useMemo(() => {
    switch (category) {
      case "activity":
        return "activity";
      case "heart":
        return "vitals"; // or "vitals" if heart rate is stored there
      case "sleep":
        return "sleep";
      case "nutrition":
        return "nutrition";
      case "body":
        return "body";
      case "mindfulness":
        return "mindfulness";
      default:
        return "vitals";
    }
  }, [category]);

  const metrics = getMetricsByCategory(internalCategory as any);

  return (
    <ThemedView style={styles.container} lightColor="#F2F2F7" darkColor="#000000">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Apple-ish back button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Browse"
          accessibilityHint="Go back"
        >
          <IconSymbol name="chevron.left" size={20} color="#007AFF" />
          <ThemedText style={styles.backText}>Browse</ThemedText>
        </Pressable>

        <ThemedText style={styles.largeTitle} accessibilityRole="header">
          {label}
        </ThemedText>

        <ThemedText style={styles.sectionHeader}>Today</ThemedText>

        <View style={styles.listCard}>
          {metrics.length === 0 ? (
            <View style={styles.emptyRow}>
              <ThemedText style={styles.emptyText}>No data available</ThemedText>
            </View>
          ) : (
            metrics.map((m, idx) => {
              const displayName = getDisplayNameForType(m.type);
              return (
                <View
                  key={m.id}
                  style={[styles.metricRow, idx !== metrics.length - 1 && styles.rowDivider]}
                  accessible
                  accessibilityLabel={`${displayName}. ${m.value} ${m.unit ?? ""}.`}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.metricTitle}>{displayName}</ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {m.value} {m.unit ?? ""}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color="#C7C7CC" />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 40, paddingBottom: 24 },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  backText: { color: "#007AFF", fontSize: 17, fontWeight: "500" },

  largeTitle: { paddingTop: 25, fontSize: 34, fontWeight: "700", marginBottom: 16 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6D6D72",
    marginBottom: 8,
    marginLeft: 4,
  },

  listCard: { borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF" },
  metricRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5EA" },

  metricTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: "700" },

  emptyRow: { padding: 16 },
  emptyText: { opacity: 0.6 },
});