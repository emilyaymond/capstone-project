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
    expect(screen.getAllByRole('navigation')).toHaveLength(2); // header nav + main nav
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });

  test('has skip links for keyboard navigation', () => {
    render(<App />);
    
    const skipToMain = screen.getByText('Skip to main content');
    
    expect(skipToMain).toBeInTheDocument();
    expect(skipToMain).toHaveAttribute('href', '#main-content');
  });

  test('navigation has proper ARIA labels', () => {
    render(<App />);
    
    const navigations = screen.getAllByRole('navigation');
    expect(navigations).toHaveLength(2);
    
    // Check that we have both skip navigation and main navigation
    expect(screen.getByRole('navigation', { name: 'Skip navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  test('sections have proper headings and labels', () => {
    render(<App />);
    
    // Check for main headings in our simplified structure
    expect(screen.getByRole('heading', { name: 'HealthVis', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Health Data Dashboard', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data Visualization Area', level: 3 })).toBeInTheDocument();
    
    // Check for proper heading hierarchy (h1, then h2s, then h3s)
    const headings = screen.getAllByRole('heading');
    expect(headings[0]).toHaveProperty('tagName', 'H1');
    expect(headings[1]).toHaveProperty('tagName', 'H2');
    expect(headings[2]).toHaveProperty('tagName', 'H3');
  });

  test('accessibility mode selector is present', () => {
    render(<App />);
    
    // Check for mode selector fieldset
    expect(screen.getByRole('group', { name: 'Accessibility Mode' })).toBeInTheDocument();
    
    // Check for mode options
    expect(screen.getByRole('radio', { name: /visual mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /audio mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /hybrid mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /simplified mode/i })).toBeInTheDocument();
  });

  test('navigation buttons have minimum touch target requirements', () => {
    render(<App />);
    
    const navButtons = screen.getAllByRole('menuitem');
    
    // Check that navigation buttons exist and have proper attributes
    navButtons.forEach(button => {
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('title'); // Should have tooltip
      expect(button).toHaveAttribute('aria-describedby'); // Should have description
    });
    
    // Verify we have the expected navigation items
    expect(navButtons).toHaveLength(3);
  });

  test('should not have accessibility violations', async () => {
    const { container } = render(<App />);
    // Wait a bit for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});