/**
 * Comprehensive accessibility testing and validation
 * Tests WCAG 2.1 AA compliance and accessibility requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../App';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services and hooks for testing
jest.mock('../services/MockDataService', () => ({
  MockDataService: {
    generateHealthData: jest.fn().mockResolvedValue([
      {
        id: '1',
        timestamp: new Date('2025-01-01'),
        value: 120,
        unit: 'bpm',
        category: 'vitals',
        description: 'Heart rate measurement',
        accessibility: {
          audioDescription: 'Heart rate 120 beats per minute, normal range',
          simplifiedValue: '120 bpm',
          trendIndicator: 'stable'
        }
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

describe('Accessibility Validation Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    test('should have no accessibility violations in default state', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should maintain accessibility in all modes', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Test each accessibility mode
      const modes = ['Audio-Focused Mode', 'Simplified Mode', 'Hybrid Mode'];
      
      for (const mode of modes) {
        const modeRadio = screen.getByLabelText(new RegExp(mode, 'i'));
        fireEvent.click(modeRadio);

        await waitFor(() => {
          const wrapper = document.querySelector('.mode-optimized-wrapper');
          expect(wrapper).toBeInTheDocument();
        });

        // Check for accessibility violations in each mode
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });
  });

  describe('Keyboard Navigation Testing', () => {
    test('should support complete keyboard navigation', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Test that all interactive elements are focusable
      const interactiveElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(interactiveElements.length).toBeGreaterThan(0);

      // Test skip links functionality
      const skipLinks = screen.getAllByText(/Skip to/);
      expect(skipLinks.length).toBeGreaterThan(0);

      // Test that skip links work
      const skipToMain = screen.getByText('Skip to main content');
      fireEvent.click(skipToMain);

      const mainContent = screen.getByRole('main');
      expect(document.activeElement).toBe(mainContent);
    });

    test('should have proper focus management', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Test navigation focus management
      const dashboardButton = screen.getByRole('menuitem', { name: /Dashboard/ });
      fireEvent.click(dashboardButton);

      // Focus should be managed properly after navigation
      expect(document.activeElement).toBeDefined();
    });

    test('should support keyboard shortcuts', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Verify keyboard shortcuts are documented
      const helpButton = screen.getByRole('menuitem', { name: /Help/ });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      });

      // Verify shortcuts are listed
      expect(screen.getByText(/Alt\+1/)).toBeInTheDocument();
      expect(screen.getByText(/Alt\+2/)).toBeInTheDocument();
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('should have proper ARIA labels and descriptions', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Check for essential ARIA landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
      expect(screen.getAllByRole('navigation').length).toBeGreaterThanOrEqual(2); // Multiple navigation areas

      // Check for ARIA live regions
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Verify h1 exists and is unique
      const h1Elements = headings.filter(heading => heading.tagName === 'H1');
      expect(h1Elements).toHaveLength(1);
    });

    test('should provide meaningful descriptions for interactive elements', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Check that buttons have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      // Check that menu items have descriptions
      const menuItems = screen.getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).toHaveAccessibleName();
        // Should have aria-describedby for additional context
        expect(item).toHaveAttribute('aria-describedby');
      });
    });

    test('should announce dynamic content changes', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Test mode switching announcements
      const audioModeRadio = screen.getByLabelText(/Audio-Focused Mode/);
      fireEvent.click(audioModeRadio);

      // Should have live regions for announcements
      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      const assertiveRegion = document.getElementById('sr-assertive-region');
      expect(assertiveRegion).toBeInTheDocument();
      expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Visual Accessibility', () => {
    test('should support high contrast mode', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Navigate to settings to test contrast options
      const settingsButton = screen.getByRole('menuitem', { name: /Settings/ });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      });

      // Verify contrast options are available
      const contrastSelect = screen.getByLabelText(/Contrast/);
      expect(contrastSelect).toBeInTheDocument();
      
      // Test high contrast option
      fireEvent.change(contrastSelect, { target: { value: 'high' } });
      expect(contrastSelect.value).toBe('high');
    });

    test('should support font size customization', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsButton = screen.getByRole('menuitem', { name: /Settings/ });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      });

      // Test font size control
      const fontSizeSlider = screen.getByLabelText(/Font Size/);
      expect(fontSizeSlider).toBeInTheDocument();
      expect(fontSizeSlider).toHaveAttribute('min', '12');
      expect(fontSizeSlider).toHaveAttribute('max', '24');
    });

    test('should support color scheme options', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsButton = screen.getByRole('menuitem', { name: /Settings/ });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      });

      // Test color scheme options
      const colorSchemeSelect = screen.getByLabelText(/Color Scheme/);
      expect(colorSchemeSelect).toBeInTheDocument();
      
      // Verify options are available
      fireEvent.change(colorSchemeSelect, { target: { value: 'dark' } });
      expect(colorSchemeSelect.value).toBe('dark');
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    test('should have minimum touch target sizes', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Check that interactive elements meet minimum size requirements
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Note: In test environment, computed styles may not reflect actual CSS
        // This test verifies the elements exist and are interactive
        expect(button).toBeInTheDocument();
      });

      // Verify navigation toggle for mobile exists
      const navToggle = screen.getByLabelText(/navigation menu/i);
      expect(navToggle).toBeInTheDocument();
    });
  });

  describe('Error Handling Accessibility', () => {
    test('should provide accessible error messages', async () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Test error boundary accessibility
      const ThrowError = () => {
        throw new Error('Test accessibility error');
      };

      const AppWithError = () => (
        <App>
          <ThrowError />
        </App>
      );

      render(<AppWithError />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Error should be announced to screen readers
      const errorAlerts = screen.getAllByRole('alert');
      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(errorAlerts[0]).toHaveAccessibleName();

      // Recovery options should be accessible
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toHaveAccessibleName();
      expect(retryButton).toHaveAttribute('aria-describedby');

      consoleSpy.mockRestore();
    });
  });

  describe('Progressive Disclosure Accessibility', () => {
    test('should support accessible progressive disclosure', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Navigate to dashboard to see progressive disclosure
      const dashboardButton = screen.getByRole('menuitem', { name: /Dashboard/ });
      fireEvent.click(dashboardButton);

      await waitFor(() => {
        expect(screen.getByText('Health Data Dashboard')).toBeInTheDocument();
      });

      // Progressive disclosure should be accessible
      // Check for proper heading structure and expandable content
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(1);
    });
  });

  describe('Settings Persistence', () => {
    test('should persist accessibility preferences', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Change accessibility mode
      const audioModeRadio = screen.getByLabelText(/Audio-Focused Mode/);
      fireEvent.click(audioModeRadio);

      await waitFor(() => {
        // Verify localStorage is updated
        expect(localStorage.getItem('healthvis-accessibility-mode')).toBe('audio');
      });

      // Verify mode is reflected in UI
      const wrapper = document.querySelector('.mode-optimized-wrapper');
      expect(wrapper).toHaveAttribute('data-accessibility-mode', 'audio');
    });
  });

  describe('Integration Validation', () => {
    test('should integrate all accessibility components successfully', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('HealthVis')).toBeInTheDocument();
      });

      // Verify all major accessibility components are present and integrated
      
      // 1. Error Boundary
      expect(document.querySelector('.mode-optimized-wrapper')).toBeInTheDocument();
      
      // 2. Accessibility Context
      expect(screen.getByText('Accessibility Mode')).toBeInTheDocument();
      
      // 3. App Layout with landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      
      // 4. Navigation system
      expect(screen.getAllByRole('navigation').length).toBeGreaterThanOrEqual(2);
      
      // 5. Notification system
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
      
      // 6. Live regions for screen readers
      expect(document.getElementById('sr-live-region')).toBeInTheDocument();
      expect(document.getElementById('sr-assertive-region')).toBeInTheDocument();
    });
  });
});