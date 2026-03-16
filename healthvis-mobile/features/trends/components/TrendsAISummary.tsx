/**
 * TrendsAISummary
 *
 * Calls OpenAI to generate a comparative, spoken-friendly analysis across
 * all currently selected health metrics and the chosen time range.
 *
 * - Falls back to a deterministic summary when no API key is configured.
 * - Provides "Hear Summary" TTS button so blind/low-vision users can listen.
 * - VoiceOver: the card itself is marked as a `summary` role so it is
 *   reachable as a single focusable node.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Speech from "expo-speech";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { FONT_SIZES } from "@/constants/accessibility";
import { rangeLabel, TimeRangeKey } from "../utils/trendConfig";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export type SeriesSummary = {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  avg: number;
  count: number;
  outlierCount: number;
};

type Props = {
  timeRange: TimeRangeKey;
  series: SeriesSummary[];
};

// ── fallback (no API key) ────────────────────────────────────────────────────

function buildFallback(
  series: SeriesSummary[],
  timeRange: TimeRangeKey,
): string {
  if (!series.length)
    return "Select metrics above to see a comparative trend summary.";

  const period = rangeLabel(timeRange);
  const lines = series.map(
    (s) =>
      `${s.label} ranged from ${Math.round(s.min)} to ${Math.round(s.max)} ${s.unit} with an average of ${s.avg.toFixed(1)} ${s.unit}` +
      (s.outlierCount > 0
        ? `, including ${s.outlierCount} outlier${s.outlierCount > 1 ? "s" : ""}`
        : ""),
  );

  return `Here is your trend comparison for ${period}. ${lines.join(". ")}.`;
}

// ── component ────────────────────────────────────────────────────────────────

export default function TrendsAISummary({ timeRange, series }: Props) {
  const { settings } = useAccessibility();
  const fontSize = FONT_SIZES[settings.fontSize];

  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState("");

  const fallback = useMemo(
    () => buildFallback(series, timeRange),
    [series, timeRange],
  );

  // Stable key to avoid regenerating on unrelated re-renders
  const seriesKey = series.map((s) => `${s.key}:${s.avg.toFixed(1)}`).join("|");
  const prevKeyRef = useRef("");

  useEffect(() => {
    if (!series.length) {
      setSummary("");
      return;
    }
    // Only regenerate if content actually changed
    const newKey = `${timeRange}::${seriesKey}`;
    if (newKey === prevKeyRef.current) return;
    prevKeyRef.current = newKey;
    generateSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, seriesKey]);

  const generateSummary = async () => {
    setLoading(true);
    setError("");

    try {
      if (!OPENAI_API_KEY) {
        setSummary(fallback);
        setLoading(false);
        return;
      }

      const period = rangeLabel(timeRange);
      const metricLines = series
        .map(
          (s) =>
            `- ${s.label}: range ${Math.round(s.min)}–${Math.round(s.max)} ${s.unit}, avg ${s.avg.toFixed(1)} ${s.unit}, ${s.count} readings, ${s.outlierCount} outlier(s)`,
        )
        .join("\n");

      const prompt = `You are writing a health trend comparison for a blind or low-vision user. 
This will be read aloud by a screen reader and also displayed as text.

Time period: ${period}
Selected metrics:
${metricLines}

Write:
1. A 3–4 sentence spoken-friendly comparison across these metrics
2. Highlight any notable patterns, correlations, or concerns
3. Be supportive and non-diagnostic
4. No medical jargon
5. No bullet points — write in flowing sentences
6. If you notice a correlation (e.g., high activity days also show elevated heart rate), mention it
7. End with one brief, actionable observation

Return only the summary text. No headers.`;

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
            max_tokens: 200,
            temperature: 0.5,
          }),
        },
      );

      if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

      const result = await response.json();
      const content =
        result?.choices?.[0]?.message?.content?.trim() || fallback;
      setSummary(content);
    } catch (err) {
      console.error("TrendsAISummary error:", err);
      // Use fallback silently - don't show error to user since fallback works fine
      setSummary(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleHear = () => {
    if (isReading) {
      Speech.stop();
      setIsReading(false);
      return;
    }
    const text = summary || fallback;
    setIsReading(true);
    Speech.speak(text, {
      rate: 0.92,
      pitch: 1.0,
      onDone: () => setIsReading(false),
      onStopped: () => setIsReading(false),
      onError: () => setIsReading(false),
    });
  };

  if (!series.length) return null;

  const displayText = summary || fallback;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`AI Trend Summary. ${displayText}`}
    >
      <View style={styles.headerRow}>
        <ThemedText style={[styles.title, { fontSize: fontSize.body + 4 }]}>
          AI Trend Summary
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText
            style={[styles.badgeText, { fontSize: fontSize.label - 1 }]}
          >
            Assistive
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0A84FF" />
          <ThemedText
            style={[styles.loadingText, { fontSize: fontSize.label }]}
          >
            Analyzing trends...
          </ThemedText>
        </View>
      ) : (
        <ThemedText
          style={[
            styles.bodyText,
            { fontSize: fontSize.body, lineHeight: fontSize.body * 1.6 },
          ]}
        >
          {displayText}
        </ThemedText>
      )}

      <AccessibleButton
        onPress={handleHear}
        label={isReading ? "Stop Reading" : "Hear Summary"}
        hint={
          isReading
            ? "Stop reading the trend summary aloud"
            : "Read the trend comparison aloud"
        }
        variant="outline"
        style={styles.hearButton}
      />

      {!!error && (
        <ThemedText style={[styles.errorText, { fontSize: fontSize.label }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
    backgroundColor: "#E8F3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    color: "#0A84FF",
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#6B7280",
  },
  bodyText: {
    color: "#1F2937",
    fontWeight: "500",
  },
  hearButton: {
    borderRadius: 14,
    backgroundColor: "rgba(10,132,255,0.06)",
  },
  errorText: {
    color: "#FF3B30",
  },
});
