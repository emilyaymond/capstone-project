import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";

export default function ExploreModesCard(props: {
  onPressSonification: () => void;
  onPressHaptics: () => void;
}) {
  return (
    <ThemedView style={styles.card} accessible accessibilityLabel="Explore modes">
      <ThemedText style={styles.title} accessibilityRole="header">
        Explore
      </ThemedText>

      <ThemedText style={styles.body}>
        Later you’ll be able to explore the chart with sound and vibration feedback.
      </ThemedText>

      <View style={styles.rowWrap}>
        <AccessibleButton
          label="Sonification (soon)"
          hint="Play data as sound"
          onPress={props.onPressSonification}
          variant="outline"
          style={styles.btn}
        />
        <AccessibleButton
          label="Haptics (soon)"
          hint="Explore data with haptic patterns"
          onPress={props.onPressHaptics}
          variant="outline"
          style={styles.btn}
        />
      </View>
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
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  btn: { minWidth: 160 },
});
