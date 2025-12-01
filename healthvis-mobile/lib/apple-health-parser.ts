/**
 * Apple Health Data Parser
 * 
 * Parses Apple Health export data (ZIP containing XML files)
 * Extracts vital signs: heart rate, glucose, steps, sleep
 */

import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { VitalSign, VitalSignType, DataRange } from '../types';

// ============================================================================
// Types
// ============================================================================

interface AppleHealthRecord {
  type: string;
  value: string;
  unit: string;
  startDate: string;
  endDate: string;
  sourceName?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Apple Health type identifiers
const HEALTH_TYPES = {
  HEART_RATE: 'HKQuantityTypeIdentifierHeartRate',
  BLOOD_GLUCOSE: 'HKQuantityTypeIdentifierBloodGlucose',
  STEPS: 'HKQuantityTypeIdentifierStepCount',
  SLEEP: 'HKCategoryTypeIdentifierSleepAnalysis',
} as const;

// Normal ranges for classification
const NORMAL_RANGES = {
  heart_rate: { min: 60, max: 100 },
  glucose: { min: 70, max: 140 },
  steps: { min: 0, max: Infinity },
  sleep: { min: 6, max: 9 },
} as const;

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse Apple Health export ZIP file
 * 
 * @param zipFile - ZIP file blob from Apple Health export
 * @returns Array of parsed vital signs
 */
export async function parseAppleHealthExport(zipFile: Blob): Promise<VitalSign[]> {
  try {
    console.log('📦 Unzipping Apple Health export...');
    
    // Convert Blob to ArrayBuffer for JSZip (required on React Native)
    // Use FileReader since Blob.arrayBuffer() is not available in React Native
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(zipFile);
    });
    
    console.log('✅ Converted to ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes');
    
    // Unzip the file
    const zip = await JSZip.loadAsync(arrayBuffer);
    console.log('✅ ZIP loaded successfully');
    
    // Find the export.xml file
    const exportXml = zip.file('apple_health_export/export.xml') || zip.file('export.xml');
    
    if (!exportXml) {
      throw new Error('export.xml not found in ZIP file');
    }
    
    console.log('📄 Reading export.xml...');
    const xmlContent = await exportXml.async('text');
    
    console.log('🔍 Parsing XML data...');
    const vitals = parseHealthXML(xmlContent);
    
    console.log(`✅ Parsed ${vitals.length} vital sign records`);
    return vitals;
    
  } catch (error) {
    console.error('❌ Error parsing Apple Health export:', error);
    throw new Error(`Failed to parse Apple Health data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// XML Parser
// ============================================================================

/**
 * Parse the export.xml content
 */
function parseHealthXML(xmlContent: string): VitalSign[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });
  
  const parsed = parser.parse(xmlContent);
  
  // Extract records from the parsed XML
  const records = extractRecords(parsed);
  
  // Convert to VitalSign format
  const vitals = records
    .map(record => convertToVitalSign(record))
    .filter((vital): vital is VitalSign => vital !== null);
  
  return vitals;
}

// ============================================================================
// Record Extraction
// ============================================================================

/**
 * Extract health records from parsed XML
 */
function extractRecords(parsed: any): AppleHealthRecord[] {
  const records: AppleHealthRecord[] = [];
  
  try {
    // Navigate to the Record elements
    const healthData = parsed.HealthData;
    if (!healthData) {
      return records;
    }
    
    const recordElements = healthData.Record;
    if (!recordElements) {
      return records;
    }
    
    // Handle both single record and array of records
    const recordArray = Array.isArray(recordElements) ? recordElements : [recordElements];
    
    for (const record of recordArray) {
      if (record && record.type) {
        records.push({
          type: record.type,
          value: record.value || '0',
          unit: record.unit || '',
          startDate: record.startDate || record.creationDate || '',
          endDate: record.endDate || record.startDate || '',
          sourceName: record.sourceName,
        });
      }
    }
  } catch (error) {
    console.error('Error extracting records:', error);
  }
  
  return records;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert Apple Health record to VitalSign
 */
function convertToVitalSign(record: AppleHealthRecord): VitalSign | null {
  // Map Apple Health type to our VitalSignType
  const vitalType = mapHealthType(record.type);
  if (!vitalType) {
    return null; // Skip unsupported types
  }
  
  // Parse value
  const value = parseFloat(record.value);
  if (isNaN(value)) {
    return null;
  }
  
  // Parse timestamp
  const timestamp = new Date(record.startDate);
  if (isNaN(timestamp.getTime())) {
    return null;
  }
  
  // Determine range classification
  const range = classifyRange(vitalType, value);
  
  // Get unit
  const unit = getUnitForVitalType(vitalType);
  
  return {
    type: vitalType,
    value,
    timestamp,
    unit,
    range,
  };
}

/**
 * Map Apple Health type identifier to our VitalSignType
 */
function mapHealthType(appleType: string): VitalSignType | null {
  switch (appleType) {
    case HEALTH_TYPES.HEART_RATE:
      return 'heart_rate';
    case HEALTH_TYPES.BLOOD_GLUCOSE:
      return 'glucose';
    case HEALTH_TYPES.STEPS:
      return 'steps';
    case HEALTH_TYPES.SLEEP:
      return 'sleep';
    default:
      return null;
  }
}

/**
 * Classify value into normal/warning/danger range
 */
function classifyRange(type: VitalSignType, value: number): DataRange {
  const ranges = NORMAL_RANGES[type];
  
  if (type === 'steps' || type === 'sleep') {
    // For steps and sleep, just use normal range
    return 'normal';
  }
  
  // For heart rate and glucose
  if (value < ranges.min * 0.8 || value > ranges.max * 1.2) {
    return 'danger';
  } else if (value < ranges.min || value > ranges.max) {
    return 'warning';
  } else {
    return 'normal';
  }
}

/**
 * Get unit string for vital type
 */
function getUnitForVitalType(type: VitalSignType): string {
  switch (type) {
    case 'heart_rate':
      return 'bpm';
    case 'glucose':
      return 'mg/dL';
    case 'steps':
      return 'steps';
    case 'sleep':
      return 'hours';
    default:
      return '';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate that a file is a valid Apple Health export
 */
export async function validateAppleHealthExport(zipFile: Blob): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // Check for export.xml in expected locations
    const hasExportXml = 
      zip.file('apple_health_export/export.xml') !== null ||
      zip.file('export.xml') !== null;
    
    return hasExportXml;
  } catch (error) {
    return false;
  }
}

/**
 * Get summary statistics from parsed vitals
 */
export function getVitalsSummary(vitals: VitalSign[]): {
  totalRecords: number;
  byType: Record<VitalSignType, number>;
  dateRange: { start: Date; end: Date } | null;
} {
  const byType: Record<VitalSignType, number> = {
    heart_rate: 0,
    glucose: 0,
    steps: 0,
    sleep: 0,
  };
  
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  
  for (const vital of vitals) {
    byType[vital.type]++;
    
    if (!minDate || vital.timestamp < minDate) {
      minDate = vital.timestamp;
    }
    if (!maxDate || vital.timestamp > maxDate) {
      maxDate = vital.timestamp;
    }
  }
  
  return {
    totalRecords: vitals.length,
    byType,
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
  };
}
