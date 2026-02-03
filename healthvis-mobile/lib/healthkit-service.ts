/**
 * HealthKit Service Module
 * 
 * This module encapsulates all HealthKit interactions for comprehensive health data.
 * It provides a unified interface for requesting permissions, fetching health data,
 * and converting HealthKit samples to the app's HealthMetric format.
 * 
 * Includes comprehensive error handling with retry logic and fallback strategies.
 * 
 * Requirements: 1.1, 1.2, 2.1-2.6, 6.1, 6.3, 6.5
 */

import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';
import {
  HealthMetric,
  HealthMetricType,
  HealthCategory,
  CategorizedHealthData,
  getUnitForType,
  classifyRange,
  hasDefinedRange,
} from '../types/health-metric';
import {
  HealthKitError,
  HealthKitErrorCode,
  toHealthKitError,
  isHealthKitError,
} from './healthkit-error';
import {
  retryWithBackoff,
  retryWithBackoffSafe,
  RetryOptions,
} from './retry-utils';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for fetching health data
 */
export interface FetchOptions {
  /** Start date for the data range */
  startDate: Date;
  /** End date for the data range */
  endDate: Date;
  /** Optional limit on number of results */
  limit?: number;
}

/**
 * Permission status for all supported HealthKit data types
 */
export interface PermissionStatus {
  // Vitals
  heartRate: boolean;
  bloodPressure: boolean;
  respiratoryRate: boolean;
  bodyTemperature: boolean;
  oxygenSaturation: boolean;
  bloodGlucose: boolean;
  
  // Activity
  steps: boolean;
  distance: boolean;
  flightsClimbed: boolean;
  activeEnergy: boolean;
  exerciseMinutes: boolean;
  
  // Body
  weight: boolean;
  height: boolean;
  bmi: boolean;
  bodyFatPercentage: boolean;
  
  // Nutrition
  dietaryEnergy: boolean;
  water: boolean;
  protein: boolean;
  carbohydrates: boolean;
  fats: boolean;
  
  // Sleep & Mindfulness
  sleep: boolean;
  mindfulness: boolean;
  
  // Summary
  allGranted: boolean;
  categoryStatus: {
    vitals: boolean;
    activity: boolean;
    body: boolean;
    nutrition: boolean;
    sleep: boolean;
    mindfulness: boolean;
  };
}

// ============================================================================
// HealthKit Type Mappings
// ============================================================================

/**
 * Mapping of app metric types to HealthKit permission constants
 * Using the HealthPermission enum from react-native-health
 */
export const HEALTHKIT_TYPES = {
  // Vitals
  HEART_RATE: 'HeartRate',
  BLOOD_PRESSURE_SYSTOLIC: 'BloodPressureSystolic',
  BLOOD_PRESSURE_DIASTOLIC: 'BloodPressureDiastolic',
  RESPIRATORY_RATE: 'RespiratoryRate',
  BODY_TEMPERATURE: 'BodyTemperature',
  OXYGEN_SATURATION: 'OxygenSaturation',
  BLOOD_GLUCOSE: 'BloodGlucose',
  
  // Activity
  STEPS: 'StepCount',
  DISTANCE: 'DistanceWalkingRunning',
  FLIGHTS_CLIMBED: 'FlightsClimbed',
  ACTIVE_ENERGY: 'ActiveEnergyBurned',
  EXERCISE_MINUTES: 'AppleExerciseTime',
  
  // Body
  WEIGHT: 'Weight',
  HEIGHT: 'Height',
  BMI: 'BodyMassIndex',
  BODY_FAT: 'BodyFatPercentage',
  
  // Nutrition
  DIETARY_ENERGY: 'EnergyConsumed',
  WATER: 'Water',
  PROTEIN: 'Protein',
  CARBS: 'Carbohydrates',
  FATS: 'FatTotal',
  
  // Sleep & Mindfulness
  SLEEP: 'SleepAnalysis',
  MINDFULNESS: 'MindfulSession',
} as const;

/**
 * Map HealthKit type to HealthMetric type
 */
const HEALTHKIT_TO_METRIC_TYPE: Record<string, HealthMetricType> = {
  [HEALTHKIT_TYPES.HEART_RATE]: 'heart_rate',
  [HEALTHKIT_TYPES.BLOOD_PRESSURE_SYSTOLIC]: 'blood_pressure_systolic',
  [HEALTHKIT_TYPES.BLOOD_PRESSURE_DIASTOLIC]: 'blood_pressure_diastolic',
  [HEALTHKIT_TYPES.RESPIRATORY_RATE]: 'respiratory_rate',
  [HEALTHKIT_TYPES.BODY_TEMPERATURE]: 'body_temperature',
  [HEALTHKIT_TYPES.OXYGEN_SATURATION]: 'oxygen_saturation',
  [HEALTHKIT_TYPES.BLOOD_GLUCOSE]: 'blood_glucose',
  [HEALTHKIT_TYPES.STEPS]: 'steps',
  [HEALTHKIT_TYPES.DISTANCE]: 'distance',
  [HEALTHKIT_TYPES.FLIGHTS_CLIMBED]: 'flights_climbed',
  [HEALTHKIT_TYPES.ACTIVE_ENERGY]: 'active_energy',
  [HEALTHKIT_TYPES.EXERCISE_MINUTES]: 'exercise_minutes',
  [HEALTHKIT_TYPES.WEIGHT]: 'weight',
  [HEALTHKIT_TYPES.HEIGHT]: 'height',
  [HEALTHKIT_TYPES.BMI]: 'bmi',
  [HEALTHKIT_TYPES.BODY_FAT]: 'body_fat_percentage',
  [HEALTHKIT_TYPES.DIETARY_ENERGY]: 'dietary_energy',
  [HEALTHKIT_TYPES.WATER]: 'water',
  [HEALTHKIT_TYPES.PROTEIN]: 'protein',
  [HEALTHKIT_TYPES.CARBS]: 'carbohydrates',
  [HEALTHKIT_TYPES.FATS]: 'fats',
  [HEALTHKIT_TYPES.SLEEP]: 'sleep',
  [HEALTHKIT_TYPES.MINDFULNESS]: 'mindfulness',
};

