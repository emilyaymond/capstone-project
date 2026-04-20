/**
 * metricConfig.ts
 *
 * Centralised display + behaviour configuration for every health metric type.
 * Each entry controls:
 *   - chart kind used on the detail screen
 *   - aggregation strategy (avg / sum / latest)
 *   - human-readable display name and unit
 *   - accent colour for visual theming
 *   - hero stat label (what the big number on the detail screen says)
 *   - context text shown under the hero number
 *   - normal range (for VoiceOver context and range indicator bars)
 *   - whether the D range should show "today's total" vs "average"
 */

import { HealthMetricType } from "@/types/health-metric";

export type MetricAggregation = "avg" | "sum" | "latest";
export type MetricChartKind = "scatter" | "line" | "bar";

export interface MetricDisplayConfig {
  chart: MetricChartKind;
  aggregation: MetricAggregation;
  /** Short display name */
  label: string;
  /** Unit string shown after values */
  unit: string;
  /** Brand / accent colour for this metric */
  color: string;
  /** Label for the "hero" stat row — e.g. "Average", "Total", "Latest" */
  heroLabel: string;
  /**
   * For D range: show "today's total" label instead of "average"
   * Used for cumulative metrics (steps, calories, distance, etc.)
   */
  dailyIsTotal: boolean;
  /** Optional: human-readable normal range for VoiceOver hint */
  normalRange?: string;
  /** Category label — shown in the subtitle */
  categoryLabel: string;
  /**
   * For W / M / 6M / Y ranges, override the hero label.
   * E.g. steps shows "Avg / day", sleep shows "Avg / night".
   */
  longRangeHeroLabel?: string;
  /**
   * For the hero number in long ranges, how to transform the value.
   * "avg_per_day" — divide period total by number of days
   * "avg_per_night" — divide sleep total by number of nights
   * undefined — use the aggregated value as-is
   */
  longRangeHeroMode?: "avg_per_day" | "avg_per_night";
}

