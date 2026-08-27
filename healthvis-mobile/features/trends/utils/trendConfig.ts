import type {
  HealthCategory,
  HealthMetricType,
} from "@/types/health-metric";
import {
  getMetric,
  TREND_METRIC_TYPES,
  type MetricAggregation,
} from "@/lib/metric-registry";

// Time ranges now come from lib/time-range.ts; re-exported here so existing
// Trends imports keep working.
export {
  getBucketMs,
  getStartDate,
  rangeLabel,
  TIME_RANGES,
  type TimeRangeKey,
} from "@/lib/time-range";

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



