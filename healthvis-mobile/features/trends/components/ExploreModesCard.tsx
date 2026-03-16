/**
 * ExploreModesCard
 *
 * Provides entry points for sonification (data-as-sound) and haptic
 * exploration of chart data. Buttons are interactive and accessibility-first.
 */

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES } from "@/constants/accessibility";

type Props = {
  onPressSonification: () => void;
  onPressHaptics: () => void;
};

export default function ExploreModesCard({
  onPressSonification,
  onPressHaptics,
}: Props) {
  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  return (
    <ThemedView
      style={styles.card}
      accessible
      accessibilityLabel="Explore your data with sound and vibration"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <ThemedText
          style={[styles.title, { fontSize: fontSize.body + 2 }]}
          accessibilityRole="header"
        >
          Explore
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText style={[styles.badgeText, { fontSize: fontSize.label - 1 }]}>
            Accessibility
          </ThemedText>
        </View>
      </View>

      {/* Description */}
      <ThemedText
        style={[
          styles.body,
          { fontSize: fontSize.body, lineHeight: fontSize.body * 1.55 },
        ]}
      >
        Experience your health data through sound and vibration — designed for
        eyes-free exploration.
      </ThemedText>

      {/* Feature buttons */}
      <View style={styles.featureList}>
        <FeatureRow
          icon="♪"
          title="Sonification"
          description="Listen to metric patterns as musical tones"
          onPress={onPressSonification}
          accessibilityHint="Play health data as audio"
          fontSize={fontSize}
        />

        <View style={styles.divider} />

        <FeatureRow
          icon="⚡"
          title="Haptic Pulse"
          description="Feel data rhythms through vibration patterns"
          onPress={onPressHaptics}
          accessibilityHint="Explore health data through haptic feedback"
          fontSize={fontSize}
        />
      </View>
    </ThemedView>
  );
}

// ── Feature row ───────────────────────────────────────────────────────────────

type FontSizeObj = { body: number; label: number; title: number; heading: number };

function FeatureRow({
  icon,
  title,
  description,
  onPress,
  accessibilityHint,
  fontSize,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  accessibilityHint: string;
  fontSize: FontSizeObj;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.featureRow}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.featureIconWrap}>
        <ThemedText style={[styles.featureIcon, { fontSize: fontSize.body + 4 }]}>
          {icon}
        </ThemedText>
      </View>
      <View style={styles.featureText}>
        <ThemedText style={[styles.featureTitle, { fontSize: fontSize.body }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.featureDesc, { fontSize: fontSize.label }]}>
          {description}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "800",
    color: "#1C1C1E",
  },
  badge: {
    backgroundColor: "rgba(88,86,214,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#5856D6",
    fontWeight: "700",
  },
  body: {
    color: "#636366",
    fontWeight: "400",
  },
  featureList: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    minHeight: 44,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(88,86,214,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: {
    color: "#5856D6",
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontWeight: "700",
    color: "#1C1C1E",
  },
  featureDesc: {
    color: "#8E8E93",
    fontWeight: "400",
  },
});
