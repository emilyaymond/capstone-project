import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../useKeyboardNavigation';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import keyboardNavigationService from '../../services/KeyboardNavigationService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock the KeyboardNavigationService
jest.mock('../../services/KeyboardNavigationService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    registerShortcut: jest.fn(),
    unregisterShortcut: jest.fn(),
    toggleShortcut: jest.fn(),
    focusElement: jest.fn(),
    focusFirst: jest.fn(),
    focusLast: jest.fn(),
    navigateToNext: jest.fn(),
    navigateToPrevious: jest.fn(),
    navigateToNextLandmark: jest.fn(),
    showSkipLinks: jest.fn(),
    setupFocusTrap: jest.fn(),
    exitFocusTrap: jest.fn(),
    getShortcuts: jest.fn().mockReturnValue([]),
    updateFocusableElements: jest.fn(),
  },
}));

// Wrapper component for testing
const wrapper = ({ children }) => (
  <AccessibilityProvider>{children}</AccessibilityProvider>
);

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should initialize keyboard navigation service when shortcuts are enabled', () => {
    renderHook(() => useKeyboardNavigation(), { wrapper });

    expect(keyboardNavigationService.initialize).toHaveBeenCalled();
  });

  test('should provide registerShortcut function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.registerShortcut('h', { ctrlKey: true }, jest.fn(), 'Help');
    });

    expect(keyboardNavigationService.registerShortcut).toHaveBeenCalledWith(
      'h',
      { ctrlKey: true },
      expect.any(Function),
      'Help'
    );
  });

  test('should provide unregisterShortcut function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.unregisterShortcut('h', { ctrlKey: true });
    });

    expect(keyboardNavigationService.unregisterShortcut).toHaveBeenCalledWith('h', { ctrlKey: true });
  });

  test('should provide toggleShortcut function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.toggleShortcut('h', { ctrlKey: true }, false);
    });

    expect(keyboardNavigationService.toggleShortcut).toHaveBeenCalledWith('h', { ctrlKey: true }, false);
  });

  test('should provide focusElement function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });
    const mockElement = document.createElement('button');

    act(() => {
      result.current.focusElement(mockElement);
    });

    expect(keyboardNavigationService.focusElement).toHaveBeenCalledWith(mockElement);
  });

  test('should provide focusFirst function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.focusFirst();
    });

    expect(keyboardNavigationService.focusFirst).toHaveBeenCalled();
  });

  test('should provide focusLast function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.focusLast();
    });

    expect(keyboardNavigationService.focusLast).toHaveBeenCalled();
  });

  test('should provide navigateToNext function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.navigateToNext();
    });

    expect(keyboardNavigationService.navigateToNext).toHaveBeenCalled();
  });

  test('should provide navigateToPrevious function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.navigateToPrevious();
    });

    expect(keyboardNavigationService.navigateToPrevious).toHaveBeenCalled();
  });

  test('should provide navigateToNextLandmark function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.navigateToNextLandmark();
    });

    expect(keyboardNavigationService.navigateToNextLandmark).toHaveBeenCalled();
  });

  test('should provide showSkipLinks function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.showSkipLinks();
    });

    expect(keyboardNavigationService.showSkipLinks).toHaveBeenCalled();
  });

  test('should provide setupFocusTrap function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });
    const mockContainer = document.createElement('div');

    act(() => {
      result.current.setupFocusTrap(mockContainer);
    });

    expect(keyboardNavigationService.setupFocusTrap).toHaveBeenCalledWith(mockContainer);
  });

  test('should provide exitFocusTrap function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.exitFocusTrap();
    });

    expect(keyboardNavigationService.exitFocusTrap).toHaveBeenCalled();
  });

  test('should provide getShortcuts function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.getShortcuts();
    });

    expect(keyboardNavigationService.getShortcuts).toHaveBeenCalled();
  });

  test('should provide updateFocusableElements function', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    act(() => {
      result.current.updateFocusableElements();
    });

    expect(keyboardNavigationService.updateFocusableElements).toHaveBeenCalled();
  });

  test('should return keyboard navigation enabled state', () => {
    const { result } = renderHook(() => useKeyboardNavigation(), { wrapper });

    expect(typeof result.current.isKeyboardNavigationEnabled).toBe('boolean');
  });

  test('should memoize callback functions', () => {
    const { result, rerender } = renderHook(() => useKeyboardNavigation(), { wrapper });

    const firstRenderCallbacks = {
      registerShortcut: result.current.registerShortcut,
      unregisterShortcut: result.current.unregisterShortcut,
      toggleShortcut: result.current.toggleShortcut,
      focusElement: result.current.focusElement,
      focusFirst: result.current.focusFirst,
      focusLast: result.current.focusLast,
      navigateToNext: result.current.navigateToNext,
      navigateToPrevious: result.current.navigateToPrevious,
      navigateToNextLandmark: result.current.navigateToNextLandmark,
      showSkipLinks: result.current.showSkipLinks,
      setupFocusTrap: result.current.setupFocusTrap,
      exitFocusTrap: result.current.exitFocusTrap,
      getShortcuts: result.current.getShortcuts,
      updateFocusableElements: result.current.updateFocusableElements,
    };

    rerender();

    // Callbacks should be the same reference (memoized)
    expect(result.current.registerShortcut).toBe(firstRenderCallbacks.registerShortcut);
    expect(result.current.unregisterShortcut).toBe(firstRenderCallbacks.unregisterShortcut);
    expect(result.current.toggleShortcut).toBe(firstRenderCallbacks.toggleShortcut);
    expect(result.current.focusElement).toBe(firstRenderCallbacks.focusElement);
    expect(result.current.focusFirst).toBe(firstRenderCallbacks.focusFirst);
    expect(result.current.focusLast).toBe(firstRenderCallbacks.focusLast);
    expect(result.current.navigateToNext).toBe(firstRenderCallbacks.navigateToNext);
    expect(result.current.navigateToPrevious).toBe(firstRenderCallbacks.navigateToPrevious);
    expect(result.current.navigateToNextLandmark).toBe(firstRenderCallbacks.navigateToNextLandmark);
    expect(result.current.showSkipLinks).toBe(firstRenderCallbacks.showSkipLinks);
    expect(result.current.setupFocusTrap).toBe(firstRenderCallbacks.setupFocusTrap);
    expect(result.current.exitFocusTrap).toBe(firstRenderCallbacks.exitFocusTrap);
    expect(result.current.getShortcuts).toBe(firstRenderCallbacks.getShortcuts);
    expect(result.current.updateFocusableElements).toBe(firstRenderCallbacks.updateFocusableElements);
  });
});