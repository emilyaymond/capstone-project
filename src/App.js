import { useState, useEffect, useCallback } from 'react';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { useKeyboard } from './hooks/useKeyboard';
import { useAudio } from './hooks/useAudio';
import { useModeSpecificBehavior } from './hooks/useModeSpecificBehavior';

// Components
import Layout from './components/Layout';
import Navigation from './components/Navigation';
import ModeSelector from './components/ModeSelector';
import Dashboard from './components/Dashboard';
import DataInput from './components/DataInput';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorFeedback, SuccessFeedback, LoadingFeedback } from './components/UserFeedback';
import ScreenReaderAnnouncements, { useScreenReaderAnnouncements } from './components/ScreenReaderAnnouncements';

import './App.css';

// Main app content component
function AppContent() {
  const { mode, setMode, settings, updateSettings, error, clearError, isLoading } = useAccessibility();
  const { registerShortcuts, announceToScreenReader } = useKeyboard();
  const { playSuccessSound, playClickSound, playModeChangeSound, playEnhancedFeedback } = useAudio();
  const { getModeSpecificClasses } = useModeSpecificBehavior();
  const { 
    announceNavigation, 
    announceModeChange, 
    announceSettingsChange, 
    announceSuccess, 
    announceError,
    announceLoading 
  } = useScreenReaderAnnouncements();

  // Application state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handle navigation with enhanced feedback
  const handleNavigation = useCallback((pageId) => {
    setCurrentPage(pageId);
    
    // Enhanced navigation feedback
    if (settings.audioEnabled || mode === 'audio' || mode === 'hybrid') {
      playEnhancedFeedback('navigation', mode);
    } else {
      playClickSound();
    }
    
    // Enhanced screen reader announcement
    const pageNames = {
      'dashboard': 'Dashboard',
      'data-input': 'Data Input',
      'settings': 'Settings'
    };
    const pageName = pageNames[pageId] || pageId.replace('-', ' ');
    const context = pageId === 'settings' ? 'Customize your accessibility preferences here' : 
                   pageId === 'data-input' ? 'Data entry features coming soon' :
                   'View your health data visualization';
    
    announceNavigation(pageName, context);
  }, [settings.audioEnabled, mode, playEnhancedFeedback, playClickSound, announceNavigation]);

  // Register keyboard shortcuts
  useEffect(() => {
    const shortcuts = {
      'Alt+1': () => handleNavigation('dashboard'),
      'Alt+2': () => handleNavigation('data-input'),
      'Alt+3': () => handleNavigation('settings'),
      'Escape': () => setCurrentPage('dashboard')
    };

    const cleanup = registerShortcuts(shortcuts);
    return cleanup;
  }, [registerShortcuts, handleNavigation]);

  // Announce app load with comprehensive information
  useEffect(() => {
    const welcomeMessage = `HealthVis application loaded in ${mode} mode. Use tab key to navigate between sections. Press Alt+1 for dashboard, Alt+2 for data input, Alt+3 for settings, or Escape to return to dashboard.`;
    announceToScreenReader(welcomeMessage);
    
    // Also announce available features
    setTimeout(() => {
      announceSuccess('Application ready', 'All accessibility features are active and ready to use');
    }, 1000);
  }, [announceToScreenReader, announceSuccess, mode]);

  // Handle mode changes with enhanced feedback
  const handleModeChange = useCallback((newMode) => {
    try {
      announceLoading(`Switching to ${newMode} mode`, true);
      
      setMode(newMode);
      
      // Enhanced audio feedback based on mode
      if (settings.audioEnabled || newMode === 'audio') {
        playModeChangeSound(newMode);
      } else {
        playSuccessSound();
      }
      
      // Enhanced screen reader announcement with mode description
      const modeDescriptions = {
        'visual': 'Standard visual interface with full color and styling',
        'audio': 'Enhanced audio feedback and screen reader support with simplified visuals',
        'hybrid': 'Combination of visual and audio features for flexible interaction',
        'simplified': 'Minimal complexity with larger elements and high contrast'
      };
      
      announceModeChange(newMode, modeDescriptions[newMode]);
      announceSuccess('Mode change', `Now using ${newMode} mode for optimal accessibility`);
      
      // Show success feedback
      setFeedbackMessage(`Successfully switched to ${newMode} mode`);
      setShowSuccessMessage(true);
      
    } catch (err) {
      console.error('Failed to change mode:', err);
      announceError('Mode change', 'Unable to switch accessibility mode', 'Please try again or refresh the page');
    }
  }, [setMode, settings.audioEnabled, playModeChangeSound, playSuccessSound, announceModeChange, announceSuccess, announceError, announceLoading]);

  // Handle settings changes with enhanced feedback
  const handleSettingsChange = useCallback((newSettings) => {
    try {
      announceLoading('Saving settings', true);
      
      updateSettings(newSettings);
      
      // Enhanced feedback for settings changes
      if (newSettings.audioEnabled || mode === 'audio' || mode === 'hybrid') {
        playEnhancedFeedback('settings-change', mode);
      } else {
        playSuccessSound();
      }
      
      // Detailed announcements for specific setting changes
      const changedSettings = [];
      if (newSettings.fontSize !== settings.fontSize) {
        changedSettings.push(`Font size: ${newSettings.fontSize}`);
      }
      if (newSettings.contrast !== settings.contrast) {
        changedSettings.push(`Contrast: ${newSettings.contrast}`);
      }
      if (newSettings.audioEnabled !== settings.audioEnabled) {
        changedSettings.push(`Audio feedback: ${newSettings.audioEnabled ? 'enabled' : 'disabled'}`);
      }
      
      if (changedSettings.length > 0) {
        announceSettingsChange('Settings updated', changedSettings.join(', '), 'Changes applied immediately');
      }
      
      announceSuccess('Settings saved', 'Your accessibility preferences have been updated and saved');
      
      // Show success feedback
      setFeedbackMessage('Settings saved successfully');
      setShowSuccessMessage(true);
      
    } catch (err) {
      console.error('Failed to update settings:', err);
      announceError('Settings save', 'Unable to save your preferences', 'Please try again or check your browser settings');
    }
  }, [updateSettings, mode, settings, playEnhancedFeedback, playSuccessSound, announceSettingsChange, announceSuccess, announceError, announceLoading]);

  // Render current page content
  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <ModeSelector currentMode={mode} onModeChange={handleModeChange} />
            <Dashboard />
          </>
        );
      case 'data-input':
        return <DataInput />;
      case 'settings':
        return <Settings settings={settings} onSettingsChange={handleSettingsChange} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={getModeSpecificClasses(`app app-mode-${mode}`)}>
      <Layout currentPage={currentPage}>
        <Navigation currentPage={currentPage} onNavigate={handleNavigation} />
        {renderPageContent()}
      </Layout>

      {/* User Feedback Messages */}
      <LoadingFeedback 
        message="Updating accessibility settings..."
        isVisible={isLoading}
      />
      
      <SuccessFeedback
        message={feedbackMessage}
        isVisible={showSuccessMessage}
        onDismiss={() => setShowSuccessMessage(false)}
      />
      
      <ErrorFeedback
        message={error?.message}
        isVisible={!!error}
        onDismiss={clearError}
        actionButton={
          error?.type === 'mode-change' ? (
            <button 
              onClick={() => {
                clearError();
                handleModeChange('visual');
              }}
              className="error-action-button"
            >
              Switch to Visual Mode
            </button>
          ) : null
        }
      />

      {/* Enhanced Screen Reader Announcements */}
      <ScreenReaderAnnouncements />

      {/* Mode-Specific Helper Text */}
      <div id="audio-mode-help" className="sr-only">
        Audio mode active. Enhanced audio feedback enabled for all interactions.
      </div>
      <div id="simplified-mode-help" className="sr-only">
        Simplified mode active. Interface uses larger buttons and clearer layouts.
      </div>
      <div id="simplified-mode-description" className="sr-only">
        This element has been optimized for simplified interaction with larger touch targets.
      </div>
    </div>
  );
}

// Main App component with accessibility provider and error boundary
function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <AppContent />
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
