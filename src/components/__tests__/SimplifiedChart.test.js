import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import SimplifiedChart from '../SimplifiedChart';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockData = [
  {
    id: '1',
    value: 120,
    unit: 'bpm',
    timestamp: new Date('2023-01-01'),
    normalRange: { min: 60, max: 100 }
  },
  {
    id: '2',
    value: 125,
    unit: 'bpm',
    timestamp: new Date('2023-01-02'),
    normalRange: { min: 60, max: 100 }
  },
  {
    id: '3',
    value: 118,
    unit: 'bpm',
    timestamp: new Date('2023-01-03'),
    normalRange: { min: 60, max: 100 }
  }
];

const TestWrapper = ({ children }) => {
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  );
};

describe('SimplifiedChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart with title and description', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
          description="Daily heart rate measurements"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('Daily heart rate measurements')).toBeInTheDocument();
  });

  it('displays key metrics correctly', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('Range')).toBeInTheDocument();
    
    // Check for current value in the metric
    const currentMetric = screen.getByText('Current').closest('.metric');
    expect(currentMetric).toHaveTextContent('118');
  });

  it('shows correct trend indicators', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    // Should show falling trend (125 -> 118)
    const trendMetric = screen.getByText('Trend').closest('.metric');
    expect(trendMetric).toHaveTextContent('falling');
    expect(trendMetric).toHaveTextContent('↘️');
  });

  it('displays trend summary with detailed description', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(/Your latest reading is/)).toBeInTheDocument();
    expect(screen.getByText(/decreasing by/)).toBeInTheDocument();
  });

  it('shows normal range when available', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Normal range: 60 - 100')).toBeInTheDocument();
  });

  it('renders bar visualization', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Recent Values')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Bar chart showing last 5 values with trend falling');
    
    // Should show bars for the data
    const bars = document.querySelectorAll('.bar');
    expect(bars.length).toBe(3); // All 3 data points since we have less than 5
  });

  it('highlights latest bar', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const bars = document.querySelectorAll('.bar');
    const latestBar = bars[bars.length - 1];
    expect(latestBar).toHaveClass('latest');
  });

  it('handles empty data gracefully', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={[]}
          title="Empty Chart"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles null/undefined data', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={null}
          title="Null Chart"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Null Chart')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('includes repeat summary button', () => {
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const button = screen.getByText('Repeat Summary');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('action-button');
  });

  it('announces summary when repeat button is clicked', () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
    
    render(
      <TestWrapper>
        <SimplifiedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const button = screen.getByText('Repeat Summary');
    fireEvent.click(button);

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'screenReaderAnnouncement',
        detail: {
          message: expect.stringContaining('Current value: 118')
        }
      })
    );

    mockDispatchEvent.mockRestore();
  });

  it('calculates trend correctly for rising data', () => {
    const risingData = [
      { id: '1', value: 100, unit: 'bpm' },
      { id: '2', value: 110, unit: 'bpm' }
    ];

    render(
      <TestWrapper>
        <SimplifiedChart 
          data={risingData}
          title="Rising Chart"
        />
      </TestWrapper>
    );

    const trendMetric = screen.getByText('Trend').closest('.metric');
    expect(trendMetric).toHaveTextContent('rising');
    expect(trendMetric).toHaveTextContent('↗️');
  });

  it('calculates trend correctly for stable data', () => {
    const stableData = [
      { id: '1', value: 100, unit: 'bpm' },
      { id: '2', value: 100, unit: 'bpm' }
    ];

    render(
      <TestWrapper>
        <SimplifiedChart 
          data={stableData}
          title="Stable Chart"
        />
      </TestWrapper>
    );

    const trendMetric = screen.getByText('Trend').closest('.metric');
    expect(trendMetric).toHaveTextContent('stable');
    expect(trendMetric).toHaveTextContent('➡️');
  });

  it('handles single data point', () => {
    const singleData = [
      { id: '1', value: 100, unit: 'bpm' }
    ];

    render(
      <TestWrapper>
        <SimplifiedChart 
          data={singleData}
          title="Single Point"
        />
      </TestWrapper>
    );

    const currentMetric = screen.getByText('Current').closest('.metric');
    expect(currentMetric).toHaveTextContent('100');
    
    const trendMetric = screen.getByText('Trend').closest('.metric');
    expect(trendMetric).toHaveTextContent('stable'); // Should default to stable for single point
  });
});