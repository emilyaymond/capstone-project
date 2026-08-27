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

/** Sleep quality verdict, or "unknown" when there is no sleep to judge. */
export type SleepQuality =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "unknown";

export interface SleepSummary {
  breakdown: SleepStageBreakdown;
  sleepQuality: SleepQuality;
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
/**
 * Returns when a sleep session ended.
 *
 * Metrics carry the session start as their timestamp and the length in
 * metadata, so the end has to be derived.
 */
export function getSleepSessionEnd(metric: HealthMetric): Date {
  const start = new Date(metric.timestamp).getTime();
  const minutes =
    metric.metadata?.durationMinutes != null
      ? Number(metric.metadata.durationMinutes)
      : Number(metric.value) * 60;

  return new Date(start + (Number.isFinite(minutes) ? minutes : 0) * 60 * 1000);
}

/**
 * Selects the sleep sessions belonging to a range.
 *
 * A night is attributed to the day it ends, not the day it starts. Filtering on
 * start time meant going to bed at 22:00 put most of the night in the previous
 * day, so "today" showed only the hours after midnight and under-reported every
 * night that began before it.
 */
export function filterSleepForRange(
  metrics: HealthMetric[],
  rangeStart: Date,
): HealthMetric[] {
  const startMs = rangeStart.getTime();
  return metrics.filter((metric) => getSleepSessionEnd(metric).getTime() >= startMs);
}

export function calculateSleepQuality(
  breakdown: SleepStageBreakdown,
  nights: number = 1,
): SleepQuality {
  const { totalSleep, deepSleep, remSleep, awake } = breakdown;

  // No recorded sleep is an absence of data, not bad sleep. Falling through to
  // the "everything else" case below would grade a night the user simply did
  // not wear their watch as "Poor".
  if (totalSleep <= 0) return "unknown";

  // The duration thresholds below describe a single night, but a breakdown can
  // cover any range: on a month view totalSleep is ~190 hours, which failed
  // every band and fell through to "poor" regardless of how well the user
  // actually slept. Average across the period before comparing.
  const nightsInRange = nights > 0 ? nights : 1;
  const sleepPerNight = totalSleep / nightsInRange;

  // Stage percentages are ratios, so they hold at any range and need no
  // adjustment.
  const deepPercentage = totalSleep > 0 ? (deepSleep / totalSleep) * 100 : 0;
  const remPercentage = totalSleep > 0 ? (remSleep / totalSleep) * 100 : 0;
  const awakePercentage = totalSleep > 0 ? (awake / totalSleep) * 100 : 0;

  // Excellent: 7-9 hours, 15-25% deep, 20-25% REM, <5% awake
  if (
    sleepPerNight >= 7 &&
    sleepPerNight <= 9 &&
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
    sleepPerNight >= 6 &&
    sleepPerNight <= 10 &&
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
    sleepPerNight >= 5 &&
    sleepPerNight <= 11 &&
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
  // Case-insensitive: HealthKit reports "DEEP" while the mapped label is
  // "Deep Sleep", and a case-sensitive check silently returned the default.
  const value = stage.toLowerCase();
  if (value.includes("deep")) return "#5856D6"; // Purple
  if (value.includes("rem")) return "#007AFF"; // Blue
  if (value.includes("light") || value.includes("core")) return "#34C759"; // Green
  if (value.includes("awake")) return "#FF9500"; // Orange
  if (value.includes("in bed") || value.includes("inbed")) return "#8E8E93"; // Gray
  return "#34C759"; // Default to green
}
