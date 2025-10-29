/**
 * Mock Data Service
 * Generates realistic health data scenarios for testing and demonstration
 */

import { createHealthDataPoint, HEALTH_DATA_CATEGORIES } from '../models/HealthDataPoint';

/**
 * @typedef {Object} DataScenario
 * @property {string} name - Scenario name
 * @property {string} description - Scenario description
 * @property {HealthDataPoint[]} data - Generated data points
 * @property {Object} metadata - Additional scenario metadata
 */

/**
 * @typedef {Object} GenerationOptions
 * @property {Date} startDate - Start date for data generation
 * @property {Date} endDate - End date for data generation
 * @property {number} intervalMinutes - Interval between measurements in minutes
 * @property {string[]} categories - Categories to include
 * @property {Object} trends - Trend configurations for each measurement type
 * @property {number} noiseLevel - Amount of random variation (0-1)
 */

export class MockDataService {
  constructor() {
    this.scenarios = new Map();
    this.initializeScenarios();
  }

  /**
   * Initialize predefined health data scenarios
   */
  initializeScenarios() {
    // Healthy baseline scenario
    this.scenarios.set('healthy-baseline', {
      name: 'Healthy Baseline',
      description: 'Normal vital signs for a healthy adult',
      generator: this.generateHealthyBaseline.bind(this)
    });

    // Hypertension monitoring scenario
    this.scenarios.set('hypertension-monitoring', {
      name: 'Hypertension Monitoring',
      description: 'Blood pressure monitoring for hypertensive patient',
      generator: this.generateHypertensionScenario.bind(this)
    });

    // Post-exercise recovery scenario
    this.scenarios.set('post-exercise-recovery', {
      name: 'Post-Exercise Recovery',
      description: 'Heart rate and vitals during post-exercise recovery',
      generator: this.generatePostExerciseScenario.bind(this)
    });

    // Medication adherence scenario
    this.scenarios.set('medication-adherence', {
      name: 'Medication Adherence Tracking',
      description: 'Tracking medication intake and blood pressure response',
      generator: this.generateMedicationScenario.bind(this)
    });

    // Sleep and activity scenario
    this.scenarios.set('sleep-activity-tracking', {
      name: 'Sleep and Activity Tracking',
      description: 'Daily activity levels and sleep patterns',
      generator: this.generateSleepActivityScenario.bind(this)
    });
  }

