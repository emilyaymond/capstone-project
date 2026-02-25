/**
 * Tests for HealthKit Sample Conversion
 * 
 * These tests verify that convertHealthKitSample works correctly for all metric types
 * and that the helper functions (getUnitForType, classifyRange, hasDefinedRange) are
 * properly integrated.
 */

import { describe, it, expect, jest } from '@jest/globals';
import { HealthValue } from 'react-native-health';

// Mock react-native-health before importing healthkit-service
jest.mock('react-native-health', () => ({
  initHealthKit: jest.fn(),
  default: {
    initHealthKit: jest.fn(),
  },
}));

import { convertHealthKitSample } from './healthkit-service';
import { HealthMetricType, getUnitForType, classifyRange, hasDefinedRange } from '../types/health-metric';

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
      expect(metric.unit).toBe('breaths/min');
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
      expect(metric.unit).toBe('hours');
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
    it('should classify warning range correctly', () => {
      const sample: HealthValue = {
        value: 55, // Below normal range for heart rate
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.range).toBe('warning');
    });

    it('should classify danger range correctly', () => {
      const sample: HealthValue = {
        value: 45, // Significantly below normal range for heart rate
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T10:00:00Z',
      };

      const metric = convertHealthKitSample(sample, 'heart_rate');

      expect(metric.range).toBe('danger');
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