export const METRIC_CONFIG: Record<HealthMetricType, MetricDisplayConfig> = {
  // ── Vitals ────────────────────────────────────────────────────────────────

  heart_rate: {
    chart: "scatter",
    aggregation: "avg",
    label: "Heart Rate",
    unit: "bpm",
    color: "#FF3B30",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "40–120 bpm",
    categoryLabel: "Vitals",
  },
  blood_pressure_systolic: {
    chart: "line",
    aggregation: "avg",
    label: "Systolic BP",
    unit: "mmHg",
    color: "#FF6B6B",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "90–120 mmHg",
    categoryLabel: "Vitals",
  },
  blood_pressure_diastolic: {
    chart: "line",
    aggregation: "avg",
    label: "Diastolic BP",
    unit: "mmHg",
    color: "#C0392B",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "60–80 mmHg",
    categoryLabel: "Vitals",
  },
  respiratory_rate: {
    chart: "scatter",
    aggregation: "avg",
    label: "Respiratory Rate",
    unit: "br/min",
    color: "#00b7ff",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "12–20 breaths/min",
    categoryLabel: "Vitals",
  },
  body_temperature: {
    chart: "line",
    aggregation: "avg",
    label: "Body Temperature",
    unit: "°F",
    color: "#FF9500",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "97–99°F",
    categoryLabel: "Vitals",
  },
  oxygen_saturation: {
    chart: "line",
    aggregation: "avg",
    label: "Oxygen Saturation",
    unit: "%",
    color: "#5AC8FA",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "95–100%",
    categoryLabel: "Vitals",
  },
  blood_glucose: {
    chart: "line",
    aggregation: "avg",
    label: "Blood Glucose",
    unit: "mg/dL",
    color: "#FF9500",
    heroLabel: "Average",
    dailyIsTotal: false,
    normalRange: "70–140 mg/dL",
    categoryLabel: "Vitals",
  },

  // ── Activity ──────────────────────────────────────────────────────────────

  steps: {
    chart: "scatter",
    aggregation: "sum",
    label: "Steps",
    unit: "steps",
    color: "#30B0C7",
    heroLabel: "Today's Steps",
    dailyIsTotal: true,
    categoryLabel: "Activity",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  distance: {
    chart: "bar",
    aggregation: "sum",
    label: "Distance",
    unit: "mi",
    color: "#007AFF",
    heroLabel: "Today's Distance",
    dailyIsTotal: true,
    categoryLabel: "Activity",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  flights_climbed: {
    chart: "bar",
    aggregation: "sum",
    label: "Flights Climbed",
    unit: "flights",
    color: "#8E8E93",
    heroLabel: "Today's Flights",
    dailyIsTotal: true,
    categoryLabel: "Activity",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  active_energy: {
    chart: "bar",
    aggregation: "sum",
    label: "Active Calories",
    unit: "kcal",
    color: "#FF6B35",
    heroLabel: "Today's Calories",
    dailyIsTotal: true,
    categoryLabel: "Activity",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  exercise_minutes: {
    chart: "bar",
    aggregation: "sum",
    label: "Exercise",
    unit: "min",
    color: "#AF52DE",
    heroLabel: "Today's Minutes",
    dailyIsTotal: true,
    categoryLabel: "Activity",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },

  // ── Body ──────────────────────────────────────────────────────────────────

  weight: {
    chart: "line",
    aggregation: "latest",
    label: "Weight",
    unit: "lbs",
    color: "#8E8E93",
    heroLabel: "Current",
    dailyIsTotal: false,
    categoryLabel: "Body",
  },
  height: {
    chart: "line",
    aggregation: "latest",
    label: "Height",
    unit: "in",
    color: "#636366",
    heroLabel: "Recorded",
    dailyIsTotal: false,
    categoryLabel: "Body",
  },
  bmi: {
    chart: "line",
    aggregation: "latest",
    label: "BMI",
    unit: "kg/m²",
    color: "#5856D6",
    heroLabel: "Current",
    dailyIsTotal: false,
    normalRange: "18.5–24.9",
    categoryLabel: "Body",
  },
  body_fat_percentage: {
    chart: "line",
    aggregation: "latest",
    label: "Body Fat",
    unit: "%",
    color: "#FF2D55",
    heroLabel: "Current",
    dailyIsTotal: false,
    normalRange: "10–25%",
    categoryLabel: "Body",
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────

  dietary_energy: {
    chart: "bar",
    aggregation: "sum",
    label: "Calories",
    unit: "kcal",
    color: "#FF9500",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    categoryLabel: "Nutrition",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  water: {
    chart: "bar",
    aggregation: "sum",
    label: "Water",
    unit: "fl oz",
    color: "#30D5C8",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    categoryLabel: "Nutrition",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  protein: {
    chart: "bar",
    aggregation: "sum",
    label: "Protein",
    unit: "g",
    color: "#E74C3C",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    categoryLabel: "Nutrition",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  carbohydrates: {
    chart: "bar",
    aggregation: "sum",
    label: "Carbohydrates",
    unit: "g",
    color: "#F39C12",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    categoryLabel: "Nutrition",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
  fats: {
    chart: "bar",
    aggregation: "sum",
    label: "Fats",
    unit: "g",
    color: "#F1C40F",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    categoryLabel: "Nutrition",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },

  // ── Sleep & Mindfulness ───────────────────────────────────────────────────

  sleep: {
    chart: "bar",
    aggregation: "sum",
    label: "Sleep",
    unit: "hr",
    color: "#5856D6",
    heroLabel: "Time Asleep",
    dailyIsTotal: true,
    categoryLabel: "Sleep",
    longRangeHeroLabel: "Avg / night",
    longRangeHeroMode: "avg_per_night",
  },
  mindfulness: {
    chart: "bar",
    aggregation: "sum",
    label: "Mindfulness",
    unit: "min",
    color: "#32ADE6",
    heroLabel: "Today's Minutes",
    dailyIsTotal: true,
    categoryLabel: "Mindfulness",
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
  },
};

// ── Accessor helpers ──────────────────────────────────────────────────────────

export function getMetricConfig(type: HealthMetricType): MetricDisplayConfig {
  return (
    METRIC_CONFIG[type] ?? {
      chart: "line" as MetricChartKind,
      aggregation: "avg" as MetricAggregation,
      label: type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      unit: "",
      color: "#007AFF",
      heroLabel: "Average",
      dailyIsTotal: false,
      categoryLabel: "Health",
    }
  );
}

export function getMetricChartKind(type: HealthMetricType): MetricChartKind {
  return METRIC_CONFIG[type]?.chart ?? "scatter";
}

export function getMetricAggregation(
  type: HealthMetricType,
): MetricAggregation {
  return METRIC_CONFIG[type]?.aggregation ?? "avg";
}
