/**
 * DataSonification Component Tests
 * Tests for data sonification functionality, accessibility, and audio output
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DataSonification, { AUDIO_MAPPINGS, PLAYBACK_SPEEDS } from '../DataSonification';
import { createHealthDataPoint } from '../../models/HealthDataPoint';

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  createOscillator: jest.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: jest.fn() },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null
  })),
  createGain: jest.fn(() => ({
    gain: { 
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    },
    connect: jest.fn()
  })),
  createBiquadFilter: jest.fn(() => ({
    type: 'lowpass',
    frequency: { setValueAtTime: jest.fn() },
    Q: { setValueAtTime: jest.fn() },
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

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

describe('DataSonification Component', () => {
  let mockHealthData;

  beforeEach(() => {
    // Create mock health data
    mockHealthData = [
      createHealthDataPoint({
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        value: 72,
        unit: 'bpm',
        category: 'vitals',
        description: 'Heart rate measurement'
      }),
      createHealthDataPoint({
        id: '2',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        value: 75,
        unit: 'bpm',
        category: 'vitals',
        description: 'Heart rate measurement'
      }),
      createHealthDataPoint({
        id: '3',
        timestamp: new Date('2024-01-01T10:10:00Z'),
        value: 120,
        unit: 'mmHg',
        category: 'vitals',
        description: 'Blood pressure systolic'
      })
    ];

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering and Basic Functionality', () => {
    test('renders sonification component with controls', () => {
      render(<DataSonification data={mockHealthData} />);
      
      expect(screen.getByText('Data Sonification')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play sonification/i })).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('renders without controls when showControls is false', () => {
      render(<DataSonification data={mockHealthData} showControls={false} />);
      
      expect(screen.getByText('Data Sonification')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('displays loading state during initialization', async () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      await userEvent.click(playButton);
      
      // Should show loading state briefly
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('displays error message when audio initialization fails', async () => {
      // Mock AudioContext to throw error
      window.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('Audio not supported');
      });

      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      await userEvent.click(playButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to initialize audio/i)).toBeInTheDocument();
      });
    });

    test('disables play button when no data provided', () => {
      render(<DataSonification data={[]} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      expect(playButton).toBeDisabled();
    });
  });

  describe('Audio Functionality', () => {
    test('initializes Web Audio API on play button click', async () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      await userEvent.click(playButton);

      expect(window.AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('creates audio nodes for sonification', async () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      await userEvent.click(playButton);

      await waitFor(() => {
        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      });
    });

    test('handles playback speed changes', () => {
      const { rerender } = render(
        <DataSonification data={mockHealthData} playbackSpeed="fast" />
      );
      
      expect(screen.getByText('Fast')).toBeInTheDocument();

      rerender(<DataSonification data={mockHealthData} playbackSpeed="slow" />);
      expect(screen.getByText('Slow')).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    test('toggles between play and stop states', async () => {
      const mockOnPlayStateChange = jest.fn();
      render(
        <DataSonification 
          data={mockHealthData} 
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      
      // Start playback
      await userEvent.click(playButton);
      await waitFor(() => {
        expect(mockOnPlayStateChange).toHaveBeenCalledWith(true);
      });
    });

    test('shows progress during playback', async () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      await userEvent.click(playButton);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '0');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });
  });

  describe('Accessibility Features', () => {
    test('provides proper ARIA labels and roles', () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      expect(playButton).toHaveAttribute('aria-label');
    });

    test('announces trend information to screen readers', () => {
      render(<DataSonification data={mockHealthData} />);
      
      const liveRegion = screen.getByText(/sonification ready for/i);
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveClass('sr-only');
    });

    test('provides keyboard navigation support', async () => {
      render(<DataSonification data={mockHealthData} />);
      
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      
      // Test keyboard activation
      playButton.focus();
      expect(playButton).toHaveFocus();
      
      fireEvent.keyDown(playButton, { key: 'Enter' });
      await waitFor(() => {
        expect(window.AudioContext).toHaveBeenCalled();
      });
    });
  });

  describe('Data Processing', () => {
    test('handles empty data gracefully', () => {
      render(<DataSonification data={[]} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      const playButton = screen.getByRole('button', { name: /play sonification/i });
      expect(playButton).toBeDisabled();
    });

    test('processes different data categories correctly', () => {
      const mixedData = [
        createHealthDataPoint({
          id: '1',
          timestamp: new Date(),
          value: 72,
          unit: 'bpm',
          category: 'vitals'
        }),
        createHealthDataPoint({
          id: '2',
          timestamp: new Date(),
          value: 8000,
          unit: 'steps',
          category: 'activity'
        }),
        createHealthDataPoint({
          id: '3',
          timestamp: new Date(),
          value: 3,
          unit: 'scale 1-10',
          category: 'symptoms'
        })
      ];

      render(<DataSonification data={mixedData} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    test('cleans up audio resources on unmount', () => {
      const { unmount } = render(<DataSonification data={mockHealthData} />);
      
      unmount();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('Audio Mappings and Constants', () => {
    test('exports audio mappings correctly', () => {
      expect(AUDIO_MAPPINGS).toBeDefined();
      expect(AUDIO_MAPPINGS.vitals).toBeDefined();
      expect(AUDIO_MAPPINGS.symptoms).toBeDefined();
      expect(AUDIO_MAPPINGS.activity).toBeDefined();
      expect(AUDIO_MAPPINGS.medication).toBeDefined();
    });

    test('exports playback speeds correctly', () => {
      expect(PLAYBACK_SPEEDS).toBeDefined();
      expect(PLAYBACK_SPEEDS.slow).toEqual({ multiplier: 0.5, label: 'Slow' });
      expect(PLAYBACK_SPEEDS.normal).toEqual({ multiplier: 1.0, label: 'Normal' });
      expect(PLAYBACK_SPEEDS.fast).toEqual({ multiplier: 1.5, label: 'Fast' });
      expect(PLAYBACK_SPEEDS.veryFast).toEqual({ multiplier: 2.0, label: 'Very Fast' });
    });

    test('audio mappings have required properties', () => {
      Object.values(AUDIO_MAPPINGS).forEach(category => {
        Object.values(category).forEach(mapping => {
          expect(mapping).toHaveProperty('baseFrequency');
          expect(mapping).toHaveProperty('range');
          expect(mapping).toHaveProperty('waveform');
          expect(Array.isArray(mapping.range)).toBe(true);
          expect(mapping.range).toHaveLength(2);
        });
      });
    });
  });
});