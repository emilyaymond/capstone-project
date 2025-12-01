/**
 * FilePicker Component
 * 
 * Provides file selection and upload functionality for CSV and JSON health data files.
 * Includes file validation, upload progress indication, and error handling.
 * 
 * Requirements: 10.4
 * WHEN a User uploads a CSV or JSON file THEN the Frontend SHALL send it to POST /api/upload-data
 * and receive filename, analysis, chart_suggestions, and data_preview
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import { AccessibleButton } from './AccessibleButton';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorDisplay } from './ErrorDisplay';
import { uploadFile } from '../lib/api-client';
import { UploadDataResponse, VitalSign } from '../types';
import { announceSuccess } from '../lib/announcer';
import { parseAppleHealthExport, getVitalsSummary } from '../lib/apple-health-parser';

// ============================================================================
// Types
// ============================================================================

export interface FilePickerProps {
  /** Callback when file is successfully uploaded */
  onUploadSuccess?: (response: UploadDataResponse) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Callback when vitals are extracted (for Apple Health ZIP files) */
  onVitalsExtracted?: (vitals: VitalSign[]) => Promise<void>;
  /** Custom button label */
  buttonLabel?: string;
  /** Custom button hint for accessibility */
  buttonHint?: string;
  /** Whether to show upload results inline */
  showResults?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/json',
  'text/plain', // Some systems report CSV as text/plain
  'application/zip',
  'application/x-zip-compressed',
];

