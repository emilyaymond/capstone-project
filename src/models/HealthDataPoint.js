/**
 * Health Data Point Model
 * Represents a single health data measurement with accessibility metadata
 */

/**
 * @typedef {Object} NormalRange
 * @property {number} min - Minimum normal value
 * @property {number} max - Maximum normal value
 */

/**
 * @typedef {Object} AccessibilityMetadata
 * @property {string} audioDescription - Detailed audio description for screen readers
 * @property {string} simplifiedValue - Simplified representation for cognitive accessibility
 * @property {'rising'|'falling'|'stable'} trendIndicator - Trend direction for audio cues
 * @property {string} contextualDescription - Additional context for understanding the value
 */

/**
 * @typedef {Object} HealthDataPoint
 * @property {string} id - Unique identifier for the data point
 * @property {Date} timestamp - When the measurement was taken
 * @property {number} value - The measured value
 * @property {string} unit - Unit of measurement (e.g., 'bpm', 'mmHg', 'mg/dL')
 * @property {'vitals'|'symptoms'|'medication'|'activity'} category - Data category
 * @property {NormalRange} [normalRange] - Optional normal range for the measurement
 * @property {string} [description] - Optional human-readable description
 * @property {AccessibilityMetadata} accessibility - Accessibility-specific metadata
 */

/**
 * Health data categories with their typical units and ranges
 */
export const HEALTH_DATA_CATEGORIES = {
  vitals: {
    heartRate: { unit: 'bpm', normalRange: { min: 60, max: 100 } },
    bloodPressureSystolic: { unit: 'mmHg', normalRange: { min: 90, max: 140 } },
    bloodPressureDiastolic: { unit: 'mmHg', normalRange: { min: 60, max: 90 } },
    temperature: { unit: '°F', normalRange: { min: 97.0, max: 99.5 } },
    oxygenSaturation: { unit: '%', normalRange: { min: 95, max: 100 } },
    respiratoryRate: { unit: 'breaths/min', normalRange: { min: 12, max: 20 } }
  },
  symptoms: {
    pain: { unit: 'scale 1-10', normalRange: { min: 0, max: 3 } },
    fatigue: { unit: 'scale 1-10', normalRange: { min: 0, max: 3 } },
    nausea: { unit: 'scale 1-10', normalRange: { min: 0, max: 2 } }
  },
  medication: {
    dosage: { unit: 'mg', normalRange: null },
    adherence: { unit: '%', normalRange: { min: 80, max: 100 } }
  },
  activity: {
    steps: { unit: 'steps', normalRange: { min: 8000, max: 12000 } },
    sleep: { unit: 'hours', normalRange: { min: 7, max: 9 } },
    exercise: { unit: 'minutes', normalRange: { min: 30, max: 60 } }
  }
};

/**
 * Creates a new HealthDataPoint with proper validation and accessibility metadata
 * @param {Object} data - Raw data for the health data point
 * @returns {HealthDataPoint} Validated health data point
 * @throws {Error} If validation fails
 */
export function createHealthDataPoint(data) {
  const validated = validateHealthDataPoint(data);
  return {
    ...validated,
    accessibility: generateAccessibilityMetadata(validated)
  };
}

/**
 * Validates health data point structure and values
 * @param {Object} data - Raw health data
 * @returns {Object} Validated data
 * @throws {Error} If validation fails
 */
export function validateHealthDataPoint(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Health data point must be an object');
  }

  const { id, timestamp, value, unit, category } = data;

  // Required field validation
  if (!id || typeof id !== 'string') {
    throw new Error('Health data point must have a valid string ID');
  }

  if (!timestamp || !(timestamp instanceof Date) && !Date.parse(timestamp)) {
    throw new Error('Health data point must have a valid timestamp');
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Health data point must have a valid numeric value');
  }

  if (!unit || typeof unit !== 'string') {
    throw new Error('Health data point must have a valid unit string');
  }

  if (!category || !['vitals', 'symptoms', 'medication', 'activity'].includes(category)) {
    throw new Error('Health data point must have a valid category');
  }

  // Normalize timestamp to Date object
  const normalizedTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return {
    id,
    timestamp: normalizedTimestamp,
    value,
    unit,
    category,
    normalRange: data.normalRange || null,
    description: data.description || null
  };
}

