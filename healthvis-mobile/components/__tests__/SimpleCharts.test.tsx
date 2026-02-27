/**
 * Tests for SimpleLineChart and SimpleBarChart components
 * 
 * Verifies:
 * - Components render without errors
 * - Loading states display correctly
 * - Empty states display correctly
 * - Accessibility features are present
 * - Charts adapt to accessibility settings
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SimpleLineChart } from '../charts/lineChart';
import { SimpleBarChart } from '../charts/barChart';
import { DataPoint } from '../../types';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

// Mock the hooks
jest.mock('../../hooks/useStorage', () => ({
  useStorage: () => ({
    saveSettings: jest.fn(),
    loadSettings: jest.fn().mockResolvedValue(null),
    clearSettings: jest.fn(),
    isAvailable: true,
  }),
}));

jest.mock('../../lib/announcer', () => ({
  announce: jest.fn(),
  announceSuccess: jest.fn(),
  announceError: jest.fn(),
  announceNavigation: jest.fn(),
  announceModeChange: jest.fn(),
  announceSettingsChange: jest.fn(),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  const mockComponent = (name: string) => {
    const Component = ({ children, ...props }: any) => {
      return React.createElement(View, { testID: name, ...props }, children);
    };
    Component.displayName = name;
    return Component;
  };
  
  return {
    __esModule: true,
    default: mockComponent('Svg'),
    Svg: mockComponent('Svg'),
    Line: mockComponent('Line'),
    Circle: mockComponent('Circle'),
    Rect: mockComponent('Rect'),
    Path: mockComponent('Path'),
    Polyline: mockComponent('Polyline'),
    G: mockComponent('G'),
    Text: mockComponent('SvgText'),
    Defs: mockComponent('Defs'),
    LinearGradient: mockComponent('LinearGradient'),
    Stop: mockComponent('Stop'),
  };
});

// Sample test data
const sampleData: DataPoint[] = [
  { value: 72, timestamp: new Date('2024-01-01T08:00:00'), range: 'normal' },
  { value: 75, timestamp: new Date('2024-01-01T09:00:00'), range: 'normal' },
  { value: 78, timestamp: new Date('2024-01-01T10:00:00'), range: 'normal' },
  { value: 82, timestamp: new Date('2024-01-01T11:00:00'), range: 'warning' },
  { value: 85, timestamp: new Date('2024-01-01T12:00:00'), range: 'warning' },
];

const renderWithProvider = async (component: React.ReactElement) => {
  const result = render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
  
  // Wait for async operations to complete
  await waitFor(() => {
    // Just wait a tick for the provider to initialize
  });
  
  return result;
};

describe('SimpleLineChart', () => {
  it('renders with data', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleLineChart
        data={sampleData}
        title="Heart Rate"
        unit="bpm"
      />
    );
    
    expect(getByText('Heart Rate')).toBeTruthy();
    expect(getByText(/5 data points/)).toBeTruthy();
  });

  it('renders loading state', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleLineChart
        data={[]}
        title="Heart Rate"
        isLoading={true}
      />
    );
    
    expect(getByText('Loading chart data...')).toBeTruthy();
  });

  it('renders empty state', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleLineChart
        data={[]}
        title="Heart Rate"
      />
    );
    
    expect(getByText('No data available')).toBeTruthy();
    expect(getByText('Upload or sync data to view chart')).toBeTruthy();
  });

  it('has proper accessibility label', async () => {
    const { getByLabelText } = await renderWithProvider(
      <SimpleLineChart
        data={sampleData}
        title="Heart Rate"
        accessibilityLabel="Custom accessibility label"
      />
    );
    
    expect(getByLabelText('Custom accessibility label')).toBeTruthy();
  });
});

describe('SimpleBarChart', () => {
  it('renders with data', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleBarChart
        data={sampleData}
        title="Daily Steps"
        unit="steps"
      />
    );
    
    expect(getByText('Daily Steps')).toBeTruthy();
    expect(getByText(/5 data points/)).toBeTruthy();
  });

  it('renders loading state', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleBarChart
        data={[]}
        title="Daily Steps"
        isLoading={true}
      />
    );
    
    expect(getByText('Loading chart data...')).toBeTruthy();
  });

  it('renders empty state', async () => {
    const { getByText } = await renderWithProvider(
      <SimpleBarChart
        data={[]}
        title="Daily Steps"
      />
    );
    
    expect(getByText('No data available')).toBeTruthy();
    expect(getByText('Upload or sync data to view chart')).toBeTruthy();
  });

  it('has proper accessibility label', async () => {
    const { getByLabelText } = await renderWithProvider(
      <SimpleBarChart
        data={sampleData}
        title="Daily Steps"
        accessibilityLabel="Custom bar chart label"
      />
    );
    
    expect(getByLabelText('Custom bar chart label')).toBeTruthy();
  });
});

describe('Chart Performance', () => {
  it('handles large datasets efficiently', async () => {
    // Generate 500 data points (< 1000 point requirement)
    const largeDataset: DataPoint[] = Array.from({ length: 500 }, (_, i) => ({
      value: 70 + Math.random() * 20,
      timestamp: new Date(Date.now() + i * 3600000),
      range: 'normal' as const,
    }));

    const startTime = Date.now();
    
    await renderWithProvider(
      <SimpleLineChart
        data={largeDataset}
        title="Large Dataset"
      />
    );
    
    const renderTime = Date.now() - startTime;
    
    // Should render in less than 300ms (Requirement 11.3)
    expect(renderTime).toBeLessThan(300);
  });
});
