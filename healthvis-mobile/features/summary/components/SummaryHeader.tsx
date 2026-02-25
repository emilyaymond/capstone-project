// healthvis-mobile/features/summary/components/SummaryHeader.tsx
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { ThemedText } from "@/components/themed-text";

type Props = {
  initials?: string;
};

export function SummaryHeader({ initials = "JM" }: Props) {
  return (
    <View style={styles.headerRow}>
      <ThemedText style={styles.largeTitle}>Summary</ThemedText>

      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </View>
        </TouchableOpacity>

        <Link href="/edit-pinned" asChild>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit pinned">
            <ThemedText style={styles.editLink}>Edit</ThemedText>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 10,
  },
  largeTitle: {
    paddingTop: 64,
    fontSize: 34,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3b4c7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  editLink: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
