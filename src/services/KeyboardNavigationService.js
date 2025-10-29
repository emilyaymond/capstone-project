/**
 * KeyboardNavigationService - Manages keyboard navigation, focus management, and shortcuts
 * Provides comprehensive keyboard accessibility for the application
 */
class KeyboardNavigationService {
  constructor() {
    this.isInitialized = false;
    this.shortcuts = new Map();
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.skipLinks = [];
    this.landmarks = [];
    this.focusHistory = [];
    this.maxFocusHistory = 10;
    this.trapFocus = false;
    this.focusTrapContainer = null;
  }

  /**
   * Initialize the keyboard navigation service
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.createSkipLinks();
    this.identifyLandmarks();
    this.isInitialized = true;
  }

  /**
   * Set up keyboard event listeners
   */
  setupEventListeners() {
    // Global keyboard event listener
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Focus tracking
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
    });
    
    this.mutationObserver = observer;
  }

  /**
   * Handle keydown events for shortcuts and navigation
   */
  handleKeyDown(event) {
    const { key, altKey, ctrlKey, shiftKey, metaKey } = event;
    
    // Create shortcut key combination
    const shortcutKey = this.createShortcutKey(key, { altKey, ctrlKey, shiftKey, metaKey });
    
    // Check for registered shortcuts
    if (this.shortcuts.has(shortcutKey)) {
      const shortcut = this.shortcuts.get(shortcutKey);
      if (shortcut.enabled) {
        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    }

    // Handle built-in navigation shortcuts
    this.handleBuiltInShortcuts(event);
  }

  /**
   * Handle keyup events
   */
  handleKeyUp(event) {
    // Can be used for key release actions if needed
  }

  /**
   * Handle focus in events
   */
  handleFocusIn(event) {
    const element = event.target;
    
    // Add to focus history
    this.addToFocusHistory(element);
    
    // Update current focus index
    this.updateCurrentFocusIndex(element);
    
    // Handle focus trap
    if (this.trapFocus && this.focusTrapContainer) {
      this.handleFocusTrap(element);
    }
  }

  /**
   * Handle focus out events
   */
  handleFocusOut(event) {
    // Can be used for cleanup when focus leaves elements
  }

  /**
   * Handle built-in keyboard shortcuts
   */
  handleBuiltInShortcuts(event) {
    const { key, altKey, ctrlKey, shiftKey } = event;

    // Skip links navigation (Alt + S)
    if (altKey && key.toLowerCase() === 's') {
      event.preventDefault();
      this.showSkipLinks();
      return;
    }

    // Landmark navigation (Alt + L)
    if (altKey && key.toLowerCase() === 'l') {
      event.preventDefault();
      this.navigateToNextLandmark();
      return;
    }

    // Focus previous element (Shift + Tab handled by browser, but we track it)
    if (key === 'Tab' && shiftKey) {
      this.navigateToPrevious();
      return;
    }

    // Focus next element (Tab handled by browser, but we track it)
    if (key === 'Tab' && !shiftKey) {
      this.navigateToNext();
      return;
    }

    // Escape key - exit focus trap or close modals
    if (key === 'Escape') {
      this.handleEscape();
      return;
    }

    // Arrow key navigation for data exploration
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.handleArrowNavigation(event);
      return;
    }

    // Home/End keys for quick navigation
    if (key === 'Home' && ctrlKey) {
      event.preventDefault();
      this.focusFirst();
      return;
    }

    if (key === 'End' && ctrlKey) {
      event.preventDefault();
      this.focusLast();
      return;
    }
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(key, modifiers, handler, description, enabled = true) {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    
    this.shortcuts.set(shortcutKey, {
      key,
      modifiers,
      handler,
      description,
      enabled
    });
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key, modifiers) {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Enable or disable a shortcut
   */
  toggleShortcut(key, modifiers, enabled) {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  /**
   * Create a unique key for shortcut combinations
   */
  createShortcutKey(key, modifiers = {}) {
    const { altKey = false, ctrlKey = false, shiftKey = false, metaKey = false } = modifiers;
    return `${altKey ? 'Alt+' : ''}${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${metaKey ? 'Meta+' : ''}${key}`;
  }

  /**
   * Create skip links for main content areas
   */
  createSkipLinks() {
    // Remove existing skip links
    const existingSkipLinks = document.querySelector('.skip-links');
    if (existingSkipLinks) {
      existingSkipLinks.remove();
    }

    // Create skip links container
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('aria-label', 'Skip navigation links');
    
    // Style skip links (initially hidden)
    skipLinksContainer.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      z-index: 10000;
      text-decoration: none;
      border-radius: 4px;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s;
    `;

    // Define skip link targets
    const skipTargets = [
      { id: 'main-content', label: 'Skip to main content' },
      { id: 'main-navigation', label: 'Skip to navigation' },
      { id: 'search', label: 'Skip to search' },
      { id: 'footer', label: 'Skip to footer' }
    ];

    // Create skip links
    skipTargets.forEach(target => {
      const targetElement = document.getElementById(target.id) || 
                           document.querySelector(`[role="main"]`) ||
                           document.querySelector('main');
      
      if (targetElement) {
        const skipLink = document.createElement('a');
        skipLink.href = `#${target.id}`;
        skipLink.textContent = target.label;
        skipLink.className = 'skip-link';
        
        skipLink.style.cssText = `
          display: block;
          color: #fff;
          text-decoration: none;
          padding: 4px 8px;
          margin: 2px 0;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
        `;

        skipLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.focusElement(targetElement);
          this.hideSkipLinks();
        });

        skipLink.addEventListener('focus', () => {
          skipLinksContainer.style.opacity = '1';
          skipLinksContainer.style.top = '6px';
          skipLinksContainer.style.pointerEvents = 'auto';
        });

        skipLink.addEventListener('blur', () => {
          setTimeout(() => {
            if (!skipLinksContainer.contains(document.activeElement)) {
              this.hideSkipLinks();
            }
          }, 100);
        });

        skipLinksContainer.appendChild(skipLink);
        this.skipLinks.push({ element: skipLink, target: targetElement });
      }
    });

    // Insert skip links at the beginning of the body
    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
    this.skipLinksContainer = skipLinksContainer;
  }

  /**
   * Show skip links
   */
  showSkipLinks() {
    if (this.skipLinksContainer && this.skipLinks.length > 0) {
      this.skipLinksContainer.style.opacity = '1';
      this.skipLinksContainer.style.top = '6px';
      this.skipLinksContainer.style.pointerEvents = 'auto';
      
      // Focus first skip link
      const firstSkipLink = this.skipLinks[0].element;
      firstSkipLink.focus();
    }
  }

  /**
   * Hide skip links
   */
  hideSkipLinks() {
    if (this.skipLinksContainer) {
      this.skipLinksContainer.style.opacity = '0';
      this.skipLinksContainer.style.top = '-40px';
      this.skipLinksContainer.style.pointerEvents = 'none';
    }
  }

  /**
   * Identify and catalog page landmarks
   */
  identifyLandmarks() {
    const landmarkSelectors = [
      '[role="banner"], header',
      '[role="navigation"], nav',
      '[role="main"], main',
      '[role="complementary"], aside',
      '[role="contentinfo"], footer',
      '[role="search"]',
      'section[aria-labelledby], section[aria-label]'
    ];

    this.landmarks = [];
    
    landmarkSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (this.isVisible(element)) {
          this.landmarks.push({
            element,
            role: element.getAttribute('role') || element.tagName.toLowerCase(),
            label: this.getLandmarkLabel(element)
          });
        }
      });
    });
  }

  /**
   * Get landmark label for announcement
   */
  getLandmarkLabel(element) {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') && 
           document.getElementById(element.getAttribute('aria-labelledby'))?.textContent ||
           element.tagName.toLowerCase();
  }

  /**
   * Navigate to next landmark
   */
  navigateToNextLandmark() {
    if (this.landmarks.length === 0) {
      return;
    }

    const currentElement = document.activeElement;
    let currentIndex = this.landmarks.findIndex(landmark => 
      landmark.element === currentElement || landmark.element.contains(currentElement)
    );

    const nextIndex = (currentIndex + 1) % this.landmarks.length;
    const nextLandmark = this.landmarks[nextIndex];
    
    this.focusElement(nextLandmark.element);
    
    // Announce landmark
    const announcement = `Navigated to ${nextLandmark.label} ${nextLandmark.role}`;
    this.announceToScreenReader(announcement);
  }

  /**
   * Update list of focusable elements
   */
  updateFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    this.focusableElements = Array.from(
      document.querySelectorAll(focusableSelectors.join(', '))
    ).filter(element => this.isVisible(element) && !this.isInert(element));
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Check if element is inert (not interactive)
   */
  isInert(element) {
    return element.hasAttribute('inert') || 
           element.getAttribute('aria-hidden') === 'true' ||
           element.closest('[inert], [aria-hidden="true"]');
  }

  /**
   * Focus an element safely
   */
  focusElement(element) {
    if (element && typeof element.focus === 'function') {
      // Make element focusable if it's not already
      if (!element.hasAttribute('tabindex') && !this.isNaturallyFocusable(element)) {
        element.setAttribute('tabindex', '-1');
      }
      
      element.focus();
      
      // Scroll element into view if needed
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  }

  /**
   * Check if element is naturally focusable
   */
  isNaturallyFocusable(element) {
    const naturallyFocusable = [
      'a[href]', 'button', 'input', 'select', 'textarea', 
      'details', 'summary', '[contenteditable="true"]'
    ];
    
    return naturallyFocusable.some(selector => element.matches(selector));
  }

  /**
   * Navigate to next focusable element
   */
  navigateToNext() {
    this.updateFocusableElements();
    
    if (this.currentFocusIndex < this.focusableElements.length - 1) {
      this.currentFocusIndex++;
    } else if (!this.trapFocus) {
      this.currentFocusIndex = 0; // Wrap around
    }
    
    if (this.focusableElements[this.currentFocusIndex]) {
      this.focusElement(this.focusableElements[this.currentFocusIndex]);
    }
  }

  /**
   * Navigate to previous focusable element
   */
  navigateToPrevious() {
    this.updateFocusableElements();
    
    if (this.currentFocusIndex > 0) {
      this.currentFocusIndex--;
    } else if (!this.trapFocus) {
      this.currentFocusIndex = this.focusableElements.length - 1; // Wrap around
    }
    
    if (this.focusableElements[this.currentFocusIndex]) {
      this.focusElement(this.focusableElements[this.currentFocusIndex]);
    }
  }

  /**
   * Focus first focusable element
   */
  focusFirst() {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.currentFocusIndex = 0;
      this.focusElement(this.focusableElements[0]);
    }
  }

  /**
   * Focus last focusable element
   */
  focusLast() {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.currentFocusIndex = this.focusableElements.length - 1;
      this.focusElement(this.focusableElements[this.currentFocusIndex]);
    }
  }

  /**
   * Handle arrow key navigation for data exploration
   */
  handleArrowNavigation(event) {
    const { key, target } = event;
    
    // Check if we're in a data visualization context
    if (target.hasAttribute('data-chart-element') || 
        target.closest('[data-chart-container]')) {
      
      event.preventDefault();
      this.handleChartNavigation(event);
    }
  }

  /**
   * Handle navigation within charts and data visualizations
   */
  handleChartNavigation(event) {
    const { key, target } = event;
    const chartContainer = target.closest('[data-chart-container]');
    
    if (!chartContainer) return;
    
    const dataPoints = chartContainer.querySelectorAll('[data-chart-element="data-point"]');
    const currentIndex = Array.from(dataPoints).indexOf(target);
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 1, dataPoints.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
    }
    
    if (nextIndex !== currentIndex && dataPoints[nextIndex]) {
      this.focusElement(dataPoints[nextIndex]);
      
      // Announce data point
      const dataValue = dataPoints[nextIndex].getAttribute('data-value');
      const dataLabel = dataPoints[nextIndex].getAttribute('aria-label');
      
      if (dataValue || dataLabel) {
        this.announceToScreenReader(dataLabel || `Data point: ${dataValue}`);
      }
    }
  }

  /**
   * Handle escape key
   */
  handleEscape() {
    // Exit focus trap
    if (this.trapFocus) {
      this.exitFocusTrap();
    }
    
    // Close modals or overlays
    const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (modal) {
      const closeButton = modal.querySelector('[data-dismiss], .close, [aria-label*="close"]');
      if (closeButton) {
        closeButton.click();
      }
    }
    
    // Hide skip links
    this.hideSkipLinks();
  }

  /**
   * Set up focus trap for modals
   */
  setupFocusTrap(container) {
    this.trapFocus = true;
    this.focusTrapContainer = container;
    
    // Focus first focusable element in container
    const focusableInContainer = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableInContainer.length > 0) {
      focusableInContainer[0].focus();
    }
  }

  /**
   * Exit focus trap
   */
  exitFocusTrap() {
    this.trapFocus = false;
    this.focusTrapContainer = null;
    
    // Return focus to previous element
    if (this.focusHistory.length > 0) {
      const previousElement = this.focusHistory[this.focusHistory.length - 1];
      if (previousElement && document.contains(previousElement)) {
        this.focusElement(previousElement);
      }
    }
  }

  /**
   * Handle focus trap logic
   */
  handleFocusTrap(element) {
    if (!this.focusTrapContainer || !this.focusTrapContainer.contains(element)) {
      // Focus escaped the trap, bring it back
      const focusableInContainer = this.focusTrapContainer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableInContainer.length > 0) {
        focusableInContainer[0].focus();
      }
    }
  }

  /**
   * Add element to focus history
   */
  addToFocusHistory(element) {
    // Remove element if it already exists in history
    this.focusHistory = this.focusHistory.filter(el => el !== element);
    
    // Add to end of history
    this.focusHistory.push(element);
    
    // Limit history size
    if (this.focusHistory.length > this.maxFocusHistory) {
      this.focusHistory.shift();
    }
  }

  /**
   * Update current focus index
   */
  updateCurrentFocusIndex(element) {
    this.updateFocusableElements();
    this.currentFocusIndex = this.focusableElements.indexOf(element);
  }

  /**
   * Announce message to screen reader
   */
  announceToScreenReader(message) {
    // Dispatch custom event for screen reader service
    const event = new CustomEvent('screenReaderAnnouncement', {
      detail: { message, priority: 'polite' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get all registered shortcuts for help display
   */
  getShortcuts() {
    const shortcuts = Array.from(this.shortcuts.entries()).map(([key, shortcut]) => ({
      key,
      description: shortcut.description,
      enabled: shortcut.enabled
    }));
    
    // Add built-in shortcuts
    const builtInShortcuts = [
      { key: 'Alt+S', description: 'Show skip links', enabled: true },
      { key: 'Alt+L', description: 'Navigate to next landmark', enabled: true },
      { key: 'Tab', description: 'Navigate to next element', enabled: true },
      { key: 'Shift+Tab', description: 'Navigate to previous element', enabled: true },
      { key: 'Escape', description: 'Exit focus trap or close modal', enabled: true },
      { key: 'Arrow Keys', description: 'Navigate data points in charts', enabled: true },
      { key: 'Ctrl+Home', description: 'Focus first element', enabled: true },
      { key: 'Ctrl+End', description: 'Focus last element', enabled: true }
    ];
    
    return [...shortcuts, ...builtInShortcuts];
  }

  /**
   * Destroy the service and clean up
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // Remove skip links
    if (this.skipLinksContainer) {
      this.skipLinksContainer.remove();
    }
    
    // Clear state
    this.shortcuts.clear();
    this.focusableElements = [];
    this.skipLinks = [];
    this.landmarks = [];
    this.focusHistory = [];
    this.isInitialized = false;
  }
}

// Create singleton instance
const keyboardNavigationService = new KeyboardNavigationService();

export default keyboardNavigationService;
export { KeyboardNavigationService };