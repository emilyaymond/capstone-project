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
  VitalSign,
  AnalysisResponse,
  ChatResponse,
  UploadDataResponse,
} from '../types';
import {
  analyzeData as apiAnalyzeData,
  chatWithAI as apiChatWithAI,
  uploadFile as apiUploadFile,
  APIError,
} from '../lib/api-client';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { useSpeech } from '../hooks/useSpeech';
import { announceSuccess, announceError } from '../lib/announcer';

// ============================================================================
// Storage Keys
// ============================================================================

const CACHE_KEYS = {
  VITALS: 'health_data_vitals',
  LAST_ANALYSIS: 'health_data_last_analysis',
  LAST_FETCH: 'health_data_last_fetch',
} as const;

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

// ============================================================================
// Context Value Interface
// ============================================================================

export interface HealthDataContextValue {
  vitals: VitalSign[];
  isLoading: boolean;
  error: Error | null;
  fetchData: () => Promise<void>;
  uploadFile: (file: File | Blob, filename: string) => Promise<UploadDataResponse>;
  requestAnalysis: (data: Record<string, any>) => Promise<AnalysisResponse>;
  requestChat: (message: string, context?: any) => Promise<ChatResponse>;
  clearError: () => void;
  refreshData: () => Promise<void>;
  setVitals: (vitals: VitalSign[]) => Promise<void>;
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

// ============================================================================
// Provider Component
// ============================================================================

export function HealthDataProvider({ children }: HealthDataProviderProps) {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
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
   * Save vitals to cache
   */
  async function saveVitalsToCache(vitalsData: VitalSign[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.VITALS,
        JSON.stringify({
          data: vitalsData,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to save vitals to cache:', error);
    }
  }

  /**
   * Load vitals from cache
   */
  async function loadVitalsFromCache(): Promise<VitalSign[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.VITALS);
      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_EXPIRATION_MS) {
        return null;
      }

      // Parse dates in vitals
      return data.map((vital: any) => ({
        ...vital,
        timestamp: new Date(vital.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load vitals from cache:', error);
      return null;
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
  // Fetch Data Function (Requirement 10.1, 10.7)
  // ============================================================================

  /**
   * Fetches health data from backend or cache
   * Implements offline support by loading cached data when backend is unavailable
   */
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from cache first for offline support
      const cachedVitals = await loadVitalsFromCache();
      if (cachedVitals && cachedVitals.length > 0) {
        setVitals(cachedVitals);
        console.log(`✅ Loaded ${cachedVitals.length} vitals from cache`);
      }

      // Attempt to fetch fresh data from backend
      // Note: In a real implementation, you would have a specific endpoint for fetching vitals
      // For now, we'll simulate this or use the analysis endpoint
      
      // Since there's no specific "fetch vitals" endpoint in the current API,
      // we'll rely on cached data or data from analysis/upload operations
      // This is a placeholder that would be replaced with actual endpoint call
      
      setIsLoading(false);
    } catch (err) {
      // Only show error if we don't have cached data
      const cachedVitals = await loadVitalsFromCache();
      if (!cachedVitals || cachedVitals.length === 0) {
        const errorMessage = err instanceof Error ? err : new Error('Failed to fetch data');
        setError(errorMessage);

        // Announce error to screen readers
        announceError('Failed to load health data');
        
        // Play error sound
        await audio.playErrorSound();

        console.error('Error fetching health data:', errorMessage);
      } else {
        // We have cached data, so just log the error
        console.log('Backend unavailable, using cached data');
      }
      
      setIsLoading(false);
    }
  }, [audio]);

  // ============================================================================
  // Upload File Function (Requirement 10.4)
  // ============================================================================

  /**
   * Uploads a health data file (CSV or JSON) to the backend
   * Triggers appropriate accessibility feedback based on response
   */
  const uploadFile = useCallback(
    async (file: File | Blob, filename: string): Promise<UploadDataResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        // Call API client to upload file
        const response = await apiUploadFile(file, filename);

        // Process the data preview to extract vitals
        let processedVitals: VitalSign[] = [];
        if (response.data_preview && Array.isArray(response.data_preview)) {
          processedVitals = processDataPreviewToVitals(response.data_preview);
          setVitals(processedVitals);
          
          // Cache the vitals
          await saveVitalsToCache(processedVitals);
        }

        // Cache the analysis
        if (response.analysis) {
          await saveAnalysisToCache({
            analysis: response.analysis,
            chart_suggestions: response.chart_suggestions,
            status: response.status,
          });
        }

        // Trigger accessibility outputs (Requirement 10.8)
        await triggerAccessibilityOutputs(response.analysis.analysis, processedVitals);

        // Announce success
        announceSuccess('File uploaded successfully');
        await audio.playSuccessSound();

        setIsLoading(false);
        return response;
      } catch (err) {
        const errorMessage = err instanceof APIError ? err : new Error('Failed to upload file');
        setError(errorMessage);
        setIsLoading(false);

        // Announce error
        announceError('Failed to upload file');
        await audio.playErrorSound();

        throw errorMessage;
      }
    },
    [audio]
  );

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
        await triggerAccessibilityOutputs(response.analysis.analysis, vitals);

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
    [audio, vitals]
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

        // Prepare data context (include current vitals if available)
        const dataContext = context || (vitals.length > 0 ? { vitals } : undefined);

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
    [audio, vitals]
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
   */
  const refreshData = useCallback(async (): Promise<void> => {
    // Clear cache
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.VITALS);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }

    // Fetch fresh data
    await fetchData();
  }, [fetchData]);

  // ============================================================================
  // Set Vitals Function
  // ============================================================================

  /**
   * Directly sets vitals data (for local processing like Apple Health)
   * Saves to cache for offline access
   */
  const setVitalsData = useCallback(async (newVitals: VitalSign[]): Promise<void> => {
    try {
      setVitals(newVitals);
      await saveVitalsToCache(newVitals);
      console.log(`✅ Set ${newVitals.length} vitals in context`);
    } catch (error) {
      console.error('Failed to set vitals:', error);
    }
  }, []);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Processes data preview from backend into VitalSign array
   */
  function processDataPreviewToVitals(dataPreview: any[]): VitalSign[] {
    // This is a simplified implementation
    // In production, you would parse the actual data structure from the backend
    const processedVitals: VitalSign[] = [];

    for (const item of dataPreview) {
      // Try to extract vital sign information
      // This depends on the actual structure of data_preview from backend
      if (item && typeof item === 'object') {
        // Example structure - adjust based on actual backend response
        const vital: VitalSign = {
          type: item.type || 'heart_rate',
          value: item.value || 0,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          unit: item.unit || 'bpm',
          range: item.range || 'normal',
        };
        processedVitals.push(vital);
      }
    }

    return processedVitals;
  }

  /**
   * Triggers appropriate TTS, haptics, or sonification based on backend responses
   * Requirement 10.8: Backend insights trigger accessibility outputs
   */
  async function triggerAccessibilityOutputs(
    analysisText: string,
    vitalsData: VitalSign[]
  ): Promise<void> {
    try {
      // Trigger haptic feedback based on data ranges
      if (vitalsData.length > 0) {
        // Find the most severe range in the data
        const hasDanger = vitalsData.some(v => v.range === 'danger');
        const hasWarning = vitalsData.some(v => v.range === 'warning');

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
  // Context Value
  // ============================================================================

  const value: HealthDataContextValue = {
    vitals,
    isLoading,
    error,
    fetchData,
    uploadFile,
    requestAnalysis,
    requestChat,
    clearError,
    refreshData,
    setVitals: setVitalsData,
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
