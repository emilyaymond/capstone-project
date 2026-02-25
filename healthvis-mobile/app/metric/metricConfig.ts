import { HealthMetricType } from '@/types/health-metric';

// features/metrics/metricConfig.ts
export type MetricAggregation = "avg" | "sum" | "latest";

export type MetricChartKind = "line" | "bar";

// metricConfig.ts
 // adjust path to where HealthMetricType is exported

export const METRIC_CONFIG: Record<
  HealthMetricType,
  { chart: MetricChartKind; aggregation: MetricAggregation }
> = {
  // Vitals (average over buckets)
  heart_rate: { chart: "line", aggregation: "avg" },
  respiratory_rate: { chart: "line", aggregation: "avg" },
  body_temperature: { chart: "line", aggregation: "avg" },
  oxygen_saturation: { chart: "line", aggregation: "avg" },
  blood_glucose: { chart: "line", aggregation: "avg" },
  blood_pressure_systolic: { chart: "line", aggregation: "avg" },
  blood_pressure_diastolic: { chart: "line", aggregation: "avg" },

  // Activity (sum per bucket/day)
  steps: { chart: "bar", aggregation: "sum" },
  distance: { chart: "bar", aggregation: "sum" },
  flights_climbed: { chart: "bar", aggregation: "sum" },
  active_energy: { chart: "bar", aggregation: "sum" },
  exercise_minutes: { chart: "bar", aggregation: "sum" },

  // Body (latest makes most sense for weight-ish measures)
  weight: { chart: "line", aggregation: "latest" },
  height: { chart: "line", aggregation: "latest" },
  bmi: { chart: "line", aggregation: "latest" },
  body_fat_percentage: { chart: "line", aggregation: "latest" },

  // Nutrition (sum daily)
  dietary_energy: { chart: "bar", aggregation: "sum" },
  water: { chart: "bar", aggregation: "sum" },
  protein: { chart: "bar", aggregation: "sum" },
  carbohydrates: { chart: "bar", aggregation: "sum" },
  fats: { chart: "bar", aggregation: "sum" },

  // Sleep & mindfulness
  sleep: { chart: "bar", aggregation: "sum" },
  mindfulness: { chart: "bar", aggregation: "sum" },
};


export function getMetricChartKind(type: HealthMetricType): MetricChartKind {
  return METRIC_CONFIG[type]?.chart ?? "line";
}

export function getMetricAggregation(type: HealthMetricType): MetricAggregation {
  return METRIC_CONFIG[type]?.aggregation ?? "avg";
}
