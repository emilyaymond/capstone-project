/**
 * Shared TypeScript types for HealthVis Expo application
 */

// ============================================================================
// Health Metric Types (Unified Model)
// ============================================================================

// Export all health metric types from the unified model
export * from './health-metric';

// ============================================================================
// Accessibility Types
// ============================================================================


// Accessibility mode options for the application
export type AccessibilityMode = 'visual' | 'audio' | 'hybrid' | 'simplified';


// User accessibility settings
export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large';
  contrast: 'normal' | 'high';
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}

// ============================================================================
// Health Data Types
// ============================================================================


// Type of vital sign measurement
export type VitalSignType = 'heart_rate' | 'glucose' | 'steps' | 'sleep';


// Data range classification
export type DataRange = 'normal' | 'warning' | 'danger';


// A single vital sign measurement
export interface VitalSign {
  type: VitalSignType;
  value: number;
  timestamp: Date;
  unit: string;
  range: DataRange;
}


// A single data point in a time series
export interface DataPoint {
  value: number;
  timestamp: Date;
  range: DataRange;
}


// Chart type options
export type ChartType = 'line' | 'bar' | 'area';


// Chart data structure for visualization
export interface ChartData {
  type: ChartType;
  data: DataPoint[];
  xLabel: string;
  yLabel: string;
  title: string;
}

// ============================================================================
// Backend API Types
// ============================================================================


// Request payload for health data analysis
export interface AnalysisRequest {
  data: Record<string, any>;
}


// Chart suggestion from backend
export interface ChartSuggestion {
  suggestion: string;
  type: string;
}

/**
 * Analysis result from backend
 */
export interface Analysis {
  analysis: string;
  model_used: string;
  usage: any;
}

/**
 * Response from health data analysis endpoint
 */
export interface AnalysisResponse {
  analysis: Analysis;
  chart_suggestions: ChartSuggestion[];
  status: string;
}

/**
 * Request payload for AI chat
 */
export interface ChatRequest {
  message: string;
  data?: Record<string, any>;
  context?: string;
}

/**
 * Response from AI chat endpoint
 */
export interface ChatResponse {
  response: string;
  suggestions?: Array<Record<string, any>>;
  analysis?: Record<string, any>;
}

/**
 * Response from file upload endpoint
 */
export interface UploadDataResponse {
  filename: string;
  analysis: Analysis;
  chart_suggestions: ChartSuggestion[];
  data_preview: any[];
  status: string;
}

// ============================================================================
// Sonification Types
// ============================================================================

/**
 * Frequency band for sonification
 */
export type FrequencyBand = 'low' | 'medium' | 'high';

/**
 * Sonification parameters from backend
 */
export interface SonificationParams {
  band: FrequencyBand;
  duration: number;
}
