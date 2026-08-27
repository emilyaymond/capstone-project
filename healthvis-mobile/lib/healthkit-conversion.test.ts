/**
 * Tests for HealthKit Sample Conversion
 * 
 * These tests verify that convertHealthKitSample works correctly for all metric types
 * and that the helper functions (getUnitForType, classifyRange, hasDefinedRange) are
 * properly integrated.
 */

import { HealthValue } from 'react-native-health';

// Mock react-native-health before importing healthkit-service
jest.mock('react-native-health', () => ({
  initHealthKit: jest.fn(),
  default: {
    initHealthKit: jest.fn(),
  },
}));

import { convertHealthKitSample } from './healthkit-service';
import { HealthMetricType } from '../types/health-metric';
import { getUnitForType, classifyRange, hasDefinedRange } from './metric-registry';

describe('HealthKit Sample Conversion', () => {
  describe('convertHealthKitSample', () => {
    // Test vitals
    it('should convert heart rate sample correctly', () => {
      const sample: HealthValue = {
        value: 75,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.type).toBe('heart_rate');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(75);
      expect(metric.unit).toBe('bpm');
      expect(metric.range).toBe('normal');
      expect(metric.timestamp).toBeInstanceOf(Date);
    });

    it('should convert blood pressure systolic sample correctly', () => {
      const sample: HealthValue = {
        value: 120,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'blood_pressure_systolic');

      expect(metric.type).toBe('blood_pressure_systolic');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(120);
      expect(metric.unit).toBe('mmHg');
      expect(metric.range).toBe('normal');
    });

    it('should convert blood pressure diastolic sample correctly', () => {
      const sample: HealthValue = {
        value: 80,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'blood_pressure_diastolic');

      expect(metric.type).toBe('blood_pressure_diastolic');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(80);
      expect(metric.unit).toBe('mmHg');
      expect(metric.range).toBe('normal');
    });

    it('should convert respiratory rate sample correctly', () => {
      const sample: HealthValue = {
        value: 16,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'respiratory_rate');

      expect(metric.type).toBe('respiratory_rate');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(16);
      expect(metric.unit).toBe('br/min');
      expect(metric.range).toBe('normal');
    });

    it('should convert body temperature sample correctly', () => {
      const sample: HealthValue = {
        value: 98.6,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'body_temperature');

      expect(metric.type).toBe('body_temperature');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(98.6);
      expect(metric.unit).toBe('°F');
      expect(metric.range).toBe('normal');
    });

    it('should convert oxygen saturation sample correctly', () => {
      const sample: HealthValue = {
        value: 98,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'oxygen_saturation');

      expect(metric.type).toBe('oxygen_saturation');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(98);
      expect(metric.unit).toBe('%');
      expect(metric.range).toBe('normal');
    });

    it('should convert blood glucose sample correctly', () => {
      const sample: HealthValue = {
        value: 95,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'blood_glucose');

      expect(metric.type).toBe('blood_glucose');
      expect(metric.category).toBe('vitals');
      expect(metric.value).toBe(95);
      expect(metric.unit).toBe('mg/dL');
      expect(metric.range).toBe('normal');
    });

    // Test activity metrics
    it('should convert steps sample correctly', () => {
      const sample: HealthValue = {
        value: 10000,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'steps');

      expect(metric.type).toBe('steps');
      expect(metric.category).toBe('activity');
      expect(metric.value).toBe(10000);
      expect(metric.unit).toBe('steps');
      expect(metric.range).toBeUndefined(); // Steps don't have a defined range
    });

    it('should convert distance sample correctly', () => {
      const sample: HealthValue = {
        value: 5.2,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'distance');

      expect(metric.type).toBe('distance');
      expect(metric.category).toBe('activity');
      expect(metric.value).toBe(5.2);
      expect(metric.unit).toBe('mi');
      expect(metric.range).toBeUndefined();
    });

    it('should convert flights climbed sample correctly', () => {
      const sample: HealthValue = {
        value: 12,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'flights_climbed');

      expect(metric.type).toBe('flights_climbed');
      expect(metric.category).toBe('activity');
      expect(metric.value).toBe(12);
      expect(metric.unit).toBe('flights');
      expect(metric.range).toBeUndefined();
    });

    it('should convert active energy sample correctly', () => {
      const sample: HealthValue = {
        value: 450,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'active_energy');

      expect(metric.type).toBe('active_energy');
      expect(metric.category).toBe('activity');
      expect(metric.value).toBe(450);
      expect(metric.unit).toBe('kcal');
      expect(metric.range).toBeUndefined();
    });

    it('should convert exercise minutes sample correctly', () => {
      const sample: HealthValue = {
        value: 30,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:30:00Z',
      };

      const metric = convertHealthKitSample(sample, 'exercise_minutes');

      expect(metric.type).toBe('exercise_minutes');
      expect(metric.category).toBe('activity');
      expect(metric.value).toBe(30);
      expect(metric.unit).toBe('min');
      expect(metric.range).toBeUndefined();
    });

    // Test body measurements
    it('should convert weight sample correctly', () => {
      const sample: HealthValue = {
        value: 165,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'weight');

      expect(metric.type).toBe('weight');
      expect(metric.category).toBe('body');
      expect(metric.value).toBe(165);
      expect(metric.unit).toBe('lbs');
      expect(metric.range).toBeUndefined();
    });

    it('should convert height sample correctly', () => {
      const sample: HealthValue = {
        value: 70,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'height');

      expect(metric.type).toBe('height');
      expect(metric.category).toBe('body');
      expect(metric.value).toBe(70);
      expect(metric.unit).toBe('in');
      expect(metric.range).toBeUndefined();
    });

    it('should convert BMI sample correctly', () => {
      const sample: HealthValue = {
        value: 22.5,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'bmi');

      expect(metric.type).toBe('bmi');
      expect(metric.category).toBe('body');
      expect(metric.value).toBe(22.5);
      expect(metric.unit).toBe('kg/m²');
      expect(metric.range).toBe('normal');
    });

    it('should convert body fat percentage sample correctly', () => {
      const sample: HealthValue = {
        value: 18,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'body_fat_percentage');

      expect(metric.type).toBe('body_fat_percentage');
      expect(metric.category).toBe('body');
      expect(metric.value).toBe(18);
      expect(metric.unit).toBe('%');
      expect(metric.range).toBe('normal');
    });

    // Test nutrition metrics
    it('should convert dietary energy sample correctly', () => {
      const sample: HealthValue = {
        value: 2000,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'dietary_energy');

      expect(metric.type).toBe('dietary_energy');
      expect(metric.category).toBe('nutrition');
      expect(metric.value).toBe(2000);
      expect(metric.unit).toBe('kcal');
      expect(metric.range).toBeUndefined();
    });

    it('should convert water sample correctly', () => {
      const sample: HealthValue = {
        value: 64,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'water');

      expect(metric.type).toBe('water');
      expect(metric.category).toBe('nutrition');
      expect(metric.value).toBe(64);
      expect(metric.unit).toBe('fl oz');
      expect(metric.range).toBeUndefined();
    });

    it('should convert protein sample correctly', () => {
      const sample: HealthValue = {
        value: 75,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'protein');

      expect(metric.type).toBe('protein');
      expect(metric.category).toBe('nutrition');
      expect(metric.value).toBe(75);
      expect(metric.unit).toBe('g');
      expect(metric.range).toBeUndefined();
    });

    it('should convert carbohydrates sample correctly', () => {
      const sample: HealthValue = {
        value: 250,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'carbohydrates');

      expect(metric.type).toBe('carbohydrates');
      expect(metric.category).toBe('nutrition');
      expect(metric.value).toBe(250);
      expect(metric.unit).toBe('g');
      expect(metric.range).toBeUndefined();
    });

    it('should convert fats sample correctly', () => {
      const sample: HealthValue = {
        value: 65,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'fats');

      expect(metric.type).toBe('fats');
      expect(metric.category).toBe('nutrition');
      expect(metric.value).toBe(65);
      expect(metric.unit).toBe('g');
      expect(metric.range).toBeUndefined();
    });

    // Test sleep and mindfulness
    it('should convert sleep sample correctly', () => {
      const sample: HealthValue = {
        value: 7.5,
        startDate: '2024-01-14T22:00:00Z',
        endDate: '2024-01-15T05:30:00Z',
      };

      const metric = convertHealthKitSample(sample, 'sleep');

      expect(metric.type).toBe('sleep');
      expect(metric.category).toBe('sleep');
      expect(metric.value).toBe(7.5);
      expect(metric.unit).toBe('hr');
      expect(metric.range).toBeUndefined();
    });

    it('should convert mindfulness sample correctly', () => {
      const sample: HealthValue = {
        value: 15,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:15:00Z',
      };

      const metric = convertHealthKitSample(sample, 'mindfulness');

      expect(metric.type).toBe('mindfulness');
      expect(metric.category).toBe('mindfulness');
      expect(metric.value).toBe(15);
      expect(metric.unit).toBe('min');
      expect(metric.range).toBeUndefined();
    });

    // Test range classification integration
    // NORMAL_RANGES.heart_rate is 40-120 bpm, deliberately wider than the
    // clinical resting range of 60-100. HealthKit samples include exercise
    // heart rate, and the app cannot yet tell resting from active, so a
    // narrower band would fire warning haptics through every workout.
    it('should classify warning range correctly', () => {
      const sample: HealthValue = {
        value: 130, // Above normal max (120) but within the 20% danger margin
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.range).toBe('warning');
    });

    it('should classify danger range correctly', () => {
      const sample: HealthValue = {
        value: 160, // More than 20% above the normal max (120 * 1.2 = 144)
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.range).toBe('danger');
    });

    it('should classify a value inside the normal band as normal', () => {
      const sample: HealthValue = {
        value: 55, // Athlete resting heart rate: inside 40-120, not a warning
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.range).toBe('normal');
    });

    // Test metadata preservation
    it('should preserve metadata from HealthKit sample', () => {
      const sample: HealthValue = {
        value: 75,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
        metadata: {
          device: 'Apple Watch',
          source: 'HealthKit',
        },
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.metadata).toBeDefined();
      expect(metric.metadata?.device).toBe('Apple Watch');
      expect(metric.metadata?.source).toBe('HealthKit');
    });

    // Test ID generation
    it('should generate unique IDs based on type and timestamp', () => {
      const sample1: HealthValue = {
        value: 75,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const sample2: HealthValue = {
        value: 76,
        startDate: '2024-01-15T11:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      const metric1 = convertHealthKitSample(sample1, 'heart_rate');
      const metric2 = convertHealthKitSample(sample2, 'heart_rate');

      expect(metric1.id).not.toBe(metric2.id);
      expect(metric1.id).toContain('heart_rate');
      expect(metric2.id).toContain('heart_rate');
    });

    // Test string value conversion
    it('should handle string values by converting to number', () => {
      const sample: HealthValue = {
        value: '75' as any, // Some HealthKit samples might return strings
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.value).toBe(75);
      expect(typeof metric.value).toBe('number');
    });
  });

  describe('Integration with helper functions', () => {
    it('should use getUnitForType for all metric types', () => {
      const allTypes: HealthMetricType[] = [
        'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
        'respiratory_rate', 'body_temperature', 'oxygen_saturation', 'blood_glucose',
        'steps', 'distance', 'flights_climbed', 'active_energy', 'exercise_minutes',
        'weight', 'height', 'bmi', 'body_fat_percentage',
        'dietary_energy', 'water', 'protein', 'carbohydrates', 'fats',
        'sleep', 'mindfulness',
      ];

      allTypes.forEach(type => {
        const unit = getUnitForType(type);
        expect(unit).toBeDefined();
        expect(typeof unit).toBe('string');
        expect(unit.length).toBeGreaterThan(0);
      });
    });

    it('should use hasDefinedRange correctly', () => {
      // Metrics with defined ranges
      expect(hasDefinedRange('heart_rate')).toBe(true);
      expect(hasDefinedRange('blood_glucose')).toBe(true);
      expect(hasDefinedRange('bmi')).toBe(true);

      // Metrics without defined ranges
      expect(hasDefinedRange('steps')).toBe(false);
      expect(hasDefinedRange('water')).toBe(false);
      expect(hasDefinedRange('sleep')).toBe(false);
    });

    it('should use classifyRange only for metrics with defined ranges', () => {
      const sample: HealthValue = {
        value: 10000,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      const metric = convertHealthKitSample(sample, 'steps');

      // Steps don't have a defined range, so range should be undefined
      expect(metric.range).toBeUndefined();
    });
  });
});

describe('Sleep stage mapping', () => {
  // react-native-health reports the short forms on device. Only the ASLEEP_*
  // spellings were mapped, so CORE/DEEP/REM fell through unmapped.
  const { getSleepStageColor } = require('./sleep-utils');

  it('colours deep sleep purple regardless of case', () => {
    expect(getSleepStageColor('Deep Sleep')).toBe('#5856D6');
    expect(getSleepStageColor('DEEP')).toBe('#5856D6');
  });

  it('colours light sleep green for both spellings', () => {
    expect(getSleepStageColor('Light Sleep')).toBe('#34C759');
    expect(getSleepStageColor('CORE')).toBe('#34C759');
  });

  it('colours REM blue regardless of case', () => {
    expect(getSleepStageColor('REM Sleep')).toBe('#007AFF');
    expect(getSleepStageColor('rem')).toBe('#007AFF');
  });

  it('colours awake orange regardless of case', () => {
    expect(getSleepStageColor('Awake')).toBe('#FF9500');
    expect(getSleepStageColor('AWAKE')).toBe('#FF9500');
  });

  it('colours in-bed grey for both spellings', () => {
    expect(getSleepStageColor('In Bed')).toBe('#8E8E93');
    expect(getSleepStageColor('INBED')).toBe('#8E8E93');
  });
});

describe('Sleep quality across ranges', () => {
  const { calculateSleepQuality } = require('./sleep-utils');

  /** One night's worth of stages, scaled across `nights`. */
  function breakdownFor(nights: number) {
    return {
      lightSleep: 3.94 * nights,
      deepSleep: 0.6 * nights,
      remSleep: 1.72 * nights,
      awake: 0.22 * nights,
      inBed: 0,
      totalSleep: 6.26 * nights,
      totalInBed: 6.48 * nights,
    };
  }

  it('judges a single night on its own hours', () => {
    expect(calculateSleepQuality(breakdownFor(1), 1)).toBe('fair');
  });

  it('gives the same verdict for a month of identical nights', () => {
    // Duration thresholds describe one night. Passing a month's total without
    // the night count failed every band and fell through to "poor".
    expect(calculateSleepQuality(breakdownFor(30), 30)).toBe('fair');
  });

  it('is consistent across every range length', () => {
    const verdicts = [1, 7, 30, 180, 365].map((n) =>
      calculateSleepQuality(breakdownFor(n), n),
    );
    expect(new Set(verdicts).size).toBe(1);
  });

  it('still reports poor for genuinely poor sleep', () => {
    const poor = {
      lightSleep: 2,
      deepSleep: 0,
      remSleep: 0,
      awake: 3,
      inBed: 0,
      totalSleep: 2,
      totalInBed: 5,
    };
    expect(calculateSleepQuality(poor, 1)).toBe('poor');
  });

  it('defaults to a single night when no count is given', () => {
    expect(calculateSleepQuality(breakdownFor(1))).toBe('fair');
  });

  it('treats a zero night count as one rather than dividing by zero', () => {
    expect(calculateSleepQuality(breakdownFor(1), 0)).toBe('fair');
  });
});

describe('Sleep night boundary', () => {
  const { filterSleepForRange, getSleepSessionEnd } = require('./sleep-utils');

  /** A sleep session starting at a given hour, lasting `hours`. */
  function session(startHour: number, hours: number, dayOffset = 0) {
    const start = new Date(2026, 7, 27 + dayOffset, startHour, 0, 0);
    return {
      id: `sleep-${dayOffset}-${startHour}`,
      category: 'sleep' as const,
      type: 'sleep' as const,
      value: hours,
      timestamp: start,
      unit: 'hr',
      metadata: { durationMinutes: hours * 60, sleepStage: 'Light Sleep' },
    };
  }

  it('derives the session end from start plus duration', () => {
    const end = getSleepSessionEnd(session(22, 8));
    expect(end.getDate()).toBe(28);
    expect(end.getHours()).toBe(6);
  });

  it('includes a night that began before midnight', () => {
    // The reason this exists: going to bed at 22:00 previously put most of the
    // night in the previous day, so "today" showed only the hours after 12am.
    const midnightToday = new Date(2026, 7, 28, 0, 0, 0);
    const lastNight = session(22, 8); // 22:00 the 27th -> 06:00 the 28th

    expect(filterSleepForRange([lastNight], midnightToday)).toHaveLength(1);
  });

  it('excludes a night that ended before the range started', () => {
    const midnightToday = new Date(2026, 7, 28, 0, 0, 0);
    const twoNightsAgo = session(22, 8, -2); // ends 06:00 on the 26th

    expect(filterSleepForRange([twoNightsAgo], midnightToday)).toHaveLength(0);
  });

  it('keeps an afternoon nap on the day it happened', () => {
    const midnightToday = new Date(2026, 7, 27, 0, 0, 0);
    const nap = session(15, 1);

    expect(filterSleepForRange([nap], midnightToday)).toHaveLength(1);
  });
});

describe('Sleep quality with no data', () => {
  const { calculateSleepQuality } = require('./sleep-utils');

  const empty = {
    lightSleep: 0,
    deepSleep: 0,
    remSleep: 0,
    awake: 0,
    inBed: 0,
    totalSleep: 0,
    totalInBed: 0,
  };

  it('reports unknown rather than poor when nothing was recorded', () => {
    // A night the user did not wear their watch is an absence of data, not
    // bad sleep. This previously fell through to the catch-all and read "Poor".
    expect(calculateSleepQuality(empty, 1)).toBe('unknown');
  });

  it('reports unknown across any range length', () => {
    expect(calculateSleepQuality(empty, 30)).toBe('unknown');
  });

  it('still judges a night with only a little sleep', () => {
    const barely = { ...empty, lightSleep: 1, totalSleep: 1, totalInBed: 1 };
    expect(calculateSleepQuality(barely, 1)).toBe('poor');
  });
});

describe('Counting nights with sleep data', () => {
  const { countSleepNights } = require('./sleep-utils');

  /** A session on a given day, ending the following morning. */
  function night(day: number) {
    return {
      id: `night-${day}`,
      category: 'sleep' as const,
      type: 'sleep' as const,
      value: 8,
      timestamp: new Date(2026, 7, day, 22, 0, 0),
      unit: 'hr',
      metadata: { durationMinutes: 480, sleepStage: 'Light Sleep' },
    };
  }

  it('counts nothing when there is no data', () => {
    expect(countSleepNights([])).toBe(0);
  });

  it('counts each night once however many stage records it has', () => {
    // A single night arrives as many stage samples; it is still one night.
    const oneNight = [night(1), night(1), night(1)];
    expect(countSleepNights(oneNight)).toBe(1);
  });

  it('counts only nights that were recorded, not calendar nights', () => {
    // Three nights recorded inside a month-long range. Averages must divide by
    // three, not thirty, or every per-night figure is understated.
    const recorded = [night(1), night(5), night(20)];
    expect(countSleepNights(recorded)).toBe(3);
  });

  it('groups a session by the day it ends on', () => {
    // 22:00 on the 1st ends on the 2nd, so it is the 2nd's night -- the same
    // rule the range filter uses.
    expect(countSleepNights([night(1), night(2)])).toBe(2);
  });
});
