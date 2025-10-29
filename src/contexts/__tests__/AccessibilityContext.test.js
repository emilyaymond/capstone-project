import { renderHook } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from '../AccessibilityContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Wrapper component for testing
const wrapper = ({ children }) => (
  <AccessibilityProvider>{children}</AccessibilityProvider>
);

describe('AccessibilityContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should provide initial state', () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    
    expect(result.current.mode).toBe('visual');
    expect(result.current.isScreenReaderActive).toBe(false);
    expect(result.current.preferences).toBeDefined();
    expect(result.current.preferences.visualSettings).toBeDefined();
    expect(result.current.preferences.audioSettings).toBeDefined();
    expect(result.current.preferences.interactionSettings).toBeDefined();
  });

  test('should provide action functions', () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    
    expect(typeof result.current.setMode).toBe('function');
    expect(typeof result.current.updatePreferences).toBe('function');
    expect(typeof result.current.setScreenReaderActive).toBe('function');
    expect(typeof result.current.announceToScreenReader).toBe('function');
  });
});