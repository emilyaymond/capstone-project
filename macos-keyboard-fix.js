// Quick fix for macOS keyboard shortcuts in HealthVis
// Add this to your App.js to detect macOS and use Option key

// Platform detection utility
const isMacOS = () => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
         navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
};

// Get the correct modifier key for the platform
const getModifierKey = () => {
  return isMacOS() ? 'Option' : 'Alt';
};

// Updated keyboard shortcuts for App.js
const getKeyboardShortcuts = (handleNavigation, setShowSettings) => {
  const modifier = getModifierKey();
  
  return {
    [`${modifier}+1`]: () => handleNavigation('dashboard'),
    [`${modifier}+2`]: () => handleNavigation('data-input'),
    [`${modifier}+3`]: () => handleNavigation('settings'),
    [`${modifier}+4`]: () => handleNavigation('help'),
    [isMacOS() ? 'Cmd+,' : 'Ctrl+,']: () => setShowSettings(true),
    'Escape': () => setShowSettings(false)
  };
};

// Usage in your useEffect:
/*
useEffect(() => {
  const shortcuts = getKeyboardShortcuts(handleNavigation, setShowSettings);
  registerKeyboardShortcuts(shortcuts);
}, [registerKeyboardShortcuts]);
*/

export { isMacOS, getModifierKey, getKeyboardShortcuts };