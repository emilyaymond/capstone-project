import React, { useEffect, useState } from "react";
import { ScrollView, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { loadPinnedKeys, savePinnedKeys, PinnedKey } from "@/lib/pins";

const ALL: { key: PinnedKey; label: string }[] = [
  { key: "sleep_score", label: "Sleep Score" },
  { key: "activity_rings", label: "Activity" },
  { key: "heart_rate_latest", label: "Heart Rate" },
  { key: "steps_today", label: "Steps" },
  { key: "flights_climbed", label: "Flights Climbed" },
  { key: "active_energy", label: "Active Energy" },
  { key: "resting_energy", label: "Resting Energy" },
];

export default function EditPinned() {
  const router = useRouter();
  const [selected, setSelected] = useState<PinnedKey[]>([]);

  useEffect(() => {
    loadPinnedKeys().then(setSelected);
  }, []);

  const toggle = (k: PinnedKey) => {
    setSelected((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  };

  const save = async () => {
    await savePinnedKeys(selected);
    router.back();
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>Pinned</ThemedText>
        <ThemedText style={styles.sub}>
          Choose what appears in your Summary.
        </ThemedText>

        <View style={styles.card}>
          {ALL.map((item, idx) => {
            const on = selected.includes(item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => toggle(item.key)}
                style={[styles.row, idx !== ALL.length - 1 && styles.divider]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.label}
              >
                <ThemedText style={styles.rowLabel}>{item.label}</ThemedText>
                <ThemedText
                  style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}
                >
                  {on ? "On" : "Off"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <AccessibleButton label="Save" onPress={save} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 32, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: "700", marginBottom: 6 },
  sub: { opacity: 0.7, marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  row: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA", 
  },
  rowLabel: { fontSize: 17, fontWeight: "500" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  badgeOn: { backgroundColor: "#E8F5E9", color: "#1B5E20" },
  badgeOff: { backgroundColor: "#F2F2F7", color: "#6D6D72" },
});
