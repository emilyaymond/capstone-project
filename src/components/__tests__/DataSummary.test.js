import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import DataSummary from '../DataSummary';

// Mock the custom hooks
jest.mock('../../hooks/useScreenReader', () => ({
  useScreenReader: () => ({
    announceToScreenReader: jest.fn()
  })
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    registerKeyboardShortcuts: jest.fn(),
    unregisterKeyboardShortcuts: jest.fn()
  })
}));

expect.extend(toHaveNoViolations);

describe('DataSummary', () => {
  const mockData = {
    overallSummary: 'Your health metrics are within normal ranges with some areas for improvement.',
    overallStatus: 'good',
    metrics: [
      {
        id: 'blood_pressure',
        name: 'Blood Pressure',
        type: 'vitals',
        currentValue: '120/80',
        unit: 'mmHg',
        trend: 'stable',
        status: 'normal',
        hasDetails: true,
        details: {
          description: 'Blood pressure is within the normal range.',
          range: { min: '90/60', max: '140/90' },
          lastUpdated: '2024-01-15T10:30:00Z',
          recommendations: [
            'Continue regular exercise',
            'Maintain healthy diet'
          ]
        }
      },
      {
        id: 'heart_rate',
        name: 'Heart Rate',
        type: 'vitals',
        currentValue: '72',
        unit: 'bpm',
        trend: 'up',
        status: 'normal',
        hasDetails: false,
        details: {
          description: 'Resting heart rate is normal.',
          lastUpdated: '2024-01-15T10:30:00Z'
        }
      },
      {
        id: 'weight',
        name: 'Weight',
        type: 'measurements',
        currentValue: '70',
        unit: 'kg',
        trend: 'down',
        status: 'high',
        hasDetails: true,
        details: {
          description: 'Weight is slightly above target range.',
          range: { min: '60', max: '75' },
          lastUpdated: '2024-01-15T09:00:00Z',
          recommendations: [
            'Consider increasing physical activity',
            'Monitor caloric intake'
          ]
        }
      }
    ],
    context: {
      path: [
        { name: 'Dashboard', id: 'dashboard' },
        { name: 'Health Overview', id: 'overview' }
      ],
      onNavigate: jest.fn()
    }
  };

  const defaultProps = {
    data: mockData,
    onDrillDown: jest.fn(),
    onViewChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders data summary container with proper ARIA attributes', () => {
      render(<DataSummary {...defaultProps} />);
      
      const container = screen.getByLabelText('Health data summary');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('role', 'region');
    });

    test('renders breadcrumb navigation when context provided', () => {
      render(<DataSummary {...defaultProps} />);
      
      const breadcrumb = screen.getByRole('navigation', { name: /data context navigation/i });
      expect(breadcrumb).toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Health Overview' })).toBeInTheDocument();
    });

    test('renders view controls with tab interface', () => {
      render(<DataSummary {...defaultProps} />);
      
      const tablist = screen.getByRole('tablist', { name: /view options/i });
      expect(tablist).toBeInTheDocument();
      
      const summaryTab = screen.getByRole('tab', { name: /summary view/i });
      const detailedTab = screen.getByRole('tab', { name: /detailed view/i });
      
      expect(summaryTab).toBeInTheDocument();
      expect(detailedTab).toBeInTheDocument();
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
      expect(detailedTab).toHaveAttribute('aria-selected', 'false');
    });

    test('renders overall summary section', () => {
      render(<DataSummary {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /health overview/i })).toBeInTheDocument();
      expect(screen.getByText(mockData.overallSummary)).toBeInTheDocument();
      expect(screen.getByText(/Overall Status: good/)).toBeInTheDocument();
    });

    test('renders summary items with proper structure', () => {
      render(<DataSummary {...defaultProps} />);
      
      const itemsList = screen.getByRole('list', { name: /health metrics summary/i });
      expect(itemsList).toBeInTheDocument();
      
      // Check for metric items
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
      expect(screen.getByText('Heart Rate')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
      
      // Check for values
      expect(screen.getByText('120/80 mmHg')).toBeInTheDocument();
      expect(screen.getByText('72 bpm')).toBeInTheDocument();
      expect(screen.getByText('70 kg')).toBeInTheDocument();
    });

    test('renders drill-down buttons for items with details', () => {
      render(<DataSummary {...defaultProps} />);
      
      const drillDownButtons = screen.getAllByLabelText(/view detailed analysis/i);
      expect(drillDownButtons).toHaveLength(2); // Blood pressure and weight have details
    });

    test('renders empty state when no data provided', () => {
      render(<DataSummary data={{ metrics: [] }} />);
      
      const emptyMessage = screen.getByRole('alert');
      expect(emptyMessage).toBeInTheDocument();
      expect(emptyMessage).toHaveTextContent('No health data available to summarize');
    });
  });

  describe('View Switching', () => {
    test('switches between summary and detailed views', () => {
      const onViewChange = jest.fn();
      render(<DataSummary {...defaultProps} onViewChange={onViewChange} />);
      
      const detailedTab = screen.getByRole('tab', { name: /detailed view/i });
      fireEvent.click(detailedTab);
      
      expect(onViewChange).toHaveBeenCalledWith('expanded');
      expect(detailedTab).toHaveAttribute('aria-selected', 'true');
    });

    test('shows all items expanded in detailed view', () => {
      render(<DataSummary {...defaultProps} />);
      
      // Switch to detailed view
      const detailedTab = screen.getByRole('tab', { name: /detailed view/i });
      fireEvent.click(detailedTab);
      
      // Check that items are expanded
      const expandedItems = screen.getAllByText(/Blood pressure is within|Resting heart rate|Weight is slightly above/);
      expect(expandedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Item Expansion', () => {
    test('toggles item expansion when clicked', () => {
      render(<DataSummary {...defaultProps} />);
      
      const bloodPressureToggle = screen.getAllByRole('button', { name: /blood pressure/i })[0];
      
      // Initially collapsed
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded', 'false');
      
      // Click to expand
      fireEvent.click(bloodPressureToggle);
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Click to collapse
      fireEvent.click(bloodPressureToggle);
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('shows item details when expanded', () => {
      render(<DataSummary {...defaultProps} />);
      
      const bloodPressureToggle = screen.getAllByRole('button', { name: /blood pressure/i })[0];
      fireEvent.click(bloodPressureToggle);
      
      expect(screen.getByText('Blood pressure is within the normal range.')).toBeInTheDocument();
      expect(screen.getByText(/90\/60/)).toBeInTheDocument();
      expect(screen.getByText('Continue regular exercise')).toBeInTheDocument();
    });

    test('handles keyboard navigation for item expansion', () => {
      render(<DataSummary {...defaultProps} />);
      
      const bloodPressureToggle = screen.getAllByRole('button', { name: /blood pressure/i })[0];
      
      // Focus and press Enter
      bloodPressureToggle.focus();
      fireEvent.keyDown(bloodPressureToggle, { key: 'Enter' });
      
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Press Space to collapse
      fireEvent.keyDown(bloodPressureToggle, { key: ' ' });
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Drill-down Functionality', () => {
    test('calls onDrillDown when drill-down button clicked', () => {
      const onDrillDown = jest.fn();
      render(<DataSummary {...defaultProps} onDrillDown={onDrillDown} />);
      
      const drillDownButtons = screen.getAllByLabelText(/view detailed analysis/i);
      fireEvent.click(drillDownButtons[0]);
      
      expect(onDrillDown).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'blood_pressure',
          title: 'Blood Pressure'
        })
      );
    });

    test('does not show drill-down button for items without details', () => {
      render(<DataSummary {...defaultProps} />);
      
      // Heart rate doesn't have hasDetails: true
      const heartRateSection = screen.getByText('Heart Rate').closest('.data-summary__item');
      const drillDownButton = heartRateSection?.querySelector('.data-summary__drill-down-button');
      
      expect(drillDownButton).toBeNull();
    });
  });

  describe('Breadcrumb Navigation', () => {
    test('renders breadcrumb items with proper navigation', () => {
      render(<DataSummary {...defaultProps} />);
      
      const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
      const overviewLink = screen.getByRole('button', { name: 'Health Overview' });
      
      expect(dashboardLink).toBeInTheDocument();
      expect(overviewLink).toBeInTheDocument();
      expect(overviewLink).toHaveAttribute('aria-current', 'page');
    });

    test('calls navigation handler when breadcrumb clicked', () => {
      const mockNavigate = jest.fn();
      const dataWithNav = {
        ...mockData,
        context: {
          ...mockData.context,
          onNavigate: mockNavigate
        }
      };
      
      render(<DataSummary {...defaultProps} data={dataWithNav} />);
      
      const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
      fireEvent.click(dashboardLink);
      
      expect(mockNavigate).toHaveBeenCalledWith(
        { name: 'Dashboard', id: 'dashboard' },
        0
      );
    });

    test('does not render breadcrumb when no context provided', () => {
      const dataWithoutContext = { ...mockData, context: undefined };
      render(<DataSummary {...defaultProps} data={dataWithoutContext} />);
      
      const breadcrumb = screen.queryByRole('navigation', { name: /data context navigation/i });
      expect(breadcrumb).not.toBeInTheDocument();
    });
  });

  describe('Status and Trend Indicators', () => {
    test('renders trend indicators with proper styling', () => {
      render(<DataSummary {...defaultProps} />);
      
      // Check for trend arrows (using screen reader text)
      expect(screen.getByText('stable')).toBeInTheDocument(); // Blood pressure
      expect(screen.getByText('up')).toBeInTheDocument(); // Heart rate
      expect(screen.getByText('down')).toBeInTheDocument(); // Weight
    });

    test('renders status indicators with proper styling', () => {
      render(<DataSummary {...defaultProps} />);
      
      const normalStatuses = screen.getAllByText('normal');
      const highStatus = screen.getByText('high');
      
      expect(normalStatuses).toHaveLength(2); // Blood pressure and heart rate
      expect(highStatus).toBeInTheDocument(); // Weight
    });

    test('applies correct CSS classes for status types', () => {
      render(<DataSummary {...defaultProps} />);
      
      const highStatus = screen.getByText('high');
      expect(highStatus).toHaveClass('data-summary__item-status--high');
    });
  });

  describe('Keyboard Navigation', () => {
    test('handles keyboard shortcuts for navigation', () => {
      render(<DataSummary {...defaultProps} />);
      
      const container = screen.getByLabelText('Health data summary');
      
      // Test various keyboard shortcuts
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      fireEvent.keyDown(container, { key: 'Enter' });
      fireEvent.keyDown(container, { key: 'Space' });
      fireEvent.keyDown(container, { key: 'Escape' });
      fireEvent.keyDown(container, { key: 'd' });
      fireEvent.keyDown(container, { key: 's' });
      fireEvent.keyDown(container, { key: 'e' });
      
      // Component should handle these without errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(<DataSummary {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides proper ARIA labels and descriptions', () => {
      render(<DataSummary {...defaultProps} />);
      
      const bloodPressureToggle = screen.getAllByRole('button', { name: /blood pressure/i })[0];
      expect(bloodPressureToggle).toHaveAttribute('aria-expanded');
      expect(bloodPressureToggle).toHaveAttribute('aria-controls');
      expect(bloodPressureToggle).toHaveAttribute('aria-describedby');
    });

    test('uses proper heading hierarchy', () => {
      render(<DataSummary {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { name: /health overview/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    test('provides screen reader help text', () => {
      render(<DataSummary {...defaultProps} />);
      
      const helpText = screen.getByText(/use arrow keys to navigate/i);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('sr-only');
    });

    test('uses proper list semantics for items', () => {
      render(<DataSummary {...defaultProps} />);
      
      const itemsList = screen.getByRole('list', { name: /health metrics summary/i });
      expect(itemsList).toBeInTheDocument();
      
      // Get only the metric items, not breadcrumb items
      const metricItems = itemsList.querySelectorAll('[role="listitem"]');
      expect(metricItems).toHaveLength(3); // Three metrics
    });
  });

  describe('Custom Props', () => {
    test('applies custom className', () => {
      render(<DataSummary {...defaultProps} className="custom-class" />);
      
      const container = screen.getByLabelText('Health data summary');
      expect(container).toHaveClass('data-summary');
      expect(container).toHaveClass('custom-class');
    });

    test('uses custom aria-label', () => {
      render(<DataSummary {...defaultProps} aria-label="Custom summary label" />);
      
      const container = screen.getByLabelText('Custom summary label');
      expect(container).toHaveAttribute('aria-label', 'Custom summary label');
    });
  });

  describe('Data Handling', () => {
    test('handles missing optional data gracefully', () => {
      const minimalData = {
        metrics: [{
          id: 'simple_metric',
          name: 'Simple Metric',
          currentValue: '100'
        }]
      };
      
      render(<DataSummary {...defaultProps} data={minimalData} />);
      
      expect(screen.getByText('Simple Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('handles empty metrics array', () => {
      render(<DataSummary {...defaultProps} data={{ metrics: [] }} />);
      
      const emptyMessage = screen.getByRole('alert');
      expect(emptyMessage).toHaveTextContent('No health data available to summarize');
    });

    test('handles undefined data', () => {
      render(<DataSummary {...defaultProps} data={undefined} />);
      
      const emptyMessage = screen.getByRole('alert');
      expect(emptyMessage).toHaveTextContent('No health data available to summarize');
    });
  });
});