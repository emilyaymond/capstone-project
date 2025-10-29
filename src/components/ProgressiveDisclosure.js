import React, { useState, useEffect, useRef } from 'react';
import { useScreenReader } from '../hooks/useScreenReader';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import '../styles/components/ProgressiveDisclosure.css';

/**
 * ProgressiveDisclosure component provides step-by-step revelation of complex data
 * with accessible controls and breadcrumb navigation
 */
const ProgressiveDisclosure = ({
  data,
  levels = [],
  initialLevel = 0,
  onLevelChange,
  className = '',
  'aria-label': ariaLabel = 'Progressive data disclosure'
}) => {
  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // Update current level when initialLevel prop changes
  useEffect(() => {
    setCurrentLevel(initialLevel);
  }, [initialLevel]);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const { announceToScreenReader } = useScreenReader();
  const { registerKeyboardShortcuts, unregisterKeyboardShortcuts } = useKeyboardNavigation();
  const containerRef = useRef(null);
  const breadcrumbRef = useRef(null);

  // Register keyboard shortcuts for navigation
  useEffect(() => {
    const shortcuts = {
      'ArrowRight': () => navigateToLevel(Math.min(currentLevel + 1, levels.length - 1)),
      'ArrowLeft': () => navigateToLevel(Math.max(currentLevel - 1, 0)),
      'Home': () => navigateToLevel(0),
      'End': () => navigateToLevel(levels.length - 1),
      'Enter': () => toggleCurrentSection(),
      'Space': () => toggleCurrentSection()
    };

    registerKeyboardShortcuts(shortcuts);
    return () => unregisterKeyboardShortcuts(Object.keys(shortcuts));
  }, [currentLevel, levels.length, registerKeyboardShortcuts, unregisterKeyboardShortcuts]);

  const navigateToLevel = (newLevel) => {
    if (newLevel >= 0 && newLevel < levels.length && newLevel !== currentLevel) {
      setCurrentLevel(newLevel);
      onLevelChange?.(newLevel);
      
      const levelName = levels[newLevel]?.name || `Level ${newLevel + 1}`;
      announceToScreenReader(`Navigated to ${levelName}`);
    }
  };

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
      announceToScreenReader(`Collapsed section ${sectionId}`);
    } else {
      newExpanded.add(sectionId);
      announceToScreenReader(`Expanded section ${sectionId}`);
    }
    setExpandedSections(newExpanded);
  };

  const toggleCurrentSection = () => {
    const currentSection = levels[currentLevel];
    if (currentSection?.collapsible) {
      toggleSection(currentSection.id);
    }
  };

  const renderBreadcrumb = () => {
    return (
      <nav 
        className="progressive-disclosure__breadcrumb"
        aria-label="Data disclosure navigation"
        ref={breadcrumbRef}
      >
        <ol className="progressive-disclosure__breadcrumb-list">
          {levels.slice(0, currentLevel + 1).map((level, index) => (
            <li key={level.id} className="progressive-disclosure__breadcrumb-item">
              <button
                className={`progressive-disclosure__breadcrumb-button ${
                  index === currentLevel ? 'progressive-disclosure__breadcrumb-button--current' : ''
                }`}
                onClick={() => navigateToLevel(index)}
                aria-current={index === currentLevel ? 'step' : undefined}
                aria-describedby={`breadcrumb-help-${index}`}
              >
                {level.name}
              </button>
              <span 
                id={`breadcrumb-help-${index}`} 
                className="sr-only"
              >
                {index === currentLevel ? 'Current level' : `Navigate to ${level.name}`}
              </span>
              {index < currentLevel && (
                <span className="progressive-disclosure__breadcrumb-separator" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  const renderSection = (section, isExpanded) => {
    const sectionId = section.id;
    const headingId = `section-heading-${sectionId}`;
    const contentId = `section-content-${sectionId}`;

    return (
      <div 
        key={sectionId}
        className="progressive-disclosure__section"
        aria-labelledby={headingId}
      >
        <div className="progressive-disclosure__section-header">
          {section.collapsible ? (
            <button
              id={headingId}
              className="progressive-disclosure__section-toggle"
              onClick={() => toggleSection(sectionId)}
              aria-expanded={isExpanded}
              aria-controls={contentId}
              aria-describedby={`section-help-${sectionId}`}
            >
              <span className="progressive-disclosure__section-icon" aria-hidden="true">
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="progressive-disclosure__section-title">
                {section.title}
              </span>
            </button>
          ) : (
            <h3 id={headingId} className="progressive-disclosure__section-title">
              {section.title}
            </h3>
          )}
          <span 
            id={`section-help-${sectionId}`} 
            className="sr-only"
          >
            {section.collapsible 
              ? `${isExpanded ? 'Collapse' : 'Expand'} ${section.title} section`
              : `${section.title} section`
            }
          </span>
        </div>
        
        <div
          id={contentId}
          className={`progressive-disclosure__section-content ${
            section.collapsible && !isExpanded ? 'progressive-disclosure__section-content--collapsed' : ''
          }`}
          aria-hidden={section.collapsible && !isExpanded}
        >
          {section.summary && (
            <div className="progressive-disclosure__section-summary">
              {section.summary}
            </div>
          )}
          {section.content && (
            <div className="progressive-disclosure__section-body">
              {typeof section.content === 'function' 
                ? section.content(data, currentLevel) 
                : section.content
              }
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentLevelData = levels[currentLevel];
  
  if (!currentLevelData) {
    return (
      <div className="progressive-disclosure__error" role="alert">
        <p>No data available for the current disclosure level.</p>
      </div>
    );
  }

  return (
    <div 
      className={`progressive-disclosure ${className}`}
      ref={containerRef}
      aria-label={ariaLabel}
      role="region"
    >
      {/* Breadcrumb Navigation */}
      {levels.length > 1 && renderBreadcrumb()}
      
      {/* Level Navigation Controls */}
      <div className="progressive-disclosure__controls">
        <button
          className="progressive-disclosure__nav-button"
          onClick={() => navigateToLevel(Math.max(currentLevel - 1, 0))}
          disabled={currentLevel === 0}
          aria-label="Previous level"
        >
          ← Previous
        </button>
        
        <span className="progressive-disclosure__level-indicator">
          Level {currentLevel + 1} of {levels.length}: {currentLevelData.name}
        </span>
        
        <button
          className="progressive-disclosure__nav-button"
          onClick={() => navigateToLevel(Math.min(currentLevel + 1, levels.length - 1))}
          disabled={currentLevel === levels.length - 1}
          aria-label="Next level"
        >
          Next →
        </button>
      </div>

      {/* Current Level Content */}
      <div className="progressive-disclosure__content">
        {currentLevelData.description && (
          <div className="progressive-disclosure__description">
            {currentLevelData.description}
          </div>
        )}
        
        {currentLevelData.sections?.map(section => 
          renderSection(section, expandedSections.has(section.id))
        )}
      </div>

      {/* Keyboard Help */}
      <div className="progressive-disclosure__help sr-only" aria-live="polite">
        Use arrow keys to navigate between levels, Enter or Space to toggle sections.
      </div>
    </div>
  );
};

export default ProgressiveDisclosure;