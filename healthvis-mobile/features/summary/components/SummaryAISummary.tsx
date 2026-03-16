import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { AccessibleButton } from "@/components/AccessibleButton";
import { HealthMetric } from "@/types/health-metric";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

type SummaryCardInput = {
  type: string;
  title: string;
  valueText: string;
  subtitle: string;
};

type Props = {
  cards: SummaryCardInput[];
  allMetrics: HealthMetric[];
  onHearSummary?: (text: string) => void;
  onStopSummary?: () => void;
  isReading?: boolean;
};

function buildFallback(cards: SummaryCardInput[]) {
  if (!cards.length) {
    return "No health data is available yet.";
  }

  const main = cards
    .map((card) => `${card.title} is ${card.valueText}`)
    .join(", ");

  const highlights = cards.map((card) => card.subtitle).join(". ");

  return `Today’s summary: ${main}. Highlights: ${highlights}.`;
}

export function SummaryAISummary({
  cards,
  allMetrics,
  onHearSummary,
  onStopSummary,
  isReading = false,
}: Props) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fallback = useMemo(() => buildFallback(cards), [cards]);

  // Stable key: only regenerate when the actual values change, not on every reference change
  const cardsKey = cards.map((c) => `${c.type}:${c.valueText}`).join("|");

  useEffect(() => {
    if (!cards.length) {
      setSummary("");
      return;
    }

    generateSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsKey, allMetrics.length]);

  const generateSummary = async () => {
    setLoading(true);
    setError("");

    try {
      if (!OPENAI_API_KEY) {
        setSummary(fallback);
        setLoading(false);
        return;
      }

      const metricLines = cards
        .map(
          (card) =>
            `- ${card.title}: ${card.valueText}. Status: ${card.subtitle}.`,
        )
        .join("\n");

      const dangerCount = allMetrics.filter((m) => m.range === "danger").length;
      const warningCount = allMetrics.filter(
        (m) => m.range === "warning",
      ).length;
      const normalCount = allMetrics.filter((m) => m.range === "normal").length;

      const prompt = `You are writing a spoken and readable health summary for a blind or low-vision user.

Write:
1. A short 2-3 sentence summary for the main dashboard
2. It must be very clear when read aloud
3. It must be supportive and non-diagnostic
4. Do not use medical jargon
5. Mention only the most useful takeaways
6. Avoid saying "consult a doctor" unless the data strongly suggests concern
7. Keep it concise

Dashboard metrics:
${metricLines}

Counts across loaded metrics:
- Normal readings: ${normalCount}
- Elevated readings: ${warningCount}
- High readings: ${dangerCount}

Return only the summary text.`;

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
            max_tokens: 140,
            temperature: 0.5,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const content =
        result?.choices?.[0]?.message?.content?.trim() || fallback;

      setSummary(content);
    } catch (err) {
      console.error("Summary AI error:", err);
      setError("Unable to generate AI summary right now.");
      setSummary(fallback);
    } finally {
      setLoading(false);
    }
  };

  if (!cards.length) return null;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`AI Summary. ${summary || fallback}`}
    >
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>AI Summary</ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Assistive</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0A84FF" />
          <ThemedText style={styles.loadingText}>
            Generating summary...
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.summaryText}>
          {summary || fallback}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <AccessibleButton
          onPress={() => {
            if (isReading) {
              onStopSummary?.();
            } else {
              onHearSummary?.(summary || fallback);
            }
          }}
          label={isReading ? "Stop Reading Summary" : "Hear Screen Summary"}
          hint={
            isReading
              ? "Stop reading the AI summary aloud"
              : "Read the AI summary aloud"
          }
          variant="outline"
          style={styles.button}
        />
      </View>

      {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#E8F3FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: "#0A84FF",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1F2937",
    fontWeight: "500",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  actions: {
    gap: 10,
  },
  button: {
    borderRadius: 16,
    backgroundColor: "rgba(10,132,255,0.06)",
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
  },
});