/**
 * Generates accessibility metadata for a health data point
 * @param {Object} dataPoint - Validated health data point
 * @returns {AccessibilityMetadata} Accessibility metadata
 */
export function generateAccessibilityMetadata(dataPoint) {
  const { value, unit, category, normalRange, timestamp } = dataPoint;
  
  // Generate audio description
  const timeStr = timestamp.toLocaleTimeString();
  const dateStr = timestamp.toLocaleDateString();
  let audioDescription = `${category} measurement: ${value} ${unit} recorded on ${dateStr} at ${timeStr}`;
  
  // Add normal range context if available
  if (normalRange) {
    const isNormal = value >= normalRange.min && value <= normalRange.max;
    const rangeStatus = isNormal ? 'within normal range' : 'outside normal range';
    audioDescription += `. This value is ${rangeStatus} of ${normalRange.min} to ${normalRange.max} ${unit}`;
  }

  // Generate simplified value
  let simplifiedValue = `${value} ${unit}`;
  if (normalRange) {
    const isHigh = value > normalRange.max;
    const isLow = value < normalRange.min;
    if (isHigh) simplifiedValue += ' (High)';
    else if (isLow) simplifiedValue += ' (Low)';
    else simplifiedValue += ' (Normal)';
  }

  // Generate trend indicator (placeholder - would be calculated from historical data)
  const trendIndicator = 'stable'; // This would be calculated from previous values

  // Generate contextual description
  let contextualDescription = `${category} reading`;
  if (normalRange) {
    const percentOfRange = ((value - normalRange.min) / (normalRange.max - normalRange.min)) * 100;
    if (percentOfRange <= 25) contextualDescription += ', on the lower end';
    else if (percentOfRange >= 75) contextualDescription += ', on the higher end';
    else contextualDescription += ', in the middle range';
  }

  return {
    audioDescription,
    simplifiedValue,
    trendIndicator,
    contextualDescription
  };
}

/**
 * Transforms health data for accessibility-focused display
 * @param {HealthDataPoint[]} dataPoints - Array of health data points
 * @param {Object} options - Transformation options
 * @returns {Object} Transformed data for accessibility
 */
export function transformForAccessibility(dataPoints, options = {}) {
  const {
    groupByCategory = false,
    includeAudioDescriptions = true,
    simplifyValues = false
  } = options;

  let transformed = dataPoints.map(point => ({
    ...point,
    displayValue: simplifyValues ? point.accessibility.simplifiedValue : `${point.value} ${point.unit}`,
    audioDescription: includeAudioDescriptions ? point.accessibility.audioDescription : null
  }));

  if (groupByCategory) {
    const grouped = {};
    transformed.forEach(point => {
      if (!grouped[point.category]) {
        grouped[point.category] = [];
      }
      grouped[point.category].push(point);
    });
    return grouped;
  }

  return transformed;
}

/**
 * Calculates trend information for a series of health data points
 * @param {HealthDataPoint[]} dataPoints - Array of data points (should be sorted by timestamp)
 * @returns {Object} Trend analysis
 */
export function calculateTrend(dataPoints) {
  if (!dataPoints || dataPoints.length < 2) {
    return { trend: 'insufficient-data', description: 'Not enough data to determine trend' };
  }

  const values = dataPoints.map(point => point.value);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const percentChange = (change / firstValue) * 100;

  let trend;
  let description;

  if (Math.abs(percentChange) < 5) {
    trend = 'stable';
    description = 'Values have remained relatively stable';
  } else if (change > 0) {
    trend = 'rising';
    description = `Values have increased by ${Math.abs(percentChange).toFixed(1)}%`;
  } else {
    trend = 'falling';
    description = `Values have decreased by ${Math.abs(percentChange).toFixed(1)}%`;
  }

  return {
    trend,
    description,
    change,
    percentChange: percentChange.toFixed(1),
    firstValue,
    lastValue,
    dataPointCount: dataPoints.length
  };
}