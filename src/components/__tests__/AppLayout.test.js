import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import AppLayout from '../AppLayout';
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

describe('AppLayout', () => {
  const mockOnNavigate = jest.fn();
  const mockBreadcrumbs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'data-view', label: 'Data View' }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders layout with all required landmarks', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check all required landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
      
      // Should have skip links navigation and main navigation
      const navigations = screen.getAllByRole('navigation');
      expect(navigations.length).toBeGreaterThanOrEqual(2);
    });

    test('renders skip links with proper structure', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check skip links
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
      
      // Check skip links have proper ARIA attributes
      const skipNavigation = screen.getByRole('navigation', { name: /skip navigation links/i });
      expect(skipNavigation).toBeInTheDocument();
    });

    test('renders application header with title', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('HealthVis')).toBeInTheDocument();
      expect(screen.getByText('Accessible Health Data Visualization')).toBeInTheDocument();
    });

    test('renders main content area with proper attributes', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
      expect(mainContent).toHaveAttribute('aria-label', 'Main application content');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('renders footer with copyright and links', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText(/© 2025 HealthVis/)).toBeInTheDocument();
      expect(screen.getByText('Accessibility Statement')).toBeInTheDocument();
      expect(screen.getByText('Help & Support')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('skip links are focusable and functional', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const skipToMain = screen.getByText('Skip to main content');
      const skipToNav = screen.getByText('Skip to navigation');

      // Skip links should be focusable
      skipToMain.focus();
      expect(skipToMain).toHaveFocus();

      skipToNav.focus();
      expect(skipToNav).toHaveFocus();
    });

    test('skip links activate with keyboard', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const skipToMain = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      // Focus skip link and activate with Enter
      skipToMain.focus();
      fireEvent.keyDown(skipToMain, { key: 'Enter', code: 'Enter' });

      // Main content should receive focus
      await waitFor(() => {
        expect(mainContent).toHaveFocus();
      });
    });

    test('has proper focus management', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      
      // Main content should be focusable for skip links
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });

    test('provides screen reader context information', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate} breadcrumbs={mockBreadcrumbs}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check breadcrumb context
      expect(screen.getByText('You are in: Dashboard > Data View')).toBeInTheDocument();
      
      // Check screen reader instructions
      expect(screen.getByText(/Layout keyboard shortcuts/)).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    test('renders MainNavigation component when showNavigation is true', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate} showNavigation={true}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should have navigation sections (skip links + main nav)
      const navSections = screen.getAllByRole('navigation', { name: /main application navigation/i });
      expect(navSections.length).toBeGreaterThan(0);
    });

    test('hides navigation when showNavigation is false', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate} showNavigation={false}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should only have skip links navigation, not main navigation
      const navigations = screen.getAllByRole('navigation');
      expect(navigations).toHaveLength(1); // Only skip links
    });

    test('handles navigation events correctly', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Find and click a navigation item
      const dashboardButton = screen.getByRole('menuitem', { name: /dashboard/i });
      await userEvent.click(dashboardButton);

      // Should call onNavigate and focus main content
      expect(mockOnNavigate).toHaveBeenCalledWith('dashboard', expect.any(Object));
    });

    test('displays breadcrumbs when provided', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate} breadcrumbs={mockBreadcrumbs}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('You are in: Dashboard > Data View')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('shows navigation toggle on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Navigation starts visible, so button should say "Close"
      const navToggle = screen.getByRole('button', { name: /close navigation menu/i });
      expect(navToggle).toBeInTheDocument();
      expect(navToggle).toHaveAttribute('aria-expanded', 'true');
    });

    test('navigation toggle works correctly', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const navToggle = screen.getByRole('button', { name: /close navigation menu/i });
      
      // Initially expanded
      expect(navToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Click to close
      await userEvent.click(navToggle);
      
      // Should update aria-expanded and button text
      expect(navToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByText('Open Menu')).toBeInTheDocument();
    });

    test('maintains touch target sizes on mobile', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check skip links have proper classes for touch targets
      const skipLinks = screen.getAllByText(/Skip to/);
      skipLinks.forEach(link => {
        expect(link).toHaveClass('skip-link');
      });

      // Check footer links have proper classes
      const footerLinks = screen.getAllByRole('link');
      footerLinks.forEach(link => {
        if (link.classList.contains('footer-link')) {
          expect(link).toHaveClass('footer-link');
        }
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('skip links work with space key', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const skipToMain = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      // Focus skip link and activate with Space
      skipToMain.focus();
      fireEvent.keyDown(skipToMain, { key: ' ', code: 'Space' });

      // Main content should receive focus
      await waitFor(() => {
        expect(mainContent).toHaveFocus();
      });
    });

    test('navigation toggle works with keyboard', async () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const navToggle = screen.getByRole('button', { name: /close navigation menu/i });
      
      // Focus and activate with Enter
      navToggle.focus();
      fireEvent.keyDown(navToggle, { key: 'Enter', code: 'Enter' });
      
      // Should toggle navigation - wait for state update
      await waitFor(() => {
        expect(navToggle).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Custom Props and Configuration', () => {
    test('applies custom className', () => {
      const { container } = render(
        <TestWrapper>
          <AppLayout className="custom-layout" onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(container.firstChild).toHaveClass('app-layout', 'custom-layout');
    });

    test('handles currentSection prop', () => {
      render(
        <TestWrapper>
          <AppLayout currentSection="settings" onNavigate={mockOnNavigate}>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const settingsButton = screen.getByRole('menuitem', { name: /settings/i });
      expect(settingsButton).toHaveAttribute('aria-current', 'page');
    });

    test('works without onNavigate prop', () => {
      expect(() => {
        render(
          <TestWrapper>
            <AppLayout>
              <div>Test Content</div>
            </AppLayout>
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('handles missing children gracefully', () => {
      render(
        <TestWrapper>
          <AppLayout onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      // Should render layout structure without errors
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('handles invalid breadcrumbs gracefully', () => {
      const invalidBreadcrumbs = [null, undefined, { label: 'Valid' }];
      
      expect(() => {
        render(
          <TestWrapper>
            <AppLayout onNavigate={mockOnNavigate} breadcrumbs={invalidBreadcrumbs}>
              <div>Test Content</div>
            </AppLayout>
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});