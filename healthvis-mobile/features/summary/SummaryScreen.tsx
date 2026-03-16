// healthvis-mobile/features/summary/SummaryScreen.tsx
import React, { useCallback, useEffect, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";

import { useHealthData } from "@/contexts/HealthDataContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSpeech } from "@/hooks/useSpeech";

import { FONT_SIZES } from "@/constants/accessibility";
import {
  announceError,
  announceLoading,
  announceNavigation,
} from "@/lib/announcer";

import { HealthMetric } from "@/types/health-metric";
import { SummaryStateGate } from "@/features/summary/components/SummaryStateGate";

type SummaryMetricType = "sleep" | "heart_rate" | "steps" | "respiratory_rate";

type SummaryCardData = {
  type: SummaryMetricType;
  title: string;
  valueText: string;
  subtitle: string;
  accessibilityLabel: string;
  metric?: HealthMetric;
};

const CARD_ACCENTS: Record<SummaryMetricType, string> = {
  sleep: "#4c17c5ff",
  heart_rate: "rgba(233, 8, 53, 1)",
  steps: "#52baffff",
  respiratory_rate: "#34C759",
};

function prettyMetricName(type: string) {
  switch (type) {
    case "heart_rate":
      return "Heart Rate";
    case "steps":
      return "Steps";
    case "sleep":
      return "Sleep";
    case "respiratory_rate":
      return "Respiratory Rate";
    default:
      return type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatSleepDuration(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function isActualSleepStage(metric: HealthMetric) {
  const stage = String(metric.metadata?.sleepStage || "");
  return !stage.includes("Awake") && !stage.includes("In Bed");
}

function getTodaySleepHours(metrics: HealthMetric[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return metrics
    .filter((m) => new Date(m.timestamp).getTime() >= todayStart.getTime())
    .filter(isActualSleepStage)
    .reduce((sum, metric) => sum + Number(metric.value || 0), 0);
}

function getAverageValue(metrics: HealthMetric[]) {
  const values = metrics
    .map((m) => Number(m.value))
    .filter((v) => Number.isFinite(v) && v >= 0);

  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getMetricStatusText(
  type: SummaryMetricType,
  metric: HealthMetric | undefined,
  allMetricsForType: HealthMetric[],
  sleepHours?: number,
) {
  if (type === "sleep") {
    if (!sleepHours || sleepHours <= 0) return "No sleep recorded today";

    if (sleepHours >= 8) return "Longer sleep session recorded today";
    if (sleepHours >= 6) return "Solid sleep duration recorded today";
    return "Shorter sleep duration recorded today";
  }

  if (!metric) return "No recent data available";

  if (metric.range === "danger") return "Higher than expected range";
  if (metric.range === "warning") return "Slightly elevated range";

  const avg = getAverageValue(allMetricsForType);
  const current = Number(metric.value);

  if (avg == null || !Number.isFinite(current)) {
    if (type === "steps") return "Activity recorded today";
    return "Recent reading available";
  }

  if (type === "steps") {
    if (current >= 8000) return "High activity so far";
    if (current >= 4000) return "Moderate activity so far";
    return "Light activity so far";
  }

  const diff = current - avg;
  if (Math.abs(diff) <= avg * 0.05) return "Close to your recent average";
  if (diff > 0) return "Above your recent average";
  return "Below your recent average";
}

function buildAISummary(cards: SummaryCardData[]) {
  if (!cards.length) {
    return "No health data is available yet. Pull down to refresh after HealthKit data has synced.";
  }

  const parts = cards.map((card) => {
    switch (card.type) {
      case "sleep":
        return `Sleep is ${card.valueText.toLowerCase()}`;
      case "heart_rate":
        return `heart rate is ${card.valueText.toLowerCase()}`;
      case "steps":
        return `steps are ${card.valueText.toLowerCase()}`;
      case "respiratory_rate":
        return `respiratory rate is ${card.valueText.toLowerCase()}`;
      default:
        return `${card.title} is ${card.valueText.toLowerCase()}`;
    }
  });

  const firstSentence = `Here is your summary for today: ${parts.join(", ")}.`;
  const secondSentence =
    cards.length > 0
      ? `Highlights: ${cards.map((c) => c.subtitle).join(". ")}.`
      : "";

  return `${firstSentence} ${secondSentence}`.trim();
}

function buildHighlightLines(cards: SummaryCardData[]) {
  return cards.slice(0, 3).map((card) => {
    if (card.type === "sleep") return `Sleep: ${card.subtitle}`;
    if (card.type === "heart_rate") return `Heart Rate: ${card.subtitle}`;
    if (card.type === "steps") return `Steps: ${card.subtitle}`;
    if (card.type === "respiratory_rate")
      return `Respiratory Rate: ${card.subtitle}`;
    return `${card.title}: ${card.subtitle}`;
  });
}

function SummaryMetricCard({
  card,
  onPress,
  fontSize,
}: {
  card: SummaryCardData;
  onPress: () => void;
  fontSize: { body: number; label: number; title?: number };
}) {
  const accent = CARD_ACCENTS[card.type];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.metricCard}
      accessibilityRole="button"
      accessibilityLabel={card.accessibilityLabel}
      accessibilityHint={`Open ${card.title} details`}
    >
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <View style={styles.metricCardContent}>
        <View style={styles.metricTopRow}>
          <ThemedText
            style={[styles.metricTitle, { fontSize: fontSize.body + 4 }]}
          >
            {card.title}
          </ThemedText>
          <ThemedText
            style={[styles.metricChevron, { fontSize: fontSize.body + 6 }]}
          >
            ›
          </ThemedText>
        </View>

        <ThemedText style={[styles.metricValue]}>{card.valueText}</ThemedText>

        <ThemedText
          style={[styles.metricSubtitle, { fontSize: fontSize.body - 1 }]}
        >
          {card.subtitle}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

export default function SummaryScreen() {
  const router = useRouter();

  const {
    healthMetrics,
    permissions,
    isLoading,
    error,
    fetchData,
    refreshData,
    clearError,
    getMetricsByType,
  } = useHealthData();

  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const { speakHealthMetricSummary, isSpeaking, stop } = useSpeech();

  useEffect(() => {
    announceNavigation("Summary", "View your health data summary");
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

  const hasAnyData = allMetrics.length > 0;

  const sleepMetrics = getMetricsByType("sleep");
  const heartRateMetrics = getMetricsByType("heart_rate");
  const stepsMetrics = getMetricsByType("steps");
  const respiratoryRateMetrics = getMetricsByType("respiratory_rate");

  const todaySleepHours = useMemo(
    () => getTodaySleepHours(sleepMetrics),
    [sleepMetrics],
  );

  const latestHeartRate = heartRateMetrics[0];
  const latestSteps = stepsMetrics[0];
  const latestRespiratoryRate = respiratoryRateMetrics[0];

  const summaryCards = useMemo<SummaryCardData[]>(() => {
    const cards: SummaryCardData[] = [];

    if (sleepMetrics.length > 0 || todaySleepHours > 0) {
      const subtitle = getMetricStatusText(
        "sleep",
        sleepMetrics[0],
        sleepMetrics,
        todaySleepHours,
      );

      cards.push({
        type: "sleep",
        title: "Sleep",
        valueText: formatSleepDuration(todaySleepHours),
        subtitle,
        metric: sleepMetrics[0],
        accessibilityLabel: `Sleep. ${formatSleepDuration(
          todaySleepHours,
        )}. ${subtitle}. Double tap for details.`,
      });
    }

    if (latestHeartRate) {
      const subtitle = getMetricStatusText(
        "heart_rate",
        latestHeartRate,
        heartRateMetrics,
      );

      cards.push({
        type: "heart_rate",
        title: "Heart Rate",
        valueText: `${Math.round(Number(latestHeartRate.value))} BPM`,
        subtitle,
        metric: latestHeartRate,
        accessibilityLabel: `Heart Rate. ${Math.round(
          Number(latestHeartRate.value),
        )} beats per minute. ${subtitle}. Double tap for details.`,
      });
    }

    if (latestSteps) {
      const subtitle = getMetricStatusText("steps", latestSteps, stepsMetrics);

      cards.push({
        type: "steps",
        title: "Steps",
        valueText: `${formatNumber(Number(latestSteps.value))}`,
        subtitle,
        metric: latestSteps,
        accessibilityLabel: `Steps. ${formatNumber(
          Number(latestSteps.value),
        )} steps. ${subtitle}. Double tap for details.`,
      });
    }

    if (latestRespiratoryRate) {
      const subtitle = getMetricStatusText(
        "respiratory_rate",
        latestRespiratoryRate,
        respiratoryRateMetrics,
      );

      cards.push({
        type: "respiratory_rate",
        title: "Respiratory Rate",
        valueText: `${Math.round(Number(latestRespiratoryRate.value))} br/min`,
        subtitle,
        metric: latestRespiratoryRate,
        accessibilityLabel: `Respiratory Rate. ${Math.round(
          Number(latestRespiratoryRate.value),
        )} breaths per minute. ${subtitle}. Double tap for details.`,
      });
    }

    return cards;
  }, [
    sleepMetrics,
    todaySleepHours,
    latestHeartRate,
    latestSteps,
    latestRespiratoryRate,
    heartRateMetrics,
    stepsMetrics,
    respiratoryRateMetrics,
  ]);

  const pinnedRows = useMemo(() => {
    return summaryCards.slice(0, 3);
  }, [summaryCards]);

  const highlightLines = useMemo(
    () => buildHighlightLines(summaryCards),
    [summaryCards],
  );

  const aiSummaryText = useMemo(
    () => buildAISummary(summaryCards),
    [summaryCards],
  );

  const handleHearSummary = useCallback(() => {
    if (isSpeaking) {
      stop();
      return;
    }

    const metricsToSpeak = summaryCards
      .map((card) => card.metric)
      .filter(Boolean) as HealthMetric[];

    if (metricsToSpeak.length > 0) {
      speakHealthMetricSummary(metricsToSpeak);
    } else {
      speakHealthMetricSummary([]);
    }
  }, [isSpeaking, stop, speakHealthMetricSummary, summaryCards]);

  const handleHearHighlights = useCallback(() => {
    if (isSpeaking) {
      stop();
      return;
    }

    const metricsToSpeak = summaryCards
      .slice(0, 3)
      .map((card) => card.metric)
      .filter(Boolean) as HealthMetric[];

    speakHealthMetricSummary(metricsToSpeak);
  }, [isSpeaking, stop, speakHealthMetricSummary, summaryCards]);

  const handleOpenMetric = useCallback(
    (type: string) => {
      router.push({
        pathname: "/metric/[type]",
        params: { type },
      });
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    announceLoading("Refreshing health data");
    clearError();
    await refreshData();
  }, [clearError, refreshData]);

  const handleRetry = useCallback(async () => {
    announceLoading("Retrying");
    clearError();
    await fetchData();
  }, [clearError, fetchData]);

  return (
    <LinearGradient
      colors={["#EAF2FF", "#F8ECFF", "#F7F8FB"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.background}
    >
      <ThemedView
        style={styles.screen}
        lightColor="transparent"
        darkColor="transparent"
      >
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
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
              />
            }
            accessibilityLabel="Summary screen"
          >
            <View style={styles.header}>
              <ThemedText style={[styles.largeTitle, { fontSize: 40 }]}>
                Summary
              </ThemedText>
              <ThemedText
                style={[styles.subheading, { fontSize: fontSize.body }]}
              >
                Daily snapshot for the last 24 hours
              </ThemedText>
            </View>

            <View
              style={styles.aiCard}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`AI Summary. ${aiSummaryText}`}
            >
              <View style={styles.aiHeaderRow}>
                <ThemedText
                  style={[styles.sectionTitle, { fontSize: fontSize.body + 8 }]}
                >
                  AI Summary
                </ThemedText>
                <View style={styles.aiBadge}>
                  <ThemedText
                    style={[styles.aiBadgeText, { fontSize: fontSize.label }]}
                  >
                    Assistive
                  </ThemedText>
                </View>
              </View>

              <ThemedText
                style={[styles.aiSummaryText, { fontSize: fontSize.body + 1 }]}
              >
                {aiSummaryText}
              </ThemedText>

              <View style={styles.aiActions}>
                <AccessibleButton
                  onPress={handleHearSummary}
                  label={isSpeaking ? "Stop Speaking" : "Hear Screen Summary"}
                  hint={
                    isSpeaking
                      ? "Stop reading the screen summary aloud"
                      : "Read the current summary screen aloud"
                  }
                  variant="outline"
                  style={styles.aiActionButton}
                />
                <AccessibleButton
                  onPress={handleHearHighlights}
                  label="Hear Highlights"
                  hint="Read the most important highlights aloud"
                  variant="outline"
                  style={styles.aiActionButton}
                />
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <ThemedText
                style={[styles.sectionTitle, { fontSize: fontSize.body + 8 }]}
              >
                Pinned
              </ThemedText>
            </View>

            <View
              style={styles.pinnedList}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`${pinnedRows.length} pinned health metrics`}
            >
              {pinnedRows.length > 0 ? (
                pinnedRows.map((card, index) => (
                  <TouchableOpacity
                    key={card.type}
                    onPress={() => handleOpenMetric(card.type)}
                    style={[
                      styles.pinnedRow,
                      index === pinnedRows.length - 1 && styles.pinnedRowLast,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={card.accessibilityLabel}
                    accessibilityHint={`Open ${card.title} details`}
                  >
                    <ThemedText
                      style={[
                        styles.pinnedLabel,
                        { fontSize: fontSize.body + 3 },
                      ]}
                    >
                      {card.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.pinnedValue,
                        { fontSize: fontSize.body + 3 },
                      ]}
                    >
                      {card.valueText}
                    </ThemedText>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBlock}>
                  <ThemedText
                    style={[styles.emptyText, { fontSize: fontSize.body }]}
                  >
                    No pinned metrics available yet.
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.sectionHeaderRow}>
              <ThemedText
                style={[styles.sectionTitle, { fontSize: fontSize.body + 8 }]}
              >
                Highlights
              </ThemedText>
            </View>

            <View style={styles.highlightStack}>
              {highlightLines.length > 0 ? (
                highlightLines.map((line, index) => (
                  <View
                    key={`${line}-${index}`}
                    style={styles.highlightCard}
                    accessible={true}
                    accessibilityRole="summary"
                    accessibilityLabel={line}
                  >
                    <ThemedText
                      style={[
                        styles.highlightText,
                        { fontSize: fontSize.body + 1 },
                      ]}
                    >
                      {line}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBlock}>
                  <ThemedText
                    style={[styles.emptyText, { fontSize: fontSize.body }]}
                  >
                    Highlights will appear here once data is available.
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.sectionHeaderRow}>
              <ThemedText
                style={[styles.sectionTitle, { fontSize: fontSize.body + 8 }]}
              >
                Browse Metrics
              </ThemedText>
            </View>

            <View style={styles.metricGrid}>
              {summaryCards.length > 0 ? (
                summaryCards.map((card) => (
                  <SummaryMetricCard
                    key={card.type}
                    card={card}
                    fontSize={fontSize}
                    onPress={() => handleOpenMetric(card.type)}
                  />
                ))
              ) : (
                <View style={styles.emptyBlock}>
                  <ThemedText
                    style={[styles.emptyText, { fontSize: fontSize.body }]}
                  >
                    No health data available yet.
                  </ThemedText>
                </View>
              )}
            </View>

            {error && hasAnyData && (
              <View style={styles.errorSection}>
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
                        Open Settings
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.footer}>
              <ThemedText
                style={[styles.footerText, { fontSize: fontSize.body }]}
              >
                Pull down to refresh
              </ThemedText>
            </View>
          </ScrollView>
        </SummaryStateGate>
      </ThemedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 32,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },

  largeTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#111827",
  },
  eading: {
    color: "#6B7280",
    fontWeight: "500",
  },

  aiCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 14,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiBadge: {
    backgroundColor: "#E8F3FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  aiBadgeText: {
    color: "#0A84FF",
    fontWeight: "700",
  },
  aiSummaryText: {
    lineHeight: 24,
    color: "#1F2937",
    fontWeight: "500",
  },
  aiActions: {
    gap: 10,
  },
  aiActionButton: {
    borderRadius: 16,
    backgroundColor: "rgba(10,132,255,0.06)",
  },

  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#111827",
  },

  pinnedList: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  pinnedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  pinnedRowLast: {
    borderBottomWidth: 0,
  },
  pinnedLabel: {
    fontWeight: "700",
    color: "#111827",
  },
  pinnedValue: {
    fontWeight: "800",
    color: "#1F2937",
  },

  highlightStack: {
    gap: 10,
  },
  highlightCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  highlightText: {
    color: "#1F2937",
    lineHeight: 22,
    fontWeight: "600",
  },

  metricGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 132,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricAccent: {
    width: 8,
  },
  metricCardContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 8,
    justifyContent: "center",
  },

  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  metricChevron: {
    color: "#9CA3AF",
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "800",
    color: "#111827",
    paddingTop: 2,
  },
  metricSubtitle: {
    color: "#6B7280",
    fontWeight: "500",
    lineHeight: 20,
  },

  emptyBlock: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
  },

  errorSection: {
    marginTop: 4,
    gap: 10,
  },
  permissionWarning: {
    marginTop: 8,
    paddingHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  permissionWarningText: {
    color: "#4B5563",
    flex: 1,
  },
  settingsLink: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  settingsLinkText: {
    color: "#0A84FF",
    fontWeight: "700",
  },

  footer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  footerText: {
    color: "#6B7280",
  },
});
