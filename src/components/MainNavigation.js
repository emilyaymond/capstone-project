import React, { useState, useEffect } from 'react';
import { useScreenReader } from '../hooks/useScreenReader';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import '../styles/components/MainNavigation.css';

/**
 * MainNavigation component provides accessible navigation with semantic HTML,
 * large touch targets, and breadcrumb navigation for data context.
 */
function MainNavigation({ currentSection = 'dashboard', onNavigate, breadcrumbs = [] }) {
  const { announcePolite } = useScreenReader();
  const { registerKeyboardShortcuts, unregisterKeyboardShortcuts } = useKeyboardNavigation();
  const [activeItem, setActiveItem] = useState(currentSection);

  // Navigation items with accessibility metadata
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '#dashboard',
      description: 'View health data visualizations and summaries',
      shortcut: 'Alt+D'
    },
    {
      id: 'data-input',
      label: 'Data Input',
      href: '#data-input',
      description: 'Enter or upload new health data',
      shortcut: 'Alt+I'
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '#settings',
      description: 'Customize accessibility and display preferences',
      shortcut: 'Alt+S'
    },
    {
      id: 'help',
      label: 'Help',
      href: '#help',
      description: 'Access help documentation and tutorials',
      shortcut: 'Alt+H'
    }
  ];

  // Handle navigation item click
  const handleNavigationClick = (item, event) => {
    event.preventDefault();
    setActiveItem(item.id);
    
    // Announce navigation to screen readers
    announcePolite(`Navigating to ${item.label}. ${item.description}`);
    
    // Call parent navigation handler
    if (onNavigate) {
      onNavigate(item.id, item);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (item, event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigationClick(item, event);
    }
  };

  // Register keyboard shortcuts for navigation
  useEffect(() => {
    const shortcuts = {};
    
    navigationItems.forEach(item => {
      if (item.shortcut) {
        shortcuts[item.shortcut] = () => {
          setActiveItem(item.id);
          announcePolite(`Keyboard shortcut activated: ${item.label}`);
          if (onNavigate) {
            onNavigate(item.id, item);
          }
        };
      }
    });

    registerKeyboardShortcuts(shortcuts);

    return () => {
      unregisterKeyboardShortcuts(Object.keys(shortcuts));
    };
  }, [navigationItems, onNavigate, announcePolite, registerKeyboardShortcuts, unregisterKeyboardShortcuts]);

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return null;
    }

    return (
      <nav aria-label="Breadcrumb navigation" className="breadcrumb-nav">
        <ol className="breadcrumb-list">
          {breadcrumbs.filter(crumb => crumb && crumb.label).map((crumb, index) => (
            <li key={crumb.id || index} className="breadcrumb-item">
              {index < breadcrumbs.filter(crumb => crumb && crumb.label).length - 1 ? (
                <>
                  <button
                    type="button"
                    className="breadcrumb-link"
                    onClick={(e) => handleBreadcrumbClick(crumb, e)}
                    aria-describedby={`breadcrumb-desc-${index}`}
                  >
                    {crumb.label}
                  </button>
                  <span className="breadcrumb-separator" aria-hidden="true">
                    /
                  </span>
                  <span id={`breadcrumb-desc-${index}`} className="sr-only">
                    Navigate back to {crumb.label}
                  </span>
                </>
              ) : (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (crumb, event) => {
    event.preventDefault();
    announcePolite(`Navigating back to ${crumb.label}`);
    
    if (crumb.onNavigate) {
      crumb.onNavigate(crumb);
    }
  };

  return (
    <div className="main-navigation-container">
      {/* Breadcrumb navigation */}
      {renderBreadcrumbs()}

      {/* Main navigation */}
      <nav 
        id="main-navigation" 
        role="navigation" 
        aria-label="Main application navigation"
        className="main-navigation"
      >
        <ul className="nav-list" role="menubar">
          {navigationItems.map((item) => (
            <li key={item.id} className="nav-item" role="none">
              <button
                type="button"
                className={`nav-button ${activeItem === item.id ? 'nav-button--active' : ''}`}
                onClick={(e) => handleNavigationClick(item, e)}
                onKeyDown={(e) => handleKeyDown(item, e)}
                aria-current={activeItem === item.id ? 'page' : undefined}
                aria-describedby={`nav-desc-${item.id}`}
                role="menuitem"
                tabIndex={activeItem === item.id ? 0 : -1}
              >
                <span className="nav-button-text">{item.label}</span>
                {item.shortcut && (
                  <span className="nav-button-shortcut" aria-hidden="true">
                    {item.shortcut}
                  </span>
                )}
              </button>
              
              {/* Hidden description for screen readers */}
              <span id={`nav-desc-${item.id}`} className="sr-only">
                {item.description}
                {item.shortcut && `. Keyboard shortcut: ${item.shortcut}`}
              </span>
            </li>
          ))}
        </ul>

        {/* Navigation help text */}
        <div className="nav-help" aria-live="polite" aria-atomic="true">
          <p className="sr-only">
            Use arrow keys to navigate between menu items, Enter or Space to activate.
            Keyboard shortcuts are available for quick navigation.
          </p>
        </div>
      </nav>
    </div>
  );
}

export default MainNavigation;