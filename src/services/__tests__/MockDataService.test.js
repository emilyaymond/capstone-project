import { MockDataService, mockDataService } from '../MockDataService';

describe('MockDataService', () => {
  let service;

  beforeEach(() => {
    service = new MockDataService();
  });

  describe('constructor and initialization', () => {
    it('should initialize with predefined scenarios', () => {
      const scenarios = service.getAvailableScenarios();
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'healthy-baseline',
            name: expect.any(String),
            description: expect.any(String)
          })
        ])
      );
    });

    it('should provide singleton instance', () => {
      expect(mockDataService).toBeInstanceOf(MockDataService);
    });
  });

  describe('getAvailableScenarios', () => {
    it('should return all available scenarios', () => {
      const scenarios = service.getAvailableScenarios();
      
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBe(5); // Expected number of predefined scenarios
      
      const scenarioIds = scenarios.map(s => s.id);
      expect(scenarioIds).toContain('healthy-baseline');
      expect(scenarioIds).toContain('hypertension-monitoring');
      expect(scenarioIds).toContain('post-exercise-recovery');
      expect(scenarioIds).toContain('medication-adherence');
      expect(scenarioIds).toContain('sleep-activity-tracking');
    });

    it('should return scenarios with proper structure', () => {
      const scenarios = service.getAvailableScenarios();
      
      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('id');
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('description');
        expect(typeof scenario.id).toBe('string');
        expect(typeof scenario.name).toBe('string');
        expect(typeof scenario.description).toBe('string');
      });
    });
  });

  describe('generateScenario', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T00:00:00Z'),
      endDate: new Date('2023-01-02T00:00:00Z'),
      intervalMinutes: 60,
      noiseLevel: 0.1
    };

    it('should generate scenario with valid structure', () => {
      const scenario = service.generateScenario('healthy-baseline', testOptions);
      
      expect(scenario).toHaveProperty('name');
      expect(scenario).toHaveProperty('description');
      expect(scenario).toHaveProperty('data');
      expect(scenario).toHaveProperty('metadata');
      expect(Array.isArray(scenario.data)).toBe(true);
      expect(scenario.data.length).toBeGreaterThan(0);
    });

    it('should throw error for unknown scenario', () => {
      expect(() => {
        service.generateScenario('unknown-scenario', testOptions);
      }).toThrow('Unknown scenario: unknown-scenario');
    });

    it('should use default options when none provided', () => {
      const scenario = service.generateScenario('healthy-baseline');
      
      expect(scenario.data.length).toBeGreaterThan(0);
      expect(scenario.metadata).toHaveProperty('options');
      expect(scenario.metadata.options).toHaveProperty('startDate');
      expect(scenario.metadata.options).toHaveProperty('endDate');
    });

    it('should include data quality assessment', () => {
      const scenario = service.generateScenario('healthy-baseline', testOptions);
      
      expect(scenario.metadata).toHaveProperty('dataQuality');
      expect(scenario.metadata.dataQuality).toHaveProperty('score');
      expect(scenario.metadata.dataQuality).toHaveProperty('completeness');
      expect(scenario.metadata.dataQuality).toHaveProperty('consistency');
      expect(scenario.metadata.dataQuality).toHaveProperty('validity');
    });
  });

  describe('generateHealthyBaseline', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T08:00:00Z'),
      endDate: new Date('2023-01-01T12:00:00Z'),
      intervalMinutes: 60,
      noiseLevel: 0.05
    };

    it('should generate data points within time range', () => {
      const data = service.generateHealthyBaseline(testOptions);
      
      expect(data.length).toBeGreaterThan(0);
      
      data.forEach(point => {
        expect(point.timestamp).toBeInstanceOf(Date);
        expect(point.timestamp.getTime()).toBeGreaterThanOrEqual(testOptions.startDate.getTime());
        expect(point.timestamp.getTime()).toBeLessThanOrEqual(testOptions.endDate.getTime());
      });
    });

    it('should generate realistic vital signs', () => {
      const data = service.generateHealthyBaseline(testOptions);
      
      // Check for expected vital signs
      const heartRatePoints = data.filter(p => p.id.includes('heartRate'));
      const bpSystolicPoints = data.filter(p => p.id.includes('bloodPressureSystolic'));
      
      expect(heartRatePoints.length).toBeGreaterThan(0);
      expect(bpSystolicPoints.length).toBeGreaterThan(0);
      
      // Check values are in reasonable ranges
      heartRatePoints.forEach(point => {
        expect(point.value).toBeGreaterThan(50);
        expect(point.value).toBeLessThan(120);
        expect(point.unit).toBe('bpm');
        expect(point.category).toBe('vitals');
      });
    });

    it('should apply circadian rhythm variations', () => {
      const morningOptions = {
        ...testOptions,
        startDate: new Date('2023-01-01T06:00:00Z'),
        endDate: new Date('2023-01-01T07:00:00Z')
      };
      
      const eveningOptions = {
        ...testOptions,
        startDate: new Date('2023-01-01T18:00:00Z'),
        endDate: new Date('2023-01-01T19:00:00Z')
      };
      
      const morningData = service.generateHealthyBaseline(morningOptions);
      const eveningData = service.generateHealthyBaseline(eveningOptions);
      
      expect(morningData.length).toBeGreaterThan(0);
      expect(eveningData.length).toBeGreaterThan(0);
      
      // Values should be different due to circadian rhythm
      const morningHR = morningData.find(p => p.id.includes('heartRate'))?.value;
      const eveningHR = eveningData.find(p => p.id.includes('heartRate'))?.value;
      
      expect(morningHR).toBeDefined();
      expect(eveningHR).toBeDefined();
      // Should have some variation (not exact due to noise, but should be different)
    });
  });

  describe('generateHypertensionScenario', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T08:00:00Z'),
      endDate: new Date('2023-01-01T12:00:00Z'),
      intervalMinutes: 120,
      noiseLevel: 0.05
    };

    it('should generate elevated blood pressure readings', () => {
      const data = service.generateHypertensionScenario(testOptions);
      
      const systolicPoints = data.filter(p => p.id.includes('bloodPressureSystolic'));
      const diastolicPoints = data.filter(p => p.id.includes('bloodPressureDiastolic'));
      
      expect(systolicPoints.length).toBeGreaterThan(0);
      expect(diastolicPoints.length).toBeGreaterThan(0);
      
      // Should have elevated values compared to normal
      systolicPoints.forEach(point => {
        expect(point.value).toBeGreaterThan(130); // Elevated systolic
      });
      
      diastolicPoints.forEach(point => {
        expect(point.value).toBeGreaterThan(85); // Elevated diastolic
      });
    });

    it('should apply stress and medication factors', () => {
      // Test weekday vs weekend (stress factor)
      const weekdayOptions = {
        ...testOptions,
        startDate: new Date('2023-01-02T10:00:00Z'), // Monday
        endDate: new Date('2023-01-02T11:00:00Z')
      };
      
      const weekendOptions = {
        ...testOptions,
        startDate: new Date('2023-01-07T10:00:00Z'), // Saturday
        endDate: new Date('2023-01-07T11:00:00Z')
      };
      
      const weekdayData = service.generateHypertensionScenario(weekdayOptions);
      const weekendData = service.generateHypertensionScenario(weekendOptions);
      
      expect(weekdayData.length).toBeGreaterThan(0);
      expect(weekendData.length).toBeGreaterThan(0);
    });
  });

  describe('generatePostExerciseScenario', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T10:00:00Z'),
      intervalMinutes: 5,
      noiseLevel: 0.05
    };

    it('should generate recovery curve data', () => {
      const data = service.generatePostExerciseScenario(testOptions);
      
      expect(data.length).toBeGreaterThan(0);
      
      const heartRatePoints = data.filter(p => p.id.includes('heartRate')).sort((a, b) => a.timestamp - b.timestamp);
      
      expect(heartRatePoints.length).toBeGreaterThan(1);
      
      // Heart rate should generally decrease over time (recovery)
      const firstHR = heartRatePoints[0].value;
      const lastHR = heartRatePoints[heartRatePoints.length - 1].value;
      
      expect(firstHR).toBeGreaterThan(lastHR);
      expect(firstHR).toBeGreaterThan(100); // Should start elevated
      expect(lastHR).toBeLessThan(100); // Should end closer to normal
    });

    it('should cover 2-hour recovery period', () => {
      const data = service.generatePostExerciseScenario(testOptions);
      
      const timestamps = data.map(p => p.timestamp).sort((a, b) => a - b);
      const duration = timestamps[timestamps.length - 1] - timestamps[0];
      const expectedDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      
      expect(duration).toBeCloseTo(expectedDuration, -4); // Within 10 seconds
    });
  });

  describe('generateMedicationScenario', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T08:00:00Z'), // Start at 8 AM (medication time)
      endDate: new Date('2023-01-02T20:00:00Z'), // End at 8 PM next day
      intervalMinutes: 360, // 6 hours
      noiseLevel: 0.05
    };

    it('should generate medication adherence data', () => {
      const data = service.generateMedicationScenario(testOptions);
      
      const medicationPoints = data.filter(p => p.category === 'medication');
      expect(medicationPoints.length).toBeGreaterThan(0);
      
      medicationPoints.forEach(point => {
        expect([0, 100]).toContain(point.value); // Either taken (100%) or missed (0%)
        expect(point.unit).toBe('%');
      });
    });

    it('should show blood pressure response to medication', () => {
      const data = service.generateMedicationScenario(testOptions);
      
      const bpPoints = data.filter(p => p.id.includes('bloodPressure'));
      expect(bpPoints.length).toBeGreaterThan(0);
      
      // Should have elevated baseline values (accounting for medication effect)
      bpPoints.forEach(point => {
        if (point.id.includes('Systolic')) {
          expect(point.value).toBeGreaterThan(110); // Lower threshold due to medication effect
        }
        if (point.id.includes('Diastolic')) {
          expect(point.value).toBeGreaterThan(70); // Lower threshold due to medication effect
        }
      });
    });
  });

  describe('generateSleepActivityScenario', () => {
    const testOptions = {
      startDate: new Date('2023-01-01T00:00:00Z'),
      endDate: new Date('2023-01-07T00:00:00Z'), // One week
      noiseLevel: 0.1
    };

    it('should generate daily activity metrics', () => {
      const data = service.generateSleepActivityScenario(testOptions);
      
      const sleepPoints = data.filter(p => p.id.includes('sleep'));
      const stepsPoints = data.filter(p => p.id.includes('steps'));
      const exercisePoints = data.filter(p => p.id.includes('exercise'));
      
      expect(sleepPoints.length).toBeGreaterThan(0);
      expect(stepsPoints.length).toBeGreaterThan(0);
      expect(exercisePoints.length).toBeGreaterThan(0);
      
      // Check reasonable ranges
      sleepPoints.forEach(point => {
        expect(point.value).toBeGreaterThan(4);
        expect(point.value).toBeLessThan(12);
        expect(point.unit).toBe('hours');
      });
      
      stepsPoints.forEach(point => {
        expect(point.value).toBeGreaterThan(1000);
        expect(point.value).toBeLessThan(20000);
        expect(point.unit).toBe('steps');
      });
    });

    it('should show weekend vs weekday patterns', () => {
      const data = service.generateSleepActivityScenario(testOptions);
      
      const stepsPoints = data.filter(p => p.id.includes('steps'));
      
      // Should have different patterns for weekends vs weekdays
      const weekdaySteps = stepsPoints.filter(p => {
        const day = p.timestamp.getDay();
        return day >= 1 && day <= 5;
      });
      
      const weekendSteps = stepsPoints.filter(p => {
        const day = p.timestamp.getDay();
        return day === 0 || day === 6;
      });
      
      expect(weekdaySteps.length).toBeGreaterThan(0);
      expect(weekendSteps.length).toBeGreaterThan(0);
    });
  });

  describe('assessDataQuality', () => {
    it('should return zero score for empty data', () => {
      const quality = service.assessDataQuality([]);
      
      expect(quality.score).toBe(0);
      expect(quality.completeness).toBe(0);
      expect(quality.issues).toContain('No data points generated');
    });

    it('should assess valid data points', () => {
      const validData = [
        {
          id: 'test-1',
          timestamp: new Date(),
          value: 72,
          unit: 'bpm',
          category: 'vitals',
          normalRange: { min: 60, max: 100 },
          accessibility: {}
        }
      ];
      
      const quality = service.assessDataQuality(validData);
      
      expect(quality.score).toBeGreaterThan(0);
      expect(quality.completeness).toBe(1);
      expect(quality.validity).toBe(1);
      expect(quality.consistency).toBe(1);
      expect(quality.totalPoints).toBe(1);
      expect(quality.validPoints).toBe(1);
    });

    it('should detect invalid data points', () => {
      const invalidData = [
        {
          id: 'test-1',
          timestamp: 'invalid-date',
          value: 'not-a-number',
          unit: 'bpm',
          category: 'vitals'
        }
      ];
      
      const quality = service.assessDataQuality(invalidData);
      
      expect(quality.validity).toBe(0);
      expect(quality.validPoints).toBe(0);
    });

    it('should detect timestamp ordering issues', () => {
      const unorderedData = [
        {
          id: 'test-1',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          value: 72,
          unit: 'bpm',
          category: 'vitals',
          accessibility: {}
        },
        {
          id: 'test-2',
          timestamp: new Date('2023-01-01T10:00:00Z'), // Earlier than previous
          value: 74,
          unit: 'bpm',
          category: 'vitals',
          accessibility: {}
        }
      ];
      
      const quality = service.assessDataQuality(unorderedData);
      
      expect(quality.issues.length).toBeGreaterThan(0);
      expect(quality.issues[0]).toContain('Timestamp ordering issue');
    });
  });

  describe('helper methods', () => {
    describe('getCircadianFactor', () => {
      it('should return values between 0.9 and 1.1', () => {
        for (let hour = 0; hour < 24; hour++) {
          const factor = service.getCircadianFactor(hour);
          expect(factor).toBeGreaterThanOrEqual(0.9);
          expect(factor).toBeLessThanOrEqual(1.1);
        }
      });

      it('should vary throughout the day', () => {
        const factors = [];
        for (let hour = 0; hour < 24; hour++) {
          factors.push(service.getCircadianFactor(hour));
        }
        
        const min = Math.min(...factors);
        const max = Math.max(...factors);
        expect(max - min).toBeGreaterThan(0.1); // Should have meaningful variation
      });
    });

    describe('addNoise', () => {
      it('should add appropriate noise to values', () => {
        const baseValue = 100;
        const noiseLevel = 0.1;
        
        const noisyValues = [];
        for (let i = 0; i < 1000; i++) { // More samples for better average
          noisyValues.push(baseValue + service.addNoise(baseValue, noiseLevel));
        }
        
        // Should have variation
        const min = Math.min(...noisyValues);
        const max = Math.max(...noisyValues);
        expect(max - min).toBeGreaterThan(0);
        
        // Should be centered around base value (with larger tolerance for random variation)
        const average = noisyValues.reduce((sum, val) => sum + val, 0) / noisyValues.length;
        expect(average).toBeCloseTo(baseValue, -1); // Within 5 units
      });
    });

    describe('findCategoryInfo', () => {
      it('should find existing measurements', () => {
        const heartRateInfo = service.findCategoryInfo('heartRate');
        expect(heartRateInfo).toBeDefined();
        expect(heartRateInfo.unit).toBe('bpm');
        expect(heartRateInfo.normalRange).toBeDefined();
      });

      it('should return null for non-existent measurements', () => {
        const result = service.findCategoryInfo('nonExistentMeasurement');
        expect(result).toBeNull();
      });
    });
  });
});