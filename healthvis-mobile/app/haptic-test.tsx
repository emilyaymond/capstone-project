import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { AccessibleButton } from "@/components/AccessibleButton";

export default function HapticTestScreen() {
  const [lastTest, setLastTest] = useState<string>("None");
  const [error, setError] = useState<string>("");

  const testHaptic = async (type: string, fn: () => Promise<void>) => {
    setError("");
    try {
      console.log(`Testing ${type}...`);
      await fn();
      setLastTest(`${type} - SUCCESS`);
      console.log(`${type} completed`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`${type} failed: ${errorMsg}`);
      setLastTest(`${type} - FAILED`);
      console.error(`${type} error:`, err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Haptic Feedback Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
        <Text style={styles.subtitle}>Version: {Platform.Version}</Text>
      </View>

      <View style={styles.status}>
        <Text style={styles.statusLabel}>Last Test:</Text>
        <Text style={styles.statusValue}>{lastTest}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impact Feedback</Text>

        <AccessibleButton
          label="Light Impact"
          hint="Test light haptic feedback"
          onPress={() =>
            testHaptic("Light Impact", () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Medium Impact"
          hint="Test medium haptic feedback"
          onPress={() =>
            testHaptic("Medium Impact", () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Heavy Impact"
          hint="Test heavy haptic feedback"
          onPress={() =>
            testHaptic("Heavy Impact", () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Rigid Impact"
          hint="Test rigid haptic feedback"
          onPress={() =>
            testHaptic("Rigid Impact", () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Soft Impact"
          hint="Test soft haptic feedback"
          onPress={() =>
            testHaptic("Soft Impact", () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
            )
          }
          variant="secondary"
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Feedback</Text>

        <AccessibleButton
          label="Success Notification"
          hint="Test success haptic"
          onPress={() =>
            testHaptic("Success", () =>
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              ),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Warning Notification"
          hint="Test warning haptic"
          onPress={() =>
            testHaptic("Warning", () =>
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              ),
            )
          }
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Error Notification"
          hint="Test error haptic"
          onPress={() =>
            testHaptic("Error", () =>
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
            )
          }
          variant="secondary"
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selection Feedback</Text>

        <AccessibleButton
          label="Selection"
          hint="Test selection haptic"
          onPress={() =>
            testHaptic("Selection", () => Haptics.selectionAsync())
          }
          variant="secondary"
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Complex Patterns</Text>

        <AccessibleButton
          label="Double Tap"
          hint="Test double tap pattern"
          onPress={async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await new Promise((resolve) => setTimeout(resolve, 100));
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLastTest("Double Tap - SUCCESS");
            } catch (err) {
              setError(`Double Tap failed: ${err}`);
            }
          }}
          variant="secondary"
          style={styles.button}
        />

        <AccessibleButton
          label="Escalating Pattern"
          hint="Test escalating haptic pattern"
          onPress={async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await new Promise((resolve) => setTimeout(resolve, 150));
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await new Promise((resolve) => setTimeout(resolve, 150));
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setLastTest("Escalating - SUCCESS");
            } catch (err) {
              setError(`Escalating failed: ${err}`);
            }
          }}
          variant="secondary"
          style={styles.button}
        />
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Troubleshooting:</Text>
        <Text style={styles.instructionsText}>
          1. Make sure you&apos;re on a physical device (not simulator)
        </Text>
        <Text style={styles.instructionsText}>
          2. Check Settings → Sounds & Haptics → System Haptics is ON
        </Text>
        <Text style={styles.instructionsText}>3. Disable Low Power Mode</Text>
        <Text style={styles.instructionsText}>
          4. Check the console logs for errors
        </Text>
        <Text style={styles.instructionsText}>
          5. If nothing works, rebuild: npm run ios
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  status: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  error: {
    fontSize: 14,
    color: "#d32f2f",
    marginTop: 8,
  },
  section: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    marginBottom: 10,
  },
  instructions: {
    padding: 20,
    backgroundColor: "#fff3cd",
    margin: 10,
    borderRadius: 8,
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
});
