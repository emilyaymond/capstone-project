/**
 * Backend API Client
 * 
 * Provides functions to communicate with the FastAPI backend for health data analysis,
 * AI chat, and file uploads. Includes timeout handling, error handling, and retry logic.
 */

import {
  AnalysisRequest,
  AnalysisResponse,
  ChatRequest,
  ChatResponse,
  UploadDataResponse,
} from '../types';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 2000; // 2 seconds as per requirements
const MAX_RETRIES = 2;

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isNetworkError: boolean = false,
    public isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Creates an AbortController that times out after the specified duration
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Base fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', undefined, false, true);
    }
    throw new APIError(
      'Network error: Unable to reach server',
      undefined,
      true,
      false
    );
  }
}

/**
 * Validates and parses JSON response
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // If parsing error response fails, use default message
    }

    throw new APIError(errorMessage, response.status);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new APIError('Invalid response format from server');
  }
}

/**
 * Retry logic for failed requests
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) or validation errors
      if (error instanceof APIError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Analyze health data
 * 
 * Sends health data to the backend for AI-powered analysis.
 * 
 * @param data - Health data to analyze
 * @returns Analysis results with insights and chart suggestions
 * @throws APIError if the request fails
 * 
 * Requirements: 10.1, 10.2
 * 1. WHEN the Frontend sends health data to the Backend THEN the System SHALL use the POST /api/analyze endpoint
 * 2. WHEN the Backend returns analysis results THEN the Frontend SHALL parse the response containing analysis, chart_suggestions, and status fields
 */
export async function analyzeData(
  data: Record<string, any>
): Promise<AnalysisResponse> {
  return withRetry(async () => {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/analyze`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    return parseResponse<AnalysisResponse>(response);
  });
}

/**
 * Chat with AI assistant
 * 
 * Sends a message to the AI assistant, optionally with health data context.
 * 
 * @param message - User's message
 * @param data - Optional health data context
 * @param context - Optional additional context
 * @returns AI response with suggestions and analysis
 * @throws APIError if the request fails
 * 
 * Requirements: 10.3
 * WHEN a User requests AI chat assistance THEN the Frontend SHALL send the request to POST /api/chat with message, data, and context fields
 */
export async function chatWithAI(
  message: string,
  data?: Record<string, any>,
  context?: string
): Promise<ChatResponse> {
  const requestBody: ChatRequest = {
    message,
    data,
    context,
  };

  return withRetry(async () => {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat`,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    return parseResponse<ChatResponse>(response);
  });
}

/**
 * Upload health data file
 * 
 * Uploads a CSV or JSON file containing health data for analysis.
 * 
 * @param file - File to upload (CSV or JSON)
 * @returns Upload results with analysis and data preview
 * @throws APIError if the request fails
 * 
 * Requirements: 10.4
 * WHEN a User uploads a CSV or JSON file THEN the Frontend SHALL send it to POST /api/upload-data and receive filename, analysis, chart_suggestions, and data_preview
 */
export async function uploadFile(file: File | Blob, filename: string): Promise<UploadDataResponse> {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append('file', file, filename);

    const controller = createTimeoutController(REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-data`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If parsing error response fails, use default message
        }

        throw new APIError(errorMessage, response.status);
      }

      return parseResponse<UploadDataResponse>(response);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new APIError('Upload timeout', undefined, false, true);
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        'Network error: Unable to upload file',
        undefined,
        true,
        false
      );
    }
  });
}

/**
 * Check if the backend is available
 * 
 * Performs a health check to verify backend connectivity.
 * 
 * @returns true if backend is healthy, false otherwise
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      { method: 'GET' },
      5000 // Longer timeout for health check
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
