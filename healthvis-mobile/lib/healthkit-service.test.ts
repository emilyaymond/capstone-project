/**
 * Tests for HealthKit Service Module
 * 
 * These tests verify the permission management and data fetching functionality
 * of the HealthKit service.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import AppleHealthKit from 'react-native-health';
import {
  healthKitService,
  buildPermissions,
  createDefaultPermissionStatus,
  HEALTHKIT_TYPES,
} from './healthkit-service';

// Mock react-native-health
jest.mock('react-native-health', () => ({
  initHealthKit: jest.fn(),
  getHeartRateSamples: jest.fn(),
  getBloodPressureSamples: jest.fn(),
  getRespiratoryRateSamples: jest.fn(),
  getBodyTemperatureSamples: jest.fn(),
  getOxygenSaturationSamples: jest.fn(),
  getBloodGlucoseSamples: jest.fn(),
  getStepCount: jest.fn(),
  getDistanceWalkingRunning: jest.fn(),
  getFlightsClimbed: jest.fn(),
  getActiveEnergyBurned: jest.fn(),
  getAppleExerciseTime: jest.fn(),
  getWeightSamples: jest.fn(),
  getHeightSamples: jest.fn(),
  getLatestBmi: jest.fn(),
  getBodyFatPercentageSamples: jest.fn(),
  getWaterSamples: jest.fn(),
  getProteinSamples: jest.fn(),
  getCarbohydratesSamples: jest.fn(),
  getSleepSamples: jest.fn(),
  default: {
    initHealthKit: jest.fn(),
    getHeartRateSamples: jest.fn(),
    getBloodPressureSamples: jest.fn(),
    getRespiratoryRateSamples: jest.fn(),
    getBodyTemperatureSamples: jest.fn(),
    getOxygenSaturationSamples: jest.fn(),
    getBloodGlucoseSamples: jest.fn(),
    getStepCount: jest.fn(),
    getDistanceWalkingRunning: jest.fn(),
    getFlightsClimbed: jest.fn(),
    getActiveEnergyBurned: jest.fn(),
    getAppleExerciseTime: jest.fn(),
    getWeightSamples: jest.fn(),
    getHeightSamples: jest.fn(),
    getLatestBmi: jest.fn(),
    getBodyFatPercentageSamples: jest.fn(),
    getWaterSamples: jest.fn(),
    getProteinSamples: jest.fn(),
    getCarbohydratesSamples: jest.fn(),
    getSleepSamples: jest.fn(),
  },
}));

describe('HealthKit Service - Permission Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildPermissions', () => {
    it('should include all required data types in read permissions', () => {
      const permissions = buildPermissions();
      
      expect(permissions.permissions.read).toBeDefined();
      expect(permissions.permissions.read.length).toBeGreaterThan(0);
      
      // Verify vitals are included
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.HEART_RATE);
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.BLOOD_GLUCOSE);
      
      // Verify activity metrics are included
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.STEPS);
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.DISTANCE);
      
      // Verify body measurements are included
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.WEIGHT);
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.HEIGHT);
      
      // Verify nutrition is included
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.WATER);
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.PROTEIN);
      
      // Verify sleep and mindfulness are included
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.SLEEP);
      expect(permissions.permissions.read).toContain(HEALTHKIT_TYPES.MINDFULNESS);
    });

    it('should not request write permissions', () => {
      const permissions = buildPermissions();
      
      expect(permissions.permissions.write).toBeDefined();
      expect(permissions.permissions.write).toHaveLength(0);
    });
  });

  describe('createDefaultPermissionStatus', () => {
    it('should create a status with all permissions denied', () => {
      const status = createDefaultPermissionStatus();
      
      // Check vitals
      expect(status.heartRate).toBe(false);
      expect(status.bloodPressure).toBe(false);
      expect(status.bloodGlucose).toBe(false);
      
      // Check activity
      expect(status.steps).toBe(false);
      expect(status.distance).toBe(false);
      
      // Check body
      expect(status.weight).toBe(false);
      expect(status.height).toBe(false);
      
      // Check nutrition
      expect(status.water).toBe(false);
      expect(status.protein).toBe(false);
      
      // Check sleep and mindfulness
      expect(status.sleep).toBe(false);
      expect(status.mindfulness).toBe(false);
      
      // Check summary
      expect(status.allGranted).toBe(false);
      expect(status.categoryStatus.vitals).toBe(false);
      expect(status.categoryStatus.activity).toBe(false);
      expect(status.categoryStatus.body).toBe(false);
      expect(status.categoryStatus.nutrition).toBe(false);
      expect(status.categoryStatus.sleep).toBe(false);
      expect(status.categoryStatus.mindfulness).toBe(false);
    });
  });

  describe('initializeHealthKit', () => {
    it('should initialize HealthKit with all permissions', async () => {
      // Mock successful initialization
      (AppleHealthKit.initHealthKit as jest.Mock).mockImplementation(
        (permissions: any, callback: (error: string) => void) => {
          callback(''); // Empty string means success
        }
      );

      // Mock all permission checks to return granted
      const mockSuccess = (options: any, callback: (err: string, results: any) => void) => {
        callback('', []);
      };

      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(mockSuccess);

      const status = await healthKitService.initializeHealthKit();
      
      expect(AppleHealthKit.initHealthKit).toHaveBeenCalledTimes(1);
      expect(status).toBeDefined();
      expect(status.heartRate).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock failed initialization
      (AppleHealthKit.initHealthKit as jest.Mock).mockImplementation(
        (permissions: any, callback: (error: string) => void) => {
          callback('HealthKit not available');
        }
      );

      const status = await healthKitService.initializeHealthKit();
      
      expect(status).toBeDefined();
      expect(status.allGranted).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should check all permission types', async () => {
      // Mock all permission checks to return granted
      const mockSuccess = (options: any, callback: (err: string, results: any) => void) => {
        callback('', []);
      };

      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(mockSuccess);

      const status = await healthKitService.checkPermissions();
      
      expect(status).toBeDefined();
      expect(AppleHealthKit.getHeartRateSamples).toHaveBeenCalled();
      expect(AppleHealthKit.getBloodPressureSamples).toHaveBeenCalled();
      expect(AppleHealthKit.getStepCount).toHaveBeenCalled();
      expect(AppleHealthKit.getWeightSamples).toHaveBeenCalled();
    });

    it('should correctly calculate category status', async () => {
      // Mock some permissions granted, some denied
      const mockSuccess = (options: any, callback: (err: string, results: any) => void) => {
        callback('', []);
      };
      
      const mockDenied = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', undefined);
      };

      // Grant vitals
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockDenied);
      
      // Grant activity
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockSuccess);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockDenied);
      
      // Deny body
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockDenied);
      
      // Deny nutrition
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockDenied);
      
      // Deny sleep
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(mockDenied);

      const status = await healthKitService.checkPermissions();
      
      // Vitals should be granted (heart rate is granted)
      expect(status.categoryStatus.vitals).toBe(true);
      
      // Activity should be granted (steps is granted)
      expect(status.categoryStatus.activity).toBe(true);
      
      // Body should be denied (all body metrics denied)
      expect(status.categoryStatus.body).toBe(false);
      
      // Nutrition should be denied (all nutrition metrics denied)
      expect(status.categoryStatus.nutrition).toBe(false);
    });

    it('should handle permission denials', async () => {
      // Mock all permissions denied
      const mockDenied = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', undefined);
      };

      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockDenied);
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(mockDenied);

      const status = await healthKitService.checkPermissions();
      
      expect(status.heartRate).toBe(false);
      expect(status.bloodPressure).toBe(false);
      expect(status.steps).toBe(false);
    });
  });
});

describe('HealthKit Service - Vital Signs Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFetchOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    limit: 100,
  };

  describe('fetchHeartRate', () => {
    it('should fetch heart rate samples successfully', async () => {
      const mockSamples = [
        { value: 72, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
        { value: 68, startDate: '2024-01-15T11:00:00Z', endDate: '2024-01-15T11:00:00Z' },
      ];

      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchHeartRate(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('heart_rate');
      expect(results[0].category).toBe('vitals');
      expect(results[0].value).toBe(72);
      expect(results[0].unit).toBe('bpm');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchHeartRate(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array when no data available', async () => {
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchHeartRate(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchBloodPressure', () => {
    it('should fetch blood pressure samples and split into systolic/diastolic', async () => {
      const mockSamples = [
        {
          bloodPressureSystolicValue: 120,
          bloodPressureDiastolicValue: 80,
          startDate: '2024-01-15T10:00:00Z',
          endDate: '2024-01-15T10:00:00Z',
        },
        {
          bloodPressureSystolicValue: 118,
          bloodPressureDiastolicValue: 78,
          startDate: '2024-01-15T11:00:00Z',
          endDate: '2024-01-15T11:00:00Z',
        },
      ];

      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchBloodPressure(mockFetchOptions);

      // Should have 4 metrics: 2 systolic + 2 diastolic
      expect(results).toHaveLength(4);
      
      const systolic = results.filter(m => m.type === 'blood_pressure_systolic');
      const diastolic = results.filter(m => m.type === 'blood_pressure_diastolic');
      
      expect(systolic).toHaveLength(2);
      expect(diastolic).toHaveLength(2);
      expect(systolic[0].value).toBe(120);
      expect(diastolic[0].value).toBe(80);
    });

    it('should handle samples with only systolic value', async () => {
      const mockSamples = [
        {
          bloodPressureSystolicValue: 120,
          startDate: '2024-01-15T10:00:00Z',
          endDate: '2024-01-15T10:00:00Z',
        },
      ];

      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchBloodPressure(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('blood_pressure_systolic');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchBloodPressure(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchRespiratoryRate', () => {
    it('should fetch respiratory rate samples successfully', async () => {
      const mockSamples = [
        { value: 16, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
      ];

      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchRespiratoryRate(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('respiratory_rate');
      expect(results[0].value).toBe(16);
      expect(results[0].unit).toBe('breaths/min');
    });
  });

  describe('fetchBodyTemperature', () => {
    it('should fetch body temperature samples successfully', async () => {
      const mockSamples = [
        { value: 98.6, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
      ];

      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchBodyTemperature(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('body_temperature');
      expect(results[0].value).toBe(98.6);
      expect(results[0].unit).toBe('°F');
    });
  });

  describe('fetchOxygenSaturation', () => {
    it('should fetch oxygen saturation samples successfully', async () => {
      const mockSamples = [
        { value: 98, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
      ];

      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchOxygenSaturation(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('oxygen_saturation');
      expect(results[0].value).toBe(98);
      expect(results[0].unit).toBe('%');
    });
  });

  describe('fetchBloodGlucose', () => {
    it('should fetch blood glucose samples successfully', async () => {
      const mockSamples = [
        { value: 95, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
      ];

      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchBloodGlucose(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('blood_glucose');
      expect(results[0].value).toBe(95);
      expect(results[0].unit).toBe('mg/dL');
    });
  });

  describe('fetchAllVitals', () => {
    it('should fetch all vital signs in parallel and combine results', async () => {
      // Mock all vital sign fetchers
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 72, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );

      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{
            bloodPressureSystolicValue: 120,
            bloodPressureDiastolicValue: 80,
            startDate: '2024-01-15T11:00:00Z',
            endDate: '2024-01-15T11:00:00Z',
          }]);
        }
      );

      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 16, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 98, startDate: '2024-01-15T13:00:00Z', endDate: '2024-01-15T13:00:00Z' }]);
        }
      );

      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchAllVitals(mockFetchOptions);

      // Should have: 1 heart rate + 2 blood pressure (systolic + diastolic) + 1 respiratory + 1 oxygen = 5 metrics
      expect(results.length).toBeGreaterThan(0);
      
      // Verify all categories are vitals
      results.forEach(metric => {
        expect(metric.category).toBe('vitals');
      });

      // Verify results are sorted by timestamp (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp.getTime()).toBeGreaterThanOrEqual(results[i + 1].timestamp.getTime());
      }
    });

    it('should continue fetching even if one vital type fails', async () => {
      // Mock some success, some failures
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 72, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );

      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 98, startDate: '2024-01-15T13:00:00Z', endDate: '2024-01-15T13:00:00Z' }]);
        }
      );

      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchAllVitals(mockFetchOptions);

      // Should have heart rate and oxygen saturation
      expect(results.length).toBe(2);
      expect(results.some(m => m.type === 'heart_rate')).toBe(true);
      expect(results.some(m => m.type === 'oxygen_saturation')).toBe(true);
    });

    it('should return empty array if all fetches fail', async () => {
      const mockError = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', null);
      };

      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockError);

      const results = await healthKitService.fetchAllVitals(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });
});

describe('HealthKit Service - Activity Metrics Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFetchOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    limit: 100,
  };

  describe('fetchSteps', () => {
    it('should fetch step count successfully', async () => {
      const mockResult = {
        value: 10000,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchSteps(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('steps');
      expect(results[0].category).toBe('activity');
      expect(results[0].value).toBe(10000);
      expect(results[0].unit).toBe('steps');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchSteps(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchDistance', () => {
    it('should fetch distance samples successfully', async () => {
      const mockResult = {
        value: 5.2,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchDistance(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('distance');
      expect(results[0].category).toBe('activity');
      expect(results[0].value).toBe(5.2);
      expect(results[0].unit).toBe('mi');
    });
  });

  describe('fetchFlightsClimbed', () => {
    it('should fetch flights climbed samples successfully', async () => {
      const mockResult = {
        value: 10,
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T11:00:00Z',
      };

      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchFlightsClimbed(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('flights_climbed');
      expect(results[0].value).toBe(10);
      expect(results[0].unit).toBe('flights');
    });
  });

  describe('fetchActiveEnergy', () => {
    it('should fetch active energy burned successfully', async () => {
      const mockResult = {
        value: 450,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchActiveEnergy(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('active_energy');
      expect(results[0].value).toBe(450);
      expect(results[0].unit).toBe('kcal');
    });
  });

  describe('fetchExerciseMinutes', () => {
    it('should fetch exercise minutes successfully', async () => {
      const mockResult = {
        value: 45,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-15T23:59:59Z',
      };

      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchExerciseMinutes(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('exercise_minutes');
      expect(results[0].value).toBe(45);
      expect(results[0].unit).toBe('min');
    });
  });

  describe('fetchAllActivity', () => {
    it('should fetch all activity metrics in parallel and combine results', async () => {
      // Mock all activity fetchers
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 10000, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 5.2, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T11:00:00Z' });
        }
      );

      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 10, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T13:00:00Z' });
        }
      );

      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 450, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 45, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      const results = await healthKitService.fetchAllActivity(mockFetchOptions);

      // Should have: 1 steps + 1 distance + 1 flights + 1 active energy + 1 exercise = 5 metrics
      expect(results.length).toBe(5);
      
      // Verify all categories are activity
      results.forEach(metric => {
        expect(metric.category).toBe('activity');
      });

      // Verify results are sorted by timestamp (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp.getTime()).toBeGreaterThanOrEqual(results[i + 1].timestamp.getTime());
      }
    });

    it('should continue fetching even if one activity type fails', async () => {
      // Mock some success, some failures
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 10000, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 450, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      const results = await healthKitService.fetchAllActivity(mockFetchOptions);

      // Should have steps, flights (0), active energy, and exercise (0)
      expect(results.length).toBe(4);
      expect(results.some(m => m.type === 'steps')).toBe(true);
      expect(results.some(m => m.type === 'active_energy')).toBe(true);
      expect(results.some(m => m.type === 'flights_climbed')).toBe(true);
      expect(results.some(m => m.type === 'exercise_minutes')).toBe(true);
    });
  });
});

describe('HealthKit Service - Body Measurements Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFetchOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    limit: 100,
  };

  describe('fetchWeight', () => {
    it('should fetch weight samples successfully', async () => {
      const mockSamples = [
        { value: 70.5, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' },
        { value: 70.3, startDate: '2024-01-20T08:00:00Z', endDate: '2024-01-20T08:00:00Z' },
      ];

      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchWeight(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('weight');
      expect(results[0].category).toBe('body');
      expect(results[0].value).toBe(70.5);
      expect(results[0].unit).toBe('lbs');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchWeight(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array when no data available', async () => {
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchWeight(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchHeight', () => {
    it('should fetch height samples successfully', async () => {
      const mockSamples = [
        { value: 175, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' },
      ];

      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchHeight(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('height');
      expect(results[0].category).toBe('body');
      expect(results[0].value).toBe(175);
      expect(results[0].unit).toBe('in');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchHeight(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchBMI', () => {
    it('should fetch BMI successfully', async () => {
      const mockResult = {
        value: 23.0,
        startDate: '2024-01-15T08:00:00Z',
        endDate: '2024-01-15T08:00:00Z',
      };

      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockResult);
        }
      );

      const results = await healthKitService.fetchBMI(mockFetchOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('bmi');
      expect(results[0].category).toBe('body');
      expect(results[0].value).toBe(23.0);
      expect(results[0].unit).toBe('kg/m²');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchBMI(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array when no data available', async () => {
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', null);
        }
      );

      const results = await healthKitService.fetchBMI(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchBodyFatPercentage', () => {
    it('should fetch body fat percentage samples successfully', async () => {
      const mockSamples = [
        { value: 18.5, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' },
        { value: 18.2, startDate: '2024-01-20T08:00:00Z', endDate: '2024-01-20T08:00:00Z' },
      ];

      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchBodyFatPercentage(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('body_fat_percentage');
      expect(results[0].category).toBe('body');
      expect(results[0].value).toBe(18.5);
      expect(results[0].unit).toBe('%');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchBodyFatPercentage(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchAllBody', () => {
    it('should fetch all body measurements in parallel and combine results', async () => {
      // Mock all body measurement fetchers
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 70.5, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );

      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 175, startDate: '2024-01-10T08:00:00Z', endDate: '2024-01-10T08:00:00Z' }]);
        }
      );

      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 23.0, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' });
        }
      );

      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 18.5, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );

      const results = await healthKitService.fetchAllBody(mockFetchOptions);

      // Should have: 1 weight + 1 height + 1 BMI + 1 body fat = 4 metrics
      expect(results.length).toBe(4);
      
      // Verify all categories are body
      results.forEach(metric => {
        expect(metric.category).toBe('body');
      });

      // Verify results are sorted by timestamp (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp.getTime()).toBeGreaterThanOrEqual(results[i + 1].timestamp.getTime());
      }

      // Verify all expected types are present
      expect(results.some(m => m.type === 'weight')).toBe(true);
      expect(results.some(m => m.type === 'height')).toBe(true);
      expect(results.some(m => m.type === 'bmi')).toBe(true);
      expect(results.some(m => m.type === 'body_fat_percentage')).toBe(true);
    });

    it('should continue fetching even if one body measurement type fails', async () => {
      // Mock some success, some failures
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 70.5, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );

      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 23.0, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' });
        }
      );

      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchAllBody(mockFetchOptions);

      // Should have weight and BMI
      expect(results.length).toBe(2);
      expect(results.some(m => m.type === 'weight')).toBe(true);
      expect(results.some(m => m.type === 'bmi')).toBe(true);
    });

    it('should return empty array if all fetches fail', async () => {
      const mockError = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', null);
      };

      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockError);

      const results = await healthKitService.fetchAllBody(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });
});

describe('HealthKit Service - Nutrition Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFetchOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    limit: 100,
  };

  describe('fetchDietaryEnergy', () => {
    it('should fetch dietary energy samples successfully if method is available', async () => {
      const mockSamples = [
        { value: 2000, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' },
        { value: 1800, startDate: '2024-01-16T12:00:00Z', endDate: '2024-01-16T12:00:00Z' },
      ];

      // Mock the method as available
      (AppleHealthKit as any).getEnergyConsumedSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchDietaryEnergy(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('dietary_energy');
      expect(results[0].category).toBe('nutrition');
      expect(results[0].value).toBe(2000);
      expect(results[0].unit).toBe('kcal');
    });

    it('should return empty array if method is not available', async () => {
      // Ensure method is not available
      delete (AppleHealthKit as any).getEnergyConsumedSamples;

      const results = await healthKitService.fetchDietaryEnergy(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit as any).getEnergyConsumedSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchDietaryEnergy(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchWater', () => {
    it('should fetch water intake samples successfully', async () => {
      const mockSamples = [
        { value: 2.5, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' },
        { value: 1.8, startDate: '2024-01-15T14:00:00Z', endDate: '2024-01-15T14:00:00Z' },
      ];

      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchWater(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('water');
      expect(results[0].category).toBe('nutrition');
      expect(results[0].value).toBe(2.5);
      expect(results[0].unit).toBe('fl oz');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchWater(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array when no data available', async () => {
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchWater(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchProtein', () => {
    it('should fetch protein intake samples successfully', async () => {
      const mockSamples = [
        { value: 75, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' },
        { value: 80, startDate: '2024-01-16T12:00:00Z', endDate: '2024-01-16T12:00:00Z' },
      ];

      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchProtein(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('protein');
      expect(results[0].category).toBe('nutrition');
      expect(results[0].value).toBe(75);
      expect(results[0].unit).toBe('g');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchProtein(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchCarbohydrates', () => {
    it('should fetch carbohydrates intake samples successfully', async () => {
      const mockSamples = [
        { value: 250, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' },
        { value: 230, startDate: '2024-01-16T12:00:00Z', endDate: '2024-01-16T12:00:00Z' },
      ];

      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchCarbohydrates(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('carbohydrates');
      expect(results[0].category).toBe('nutrition');
      expect(results[0].value).toBe(250);
      expect(results[0].unit).toBe('g');
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchCarbohydrates(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchFats', () => {
    it('should fetch fats intake samples successfully if method is available', async () => {
      const mockSamples = [
        { value: 65, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' },
        { value: 70, startDate: '2024-01-16T12:00:00Z', endDate: '2024-01-16T12:00:00Z' },
      ];

      // Mock the method as available
      (AppleHealthKit as any).getFatTotalSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', mockSamples);
        }
      );

      const results = await healthKitService.fetchFats(mockFetchOptions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('fats');
      expect(results[0].category).toBe('nutrition');
      expect(results[0].value).toBe(65);
      expect(results[0].unit).toBe('g');
    });

    it('should return empty array if method is not available', async () => {
      // Ensure method is not available
      delete (AppleHealthKit as any).getFatTotalSamples;

      const results = await healthKitService.fetchFats(mockFetchOptions);

      expect(results).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (AppleHealthKit as any).getFatTotalSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      const results = await healthKitService.fetchFats(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });

  describe('fetchAllNutrition', () => {
    it('should fetch all nutrition metrics in parallel and combine results', async () => {
      // Mock dietary energy as available
      (AppleHealthKit as any).getEnergyConsumedSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 2000, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      // Mock water
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 2.5, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );

      // Mock protein
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 75, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      // Mock carbohydrates
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 250, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      // Mock fats as available
      (AppleHealthKit as any).getFatTotalSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 65, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      const results = await healthKitService.fetchAllNutrition(mockFetchOptions);

      // Should have: 1 dietary energy + 1 water + 1 protein + 1 carbs + 1 fats = 5 metrics
      expect(results.length).toBe(5);
      
      // Verify all categories are nutrition
      results.forEach(metric => {
        expect(metric.category).toBe('nutrition');
      });

      // Verify results are sorted by timestamp (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp.getTime()).toBeGreaterThanOrEqual(results[i + 1].timestamp.getTime());
      }

      // Verify all expected types are present
      expect(results.some(m => m.type === 'dietary_energy')).toBe(true);
      expect(results.some(m => m.type === 'water')).toBe(true);
      expect(results.some(m => m.type === 'protein')).toBe(true);
      expect(results.some(m => m.type === 'carbohydrates')).toBe(true);
      expect(results.some(m => m.type === 'fats')).toBe(true);
    });

    it('should continue fetching even if one nutrition type fails', async () => {
      // Mock dietary energy as not available
      delete (AppleHealthKit as any).getEnergyConsumedSamples;

      // Mock water
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 2.5, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );

      // Mock protein with error
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('Permission denied', null);
        }
      );

      // Mock carbohydrates
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 250, startDate: '2024-01-15T12:00:00Z', endDate: '2024-01-15T12:00:00Z' }]);
        }
      );

      // Mock fats as not available
      delete (AppleHealthKit as any).getFatTotalSamples;

      const results = await healthKitService.fetchAllNutrition(mockFetchOptions);

      // Should have water and carbohydrates
      expect(results.length).toBe(2);
      expect(results.some(m => m.type === 'water')).toBe(true);
      expect(results.some(m => m.type === 'carbohydrates')).toBe(true);
    });

    it('should return empty array if all fetches fail', async () => {
      // Mock all as not available or failing
      delete (AppleHealthKit as any).getEnergyConsumedSamples;
      delete (AppleHealthKit as any).getFatTotalSamples;

      const mockError = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', null);
      };

      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockError);

      const results = await healthKitService.fetchAllNutrition(mockFetchOptions);

      expect(results).toEqual([]);
    });
  });
});

describe('HealthKit Service - Comprehensive Data Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFetchOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    limit: 100,
  };

  describe('fetchAllHealthData', () => {
    it('should fetch all health data categories in parallel', async () => {
      // Mock all vitals
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 72, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      // Mock all activity
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 10000, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      // Mock all body
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 70, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T00:00:00Z' });
        }
      );
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      // Mock all nutrition
      (AppleHealthKit as any).getEnergyConsumedSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 2.5, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit as any).getFatTotalSamples = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      // Mock sleep
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 480, startDate: '2024-01-14T22:00:00Z', endDate: '2024-01-15T06:00:00Z' }]);
        }
      );

      // Mock mindfulness
      (AppleHealthKit as any).getMindfulSession = jest.fn().mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      const results = await healthKitService.fetchAllHealthData(mockFetchOptions);

      // Verify structure
      expect(results).toBeDefined();
      expect(results.vitals).toBeDefined();
      expect(results.activity).toBeDefined();
      expect(results.body).toBeDefined();
      expect(results.nutrition).toBeDefined();
      expect(results.sleep).toBeDefined();
      expect(results.mindfulness).toBeDefined();

      // Verify data was fetched
      expect(results.vitals.length).toBeGreaterThan(0); // Heart rate
      expect(results.activity.length).toBeGreaterThan(0); // Steps
      expect(results.body.length).toBeGreaterThan(0); // Weight
      expect(results.nutrition.length).toBeGreaterThan(0); // Water
      expect(results.sleep.length).toBeGreaterThan(0); // Sleep

      // Verify correct categories
      results.vitals.forEach(metric => expect(metric.category).toBe('vitals'));
      results.activity.forEach(metric => expect(metric.category).toBe('activity'));
      results.body.forEach(metric => expect(metric.category).toBe('body'));
      results.nutrition.forEach(metric => expect(metric.category).toBe('nutrition'));
      results.sleep.forEach(metric => expect(metric.category).toBe('sleep'));
      results.mindfulness.forEach(metric => expect(metric.category).toBe('mindfulness'));
    });

    it('should handle partial fetch failures gracefully', async () => {
      // Mock vitals - success
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 72, startDate: '2024-01-15T10:00:00Z', endDate: '2024-01-15T10:00:00Z' }]);
        }
      );
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      // Mock activity - all fail
      const mockError = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', null);
      };
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockError);

      // Mock body - success
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 70, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T00:00:00Z' });
        }
      );
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      // Mock nutrition - all fail
      delete (AppleHealthKit as any).getEnergyConsumedSamples;
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockError);
      delete (AppleHealthKit as any).getFatTotalSamples;

      // Mock sleep - success
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 480, startDate: '2024-01-14T22:00:00Z', endDate: '2024-01-15T06:00:00Z' }]);
        }
      );

      // Mock mindfulness - fail
      delete (AppleHealthKit as any).getMindfulSession;

      const results = await healthKitService.fetchAllHealthData(mockFetchOptions);

      // Verify structure is intact
      expect(results).toBeDefined();
      expect(results.vitals).toBeDefined();
      expect(results.activity).toBeDefined();
      expect(results.body).toBeDefined();
      expect(results.nutrition).toBeDefined();
      expect(results.sleep).toBeDefined();
      expect(results.mindfulness).toBeDefined();

      // Verify successful categories have data
      expect(results.vitals.length).toBeGreaterThan(0);
      expect(results.body.length).toBeGreaterThan(0);
      expect(results.sleep.length).toBeGreaterThan(0);

      // Verify failed categories return empty arrays (not undefined or null)
      expect(results.activity).toEqual([]);
      expect(results.nutrition).toEqual([]);
      expect(results.mindfulness).toEqual([]);
    });

    it('should return empty categorized data if all fetches fail', async () => {
      // Mock all categories to fail
      const mockError = (options: any, callback: (err: string, results: any) => void) => {
        callback('Permission denied', null);
      };

      // Vitals
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBloodPressureSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getRespiratoryRateSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBodyTemperatureSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getOxygenSaturationSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBloodGlucoseSamples as jest.Mock).mockImplementation(mockError);

      // Activity
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(mockError);

      // Body
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(mockError);

      // Nutrition
      delete (AppleHealthKit as any).getEnergyConsumedSamples;
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(mockError);
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(mockError);
      delete (AppleHealthKit as any).getFatTotalSamples;

      // Sleep
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(mockError);

      // Mindfulness
      delete (AppleHealthKit as any).getMindfulSession;

      const results = await healthKitService.fetchAllHealthData(mockFetchOptions);

      // Verify structure is intact with empty arrays
      expect(results).toEqual({
        vitals: [],
        activity: [],
        body: [],
        nutrition: [],
        sleep: [],
        mindfulness: [],
      });
    });

    it('should handle errors in individual category fetchers', async () => {
      // Mock fetchAllVitals to throw an error
      const originalFetchAllVitals = healthKitService.fetchAllVitals;
      healthKitService.fetchAllVitals = jest.fn().mockRejectedValue(new Error('Vitals fetch failed'));

      // Mock other categories to succeed
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 10000, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getFlightsClimbed as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );
      (AppleHealthKit.getAppleExerciseTime as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T23:59:59Z' });
        }
      );

      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T00:00:00Z' });
        }
      );
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      delete (AppleHealthKit as any).getEnergyConsumedSamples;
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      delete (AppleHealthKit as any).getFatTotalSamples;

      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      delete (AppleHealthKit as any).getMindfulSession;

      const results = await healthKitService.fetchAllHealthData(mockFetchOptions);

      // Verify vitals is empty due to error
      expect(results.vitals).toEqual([]);

      // Verify other categories still have data
      expect(results.activity.length).toBeGreaterThan(0);

      // Restore original function
      healthKitService.fetchAllVitals = originalFetchAllVitals;
    });

    it('should use Promise.allSettled to continue fetching despite errors', async () => {
      // This test verifies that the implementation uses Promise.allSettled
      // by checking that all categories are attempted even when some fail

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock some categories to fail
      const originalFetchAllVitals = healthKitService.fetchAllVitals;
      const originalFetchAllActivity = healthKitService.fetchAllActivity;
      
      healthKitService.fetchAllVitals = jest.fn().mockRejectedValue(new Error('Vitals failed'));
      healthKitService.fetchAllActivity = jest.fn().mockRejectedValue(new Error('Activity failed'));

      // Mock other categories to succeed with minimal setup
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', [{ value: 70, startDate: '2024-01-15T08:00:00Z', endDate: '2024-01-15T08:00:00Z' }]);
        }
      );
      (AppleHealthKit.getHeightSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getLatestBmi as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', { value: 0, startDate: '2024-01-15T00:00:00Z', endDate: '2024-01-15T00:00:00Z' });
        }
      );
      (AppleHealthKit.getBodyFatPercentageSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      delete (AppleHealthKit as any).getEnergyConsumedSamples;
      (AppleHealthKit.getWaterSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getProteinSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      (AppleHealthKit.getCarbohydratesSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );
      delete (AppleHealthKit as any).getFatTotalSamples;

      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation(
        (options: any, callback: (err: string, results: any) => void) => {
          callback('', []);
        }
      );

      delete (AppleHealthKit as any).getMindfulSession;

      const results = await healthKitService.fetchAllHealthData(mockFetchOptions);

      // Verify all category fetchers were called
      expect(healthKitService.fetchAllVitals).toHaveBeenCalled();
      expect(healthKitService.fetchAllActivity).toHaveBeenCalled();

      // Verify failed categories return empty arrays
      expect(results.vitals).toEqual([]);
      expect(results.activity).toEqual([]);

      // Verify successful category has data
      expect(results.body.length).toBeGreaterThan(0);

      // Verify errors were logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore
      healthKitService.fetchAllVitals = originalFetchAllVitals;
      healthKitService.fetchAllActivity = originalFetchAllActivity;
      consoleErrorSpy.mockRestore();
    });
  });
});
