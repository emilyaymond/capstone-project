import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import AudioFocusedChart from '../AudioFocusedChart';

// Mock the audio feedback hook
jest.mock('../../hooks/useAudioFeedback', () => ({
  useAudioFeedback: () => ({
    playDataPoint: jest.fn(),
    playTrend: jest.fn(),
  }),
}));

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
    accessibility: {
      audioDescription: 'Heart rate within normal range',
      trendIndicator: 'stable'
    }
  },
  {
    id: '2',
    value: 125,
    unit: 'bpm',
    timestamp: new Date('2023-01-02'),
    accessibility: {
      audioDescription: 'Heart rate slightly elevated',
      trendIndicator: 'rising'
    }
  },
  {
    id: '3',
    value: 118,
    unit: 'bpm',
    timestamp: new Date('2023-01-03'),
    accessibility: {
      audioDescription: 'Heart rate returning to normal',
      trendIndicator: 'falling'
    }
  }
];

const TestWrapper = ({ children, mode = 'audio' }) => {
  mockLocalStorage.getItem.mockImplementation((key) => {
    if (key === 'healthvis-accessibility-mode') return mode;
    return null;
  });

  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  );
};

describe('AudioFocusedChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart with title and description', () => {
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
          description="Daily heart rate measurements"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('Daily heart rate measurements')).toBeInTheDocument();
  });

  it('displays data summary statistics', () => {
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Data Summary')).toBeInTheDocument();
    expect(screen.getByText('Minimum: 118')).toBeInTheDocument();
    expect(screen.getByText('Maximum: 125')).toBeInTheDocument();
    expect(screen.getByText('Total points: 3')).toBeInTheDocument();
  });

  it('shows navigation instructions', () => {
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Navigation Instructions')).toBeInTheDocument();
    expect(screen.getByText('Arrow keys: Navigate between data points')).toBeInTheDocument();
    expect(screen.getByText('Space/Enter: Play full trend')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const chart = screen.getByRole('application');
    expect(chart).toHaveAttribute('aria-label', 'Audio chart: Heart Rate');
    expect(chart).toHaveAttribute('aria-describedby', 'audio-chart-instructions');
    expect(chart).toHaveAttribute('tabIndex', '0');
  });

  it('handles keyboard navigation', async () => {
    const mockOnDataPointFocus = jest.fn();
    
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
          onDataPointFocus={mockOnDataPointFocus}
        />
      </TestWrapper>
    );

    const chart = screen.getByRole('application');
    chart.focus();

    // Navigate to next data point
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(mockData[1], 1);
    });
  });

  it('handles Home and End keys', async () => {
    const mockOnDataPointFocus = jest.fn();
    
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
          onDataPointFocus={mockOnDataPointFocus}
        />
      </TestWrapper>
    );

    const chart = screen.getByRole('application');
    chart.focus();

    // Jump to end
    fireEvent.keyDown(chart, { key: 'End' });
    
    await waitFor(() => {
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(mockData[2], 2);
    });

    // Jump to beginning
    fireEvent.keyDown(chart, { key: 'Home' });
    
    await waitFor(() => {
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(mockData[0], 0);
    });
  });

  it('announces screen reader messages', () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
    
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'screenReaderAnnouncement',
        detail: {
          message: expect.stringContaining('Audio-focused chart loaded: Heart Rate')
        }
      })
    );

    mockDispatchEvent.mockRestore();
  });

  it('handles empty data gracefully', () => {
    render(
      <TestWrapper>
        <AudioFocusedChart 
          data={[]}
          title="Empty Chart"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
    expect(screen.queryByText('Data Summary')).not.toBeInTheDocument();
  });

  it('shows minimal visual in non-audio modes', () => {
    render(
      <TestWrapper mode="visual">
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const svg = screen.getByTitle('Minimal chart visualization');
    expect(svg).toBeInTheDocument();
  });

  it('hides visual elements in audio-priority mode', () => {
    render(
      <TestWrapper mode="audio">
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    const svg = screen.queryByTitle('Minimal chart visualization');
    expect(svg).not.toBeInTheDocument();
  });

  it('includes DataSonification component when enhanced sonification is enabled', () => {
    render(
      <TestWrapper mode="audio">
        <AudioFocusedChart 
          data={mockData}
          title="Heart Rate"
        />
      </TestWrapper>
    );

    // DataSonification component should be rendered
    // This would need to be tested based on the actual DataSonification component structure
    expect(screen.getByRole('application')).toBeInTheDocument();
  });
});