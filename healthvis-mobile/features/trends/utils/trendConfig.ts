export type TimeRangeKey = "H" | "D" | "W" | "M" | "6M" | "Y";

export const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: "H", label: "Hour" },
  { key: "D", label: "Day" },
  { key: "W", label: "Week" },
  { key: "M", label: "Month" },
  { key: "6M", label: "6 Months" },
  { key: "Y", label: "Year" },
];

export type MetricChip = {
  key: string;
  label: string;
  unit: string;
  color: string;
  /** "avg" | "sum" | "latest" – how to bucket this metric */
  aggregation: "avg" | "sum" | "latest";
  category: "vitals" | "activity" | "body" | "sleep" | "mindfulness";
};

export const METRIC_CHIPS: MetricChip[] = [
  // ── Vitals ──────────────────────────────────────────────────────────────
  {
    key: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    color: "#FF3B30",
    aggregation: "avg",
    category: "vitals",
  },
  {
    key: "respiratory_rate",
    label: "Respiratory Rate",
    unit: "br/min",
    color: "#00b7ff",
    aggregation: "avg",
    category: "vitals",
  },
  {
    key: "oxygen_saturation",
    label: "Oxygen Saturation",
    unit: "%",
    color: "#5AC8FA",
    aggregation: "avg",
    category: "vitals",
  },
  {
    key: "blood_glucose",
    label: "Blood Glucose",
    unit: "mg/dL",
    color: "#FF9500",
    aggregation: "avg",
    category: "vitals",
  },
  // ── Activity ─────────────────────────────────────────────────────────────
  {
    key: "steps",
    label: "Steps",
    unit: "steps",
    color: "#30B0C7",
    aggregation: "sum",
    category: "activity",
  },
  {
    key: "active_energy",
    label: "Active Calories",
    unit: "kcal",
    color: "#FF6B35",
    aggregation: "sum",
    category: "activity",
  },
  {
    key: "exercise_minutes",
    label: "Exercise",
    unit: "min",
    color: "#AF52DE",
    aggregation: "sum",
    category: "activity",
  },
  // ── Body ─────────────────────────────────────────────────────────────────
  {
    key: "weight",
    label: "Weight",
    unit: "lbs",
    color: "#8E8E93",
    aggregation: "avg",
    category: "body",
  },
  // ── Sleep ────────────────────────────────────────────────────────────────
  {
    key: "sleep",
    label: "Sleep",
    unit: "hr",
    color: "#5856D6",
    aggregation: "sum",
    category: "sleep",
  },
  // ── Mindfulness ──────────────────────────────────────────────────────────
  {
    key: "mindfulness",
    label: "Mindfulness",
    unit: "min",
    color: "#32ADE6",
    aggregation: "sum",
    category: "mindfulness",
  },
];

/** Lookup by key */
export const METRIC_MAP = new Map<string, MetricChip>(
  METRIC_CHIPS.map((m) => [m.key, m]),
);

export const DEFAULT_COMPARE_METRICS = ["heart_rate", "steps", "sleep"];

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
