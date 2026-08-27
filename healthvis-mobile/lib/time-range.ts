/**
 * Time Range
 *
 * The single vocabulary for "how far back are we looking" and "how finely do we
 * slice it".
 *
 * This type was declared four times: identically in the metric detail screen,
 * the scatter chart and the Trends config, plus an incompatible
 * "day" | "week" | "month" variant in HealthDataContext that could not express
 * the other three. getStartDate existed twice, byte for byte, and the bucket
 * widths disagreed -- Trends sliced a week into 3-hour buckets while the detail
 * screen used 1-hour, so the same metric was summarised at different
 * resolutions depending on which screen you opened.
 */

import type { MetricChartKind } from "@/lib/metric-registry";

export type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

export const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: "H", label: "Hour" },
  { key: "D", label: "Day" },
  { key: "W", label: "Week" },
  { key: "M", label: "Month" },
  { key: "6M", label: "6 Months" },
  { key: "Y", label: "Year" },
];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Sampling width for charts that re-bucket their input before drawing.
 *
 * Scatter groups these into one point per display period and draws the spread
 * within each, so a finer width gives those range lines something to describe.
 */
const FINE_BUCKET_MS: Record<TimeRangeKey, number> = {
  H: MINUTE,
  D: 5 * MINUTE,
  W: HOUR,
  M: 6 * HOUR,
  "6M": DAY,
  Y: 7 * DAY,
};

/**
 * Bucket width for charts that plot exactly what they are handed.
 *
 * Line and bar charts draw one mark per bucket, so this is deliberately
 * coarser: a week at the fine width would be 168 bars.
 */
const COARSE_BUCKET_MS: Record<TimeRangeKey, number> = {
  H: 5 * MINUTE,
  D: 30 * MINUTE,
  W: 3 * HOUR,
  M: 12 * HOUR,
  "6M": DAY,
  Y: 7 * DAY,
};

/**
 * Returns the bucket width for a range, sized for how the chart will use it.
 *
 * Defaults to the coarse width, which is right for anything that plots buckets
 * directly.
 */
export function getBucketMs(
  range: TimeRangeKey,
  chartKind: MetricChartKind = "line",
): number {
  return chartKind === "scatter"
    ? FINE_BUCKET_MS[range]
    : COARSE_BUCKET_MS[range];
}

/** Returns the earliest timestamp included in a range. */
export function getStartDate(range: TimeRangeKey, now = new Date()): Date {
  switch (range) {
    case "H":
      return new Date(now.getTime() - HOUR);
    case "D":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    case "W":
      return new Date(now.getTime() - 6 * DAY);
    case "M":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "6M":
      return new Date(now.getTime() - 180 * DAY);
    case "Y":
      return new Date(now.getTime() - 365 * DAY);
  }
}

/** Number of calendar days a range spans, for per-day averages. */
export function getDaysInRange(range: TimeRangeKey): number {
  switch (range) {
    case "H":
    case "D":
      return 1;
    case "W":
      return 7;
    case "M":
      return 30;
    case "6M":
      return 180;
    case "Y":
      return 365;
  }
}

/**
 * True for ranges covering more than a single day.
 *
 * Cumulative metrics switch their headline from a total to a per-day average
 * at this boundary, so "Today's Steps" never labels a month.
 */
export function isLongRange(range: TimeRangeKey): boolean {
  return range !== "H" && range !== "D";
}

const SENTENCE_LABELS: Record<TimeRangeKey, string> = {
  H: "last hour",
  D: "today",
  W: "this week",
  M: "this month",
  "6M": "last 6 months",
  Y: "this year",
};

const TITLE_LABELS: Record<TimeRangeKey, string> = {
  H: "Last Hour",
  D: "Today",
  W: "This Week",
  M: "This Month",
  "6M": "Last 6 Months",
  Y: "This Year",
};

/**
 * Describes a range in words.
 *
 * "sentence" reads mid-prose ("your steps this week"); "title" is for headings
 * and subtitles. Both casings previously existed as separate functions in
 * separate files.
 */
export function rangeLabel(
  range: TimeRangeKey,
  style: "sentence" | "title" = "sentence",
): string {
  return style === "title" ? TITLE_LABELS[range] : SENTENCE_LABELS[range];
}
