/**
 * Mock Health Data for Demo / Simulator Mode
 *
 * Provides realistic health data when HealthKit is unavailable (simulator, Android, demo).
 * Covers 30 days of data across all metric types so every screen looks populated.
 */

import {
  HealthMetric,
  CategorizedHealthData,
  classifyRange,
  hasDefinedRange,
} from "../types/health-metric";

// ─── helpers ────────────────────────────────────────────────────────────────

let _id = 1;
function id() {
  return `mock-${_id++}`;
}

function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function metric(
  type: HealthMetric["type"],
  category: HealthMetric["category"],
  value: number,
  unit: string,
  timestamp: Date,
  metadata?: Record<string, any>
): HealthMetric {
  const range = hasDefinedRange(type)
    ? classifyRange(type, value)
    : undefined;
  return { id: id(), category, type, value, unit, timestamp, range, metadata };
}

// ─── vitals ─────────────────────────────────────────────────────────────────

function buildHeartRate(): HealthMetric[] {
  const out: HealthMetric[] = [];
  // 30 days of readings, ~8 per day at different times
  for (let day = 29; day >= 0; day--) {
    const readings = [7, 9, 11, 13, 15, 17, 19, 21];
    readings.forEach((hour, i) => {
      // Natural heart rate arc: lower at rest, higher mid-day
      const base = 68 + Math.sin((hour - 6) * 0.3) * 12;
      const jitter = (Math.random() - 0.5) * 10;
      const bpm = Math.round(base + jitter);
      out.push(
        metric(
          "heart_rate",
          "vitals",
          Math.max(55, Math.min(118, bpm)),
          "bpm",
          daysAgo(day, hour, Math.floor(Math.random() * 60))
        )
      );
    });
  }
  return out;
}

function buildRespiratoryRate(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    [2, 8, 14, 20].forEach((hour) => {
      const val = Math.round(14 + (Math.random() - 0.5) * 4);
      out.push(metric("respiratory_rate", "vitals", val, "breaths/min", daysAgo(day, hour)));
    });
  }
  return out;
}

function buildOxygenSaturation(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 14; day >= 0; day--) {
    const val = Math.round(96 + Math.random() * 3);
    out.push(metric("oxygen_saturation", "vitals", val, "%", daysAgo(day, 7)));
  }
  return out;
}

// ─── activity ───────────────────────────────────────────────────────────────

function buildSteps(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    // Steps accumulate through the day; simulate 5 snapshots
    const dailyTarget = 6000 + Math.random() * 5000;
    [8, 11, 13, 16, 20].forEach((hour, i) => {
      const fraction = [0.15, 0.3, 0.45, 0.7, 1.0][i];
      const val = Math.round(dailyTarget * fraction);
      out.push(metric("steps", "activity", val, "steps", daysAgo(day, hour)));
    });
  }
  return out;
}

function buildActiveEnergy(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    const val = Math.round(250 + Math.random() * 350);
    out.push(metric("active_energy", "activity", val, "kcal", daysAgo(day, 20)));
  }
  return out;
}

function buildExerciseMinutes(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    if (day % 2 === 0) {
      // Exercise every other day
      const val = Math.round(25 + Math.random() * 35);
      out.push(metric("exercise_minutes", "activity", val, "min", daysAgo(day, 7, 30)));
    }
  }
  return out;
}

function buildFlightsClimbed(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    const val = Math.round(2 + Math.random() * 6);
    out.push(metric("flights_climbed", "activity", val, "flights", daysAgo(day, 18)));
  }
  return out;
}

// ─── body ────────────────────────────────────────────────────────────────────

function buildWeight(): HealthMetric[] {
  const out: HealthMetric[] = [];
  let w = 172;
  for (let day = 29; day >= 0; day -= 3) {
    w += (Math.random() - 0.5) * 0.6;
    out.push(metric("weight", "body", Math.round(w * 10) / 10, "lbs", daysAgo(day, 7)));
  }
  return out;
}

function buildBodyFat(): HealthMetric[] {
  return [
    metric("body_fat_percentage", "body", 18.5, "%", daysAgo(7, 8)),
  ];
}

// ─── sleep ───────────────────────────────────────────────────────────────────

const SLEEP_STAGES = ["Deep", "Core", "REM", "Awake"] as const;

type SleepStage = (typeof SLEEP_STAGES)[number];

