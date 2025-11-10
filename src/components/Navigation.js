import { useCallback } from 'react';
import { useModeSpecificBehavior } from '../hooks/useModeSpecificBehavior';
import './Navigation.css';

const Navigation = ({ currentPage, onNavigate }) => {
  const { getInteractionProps, getModeSpecificClasses } = useModeSpecificBehavior();
  
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', shortcut: 'Alt+1', description: 'View health data dashboard' },
    { id: 'data-input', label: 'Data Input', shortcut: 'Alt+2', description: 'Enter health data' },
    { id: 'settings', label: 'Settings', shortcut: 'Alt+3', description: 'Accessibility and app settings' }
  ];

  const handleKeyDown = useCallback((event, itemId) => {
    // Handle Enter and Space key activation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(itemId);
    }
  }, [onNavigate]);

  return (
    <nav className="main-navigation" role="navigation" aria-label="Main navigation">
      <ul role="menubar">
        {navigationItems.map((item) => (
          <li key={item.id} role="none">
            <button
              type="button"
              role="menuitem"
              className={getModeSpecificClasses(`nav-button ${currentPage === item.id ? 'active' : ''}`)}
              onClick={() => onNavigate(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              aria-current={currentPage === item.id ? 'page' : undefined}
              aria-describedby={`nav-desc-${item.id}`}
              title={`${item.description} (${item.shortcut})`}
              tabIndex={currentPage === item.id ? 0 : -1}
              {...getInteractionProps('button')}
            >
              {item.label}
              <span className="sr-only"> - {item.shortcut}</span>
            </button>
            <div id={`nav-desc-${item.id}`} className="sr-only">
              {item.description}
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;