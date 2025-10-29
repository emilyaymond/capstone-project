import {
  createHealthDataPoint,
  validateHealthDataPoint,
  generateAccessibilityMetadata,
  transformForAccessibility,
  calculateTrend,
  HEALTH_DATA_CATEGORIES
} from '../HealthDataPoint';

describe('HealthDataPoint Model', () => {
  const validHealthData = {
    id: 'test-1',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    value: 72,
    unit: 'bpm',
    category: 'vitals',
    normalRange: { min: 60, max: 100 },
    description: 'Resting heart rate'
  };

  describe('createHealthDataPoint', () => {
    it('should create a valid health data point with accessibility metadata', () => {
      const result = createHealthDataPoint(validHealthData);
      
      expect(result).toHaveProperty('id', 'test-1');
      expect(result).toHaveProperty('value', 72);
      expect(result).toHaveProperty('unit', 'bpm');
      expect(result).toHaveProperty('category', 'vitals');
      expect(result).toHaveProperty('accessibility');
      expect(result.accessibility).toHaveProperty('audioDescription');
      expect(result.accessibility).toHaveProperty('simplifiedValue');
      expect(result.accessibility).toHaveProperty('trendIndicator');
      expect(result.accessibility).toHaveProperty('contextualDescription');
    });

    it('should throw error for invalid data', () => {
      expect(() => createHealthDataPoint(null)).toThrow();
      expect(() => createHealthDataPoint({})).toThrow();
      expect(() => createHealthDataPoint({ id: 'test' })).toThrow();
    });
  });

  describe('validateHealthDataPoint', () => {
    it('should validate required fields', () => {
      const result = validateHealthDataPoint(validHealthData);
      expect(result.id).toBe('test-1');
      expect(result.value).toBe(72);
      expect(result.unit).toBe('bpm');
      expect(result.category).toBe('vitals');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error for missing required fields', () => {
      expect(() => validateHealthDataPoint({})).toThrow('must have a valid string ID');
      expect(() => validateHealthDataPoint({ id: 'test' })).toThrow('must have a valid timestamp');
      expect(() => validateHealthDataPoint({ 
        id: 'test', 
        timestamp: new Date() 
      })).toThrow('must have a valid numeric value');
    });

    it('should throw error for invalid field types', () => {
      expect(() => validateHealthDataPoint({
        id: 123,
        timestamp: new Date(),
        value: 72,
        unit: 'bpm',
        category: 'vitals'
      })).toThrow('must have a valid string ID');

      expect(() => validateHealthDataPoint({
        id: 'test',
        timestamp: 'invalid-date',
        value: 72,
        unit: 'bpm',
        category: 'vitals'
      })).toThrow('must have a valid timestamp');

      expect(() => validateHealthDataPoint({
        id: 'test',
        timestamp: new Date(),
        value: 'not-a-number',
        unit: 'bpm',
        category: 'vitals'
      })).toThrow('must have a valid numeric value');
    });

    it('should throw error for invalid category', () => {
      expect(() => validateHealthDataPoint({
        id: 'test',
        timestamp: new Date(),
        value: 72,
        unit: 'bpm',
        category: 'invalid-category'
      })).toThrow('must have a valid category');
    });

    it('should handle string timestamps', () => {
      const data = {
        ...validHealthData,
        timestamp: '2023-01-01T10:00:00Z'
      };
      const result = validateHealthDataPoint(data);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('generateAccessibilityMetadata', () => {
    it('should generate complete accessibility metadata', () => {
      const metadata = generateAccessibilityMetadata(validHealthData);
      
      expect(metadata.audioDescription).toContain('vitals measurement');
      expect(metadata.audioDescription).toContain('72 bpm');
      expect(metadata.audioDescription).toContain('within normal range');
      expect(metadata.simplifiedValue).toBe('72 bpm (Normal)');
      expect(metadata.trendIndicator).toBe('stable');
      expect(metadata.contextualDescription).toContain('vitals reading');
    });

    it('should handle data without normal range', () => {
      const dataWithoutRange = { ...validHealthData };
      delete dataWithoutRange.normalRange;
      
      const metadata = generateAccessibilityMetadata(dataWithoutRange);
      expect(metadata.audioDescription).not.toContain('normal range');
      expect(metadata.simplifiedValue).toBe('72 bpm');
    });

    it('should identify high values', () => {
      const highValueData = {
        ...validHealthData,
        value: 120,
        normalRange: { min: 60, max: 100 }
      };
      
      const metadata = generateAccessibilityMetadata(highValueData);
      expect(metadata.audioDescription).toContain('outside normal range');
      expect(metadata.simplifiedValue).toContain('(High)');
    });

    it('should identify low values', () => {
      const lowValueData = {
        ...validHealthData,
        value: 45,
        normalRange: { min: 60, max: 100 }
      };
      
      const metadata = generateAccessibilityMetadata(lowValueData);
      expect(metadata.audioDescription).toContain('outside normal range');
      expect(metadata.simplifiedValue).toContain('(Low)');
    });

    it('should provide contextual descriptions based on range position', () => {
      const lowEndData = { ...validHealthData, value: 65 }; // 12.5% of range (60-100)
      const highEndData = { ...validHealthData, value: 95 }; // 87.5% of range
      
      const lowMetadata = generateAccessibilityMetadata(lowEndData);
      const highMetadata = generateAccessibilityMetadata(highEndData);
      
      expect(lowMetadata.contextualDescription).toContain('lower end');
      expect(highMetadata.contextualDescription).toContain('higher end');
    });
  });

  describe('transformForAccessibility', () => {
    const sampleData = [
      createHealthDataPoint({
        id: 'hr-1',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        value: 72,
        unit: 'bpm',
        category: 'vitals'
      }),
      createHealthDataPoint({
        id: 'temp-1',
        timestamp: new Date('2023-01-01T10:05:00Z'),
        value: 98.6,
        unit: '°F',
        category: 'vitals'
      }),
      createHealthDataPoint({
        id: 'pain-1',
        timestamp: new Date('2023-01-01T10:10:00Z'),
        value: 3,
        unit: 'scale 1-10',
        category: 'symptoms'
      })
    ];

    it('should transform data with default options', () => {
      const result = transformForAccessibility(sampleData);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('displayValue');
      expect(result[0]).toHaveProperty('audioDescription');
      expect(result[0].displayValue).toBe('72 bpm');
    });

    it('should group by category when requested', () => {
      const result = transformForAccessibility(sampleData, { groupByCategory: true });
      
      expect(result).toHaveProperty('vitals');
      expect(result).toHaveProperty('symptoms');
      expect(result.vitals).toHaveLength(2);
      expect(result.symptoms).toHaveLength(1);
    });

    it('should simplify values when requested', () => {
      const result = transformForAccessibility(sampleData, { simplifyValues: true });
      
      expect(result[0].displayValue).toContain('bpm');
      // Should use simplified value from accessibility metadata
    });

    it('should exclude audio descriptions when requested', () => {
      const result = transformForAccessibility(sampleData, { includeAudioDescriptions: false });
      
      expect(result[0].audioDescription).toBeNull();
    });
  });

  describe('calculateTrend', () => {
    it('should return insufficient data for empty or single point arrays', () => {
      expect(calculateTrend([])).toEqual({
        trend: 'insufficient-data',
        description: 'Not enough data to determine trend'
      });
      
      expect(calculateTrend([validHealthData])).toEqual({
        trend: 'insufficient-data',
        description: 'Not enough data to determine trend'
      });
    });

    it('should identify stable trends', () => {
      const stableData = [
        { ...validHealthData, value: 72 },
        { ...validHealthData, value: 74 },
        { ...validHealthData, value: 73 }
      ];
      
      const result = calculateTrend(stableData);
      expect(result.trend).toBe('stable');
      expect(result.description).toContain('stable');
    });

    it('should identify rising trends', () => {
      const risingData = [
        { ...validHealthData, value: 70 },
        { ...validHealthData, value: 75 },
        { ...validHealthData, value: 80 }
      ];
      
      const result = calculateTrend(risingData);
      expect(result.trend).toBe('rising');
      expect(result.description).toContain('increased');
      expect(result.change).toBe(10);
      expect(result.firstValue).toBe(70);
      expect(result.lastValue).toBe(80);
    });

    it('should identify falling trends', () => {
      const fallingData = [
        { ...validHealthData, value: 80 },
        { ...validHealthData, value: 75 },
        { ...validHealthData, value: 70 }
      ];
      
      const result = calculateTrend(fallingData);
      expect(result.trend).toBe('falling');
      expect(result.description).toContain('decreased');
      expect(result.change).toBe(-10);
    });

    it('should calculate percentage changes correctly', () => {
      const data = [
        { ...validHealthData, value: 100 },
        { ...validHealthData, value: 110 }
      ];
      
      const result = calculateTrend(data);
      expect(result.percentChange).toBe('10.0');
    });
  });

  describe('HEALTH_DATA_CATEGORIES', () => {
    it('should contain all expected categories', () => {
      expect(HEALTH_DATA_CATEGORIES).toHaveProperty('vitals');
      expect(HEALTH_DATA_CATEGORIES).toHaveProperty('symptoms');
      expect(HEALTH_DATA_CATEGORIES).toHaveProperty('medication');
      expect(HEALTH_DATA_CATEGORIES).toHaveProperty('activity');
    });

    it('should have proper structure for each category', () => {
      Object.values(HEALTH_DATA_CATEGORIES).forEach(category => {
        Object.values(category).forEach(measurement => {
          expect(measurement).toHaveProperty('unit');
          expect(typeof measurement.unit).toBe('string');
          // normalRange can be null for some measurements
          if (measurement.normalRange) {
            expect(measurement.normalRange).toHaveProperty('min');
            expect(measurement.normalRange).toHaveProperty('max');
          }
        });
      });
    });
  });
});