/**
 * Map HealthMetric type to HealthCategory
 */
const METRIC_TYPE_TO_CATEGORY: Record<HealthMetricType, HealthCategory> = {
  // Vitals
  heart_rate: 'vitals',
  blood_pressure_systolic: 'vitals',
  blood_pressure_diastolic: 'vitals',
  respiratory_rate: 'vitals',
  body_temperature: 'vitals',
  oxygen_saturation: 'vitals',
  blood_glucose: 'vitals',
  
  // Activity
  steps: 'activity',
  distance: 'activity',
  flights_climbed: 'activity',
  active_energy: 'activity',
  exercise_minutes: 'activity',
  
  // Body
  weight: 'body',
  height: 'body',
  bmi: 'body',
  body_fat_percentage: 'body',
  
  // Nutrition
  dietary_energy: 'nutrition',
  water: 'nutrition',
  protein: 'nutrition',
  carbohydrates: 'nutrition',
  fats: 'nutrition',
  
  // Sleep & Mindfulness
  sleep: 'sleep',
  mindfulness: 'mindfulness',
};

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Default retry options for HealthKit operations
 * Uses exponential backoff with jitter for robust error recovery
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  backoffMultiplier: 2,
  useJitter: true,
  shouldRetry: (error: any, attempt: number) => {
    // Don't retry permission errors or not available errors
    if (isHealthKitError(error)) {
      return error.code !== HealthKitErrorCode.PERMISSION_DENIED &&
             error.code !== HealthKitErrorCode.NOT_AVAILABLE &&
             error.code !== HealthKitErrorCode.INVALID_DATE_RANGE;
    }
    return true;
  },
  onRetry: (error: any, attempt: number, delay: number) => {
    console.log(`Retrying HealthKit operation (attempt ${attempt}) after ${delay}ms:`, error);
  },
};

// ============================================================================
// HealthKit Service Interface
// ============================================================================

/**
 * Service interface for HealthKit interactions
 */
export interface HealthKitService {
  // Initialize HealthKit and request permissions
  initializeHealthKit(): Promise<PermissionStatus>;
  
  // Check current permission status
  checkPermissions(): Promise<PermissionStatus>;
  
  // Helper for error handling
  fetchWithErrorHandling(
    operation: () => Promise<HealthMetric[]>,
    operationName: string,
    options: FetchOptions
  ): Promise<HealthMetric[]>;
  
