/**
 * Unified Health Metric Data Model
 * 
 * This module defines the unified HealthMetric interface that supports all health data types
 * from Apple HealthKit, including vitals, activity, body measurements, nutrition, sleep, and mindfulness.
 * 
 * Requirements: 2.8, 9.3, 9.4, 10.5
 */

import { DataRange } from './index';

// ============================================================================
// Health Metric Types
// ============================================================================

/**
 * Categories of health metrics
 */
export type HealthCategory = 'vitals' | 'activity' | 'body' | 'nutrition' | 'sleep' | 'mindfulness';

/**
 * Specific types of health metrics across all categories
 */
export type HealthMetricType = 
  // Vitals
  | 'heart_rate' 
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'respiratory_rate'
  | 'body_temperature'
  | 'oxygen_saturation'
  | 'blood_glucose'
  // Activity
  | 'steps'
  | 'distance'
  | 'flights_climbed'
  | 'active_energy'
  | 'exercise_minutes'
  // Body
  | 'weight'
  | 'height'
  | 'bmi'
  | 'body_fat_percentage'
  // Nutrition
  | 'dietary_energy'
  | 'water'
  | 'protein'
  | 'carbohydrates'
  | 'fats'
  // Sleep & Mindfulness
  | 'sleep'
  | 'mindfulness';


// Unified health metric interface that supports all health data types
export interface HealthMetric {
  id: string;                     // Unique identifier for this metric 
  category: HealthCategory;       // Category this metric belongs to
  type: HealthMetricType;         // Specific type of metric
  value: number;                  // Numeric value of the measurement
  timestamp: Date;                // Timestamp when the measurement was taken
  unit: string;                   // Unit of measurement (e.g., 'bpm', 'mg/dL', 'steps')

  range?: DataRange;              // Optional range classification (only for metrics with defined ranges)
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



// Normal ranges for health metrics that have defined ranges (perhaps edit)
export const NORMAL_RANGES: Partial<Record<HealthMetricType, { min: number; max: number }>> = {
  // Vitals
  heart_rate: { min: 40, max: 120 },
  blood_pressure_systolic: { min: 90, max: 120 },
  blood_pressure_diastolic: { min: 60, max: 80 },
  respiratory_rate: { min: 12, max: 20 },
  body_temperature: { min: 97.0, max: 99.0 },  // Fahrenheit
  oxygen_saturation: { min: 95, max: 100 },
  blood_glucose: { min: 70, max: 140 },
  
  // Body
  bmi: { min: 18.5, max: 24.9 },
  body_fat_percentage: { min: 10, max: 25 },  // Varies by gender/age
};

/**
 * Check if a metric type has a defined normal range
 */
export function hasDefinedRange(type: HealthMetricType): boolean {
  return type in NORMAL_RANGES;
}

/**
 * Classify a metric value into a range category (normal, warning, danger)
 * 
 * @param type - The type of health metric
 * @param value - The measured value
 * @returns The range classification
 */
export function classifyRange(type: HealthMetricType, value: number): DataRange {
  const ranges = NORMAL_RANGES[type];
  if (!ranges) {
    return 'normal';  // No defined range for this metric
  }
  
  // Danger: significantly outside normal range (20% beyond limits)
  if (value < ranges.min * 0.8 || value > ranges.max * 1.2) {
    return 'danger';
  }
  // Warning: outside normal range but not critical
  else if (value < ranges.min || value > ranges.max) {
    return 'warning';
  }
  // Normal: within normal range
  else {
    return 'normal';
  }
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Organize an array of HealthMetrics into categorized structure
 * 
 * @param metrics - Array of HealthMetrics to organize
 * @returns Categorized health data structure
 * 
 * Requirements: 10.5
 */
export function categorizeHealthMetrics(metrics: HealthMetric[]): CategorizedHealthData {
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

// ============================================================================
// Unit Helpers
// ============================================================================

/**
 * Get the standard unit for a given health metric type
 * 
 * @param type - The health metric type
 * @returns The standard unit string
 */
export function getUnitForType(type: HealthMetricType): string {
  const unitMap: Record<HealthMetricType, string> = {
    // Vitals
    heart_rate: 'bpm',
    blood_pressure_systolic: 'mmHg',
    blood_pressure_diastolic: 'mmHg',
    respiratory_rate: 'breaths/min',
    body_temperature: '°F',
    oxygen_saturation: '%',
    blood_glucose: 'mg/dL',
    
    // Activity
    steps: 'steps',
    distance: 'mi',
    flights_climbed: 'flights',
    active_energy: 'kcal',
    exercise_minutes: 'min',
    
    // Body
    weight: 'lbs',
    height: 'in',
    bmi: 'kg/m²',
    body_fat_percentage: '%',
    
    // Nutrition
    dietary_energy: 'kcal',
    water: 'fl oz',
    protein: 'g',
    carbohydrates: 'g',
    fats: 'g',
    
    // Sleep & Mindfulness
    sleep: 'hours',
    mindfulness: 'min',
  };
  
  return unitMap[type];
}

/**
 * Get a human-readable display name for a health metric type
 * 
 * @param type - The health metric type
 * @returns The display name
 */
export function getDisplayNameForType(type: HealthMetricType): string {
  const displayNameMap: Record<HealthMetricType, string> = {
    // Vitals
    heart_rate: 'Heart Rate',
    blood_pressure_systolic: 'Blood Pressure (Systolic)',
    blood_pressure_diastolic: 'Blood Pressure (Diastolic)',
    respiratory_rate: 'Respiratory Rate',
    body_temperature: 'Body Temperature',
    oxygen_saturation: 'Oxygen Saturation',
    blood_glucose: 'Blood Glucose',
    
    // Activity
    steps: 'Steps',
    distance: 'Distance',
    flights_climbed: 'Flights Climbed',
    active_energy: 'Active Energy',
    exercise_minutes: 'Exercise Minutes',
    
    // Body
    weight: 'Weight',
    height: 'Height',
    bmi: 'BMI',
    body_fat_percentage: 'Body Fat Percentage',
    
    // Nutrition
    dietary_energy: 'Calories',
    water: 'Water',
    protein: 'Protein',
    carbohydrates: 'Carbohydrates',
    fats: 'Fats',
    
    // Sleep & Mindfulness
    sleep: 'Sleep',
    mindfulness: 'Mindfulness',
  };
  
  return displayNameMap[type];
}
