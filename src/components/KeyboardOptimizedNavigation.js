import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import '../styles/components/KeyboardOptimizedNavigation.css';

const KeyboardOptimizedNavigation = ({ items, onNavigate, currentPath }) => {
  const { modeFeatures, announceToScreenReader } = useAccessibility();
  const { registerShortcut, unregisterShortcut } = useKeyboardNavigation();
  const navRef = useRef(null);
  const currentIndexRef = useRef(0);

  // Enhanced keyboard shortcuts for keyboard-only mode
  useEffect(() => {
    if (modeFeatures.keyboardOptimized) {
      // Register global shortcuts
      const shortcuts = [
        { key: 'h', description: 'Go to Home', action: () => navigateToItem(0) },
        { key: 'd', description: 'Go to Dashboard', action: () => navigateToItem(1) },
        { key: 's', description: 'Go to Settings', action: () => navigateToItem(2) },
        { key: '?', description: 'Show keyboard shortcuts', action: showShortcuts },
        { key: 'Escape', description: 'Close menus', action: closeMenus },
      ];

      shortcuts.forEach(shortcut => {
        registerShortcut(shortcut.key, shortcut.action, shortcut.description);
      });

      return () => {
        shortcuts.forEach(shortcut => {
          unregisterShortcut(shortcut.key);
        });
      };
    }
  }, [modeFeatures.keyboardOptimized, registerShortcut, unregisterShortcut]);

  const navigateToItem = (index) => {
    if (items && items[index]) {
      currentIndexRef.current = index;
      const item = items[index];
      announceToScreenReader(`Navigating to ${item.label}`);
      if (onNavigate) {
        onNavigate(item.path, item);
      }
    }
  };

  const showShortcuts = () => {
    const shortcutsList = [
      'H - Home',
      'D - Dashboard', 
      'S - Settings',
      'Tab - Navigate forward',
      'Shift+Tab - Navigate backward',
      'Enter/Space - Activate',
      'Escape - Close menus',
      '? - Show this help'
    ].join(', ');
    
    announceToScreenReader(`Keyboard shortcuts: ${shortcutsList}`);
  };

  const closeMenus = () => {
    // Close any open menus or dialogs
    const openMenus = document.querySelectorAll('[aria-expanded="true"]');
    openMenus.forEach(menu => {
      menu.setAttribute('aria-expanded', 'false');
    });
    announceToScreenReader('Menus closed');
  };

  const handleKeyDown = (event) => {
    if (!items || items.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndexRef.current = Math.min(currentIndexRef.current + 1, items.length - 1);
        focusCurrentItem();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
        focusCurrentItem();
        break;
      
      case 'Home':
        event.preventDefault();
        currentIndexRef.current = 0;
        focusCurrentItem();
        break;
      
      case 'End':
        event.preventDefault();
        currentIndexRef.current = items.length - 1;
        focusCurrentItem();
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        navigateToItem(currentIndexRef.current);
        break;
      
      default:
        // Handle letter navigation
        if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
          const letter = event.key.toLowerCase();
          const matchingIndex = items.findIndex(item => 
            item.label.toLowerCase().startsWith(letter)
          );
          if (matchingIndex !== -1) {
            currentIndexRef.current = matchingIndex;
            focusCurrentItem();
          }
        }
        break;
    }
  };

  const focusCurrentItem = () => {
    const currentItem = navRef.current?.querySelector(`[data-index="${currentIndexRef.current}"]`);
    if (currentItem) {
      currentItem.focus();
      const item = items[currentIndexRef.current];
      announceToScreenReader(`${item.label} ${item.description || ''}`);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav 
      className="keyboard-optimized-navigation"
      ref={navRef}
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation with keyboard shortcuts"
    >
      {modeFeatures.keyboardOptimized && (
        <div className="skip-links">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>
        </div>
      )}

      <ul className="nav-list" role="menubar">
        {items.map((item, index) => (
          <li key={item.path} className="nav-item" role="none">
            <a
              href={item.path}
              className={`nav-link ${currentPath === item.path ? 'current' : ''}`}
              data-index={index}
              role="menuitem"
              aria-current={currentPath === item.path ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigateToItem(index);
              }}
              onFocus={() => {
                currentIndexRef.current = index;
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
              {modeFeatures.keyboardOptimized && item.shortcut && (
                <span className="nav-shortcut" aria-label={`Keyboard shortcut: ${item.shortcut}`}>
                  {item.shortcut}
                </span>
              )}
              {item.description && (
                <span className="nav-description">{item.description}</span>
              )}
            </a>
          </li>
        ))}
      </ul>

      {modeFeatures.keyboardOptimized && (
        <div className="keyboard-help">
          <button 
            className="help-button"
            onClick={showShortcuts}
            aria-label="Show keyboard shortcuts help"
            title="Press ? for keyboard shortcuts"
          >
            <span aria-hidden="true">?</span>
            <span className="sr-only">Keyboard shortcuts help</span>
          </button>
        </div>
      )}

      <div className="navigation-status" aria-live="polite" aria-atomic="true">
        <span className="sr-only">
          Navigation: {items.length} items available. Use arrow keys to navigate, Enter to select.
        </span>
      </div>
    </nav>
  );
};

export default KeyboardOptimizedNavigation;