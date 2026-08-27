/**
 * Unified Health Metric Data Model
 *
 * Type declarations only. Metric metadata -- labels, units, colours, normal
 * ranges, chart kinds and aggregation -- lives in lib/metric-registry.ts, which
 * imports these types. Keeping data out of this module is what stops the
 * lookup tables here from drifting away from the rest of the app again.
 */

import { DataRange } from "./index";

// Health Metric Types

/**
 * Categories of health metrics
 */
export type HealthCategory =
  | "vitals"
  | "activity"
  | "body"
  | "nutrition"
  | "sleep"
  | "mindfulness";

/**
 * Specific types of health metrics across all categories
 */
export type HealthMetricType =
  // Vitals
  | "heart_rate"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "respiratory_rate"
  | "body_temperature"
  | "oxygen_saturation"
  | "blood_glucose"
  // Activity
  | "steps"
  | "distance"
  | "flights_climbed"
  | "active_energy"
  | "exercise_minutes"
  // Body
  | "weight"
  | "height"
  | "bmi"
  | "body_fat_percentage"
  // Nutrition
  | "dietary_energy"
  | "water"
  | "protein"
  | "carbohydrates"
  | "fats"
  // Sleep & Mindfulness
  | "sleep"
  | "mindfulness";

// Unified health metric interface that supports all health data types
export interface HealthMetric {
  id: string; // Unique identifier for this metric
  category: HealthCategory; // Category this metric belongs to
  type: HealthMetricType; // Specific type of metric
  value: number; // Numeric value of the measurement
  timestamp: Date; // Timestamp when the measurement was taken
  unit: string; // Unit of measurement (e.g., 'bpm', 'mg/dL', 'steps')

  range?: DataRange; // Optional range classification (only for metrics with defined ranges)
  metadata?: Record<string, any>; // Optional additional metadata (e.g., blood pressure has systolic/diastolic)
}

// Categorized health data structure for organizing metrics by category
export interface CategorizedHealthData {
  vitals: HealthMetric[];
  activity: HealthMetric[];
  body: HealthMetric[];
  nutrition: HealthMetric[];
  sleep: HealthMetric[];
  mindfulness: HealthMetric[];
}

// Migration Functions

/**
 * Organize an array of HealthMetrics into categorized structure
 *
 * @param metrics - Array of HealthMetrics to organize
 * @returns Categorized health data structure
 *
 * Requirements: 10.5
 */
export function categorizeHealthMetrics(
  metrics: HealthMetric[],
): CategorizedHealthData {
  const categorized: CategorizedHealthData = {
    vitals: [],
    activity: [],
    body: [],
    nutrition: [],
    sleep: [],
    mindfulness: [],
  };

  for (const metric of metrics) {
    categorized[metric.category].push(metric);
  }

  return categorized;
}