interface SleepSegment {
  stage: SleepStage;
  durationHours: number;
}

function buildOneSleepNight(day: number, bedHour = 23): HealthMetric[] {
  // Realistic sleep architecture: Deep → Core → REM cycles + brief awakenings
  const segments: SleepSegment[] = [
    { stage: "Deep", durationHours: 0.5 + Math.random() * 0.3 },
    { stage: "Core", durationHours: 0.7 + Math.random() * 0.3 },
    { stage: "REM", durationHours: 0.6 + Math.random() * 0.3 },
    { stage: "Deep", durationHours: 0.4 + Math.random() * 0.2 },
    { stage: "Core", durationHours: 0.8 + Math.random() * 0.3 },
    { stage: "Awake", durationHours: 0.08 + Math.random() * 0.1 },
    { stage: "REM", durationHours: 0.7 + Math.random() * 0.3 },
    { stage: "Core", durationHours: 0.5 + Math.random() * 0.2 },
    { stage: "REM", durationHours: 0.5 + Math.random() * 0.4 },
  ];

  const out: HealthMetric[] = [];
  // Sleep starts the night before (day+1 conceptually), ends in the morning of `day`
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - day - 1);
  startDate.setHours(bedHour, Math.floor(Math.random() * 30), 0, 0);

  let cursor = new Date(startDate);
  segments.forEach((seg, i) => {
    out.push(
      metric("sleep", "sleep", seg.durationHours, "hr", new Date(cursor), {
        sleepStage: seg.stage,
        durationMinutes: Math.round(seg.durationHours * 60),
      })
    );
    cursor = new Date(cursor.getTime() + seg.durationHours * 60 * 60 * 1000);
  });

  return out;
}

function buildSleep(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day--) {
    out.push(...buildOneSleepNight(day));
  }
  return out;
}

// ─── mindfulness ─────────────────────────────────────────────────────────────

function buildMindfulness(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 29; day >= 0; day -= 2) {
    const val = Math.round(5 + Math.random() * 15);
    out.push(metric("mindfulness", "mindfulness", val, "min", daysAgo(day, 8, 30)));
  }
  return out;
}

// ─── nutrition ───────────────────────────────────────────────────────────────

function buildNutrition(): HealthMetric[] {
  const out: HealthMetric[] = [];
  for (let day = 14; day >= 0; day--) {
    out.push(metric("dietary_energy", "nutrition", Math.round(1800 + Math.random() * 600), "kcal", daysAgo(day, 20)));
    out.push(metric("water", "nutrition", Math.round(48 + Math.random() * 32), "fl oz", daysAgo(day, 20)));
    out.push(metric("protein", "nutrition", Math.round(80 + Math.random() * 40), "g", daysAgo(day, 20)));
    out.push(metric("carbohydrates", "nutrition", Math.round(200 + Math.random() * 80), "g", daysAgo(day, 20)));
    out.push(metric("fats", "nutrition", Math.round(60 + Math.random() * 30), "g", daysAgo(day, 20)));
  }
  return out;
}

// ─── assemble ────────────────────────────────────────────────────────────────

export function buildMockHealthData(): CategorizedHealthData {
  return {
    vitals: [
      ...buildHeartRate(),
      ...buildRespiratoryRate(),
      ...buildOxygenSaturation(),
    ],
    activity: [
      ...buildSteps(),
      ...buildActiveEnergy(),
      ...buildExerciseMinutes(),
      ...buildFlightsClimbed(),
    ],
    body: [...buildWeight(), ...buildBodyFat()],
    nutrition: buildNutrition(),
    sleep: buildSleep(),
    mindfulness: buildMindfulness(),
  };
}

export const MOCK_PERMISSIONS = {
  heartRate: true,
  bloodPressure: true,
  respiratoryRate: true,
  bodyTemperature: true,
  oxygenSaturation: true,
  bloodGlucose: true,
  steps: true,
  distance: true,
  flightsClimbed: true,
  activeEnergy: true,
  exerciseMinutes: true,
  weight: true,
  height: true,
  bmi: true,
  bodyFatPercentage: true,
  dietaryEnergy: true,
  water: true,
  protein: true,
  carbohydrates: true,
  fats: true,
  sleep: true,
  mindfulness: true,
  allGranted: true,
  categoryStatus: {
    vitals: true,
    activity: true,
    body: true,
    nutrition: true,
    sleep: true,
    mindfulness: true,
  },
};