  // Fetch vitals
  fetchHeartRate(options: FetchOptions): Promise<HealthMetric[]>;
  fetchBloodPressure(options: FetchOptions): Promise<HealthMetric[]>;
  fetchRespiratoryRate(options: FetchOptions): Promise<HealthMetric[]>;
  fetchBodyTemperature(options: FetchOptions): Promise<HealthMetric[]>;
  fetchOxygenSaturation(options: FetchOptions): Promise<HealthMetric[]>;
  fetchBloodGlucose(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch activity metrics
  fetchSteps(options: FetchOptions): Promise<HealthMetric[]>;
  fetchDistance(options: FetchOptions): Promise<HealthMetric[]>;
  fetchFlightsClimbed(options: FetchOptions): Promise<HealthMetric[]>;
  fetchActiveEnergy(options: FetchOptions): Promise<HealthMetric[]>;
  fetchExerciseMinutes(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch body measurements
  fetchWeight(options: FetchOptions): Promise<HealthMetric[]>;
  fetchHeight(options: FetchOptions): Promise<HealthMetric[]>;
  fetchBMI(options: FetchOptions): Promise<HealthMetric[]>;
  fetchBodyFatPercentage(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch nutrition
  fetchDietaryEnergy(options: FetchOptions): Promise<HealthMetric[]>;
  fetchWater(options: FetchOptions): Promise<HealthMetric[]>;
  fetchProtein(options: FetchOptions): Promise<HealthMetric[]>;
  fetchCarbohydrates(options: FetchOptions): Promise<HealthMetric[]>;
  fetchFats(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch sleep and mindfulness
  fetchSleep(options: FetchOptions): Promise<HealthMetric[]>;
  fetchMindfulness(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch all metrics by category
  fetchAllVitals(options: FetchOptions): Promise<HealthMetric[]>;
  fetchAllActivity(options: FetchOptions): Promise<HealthMetric[]>;
  fetchAllBody(options: FetchOptions): Promise<HealthMetric[]>;
  fetchAllNutrition(options: FetchOptions): Promise<HealthMetric[]>;
  
  // Fetch everything
  fetchAllHealthData(options: FetchOptions): Promise<CategorizedHealthData>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a HealthKit sample to a HealthMetric
 * 
 * @param sample - The HealthKit sample
 * @param type - The HealthMetric type
 * @returns The converted HealthMetric
 * 
 * Requirements: 2.8
 */
export function convertHealthKitSample(
  sample: HealthValue,
  type: HealthMetricType
): HealthMetric {
  const category = METRIC_TYPE_TO_CATEGORY[type];
  const unit = getUnitForType(type);
  
  // Extract value from sample
  const value = typeof sample.value === 'number' ? sample.value : parseFloat(String(sample.value));
  
  // Parse timestamp
  const timestamp = new Date(sample.startDate);
  
  // Create base metric
  const metric: HealthMetric = {
    id: `${type}-${timestamp.getTime()}`,
    category,
    type,
    value,
    timestamp,
    unit,
  };
  
  // Add range classification if applicable
  if (hasDefinedRange(type)) {
    metric.range = classifyRange(type, value);
  }
  
  // Add metadata if present
  if (sample.metadata) {
    metric.metadata = sample.metadata;
  }
  
  return metric;
}

/**
 * Build permissions object for HealthKit initialization
 * 
 * @returns HealthKit permissions configuration
 */
function buildPermissions(): HealthKitPermissions {
  return {
    permissions: {
      read: [
        // Vitals
        HEALTHKIT_TYPES.HEART_RATE as any,
        HEALTHKIT_TYPES.BLOOD_PRESSURE_SYSTOLIC as any,
        HEALTHKIT_TYPES.BLOOD_PRESSURE_DIASTOLIC as any,
        HEALTHKIT_TYPES.RESPIRATORY_RATE as any,
        HEALTHKIT_TYPES.BODY_TEMPERATURE as any,
        HEALTHKIT_TYPES.OXYGEN_SATURATION as any,
        HEALTHKIT_TYPES.BLOOD_GLUCOSE as any,
        
        // Activity
        HEALTHKIT_TYPES.STEPS as any,
        HEALTHKIT_TYPES.DISTANCE as any,
        HEALTHKIT_TYPES.FLIGHTS_CLIMBED as any,
        HEALTHKIT_TYPES.ACTIVE_ENERGY as any,
        HEALTHKIT_TYPES.EXERCISE_MINUTES as any,
        
        // Body
        HEALTHKIT_TYPES.WEIGHT as any,
        HEALTHKIT_TYPES.HEIGHT as any,
        HEALTHKIT_TYPES.BMI as any,
        HEALTHKIT_TYPES.BODY_FAT as any,
        
        // Nutrition
        HEALTHKIT_TYPES.DIETARY_ENERGY as any,
        HEALTHKIT_TYPES.WATER as any,
        HEALTHKIT_TYPES.PROTEIN as any,
        HEALTHKIT_TYPES.CARBS as any,
        HEALTHKIT_TYPES.FATS as any,
        
        // Sleep & Mindfulness
        HEALTHKIT_TYPES.SLEEP as any,
        HEALTHKIT_TYPES.MINDFULNESS as any,
      ],
      write: [], // We only need read permissions
    },
  };
}

/**
 * Create a default PermissionStatus with all permissions denied
 */
function createDefaultPermissionStatus(): PermissionStatus {
  return {
    // Vitals
    heartRate: false,
    bloodPressure: false,
    respiratoryRate: false,
    bodyTemperature: false,
    oxygenSaturation: false,
    bloodGlucose: false,
    
    // Activity
    steps: false,
    distance: false,
    flightsClimbed: false,
    activeEnergy: false,
    exerciseMinutes: false,
    
    // Body
    weight: false,
    height: false,
    bmi: false,
    bodyFatPercentage: false,
    
    // Nutrition
    dietaryEnergy: false,
    water: false,
    protein: false,
    carbohydrates: false,
    fats: false,
    
    // Sleep & Mindfulness
    sleep: false,
    mindfulness: false,
    
    // Summary
    allGranted: false,
    categoryStatus: {
      vitals: false,
      activity: false,
      body: false,
      nutrition: false,
      sleep: false,
      mindfulness: false,
    },
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Default HealthKit service implementation
 */
export const healthKitService: HealthKitService = {
  /**
   * Initialize HealthKit and request permissions for all data types
   * 
   * This method initializes the HealthKit API and requests read permissions
   * for all supported health data types across all categories.
   * 
   * Includes retry logic for transient failures and proper error handling.
   * 
   * @returns Promise resolving to permission status for all data types
   * @throws HealthKitError if initialization fails after retries
   * 
   * Requirements: 1.1, 1.3, 1.4, 6.1, 6.3
   */
  async initializeHealthKit(): Promise<PermissionStatus> {
    try {
      // Wrap initialization in retry logic
      return await retryWithBackoff(async () => {
        return new Promise<PermissionStatus>((resolve, reject) => {
          // Build permissions object with all data types
          const permissions = buildPermissions();
          
          // Initialize HealthKit with permissions
          AppleHealthKit.initHealthKit(permissions, (error: string) => {
            if (error) {
              console.error('HealthKit initialization error:', error);
              
              // Check if HealthKit is not available
              if (error.includes('not available') || error.includes('unavailable')) {
                reject(HealthKitError.notAvailable({
                  operation: 'initializeHealthKit',
                  originalError: error,
                }));
                return;
              }
              
              // Generic initialization failure
              reject(HealthKitError.initializationFailed(error, {
                operation: 'initializeHealthKit',
              }));
              return;
            }
            
            // After initialization, check which permissions were actually granted
            healthKitService.checkPermissions()
              .then(resolve)
              .catch(reject);
          });
        });
      }, DEFAULT_RETRY_OPTIONS);
    } catch (error) {
      // Convert to HealthKitError if not already
      const healthKitError = toHealthKitError(error, 'initializeHealthKit');
      
      // If initialization failed completely, return default status (all denied)
      if (healthKitError.code === HealthKitErrorCode.NOT_AVAILABLE ||
          healthKitError.code === HealthKitErrorCode.INITIALIZATION_FAILED) {
        console.error('HealthKit initialization failed:', healthKitError);
        return createDefaultPermissionStatus();
      }
      
      throw healthKitError;
    }
  },
  
  /**
   * Check current permission status for all data types
   * 
   * This method queries HealthKit to determine which permissions have been
   * granted by the user. It checks all data types across all categories
   * and returns a comprehensive permission status.
   * 
   * Includes error handling to gracefully handle permission check failures.
   * 
   * @returns Promise resolving to permission status for all data types
   * 
   * Requirements: 1.1, 1.3, 1.4, 6.3
   */
  async checkPermissions(): Promise<PermissionStatus> {
    // Create default status (all denied)
    const status = createDefaultPermissionStatus();
    
    // Helper to promisify HealthKit checks with error handling
    const checkPermission = (
      checkFn: (options: any, callback: (err: string, results: any) => void) => void,
      options: any = {}
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          checkFn(options, (err: string, results: any) => {
            // Permission is granted if there's no error and results are defined
            // Even if results are empty, it means we have permission but no data
            resolve(!err && results !== undefined);
          });
        } catch (error) {
          // If the check itself throws, assume permission is denied
          console.warn('Permission check threw error:', error);
          resolve(false);
        }
      });
    };
    
    try {
      // Check vitals - run in parallel
      const [
        heartRate,
        bloodPressure,
        respiratoryRate,
        bodyTemperature,
        oxygenSaturation,
        bloodGlucose,
      ] = await Promise.all([
        checkPermission(AppleHealthKit.getHeartRateSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getBloodPressureSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getRespiratoryRateSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getBodyTemperatureSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getOxygenSaturationSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getBloodGlucoseSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
      ]);
      
      status.heartRate = heartRate;
      status.bloodPressure = bloodPressure;
      status.respiratoryRate = respiratoryRate;
      status.bodyTemperature = bodyTemperature;
      status.oxygenSaturation = oxygenSaturation;
      status.bloodGlucose = bloodGlucose;
      
      // Check activity metrics - run in parallel
      const [
        steps,
        distance,
        flightsClimbed,
        activeEnergy,
        exerciseMinutes,
      ] = await Promise.all([
        checkPermission(AppleHealthKit.getStepCount, { 
          startDate: new Date().toISOString() 
        }),
        checkPermission(AppleHealthKit.getDistanceWalkingRunning, { 
          startDate: new Date().toISOString() 
        }),
        checkPermission(AppleHealthKit.getFlightsClimbed, { 
          startDate: new Date().toISOString() 
        }),
        checkPermission(AppleHealthKit.getActiveEnergyBurned, { 
          startDate: new Date().toISOString() 
        }),
        checkPermission(AppleHealthKit.getAppleExerciseTime, { 
          startDate: new Date().toISOString() 
        }),
      ]);
      
      status.steps = steps;
      status.distance = distance;
      status.flightsClimbed = flightsClimbed;
      status.activeEnergy = activeEnergy;
      status.exerciseMinutes = exerciseMinutes;
      
      // Check body measurements - run in parallel
      const [
        weight,
        height,
        bmi,
        bodyFatPercentage,
      ] = await Promise.all([
        checkPermission(AppleHealthKit.getWeightSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getHeightSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getLatestBmi, {}),
        checkPermission(AppleHealthKit.getBodyFatPercentageSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
      ]);
      
      status.weight = weight;
      status.height = height;
      status.bmi = bmi;
      status.bodyFatPercentage = bodyFatPercentage;
      
      // Check nutrition - run in parallel
      const [
        water,
        protein,
        carbohydrates,
        sleep,
      ] = await Promise.all([
        checkPermission(AppleHealthKit.getWaterSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getProteinSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getCarbohydratesSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
        checkPermission(AppleHealthKit.getSleepSamples, { 
          startDate: new Date().toISOString(), 
          limit: 1 
        }),
      ]);
      
      status.water = water;
      status.protein = protein;
      status.carbohydrates = carbohydrates;
      status.sleep = sleep;
      
      // Note: Some data types may not have direct getters in react-native-health
      // Mark them as false for now
      status.dietaryEnergy = false;
      status.fats = false;
      status.mindfulness = false;
      
      // Calculate category status
      status.categoryStatus.vitals = 
        status.heartRate ||
        status.bloodPressure ||
        status.respiratoryRate ||
        status.bodyTemperature ||
        status.oxygenSaturation ||
        status.bloodGlucose;
      
      status.categoryStatus.activity =
        status.steps ||
        status.distance ||
        status.flightsClimbed ||
        status.activeEnergy ||
        status.exerciseMinutes;
      
      status.categoryStatus.body =
        status.weight ||
        status.height ||
        status.bmi ||
        status.bodyFatPercentage;
      
      status.categoryStatus.nutrition =
        status.dietaryEnergy ||
        status.water ||
        status.protein ||
        status.carbohydrates ||
        status.fats;
      
      status.categoryStatus.sleep = status.sleep;
      status.categoryStatus.mindfulness = status.mindfulness;
      
      // Check if all permissions are granted
      status.allGranted =
        status.categoryStatus.vitals &&
        status.categoryStatus.activity &&
        status.categoryStatus.body &&
        status.categoryStatus.nutrition &&
        status.categoryStatus.sleep &&
        status.categoryStatus.mindfulness;
      
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Return default status (all denied) on error
      return status;
    }
  },
  
  // ============================================================================
  // Helper: Fetch with Error Handling and Retry
  // ============================================================================
  
  /**
   * Wrap a HealthKit fetch operation with error handling and retry logic
   * 
   * This helper function provides consistent error handling across all fetch methods:
   * - Validates date range
   * - Wraps operation in retry logic with exponential backoff
   * - Converts errors to HealthKitError
   * - Returns empty array on failure (graceful degradation)
   * 
   * @param operation - The fetch operation to execute
   * @param operationName - Name of the operation for error reporting
   * @param options - Fetch options
   * @returns Promise resolving to array of health metrics
   * 
   * Requirements: 6.3, 6.5
   */
  async fetchWithErrorHandling(
    operation: () => Promise<HealthMetric[]>,
    operationName: string,
    options: FetchOptions
  ): Promise<HealthMetric[]> {
    try {
      // Validate date range
      if (options.startDate > options.endDate) {
        throw HealthKitError.invalidDateRange({
          operation: operationName,
        });
      }
      
      // Execute operation with retry logic
      const result = await retryWithBackoff(
        operation,
        DEFAULT_RETRY_OPTIONS
      );
      
      return result;
    } catch (error) {
      // Convert to HealthKitError if not already
      const healthKitError = toHealthKitError(error, operationName);
      
      // Log the error
      console.error(`${operationName} failed:`, healthKitError);
      
      // For non-critical errors, return empty array (graceful degradation)
      // This allows other data fetches to continue
      if (healthKitError.code === HealthKitErrorCode.NO_DATA ||
          healthKitError.code === HealthKitErrorCode.PERMISSION_DENIED) {
        return [];
      }
      
      // For critical errors, return empty array but log more severely
      console.error(`Critical error in ${operationName}:`, healthKitError.toJSON());
      return [];
    }
  },
  
  // Vitals
  /**
   * Fetch heart rate samples from HealthKit
   * 
   * Includes retry logic and error handling for robust data fetching.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of heart rate metrics
   * 
   * Requirements: 2.1, 6.3, 6.5
   */
  async fetchHeartRate(options: FetchOptions): Promise<HealthMetric[]> {
    return healthKitService.fetchWithErrorHandling(
      () => new Promise<HealthMetric[]>((resolve, reject) => {
        const healthKitOptions = {
          startDate: options.startDate.toISOString(),
          endDate: options.endDate.toISOString(),
          limit: options.limit,
        };
        
        AppleHealthKit.getHeartRateSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
          if (err) {
            reject(HealthKitError.fetchFailed('fetchHeartRate', err));
            return;
          }
          
          if (!results || results.length === 0) {
            resolve([]);
            return;
          }
          
          try {
            const metrics = results.map(sample => 
              convertHealthKitSample(sample, 'heart_rate')
            );
            resolve(metrics);
          } catch (conversionError) {
            reject(HealthKitError.conversionFailed('fetchHeartRate', conversionError));
          }
        });
      }),
      'fetchHeartRate',
      options
    );
  },
  
  /**
   * Fetch blood pressure samples from HealthKit
   * 
   * Blood pressure returns both systolic and diastolic values as separate metrics.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of blood pressure metrics (both systolic and diastolic)
   * 
   * Requirements: 2.1
   */
  async fetchBloodPressure(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getBloodPressureSamples(healthKitOptions, (err: string, results: any[]) => {
        if (err) {
          console.error('Error fetching blood pressure:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics: HealthMetric[] = [];
        
        // Each blood pressure sample contains both systolic and diastolic values
        for (const sample of results) {
          const timestamp = new Date(sample.startDate);
          
          // Create systolic metric
          if (sample.bloodPressureSystolicValue !== undefined) {
            const systolicSample: HealthValue = {
              value: sample.bloodPressureSystolicValue,
              startDate: sample.startDate,
              endDate: sample.endDate,
            };
            metrics.push(convertHealthKitSample(systolicSample, 'blood_pressure_systolic'));
          }
          
          // Create diastolic metric
          if (sample.bloodPressureDiastolicValue !== undefined) {
            const diastolicSample: HealthValue = {
              value: sample.bloodPressureDiastolicValue,
              startDate: sample.startDate,
              endDate: sample.endDate,
            };
            metrics.push(convertHealthKitSample(diastolicSample, 'blood_pressure_diastolic'));
          }
        }
        
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch respiratory rate samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of respiratory rate metrics
   * 
   * Requirements: 2.1
   */
  async fetchRespiratoryRate(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getRespiratoryRateSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching respiratory rate:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'respiratory_rate')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch body temperature samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of body temperature metrics
   * 
   * Requirements: 2.1
   */
  async fetchBodyTemperature(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getBodyTemperatureSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching body temperature:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'body_temperature')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch oxygen saturation samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of oxygen saturation metrics
   * 
   * Requirements: 2.1
   */
  async fetchOxygenSaturation(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getOxygenSaturationSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching oxygen saturation:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'oxygen_saturation')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch blood glucose samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of blood glucose metrics
   * 
   * Requirements: 2.1
   */
  async fetchBloodGlucose(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getBloodGlucoseSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching blood glucose:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'blood_glucose')
        );
        resolve(metrics);
      });
    });
  },
  
  // Activity
  /**
   * Fetch step count samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of step count metrics
   * 
   * Requirements: 2.2
   */
  async fetchSteps(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      };
      
      AppleHealthKit.getStepCount(healthKitOptions, (err: string, results: HealthValue) => {
        if (err) {
          console.error('Error fetching steps:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.value === undefined) {
          resolve([]);
          return;
        }
        
        // getStepCount returns a single aggregated value, not an array
        const metric = convertHealthKitSample(results, 'steps');
        resolve([metric]);
      });
    });
  },
  
  /**
   * Fetch distance walking/running samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of distance metrics
   * 
   * Requirements: 2.2
   */
  async fetchDistance(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      };
      
      AppleHealthKit.getDistanceWalkingRunning(healthKitOptions, (err: string, results: HealthValue) => {
        if (err) {
          console.error('Error fetching distance:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.value === undefined) {
          resolve([]);
          return;
        }
        
        // getDistanceWalkingRunning returns a single aggregated value, not an array
        const metric = convertHealthKitSample(results, 'distance');
        resolve([metric]);
      });
    });
  },
  
  /**
   * Fetch flights climbed samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of flights climbed metrics
   * 
   * Requirements: 2.2
   */
  async fetchFlightsClimbed(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      };
      
      AppleHealthKit.getFlightsClimbed(healthKitOptions, (err: string, results: HealthValue) => {
        if (err) {
          console.error('Error fetching flights climbed:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.value === undefined) {
          resolve([]);
          return;
        }
        
        // getFlightsClimbed returns a single aggregated value, not an array
        const metric = convertHealthKitSample(results, 'flights_climbed');
        resolve([metric]);
      });
    });
  },
  
  /**
   * Fetch active energy burned samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of active energy metrics
   * 
   * Requirements: 2.2
   */
  async fetchActiveEnergy(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      };
      
      AppleHealthKit.getActiveEnergyBurned(healthKitOptions, (err: string, results: any) => {
        if (err) {
          console.error('Error fetching active energy:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.value === undefined) {
          resolve([]);
          return;
        }
        
        // getActiveEnergyBurned returns a single aggregated value
        const metric = convertHealthKitSample(results as HealthValue, 'active_energy');
        resolve([metric]);
      });
    });
  },
  
  /**
   * Fetch Apple Exercise Time (exercise minutes) samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of exercise minutes metrics
   * 
   * Requirements: 2.2
   */
  async fetchExerciseMinutes(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      };
      
      AppleHealthKit.getAppleExerciseTime(healthKitOptions, (err: string, results: any) => {
        if (err) {
          console.error('Error fetching exercise minutes:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.value === undefined) {
          resolve([]);
          return;
        }
        
        // getAppleExerciseTime returns a single aggregated value
        const metric = convertHealthKitSample(results as HealthValue, 'exercise_minutes');
        resolve([metric]);
      });
    });
  },
  
  // Body
  /**
   * Fetch weight samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of weight metrics
   * 
   * Requirements: 2.3
   */
  async fetchWeight(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getWeightSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching weight:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'weight')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch height samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of height metrics
   * 
   * Requirements: 2.3
   */
  async fetchHeight(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getHeightSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching height:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'height')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch BMI (Body Mass Index) samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of BMI metrics
   * 
   * Requirements: 2.3
   */
  async fetchBMI(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      // Check if getLatestBmi is available
      if (typeof AppleHealthKit.getLatestBmi !== 'function') {
        console.warn('getLatestBmi not available in react-native-health');
        resolve([]);
        return;
      }

      try {
        // Note: getLatestBmi returns only the most recent BMI value
        // For a range of BMI values, we would need to use a different approach
        // or calculate from weight and height
        AppleHealthKit.getLatestBmi({}, (err: string, results: any) => {
          if (err) {
            console.error('Error fetching BMI:', err);
            resolve([]); // Return empty array on error
            return;
          }
          
          if (!results || results.value === undefined) {
            resolve([]);
            return;
          }
          
          // getLatestBmi returns a single value, not an array
          const metric = convertHealthKitSample(results as HealthValue, 'bmi');
          resolve([metric]);
        });
      } catch (error) {
        console.error('Exception fetching BMI:', error);
        resolve([]);
      }
    });
  },
  
  /**
   * Fetch body fat percentage samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of body fat percentage metrics
   * 
   * Requirements: 2.3
   */
  async fetchBodyFatPercentage(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getBodyFatPercentageSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching body fat percentage:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'body_fat_percentage')
        );
        resolve(metrics);
      });
    });
  },
  
  // Nutrition
  /**
   * Fetch dietary energy (calories consumed) samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of dietary energy metrics
   * 
   * Requirements: 2.4
   */
  async fetchDietaryEnergy(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      // Note: react-native-health may not have a direct method for dietary energy
      // We'll use a generic approach or return empty array if not available
      if (typeof (AppleHealthKit as any).getEnergyConsumedSamples === 'function') {
        (AppleHealthKit as any).getEnergyConsumedSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
          if (err) {
            console.error('Error fetching dietary energy:', err);
            resolve([]); // Return empty array on error
            return;
          }
          
          if (!results || results.length === 0) {
            resolve([]);
            return;
          }
          
          const metrics = results.map(sample => 
            convertHealthKitSample(sample, 'dietary_energy')
          );
          resolve(metrics);
        });
      } else {
        // Method not available in this version of react-native-health
        console.warn('getEnergyConsumedSamples not available in react-native-health');
        resolve([]);
      }
    });
  },
  
  /**
   * Fetch water intake samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of water intake metrics
   * 
   * Requirements: 2.4
   */
  async fetchWater(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getWaterSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching water:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'water')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch protein intake samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of protein intake metrics
   * 
   * Requirements: 2.4
   */
  async fetchProtein(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getProteinSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching protein:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'protein')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch carbohydrates intake samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of carbohydrates intake metrics
   * 
   * Requirements: 2.4
   */
  async fetchCarbohydrates(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getCarbohydratesSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
        if (err) {
          console.error('Error fetching carbohydrates:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        const metrics = results.map(sample => 
          convertHealthKitSample(sample, 'carbohydrates')
        );
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch fats intake samples from HealthKit
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of fats intake metrics
   * 
   * Requirements: 2.4
   */
  async fetchFats(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      // Note: react-native-health may use getFatTotalSamples or similar
      if (typeof (AppleHealthKit as any).getFatTotalSamples === 'function') {
        (AppleHealthKit as any).getFatTotalSamples(healthKitOptions, (err: string, results: HealthValue[]) => {
          if (err) {
            console.error('Error fetching fats:', err);
            resolve([]); // Return empty array on error
            return;
          }
          
          if (!results || results.length === 0) {
            resolve([]);
            return;
          }
          
          const metrics = results.map(sample => 
            convertHealthKitSample(sample, 'fats')
          );
          resolve(metrics);
        });
      } else {
        // Method not available in this version of react-native-health
        console.warn('getFatTotalSamples not available in react-native-health');
        resolve([]);
      }
    });
  },
  
  // Sleep & Mindfulness
  /**
   * Fetch sleep analysis samples from HealthKit
   * 
   * Sleep analysis includes different sleep stages (asleep, in bed, awake, etc.)
   * Each sample represents a period of sleep with its duration.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of sleep metrics
   * 
   * Requirements: 2.5
   */
  async fetchSleep(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      AppleHealthKit.getSleepSamples(healthKitOptions, (err: string, results: any[]) => {
        if (err) {
          console.error('Error fetching sleep:', err);
          resolve([]); // Return empty array on error
          return;
        }
        
        if (!results || results.length === 0) {
          resolve([]);
          return;
        }
        
        // Convert sleep samples to HealthMetric format
        // Sleep samples have a value field representing duration in minutes
        const metrics = results.map(sample => {
          // Create a HealthValue-compatible object
          const healthValue: HealthValue = {
            value: sample.value || 0,
            startDate: sample.startDate,
            endDate: sample.endDate,
          };
          
          // Add sleep-specific metadata if available
          if (sample.metadata || sample.sleepStage) {
            healthValue.metadata = {
              ...sample.metadata,
              sleepStage: sample.sleepStage,
            };
          }
          
          return convertHealthKitSample(healthValue, 'sleep');
        });
        
        resolve(metrics);
      });
    });
  },
  
  /**
   * Fetch mindfulness session samples from HealthKit
   * 
   * Mindfulness sessions represent periods of meditation or mindfulness practice.
   * Each sample includes the duration of the session in minutes.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of mindfulness metrics
   * 
   * Requirements: 2.6
   */
  async fetchMindfulness(options: FetchOptions): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const healthKitOptions = {
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        limit: options.limit,
      };
      
      // Note: react-native-health may not have a direct method for mindfulness
      // We'll check if the method exists and use it, otherwise return empty array
      if (typeof (AppleHealthKit as any).getMindfulSession === 'function') {
        (AppleHealthKit as any).getMindfulSession(healthKitOptions, (err: string, results: any[]) => {
          if (err) {
            console.error('Error fetching mindfulness:', err);
            resolve([]); // Return empty array on error
            return;
          }
          
          if (!results || results.length === 0) {
            resolve([]);
            return;
          }
          
          // Convert mindfulness samples to HealthMetric format
          const metrics = results.map(sample => {
            // Create a HealthValue-compatible object
            const healthValue: HealthValue = {
              value: sample.value || 0,
              startDate: sample.startDate,
              endDate: sample.endDate,
            };
            
            // Add metadata if available
            if (sample.metadata) {
              healthValue.metadata = sample.metadata;
            }
            
            return convertHealthKitSample(healthValue, 'mindfulness');
          });
          
          resolve(metrics);
        });
      } else {
        // Method not available in this version of react-native-health
        console.warn('getMindfulSession not available in react-native-health');
        resolve([]);
      }
    });
  },
  
  // Category fetchers
  /**
   * Fetch all vital signs data from HealthKit
   * 
   * This method fetches all vital sign metrics in parallel and combines them
   * into a single array. It continues fetching other vitals even if one fails.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of all vital sign metrics
   * 
   * Requirements: 2.1
   */
  async fetchAllVitals(options: FetchOptions): Promise<HealthMetric[]> {
    try {
      // Fetch all vitals in parallel
      const [
        heartRate,
        bloodPressure,
        respiratoryRate,
        bodyTemperature,
        oxygenSaturation,
        bloodGlucose,
      ] = await Promise.all([
        healthKitService.fetchHeartRate(options),
        healthKitService.fetchBloodPressure(options),
        healthKitService.fetchRespiratoryRate(options),
        healthKitService.fetchBodyTemperature(options),
        healthKitService.fetchOxygenSaturation(options),
        healthKitService.fetchBloodGlucose(options),
      ]);
      
      // Combine all metrics into a single array
      const allMetrics = [
        ...heartRate,
        ...bloodPressure,
        ...respiratoryRate,
        ...bodyTemperature,
        ...oxygenSaturation,
        ...bloodGlucose,
      ];
      
      // Sort by timestamp (most recent first)
      allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return allMetrics;
    } catch (error) {
      console.error('Error fetching all vitals:', error);
      return [];
    }
  },
  
  /**
   * Fetch all activity metrics from HealthKit
   * 
   * This method fetches all activity metrics in parallel and combines them
   * into a single array. It continues fetching other metrics even if one fails.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of all activity metrics
   * 
   * Requirements: 2.2
   */
  async fetchAllActivity(options: FetchOptions): Promise<HealthMetric[]> {
    try {
      // Fetch all activity metrics in parallel
      const [
        steps,
        distance,
        flightsClimbed,
        activeEnergy,
        exerciseMinutes,
      ] = await Promise.all([
        healthKitService.fetchSteps(options),
        healthKitService.fetchDistance(options),
        healthKitService.fetchFlightsClimbed(options),
        healthKitService.fetchActiveEnergy(options),
        healthKitService.fetchExerciseMinutes(options),
      ]);
      
      // Combine all metrics into a single array
      const allMetrics = [
        ...steps,
        ...distance,
        ...flightsClimbed,
        ...activeEnergy,
        ...exerciseMinutes,
      ];
      
      // Sort by timestamp (most recent first)
      allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return allMetrics;
    } catch (error) {
      console.error('Error fetching all activity metrics:', error);
      return [];
    }
  },
  
  /**
   * Fetch all body measurement data from HealthKit
   * 
   * This method fetches all body measurement metrics in parallel and combines them
   * into a single array. It continues fetching other metrics even if one fails.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of all body measurement metrics
   * 
   * Requirements: 2.3
   */
  async fetchAllBody(options: FetchOptions): Promise<HealthMetric[]> {
    try {
      // Fetch all body measurements in parallel
      const [
        weight,
        height,
        bmi,
        bodyFatPercentage,
      ] = await Promise.all([
        healthKitService.fetchWeight(options),
        healthKitService.fetchHeight(options),
        healthKitService.fetchBMI(options),
        healthKitService.fetchBodyFatPercentage(options),
      ]);
      
      // Combine all metrics into a single array
      const allMetrics = [
        ...weight,
        ...height,
        ...bmi,
        ...bodyFatPercentage,
      ];
      
      // Sort by timestamp (most recent first)
      allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return allMetrics;
    } catch (error) {
      console.error('Error fetching all body measurements:', error);
      return [];
    }
  },
  
  /**
   * Fetch all nutrition data from HealthKit
   * 
   * This method fetches all nutrition metrics in parallel and combines them
   * into a single array. It continues fetching other metrics even if one fails.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to array of all nutrition metrics
   * 
   * Requirements: 2.4
   */
  async fetchAllNutrition(options: FetchOptions): Promise<HealthMetric[]> {
    try {
      // Fetch all nutrition metrics in parallel
      const [
        dietaryEnergy,
        water,
        protein,
        carbohydrates,
        fats,
      ] = await Promise.all([
        healthKitService.fetchDietaryEnergy(options),
        healthKitService.fetchWater(options),
        healthKitService.fetchProtein(options),
        healthKitService.fetchCarbohydrates(options),
        healthKitService.fetchFats(options),
      ]);
      
      // Combine all metrics into a single array
      const allMetrics = [
        ...dietaryEnergy,
        ...water,
        ...protein,
        ...carbohydrates,
        ...fats,
      ];
      
      // Sort by timestamp (most recent first)
      allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return allMetrics;
    } catch (error) {
      console.error('Error fetching all nutrition metrics:', error);
      return [];
    }
  },
  
  // Fetch all
  /**
   * Fetch all health data from HealthKit across all categories
   * 
   * This method fetches all available health data in parallel, organized by category.
   * It implements robust error handling to continue fetching other categories even if
   * one category fails. Each category fetch is independent and failures are logged
   * but don't prevent other categories from being fetched.
   * 
   * Includes comprehensive error handling with partial fetch support.
   * 
   * @param options - Fetch options including date range and limit
   * @returns Promise resolving to categorized health data with all available metrics
   * 
   * Requirements: 2.9, 6.3, 6.5
   */
  async fetchAllHealthData(options: FetchOptions): Promise<CategorizedHealthData> {
    try {
      // Validate date range first
      if (options.startDate > options.endDate) {
        throw HealthKitError.invalidDateRange({
          operation: 'fetchAllHealthData',
        });
      }
      
      // Fetch all categories in parallel with individual error handling
      // Using Promise.allSettled to continue even if some categories fail
      const results = await Promise.allSettled([
        healthKitService.fetchAllVitals(options),
        healthKitService.fetchAllActivity(options),
        healthKitService.fetchAllBody(options),
        healthKitService.fetchAllNutrition(options),
        healthKitService.fetchSleep(options),
        healthKitService.fetchMindfulness(options),
      ]);
      
      // Extract results, using empty arrays for failed fetches
      const vitals = results[0].status === 'fulfilled' ? results[0].value : [];
      const activity = results[1].status === 'fulfilled' ? results[1].value : [];
      const body = results[2].status === 'fulfilled' ? results[2].value : [];
      const nutrition = results[3].status === 'fulfilled' ? results[3].value : [];
      const sleep = results[4].status === 'fulfilled' ? results[4].value : [];
      const mindfulness = results[5].status === 'fulfilled' ? results[5].value : [];
      
      // Track successful and failed categories
      const categories = ['vitals', 'activity', 'body', 'nutrition', 'sleep', 'mindfulness'];
      const successfulCategories: string[] = [];
      const failedCategories: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulCategories.push(categories[index]);
        } else {
          failedCategories.push(categories[index]);
          console.error(`Failed to fetch ${categories[index]} data:`, result.reason);
        }
      });
      
      // If some categories failed but others succeeded, log a warning
      if (failedCategories.length > 0 && successfulCategories.length > 0) {
        const partialError = HealthKitError.partialFetch(
          successfulCategories,
          failedCategories,
          { operation: 'fetchAllHealthData' }
        );
        console.warn('Partial fetch completed:', partialError.toJSON());
      }
      
      // If all categories failed, throw an error
      if (successfulCategories.length === 0) {
        throw HealthKitError.fetchFailed('fetchAllHealthData', 'All categories failed to fetch');
      }
      
      // Return categorized data
      return {
        vitals,
        activity,
        body,
        nutrition,
        sleep,
        mindfulness,
      };
    } catch (error) {
      // Convert to HealthKitError if not already
      const healthKitError = toHealthKitError(error, 'fetchAllHealthData');
      
      // Log the error
      console.error('Error fetching all health data:', healthKitError.toJSON());
      
      // Return empty categorized data structure
      // This allows the app to continue functioning even if all fetches fail
      return {
        vitals: [],
        activity: [],
        body: [],
        nutrition: [],
        sleep: [],
        mindfulness: [],
      };
    }
  },
};

// Export helper functions for testing and external use
export { buildPermissions, createDefaultPermissionStatus };
