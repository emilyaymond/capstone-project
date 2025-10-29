import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TextChart from '../TextChart';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the hooks
jest.mock('../../hooks/useScreenReader', () => ({
  useScreenReader: () => ({
    announceToScreenReader: jest.fn()
  })
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn()
}));

// Sample test data
const sampleData = [
  {
    id: '1',
    value: 120,
    unit: 'bpm',
    timestamp: new Date('2024-01-01'),
    category: 'vitals',
    normalRange: { min: 60, max: 100 },
    accessibility: {
      audioDescription: 'Heart rate 120 beats per minute, slightly elevated',
      trendIndicator: 'rising'
    },
    description: 'Morning heart rate reading'
  },
  {
    id: '2',
    value: 118,
    unit: 'bpm',
    timestamp: new Date('2024-01-02'),
    category: 'vitals',
    normalRange: { min: 60, max: 100 },
    accessibility: {
      audioDescription: 'Heart rate 118 beats per minute, elevated',
      trendIndicator: 'falling'
    },
    description: 'Afternoon heart rate reading'
  },
  {
    id: '3',
    value: 95,
    unit: 'bpm',
    timestamp: new Date('2024-01-03'),
    category: 'vitals',
    normalRange: { min: 60, max: 100 },
    accessibility: {
      audioDescription: 'Heart rate 95 beats per minute, normal range',
      trendIndicator: 'stable'
    },
    description: 'Evening heart rate reading'
  }
];

