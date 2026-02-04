import React, { useMemo, useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

type HealthCategoryKey = "activity" | "body" | "cycle" | "hearing" | "heart" | "medications" | "mindfulness" | "mobility" | "nutrition" | "respiratory" | "sleep" | "vitals";

const CATEGORIES: Array<{
  key: HealthCategoryKey;
  label: string;
  icon: string; // SF-symbol-ish name (we map it)
}> = [
  { key: "activity", label: "Activity", icon: "flame.fill" },
  { key: "body", label: "Body Measurements", icon: "figure.arms.open" },
  { key: "cycle", label: "Cycle Tracking", icon: "dot.circle.and.hand.point.up.left.fill" },
  { key: "hearing", label: "Hearing", icon: "ear.fill" },
  { key: "heart", label: "Heart", icon: "heart.fill" },
  { key: "medications", label: "Medications", icon: "pills.fill" },
  { key: "mindfulness", label: "Mental Wellbeing", icon: "brain.head.profile" },
  { key: "mobility", label: "Mobility", icon: "figure.walk" },
  { key: "nutrition", label: "Nutrition", icon: "fork.knife" },
  { key: "respiratory", label: "Respiratory", icon: "lungs.fill" },
  { key: "sleep", label: "Sleep", icon: "bed.double.fill" },
  { key: "vitals", label: "Vitals", icon: "waveform.path.ecg" },
];

export default function BrowseScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <ThemedView style={styles.container} lightColor="#F2F2F7" darkColor="#000000">
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.largeTitle} accessibilityRole="header">
          Browse
        </ThemedText>

        {/* Search bar */}
        <View style={styles.searchWrap} accessible accessibilityLabel="Search health categories">
          <IconSymbol name="magnifyingglass" size={18} color="#8E8E93" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#8E8E93"
            style={styles.searchInput}
            accessibilityLabel="Search"
            accessibilityHint="Type to filter health categories"
          />
        </View>

        <ThemedText style={styles.sectionHeader}>Health Categories</ThemedText>

        <View style={styles.listCard}>
          {filtered.map((item, idx) => (
            <Pressable
              key={item.key}
              onPress={() => router.push(`/browse/${item.key}`)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                idx !== filtered.length - 1 && styles.rowDivider,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}`}
              accessibilityHint="Opens category details"
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <IconSymbol name={item.icon as any} size={18} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.rowLabel}>{item.label}</ThemedText>
              </View>

              <IconSymbol name="chevron.right" size={20} color="#C7C7CC" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 56, paddingBottom: 24 },

  largeTitle: { 
    paddingTop: 25,
    fontSize: 34, 
    fontWeight: "700", 
    marginBottom: 12 
    },

  searchWrap: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 18,
  },
  searchInput: { flex: 1, fontSize: 17, color: "#11181C" },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6D6D72",
    marginBottom: 8,
    marginLeft: 4,
  },

  listCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  row: {
    paddingHorizontal: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: { opacity: 0.6 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5EA" },

  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#f381bdff", // Apple-y “health” red; tweak per category later
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 17, fontWeight: "500" },
});