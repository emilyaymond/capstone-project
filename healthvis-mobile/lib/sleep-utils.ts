/**
 * Sleep Utilities
 *
 * Helper functions for processing and aggregating sleep data from Apple HealthKit.
 * Supports different sleep stages: Light Sleep, Deep Sleep, REM Sleep, Awake, In Bed.
 */

import { HealthMetric } from "@/types/health-metric";

export interface SleepStageBreakdown {
  lightSleep: number; // hours
  deepSleep: number; // hours
  remSleep: number; // hours
  awake: number; // hours
  inBed: number; // hours
  totalSleep: number; // hours (excludes awake and in bed)
  totalInBed: number; // hours (includes everything)
}

export interface SleepSummary {
  breakdown: SleepStageBreakdown;
  sleepQuality: "excellent" | "good" | "fair" | "poor";
  sleepEfficiency: number; // percentage (totalSleep / totalInBed * 100)
  samples: HealthMetric[];
}

/**
 * Aggregate sleep metrics by stage
 *
 * @param sleepMetrics - Array of sleep HealthMetrics
 * @returns Sleep stage breakdown with totals
 */
export function aggregateSleepByStage(
  sleepMetrics: HealthMetric[],
): SleepStageBreakdown {
  const breakdown: SleepStageBreakdown = {
    lightSleep: 0,
    deepSleep: 0,
    remSleep: 0,
    awake: 0,
    inBed: 0,
    totalSleep: 0,
    totalInBed: 0,
  };

  for (const metric of sleepMetrics) {
    const duration =
      metric.metadata?.durationMinutes != null
        ? metric.metadata.durationMinutes / 60
        : Number(metric.value);

    const stage =
      metric.metadata?.sleepStage || metric.metadata?.rawSleepStage || "Asleep";

    // Categorize by sleep stage
    if (stage.includes("Light") || stage.includes("CORE")) {
      breakdown.lightSleep += duration;
    } else if (stage.includes("Deep") || stage.includes("DEEP")) {
      breakdown.deepSleep += duration;
    } else if (stage.includes("REM")) {
      breakdown.remSleep += duration;
    } else if (stage.includes("Awake") || stage.includes("AWAKE")) {
      breakdown.awake += duration;
    } else if (stage.includes("In Bed") || stage.includes("INBED")) {
      breakdown.inBed += duration;
    } else {
      // Unspecified sleep - count as light sleep
      breakdown.lightSleep += duration;
    }
  }

  // Calculate totals
  breakdown.totalSleep =
    breakdown.lightSleep + breakdown.deepSleep + breakdown.remSleep;
  breakdown.totalInBed =
    breakdown.totalSleep + breakdown.awake + breakdown.inBed;

  console.log(`BDDD totalSleep: ${breakdown.totalSleep}`);
  return breakdown;
}

/**
 * Calculate sleep quality based on sleep stages and duration
 *
 * @param breakdown - Sleep stage breakdown
 * @returns Sleep quality rating
 */
export function calculateSleepQuality(
  breakdown: SleepStageBreakdown,
): "excellent" | "good" | "fair" | "poor" {
  const { totalSleep, deepSleep, remSleep, awake } = breakdown;

  // Ideal sleep: 7-9 hours, with good deep and REM percentages
  const deepPercentage = totalSleep > 0 ? (deepSleep / totalSleep) * 100 : 0;
  const remPercentage = totalSleep > 0 ? (remSleep / totalSleep) * 100 : 0;
  const awakePercentage = totalSleep > 0 ? (awake / totalSleep) * 100 : 0;

  // Excellent: 7-9 hours, 15-25% deep, 20-25% REM, <5% awake
  if (
    totalSleep >= 7 &&
    totalSleep <= 9 &&
    deepPercentage >= 15 &&
    deepPercentage <= 25 &&
    remPercentage >= 20 &&
    remPercentage <= 25 &&
    awakePercentage < 5
  ) {
    return "excellent";
  }

  // Good: 6-10 hours, 10-30% deep, 15-30% REM, <10% awake
  if (
    totalSleep >= 6 &&
    totalSleep <= 10 &&
    deepPercentage >= 10 &&
    deepPercentage <= 30 &&
    remPercentage >= 15 &&
    remPercentage <= 30 &&
    awakePercentage < 10
  ) {
    return "good";
  }

  // Fair: 5-11 hours, some deep/REM sleep
  if (
    totalSleep >= 5 &&
    totalSleep <= 11 &&
    (deepPercentage > 5 || remPercentage > 10)
  ) {
    return "fair";
  }

  // Poor: everything else
  return "poor";
}

/**
 * Calculate sleep efficiency (time asleep / time in bed)
 *
 * @param breakdown - Sleep stage breakdown
 * @returns Sleep efficiency percentage (0-100)
 */
export function calculateSleepEfficiency(
  breakdown: SleepStageBreakdown,
): number {
  if (breakdown.totalInBed === 0) return 0;
  return Math.round((breakdown.totalSleep / breakdown.totalInBed) * 100);
}

/**
 * Generate a comprehensive sleep summary
 *
 * @param sleepMetrics - Array of sleep HealthMetrics
 * @returns Complete sleep summary with quality metrics
 */
export function generateSleepSummary(
  sleepMetrics: HealthMetric[],
): SleepSummary {
  const breakdown = aggregateSleepByStage(sleepMetrics);
  const sleepQuality = calculateSleepQuality(breakdown);
  const sleepEfficiency = calculateSleepEfficiency(breakdown);

  return {
    breakdown,
    sleepQuality,
    sleepEfficiency,
    samples: sleepMetrics,
  };
}

/**
 * Format sleep duration for display
 *
 * @param hours - Duration in hours
 * @returns Formatted string (e.g., "7h 30m")
 */
export function formatSleepDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Get color for sleep stage visualization
 *
 * @param stage - Sleep stage name
 * @returns Hex color code
 */
export function getSleepStageColor(stage: string): string {
  if (stage.includes("Deep")) return "#5856D6"; // Purple
  if (stage.includes("REM")) return "#007AFF"; // Blue
  if (stage.includes("Light") || stage.includes("Core")) return "#34C759"; // Green
  if (stage.includes("Awake")) return "#FF9500"; // Orange
  if (stage.includes("In Bed")) return "#8E8E93"; // Gray
  return "#34C759"; // Default to green
}
