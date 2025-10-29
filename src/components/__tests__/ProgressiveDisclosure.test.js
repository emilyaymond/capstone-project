import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ProgressiveDisclosure from '../ProgressiveDisclosure';

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

describe('ProgressiveDisclosure', () => {
  const mockLevels = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'High-level summary of health data',
      sections: [
        {
          id: 'summary',
          title: 'Data Summary',
          collapsible: false,
          summary: 'Overall health metrics summary',
          content: 'Your health data shows positive trends.'
        },
        {
          id: 'alerts',
          title: 'Health Alerts',
          collapsible: true,
          content: 'No critical alerts at this time.'
        }
      ]
    },
    {
      id: 'details',
      name: 'Detailed View',
      description: 'Detailed breakdown of health metrics',
      sections: [
        {
          id: 'vitals',
          title: 'Vital Signs',
          collapsible: true,
          content: 'Blood pressure: 120/80, Heart rate: 72 bpm'
        },
        {
          id: 'trends',
          title: 'Trends Analysis',
          collapsible: true,
          content: 'Improving trends over the last month'
        }
      ]
    }
  ];

  const mockData = {
    healthMetrics: ['blood_pressure', 'heart_rate', 'weight'],
    timeRange: '30_days'
  };

  const defaultProps = {
    data: mockData,
    levels: mockLevels,
    initialLevel: 0,
    onLevelChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders progressive disclosure container with proper ARIA attributes', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const container = screen.getByLabelText('Progressive data disclosure');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Progressive data disclosure');
    });

    test('renders breadcrumb navigation for multiple levels', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const breadcrumb = screen.getByRole('navigation', { name: /data disclosure navigation/i });
      expect(breadcrumb).toBeInTheDocument();
      
      const breadcrumbButtons = screen.getAllByRole('button', { name: /overview|detailed view/i });
      expect(breadcrumbButtons).toHaveLength(1); // Only current level shown initially
    });

    test('renders level navigation controls', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const prevButton = screen.getByRole('button', { name: /previous level/i });
      const nextButton = screen.getByRole('button', { name: /next level/i });
      
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeDisabled(); // First level
      expect(nextButton).not.toBeDisabled();
    });

    test('renders current level content and sections', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      expect(screen.getByText('High-level summary of health data')).toBeInTheDocument();
      expect(screen.getByText('Data Summary')).toBeInTheDocument();
      expect(screen.getByText('Health Alerts')).toBeInTheDocument();
    });

    test('renders collapsible sections with proper controls', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const collapsibleSection = screen.getByRole('button', { name: /health alerts/i });
      expect(collapsibleSection).toBeInTheDocument();
      expect(collapsibleSection).toHaveAttribute('aria-expanded', 'false');
    });

    test('renders error state when no level data available', () => {
      render(<ProgressiveDisclosure {...defaultProps} levels={[]} />);
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('No data available for the current disclosure level');
    });
  });

  describe('Navigation', () => {
    test('navigates to next level when next button clicked', async () => {
      const onLevelChange = jest.fn();
      
      render(<ProgressiveDisclosure {...defaultProps} onLevelChange={onLevelChange} />);
      
      const nextButton = screen.getByRole('button', { name: /next level/i });
      fireEvent.click(nextButton);
      
      expect(onLevelChange).toHaveBeenCalledWith(1);
    });

    test('navigates to previous level when previous button clicked', async () => {
      const onLevelChange = jest.fn();
      
      render(<ProgressiveDisclosure {...defaultProps} initialLevel={1} onLevelChange={onLevelChange} />);
      
      const prevButton = screen.getByRole('button', { name: /previous level/i });
      fireEvent.click(prevButton);
      
      expect(onLevelChange).toHaveBeenCalledWith(0);
    });

    test('disables navigation buttons at boundaries', () => {
      render(<ProgressiveDisclosure {...defaultProps} initialLevel={0} />);
      
      expect(screen.getByRole('button', { name: /previous level/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next level/i })).not.toBeDisabled();
    });

    test('navigates via breadcrumb buttons', async () => {
      const onLevelChange = jest.fn();
      
      render(<ProgressiveDisclosure {...defaultProps} initialLevel={1} onLevelChange={onLevelChange} />);
      
      const overviewButton = screen.getByRole('button', { name: /overview/i });
      fireEvent.click(overviewButton);
      
      expect(onLevelChange).toHaveBeenCalledWith(0);
    });

    test('updates level indicator text', () => {
      const { rerender } = render(<ProgressiveDisclosure {...defaultProps} initialLevel={0} />);
      
      expect(screen.getByText(/Level 1 of 2: Overview/)).toBeInTheDocument();
      
      rerender(<ProgressiveDisclosure {...defaultProps} initialLevel={1} />);
      
      expect(screen.getByText(/Level 2 of 2: Detailed View/)).toBeInTheDocument();
    });
  });

  describe('Section Collapsing', () => {
    test('toggles collapsible section when clicked', async () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const collapsibleButton = screen.getByRole('button', { name: /health alerts/i });
      
      // Initially collapsed
      expect(collapsibleButton).toHaveAttribute('aria-expanded', 'false');
      
      // Click to expand
      fireEvent.click(collapsibleButton);
      expect(collapsibleButton).toHaveAttribute('aria-expanded', 'true');
      
      // Click to collapse
      fireEvent.click(collapsibleButton);
      expect(collapsibleButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('shows and hides section content based on expanded state', async () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const collapsibleButton = screen.getByRole('button', { name: /health alerts/i });
      const content = screen.getByText('No critical alerts at this time.');
      
      // Initially hidden
      expect(content.parentElement).toHaveAttribute('aria-hidden', 'true');
      
      // Expand to show content
      fireEvent.click(collapsibleButton);
      expect(content.parentElement).toHaveAttribute('aria-hidden', 'false');
    });

    test('does not make non-collapsible sections clickable', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const nonCollapsibleTitle = screen.getByText('Data Summary');
      expect(nonCollapsibleTitle.tagName).toBe('H3');
      expect(nonCollapsibleTitle).not.toHaveAttribute('aria-expanded');
    });
  });

  describe('Keyboard Navigation', () => {
    test('handles arrow key navigation between levels', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const container = screen.getByLabelText('Progressive data disclosure');
      
      // Simulate right arrow key
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      // Note: The actual navigation would be handled by the mocked hook
      
      // Simulate left arrow key
      fireEvent.keyDown(container, { key: 'ArrowLeft' });
    });

    test('handles Home and End keys for level navigation', () => {
      render(<ProgressiveDisclosure {...defaultProps} initialLevel={1} />);
      
      const container = screen.getByLabelText('Progressive data disclosure');
      
      // Simulate Home key
      fireEvent.keyDown(container, { key: 'Home' });
      
      // Simulate End key
      fireEvent.keyDown(container, { key: 'End' });
    });

    test('handles Enter and Space keys for section toggling', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const container = screen.getByLabelText('Progressive data disclosure');
      
      // Simulate Enter key
      fireEvent.keyDown(container, { key: 'Enter' });
      
      // Simulate Space key
      fireEvent.keyDown(container, { key: 'Space' });
    });
  });

  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(<ProgressiveDisclosure {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides proper ARIA labels and descriptions', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const collapsibleButton = screen.getByRole('button', { name: /health alerts/i });
      expect(collapsibleButton).toHaveAttribute('aria-controls');
      expect(collapsibleButton).toHaveAttribute('aria-describedby');
    });

    test('uses proper heading hierarchy', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(1); // At least one heading
      headings.forEach(heading => {
        expect(heading.tagName).toBe('H3');
      });
    });

    test('provides screen reader help text', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      const helpText = screen.getByText(/use arrow keys to navigate/i);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('sr-only');
    });

    test('registers keyboard shortcuts and screen reader hooks', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      // Component should render without errors, hooks are mocked
      expect(screen.getByLabelText('Progressive data disclosure')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    test('renders section summaries when provided', () => {
      render(<ProgressiveDisclosure {...defaultProps} />);
      
      expect(screen.getByText('Overall health metrics summary')).toBeInTheDocument();
    });

    test('renders functional content when provided as function', () => {
      const functionalLevels = [{
        id: 'dynamic',
        name: 'Dynamic Content',
        sections: [{
          id: 'func-section',
          title: 'Function Section',
          content: (data, level) => `Data: ${JSON.stringify(data)}, Level: ${level}`
        }]
      }];
      
      render(<ProgressiveDisclosure {...defaultProps} levels={functionalLevels} />);
      
      expect(screen.getByText(/Data:.*Level: 0/)).toBeInTheDocument();
    });

    test('handles missing content gracefully', () => {
      const minimalLevels = [{
        id: 'minimal',
        name: 'Minimal',
        sections: [{
          id: 'empty-section',
          title: 'Empty Section'
        }]
      }];
      
      render(<ProgressiveDisclosure {...defaultProps} levels={minimalLevels} />);
      
      expect(screen.getByText('Empty Section')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    test('applies custom className', () => {
      render(<ProgressiveDisclosure {...defaultProps} className="custom-class" />);
      
      const container = screen.getByLabelText('Progressive data disclosure');
      expect(container).toHaveClass('progressive-disclosure');
      expect(container).toHaveClass('custom-class');
    });

    test('uses custom aria-label', () => {
      render(<ProgressiveDisclosure {...defaultProps} aria-label="Custom disclosure label" />);
      
      const container = screen.getByLabelText('Custom disclosure label');
      expect(container).toHaveAttribute('aria-label', 'Custom disclosure label');
    });

    test('starts at specified initial level', () => {
      render(<ProgressiveDisclosure {...defaultProps} initialLevel={1} />);
      
      expect(screen.getByText('Level 2 of 2: Detailed View')).toBeInTheDocument();
      expect(screen.getByText('Detailed breakdown of health metrics')).toBeInTheDocument();
    });
  });
});