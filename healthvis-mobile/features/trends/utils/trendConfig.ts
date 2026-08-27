import type {
  HealthCategory,
  HealthMetricType,
} from "@/types/health-metric";
import {
  getMetric,
  TREND_METRIC_TYPES,
  type MetricAggregation,
} from "@/lib/metric-registry";

export type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

export const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: "H", label: "Hour" },
  { key: "D", label: "Day" },
  { key: "W", label: "Week" },
  { key: "M", label: "Month" },
  { key: "6M", label: "6 Months" },
  { key: "Y", label: "Year" },
];

/**
 * A metric as offered on the Trends screen. Fields are projected from the
 * registry so a chip can never disagree with the detail screen about a
 * metric's label, unit, colour or aggregation.
 */
export type MetricChip = {
  key: HealthMetricType;
  label: string;
  unit: string;
  color: string;
  aggregation: MetricAggregation;
  category: HealthCategory;
};

export const METRIC_CHIPS: MetricChip[] = TREND_METRIC_TYPES.map((type) => {
  const metric = getMetric(type);
  return {
    key: type,
    label: metric.label,
    unit: metric.unit,
    color: metric.color,
    aggregation: metric.aggregation,
    category: metric.category,
  };
});

export const METRIC_MAP = new Map<string, MetricChip>(
  METRIC_CHIPS.map((m) => [m.key, m]),
);

export const DEFAULT_COMPARE_METRICS: HealthMetricType[] = [
  "heart_rate",
  "steps",
  "sleep",
];

// ── Time range → bucket size (ms) ──────────────────────────────────────────

export function getBucketMs(range: TimeRangeKey): number {
  switch (range) {
    case "H":
      return 5 * 60 * 1000; // 5-min buckets
    case "D":
      return 30 * 60 * 1000; // 30-min buckets
    case "W":
      return 3 * 60 * 60 * 1000; // 3-hour buckets
    case "M":
      return 12 * 60 * 60 * 1000; // 12-hour buckets
    case "6M":
      return 24 * 60 * 60 * 1000; // daily buckets
    case "Y":
      return 7 * 24 * 60 * 60 * 1000; // weekly buckets
  }
}

export function getStartDate(range: TimeRangeKey): Date {
  const now = new Date();
  switch (range) {
    case "H":
      return new Date(now.getTime() - 60 * 60 * 1000);
    case "D":
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
    case "W":
      return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    case "M":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "6M":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case "Y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

export function rangeLabel(range: TimeRangeKey): string {
  switch (range) {
    case "H":
      return "last hour";
    case "D":
      return "today";
    case "W":
      return "this week";
    case "M":
      return "this month";
    case "6M":
      return "last 6 months";
    case "Y":
      return "this year";
  }
}