  /**
   * Generate data for a specific scenario
   * @param {string} scenarioId - Scenario identifier
   * @param {GenerationOptions} options - Generation options
   * @returns {DataScenario} Generated scenario data
   */
  generateScenario(scenarioId, options = {}) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }

    const defaultOptions = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(),
      intervalMinutes: 60,
      categories: ['vitals'],
      noiseLevel: 0.1
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const data = scenario.generator(mergedOptions);

    return {
      name: scenario.name,
      description: scenario.description,
      data,
      metadata: {
        scenarioId,
        generatedAt: new Date(),
        options: mergedOptions,
        dataQuality: this.assessDataQuality(data)
      }
    };
  }

  /**
   * Generate healthy baseline vitals
   * @param {GenerationOptions} options - Generation options
   * @returns {HealthDataPoint[]} Generated data points
   */
  generateHealthyBaseline(options) {
    const data = [];
    const { startDate, endDate, intervalMinutes, noiseLevel } = options;

    // Base values for healthy adult
    const baseValues = {
      heartRate: 72,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      temperature: 98.6,
      oxygenSaturation: 98,
      respiratoryRate: 16
    };

    let currentTime = new Date(startDate);
    let counter = 0;

    while (currentTime <= endDate) {
      // Add circadian rhythm variations
      const hourOfDay = currentTime.getHours();
      const circadianFactor = this.getCircadianFactor(hourOfDay);

      Object.entries(baseValues).forEach(([measurement, baseValue]) => {
        const categoryInfo = this.findCategoryInfo(measurement);
        if (!categoryInfo) return;

        // Apply circadian rhythm and random noise
        let value = baseValue * circadianFactor;
        value += this.addNoise(value, noiseLevel);

        // Ensure value stays within reasonable bounds
        if (categoryInfo.normalRange) {
          const { min, max } = categoryInfo.normalRange;
          value = Math.max(min * 0.9, Math.min(max * 1.1, value));
        }

        data.push(createHealthDataPoint({
          id: `${measurement}-${counter}`,
          timestamp: new Date(currentTime),
          value: Math.round(value * 100) / 100,
          unit: categoryInfo.unit,
          category: 'vitals',
          normalRange: categoryInfo.normalRange,
          description: `${measurement} measurement`
        }));
      });

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      counter++;
    }

    return data;
  }

  /**
   * Generate hypertension monitoring scenario
   * @param {GenerationOptions} options - Generation options
   * @returns {HealthDataPoint[]} Generated data points
   */
  generateHypertensionScenario(options) {
    const data = [];
    const { startDate, endDate, intervalMinutes, noiseLevel } = options;

    // Elevated baseline for hypertensive patient
    const baseValues = {
      bloodPressureSystolic: 150,
      bloodPressureDiastolic: 95,
      heartRate: 78
    };

    let currentTime = new Date(startDate);
    let counter = 0;

    while (currentTime <= endDate) {
      const dayOfWeek = currentTime.getDay();
      const hourOfDay = currentTime.getHours();
      
      // Higher stress on weekdays, medication effects
      const stressFactor = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.1 : 0.95;
      const medicationEffect = hourOfDay >= 8 && hourOfDay <= 20 ? 0.9 : 1.0;

      Object.entries(baseValues).forEach(([measurement, baseValue]) => {
        const categoryInfo = this.findCategoryInfo(measurement);
        if (!categoryInfo) return;

        let value = baseValue * stressFactor * medicationEffect;
        value += this.addNoise(value, noiseLevel);

        data.push(createHealthDataPoint({
          id: `${measurement}-${counter}`,
          timestamp: new Date(currentTime),
          value: Math.round(value * 100) / 100,
          unit: categoryInfo.unit,
          category: 'vitals',
          normalRange: categoryInfo.normalRange,
          description: `${measurement} measurement during hypertension monitoring`
        }));
      });

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      counter++;
    }

    return data;
  }

  /**
   * Generate post-exercise recovery scenario
   * @param {GenerationOptions} options - Generation options
   * @returns {HealthDataPoint[]} Generated data points
   */
  generatePostExerciseScenario(options) {
    const data = [];
    const { startDate, intervalMinutes = 5, noiseLevel } = options; // More frequent measurements

    // Simulate 2-hour recovery period
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    let currentTime = new Date(startDate);
    let counter = 0;

    while (currentTime <= endDate) {
      const minutesElapsed = (currentTime - startDate) / (1000 * 60);
      
      // Heart rate recovery curve (exponential decay)
      const maxHR = 160;
      const restingHR = 72;
      const recoveryRate = 0.03; // Recovery rate constant
      
      const heartRate = restingHR + (maxHR - restingHR) * Math.exp(-recoveryRate * minutesElapsed);
      
      // Respiratory rate follows similar pattern
      const maxRR = 28;
      const restingRR = 16;
      const respiratoryRate = restingRR + (maxRR - restingRR) * Math.exp(-recoveryRate * minutesElapsed);

      [
        { measurement: 'heartRate', value: heartRate },
        { measurement: 'respiratoryRate', value: respiratoryRate }
      ].forEach(({ measurement, value }) => {
        const categoryInfo = this.findCategoryInfo(measurement);
        if (!categoryInfo) return;

        const noisyValue = value + this.addNoise(value, noiseLevel);

        data.push(createHealthDataPoint({
          id: `${measurement}-${counter}`,
          timestamp: new Date(currentTime),
          value: Math.round(noisyValue * 100) / 100,
          unit: categoryInfo.unit,
          category: 'vitals',
          normalRange: categoryInfo.normalRange,
          description: `${measurement} during post-exercise recovery`
        }));
      });

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      counter++;
    }

    return data;
  }

  /**
   * Generate medication adherence scenario
   * @param {GenerationOptions} options - Generation options
   * @returns {HealthDataPoint[]} Generated data points
   */
  generateMedicationScenario(options) {
    const data = [];
    const { startDate, endDate, intervalMinutes = 360, noiseLevel } = options; // Every 6 hours

    let currentTime = new Date(startDate);
    let counter = 0;
    let adherenceRate = 0.85; // 85% adherence rate

    while (currentTime <= endDate) {
      const hourOfDay = currentTime.getHours();
      
      // Medication times: 8 AM and 8 PM
      const isMedicationTime = hourOfDay === 8 || hourOfDay === 20;
      const tookMedication = isMedicationTime && Math.random() < adherenceRate;
      
      // Blood pressure response to medication
      const baseSystolic = 145;
      const baseDiastolic = 92;
      const medicationEffect = tookMedication ? 0.85 : 1.0;

      // Add medication adherence data point
      if (isMedicationTime) {
        data.push(createHealthDataPoint({
          id: `medication-${counter}`,
          timestamp: new Date(currentTime),
          value: tookMedication ? 100 : 0,
          unit: '%',
          category: 'medication',
          description: `Medication adherence: ${tookMedication ? 'Taken' : 'Missed'}`
        }));
      }

      // Add blood pressure readings
      ['bloodPressureSystolic', 'bloodPressureDiastolic'].forEach(measurement => {
        const categoryInfo = this.findCategoryInfo(measurement);
        if (!categoryInfo) return;

        const baseValue = measurement === 'bloodPressureSystolic' ? baseSystolic : baseDiastolic;
        let value = baseValue * medicationEffect;
        value += this.addNoise(value, noiseLevel);

        data.push(createHealthDataPoint({
          id: `${measurement}-${counter}`,
          timestamp: new Date(currentTime),
          value: Math.round(value * 100) / 100,
          unit: categoryInfo.unit,
          category: 'vitals',
          normalRange: categoryInfo.normalRange,
          description: `${measurement} measurement`
        }));
      });

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      counter++;
    }

    return data;
  }

  /**
   * Generate sleep and activity tracking scenario
   * @param {GenerationOptions} options - Generation options
   * @returns {HealthDataPoint[]} Generated data points
   */
  generateSleepActivityScenario(options) {
    const data = [];
    const { startDate, endDate, noiseLevel } = options;

    let currentDate = new Date(startDate);
    let counter = 0;

    while (currentDate <= endDate) {
      // Daily sleep duration (6-9 hours with some variation)
      const baseSleep = 7.5;
      const sleepDuration = baseSleep + this.addNoise(baseSleep, noiseLevel * 0.3);
      
      // Daily steps (8000-12000 with weekend variation)
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const baseSteps = isWeekend ? 6000 : 9000;
      const steps = baseSteps + this.addNoise(baseSteps, noiseLevel);

      // Daily exercise minutes
      const baseExercise = isWeekend ? 45 : 30;
      const exercise = Math.max(0, baseExercise + this.addNoise(baseExercise, noiseLevel));

      [
        { measurement: 'sleep', value: sleepDuration, unit: 'hours', category: 'activity' },
        { measurement: 'steps', value: Math.round(steps), unit: 'steps', category: 'activity' },
        { measurement: 'exercise', value: Math.round(exercise), unit: 'minutes', category: 'activity' }
      ].forEach(({ measurement, value, unit, category }) => {
        const categoryInfo = HEALTH_DATA_CATEGORIES[category]?.[measurement];
        
        data.push(createHealthDataPoint({
          id: `${measurement}-${counter}`,
          timestamp: new Date(currentDate),
          value,
          unit,
          category,
          normalRange: categoryInfo?.normalRange || null,
          description: `Daily ${measurement} tracking`
        }));
      });

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      counter++;
    }

    return data;
  }

  /**
   * Get available scenarios
   * @returns {Array} List of available scenarios
   */
  getAvailableScenarios() {
    return Array.from(this.scenarios.entries()).map(([id, scenario]) => ({
      id,
      name: scenario.name,
      description: scenario.description
    }));
  }

  /**
   * Assess data quality for generated data
   * @param {HealthDataPoint[]} data - Data to assess
   * @returns {Object} Data quality assessment
   */
  assessDataQuality(data) {
    if (!data || data.length === 0) {
      return {
        score: 0,
        issues: ['No data points generated'],
        completeness: 0,
        consistency: 0,
        validity: 0
      };
    }

    const issues = [];
    let validPoints = 0;
    let consistentPoints = 0;

    // Check each data point
    data.forEach((point, index) => {
      // Validity check
      if (point.value != null && !isNaN(point.value) && point.timestamp instanceof Date) {
        validPoints++;
      }

      // Consistency check (reasonable values)
      if (point.normalRange) {
        const { min, max } = point.normalRange;
        const isReasonable = point.value >= min * 0.5 && point.value <= max * 2;
        if (isReasonable) consistentPoints++;
      } else {
        consistentPoints++; // No range to check against
      }

      // Check for temporal consistency
      if (index > 0) {
        const prevPoint = data[index - 1];
        const timeDiff = point.timestamp - prevPoint.timestamp;
        if (timeDiff <= 0) {
          issues.push(`Timestamp ordering issue at index ${index}`);
        }
      }
    });

    const completeness = data.length > 0 ? 1 : 0;
    const validity = validPoints / data.length;
    const consistency = consistentPoints / data.length;
    const score = (completeness + validity + consistency) / 3;

    return {
      score: Math.round(score * 100) / 100,
      issues,
      completeness,
      consistency,
      validity,
      totalPoints: data.length,
      validPoints,
      consistentPoints
    };
  }

  /**
   * Helper method to get circadian rhythm factor
   * @param {number} hour - Hour of day (0-23)
   * @returns {number} Circadian factor (0.9-1.1)
   */
  getCircadianFactor(hour) {
    // Simple circadian rhythm: lower in early morning, higher in evening
    const normalizedHour = hour / 24 * 2 * Math.PI;
    return 1 + 0.1 * Math.sin(normalizedHour - Math.PI / 2);
  }

  /**
   * Add random noise to a value
   * @param {number} value - Base value
   * @param {number} noiseLevel - Noise level (0-1)
   * @returns {number} Value with added noise
   */
  addNoise(value, noiseLevel) {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * value;
    return noise;
  }

  /**
   * Find category information for a measurement
   * @param {string} measurement - Measurement name
   * @returns {Object|null} Category information
   */
  findCategoryInfo(measurement) {
    for (const category of Object.values(HEALTH_DATA_CATEGORIES)) {
      if (category[measurement]) {
        return category[measurement];
      }
    }
    return null;
  }
}

// Export singleton instance
export const mockDataService = new MockDataService();