import React, { useState, useEffect } from 'react';
import { AccessibilityProvider, useAccessibility } from './contexts/AccessibilityContext';
import { useScreenReader } from './hooks/useScreenReader';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useAudioFeedback } from './hooks/useAudioFeedback';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/AppLayout';
import NotificationSystem from './components/NotificationSystem';
import ModeOptimizedWrapper from './components/ModeOptimizedWrapper';
import AccessibilityModeSelector from './components/AccessibilityModeSelector';
import SettingsPanel from './components/SettingsPanel';
import AccessibleChart from './components/AccessibleChart';
import DataSummary from './components/DataSummary';
import ProgressiveDisclosure from './components/ProgressiveDisclosure';
import LoadingIndicator from './components/LoadingIndicator';

// Services
import { MockDataService } from './services/MockDataService';

import './App.css';

// Main app content component
function AppContent() {
  const { announcePolite } = useScreenReader();
  const { registerKeyboardShortcuts } = useKeyboardNavigation();
  const { playSuccessSound, playErrorSound } = useAudioFeedback();
  const { mode, modeFeatures, updatePreferences } = useAccessibility();

  // Application state
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [healthData, setHealthData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await MockDataService.generateHealthData('vitals', 30);
        setHealthData(data);
        playSuccessSound();
        announcePolite('Health data loaded successfully');
      } catch (error) {
        console.error('Failed to load health data:', error);
        playErrorSound();
        announcePolite('Failed to load health data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [announcePolite, playSuccessSound, playErrorSound]);

  // Register global keyboard shortcuts
  useEffect(() => {
    const shortcuts = {
      'Alt+1': () => handleNavigation('dashboard'),
      'Alt+2': () => handleNavigation('data-input'),
      'Alt+3': () => handleNavigation('settings'),
      'Alt+4': () => handleNavigation('help'),
      'Ctrl+,': () => setShowSettings(true),
      'Escape': () => setShowSettings(false)
    };

    registerKeyboardShortcuts(shortcuts);
  }, [registerKeyboardShortcuts]);

  // Announce app load to screen readers
  useEffect(() => {
    announcePolite(`HealthVis application loaded in ${mode} mode. Navigate using tab key or screen reader commands.`);
  }, [announcePolite, mode]);

  // Handle navigation between sections
  const handleNavigation = (sectionId, item) => {
    setCurrentSection(sectionId);
    
    // Update breadcrumbs based on section
    const sectionBreadcrumbs = {
      'dashboard': [
        { id: 'home', label: 'Home' },
        { id: 'dashboard', label: 'Dashboard' }
      ],
      'data-input': [
        { id: 'home', label: 'Home' },
        { id: 'data-input', label: 'Data Input' }
      ],
      'settings': [
        { id: 'home', label: 'Home' },
        { id: 'settings', label: 'Settings' }
      ],
      'help': [
        { id: 'home', label: 'Home' },
        { id: 'help', label: 'Help' }
      ]
    };
    
    setBreadcrumbs(sectionBreadcrumbs[sectionId] || []);
    
    // Announce navigation
    if (item) {
      announcePolite(`Navigated to ${item.label}. ${item.description || ''}`);
    }
  };

  // Handle settings panel
  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
    announcePolite(showSettings ? 'Settings panel closed' : 'Settings panel opened');
  };

  const handlePreferencesChange = (newPreferences) => {
    updatePreferences(newPreferences);
    announcePolite('Accessibility preferences updated');
    playSuccessSound();
  };

  // Render main content based on current section
  const renderMainContent = () => {
    if (isLoading) {
      return (
        <LoadingIndicator 
          message="Loading health data visualization..."
          showProgress={true}
        />
      );
    }

    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <h2 id="dashboard-heading">Health Data Dashboard</h2>
            
            {/* Mode selector for accessibility */}
            <section aria-labelledby="mode-selector-heading" className="mode-selector-section">
              <AccessibilityModeSelector />
            </section>

            {/* Progressive disclosure of health data */}
            <section aria-labelledby="health-data-heading" className="health-data-section">
              <ProgressiveDisclosure
                title="Your Health Data"
                data={{
                  summary: {
                    title: 'Health Overview',
                    content: <DataSummary data={healthData} />
                  },
                  detailed: {
                    title: 'Detailed Charts',
                    content: (
                      <AccessibleChart
                        data={healthData}
                        chartType="line"
                        title="Health Trends Over Time"
                        description="Your vital signs and health metrics over the past 30 days"
                      />
                    )
                  }
                }}
                currentLevel={modeFeatures.progressiveDisclosure ? 0 : 1}
              />
            </section>
          </div>
        );

      case 'data-input':
        return (
          <div className="data-input-content">
            <h2 id="data-input-heading">Health Data Input</h2>
            <p>Enter new health data or upload from your devices.</p>
            {/* Data input components would go here */}
          </div>
        );

      case 'settings':
        return (
          <div className="settings-content">
            <h2 id="settings-heading">Application Settings</h2>
            <SettingsPanel
              onPreferencesChange={handlePreferencesChange}
              onClose={() => setCurrentSection('dashboard')}
            />
          </div>
        );

      case 'help':
        return (
          <div className="help-content">
            <h2 id="help-heading">Help & Documentation</h2>
            <section aria-labelledby="keyboard-shortcuts-heading">
              <h3 id="keyboard-shortcuts-heading">Keyboard Shortcuts</h3>
              <ul>
                <li><kbd>Alt+1</kbd> - Navigate to Dashboard</li>
                <li><kbd>Alt+2</kbd> - Navigate to Data Input</li>
                <li><kbd>Alt+3</kbd> - Navigate to Settings</li>
                <li><kbd>Alt+4</kbd> - Navigate to Help</li>
                <li><kbd>Ctrl+,</kbd> - Open Settings Panel</li>
                <li><kbd>Escape</kbd> - Close Settings Panel</li>
              </ul>
            </section>
            
            <section aria-labelledby="accessibility-features-heading">
              <h3 id="accessibility-features-heading">Accessibility Features</h3>
              <ul>
                <li>Screen reader support with ARIA labels</li>
                <li>Keyboard navigation for all functionality</li>
                <li>Audio feedback and data sonification</li>
                <li>Customizable visual settings</li>
                <li>Progressive disclosure for complex data</li>
                <li>Multiple accessibility modes</li>
              </ul>
            </section>
          </div>
        );

      default:
        return (
          <div className="default-content">
            <h2>Welcome to HealthVis</h2>
            <p>Select a section from the navigation to get started.</p>
          </div>
        );
    }
  };

  return (
    <ModeOptimizedWrapper className="app-wrapper">
      <AppLayout
        currentSection={currentSection}
        onNavigate={handleNavigation}
        breadcrumbs={breadcrumbs}
        className={`app-mode-${mode}`}
      >
        {renderMainContent()}
      </AppLayout>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="settings-overlay" role="dialog" aria-modal="true">
          <SettingsPanel
            onPreferencesChange={handlePreferencesChange}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Global Notification System */}
      <NotificationSystem />

      {/* Screen Reader Live Region for Dynamic Announcements */}
      <div
        id="sr-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />

      {/* Assertive Live Region for Critical Announcements */}
      <div
        id="sr-assertive-region"
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
      />
    </ModeOptimizedWrapper>
  );
}

// Main App component with error boundary and accessibility provider
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
