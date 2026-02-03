/**
 * Home Screen
 *
 * Displays health data visualization with:
 * - High-level vital signs summary
 * - VitalCard components for each vital sign (heart rate, glucose, steps, sleep)
 * - "Hear Summary" button for overall TTS summary
 * - Proper screen reader announcements on load
 * - Integration with HealthDataContext for data
 * - Loading and error states
 *
 * Requirements: 7.1, 7.4, 8.5
 */

import React, { useEffect, useCallback, useState, use } from "react";
import { ScrollView, StyleSheet, View, RefreshControl } from "react-native";
import { Link } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { VitalCard } from "@/components/VitalCard";
import { AccessibleButton } from "@/components/AccessibleButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSpeech } from "@/hooks/useSpeech";
import {
  announceNavigation,
  announceError,
  announceLoading,
} from "@/lib/announcer";
import { FONT_SIZES } from "@/constants/accessibility";
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
} from "react-native-health";

const permissions: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount],
    write: [],
  },
};
// console.log(
//   "AppleHealthKit keys:",
//   AppleHealthKit && Object.keys(AppleHealthKit as any),
// );

export default function HomeScreen() {
  const [hasPermissions, setHasPermission] = useState(false);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    AppleHealthKit.initHealthKit(permissions, (err: string) => {
      if (err) {
        console.log("Error initializing HealthKit: ", err);
        return;
      }

      setHasPermission(true);
      console.log(
        "HealthKit initialized successfully and permissions granted.",
      );
    });
  }, []);

  useEffect(() => {
    if (!hasPermissions) {
      return;
    }

    const options: HealthInputOptions = {
      date: new Date().toISOString(),
      includeManuallyAdded: false,
    };

    AppleHealthKit.getStepCount(options, (err, results) => {
      if (err) {
        console.log("Error fetching step count: ", err);
        return;
      }

      console.log("Step Count: ", results);
    });
  }, [hasPermissions]);

  // ============================================================================
  // Hooks
  // ============================================================================

  const { vitals, isLoading, error, fetchData, refreshData, clearError } =
    useHealthData();
  const { settings } = useAccessibility();
  const { speakSummary, isSpeaking, stop } = useSpeech();

  // ============================================================================
  // Screen Reader Announcements on Load (Requirement 8.5)
  // ============================================================================

  useEffect(() => {
    // Announce navigation to Home screen
    announceNavigation("Home", "View your health data summary");

    // Load data on mount
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Announce Errors
  // ============================================================================

  useEffect(() => {
    if (error) {
      announceError(error.message || "Failed to load health data");
    }
  }, [error]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handles "Hear Summary" button press
   * Requirement 7.1: High-level vital signs summary with TTS
   */
  const handleHearSummary = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      if (vitals.length === 0) {
        speakSummary([]);
      } else {
        speakSummary(vitals);
      }
    }
  }, [vitals, speakSummary, isSpeaking, stop]);

  /**
   * Handles pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    announceLoading("Refreshing health data");
    await refreshData();
  }, [refreshData]);

  /**
   * Handles retry after error
   */
  const handleRetry = useCallback(() => {
    clearError();
    fetchData();
  }, [clearError, fetchData]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const fontSize = FONT_SIZES[settings.fontSize];

  // Group vitals by type for display
  const heartRateVital = vitals.find((v) => v.type === "heart_rate");
  const glucoseVital = vitals.find((v) => v.type === "glucose");
  const stepsVital = vitals.find((v) => v.type === "steps");
  const sleepVital = vitals.find((v) => v.type === "sleep");

  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (isLoading && vitals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <LoadingIndicator
          message="Loading health data..."
          timeout={15000}
          onTimeout={() => {
            announceError("Loading is taking longer than expected");
          }}
        />
      </ThemedView>
    );
  }

  // ============================================================================
  // Render Error State
  // ============================================================================

  if (error && vitals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ErrorDisplay
            error={error}
            errorType="network"
            onRetry={handleRetry}
            onDismiss={clearError}
          />
        </View>
      </ThemedView>
    );
  }

  // ============================================================================
  // Render Empty State / no data uploaded
  // ============================================================================

  if (vitals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.centerContent}>
            <ThemedText
              type="title"
              style={[styles.emptyTitle, { fontSize: fontSize.heading }]}
            >
              No Health Data
            </ThemedText>
            <ThemedText
              style={[styles.emptyMessage, { fontSize: fontSize.body }]}
            >
              Upload health data or sync with your device to see your vital
              signs here.
            </ThemedText>
            <ThemedText
              style={[styles.emptyHint, { fontSize: fontSize.label }]}
            >
              Pull down to refresh
            </ThemedText>

            {/* Test Modal Link */}
            <View style={styles.emptyTestLinkContainer}>
              <Link href="/modal" style={styles.testLink}>
                <ThemedText type="link" style={{ fontSize: fontSize.body }}>
                  Open Accessibility Test Screen →
                </ThemedText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // ============================================================================
  // Render Main Content (Requirement 7.1, 7.4)
  // ============================================================================

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        accessible={true}
        accessibilityLabel="Health data summary"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <ThemedText
            type="title"
            style={[styles.title, { fontSize: fontSize.title }]}
          >
            Health Summary
          </ThemedText>
          <ThemedText style={[styles.subtitle, { fontSize: fontSize.body }]}>
            {vitals.length} vital sign{vitals.length !== 1 ? "s" : ""} tracked
          </ThemedText>
        </View>

        {/* ---------------------------------- */}
        {/* Test Modal Link */}
        {/* <View style={styles.testLinkContainer}>
          <Link href="/modal" style={styles.testLink}>
            <ThemedText type="link" style={{ fontSize: fontSize.body }}>
              Open Accessibility Test Screen →
            </ThemedText>
          </Link>
        </View> */}
        {/* ---------------------------------- */}

        {/* Hear Summary Button (Requirement 7.1) */}
        <View style={styles.summaryButtonContainer}>
          <AccessibleButton
            onPress={handleHearSummary}
            label={isSpeaking ? "Stop Speaking" : "Hear Summary"}
            hint={
              isSpeaking
                ? "Stop reading health data summary"
                : "Hear a spoken summary of all your vital signs"
            }
            variant="primary"
            style={styles.summaryButton}
          />
        </View>

        {/* Vital Signs Cards (Requirement 7.4) */}
        <View style={styles.vitalsContainer}>
          {heartRateVital && (
            <VitalCard vital={heartRateVital} style={styles.vitalCard} />
          )}

          {glucoseVital && (
            <VitalCard vital={glucoseVital} style={styles.vitalCard} />
          )}

          {stepsVital && (
            <VitalCard vital={stepsVital} style={styles.vitalCard} />
          )}

          {sleepVital && (
            <VitalCard vital={sleepVital} style={styles.vitalCard} />
          )}
        </View>

        {/* Error Banner (if error but we have cached data) */}
        {error && vitals.length > 0 && (
          <View style={styles.errorBanner}>
            <ErrorDisplay
              error={error}
              errorType="network"
              onRetry={handleRetry}
              onDismiss={clearError}
              style={styles.errorDisplay}
            />
          </View>
        )}

        {/* Pull to Refresh Hint */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { fontSize: fontSize.label }]}>
            Pull down to refresh
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  header: {
    padding: 16,
    paddingTop: 60,
  },

  title: {
    marginBottom: 8,
  },

  subtitle: {
    opacity: 0.7,
  },

  testLinkContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },

  testLink: {
    padding: 12,
  },

  summaryButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  summaryButton: {
    width: "100%",
  },

  vitalsContainer: {
    paddingBottom: 16,
  },

  vitalCard: {
    marginBottom: 0,
  },

  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },

  errorTitle: {
    marginBottom: 16,
    textAlign: "center",
  },

  errorMessage: {
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },

  retryButton: {
    minWidth: 120,
  },

  emptyTitle: {
    marginBottom: 16,
    textAlign: "center",
  },

  emptyMessage: {
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
  },

  emptyHint: {
    textAlign: "center",
    opacity: 0.6,
    marginBottom: 24,
  },

  emptyTestLinkContainer: {
    marginTop: 16,
  },

  errorBanner: {
    margin: 16,
  },

  errorDisplay: {
    margin: 0,
  },

  footer: {
    padding: 16,
    alignItems: "center",
  },

  footerText: {
    opacity: 0.5,
  },
});