const ALLOWED_EXTENSIONS = ['.csv', '.json', '.zip'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if the selected file is a CSV or JSON file
 */
function validateFile(file: DocumentPicker.DocumentPickerAsset): {
  isValid: boolean;
  error?: string;
} {
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `Invalid file type. Please select a CSV, JSON, or ZIP file. Selected: ${file.name}`,
    };
  }

  // Check MIME type if available
  if (file.mimeType) {
    const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.mimeType);
    
    if (!hasValidMimeType) {
      return {
        isValid: false,
        error: `Invalid file format. Expected CSV, JSON, or ZIP, got: ${file.mimeType}`,
      };
    }
  }

  // Check file size (limit to 50MB for ZIP, 10MB for others)
  const isZip = fileName.endsWith('.zip');
  const maxSize = isZip ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for ZIP, 10MB for others
  if (file.size && file.size > maxSize) {
    return {
      isValid: false,
      error: `File is too large. Maximum size is ${isZip ? '50MB' : '10MB'}. Selected file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Converts DocumentPicker asset to File/Blob for upload
 */
async function convertToUploadable(asset: DocumentPicker.DocumentPickerAsset): Promise<{
  file: Blob | File;
  filename: string;
}> {
  if (Platform.OS === 'web') {
    // On web, we can use the File API directly
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const file = new File([blob], asset.name, { type: asset.mimeType || 'text/csv' });
    return { file, filename: asset.name };
  } else {
    // On native platforms (iOS/Android), use fetch to read the file
    try {
      console.log('📱 Reading file from URI:', asset.uri);
      console.log('📄 File info:', { name: asset.name, size: asset.size, mimeType: asset.mimeType });
      
      // Use fetch to read the file - this works on React Native
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      console.log('✅ File read successfully, blob size:', blob.size, 'bytes');
      
      return { file: blob, filename: asset.name };
    } catch (error) {
      console.error('❌ Error reading file on native platform:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        uri: asset.uri,
      });
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// ============================================================================
// FilePicker Component
// ============================================================================

export function FilePicker({
  onUploadSuccess,
  onUploadError,
  onVitalsExtracted,
  buttonLabel = 'Upload Health Data File',
  buttonHint = 'Select a CSV, JSON, or Apple Health ZIP file containing health data to upload',
  showResults = true,
}: FilePickerProps): React.ReactElement {
  // State
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadDataResponse | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // ============================================================================
  // File Selection Handler
  // ============================================================================

  const handlePickFile = async () => {
    try {
      // Clear previous state
      setError(null);
      setUploadResult(null);
      setSelectedFileName(null);

      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      // Check if user cancelled
      if (result.canceled) {
        return;
      }

      // Get the selected file
      const file = result.assets[0];
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        const validationError = new Error(validation.error);
        setError(validationError);
        if (onUploadError) {
          onUploadError(validationError);
        }
        return;
      }

      // Set selected file name
      setSelectedFileName(file.name);

      // Start upload
      await handleUpload(file);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select file');
      console.error('File selection error:', error);
      setError(error);
      if (onUploadError) {
        onUploadError(error);
      }
    }
  };

  // ============================================================================
  // File Upload Handler
  // ============================================================================

  const handleUpload = async (asset: DocumentPicker.DocumentPickerAsset) => {
    setIsUploading(true);
    setError(null);

    try {
      // Convert to uploadable format
      const { file, filename } = await convertToUploadable(asset);

      // Check if this is an Apple Health ZIP file
      const isZip = filename.toLowerCase().endsWith('.zip');
      
      if (isZip) {
        // Parse Apple Health data locally
        console.log('📦 Processing Apple Health export...');
        const vitals = await parseAppleHealthExport(file);
        const summary = getVitalsSummary(vitals);
        
        // Store vitals in context for display on Home screen
        if (onVitalsExtracted) {
          await onVitalsExtracted(vitals);
          console.log('✅ Vitals stored in context');
        }
        
        // Create a mock response for now (until backend supports Apple Health)
        const response: UploadDataResponse = {
          status: 'success',
          filename: filename,
          analysis: {
            analysis: `Parsed ${summary.totalRecords} health records: ${summary.byType.heart_rate} heart rate, ${summary.byType.glucose} glucose, ${summary.byType.steps} steps, ${summary.byType.sleep} sleep records.`,
            model_used: 'apple-health-parser',
            usage: { records: summary.totalRecords },
          },
          chart_suggestions: [
            { type: 'line', suggestion: 'Heart Rate Over Time' },
            { type: 'line', suggestion: 'Blood Glucose Trends' },
            { type: 'bar', suggestion: 'Daily Steps' },
          ],
          data_preview: vitals.slice(0, 10).map(v => ({
            type: v.type,
            value: v.value,
            timestamp: v.timestamp.toISOString(),
            unit: v.unit,
          })),
        };
        
        setUploadResult(response);
        setIsUploading(false);
        
        announceSuccess(`Apple Health data processed successfully. ${summary.totalRecords} records found.`);
        
        if (onUploadSuccess) {
          onUploadSuccess(response);
        }
      } else {
        // Upload CSV/JSON file to backend
        const response = await uploadFile(file, filename);

        // Success!
        setUploadResult(response);
        setIsUploading(false);

        // Announce success to screen readers
        announceSuccess(`File ${filename} uploaded successfully. ${response.analysis.analysis}`);

        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess(response);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upload file');
      console.error('❌ File upload error:', error.message);
      console.error('Error stack:', error.stack);
      setError(error);
      setIsUploading(false);

      // Call error callback
      if (onUploadError) {
        onUploadError(error);
      }
    }
  };

  // ============================================================================
  // Retry Handler
  // ============================================================================

  const handleRetry = () => {
    setError(null);
    handlePickFile();
  };

  // ============================================================================
  // Error Dismissal Handler
  // ============================================================================

  const handleDismissError = () => {
    setError(null);
    setSelectedFileName(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* File Selection Button */}
      <View style={styles.buttonContainer}>
        <AccessibleButton
          onPress={handlePickFile}
          label={buttonLabel}
          hint={buttonHint}
          disabled={isUploading}
        />
      </View>

      {/* Selected File Name */}
      {selectedFileName && !isUploading && !error && !uploadResult && (
        <View style={styles.fileInfoContainer}>
          <Text style={styles.fileInfoLabel}>Selected file:</Text>
          <Text style={styles.fileName}>{selectedFileName}</Text>
        </View>
      )}

      {/* Loading Indicator */}
      {isUploading && (
        <View style={styles.loadingContainer}>
          <LoadingIndicator
            message={`Uploading ${selectedFileName || 'file'}...`}
            size="large"
            centered={false}
          />
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <ErrorDisplay
            error={error}
            errorType="network"
            onRetry={handleRetry}
            onDismiss={handleDismissError}
            showRetry={true}
            showDismiss={true}
          />
        </View>
      )}

      {/* Upload Results */}
      {showResults && uploadResult && !isUploading && !error && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Upload Successful!</Text>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>File:</Text>
            <Text style={styles.resultValue}>{uploadResult.filename}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Status:</Text>
            <Text style={styles.resultValue}>{uploadResult.status}</Text>
          </View>

          {uploadResult.analysis && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Analysis:</Text>
              <Text style={styles.resultValue}>{uploadResult.analysis.analysis}</Text>
            </View>
          )}

          {uploadResult.chart_suggestions && uploadResult.chart_suggestions.length > 0 && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Chart Suggestions:</Text>
              {uploadResult.chart_suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionItem}>
                  • {suggestion.suggestion} ({suggestion.type})
                </Text>
              ))}
            </View>
          )}

          {uploadResult.data_preview && uploadResult.data_preview.length > 0 && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Data Preview:</Text>
              <Text style={styles.resultValue}>
                {uploadResult.data_preview.length} records loaded
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  fileInfoContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  fileInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    marginVertical: 16,
  },
  errorContainer: {
    marginVertical: 16,
  },
  resultsContainer: {
    padding: 16,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#155724',
    marginLeft: 8,
    marginTop: 4,
  },
});

export default FilePicker;
