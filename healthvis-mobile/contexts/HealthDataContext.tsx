/**
 * HealthDataContext
 * 
 * Manages health data state and backend communication.
 * Provides functions for fetching data, uploading files, requesting analysis, and AI chat.
 * Includes loading/error state management, caching for offline support, and accessibility integration.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnalysisResponse,
  ChatResponse,
  HealthMetric,
  HealthMetricType,
  HealthCategory,
  CategorizedHealthData,
} from '../types';
import {
  analyzeData as apiAnalyzeData,
  chatWithAI as apiChatWithAI,
  APIError,
} from '../lib/api-client';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { useSpeech } from '../hooks/useSpeech';
import { announceSuccess, announceError, announceHealthKitFetch, announcePermissionError } from '../lib/announcer';
import { 
  healthKitService, 
  PermissionStatus, 
  FetchOptions 
} from '../lib/healthkit-service';
import { getMetricAggregation, getMetricChartKind } from "@/app/metric/metricConfig";


// ============================================================================
// Storage Keys
// ============================================================================

const CACHE_KEYS = {
  HEALTH_METRICS: 'health_data_metrics',
  LAST_ANALYSIS: 'health_data_last_analysis',
  LAST_FETCH: 'health_data_last_fetch',
} as const;

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

// ============================================================================
// Context Value Interface
// ============================================================================

export interface HealthDataContextValue {
  healthMetrics: CategorizedHealthData;
  permissions: PermissionStatus | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  fetchData: () => Promise<void>;
  requestAnalysis: (data: Record<string, any>) => Promise<AnalysisResponse>;
  requestChat: (message: string, context?: any) => Promise<ChatResponse>;
  clearError: () => void;
  refreshData: () => Promise<void>;
  getMetricsByCategory: (category: HealthCategory) => HealthMetric[];
  getMetricsByType: (type: HealthMetricType) => HealthMetric[];
  getMetricsByDateRange: (startDate: Date, endDate: Date) => HealthMetric[];
  getMetricSeries: (type: HealthMetricType, range: "day" | "week" | "month") => {
    points: HealthMetric[];
    chart: "line" | "bar";
    aggregation: "avg" | "sum" | "latest";
  };
}

// ============================================================================
// Context Creation
// ============================================================================

const HealthDataContext = createContext<HealthDataContextValue | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface HealthDataProviderProps {
  children: ReactNode;
}


type TimeRangeKey = "day" | "week" | "month";

function getRangeCutoff(range: TimeRangeKey) {
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "day") cutoff.setDate(now.getDate() - 1);
  if (range === "week") cutoff.setDate(now.getDate() - 7);
  if (range === "month") cutoff.setMonth(now.getMonth() - 1);
  return cutoff;
}

function getBucketSizeMs(range: TimeRangeKey) {
  if (range === "day") return 60 * 60 * 1000; // hourly
  return 24 * 60 * 60 * 1000; // daily for week/month
}

function aggregateBucket(metrics: HealthMetric[], aggregation: "avg" | "sum" | "latest") {
  const values = metrics.map(m => Number(m.value)).filter(Number.isFinite);
  if (!values.length) return 0;

  if (aggregation === "sum") return values.reduce((a, b) => a + b, 0);
  if (aggregation === "latest") return Number(metrics[metrics.length - 1]?.value ?? 0);
  return values.reduce((a, b) => a + b, 0) / values.length; // avg
}

function bucketize(
  data: HealthMetric[],
  bucketSize: number,
  aggregation: "avg" | "sum" | "latest"
): HealthMetric[] {
  const buckets = new Map<number, HealthMetric[]>();

  for (const m of data) {
    const t = m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp as any).getTime();
    const key = Math.floor(t / bucketSize) * bucketSize;
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }

  const out: HealthMetric[] = [];
  for (const [key, arr] of buckets.entries()) {
    // keep deterministic ordering within bucket
    arr.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const value = aggregateBucket(arr, aggregation);
    const range =
      arr.some(x => x.range === "danger") ? "danger" :
      arr.some(x => x.range === "warning") ? "warning" : "normal";

    out.push({
      ...arr[0],
      value: Math.round(value),
      timestamp: new Date(key),
      range,
    });
  }

  out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return out;
}

// ============================================================================
// Provider Component
// ============================================================================

export function HealthDataProvider({ children }: HealthDataProviderProps) {
  const [healthMetrics, setHealthMetrics] = useState<CategorizedHealthData>({
    vitals: [],
    activity: [],
    body: [],
    nutrition: [],
    sleep: [],
    mindfulness: [],
  });

  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Accessibility hooks for feedback
  const audio = useAudio();
  const haptics = useHaptics();
  const speech = useSpeech();

  // ============================================================================
  // Cache Management Functions
  // ============================================================================

  /**
   * Save health metrics to cache (new format)
   */
  async function saveHealthMetricsToCache(metrics: CategorizedHealthData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.HEALTH_METRICS,
        JSON.stringify({
          data: metrics,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to save health metrics to cache:', error);
    }
  }

  /**
   * Load health metrics from cache (new format)
   */
  async function loadHealthMetricsFromCache(): Promise<CategorizedHealthData | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.HEALTH_METRICS);
      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_EXPIRATION_MS) {
        return null;
      }

      // Parse dates in all metrics
      const parsedData: CategorizedHealthData = {
        vitals: [],
        activity: [],
        body: [],
        nutrition: [],
        sleep: [],
        mindfulness: [],
      };

      for (const category of Object.keys(data) as Array<keyof CategorizedHealthData>) {
        parsedData[category] = data[category].map((metric: any) => ({
          ...metric,
          timestamp: new Date(metric.timestamp),
        }));
      }

      return parsedData;
    } catch (error) {
      console.error('Failed to load health metrics from cache:', error);
      return null;
    }
  }


  /**
   * Migrate existing VitalSign cache data to HealthMetric format
   * This ensures backwards compatibility with existing cached data
   * 
   * Requirements: 9.1, 9.3, 9.4, 9.5
   */
  async function migrateVitalSignCache(): Promise<void> {
    try {
      // Check if we have old VitalSign cache to clean up
      const oldCache = await AsyncStorage.getItem('health_data_vitals');
      if (oldCache) {
        console.log('Removing old VitalSign cache...');
        await AsyncStorage.removeItem('health_data_vitals');
        console.log('✅ Old VitalSign cache removed');
      }
    } catch (error) {
      console.error('Failed to clean up old VitalSign cache:', error);
      // Don't throw - cleanup failure shouldn't break the app
    }
  }

  /**
   * Save analysis response to cache
   */
  async function saveAnalysisToCache(analysis: AnalysisResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.LAST_ANALYSIS,
        JSON.stringify({
          data: analysis,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to save analysis to cache:', error);
    }
  }

  // ============================================================================
  // Fetch Data Function (Requirement 10.1, 10.7, 4.1, 4.2, 9.2)
  // ============================================================================

  /**
   * Fetches health data from HealthKit with cache-first loading for offline support
   * Implements comprehensive data fetching across all health categories
   * 
   * Includes robust error handling with retry logic and fallback to cached data.
   * 
   * Requirements: 10.1, 10.7, 4.1, 4.2, 9.2, 6.3, 6.5
   */
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize HealthKit if not already initialized
      if (!isInitialized) {
        console.log('Initializing HealthKit...');
        announceHealthKitFetch(); // Announce we're fetching data
        
        try {
          const permStatus = await healthKitService.initializeHealthKit();
          setPermissions(permStatus);
          setIsInitialized(true);
          console.log('HealthKit initialized with permissions:', permStatus);
          
          // Check if any permissions were denied
          if (!permStatus.allGranted) {
            const deniedCategories: string[] = [];
            if (!permStatus.categoryStatus.vitals) deniedCategories.push('vitals');
            if (!permStatus.categoryStatus.activity) deniedCategories.push('activity');
            if (!permStatus.categoryStatus.body) deniedCategories.push('body');
            if (!permStatus.categoryStatus.nutrition) deniedCategories.push('nutrition');
            if (!permStatus.categoryStatus.sleep) deniedCategories.push('sleep');
            if (!permStatus.categoryStatus.mindfulness) deniedCategories.push('mindfulness');
            
            if (deniedCategories.length > 0) {
              announcePermissionError(deniedCategories.join(', '), true);
            }
          }
        } catch (initError) {
          console.error('HealthKit initialization failed:', initError);
          // Continue with cached data if available
          const cachedMetrics = await loadHealthMetricsFromCache();
          if (cachedMetrics && Object.values(cachedMetrics).some(cat => cat.length > 0)) {
            setHealthMetrics(cachedMetrics);
            announceSuccess('Using cached health data');
          } else {
            throw initError; // Re-throw if no cached data available
          }
          setIsLoading(false);
          return;
        }
      }

      // Load from cache first for offline support (cache-first loading)
      const cachedMetrics = await loadHealthMetricsFromCache();
      if (cachedMetrics) {
        setHealthMetrics(cachedMetrics);
        console.log('✅ Loaded health metrics from cache');
      }

      // Load data range preference (default to 30 days)
      let daysToFetch = 30;
      try {
        const rangeStr = await AsyncStorage.getItem('health_data_range');
        if (rangeStr) {
          daysToFetch = parseInt(rangeStr, 10);
        }
      } catch (error) {
        console.error('Failed to load data range preference:', error);
      }

      // Fetch fresh data from HealthKit with configured range
      const fetchOptions: FetchOptions = {
        startDate: new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 1000, // Reasonable limit for performance
      };

      console.log(`Fetching fresh data from HealthKit (last ${daysToFetch} days)...`);
      
      try {
        const freshMetrics = await healthKitService.fetchAllHealthData(fetchOptions);
        
        // Update state with fresh data
        setHealthMetrics(freshMetrics);
        
        // Save to cache
        await saveHealthMetricsToCache(freshMetrics);
        
        // Calculate total metrics fetched
        const totalMetrics = Object.values(freshMetrics).reduce(
          (sum, category) => sum + category.length, 
          0
        );
        
        console.log(`✅ Fetched ${totalMetrics} health metrics from HealthKit`);
        
        // Announce success with count
        announceHealthKitFetch(undefined, totalMetrics);
        
        // Trigger haptic feedback for successful data load
        if (totalMetrics > 0) {
          // Check if any metrics are in danger or warning range
          const allMetricsArray = Object.values(freshMetrics).flat();
          const hasDanger = allMetricsArray.some(m => m.range === 'danger');
          const hasWarning = allMetricsArray.some(m => m.range === 'warning');
          
          if (hasDanger) {
            haptics.triggerHeavy();
          } else if (hasWarning) {
            haptics.triggerMedium();
          } else {
            haptics.triggerLight();
          }
        }
      } catch (fetchError) {
        console.error('Error fetching fresh data from HealthKit:', fetchError);
        
        // Fall back to cached data if available
        if (cachedMetrics && Object.values(cachedMetrics).some(cat => cat.length > 0)) {
          console.log('Using cached data due to fetch failure');
          announceSuccess('Using cached health data');
          // Don't set error state since we have cached data
        } else {
          // No cached data available, set error
          throw fetchError;
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching health data:', err);
      
      // Trigger error haptic feedback
      haptics.triggerHeavy();
      
      // Try to use cached data if available (last resort)
      const cachedMetrics = await loadHealthMetricsFromCache();
      if (!cachedMetrics || Object.values(cachedMetrics).every(cat => cat.length === 0)) {
        // No cached data available, show error
        const errorMessage = err instanceof Error ? err : new Error('Failed to fetch data');
        setError(errorMessage);

        // Announce error to screen readers with specific message
        if (err instanceof Error && err.message.includes('permission')) {
          announcePermissionError();
        } else {
          announceError('Failed to load health data from HealthKit');
        }
        
        // Play error sound
        await audio.playErrorSound();
      } else {
        // We have cached data, just log the error
        console.log('HealthKit unavailable, using cached data');
        announceSuccess('Using cached health data');
      }
      
      setIsLoading(false);
    }
  }, [isInitialized, audio, haptics]);

  // ============================================================================
  // Request Analysis Function (Requirement 10.1, 10.2)
  // ============================================================================

  /**
   * Requests AI-powered analysis of health data
   * Triggers appropriate accessibility feedback based on insights
   */
  const requestAnalysis = useCallback(
    async (data: Record<string, any>): Promise<AnalysisResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        // Call API client to analyze data
        const response = await apiAnalyzeData(data);

        // Cache the analysis
        await saveAnalysisToCache(response);

        // Trigger accessibility outputs (Requirement 10.8)
        await triggerAccessibilityOutputs(response.analysis.analysis);

        // Announce success
        announceSuccess('Analysis complete');
        await audio.playSuccessSound();

        setIsLoading(false);
        return response;
      } catch (err) {
        const errorMessage = err instanceof APIError ? err : new Error('Failed to analyze data');
        setError(errorMessage);
        setIsLoading(false);

        // Announce error
        announceError('Failed to analyze data');
        await audio.playErrorSound();

        throw errorMessage;
      }
    },
    [audio]
  );

  // ============================================================================
  // Request Chat Function (Requirement 10.3)
  // ============================================================================

  /**
   * Sends a message to the AI chat assistant
   * Optionally includes health data context
   */
  const requestChat = useCallback(
    async (message: string, context?: any): Promise<ChatResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        // Prepare data context (include current health metrics if available)
        const dataContext = context || (Object.values(healthMetrics).some(cat => cat.length > 0) ? { healthMetrics } : undefined);

        // Call API client for chat
        const response = await apiChatWithAI(message, dataContext);

        // Announce success
        announceSuccess('Response received');
        await audio.playClickSound();

        setIsLoading(false);
        return response;
      } catch (err) {
        const errorMessage = err instanceof APIError ? err : new Error('Failed to chat with AI');
        setError(errorMessage);
        setIsLoading(false);

        // Announce error
        announceError('Failed to get AI response');
        await audio.playErrorSound();

        throw errorMessage;
      }
    },
    [audio, healthMetrics]
  );

  // ============================================================================
  // Clear Error Function
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Refresh Data Function
  // ============================================================================

  /**
   * Forces a refresh of health data, bypassing cache
   * Requirements: 7.1, 7.4
   */
  const refreshData = useCallback(async (): Promise<void> => {
    // Clear cache
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.HEALTH_METRICS);
      console.log('✅ Cache cleared for refresh');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }

    // Fetch fresh data from HealthKit
    await fetchData();
  }, [fetchData]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Triggers appropriate TTS, haptics, or sonification based on backend responses
   * Requirement 10.8: Backend insights trigger accessibility outputs
   */
  async function triggerAccessibilityOutputs(
    analysisText: string
  ): Promise<void> {
    try {
      // Get all metrics to check ranges
      const allMetrics = Object.values(healthMetrics).flat();
      
      // Trigger haptic feedback based on data ranges
      if (allMetrics.length > 0) {
        // Find the most severe range in the data
        const hasDanger = allMetrics.some(m => m.range === 'danger');
        const hasWarning = allMetrics.some(m => m.range === 'warning');

        if (hasDanger) {
          haptics.triggerHeavy();
        } else if (hasWarning) {
          haptics.triggerMedium();
        } else {
          haptics.triggerLight();
        }
      }

      // Optionally speak a summary of the analysis
      // This could be triggered based on user settings or mode
      // For now, we'll just log it
      console.log('Analysis result:', analysisText);
    } catch (error) {
      console.error('Error triggering accessibility outputs:', error);
    }
  }

  // ============================================================================
  // Category-Based Query Methods (Requirement 4.6)
  // ============================================================================

  /**
   * Get all metrics for a specific category
   * 
   * @param category - The health category to query
   * @returns Array of metrics in that category
   */
  const getMetricsByCategory = useCallback((category: HealthCategory): HealthMetric[] => {
    return healthMetrics[category] || [];
  }, [healthMetrics]);

  
  /**
   * Get all metrics of a specific type across all categories
   * 
   * @param type - The health metric type to query
   * @returns Array of metrics of that type
   */
  const getMetricsByType = useCallback((type: HealthMetricType): HealthMetric[] => {
    const allMetrics: HealthMetric[] = [];
    
    // Search through all categories
    for (const category of Object.keys(healthMetrics) as Array<keyof CategorizedHealthData>) {
      const categoryMetrics = healthMetrics[category].filter(metric => metric.type === type);
      allMetrics.push(...categoryMetrics);
    }
    
    // Sort by timestamp (most recent first)
    allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return allMetrics;
  }, [healthMetrics]);

  const getMetricSeries = useCallback(
  (type: HealthMetricType, range: "day" | "week" | "month") => {
    const chart = getMetricChartKind(type);
    const aggregation = getMetricAggregation(type);

    const cutoff = getRangeCutoff(range);
    const bucketSize = getBucketSizeMs(range);

    // Use your existing query method instead of a nonexistent `healthData`
    const allOfType = getMetricsByType(type);

    // getMetricsByType sorts newest-first; bucketize expects oldest-first
    const filtered = allOfType
      .filter(m => m.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const points = bucketize(filtered, bucketSize, aggregation);

    return { points, chart, aggregation };
  },
  [getMetricsByType]
);

  /**
   * Get all metrics within a specific date range
   * 
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of metrics within the date range
   */
  const getMetricsByDateRange = useCallback((startDate: Date, endDate: Date): HealthMetric[] => {
    const allMetrics: HealthMetric[] = [];
    
    // Collect all metrics from all categories
    for (const category of Object.keys(healthMetrics) as Array<keyof CategorizedHealthData>) {
      allMetrics.push(...healthMetrics[category]);
    }
    
    // Filter by date range
    const filteredMetrics = allMetrics.filter(metric => {
      const metricTime = metric.timestamp.getTime();
      return metricTime >= startDate.getTime() && metricTime <= endDate.getTime();
    });
    
    // Sort by timestamp (most recent first)
    filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return filteredMetrics;
  }, [healthMetrics]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: HealthDataContextValue = {
    healthMetrics,
    permissions,
    isInitialized,
    isLoading,
    error,
    fetchData,
    requestAnalysis,
    requestChat,
    clearError,
    refreshData,
    getMetricsByCategory,
    getMetricsByType,
    getMetricsByDateRange,
    getMetricSeries,
  };

  return (
    <HealthDataContext.Provider value={value}>
      {children}
    </HealthDataContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access the HealthDataContext
 * Throws an error if used outside of HealthDataProvider
 */
export function useHealthData(): HealthDataContextValue {
  const context = useContext(HealthDataContext);
  
  if (context === undefined) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  
  return context;
}
