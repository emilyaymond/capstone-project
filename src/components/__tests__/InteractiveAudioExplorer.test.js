/**
 * InteractiveAudioExplorer Component Tests
 * Tests for interactive audio exploration functionality and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InteractiveAudioExplorer, { EXPLORATION_MODES, AUDIO_CUES } from '../InteractiveAudioExplorer';
import { createHealthDataPoint } from '../../models/HealthDataPoint';

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  createOscillator: jest.fn(() => ({
    type: 'sine',
    frequency: { 
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn()
    },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGain: jest.fn(() => ({
    gain: { 
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    },
    connect: jest.fn()
  })),
  destination: {}
};

// Mock global Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockAudioContext)
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockAudioContext)
});

describe('InteractiveAudioExplorer Component', () => {
  let mockHealthData;

  beforeEach(() => {
    // Create mock health data with normal ranges
    mockHealthData = [
      createHealthDataPoint({
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        value: 72,
        unit: 'bpm',
        category: 'vitals',
        normalRange: { min: 60, max: 100 }
      }),
      createHealthDataPoint({
        id: '2',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        value: 75,
        unit: 'bpm',
        category: 'vitals',
        normalRange: { min: 60, max: 100 }
      }),
      createHealthDataPoint({
        id: '3',
        timestamp: new Date('2024-01-01T10:10:00Z'),
        value: 110,
        unit: 'bpm',
        category: 'vitals',
        normalRange: { min: 60, max: 100 }
      })
    ];

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Rendering and Basic Functionality', () => {
    test('renders explorer with mode selector and navigation controls', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      expect(screen.getByText('Exploration Mode')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Audio Settings')).toBeInTheDocument();
      
      // Check mode buttons
      expect(screen.getByRole('radio', { name: /sequential/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /comparative/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /trend analysis/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /overview/i })).toBeInTheDocument();
    });

    test('renders empty state when no data provided', () => {
      render(<InteractiveAudioExplorer data={[]} />);
      
      expect(screen.getByText('No data available for audio exploration')).toBeInTheDocument();
    });

    test('initializes with sequential mode by default', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const sequentialButton = screen.getByRole('radio', { name: /sequential/i });
      expect(sequentialButton).toHaveAttribute('aria-checked', 'true');
    });

    test('allows setting initial mode', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} initialMode="comparative" />);
      
      const comparativeButton = screen.getByRole('radio', { name: /comparative/i });
      expect(comparativeButton).toHaveAttribute('aria-checked', 'true');
    });

    test('displays current position indicator', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    test('navigates to next data point', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const nextButton = screen.getByRole('button', { name: /next data point/i });
      await userEvent.click(nextButton);
      
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    test('navigates to previous data point', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      // First go to second item
      const nextButton = screen.getByRole('button', { name: /next data point/i });
      await userEvent.click(nextButton);
      
      // Then go back
      const prevButton = screen.getByRole('button', { name: /previous data point/i });
      await userEvent.click(prevButton);
      
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    test('disables navigation buttons at boundaries', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const prevButton = screen.getByRole('button', { name: /previous data point/i });
      expect(prevButton).toBeDisabled();
    });

    test('handles keyboard navigation', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      // Navigate with arrow keys
      fireEvent.keyDown(explorer, { key: 'ArrowRight' });
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
      
      fireEvent.keyDown(explorer, { key: 'ArrowLeft' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    test('handles keyboard shortcuts for navigation', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      // Test J/K navigation
      fireEvent.keyDown(explorer, { key: 'j' });
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
      
      fireEvent.keyDown(explorer, { key: 'k' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      
      // Test Home/End
      fireEvent.keyDown(explorer, { key: 'End' });
      expect(screen.getByText('3 of 3')).toBeInTheDocument();
      
      fireEvent.keyDown(explorer, { key: 'Home' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    test('toggles selection of current data point', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const selectButton = screen.getByRole('button', { name: /select current data point/i });
      await userEvent.click(selectButton);
      
      expect(screen.getByText('1 of 3 (Selected)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deselect current data point/i })).toBeInTheDocument();
    });

    test('handles keyboard selection', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      fireEvent.keyDown(explorer, { key: ' ' });
      expect(screen.getByText('1 of 3 (Selected)')).toBeInTheDocument();
    });

    test('clears selection with escape key', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      // Select a point
      fireEvent.keyDown(explorer, { key: ' ' });
      expect(screen.getByText('1 of 3 (Selected)')).toBeInTheDocument();
      
      // Clear selection
      fireEvent.keyDown(explorer, { key: 'Escape' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    test('calls onSelectionChange callback', async () => {
      const mockOnSelectionChange = jest.fn();
      render(
        <InteractiveAudioExplorer 
          data={mockHealthData} 
          onSelectionChange={mockOnSelectionChange}
        />
      );
      
      const selectButton = screen.getByRole('button', { name: /select current data point/i });
      await userEvent.click(selectButton);
      
      expect(mockOnSelectionChange).toHaveBeenCalledWith([0]);
    });
  });

  describe('Mode Switching', () => {
    test('switches between exploration modes', async () => {
      const mockOnModeChange = jest.fn();
      render(
        <InteractiveAudioExplorer 
          data={mockHealthData} 
          onModeChange={mockOnModeChange}
        />
      );
      
      const comparativeButton = screen.getByRole('radio', { name: /comparative/i });
      await userEvent.click(comparativeButton);
      
      expect(comparativeButton).toHaveAttribute('aria-checked', 'true');
      expect(mockOnModeChange).toHaveBeenCalledWith('comparative');
    });

    test('shows mode-specific actions in comparative mode', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} initialMode="comparative" />);
      
      expect(screen.getByText('Selected: 0 data points')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compare selected/i })).toBeInTheDocument();
    });

    test('shows overview actions in overview mode', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} initialMode="overview" />);
      
      expect(screen.getByRole('button', { name: /provide data overview/i })).toBeInTheDocument();
    });

    test('handles keyboard shortcuts for mode switching', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      // Switch to comparative mode
      fireEvent.keyDown(explorer, { key: 'c' });
      const comparativeButton = screen.getByRole('radio', { name: /comparative/i });
      expect(comparativeButton).toHaveAttribute('aria-checked', 'true');
      
      // Switch to trend mode
      fireEvent.keyDown(explorer, { key: 't' });
      const trendButton = screen.getByRole('radio', { name: /trend analysis/i });
      expect(trendButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Audio Settings', () => {
    test('renders audio settings controls', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      expect(screen.getByLabelText(/navigation sounds/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trend audio cues/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/boundary alerts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/audio volume/i)).toBeInTheDocument();
    });

    test('toggles audio settings', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const navigationSounds = screen.getByLabelText(/navigation sounds/i);
      expect(navigationSounds).toBeChecked();
      
      await userEvent.click(navigationSounds);
      expect(navigationSounds).not.toBeChecked();
    });

    test('adjusts volume setting', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const volumeSlider = screen.getByLabelText(/audio volume/i);
      expect(volumeSlider).toHaveValue('0.7');
      
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });
      expect(volumeSlider).toHaveValue('0.5');
    });

    test('applies custom audio settings', () => {
      const customSettings = {
        volume: 0.5,
        enableAudioCues: false,
        enableTrendSounds: false
      };
      
      render(
        <InteractiveAudioExplorer 
          data={mockHealthData} 
          customAudioSettings={customSettings}
        />
      );
      
      expect(screen.getByLabelText(/navigation sounds/i)).not.toBeChecked();
      expect(screen.getByLabelText(/trend audio cues/i)).not.toBeChecked();
      expect(screen.getByLabelText(/audio volume/i)).toHaveValue('0.5');
    });
  });

  describe('Comparative Mode Features', () => {
    test('enables comparison when multiple points selected', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} initialMode="comparative" />);
      
      // Select first point
      const selectButton = screen.getByRole('button', { name: /select current data point/i });
      await userEvent.click(selectButton);
      
      // Navigate and select second point
      const nextButton = screen.getByRole('button', { name: /next data point/i });
      await userEvent.click(nextButton);
      await userEvent.click(selectButton);
      
      // Compare button should be enabled
      const compareButton = screen.getByRole('button', { name: /compare selected/i });
      expect(compareButton).not.toBeDisabled();
      
      expect(screen.getByText('Selected: 2 data points')).toBeInTheDocument();
    });

    test('disables comparison with insufficient selection', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} initialMode="comparative" />);
      
      const compareButton = screen.getByRole('button', { name: /compare selected/i });
      expect(compareButton).toBeDisabled();
    });
  });

  describe('Accessibility Features', () => {
    test('provides proper ARIA labels and roles', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      expect(explorer).toHaveAttribute('aria-label', 'Interactive audio data explorer');
      
      const modeGroup = screen.getByRole('radiogroup');
      expect(modeGroup).toHaveAttribute('aria-label', 'Exploration mode');
    });

    test('includes screen reader announcements', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const announcement = screen.getByLabelText(/interactive audio data explorer/i)
        .querySelector('[aria-live="polite"]');
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveClass('sr-only');
    });

    test('provides keyboard shortcuts help', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const helpSection = screen.getByText('Keyboard Shortcuts');
      expect(helpSection).toBeInTheDocument();
      
      // Check for some key shortcuts
      expect(screen.getByText('← / K')).toBeInTheDocument();
      expect(screen.getByText('Previous data point')).toBeInTheDocument();
    });

    test('handles focus management correctly', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      expect(explorer).toHaveFocus();
    });

    test('can disable keyboard shortcuts', () => {
      render(
        <InteractiveAudioExplorer 
          data={mockHealthData} 
          enableKeyboardShortcuts={false}
        />
      );
      
      const explorer = screen.getByRole('application');
      explorer.focus();
      
      // Keyboard navigation should not work
      fireEvent.keyDown(explorer, { key: 'ArrowRight' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument(); // Should stay at first item
    });
  });

  describe('Audio Integration', () => {
    test('initializes Web Audio API', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      // Audio should be initialized on mount
      await waitFor(() => {
        expect(window.AudioContext).toHaveBeenCalled();
      });
    });

    test('integrates with DataSonification component', () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      // Should render the sonification component
      expect(screen.getByText('Data Sonification')).toBeInTheDocument();
    });

    test('passes selected data to sonification', async () => {
      render(<InteractiveAudioExplorer data={mockHealthData} />);
      
      // Select a data point
      const selectButton = screen.getByRole('button', { name: /select current data point/i });
      await userEvent.click(selectButton);
      
      // Sonification should still be present (it handles the data internally)
      expect(screen.getByText('Data Sonification')).toBeInTheDocument();
    });
  });

  describe('Data Point Focus Callback', () => {
    test('calls onDataPointFocus when navigating', async () => {
      const mockOnDataPointFocus = jest.fn();
      render(
        <InteractiveAudioExplorer 
          data={mockHealthData} 
          onDataPointFocus={mockOnDataPointFocus}
        />
      );
      
      const nextButton = screen.getByRole('button', { name: /next data point/i });
      await userEvent.click(nextButton);
      
      expect(mockOnDataPointFocus).toHaveBeenCalledWith(
        mockHealthData[1], 
        1, 
        expect.any(Object)
      );
    });
  });

  describe('Constants and Exports', () => {
    test('exports exploration modes correctly', () => {
      expect(EXPLORATION_MODES).toBeDefined();
      expect(EXPLORATION_MODES.sequential).toBeDefined();
      expect(EXPLORATION_MODES.comparative).toBeDefined();
      expect(EXPLORATION_MODES.trend).toBeDefined();
      expect(EXPLORATION_MODES.overview).toBeDefined();
    });

    test('exports audio cues correctly', () => {
      expect(AUDIO_CUES).toBeDefined();
      expect(AUDIO_CUES.navigation).toBeDefined();
      expect(AUDIO_CUES.selection).toBeDefined();
      expect(AUDIO_CUES.trends).toBeDefined();
      expect(AUDIO_CUES.boundaries).toBeDefined();
    });

    test('audio cues have required properties', () => {
      Object.values(AUDIO_CUES).forEach(category => {
        Object.values(category).forEach(cue => {
          expect(cue).toHaveProperty('frequency');
          expect(cue).toHaveProperty('duration');
          expect(cue).toHaveProperty('type');
        });
      });
    });
  });
});