import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import ModeOptimizedWrapper from '../ModeOptimizedWrapper';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper with AccessibilityProvider
const TestWrapper = ({ children, initialMode = 'visual' }) => {
  // Mock the context to set initial mode
  mockLocalStorage.getItem.mockImplementation((key) => {
    if (key === 'healthvis-accessibility-mode') return initialMode;
    return null;
  });

  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  );
};

describe('ModeOptimizedWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders children correctly', () => {
    render(
      <TestWrapper>
        <ModeOptimizedWrapper>
          <div>Test content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies visual mode classes by default', () => {
    render(
      <TestWrapper>
        <ModeOptimizedWrapper data-testid="wrapper">
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('mode-optimized-wrapper');
    expect(wrapper).toHaveClass('mode-visual');
    expect(wrapper).toHaveAttribute('data-accessibility-mode', 'visual');
  });

  it('applies audio mode classes and attributes', () => {
    render(
      <TestWrapper initialMode="audio">
        <ModeOptimizedWrapper data-testid="wrapper">
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('mode-audio');
    expect(wrapper).toHaveClass('audio-priority');
    expect(wrapper).toHaveClass('reduced-complexity');
    expect(wrapper).toHaveClass('keyboard-optimized');
    expect(wrapper).toHaveAttribute('data-accessibility-mode', 'audio');
    expect(wrapper).toHaveAttribute('data-audio-priority', 'true');
    expect(wrapper).toHaveAttribute('data-enhanced-sonification', 'true');
  });

  it('applies simplified mode classes and attributes', () => {
    render(
      <TestWrapper initialMode="simplified">
        <ModeOptimizedWrapper data-testid="wrapper">
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('mode-simplified');
    expect(wrapper).toHaveClass('reduced-complexity');
    expect(wrapper).toHaveClass('hide-advanced');
    expect(wrapper).toHaveClass('larger-targets');
    expect(wrapper).toHaveAttribute('data-accessibility-mode', 'simplified');
    expect(wrapper).toHaveAttribute('data-reduced-complexity', 'true');
  });

  it('applies hybrid mode classes and attributes', () => {
    render(
      <TestWrapper initialMode="hybrid">
        <ModeOptimizedWrapper data-testid="wrapper">
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('mode-hybrid');
    expect(wrapper).toHaveClass('audio-priority');
    expect(wrapper).toHaveClass('keyboard-optimized');
    expect(wrapper).toHaveAttribute('data-accessibility-mode', 'hybrid');
    expect(wrapper).toHaveAttribute('data-audio-priority', 'true');
    expect(wrapper).toHaveAttribute('data-keyboard-optimized', 'true');
  });

  it('preserves additional className prop', () => {
    render(
      <TestWrapper>
        <ModeOptimizedWrapper className="custom-class" data-testid="wrapper">
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveClass('mode-optimized-wrapper');
    expect(wrapper).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(
      <TestWrapper>
        <ModeOptimizedWrapper 
          data-testid="wrapper" 
          id="test-id"
          role="region"
        >
          <div>Content</div>
        </ModeOptimizedWrapper>
      </TestWrapper>
    );

    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper).toHaveAttribute('id', 'test-id');
    expect(wrapper).toHaveAttribute('role', 'region');
  });
});