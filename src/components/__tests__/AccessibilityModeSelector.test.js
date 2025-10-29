import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import AccessibilityModeSelector from '../AccessibilityModeSelector';

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
const TestWrapper = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('AccessibilityModeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders all accessibility mode options', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    expect(screen.getByText('Accessibility Mode')).toBeInTheDocument();
    expect(screen.getByLabelText(/visual mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/audio-focused mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hybrid mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/simplified mode/i)).toBeInTheDocument();
  });

  it('has proper ARIA structure', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'mode-selector-heading');

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-labelledby', 'mode-selector-heading');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('shows visual mode as selected by default', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const visualModeRadio = screen.getByRole('radio', { name: /visual mode/i });
    expect(visualModeRadio).toBeChecked();

    const statusRegion = document.querySelector('.current-mode-status');
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('Visual Mode');
  });

  it('allows mode selection via radio buttons', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const audioModeRadio = screen.getByRole('radio', { name: /audio-focused mode/i });
    fireEvent.click(audioModeRadio);

    expect(audioModeRadio).toBeChecked();
    
    await waitFor(() => {
      const statusRegion = document.querySelector('.current-mode-status');
      expect(statusRegion).toHaveTextContent('Audio-Focused Mode');
    });
  });

  it('allows mode selection via label click', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const hybridModeLabel = screen.getByLabelText(/hybrid mode/i).closest('label');
    fireEvent.click(hybridModeLabel);

    const hybridModeRadio = screen.getByRole('radio', { name: /hybrid mode/i });
    expect(hybridModeRadio).toBeChecked();
  });

  it('supports keyboard navigation', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const visualModeRadio = screen.getByRole('radio', { name: /visual mode/i });
    visualModeRadio.focus();

    // Navigate to next option with arrow key
    fireEvent.keyDown(visualModeRadio, { key: 'ArrowDown' });
    
    const audioModeRadio = screen.getByRole('radio', { name: /audio-focused mode/i });
    expect(audioModeRadio).toHaveFocus();
  });

  it('announces mode changes to screen readers', async () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
    
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const simplifiedModeRadio = screen.getByRole('radio', { name: /simplified mode/i });
    fireEvent.click(simplifiedModeRadio);

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'screenReaderAnnouncement',
        detail: {
          message: expect.stringContaining('Switched to Simplified Mode')
        }
      })
    );

    mockDispatchEvent.mockRestore();
  });

  it('persists mode selection to localStorage', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const audioModeRadio = screen.getByRole('radio', { name: /audio-focused mode/i });
    fireEvent.click(audioModeRadio);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'healthvis-accessibility-mode',
        'audio'
      );
    });
  });

  it('loads saved mode from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'healthvis-accessibility-mode') return 'hybrid';
      return null;
    });

    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const hybridModeRadio = screen.getByRole('radio', { name: /hybrid mode/i });
    expect(hybridModeRadio).toBeChecked();
  });

  it('has accessible descriptions for each mode', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    expect(screen.getByText('Standard visual interface with charts and graphics')).toBeInTheDocument();
    expect(screen.getByText('Enhanced audio feedback with sonification and voice descriptions')).toBeInTheDocument();
    expect(screen.getByText('Combination of visual and audio features for optimal accessibility')).toBeInTheDocument();
    expect(screen.getByText('Reduced complexity interface with essential features only')).toBeInTheDocument();
  });

  it('shows visual indicators for selected mode', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const audioModeLabel = screen.getByLabelText(/audio-focused mode/i).closest('label');
    fireEvent.click(audioModeLabel);

    await waitFor(() => {
      expect(audioModeLabel).toHaveClass('selected');
    });
  });

  it('has proper focus management', async () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    // Focus first radio button
    const visualModeRadio = screen.getByRole('radio', { name: /visual mode/i });
    visualModeRadio.focus();
    expect(visualModeRadio).toHaveFocus();

    // Use arrow keys to navigate within radio group
    fireEvent.keyDown(visualModeRadio, { key: 'ArrowDown' });
    const audioModeRadio = screen.getByRole('radio', { name: /audio-focused mode/i });
    expect(audioModeRadio).toHaveFocus();
  });

  it('includes icons for visual identification', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const icons = document.querySelectorAll('.mode-icon');
    expect(icons).toHaveLength(4);
    
    // Icons should be hidden from screen readers
    icons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('has live region for status updates', () => {
    render(
      <TestWrapper>
        <AccessibilityModeSelector />
      </TestWrapper>
    );

    const statusRegion = document.querySelector('.current-mode-status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
  });
});