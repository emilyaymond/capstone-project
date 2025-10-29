import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import MainNavigation from '../MainNavigation';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock('../../hooks/useScreenReader', () => ({
  useScreenReader: () => ({
    announcePolite: jest.fn(),
    announceAssertive: jest.fn()
  })
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    registerKeyboardShortcuts: jest.fn(),
    unregisterKeyboardShortcuts: jest.fn()
  })
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('MainNavigation', () => {
  const mockOnNavigate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders navigation with all required elements', () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      // Check main navigation landmark
      expect(screen.getByRole('navigation', { name: /main application navigation/i })).toBeInTheDocument();
      
      // Check all navigation items
      expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /data input/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /help/i })).toBeInTheDocument();
    });

    test('renders with correct ARIA attributes', () => {
      render(
        <TestWrapper>
          <MainNavigation currentSection="dashboard" onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const navigation = screen.getByRole('navigation', { name: /main application navigation/i });
      expect(navigation).toHaveAttribute('aria-label', 'Main application navigation');

      const menubar = screen.getByRole('menubar');
      expect(menubar).toBeInTheDocument();

      // Check active item has aria-current
      const dashboardButton = screen.getByRole('menuitem', { name: /dashboard/i });
      expect(dashboardButton).toHaveAttribute('aria-current', 'page');
    });

    test('displays keyboard shortcuts', () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      // Check that keyboard shortcuts are displayed (aria-hidden for screen readers)
      expect(screen.getByText('Alt+D')).toBeInTheDocument();
      expect(screen.getByText('Alt+I')).toBeInTheDocument();
      expect(screen.getByText('Alt+S')).toBeInTheDocument();
      expect(screen.getByText('Alt+H')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides screen reader descriptions for each navigation item', () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      // Check that each navigation item has a description
      expect(screen.getByText(/view health data visualizations and summaries/i)).toBeInTheDocument();
      expect(screen.getByText(/enter or upload new health data/i)).toBeInTheDocument();
      expect(screen.getByText(/customize accessibility and display preferences/i)).toBeInTheDocument();
      expect(screen.getByText(/access help documentation and tutorials/i)).toBeInTheDocument();
    });

    test('has proper focus management', async () => {
      render(
        <TestWrapper>
          <MainNavigation currentSection="dashboard" onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const dashboardButton = screen.getByRole('menuitem', { name: /dashboard/i });
      const dataInputButton = screen.getByRole('menuitem', { name: /data input/i });

      // Active item should have tabIndex 0
      expect(dashboardButton).toHaveAttribute('tabIndex', '0');
      expect(dataInputButton).toHaveAttribute('tabIndex', '-1');

      // Focus should work correctly
      dashboardButton.focus();
      expect(dashboardButton).toHaveFocus();
    });

    test('meets minimum touch target size requirements', () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('menuitem');
      
      // Check that buttons have the nav-button class which applies min-height/width
      buttons.forEach(button => {
        expect(button).toHaveClass('nav-button');
        // In test environment, we verify the CSS class is applied
        // The actual CSS rules ensure 44px minimum touch targets
      });
    });
  });

  describe('Navigation Functionality', () => {
    test('calls onNavigate when navigation item is clicked', async () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const settingsButton = screen.getByRole('menuitem', { name: /settings/i });
      await userEvent.click(settingsButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('settings', expect.objectContaining({
        id: 'settings',
        label: 'Settings'
      }));
    });

    test('updates active state when navigation item is clicked', async () => {
      render(
        <TestWrapper>
          <MainNavigation currentSection="dashboard" onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const dataInputButton = screen.getByRole('menuitem', { name: /data input/i });
      await userEvent.click(dataInputButton);

      // Should update active state
      expect(dataInputButton).toHaveClass('nav-button--active');
      expect(dataInputButton).toHaveAttribute('aria-current', 'page');
    });

    test('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const dashboardButton = screen.getByRole('menuitem', { name: /dashboard/i });
      
      // Focus and activate with keyboard
      dashboardButton.focus();
      fireEvent.keyDown(dashboardButton, { key: 'Enter', code: 'Enter' });

      expect(mockOnNavigate).toHaveBeenCalledWith('dashboard', expect.objectContaining({
        id: 'dashboard',
        label: 'Dashboard'
      }));
    });

    test('supports space key activation', async () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const helpButton = screen.getByRole('menuitem', { name: /help/i });
      
      helpButton.focus();
      fireEvent.keyDown(helpButton, { key: ' ', code: 'Space' });

      expect(mockOnNavigate).toHaveBeenCalledWith('help', expect.objectContaining({
        id: 'help',
        label: 'Help'
      }));
    });
  });

  describe('Breadcrumb Navigation', () => {
    const mockBreadcrumbs = [
      { id: 'dashboard', label: 'Dashboard', onNavigate: jest.fn() },
      { id: 'data-view', label: 'Data View', onNavigate: jest.fn() },
      { id: 'chart-detail', label: 'Chart Detail' }
    ];

    test('renders breadcrumb navigation when provided', () => {
      render(
        <TestWrapper>
          <MainNavigation 
            onNavigate={mockOnNavigate} 
            breadcrumbs={mockBreadcrumbs}
          />
        </TestWrapper>
      );

      const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb navigation/i });
      expect(breadcrumbNav).toBeInTheDocument();

      // Check breadcrumb items
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /data view/i })).toBeInTheDocument();
      expect(screen.getByText('Chart Detail')).toBeInTheDocument();
    });

    test('handles breadcrumb navigation clicks', async () => {
      render(
        <TestWrapper>
          <MainNavigation 
            onNavigate={mockOnNavigate} 
            breadcrumbs={mockBreadcrumbs}
          />
        </TestWrapper>
      );

      const dashboardCrumb = screen.getByRole('button', { name: /dashboard/i });
      await userEvent.click(dashboardCrumb);

      expect(mockBreadcrumbs[0].onNavigate).toHaveBeenCalledWith(mockBreadcrumbs[0]);
    });

    test('marks current breadcrumb item correctly', () => {
      render(
        <TestWrapper>
          <MainNavigation 
            onNavigate={mockOnNavigate} 
            breadcrumbs={mockBreadcrumbs}
          />
        </TestWrapper>
      );

      const currentItem = screen.getByText('Chart Detail');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    test('does not render breadcrumbs when not provided', () => {
      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      expect(screen.queryByRole('navigation', { name: /breadcrumb navigation/i })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('maintains accessibility on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(
        <TestWrapper>
          <MainNavigation onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('menuitem');
      
      // Should still have nav-button class which ensures touch target requirements
      buttons.forEach(button => {
        expect(button).toHaveClass('nav-button');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing onNavigate prop gracefully', async () => {
      render(
        <TestWrapper>
          <MainNavigation />
        </TestWrapper>
      );

      const dashboardButton = screen.getByRole('menuitem', { name: /dashboard/i });
      
      // Should not throw error when clicking without onNavigate
      expect(() => {
        fireEvent.click(dashboardButton);
      }).not.toThrow();
    });

    test('handles invalid currentSection prop', () => {
      render(
        <TestWrapper>
          <MainNavigation currentSection="invalid-section" onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      // Should render without errors
      expect(screen.getByRole('navigation', { name: /main application navigation/i })).toBeInTheDocument();
    });
  });
});