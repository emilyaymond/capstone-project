import { ScreenReaderService } from '../ScreenReaderService';

// Mock DOM methods
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockCreateElement = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Setup DOM mocks
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
  writable: true,
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
  writable: true,
});

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

describe('ScreenReaderService', () => {
  let service;
  let mockElement;

  beforeEach(() => {
    service = new ScreenReaderService();
    
    // Create mock element
    mockElement = {
      setAttribute: jest.fn(),
      style: {},
      textContent: '',
      parentNode: { removeChild: jest.fn() },
    };
    
    mockCreateElement.mockReturnValue(mockElement);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (service.isInitialized) {
      service.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize service and create live regions', () => {
      service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(mockCreateElement).toHaveBeenCalledTimes(3); // assertive, polite, status
      expect(mockAppendChild).toHaveBeenCalledTimes(3);
    });

    test('should not initialize twice', () => {
      service.initialize();
      service.initialize();

      expect(mockCreateElement).toHaveBeenCalledTimes(3);
    });

    test('should create live regions with correct attributes', () => {
      service.initialize();

      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
    });
  });

  describe('announcements', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('should announce polite messages', async () => {
      const message = 'Test polite message';
      
      service.announce(message, 'polite');
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.polite.textContent).toBe(message);
    });

    test('should announce assertive messages', async () => {
      const message = 'Test assertive message';
      
      service.announce(message, 'assertive');
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.assertive.textContent).toBe(message);
    });

    test('should ignore empty or invalid messages', () => {
      service.announce('');
      service.announce(null);
      service.announce(undefined);
      
      expect(service.announcementQueue).toHaveLength(0);
    });

    test('should queue multiple announcements', () => {
      service.announce('Message 1');
      service.announce('Message 2');
      service.announce('Message 3');
      
      expect(service.announcementQueue.length).toBeGreaterThan(0);
    });
  });

  describe('specialized announcements', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('should announce data context', async () => {
      const data = {
        type: 'line',
        title: 'Blood Pressure',
        summary: 'Showing 7 days of data',
        totalPoints: 14
      };
      
      service.announceDataContext(data);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.polite.textContent).toContain('line chart');
      expect(service.liveRegions.polite.textContent).toContain('Blood Pressure');
      expect(service.liveRegions.polite.textContent).toContain('14 data points');
    });

    test('should announce data point details', async () => {
      const dataPoint = {
        value: 120,
        unit: 'mmHg',
        timestamp: new Date('2023-01-01'),
        trend: 'stable',
        description: 'Normal reading'
      };
      
      service.announceDataPoint(dataPoint);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.assertive.textContent).toContain('120 mmHg');
      expect(service.liveRegions.assertive.textContent).toContain('stable');
      expect(service.liveRegions.assertive.textContent).toContain('Normal reading');
    });

    test('should announce navigation changes', async () => {
      const location = {
        section: 'Dashboard',
        subsection: 'Charts',
        context: 'Blood pressure data'
      };
      
      service.announceNavigation(location);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.polite.textContent).toContain('Navigated to Dashboard');
      expect(service.liveRegions.polite.textContent).toContain('Charts');
      expect(service.liveRegions.polite.textContent).toContain('Blood pressure data');
    });

    test('should announce form errors', async () => {
      service.announceFormError('Email', 'Please enter a valid email address');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.assertive.textContent).toContain('Error in Email');
      expect(service.liveRegions.assertive.textContent).toContain('Please enter a valid email address');
    });

    test('should announce success messages', async () => {
      service.announceSuccess('Data saved', 'Your preferences have been updated');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service.liveRegions.polite.textContent).toContain('Data saved successful');
      expect(service.liveRegions.polite.textContent).toContain('Your preferences have been updated');
    });
  });

  describe('focus handling', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('should handle focus on chart elements', () => {
      const mockElement = {
        hasAttribute: jest.fn().mockReturnValue(true),
        getAttribute: jest.fn()
          .mockReturnValueOnce('line')
          .mockReturnValueOnce('data-point'),
      };
      
      service.handleFocusChange(mockElement);
      
      expect(mockElement.hasAttribute).toHaveBeenCalledWith('data-chart-element');
      expect(mockElement.getAttribute).toHaveBeenCalledWith('data-chart-type');
      expect(mockElement.getAttribute).toHaveBeenCalledWith('data-element-type');
    });

    test('should handle elements with aria-describedby', () => {
      const mockHelpElement = {
        textContent: 'This is help text'
      };
      
      const mockElement = {
        hasAttribute: jest.fn().mockReturnValue(false),
        getAttribute: jest.fn().mockReturnValue('help-text-id'),
      };
      
      // Mock getElementById
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn().mockReturnValue(mockHelpElement);
      
      service.handleFocusChange(mockElement);
      
      expect(mockElement.getAttribute).toHaveBeenCalledWith('aria-describedby');
      expect(document.getElementById).toHaveBeenCalledWith('help-text-id');
      
      // Restore original method
      document.getElementById = originalGetElementById;
    });
  });

  describe('cleanup', () => {
    test('should clear all announcements', () => {
      service.initialize();
      
      service.liveRegions.assertive.textContent = 'Test message';
      service.liveRegions.polite.textContent = 'Test message';
      service.liveRegions.status.textContent = 'Test message';
      service.announcementQueue = ['message1', 'message2'];
      
      service.clearAllAnnouncements();
      
      expect(service.liveRegions.assertive.textContent).toBe('');
      expect(service.liveRegions.polite.textContent).toBe('');
      expect(service.liveRegions.status.textContent).toBe('');
      expect(service.announcementQueue).toHaveLength(0);
    });

    test('should destroy service and clean up resources', () => {
      service.initialize();
      
      service.destroy();
      
      expect(service.isInitialized).toBe(false);
      expect(service.liveRegions.assertive).toBeNull();
      expect(service.liveRegions.polite).toBeNull();
      expect(service.liveRegions.status).toBeNull();
      expect(service.announcementQueue).toHaveLength(0);
    });
  });

  describe('screen reader detection', () => {
    test('should detect screen reader indicators', () => {
      // Mock navigator.userAgent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NVDA/2021.1',
        writable: true,
      });
      
      const detected = service.detectScreenReader();
      
      expect(detected).toBe(true);
    });

    test('should detect speech synthesis support', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: {},
        writable: true,
      });
      
      const detected = service.detectScreenReader();
      
      expect(detected).toBe(true);
    });
  });
});