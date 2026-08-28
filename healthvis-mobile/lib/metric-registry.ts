/**
 * Metric Registry
 *
 * The single source of truth for what a health metric *is*: its labels, unit,
 * colour, category, normal range, and how it should be charted and aggregated.
 *
 * This previously lived in three places that had drifted apart -- app/metric/
 * metricConfig.ts, features/trends/utils/trendConfig.ts and the lookup tables in
 * types/health-metric.ts. They disagreed on eight fields, including one that
 * changed behaviour: weight aggregated as "latest" on the detail screen and
 * "avg" on Trends, so the same metric meant different things on different
 * screens. Everything now derives from METRICS below.
 */

import type { HealthCategory, HealthMetricType } from "@/types/health-metric";
import type { DataRange } from "@/types";

export type MetricAggregation = "avg" | "sum" | "latest";
export type MetricChartKind = "scatter" | "line" | "bar";

export interface MetricDefinition {
  category: HealthCategory;
  /** Category name as shown in UI subtitles. */
  categoryLabel: string;
  /** Short label for chips, chart titles and tight layouts. */
  label: string;
  /** Full label for screen readers and detail headers. */
  spokenLabel: string;
  /** Compact unit rendered next to a number. */
  unit: string;
  /** Expanded unit for text-to-speech, where "br/min" reads badly. */
  spokenUnit: string;
  color: string;
  chart: MetricChartKind;
  aggregation: MetricAggregation;
  /** Clinically normal band, where one is defined. */
  normalRange?: { min: number; max: number };
  /** Label for the headline stat on the detail screen. */
  heroLabel: string;
  /** True for cumulative metrics, where a day's value is a total not an average. */
  dailyIsTotal: boolean;
  /** Overrides heroLabel on W/M/6M/Y ranges. */
  longRangeHeroLabel?: string;
  /** How to convert a period total into the headline number on long ranges. */
  longRangeHeroMode?: "avg_per_day" | "avg_per_night";
  /** Whether this metric is offered as a chip on the Trends screen. */
  inTrends: boolean;
}

