import { KeyboardNavigationService } from '../KeyboardNavigationService';

// Mock DOM methods and properties
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockQuerySelector = jest.fn();
const mockQuerySelectorAll = jest.fn();
const mockGetElementById = jest.fn();
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockInsertBefore = jest.fn();
const mockRemove = jest.fn();
const mockFocus = jest.fn();
const mockScrollIntoView = jest.fn();

// Mock MutationObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockMutationObserver = jest.fn().mockImplementation(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
}));
global.MutationObserver = mockMutationObserver;

// Setup DOM mocks
Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
  writable: true,
});

Object.defineProperty(document, 'querySelectorAll', {
  value: mockQuerySelectorAll,
  writable: true,
});

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  writable: true,
});

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
  writable: true,
});

Object.defineProperty(document.body, 'insertBefore', {
  value: mockInsertBefore,
  writable: true,
});

// Mock window.getComputedStyle
global.getComputedStyle = jest.fn().mockReturnValue({
  display: 'block',
  visibility: 'visible',
  opacity: '1'
});

describe('KeyboardNavigationService', () => {
  let service;

  beforeEach(() => {
    service = new KeyboardNavigationService();
    jest.clearAllMocks();
  });

  describe('keyboard shortcuts', () => {
    test('should register keyboard shortcuts', () => {
      const handler = jest.fn();
      const key = 'h';
      const modifiers = { ctrlKey: true };
      const description = 'Help shortcut';

      service.registerShortcut(key, modifiers, handler, description);

      expect(service.shortcuts.has('Ctrl+h')).toBe(true);
      
      const shortcut = service.shortcuts.get('Ctrl+h');
      expect(shortcut.handler).toBe(handler);
      expect(shortcut.description).toBe(description);
      expect(shortcut.enabled).toBe(true);
    });

    test('should unregister keyboard shortcuts', () => {
      const handler = jest.fn();
      service.registerShortcut('h', { ctrlKey: true }, handler, 'Help');
      
      service.unregisterShortcut('h', { ctrlKey: true });

      expect(service.shortcuts.has('Ctrl+h')).toBe(false);
    });

    test('should toggle shortcut enabled state', () => {
      const handler = jest.fn();
      service.registerShortcut('h', { ctrlKey: true }, handler, 'Help');
      
      service.toggleShortcut('h', { ctrlKey: true }, false);
      
      const shortcut = service.shortcuts.get('Ctrl+h');
      expect(shortcut.enabled).toBe(false);
    });

    test('should create correct shortcut keys', () => {
      expect(service.createShortcutKey('a')).toBe('a');
      expect(service.createShortcutKey('a', { ctrlKey: true })).toBe('Ctrl+a');
      expect(service.createShortcutKey('a', { ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+a');
      expect(service.createShortcutKey('a', { altKey: true, ctrlKey: true, shiftKey: true, metaKey: true }))
        .toBe('Alt+Ctrl+Shift+Meta+a');
    });
  });

  describe('shortcuts list', () => {
    test('should return all shortcuts including built-in ones', () => {
      service.registerShortcut('h', { ctrlKey: true }, jest.fn(), 'Help');
      
      const shortcuts = service.getShortcuts();
      
      expect(shortcuts.length).toBeGreaterThan(1);
      expect(shortcuts.some(s => s.key === 'Ctrl+h')).toBe(true);
      expect(shortcuts.some(s => s.key === 'Alt+S')).toBe(true);
      expect(shortcuts.some(s => s.key === 'Tab')).toBe(true);
    });
  });
});