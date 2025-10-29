/**
 * ScreenReaderService - Manages ARIA live regions and screen reader announcements
 * Provides centralized control over screen reader communication
 */
class ScreenReaderService {
  constructor() {
    this.liveRegions = {
      assertive: null,
      polite: null,
      status: null
    };
    this.isInitialized = false;
    this.announcementQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Initialize the screen reader service and create ARIA live regions
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.createLiveRegions();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Create ARIA live regions for different types of announcements
   */
  createLiveRegions() {
    // Assertive live region for urgent announcements
    this.liveRegions.assertive = this.createLiveRegion('assertive', 'sr-assertive-region');
    
    // Polite live region for non-urgent announcements
    this.liveRegions.polite = this.createLiveRegion('polite', 'sr-polite-region');
    
    // Status live region for status updates
    this.liveRegions.status = this.createLiveRegion('polite', 'sr-status-region');
  }

  /**
   * Create a single ARIA live region element
   */
  createLiveRegion(liveType, className) {
    const region = document.createElement('div');
    region.setAttribute('aria-live', liveType);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('class', `sr-only ${className}`);
    region.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(1px, 1px, 1px, 1px) !important;
      white-space: nowrap !important;
    `;
    
    document.body.appendChild(region);
    return region;
  }

  /**
   * Set up event listeners for custom announcement events
   */
  setupEventListeners() {
    // Listen for custom screen reader announcement events
    window.addEventListener('screenReaderAnnouncement', (event) => {
      if (event.detail && event.detail.message) {
        const priority = event.detail.priority || 'polite';
        this.announce(event.detail.message, priority);
      }
    });

    // Listen for focus changes to provide context
    document.addEventListener('focusin', (event) => {
      this.handleFocusChange(event.target);
    });
  }

  /**
   * Announce a message to screen readers
   * @param {string} message - The message to announce
   * @param {string} priority - 'assertive', 'polite', or 'status'
   * @param {Object} options - Additional options for the announcement
   */
  announce(message, priority = 'polite', options = {}) {
    if (!message || typeof message !== 'string') {
      return;
    }

    const announcement = {
      message: message.trim(),
      priority,
      timestamp: Date.now(),
      ...options
    };

    // Add to queue for processing
    this.announcementQueue.push(announcement);
    this.processAnnouncementQueue();
  }

  /**
   * Process the announcement queue to avoid overwhelming screen readers
   */
  async processAnnouncementQueue() {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift();
      await this.makeAnnouncement(announcement);
      
      // Small delay between announcements to ensure they're processed
      await this.delay(150);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Make a single announcement to the appropriate live region
   */
  async makeAnnouncement(announcement) {
    const { message, priority } = announcement;
    const region = this.liveRegions[priority] || this.liveRegions.polite;

    if (!region) {
      console.warn('ScreenReaderService: Live region not available for priority:', priority);
      return;
    }

    // Clear the region first
    region.textContent = '';
    
    // Wait a moment then set the message
    await this.delay(50);
    region.textContent = message;
  }

  /**
   * Announce data context for charts and visualizations
   */
  announceDataContext(data) {
    const { type, title, summary, totalPoints } = data;
    const message = `${type} chart: ${title}. ${summary}. ${totalPoints} data points available. Use arrow keys to explore data.`;
    this.announce(message, 'polite');
  }

  /**
   * Announce data point details
   */
  announceDataPoint(dataPoint) {
    const { value, unit, timestamp, description, trend } = dataPoint;
    let message = `${value} ${unit}`;
    
    if (timestamp) {
      message += ` at ${new Date(timestamp).toLocaleString()}`;
    }
    
    if (trend) {
      message += `. Trend: ${trend}`;
    }
    
    if (description) {
      message += `. ${description}`;
    }

    this.announce(message, 'assertive');
  }

  /**
   * Announce navigation changes
   */
  announceNavigation(location) {
    const { section, subsection, context } = location;
    let message = `Navigated to ${section}`;
    
    if (subsection) {
      message += `, ${subsection}`;
    }
    
    if (context) {
      message += `. ${context}`;
    }

    this.announce(message, 'polite');
  }

  /**
   * Announce form validation errors
   */
  announceFormError(fieldName, errorMessage) {
    const message = `Error in ${fieldName}: ${errorMessage}`;
    this.announce(message, 'assertive');
  }

  /**
   * Announce successful actions
   */
  announceSuccess(action, details = '') {
    const message = `${action} successful${details ? '. ' + details : ''}`;
    this.announce(message, 'polite');
  }

  /**
   * Handle focus changes to provide contextual information
   */
  handleFocusChange(element) {
    if (!element) return;

    // Announce additional context for data visualization elements
    if (element.hasAttribute('data-chart-element')) {
      const chartType = element.getAttribute('data-chart-type');
      const elementType = element.getAttribute('data-element-type');
      
      if (chartType && elementType) {
        this.announce(`Focused on ${elementType} in ${chartType} chart`, 'polite');
      }
    }

    // Announce help text if available
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const helpElement = document.getElementById(describedBy);
      if (helpElement && helpElement.textContent) {
        // Delay help text announcement to avoid conflicts
        setTimeout(() => {
          this.announce(helpElement.textContent, 'polite');
        }, 500);
      }
    }
  }

  /**
   * Clear all live regions
   */
  clearAllAnnouncements() {
    Object.values(this.liveRegions).forEach(region => {
      if (region) {
        region.textContent = '';
      }
    });
    this.announcementQueue = [];
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('screenReaderAnnouncement', this.handleAnnouncement);
    document.removeEventListener('focusin', this.handleFocusChange);

    // Remove live regions from DOM
    Object.values(this.liveRegions).forEach(region => {
      if (region && region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });

    // Reset state
    this.liveRegions = { assertive: null, polite: null, status: null };
    this.isInitialized = false;
    this.announcementQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if screen reader is likely active
   */
  detectScreenReader() {
    // Basic heuristics for screen reader detection
    const hasScreenReaderIndicators = 
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]') ||
      window.getComputedStyle(document.body).getPropertyValue('-ms-high-contrast');

    return hasScreenReaderIndicators;
  }
}

// Create singleton instance
const screenReaderService = new ScreenReaderService();

export default screenReaderService;
export { ScreenReaderService };