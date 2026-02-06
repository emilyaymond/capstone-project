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
 */

import React, { useEffect, useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, RefreshControl, Linking, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { VitalCard } from "@/components/VitalCard";
import { AccessibleButton } from "@/components/AccessibleButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { SimpleLineChart } from "@/components/SimpleLineChart";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSpeech } from "@/hooks/useSpeech";
import { HealthCategory, HealthMetric } from "@/types/health-metric";
import { DataPoint } from "@/types";
import {
  announceNavigation,
  announceError,
  announceLoading,
  announceCategoryNavigation,
} from "@/lib/announcer";
import { FONT_SIZES } from "@/constants/accessibility";
import { loadPinnedKeys, PinnedKey } from "@/lib/pins";

export default function SummaryScreen() {
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory>('vitals');
  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('cards');

  
  // Hooks

  const { 
    vitals, 
    healthMetrics, 
    permissions, 
    isLoading, 
    error, 
    fetchData, 
    refreshData, 
    clearError,
    getMetricsByCategory 
  } = useHealthData();
  const { settings } = useAccessibility();
  const { 
    speakSummary, 
    speakHealthMetricSummary,
    speakCategorySummary,
    isSpeaking, 
    stop 
  } = useSpeech();

  // Screen Reader Announcements on Load 

  useEffect(() => {
    // Announce navigation to Home screen
    announceNavigation("Home", "View your health data summary");

    // Load data on mount
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Announce Errors


  useEffect(() => {
    if (error) {
      announceError(error.message || "Failed to load health data");
    }
  }, [error]);


  // Computed Values


  const fontSize = FONT_SIZES[settings.fontSize];

  // Get all health metrics from categorized data
  const allMetrics = [
    ...healthMetrics.vitals,
    ...healthMetrics.activity,
    ...healthMetrics.body,
    ...healthMetrics.nutrition,
    ...healthMetrics.sleep,
    ...healthMetrics.mindfulness,
  ];

  // Group vitals by type for display (backwards compatibility)
  const heartRateVital = vitals.find((v) => v.type === "heart_rate");
  const glucoseVital = vitals.find((v) => v.type === "glucose");
  const stepsVital = vitals.find((v) => v.type === "steps");
  const sleepVital = vitals.find((v) => v.type === "sleep");

  // Check if we have any data at all
  const hasAnyData = allMetrics.length > 0 || vitals.length > 0;

  // Get metrics for selected category
  const selectedMetrics = getMetricsByCategory(selectedCategory);

  // Category display names
  const categoryNames: Record<HealthCategory, string> = {
    vitals: 'Vitals',
    activity: 'Activity',
    body: 'Body',
    nutrition: 'Nutrition',
    sleep: 'Sleep',
    mindfulness: 'Mindfulness',
  };

  // All categories
  const categories: HealthCategory[] = ['vitals', 'activity', 'body', 'nutrition', 'sleep', 'mindfulness'];

  // Helper function to convert HealthMetrics to DataPoints for charts
  const convertMetricsToDataPoints = (metrics: HealthMetric[]): DataPoint[] => {
    return metrics.map(metric => ({
      value: metric.value,
      timestamp: metric.timestamp,
      range: metric.range || 'normal',
    }));
  };

  // setting up pinned cats
  const [pins, setPins] = useState<PinnedKey[]>([]);

  useEffect(() => {
    loadPinnedKeys().then(setPins);
  }, []);

  const renderPinnedCardsHere = pins.map((p, idx) => {
    const showDivider = idx !== pins.length - 1;

    switch (p) {
      case "heart_rate_latest":
        return (
          <View key={p} style={[styles.pinnedRow, showDivider && styles.divider]}>
            <ThemedText style={styles.pinnedLabel}>Heart Rate</ThemedText>
            <ThemedText style={styles.pinnedValue}>
              {heartRateVital?.value ?? "0"} BPM
            </ThemedText>
          </View>
        );

      case "steps_today":
        return (
          <View key={p} style={[styles.pinnedRow, showDivider && styles.divider]}>
            <ThemedText style={styles.pinnedLabel}>Steps</ThemedText>
            <ThemedText style={styles.pinnedValue}>
              {stepsVital?.value ?? "0"} steps
            </ThemedText>
          </View>
        );

      case "sleep_score":
        return (
          <View key={p} style={[styles.pinnedRow, showDivider && styles.divider]}>
            <ThemedText style={styles.pinnedLabel}>Sleep</ThemedText>
            <ThemedText style={styles.pinnedValue}>
              {sleepVital?.value ?? "0"} hr
            </ThemedText>
          </View>
        );

      default:
        return null;
    }
  });




  // Get data points for chart visualization
  const chartDataPoints = convertMetricsToDataPoints(selectedMetrics);

  // Determine if we should show line or bar chart based on category
  const shouldUseBarChart = selectedCategory === 'activity' || selectedCategory === 'nutrition';


  // Announce Category Changes
  useEffect(() => {
    const categoryMetrics = getMetricsByCategory(selectedCategory);
    announceCategoryNavigation(categoryNames[selectedCategory], categoryMetrics.length);
  }, [selectedCategory, getMetricsByCategory, categoryNames]);

  
  // Event Handlers
  const handleHearSummary = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      // Use new comprehensive summary if we have health metrics
      if (allMetrics.length > 0) {
        // Speak category-specific summary if a category is selected
        speakCategorySummary(selectedCategory, selectedMetrics);
      } else if (vitals.length > 0) {
        // Fall back to legacy vitals summary
        speakSummary(vitals);
      } else {
        // No data available
        speakHealthMetricSummary([]);
      }
    }
  }, [vitals, allMetrics, selectedCategory, selectedMetrics, speakSummary, speakHealthMetricSummary, speakCategorySummary, isSpeaking, stop]);

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



  // Render Loading State
  if (isLoading && !hasAnyData) {
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


  // Render Error State
  if (error && !hasAnyData) {
    // Check if error is permission-related
    const isPermissionError = error.message?.toLowerCase().includes('permission') || 
                              error.message?.toLowerCase().includes('denied') ||
                              error.message?.toLowerCase().includes('healthkit');

    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ErrorDisplay
            error={error}
            errorType="network"
            onRetry={handleRetry}
            onDismiss={clearError}
          />
          
          {/* Show permission status if available */}
          {isPermissionError && permissions && (
            <View style={styles.permissionErrorContainer}>
              <ThemedText style={[styles.permissionErrorTitle, { fontSize: fontSize.body }]}>
                Unavailable Categories:
              </ThemedText>
              {!permissions.categoryStatus.vitals && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Vitals
                </ThemedText>
              )}
              {!permissions.categoryStatus.activity && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Activity
                </ThemedText>
              )}
              {!permissions.categoryStatus.body && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Body Measurements
                </ThemedText>
              )}
              {!permissions.categoryStatus.nutrition && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Nutrition
                </ThemedText>
              )}
              {!permissions.categoryStatus.sleep && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Sleep
                </ThemedText>
              )}
              {!permissions.categoryStatus.mindfulness && (
                <ThemedText style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                  ✗ Mindfulness
                </ThemedText>
              )}
              
              <AccessibleButton
                onPress={() => Linking.openSettings()}
                label="Open iOS Settings"
                hint="Open iOS Settings to grant HealthKit permissions"
                variant="primary"
                style={styles.settingsButton}
              />
            </View>
          )}
        </View>
      </ThemedView>
    );

  }


  // Render Empty State / no permissions
  if (!hasAnyData) {
    // Check if we have permission information
    const needsPermissions = permissions && !permissions.allGranted;
    const hasNoPermissions = permissions && Object.values(permissions.categoryStatus).every(status => !status);

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
              {needsPermissions ? 'HealthKit Permissions Needed' : 'No Health Data'}
            </ThemedText>
            
            {needsPermissions ? (
              <>
                <ThemedText
                  style={[styles.emptyMessage, { fontSize: fontSize.body }]}
                >
                  Grant HealthKit permissions to view your comprehensive health data including vitals, activity, body measurements, nutrition, sleep, and mindfulness.
                </ThemedText>
                
                {permissions && !hasNoPermissions && (
                  <View style={styles.permissionStatusContainer}>
                    <ThemedText style={[styles.permissionStatusTitle, { fontSize: fontSize.body }]}>
                      Available Categories:
                    </ThemedText>
                    {permissions.categoryStatus.vitals && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Vitals
                      </ThemedText>
                    )}
                    {permissions.categoryStatus.activity && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Activity
                      </ThemedText>
                    )}
                    {permissions.categoryStatus.body && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Body Measurements
                      </ThemedText>
                    )}
                    {permissions.categoryStatus.nutrition && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Nutrition
                      </ThemedText>
                    )}
                    {permissions.categoryStatus.sleep && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Sleep
                      </ThemedText>
                    )}
                    {permissions.categoryStatus.mindfulness && (
                      <ThemedText style={[styles.permissionItem, { fontSize: fontSize.label }]}>
                        ✓ Mindfulness
                      </ThemedText>
                    )}
                  </View>
                )}
                
                <AccessibleButton
                  onPress={() => {
                    // Re-initialize to request permissions
                    fetchData();
                  }}
                  label="Grant Permissions"
                  hint="Request HealthKit permissions to access your health data"
                  variant="primary"
                  style={styles.permissionButton}
                />
              </>
            ) : (
              <>
                <ThemedText
                  style={[styles.emptyMessage, { fontSize: fontSize.body }]}
                >
                  No health data available. Make sure you have health data in HealthKit and permissions are granted.
                </ThemedText>
              </>
            )}
            
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




  // Render Main Content 

  return (
    <ThemedView style={styles.summaryBg} lightColor="#F2F2F7" darkColor="#000">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <ThemedText style={styles.largeTitle}>Summary</ThemedText>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => {/* maybe open profile later */}}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                <View style={styles.avatarCircle}>
                  <ThemedText style={styles.avatarText}>JM</ThemedText>
                </View>
              </TouchableOpacity>

              <Link href="/summary/edit-pinned" asChild>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit pinned">
                  <ThemedText style={styles.editLink}>Edit</ThemedText>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
          <ThemedView style={styles.summaryBg} lightColor="#F2F2F7" darkColor="#000">
            <ScrollView   contentContainerStyle={styles.content}>
              <ThemedText style={styles.sectionTitle}>Pinned</ThemedText>
              <View style={styles.sectionCard}>
                {renderPinnedCardsHere?.length ? renderPinnedCardsHere : (
                  <View style={{ padding: 16 }}>
                    <ThemedText style={{ opacity: 0.7 }}>No pinned items yet.</ThemedText>
                  </View>
                )}
              </View>
            </ScrollView>
          </ThemedView>

        {/* View Mode Toggle */}
        {selectedMetrics.length > 0 && (
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('cards')}
              style={[
                styles.viewModeButton,
                viewMode === 'cards' && styles.viewModeButtonSelected,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'cards' }}
              accessibilityLabel="Card view"
            >
              <ThemedText
                style={[
                  styles.viewModeText,
                  { fontSize: fontSize.label },
                  viewMode === 'cards' && styles.viewModeTextSelected,
                ]}
              >
                Cards
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('chart')}
              style={[
                styles.viewModeButton,
                viewMode === 'chart' && styles.viewModeButtonSelected,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'chart' }}
              accessibilityLabel="Chart view"
            >
              <ThemedText
                style={[
                  styles.viewModeText,
                  { fontSize: fontSize.label },
                  viewMode === 'chart' && styles.viewModeTextSelected,
                ]}
              >
                Chart
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Vital Signs Cards or Chart (Requirement 7.4, 10.2, 10.4) */}
        <View style={styles.vitalsContainer}>
          {viewMode === 'chart' && selectedMetrics.length > 0 ? (
            // Chart View
            <View style={styles.chartContainer}>
              {shouldUseBarChart ? (
                <SimpleBarChart
                  data={chartDataPoints}
                  title={`${categoryNames[selectedCategory]} Trends`}
                  unit={selectedMetrics[0]?.unit || ''}
                  width={350}
                  height={250}
                  accessibilityLabel={`${categoryNames[selectedCategory]} bar chart showing ${selectedMetrics.length} data points`}
                />
              ) : (
                <SimpleLineChart
                  data={chartDataPoints}
                  title={`${categoryNames[selectedCategory]} Trends`}
                  unit={selectedMetrics[0]?.unit || ''}
                  width={350}
                  height={250}
                  accessibilityLabel={`${categoryNames[selectedCategory]} line chart showing ${selectedMetrics.length} data points`}
                />
              )}
            </View>
          ) : (
            // Card View
            <>
              {/* Display selected category metrics */}
              {selectedMetrics.length > 0 ? (
                selectedMetrics.map((metric) => (
                  <VitalCard 
                    key={metric.id} 
                    metric={metric} 
                    style={styles.vitalCard} 
                  />
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <ThemedText style={[styles.emptyCategoryText, { fontSize: fontSize.body }]}>
                    No {categoryNames[selectedCategory].toLowerCase()} data available
                  </ThemedText>
                </View>
              )}
              
              {/* Legacy vitals display (backwards compatibility) */}
              {vitals.length > 0 && selectedCategory === 'vitals' && (
                <>
                  {heartRateVital && (
                    <VitalCard vital={heartRateVital} style={styles.vitalCard} />
                  )}

                  {glucoseVital && (
                    <VitalCard vital={glucoseVital} style={styles.vitalCard} />
                  )}
                </>
              )}
              
              {vitals.length > 0 && selectedCategory === 'activity' && stepsVital && (
                <VitalCard vital={stepsVital} style={styles.vitalCard} />
              )}
              
              {vitals.length > 0 && selectedCategory === 'sleep' && sleepVital && (
                <VitalCard vital={sleepVital} style={styles.vitalCard} />
              )}
            </>
          )}
        </View>

        {/* Error Banner (if error but we have cached data) */}
        {error && hasAnyData && (
          <View style={styles.errorBanner}>
            <ErrorDisplay
              error={error}
              errorType="network"
              onRetry={handleRetry}
              onDismiss={clearError}
              style={styles.errorDisplay}
            />
            
            {/* Show permission issues if relevant */}
            {permissions && !permissions.allGranted && (
              <View style={styles.permissionWarning}>
                <ThemedText style={[styles.permissionWarningText, { fontSize: fontSize.label }]}>
                  Some health categories are unavailable. 
                </ThemedText>
                <TouchableOpacity
                  onPress={() => Linking.openSettings()}
                  style={styles.settingsLink}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Open iOS Settings to grant permissions"
                >
                  <ThemedText style={[styles.settingsLinkText, { fontSize: fontSize.label }]}>
                    Open Settings →
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
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
    paddingTop: 25,
  },

  largeTitle: { 
    paddingTop: 25,
    fontSize: 34, 
    fontWeight: "700", 
    marginBottom: 12 
    },

  subtitle: {
    opacity: 0.7,
  },

  categoryTabsContainer: {
    marginBottom: 16,
  },

  categoryTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
  },

  categoryTabSelected: {
    backgroundColor: '#007AFF',
  },

  categoryTabDisabled: {
    opacity: 0.3,
  },

  categoryTabText: {
    fontWeight: '500',
  },

  categoryTabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  categoryTabTextDisabled: {
    opacity: 0.5,
  },

  categoryTabCount: {
    opacity: 0.7,
    fontWeight: '600',
  },

  categoryTabCountSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },

  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 4,
  },

  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },

  viewModeButtonSelected: {
    backgroundColor: '#007AFF',
  },

  viewModeText: {
    fontWeight: '500',
  },

  viewModeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
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

  emptyCategory: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCategoryText: {
    opacity: 0.6,
    textAlign: 'center',
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

  permissionStatusContainer: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: '100%',
  },

  permissionStatusTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },

  permissionItem: {
    marginLeft: 8,
    marginVertical: 4,
    opacity: 0.8,
  },

  permissionButton: {
    marginTop: 16,
    minWidth: 200,
  },

  permissionErrorContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    width: '100%',
  },

  permissionErrorTitle: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#D32F2F',
  },

  permissionErrorItem: {
    marginLeft: 8,
    marginVertical: 4,
    opacity: 0.8,
    color: '#D32F2F',
  },

  settingsButton: {
    marginTop: 16,
  },

  permissionWarning: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    alignItems: 'center',
  },

  permissionWarningText: {
    color: '#F57C00',
    marginBottom: 8,
    textAlign: 'center',
  },

  settingsLink: {
    padding: 8,
  },

  settingsLinkText: {
    color: '#007AFF',
    fontWeight: '600',
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

  summaryBg: { 
    flex: 1 
  },
    
  content: { 
    padding: 16, paddingTop: 30, paddingBottom: 32 },

  headerRow: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },


  headerRight: { 
    flexDirection: "row", alignItems: "center", gap: 12 },
  
    avatarCircle: { 
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#F7A7B8", alignItems: "center", justifyContent: "center" },
  
    avatarText: { 
    fontWeight: "700" },

  editLink: { 
    color: "#007AFF", fontSize: 17, fontWeight: "500" },

  sectionTitle: { 
    fontSize: 22, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  
    sectionCard: { 
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },

  sectionHeaderRow: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  
    seeAll: { 
      color: "#007AFF", fontSize: 15, fontWeight: "500" },

  pinnedRow: { 
    paddingHorizontal: 16, paddingVertical: 14 },
  pinnedLabel: { 
    fontSize: 17, fontWeight: "600", marginBottom: 6 },
  pinnedValue: { 
    fontSize: 26, fontWeight: "800" },
  divider: { 
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5EA" },

});
