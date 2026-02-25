// healthvis-mobile/features/summary/SummaryScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";

import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSpeech } from "@/hooks/useSpeech";

import { FONT_SIZES } from "@/constants/accessibility";
import {
  announceCategoryNavigation,
  announceError,
  announceLoading,
  announceNavigation,
} from "@/lib/announcer";
import { HealthCategory, HealthMetric } from "@/types/health-metric";

import { SummaryHeader } from "@/features/summary/components/SummaryHeader";
import { PinnedSection } from "@/features/summary/components/PinnedSection";
import { SummaryStateGate } from "@/features/summary/components/SummaryStateGate";
import { usePinnedKeys } from "@/features/summary/hooks/usePinnedKeys";

import { latestByType } from "@/features/summary/utils/metricsSummary";
import { MetricSummaryCard } from "@/features/summary/components/MetricSummaryCard";

export default function SummaryScreen() {
  const [selectedCategory] = useState<HealthCategory>("vitals");

  const {
    healthMetrics,
    permissions,
    isLoading,
    error,
    fetchData,
    refreshData,
    clearError,
    getMetricsByCategory,
    getMetricsByType,
  } = useHealthData();

  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const {
    speakHealthMetricSummary,
    speakCategorySummary,
    isSpeaking,
    stop,
  } = useSpeech();

  const { pins } = usePinnedKeys();

  useEffect(() => {
    announceNavigation("Home", "View your health data summary");
    fetchData();
  }, []);

  useEffect(() => {
    if (error) announceError(error.message || "Failed to load health data");
  }, [error]);

  const allMetrics = useMemo(() => {
    return [
      ...healthMetrics.vitals,
      ...healthMetrics.activity,
      ...healthMetrics.body,
      ...healthMetrics.nutrition,
      ...healthMetrics.sleep,
      ...healthMetrics.mindfulness,
    ];
  }, [healthMetrics]);

  //todo fixed pinned bc right now it is hard coded
  // Get latest metrics for pinned section 
  const heartRateMetrics = getMetricsByType('heart_rate');
  const heartRateVital = heartRateMetrics.length > 0 ? heartRateMetrics[0] : undefined;
  
  const stepsMetrics = getMetricsByType('steps');
  const stepsVital = stepsMetrics.length > 0 ? stepsMetrics[0] : undefined;
  
  const sleepMetrics = getMetricsByType('sleep');
  const sleepVital = sleepMetrics.length > 0 ? sleepMetrics[0] : undefined;

  const hasAnyData = allMetrics.length > 0;

  const selectedMetrics = getMetricsByCategory(selectedCategory);
  const summaryCards = useMemo(() => {
    // one card per data type
    return latestByType(selectedMetrics);
  }, [selectedMetrics]);

  const categoryNames: Record<HealthCategory, string> = {
    vitals: "Vitals",
    activity: "Activity",
    body: "Body",
    nutrition: "Nutrition",
    sleep: "Sleep",
    mindfulness: "Mindfulness",
  };

  useEffect(() => {
    const categoryMetrics = getMetricsByCategory(selectedCategory);
    announceCategoryNavigation(
      categoryNames[selectedCategory],
      categoryMetrics.length,
    );
  }, [selectedCategory, getMetricsByCategory]); // (categoryNames is stable enough here)

  const handleHearSummary = useCallback(() => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (allMetrics.length > 0) {
      speakCategorySummary(selectedCategory, selectedMetrics);
    } else {
      speakHealthMetricSummary([]);
    }
  }, [
    isSpeaking,
    stop,
    allMetrics.length,
    selectedCategory,
    selectedMetrics,
    speakCategorySummary,
    speakHealthMetricSummary,
  ]);

    // handleRefresh (pull-to-refresh):
    const handleRefresh = useCallback(async () => {
    announceLoading("Refreshing health data");
    clearError();
    await refreshData();
    }, [refreshData, clearError]);

    // handleRetry (error recovery):
    const handleRetry = useCallback(async () => {
    announceLoading("Retrying");
    clearError();
    await fetchData();
    }, [clearError, fetchData]);

  return (
    <ThemedView style={styles.summaryBg} lightColor="#F2F2F7" darkColor="#000">
      <SummaryStateGate
        isLoading={isLoading}
        error={error}
        hasAnyData={hasAnyData}
        permissions={permissions}
        fontSize={fontSize}
        onRetry={handleRetry}
        onRefresh={handleRefresh}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
        >
          <SummaryHeader initials="JM" /> 

          <PinnedSection
            pins={pins}
            heartRateVital={heartRateVital}
            stepsVital={stepsVital}
            sleepVital={sleepVital}
          />

          {/* Hear Summary */}
          <View style={styles.summaryButtonContainer}>
            <AccessibleButton
              onPress={handleHearSummary}
              label={isSpeaking ? "Stop Speaking" : "Hear Summary"}
              hint={
                isSpeaking
                  ? "Stop reading health data summary"
                  : "Hear a spoken summary of your health data"
              }
              variant="primary"
              style={styles.summaryButton}
            />
          </View>

          {/* Cards */}
          <View style={styles.vitalsContainer}>
            {summaryCards.length > 0 ? (
              summaryCards.map((metric) => (
                <MetricSummaryCard
                  key={metric.type}
                  metric={metric}
                  title={metric.type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                />
              ))
            ) : (
              <View style={styles.emptyCategory}>
                <ThemedText style={[styles.emptyCategoryText, { fontSize: fontSize.body }]}>
                  No {categoryNames[selectedCategory].toLowerCase()} data available
                </ThemedText>
              </View>
            )}
          </View>

          {/* Error banner if cached data exists */}
          {error && hasAnyData && (
            <View style={styles.errorBanner}>
              <ErrorDisplay
                error={error}
                errorType="network"
                onRetry={handleRetry}
                onDismiss={clearError}
              />

              {permissions && !permissions.allGranted && (
                <View style={styles.permissionWarning}>
                  <ThemedText
                    style={[
                      styles.permissionWarningText,
                      { fontSize: fontSize.label },
                    ]}
                  >
                    Some health categories are unavailable.
                  </ThemedText>

                  <TouchableOpacity
                    onPress={() => Linking.openSettings()}
                    style={styles.settingsLink}
                    accessibilityRole="link"
                    accessibilityLabel="Open iOS Settings to grant permissions"
                  >
                    <ThemedText
                      style={[
                        styles.settingsLinkText,
                        { fontSize: fontSize.label },
                      ]}
                    >
                      Open Settings →
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <ThemedText
              style={[styles.footerText, { fontSize: fontSize.label }]}
            >
              Pull down to refresh
            </ThemedText>
          </View>
        </ScrollView>
      </SummaryStateGate>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  summaryBg: { flex: 1 },

  content: {
    paddingBottom: 24,
  },

  summaryButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryButton: {},

  vitalsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  MetricSummaryCard: {},

  emptyCategory: {
    paddingVertical: 22,
    alignItems: "center",
  },
  emptyCategoryText: { opacity: 0.7 },

  errorBanner: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  permissionWarning: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  permissionWarningText: { opacity: 0.85 },
  settingsLink: { paddingVertical: 6, paddingHorizontal: 10 },
  settingsLinkText: { color: "#007AFF", fontWeight: "600" },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: "center",
  },
  footerText: { opacity: 0.6 },
});
