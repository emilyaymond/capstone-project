// healthvis-mobile/features/summary/components/PinnedSection.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { PinnedKey } from "@/lib/pins";

type VitalLike = { value?: number | string } | undefined;

type Props = {
  pins: PinnedKey[];
  heartRateVital: VitalLike;
  stepsVital: VitalLike;
  sleepVital: VitalLike;
};

export function PinnedSection({ pins, heartRateVital, stepsVital, sleepVital }: Props) {
  const rows = useMemo(() => {
    return pins
      .map((p) => {
        switch (p) {
          case "heart_rate_latest":
            return {
              key: p,
              label: "Heart Rate",
              value: `${heartRateVital?.value ?? "0"} BPM`,
            };
          case "steps_today":
            return {
              key: p,
              label: "Steps",
              value: `${stepsVital?.value ?? "0"} steps`,
            };
          case "sleep_score":
            return {
              key: p,
              label: "Sleep",
              value: `${sleepVital?.value ?? "0"} hr`,
            };
          default:
            return null;
        }
      })
      .filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  }, [pins, heartRateVital?.value, stepsVital?.value, sleepVital?.value]);

  return (
    <View style={styles.sectionWrap}>
      <ThemedText style={styles.sectionTitle}>Pinned</ThemedText>

      <View style={styles.sectionCard}>
        {rows.length ? (
          rows.map((row, idx) => {
            const showDivider = idx !== rows.length - 1;
            return (
              <View key={row.key} style={[styles.row, showDivider && styles.divider]}>
                <ThemedText style={styles.label}>{row.label}</ThemedText>
                <ThemedText style={styles.value}>{row.value}</ThemedText>
              </View>
            );
          })
        ) : (
          <View style={{ padding: 16 }}>
            <ThemedText style={{ opacity: 0.7 }}>No pinned items yet.</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 14,
    backgroundColor: "white",
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
  },
  value: {
    fontSize: 17,
    fontWeight: "700",
    opacity: 0.9,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },
});
