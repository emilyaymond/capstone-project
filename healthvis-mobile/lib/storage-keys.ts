/**
 * Storage Keys
 *
 * Every AsyncStorage key the app reads or writes, in one place.
 *
 * These were spread across three private tables (useStorage's STORAGE_KEYS,
 * HealthDataContext's CACHE_KEYS, pins.ts's STORAGE_KEY) plus bare string
 * literals in the settings screen. "health_data_range" in particular is a
 * contract between two files -- written by Settings, read by
 * HealthDataContext -- that was held together only by the two strings
 * happening to match, with nothing to catch a typo in either.
 */

export const STORAGE_KEYS = {
  /** Selected accessibility mode: visual | audio | hybrid | simplified. */
  ACCESSIBILITY_MODE: "accessibility_mode",
  /** Serialised AccessibilitySettings (font size, contrast, audio, haptics). */
  ACCESSIBILITY_SETTINGS: "accessibility_settings",

  /** Cached CategorizedHealthData plus the timestamp it was written. */
  HEALTH_METRICS: "health_data_metrics",
  /** Most recent AI analysis response. */
  LAST_ANALYSIS: "health_data_last_analysis",
  /** Epoch milliseconds of the last successful HealthKit sync. */
  LAST_FETCH: "health_data_last_fetch",
  /** How many days of history to request, as a stringified number. */
  DATA_RANGE: "health_data_range",

  /** Metric cards the user pinned to the summary screen. */
  SUMMARY_PINS: "summary_pins_v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Keys from earlier versions that should be cleared on launch.
 *
 * health_data_vitals held the pre-HealthMetric VitalSign shape; anything left
 * under it would fail to parse into the current model.
 */
export const LEGACY_STORAGE_KEYS: readonly string[] = ["health_data_vitals"];
