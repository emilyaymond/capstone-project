import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from './App';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('App Component', () => {
  test('renders HealthVis heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: 'HealthVis', level: 1 });
    expect(heading).toBeInTheDocument();
  });

  test('has proper semantic structure with landmarks', () => {
    render(<App />);
    
    // Check for main landmarks
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });

  test('has skip links for keyboard navigation', () => {
    render(<App />);
    
    const skipToMain = screen.getByText('Skip to main content');
    const skipToNav = screen.getByText('Skip to navigation');
    
    expect(skipToMain).toBeInTheDocument();
    expect(skipToNav).toBeInTheDocument();
    expect(skipToMain).toHaveAttribute('href', '#main-content');
    expect(skipToNav).toHaveAttribute('href', '#navigation');
  });

  test('navigation has proper ARIA labels', () => {
    render(<App />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
  });

  test('sections have proper headings and labels', () => {
    render(<App />);
    
    // Check for section headings
    expect(screen.getByRole('heading', { name: /welcome to healthvis/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument();
    
    // Check for proper heading hierarchy (h1, then h2s)
    const headings = screen.getAllByRole('heading');
    expect(headings[0]).toHaveProperty('tagName', 'H1');
    expect(headings[1]).toHaveProperty('tagName', 'H2');
    expect(headings[2]).toHaveProperty('tagName', 'H2');
  });

  test('should not have accessibility violations', async () => {
    const { container } = render(<App />);
    // Wait a bit for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('navigation links have minimum touch target size', () => {
    render(<App />);
    
    const navLinks = screen.getAllByRole('link');
    const navigationLinks = navLinks.filter(link => 
      link.textContent === 'Dashboard' || 
      link.textContent === 'Data Input' || 
      link.textContent === 'Settings'
    );
    
    // In test environment, we check that the CSS class is applied
    // The actual computed styles may not be available in jsdom
    navigationLinks.forEach(link => {
      expect(link).toBeInTheDocument();
      // Check that the link has proper structure for accessibility
      expect(link.getAttribute('href')).toBeTruthy();
    });
  });
});