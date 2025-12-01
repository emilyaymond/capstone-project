/**
 * FilePicker Tests
 * 
 * Tests for the FilePicker component.
 * Verifies:
 * - Component renders correctly
 * - File validation works
 * - Upload process works
 * - Error handling works
 * - Accessibility features are present
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FilePicker } from '../FilePicker';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import * as DocumentPicker from 'expo-document-picker';
import * as apiClient from '../../lib/api-client';
import * as announcer from '../../lib/announcer';

// Mock dependencies
jest.mock('expo-document-picker');
jest.mock('../../lib/api-client');
jest.mock('../../lib/announcer', () => ({
  announceSuccess: jest.fn(),
  announceError: jest.fn(),
  announceLoading: jest.fn(),
}));

// Mock AsyncStorage for AccessibilityContext
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock fetch for file conversion
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['test data'], { type: 'text/csv' })),
  })
) as jest.Mock;

// Helper to render with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('FilePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  it('renders with default props', async () => {
    const { getByText } = await renderWithProvider(<FilePicker />);

    expect(getByText('Upload Health Data File')).toBeTruthy();
  });

  it('renders with custom button label', async () => {
    const { getByText } = await renderWithProvider(
      <FilePicker buttonLabel="Select File" />
    );

    expect(getByText('Select File')).toBeTruthy();
  });

  // ============================================================================
  // File Selection Tests
  // ============================================================================

  it('opens document picker when button is pressed', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: true,
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const { getByText } = await renderWithProvider(<FilePicker />);

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalled();
    });
  });

  it('handles user cancellation gracefully', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: true,
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const onUploadError = jest.fn();
    const { getByText } = await renderWithProvider(
      <FilePicker onUploadError={onUploadError} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalled();
    });

    // Should not call error callback on cancellation
    expect(onUploadError).not.toHaveBeenCalled();
  });

  // ============================================================================
  // File Validation Tests
  // ============================================================================

  it('validates CSV files correctly', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockUploadFile = jest.fn().mockResolvedValue({
      filename: 'health_data.csv',
      analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
      chart_suggestions: [],
      data_preview: [],
      status: 'success',
    });
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const { getByText } = await renderWithProvider(<FilePicker />);

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  it('validates JSON files correctly', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.json',
          uri: 'file://test.json',
          mimeType: 'application/json',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockUploadFile = jest.fn().mockResolvedValue({
      filename: 'health_data.json',
      analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
      chart_suggestions: [],
      data_preview: [],
      status: 'success',
    });
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const { getByText } = await renderWithProvider(<FilePicker />);

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  it('rejects invalid file types', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'document.pdf',
          uri: 'file://test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const onUploadError = jest.fn();
    const { getByText } = await renderWithProvider(
      <FilePicker onUploadError={onUploadError} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalled();
      expect(onUploadError.mock.calls[0][0].message).toContain('Invalid file type');
    });
  });

  it('rejects files over 10MB', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'large_file.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 11 * 1024 * 1024, // 11MB
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const onUploadError = jest.fn();
    const { getByText } = await renderWithProvider(
      <FilePicker onUploadError={onUploadError} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalled();
      expect(onUploadError.mock.calls[0][0].message).toContain('too large');
    });
  });

  // ============================================================================
  // Upload Tests
  // ============================================================================

  it('uploads file successfully', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockResponse = {
      filename: 'health_data.csv',
      analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
      chart_suggestions: [{ suggestion: 'Line chart', type: 'line' }],
      data_preview: [{ timestamp: '2024-01-01', value: 72 }],
      status: 'success',
    };
    const mockUploadFile = jest.fn().mockResolvedValue(mockResponse);
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const onUploadSuccess = jest.fn();
    const { getByText } = await renderWithProvider(
      <FilePicker onUploadSuccess={onUploadSuccess} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalled();
      expect(onUploadSuccess).toHaveBeenCalledWith(mockResponse);
      expect(announcer.announceSuccess).toHaveBeenCalled();
    });
  });

  it('displays upload results when showResults is true', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockResponse = {
      filename: 'health_data.csv',
      analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
      chart_suggestions: [],
      data_preview: [],
      status: 'success',
    };
    const mockUploadFile = jest.fn().mockResolvedValue(mockResponse);
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const { getByText } = await renderWithProvider(
      <FilePicker showResults={true} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Upload Successful!')).toBeTruthy();
      expect(getByText('health_data.csv')).toBeTruthy();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  it('handles upload errors', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockError = new Error('Network error');
    const mockUploadFile = jest.fn().mockRejectedValue(mockError);
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const onUploadError = jest.fn();
    const { getByText } = await renderWithProvider(
      <FilePicker onUploadError={onUploadError} />
    );

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith(mockError);
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('allows retry after error', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    const mockUploadFile = jest.fn().mockRejectedValue(new Error('Network error'));
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const { getByText } = await renderWithProvider(<FilePicker />);

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });

    // Clear the error and try again
    mockUploadFile.mockResolvedValue({
      filename: 'health_data.csv',
      analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
      chart_suggestions: [],
      data_preview: [],
      status: 'success',
    });

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  it('shows loading indicator during upload', async () => {
    const mockGetDocumentAsync = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'health_data.csv',
          uri: 'file://test.csv',
          mimeType: 'text/csv',
          size: 1024,
        },
      ],
    });
    (DocumentPicker.getDocumentAsync as jest.Mock) = mockGetDocumentAsync;

    // Make upload take some time
    const mockUploadFile = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        filename: 'health_data.csv',
        analysis: { analysis: 'Test analysis', model_used: 'gpt-4', usage: {} },
        chart_suggestions: [],
        data_preview: [],
        status: 'success',
      }), 100))
    );
    (apiClient.uploadFile as jest.Mock) = mockUploadFile;

    const { getByText, queryByText } = await renderWithProvider(<FilePicker />);

    const button = getByText('Upload Health Data File');
    fireEvent.press(button);

    // Should show loading state
    await waitFor(() => {
      expect(queryByText(/Uploading/)).toBeTruthy();
    });
  });
});