describe('TextChart', () => {
  const defaultProps = {
    data: sampleData,
    title: 'Heart Rate Data',
    description: 'Daily heart rate measurements'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Basic Functionality', () => {
    test('renders table with title and data', () => {
      render(<TextChart {...defaultProps} />);

      expect(screen.getByText('Heart Rate Data')).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Heart Rate Data data table' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Heart Rate Data' })).toBeInTheDocument();
    });

    test('displays table summary when showSummary is true', () => {
      render(<TextChart {...defaultProps} showSummary={true} />);

      expect(screen.getByText('Heart Rate Data')).toBeInTheDocument();
      expect(screen.getByText('Daily heart rate measurements')).toBeInTheDocument();
      
      const summaryStats = document.querySelector('.summary-stats');
      expect(summaryStats).toHaveTextContent('Table contains 3 data points');
    });

    test('hides table summary when showSummary is false', () => {
      render(<TextChart {...defaultProps} showSummary={false} />);

      expect(screen.queryByText('Daily heart rate measurements')).not.toBeInTheDocument();
    });

    test('renders all table headers correctly', () => {
      render(<TextChart {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: /Point/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Value/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Unit/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Trend/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Description/ })).toBeInTheDocument();
    });

    test('renders all data rows with correct values', () => {
      render(<TextChart {...defaultProps} />);

      // Check that all values are displayed
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('118')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
      
      // Check units
      expect(screen.getAllByText('bpm')).toHaveLength(3);
      
      // Check trend indicators
      expect(screen.getByText('rising')).toBeInTheDocument();
      expect(screen.getByText('falling')).toBeInTheDocument();
      expect(screen.getByText('stable')).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts by value when value header is clicked', async () => {
      render(<TextChart {...defaultProps} sortable={true} />);

      const valueHeader = screen.getByRole('columnheader', { name: /Value/ });
      fireEvent.click(valueHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1]; // Skip header row
        expect(firstDataRow).toHaveTextContent('95'); // Lowest value should be first
      });
    });

    test('reverses sort order when clicking same header twice', async () => {
      render(<TextChart {...defaultProps} sortable={true} />);

      const valueHeader = screen.getByRole('columnheader', { name: /Value/ });
      
      // First click - ascending
      fireEvent.click(valueHeader);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('95'); // Lowest first
      });

      // Second click - descending
      fireEvent.click(valueHeader);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('120'); // Highest first
      });
    });

    test('displays sort indicators correctly', async () => {
      render(<TextChart {...defaultProps} sortable={true} />);

      const valueHeader = screen.getByRole('columnheader', { name: /Value/ });
      fireEvent.click(valueHeader);

      await waitFor(() => {
        expect(valueHeader).toHaveTextContent('Value ↑');
        expect(valueHeader).toHaveAttribute('aria-sort', 'asc');
      });

      fireEvent.click(valueHeader);
      await waitFor(() => {
        expect(valueHeader).toHaveTextContent('Value ↓');
        expect(valueHeader).toHaveAttribute('aria-sort', 'desc');
      });
    });

    test('disables sorting when sortable is false', () => {
      render(<TextChart {...defaultProps} sortable={false} />);

      const valueHeader = screen.getByRole('columnheader', { name: /Value/ });
      expect(valueHeader).not.toHaveClass('sortable');
      expect(valueHeader).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Keyboard Navigation', () => {
    test('handles arrow key navigation between rows', async () => {
      const mockOnDataPointFocus = jest.fn();
      render(<TextChart {...defaultProps} onDataPointFocus={mockOnDataPointFocus} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row
      
      firstDataRow.focus();
      fireEvent.keyDown(firstDataRow, { key: 'ArrowDown' });

      // Should move focus to next row
      expect(document.activeElement).not.toBe(firstDataRow);
    });

    test('handles Enter key to select data point', async () => {
      const mockOnDataPointFocus = jest.fn();
      render(<TextChart {...defaultProps} onDataPointFocus={mockOnDataPointFocus} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      firstDataRow.focus();
      fireEvent.keyDown(firstDataRow, { key: 'Enter' });

      expect(mockOnDataPointFocus).toHaveBeenCalledWith(sampleData[0]);
    });

    test('handles Home and End keys for navigation', () => {
      render(<TextChart {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      firstDataRow.focus();
      fireEvent.keyDown(firstDataRow, { key: 'Home' });
      fireEvent.keyDown(firstDataRow, { key: 'End' });

      // Should not throw errors
      expect(firstDataRow).toBeInTheDocument();
    });
  });

  describe('Data Point Interaction', () => {
    test('calls onDataPointFocus when row is clicked', () => {
      const mockOnDataPointFocus = jest.fn();
      render(<TextChart {...defaultProps} onDataPointFocus={mockOnDataPointFocus} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row
      
      fireEvent.click(firstDataRow);

      expect(mockOnDataPointFocus).toHaveBeenCalledWith(sampleData[0]);
    });

    test('updates focused state when row is focused', () => {
      render(<TextChart {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      fireEvent.focus(firstDataRow);

      expect(firstDataRow).toHaveClass('focused');
    });
  });

  describe('Empty Data Handling', () => {
    test('displays no data message when data array is empty', () => {
      render(<TextChart {...defaultProps} data={[]} />);

      const noDataCell = document.querySelector('.no-data');
      expect(noDataCell).toHaveTextContent('No data available');
    });

    test('handles empty data gracefully with summary', () => {
      render(<TextChart {...defaultProps} data={[]} showSummary={true} />);

      expect(screen.getByText('Heart Rate Data')).toBeInTheDocument();
      
      const summaryStats = document.querySelector('.summary-stats');
      expect(summaryStats).toHaveTextContent('No data available');
    });
  });

  describe('Accessibility Features', () => {
    test('provides proper ARIA labels and roles', () => {
      render(<TextChart {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Heart Rate Data data table');
      expect(table).toHaveAttribute('aria-describedby', 'table-instructions');

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'Heart Rate Data');
    });

    test('includes screen reader instructions', () => {
      render(<TextChart {...defaultProps} />);

      expect(screen.getByText(/Use arrow keys to navigate between rows/)).toBeInTheDocument();
    });

    test('provides row and cell roles for screen readers', () => {
      render(<TextChart {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows

      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });

    test('includes normal range information for screen readers', () => {
      render(<TextChart {...defaultProps} />);

      // Normal range should be present but screen reader only
      const normalRangeElements = document.querySelectorAll('.normal-range');
      expect(normalRangeElements.length).toBeGreaterThan(0);
      normalRangeElements.forEach(element => {
        expect(element).toHaveClass('sr-only');
      });
    });
  });

  describe('Trend Indicators', () => {
    test('displays trend indicators with correct styling', () => {
      render(<TextChart {...defaultProps} />);

      const risingTrend = screen.getByText('rising');
      const fallingTrend = screen.getByText('falling');
      const stableTrend = screen.getByText('stable');

      expect(risingTrend).toHaveClass('trend-rising');
      expect(fallingTrend).toHaveClass('trend-falling');
      expect(stableTrend).toHaveClass('trend-stable');
    });

    test('handles missing trend indicators gracefully', () => {
      const dataWithoutTrends = [
        {
          id: '1',
          value: 100,
          unit: 'bpm',
          accessibility: {}
        }
      ];

      render(<TextChart data={dataWithoutTrends} title="Test" />);

      expect(screen.getByText('stable')).toBeInTheDocument(); // Default fallback
    });
  });

  describe('Accessibility Compliance', () => {
    test('should not have accessibility violations', async () => {
      const { container } = render(<TextChart {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('maintains accessibility with sorting enabled', async () => {
      const { container } = render(<TextChart {...defaultProps} sortable={true} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('maintains accessibility with empty data', async () => {
      const { container } = render(<TextChart {...defaultProps} data={[]} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Summary Statistics', () => {
    test('calculates and displays correct summary statistics', () => {
      render(<TextChart {...defaultProps} />);

      const summaryStats = document.querySelector('.summary-stats');
      expect(summaryStats).toHaveTextContent('Values range from 95 to 120');
      expect(summaryStats).toHaveTextContent('average of 111.00');
    });

    test('handles non-numeric values in summary', () => {
      const mixedData = [
        { id: '1', value: 'high', unit: 'level' },
        { id: '2', value: 100, unit: 'bpm' }
      ];

      render(<TextChart data={mixedData} title="Mixed Data" />);

      const summaryStats = document.querySelector('.summary-stats');
      expect(summaryStats).toHaveTextContent('Table contains 2 data points');
    });
  });

  describe('Custom Props', () => {
    test('applies custom className', () => {
      const { container } = render(<TextChart {...defaultProps} className="custom-class" />);

      expect(container.firstChild).toHaveClass('text-chart');
      expect(container.firstChild).toHaveClass('custom-class');
    });

    test('passes through additional props', () => {
      render(<TextChart {...defaultProps} data-testid="custom-chart" />);

      expect(screen.getByTestId('custom-chart')).toBeInTheDocument();
    });
  });
});