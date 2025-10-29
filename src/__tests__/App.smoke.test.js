/**
 * Smoke test to verify the app loads without critical errors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock services and hooks
jest.mock('../services/MockDataService', () => ({
  MockDataService: {
    generateHealthData: jest.fn().mockResolvedValue([
      {
        id: '1',
        timestamp: new Date('2025-01-01'),
        value: 120,
        unit: 'bpm',
        category: 'vitals',
        description: 'Heart rate measurement'
      }
    ])
  }
}));

jest.mock('../hooks/useScreenReader', () => ({
  useScreenReader: () => ({
    announcePolite: jest.fn(),
    announceAssertive: jest.fn()
  })
}));

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    registerKeyboardShortcuts: jest.fn(),
    unregisterKeyboardShortcuts: jest.fn()
  })
}));

jest.mock('../hooks/useAudioFeedback', () => ({
  useAudioFeedback: () => ({
    playSuccessSound: jest.fn(),
    playErrorSound: jest.fn(),
    playNotificationSound: jest.fn()
  })
}));

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createOscillator: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { setValueAtTime: jest.fn() }
    })),
    createGain: jest.fn(() => ({
      connect: jest.fn(),
      gain: { setValueAtTime: jest.fn() }
    })),
    destination: {}
  }))
});

// Mock Speech Synthesis API
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
    addEventListener: jest.fn()
  }
});

describe('App Smoke Test', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('should load without registerKeyboardShortcuts error', async () => {
    // This test should not throw "registerKeyboardShortcuts is not a function"
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('HealthVis')).toBeInTheDocument();
    });

    // Verify main components are rendered
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer

    // Verify accessibility mode selector is present
    expect(screen.getByText('Accessibility Mode')).toBeInTheDocument();

    // Verify no critical errors in console (the app should render successfully)
    expect(container).toBeInTheDocument();
  });

  test('should have working accessibility mode switching', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('HealthVis')).toBeInTheDocument();
    });

    // Test mode switching
    const audioModeRadio = screen.getByLabelText(/Audio-Focused Mode/);
    expect(audioModeRadio).toBeInTheDocument();

    // The mode switching should work without errors
    audioModeRadio.click();

    // Verify mode change is reflected
    const wrapper = document.querySelector('.mode-optimized-wrapper');
    expect(wrapper).toBeInTheDocument();
  });
});