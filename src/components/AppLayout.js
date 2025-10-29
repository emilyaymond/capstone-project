import React, { useRef, useEffect, useState } from 'react';
import { useScreenReader } from '../hooks/useScreenReader';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import MainNavigation from './MainNavigation';
import './AppLayout.css';

/**
 * AppLayout component provides the main application layout with proper
 * landmark structure, skip links, focus management, and responsive design.
 */
function AppLayout({ 
  children, 
  currentSection = 'dashboard',
  onNavigate,
  breadcrumbs = [],
  showNavigation = true,
  className = ''
}) {
  const { announcePolite } = useScreenReader();
  const { registerKeyboardShortcuts, unregisterKeyboardShortcuts } = useKeyboardNavigation();
  
  // Refs for focus management
  const mainContentRef = useRef(null);
  const navigationRef = useRef(null);
  const skipLinksRef = useRef(null);
  
  // State for managing focus and layout
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const [focusedSkipLink, setFocusedSkipLink] = useState(null);

  // Skip link definitions
  const skipLinks = [
    {
      id: 'skip-to-main',
      label: 'Skip to main content',
      target: mainContentRef,
      shortcut: 'Alt+M'
    },
    {
      id: 'skip-to-nav',
      label: 'Skip to navigation',
      target: navigationRef,
      shortcut: 'Alt+N'
    }
  ];

  // Handle skip link activation
  const handleSkipLinkClick = (skipLink, event) => {
    event.preventDefault();
    
    if (skipLink.target && skipLink.target.current) {
      // Focus the target element
      skipLink.target.current.focus();
      
      // Announce the skip action
      announcePolite(`Skipped to ${skipLink.label.toLowerCase()}`);
      
      // Scroll target into view (check if method exists for test compatibility)
      if (skipLink.target.current.scrollIntoView) {
        skipLink.target.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }
  };

  // Handle skip link keyboard navigation
  const handleSkipLinkKeyDown = (skipLink, event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSkipLinkClick(skipLink, event);
    }
  };

  // Toggle navigation visibility (for mobile)
  const toggleNavigation = () => {
    setIsNavigationVisible(!isNavigationVisible);
    announcePolite(`Navigation ${!isNavigationVisible ? 'opened' : 'closed'}`);
  };

  // Handle navigation toggle keyboard events
  const handleNavToggleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleNavigation();
    }
  };

  // Register keyboard shortcuts for layout navigation
  useEffect(() => {
    const shortcuts = {};
    
    // Skip link shortcuts
    skipLinks.forEach(skipLink => {
      if (skipLink.shortcut) {
        shortcuts[skipLink.shortcut] = () => {
          handleSkipLinkClick(skipLink, { preventDefault: () => {} });
        };
      }
    });

    // Navigation toggle shortcut
    shortcuts['Alt+T'] = toggleNavigation;

    registerKeyboardShortcuts(shortcuts);

    return () => {
      unregisterKeyboardShortcuts(Object.keys(shortcuts));
    };
  }, [registerKeyboardShortcuts, unregisterKeyboardShortcuts, isNavigationVisible]);

  // Handle main navigation
  const handleMainNavigation = (sectionId, item) => {
    // Focus main content after navigation
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
    
    // Call parent navigation handler
    if (onNavigate) {
      onNavigate(sectionId, item);
    }
  };

  // Announce layout changes to screen readers
  useEffect(() => {
    announcePolite('HealthVis application layout loaded. Use skip links or keyboard shortcuts for quick navigation.');
  }, [announcePolite]);

  return (
    <div className={`app-layout ${className}`}>
      {/* Skip Links - Always first for keyboard users */}
      <div 
        ref={skipLinksRef}
        className="skip-links"
        role="navigation"
        aria-label="Skip navigation links"
      >
        {skipLinks.map((skipLink) => (
          <a
            key={skipLink.id}
            href={`#${skipLink.id}`}
            className={`skip-link ${focusedSkipLink === skipLink.id ? 'skip-link--focused' : ''}`}
            onClick={(e) => handleSkipLinkClick(skipLink, e)}
            onKeyDown={(e) => handleSkipLinkKeyDown(skipLink, e)}
            onFocus={() => setFocusedSkipLink(skipLink.id)}
            onBlur={() => setFocusedSkipLink(null)}
            aria-describedby={`skip-desc-${skipLink.id}`}
          >
            {skipLink.label}
            {skipLink.shortcut && (
              <span className="skip-link-shortcut" aria-hidden="true">
                ({skipLink.shortcut})
              </span>
            )}
            <span id={`skip-desc-${skipLink.id}`} className="sr-only">
              {skipLink.shortcut && `Keyboard shortcut: ${skipLink.shortcut}`}
            </span>
          </a>
        ))}
      </div>

      {/* Application Header */}
      <header role="banner" className="app-header">
        <div className="app-header-content">
          <h1 className="app-title">
            <span className="app-title-main">HealthVis</span>
            <span className="app-title-subtitle">Accessible Health Data Visualization</span>
          </h1>
          
          {/* Mobile navigation toggle */}
          <button
            type="button"
            className="nav-toggle"
            onClick={toggleNavigation}
            onKeyDown={handleNavToggleKeyDown}
            aria-expanded={isNavigationVisible}
            aria-controls="main-navigation"
            aria-label={`${isNavigationVisible ? 'Close' : 'Open'} navigation menu`}
          >
            <span className="nav-toggle-icon" aria-hidden="true">
              {isNavigationVisible ? '✕' : '☰'}
            </span>
            <span className="nav-toggle-text">
              {isNavigationVisible ? 'Close Menu' : 'Open Menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Application Container */}
      <div className="app-container">
        {/* Navigation Section */}
        {showNavigation && (
          <aside 
            ref={navigationRef}
            className={`app-navigation ${isNavigationVisible ? 'app-navigation--visible' : 'app-navigation--hidden'}`}
            aria-label="Application navigation section"
            tabIndex="-1"
          >
            <MainNavigation
              currentSection={currentSection}
              onNavigate={handleMainNavigation}
              breadcrumbs={breadcrumbs}
            />
          </aside>
        )}

        {/* Main Content Area */}
        <main 
          ref={mainContentRef}
          id="main-content"
          role="main"
          className="app-main"
          tabIndex="-1"
          aria-label="Main application content"
        >
          {/* Content Header with Context */}
          <div className="content-header">
            <div className="content-context">
              {breadcrumbs.length > 0 && (
                <nav aria-label="Content breadcrumb" className="content-breadcrumb">
                  <span className="content-location">
                    You are in: {breadcrumbs.filter(crumb => crumb && crumb.label).map(crumb => crumb.label).join(' > ')}
                  </span>
                </nav>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="content-body">
            {children}
          </div>
        </main>
      </div>

      {/* Application Footer */}
      <footer role="contentinfo" className="app-footer">
        <div className="app-footer-content">
          <p className="footer-text">
            &copy; 2025 HealthVis - Accessible Health Data Visualization
          </p>
          
          <div className="footer-links">
            <a href="#accessibility" className="footer-link">
              Accessibility Statement
            </a>
            <a href="#help" className="footer-link">
              Help & Support
            </a>
            <a href="#privacy" className="footer-link">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* Screen Reader Announcements */}
      <div 
        className="sr-announcements"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <span className="sr-only">
          Layout keyboard shortcuts: Alt+M for main content, Alt+N for navigation, Alt+T to toggle navigation menu.
        </span>
      </div>
    </div>
  );
}

export default AppLayout;