export const METRICS: Record<HealthMetricType, MetricDefinition> = {
  // ── Vitals ────────────────────────────────────────────────────────────────
  heart_rate: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Heart Rate",
    spokenLabel: "Heart Rate",
    unit: "bpm",
    spokenUnit: "beats per minute",
    color: "#FF3B30",
    chart: "scatter",
    aggregation: "avg",
    normalRange: { min: 40, max: 120 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: true,
  },
  blood_pressure_systolic: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Systolic BP",
    spokenLabel: "Blood Pressure (Systolic)",
    unit: "mmHg",
    spokenUnit: "millimetres of mercury",
    color: "#FF6B6B",
    chart: "line",
    aggregation: "avg",
    normalRange: { min: 90, max: 120 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: false,
  },
  blood_pressure_diastolic: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Diastolic BP",
    spokenLabel: "Blood Pressure (Diastolic)",
    unit: "mmHg",
    spokenUnit: "millimetres of mercury",
    color: "#C0392B",
    chart: "line",
    aggregation: "avg",
    normalRange: { min: 60, max: 80 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: false,
  },
  respiratory_rate: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Respiratory Rate",
    spokenLabel: "Respiratory Rate",
    unit: "br/min",
    spokenUnit: "breaths per minute",
    color: "#00b7ff",
    chart: "scatter",
    aggregation: "avg",
    normalRange: { min: 12, max: 20 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: true,
  },
  body_temperature: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Body Temperature",
    spokenLabel: "Body Temperature",
    unit: "°F",
    spokenUnit: "degrees Fahrenheit",
    color: "#FF9500",
    chart: "line",
    aggregation: "avg",
    normalRange: { min: 97.0, max: 99.0 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: false,
  },
  oxygen_saturation: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Oxygen Saturation",
    spokenLabel: "Oxygen Saturation",
    unit: "%",
    spokenUnit: "percent",
    color: "#5AC8FA",
    chart: "line",
    aggregation: "avg",
    normalRange: { min: 95, max: 100 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: true,
  },
  blood_glucose: {
    category: "vitals",
    categoryLabel: "Vitals",
    label: "Blood Glucose",
    spokenLabel: "Blood Glucose",
    unit: "mg/dL",
    spokenUnit: "milligrams per decilitre",
    color: "#FF9500",
    chart: "line",
    aggregation: "avg",
    normalRange: { min: 70, max: 140 },
    heroLabel: "Average",
    dailyIsTotal: false,
    inTrends: true,
  },

  // ── Activity ──────────────────────────────────────────────────────────────
  steps: {
    category: "activity",
    categoryLabel: "Activity",
    label: "Steps",
    spokenLabel: "Steps",
    unit: "steps",
    spokenUnit: "steps",
    color: "#30B0C7",
    chart: "scatter",
    aggregation: "sum",
    heroLabel: "Today's Steps",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: true,
  },
  distance: {
    category: "activity",
    categoryLabel: "Activity",
    label: "Distance",
    spokenLabel: "Distance",
    unit: "mi",
    spokenUnit: "miles",
    color: "#007AFF",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Distance",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  flights_climbed: {
    category: "activity",
    categoryLabel: "Activity",
    label: "Flights Climbed",
    spokenLabel: "Flights Climbed",
    unit: "flights",
    spokenUnit: "flights",
    color: "#8E8E93",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Flights",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  active_energy: {
    category: "activity",
    categoryLabel: "Activity",
    label: "Active Calories",
    spokenLabel: "Active Energy",
    unit: "kcal",
    spokenUnit: "calories",
    color: "#FF6B35",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Calories",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: true,
  },
  exercise_minutes: {
    category: "activity",
    categoryLabel: "Activity",
    label: "Exercise",
    spokenLabel: "Exercise Minutes",
    unit: "min",
    spokenUnit: "minutes",
    color: "#AF52DE",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Minutes",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: true,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  weight: {
    category: "body",
    categoryLabel: "Body",
    label: "Weight",
    spokenLabel: "Weight",
    unit: "lbs",
    spokenUnit: "pounds",
    color: "#8E8E93",
    chart: "line",
    // Standardised on "latest": Trends used "avg", which averaged separate
    // weigh-ins into a number that was never actually measured.
    aggregation: "latest",
    heroLabel: "Current",
    dailyIsTotal: false,
    inTrends: true,
  },
  height: {
    category: "body",
    categoryLabel: "Body",
    label: "Height",
    spokenLabel: "Height",
    unit: "in",
    spokenUnit: "inches",
    color: "#636366",
    chart: "line",
    aggregation: "latest",
    heroLabel: "Recorded",
    dailyIsTotal: false,
    inTrends: false,
  },
  bmi: {
    category: "body",
    categoryLabel: "Body",
    label: "BMI",
    spokenLabel: "BMI",
    unit: "kg/m²",
    spokenUnit: "",
    color: "#5856D6",
    chart: "line",
    aggregation: "latest",
    normalRange: { min: 18.5, max: 24.9 },
    heroLabel: "Current",
    dailyIsTotal: false,
    inTrends: false,
  },
  body_fat_percentage: {
    category: "body",
    categoryLabel: "Body",
    label: "Body Fat",
    spokenLabel: "Body Fat Percentage",
    unit: "%",
    spokenUnit: "percent",
    color: "#FF2D55",
    chart: "line",
    aggregation: "latest",
    normalRange: { min: 10, max: 25 },
    heroLabel: "Current",
    dailyIsTotal: false,
    inTrends: false,
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  dietary_energy: {
    category: "nutrition",
    categoryLabel: "Nutrition",
    label: "Calories",
    spokenLabel: "Calories",
    unit: "kcal",
    spokenUnit: "calories",
    color: "#FF9500",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  water: {
    category: "nutrition",
    categoryLabel: "Nutrition",
    label: "Water",
    spokenLabel: "Water",
    unit: "fl oz",
    spokenUnit: "fluid ounces",
    color: "#30D5C8",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  protein: {
    category: "nutrition",
    categoryLabel: "Nutrition",
    label: "Protein",
    spokenLabel: "Protein",
    unit: "g",
    spokenUnit: "grams",
    color: "#E74C3C",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  carbohydrates: {
    category: "nutrition",
    categoryLabel: "Nutrition",
    label: "Carbohydrates",
    spokenLabel: "Carbohydrates",
    unit: "g",
    spokenUnit: "grams",
    color: "#F39C12",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },
  fats: {
    category: "nutrition",
    categoryLabel: "Nutrition",
    label: "Fats",
    spokenLabel: "Fats",
    unit: "g",
    spokenUnit: "grams",
    color: "#F1C40F",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Intake",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: false,
  },

  // ── Sleep & Mindfulness ───────────────────────────────────────────────────
  sleep: {
    category: "sleep",
    categoryLabel: "Sleep",
    label: "Sleep",
    spokenLabel: "Sleep",
    unit: "hr",
    spokenUnit: "hours",
    color: "#5856D6",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Time Asleep",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / night",
    longRangeHeroMode: "avg_per_night",
    inTrends: true,
  },
  mindfulness: {
    category: "mindfulness",
    categoryLabel: "Mindfulness",
    label: "Mindfulness",
    spokenLabel: "Mindfulness",
    unit: "min",
    spokenUnit: "minutes",
    color: "#32ADE6",
    chart: "bar",
    aggregation: "sum",
    heroLabel: "Today's Minutes",
    dailyIsTotal: true,
    longRangeHeroLabel: "Avg / day",
    longRangeHeroMode: "avg_per_day",
    inTrends: true,
  },
};

// ── Accessors ────────────────────────────────────────────────────────────────

/** Returns the full definition for a metric type, falling back to heart rate. */
export function getMetric(type: HealthMetricType): MetricDefinition {
  return METRICS[type] ?? METRICS.heart_rate;
}

/** Returns the chart kind the detail screen should render for a metric. */
export function getMetricChartKind(type: HealthMetricType): MetricChartKind {
  return getMetric(type).chart;
}

/** Returns how a metric's values should be combined when bucketed. */
export function getMetricAggregation(
  type: HealthMetricType,
): MetricAggregation {
  return getMetric(type).aggregation;
}

/** Returns the short display label for a metric type. */
export function getLabelForType(type: HealthMetricType): string {
  return getMetric(type).label;
}

/** Returns the full, screen-reader-friendly name for a metric type. */
export function getDisplayNameForType(type: HealthMetricType): string {
  return getMetric(type).spokenLabel;
}

/** Returns the compact unit string for a metric type. */
export function getUnitForType(type: HealthMetricType): string {
  return getMetric(type).unit;
}

/** Returns the expanded unit for speech, e.g. "breaths per minute". */
export function getSpokenUnitForType(type: HealthMetricType): string {
  return getMetric(type).spokenUnit;
}

/** Returns the category a metric type belongs to. */
export function getCategoryForType(type: HealthMetricType): HealthCategory {
  return getMetric(type).category;
}

/** Returns the accent colour used for a metric across charts and cards. */
export function getColorForType(type: HealthMetricType): string {
  return getMetric(type).color;
}

// ── Ranges ───────────────────────────────────────────────────────────────────

/** Normal ranges for the metric types that define one. */
export const NORMAL_RANGES: Partial<
  Record<HealthMetricType, { min: number; max: number }>
> = Object.fromEntries(
  (Object.keys(METRICS) as HealthMetricType[])
    .filter((type) => METRICS[type].normalRange)
    .map((type) => [type, METRICS[type].normalRange!]),
);

/** Reports whether a metric type has a defined normal range. */
export function hasDefinedRange(type: HealthMetricType): boolean {
  return Boolean(getMetric(type).normalRange);
}

/**
 * Classifies a value as normal, warning or danger against its normal range.
 *
 * Danger is more than 20% outside the band; warning is outside but within it.
 */
export function classifyRange(
  type: HealthMetricType,
  value: number,
): DataRange {
  const range = getMetric(type).normalRange;
  if (!range) return "normal";

  if (value < range.min * 0.8 || value > range.max * 1.2) return "danger";
  if (value < range.min || value > range.max) return "warning";
  return "normal";
}

/**
 * Renders a metric's normal range as display text, e.g. "40-120 bpm".
 *
 * Derived from the numbers rather than stored as a second hand-written string,
 * which is how the old config drifted out of sync with NORMAL_RANGES.
 */
export function normalRangeText(type: HealthMetricType): string | undefined {
  const metric = getMetric(type);
  if (!metric.normalRange) return undefined;

  const { min, max } = metric.normalRange;
  const unit = metric.unit;
  // "%" and "°F" read better tight against the number.
  const separator = unit === "%" || unit.startsWith("°") ? "" : " ";
  return `${min}–${max}${unit ? `${separator}${unit}` : ""}`;
}

// ── Derived collections ──────────────────────────────────────────────────────

/** Every metric type, in registry order. */
export const ALL_METRIC_TYPES = Object.keys(METRICS) as HealthMetricType[];

/** Maps each metric type to its category, for grouping raw samples. */
export const METRIC_TYPE_TO_CATEGORY: Record<HealthMetricType, HealthCategory> =
  Object.fromEntries(
    ALL_METRIC_TYPES.map((type) => [type, METRICS[type].category]),
  ) as Record<HealthMetricType, HealthCategory>;

/** Metric types offered as selectable chips on the Trends screen. */
export const TREND_METRIC_TYPES = ALL_METRIC_TYPES.filter(
  (type) => METRICS[type].inTrends,
);
