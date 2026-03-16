/**
 * AISummary Component
 *
 * Generates AI-powered health metric summaries using OpenAI.
 * Provides coach/clinician-friendly narratives about health data trends.
 */

import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { HealthMetric } from "@/types/health-metric";
import {
  aggregateSleepByStage,
  calculateSleepEfficiency,
  calculateSleepQuality,
  formatSleepDuration,
} from "@/lib/sleep-utils";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

interface AISummaryProps {
  data: HealthMetric[];
  metricName: string;
  timeRange: string;
  min?: number;
  max?: number;
}

export function AISummary({
  data,
  metricName,
  timeRange,
  min,
  max,
}: AISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (data.length > 0) {
      generateSummary();
    }
  }, [data, timeRange]);

  const calculateStats = () => {
    const values = data.map((d) => Number(d.value)).filter(Number.isFinite);

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate variability (standard deviation)
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Identify outliers (values beyond 2 standard deviations)
    const outliers = values.filter((v) => Math.abs(v - avg) > 2 * stdDev);

    // Count range classifications
    const dangerCount = data.filter((d) => d.range === "danger").length;
    const warningCount = data.filter((d) => d.range === "warning").length;
    const normalCount = data.filter((d) => d.range === "normal").length;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(avg * 10) / 10,
      median: Math.round(median * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      outlierCount: outliers.length,
      dangerCount,
      warningCount,
      normalCount,
      totalReadings: values.length,
    };
  };

  const generateSummary = async () => {
    setLoading(true);
    setError("");

    try {
      if (!OPENAI_API_KEY) {
        setError(
          "OpenAI API key not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.",
        );
        setLoading(false);
        return;
      }

      const isSleep = data[0]?.type === "sleep";

      if (isSleep) {
        // Sleep-specific summary generation
        const sleepBreakdown = aggregateSleepByStage(data);
        const sleepQuality = calculateSleepQuality(sleepBreakdown);
        const sleepEfficiency = calculateSleepEfficiency(sleepBreakdown);

        const timeRangeText =
          timeRange === "D"
            ? "last night"
            : timeRange === "W"
              ? "this week"
              : timeRange === "M"
                ? "this month"
                : timeRange === "6M"
                  ? "last 6 months"
                  : "this year";

        const prompt = `You are a sleep coach analyzing sleep data. Generate a 1-2 sentence summary.

Sleep data for ${timeRangeText}:
- Time in bed: ${formatSleepDuration(sleepBreakdown.totalInBed)}
- Time asleep: ${formatSleepDuration(sleepBreakdown.totalSleep)}
- Sleep efficiency: ${sleepEfficiency}%
- Sleep quality: ${sleepQuality}
- Deep sleep: ${formatSleepDuration(sleepBreakdown.deepSleep)} (${sleepBreakdown.totalSleep > 0 ? Math.round((sleepBreakdown.deepSleep / sleepBreakdown.totalSleep) * 100) : 0}%)
- REM sleep: ${formatSleepDuration(sleepBreakdown.remSleep)} (${sleepBreakdown.totalSleep > 0 ? Math.round((sleepBreakdown.remSleep / sleepBreakdown.totalSleep) * 100) : 0}%)
- Light sleep: ${formatSleepDuration(sleepBreakdown.lightSleep)} (${sleepBreakdown.totalSleep > 0 ? Math.round((sleepBreakdown.lightSleep / sleepBreakdown.totalSleep) * 100) : 0}%)
- Awake time: ${formatSleepDuration(sleepBreakdown.awake)}
- Total sessions: ${data.length}

Focus on:
1. Sleep quality and efficiency
2. Balance of sleep stages (deep, REM, light)
3. Brief, actionable insight or reassurance

Keep it conversational and supportive. Don't use medical jargon.`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 150,
              temperature: 0.7,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const result = await response.json();
        const content =
          result.choices[0]?.message?.content || "Unable to generate summary.";
        setSummary(content);
      } else {
        // Regular metric summary generation
        const stats = calculateStats();

        if (!stats) {
          setSummary("Not enough data to generate summary.");
          setLoading(false);
          return;
        }

        const unit = data[0]?.unit || "";
        const timeRangeText =
          timeRange === "H"
            ? "last hour"
            : timeRange === "D"
              ? "today"
              : timeRange === "W"
                ? "this week"
                : timeRange === "M"
                  ? "this month"
                  : timeRange === "6M"
                    ? "last 6 months"
                    : "this year";

        const prompt = `You are a health coach analyzing ${metricName} data. Generate a 1 sentence summary.

Data for ${timeRangeText}:
- Range: ${stats.min}-${stats.max} ${unit}
- Average: ${stats.avg} ${unit}
- Median: ${stats.median} ${unit}
- Variability: ${stats.stdDev} ${unit} (std dev)
- Total readings: ${stats.totalReadings}
- Normal readings: ${stats.normalCount}
- Elevated readings: ${stats.warningCount}
- High readings: ${stats.dangerCount}
- Outliers: ${stats.outlierCount}

Focus on:
1. Overall stability or variability
2. Any concerning patterns (spikes, elevated readings)
3. Brief, actionable insight or reassurance

Keep it conversational and supportive. Don't use medical jargon.`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 150,
              temperature: 0.7,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const result = await response.json();
        const content =
          result.choices[0]?.message?.content || "Unable to generate summary.";
        setSummary(content);
      }
    } catch (err) {
      console.error("AI Summary error:", err);
      setError("Unable to generate AI summary at this time.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <ThemedText style={styles.loadingText}>
          Generating AI summary...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.summaryText}>{summary}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    opacity: 0.8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
});
