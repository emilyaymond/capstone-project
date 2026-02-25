export type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

export const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: "H", label: "Hour" },
  { key: "D", label: "Day" },
  { key: "W", label: "Week" },
  { key: "M", label: "Month" },
  { key: "6M", label: "6 Months" },
  { key: "Y", label: "Year" },
];

// These keys should eventually map to your HealthMetric keys.
// Keep them generic now; you can align them later.
export const METRIC_CHIPS = [
  { key: "heart_rate", label: "Heart Rate" },
  { key: "steps", label: "Steps" },
  { key: "sleep", label: "Sleep" },
  { key: "glucose", label: "Glucose" },
];

export const DEFAULT_COMPARE_METRICS = ["heart_rate", "step"];
