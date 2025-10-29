import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import '../styles/components/ModeOptimizedWrapper.css';

const ModeOptimizedWrapper = ({ children, className = '', ...props }) => {
  const { mode, modeFeatures } = useAccessibility();

  // Generate CSS classes based on current mode and features
  const getModeClasses = () => {
    const classes = ['mode-optimized-wrapper'];
    
    // Add mode-specific class
    classes.push(`mode-${mode}`);
    
    // Add feature-specific classes
    if (modeFeatures.prioritizeAudio) {
      classes.push('audio-priority');
    }
    
    if (modeFeatures.reduceVisualComplexity) {
      classes.push('reduced-complexity');
    }
    
    if (modeFeatures.hideAdvancedFeatures) {
      classes.push('hide-advanced');
    }
    
    if (modeFeatures.largerTargets) {
      classes.push('larger-targets');
    }
    
    if (modeFeatures.keyboardOptimized) {
      classes.push('keyboard-optimized');
    }
    
    return classes.join(' ');
  };

  // Apply mode-specific data attributes for CSS targeting
  const getModeAttributes = () => {
    return {
      'data-accessibility-mode': mode,
      'data-audio-priority': modeFeatures.prioritizeAudio,
      'data-reduced-complexity': modeFeatures.reduceVisualComplexity,
      'data-keyboard-optimized': modeFeatures.keyboardOptimized,
      'data-enhanced-sonification': modeFeatures.enhancedSonification,
    };
  };

  return (
    <div
      className={`${getModeClasses()} ${className}`}
      {...getModeAttributes()}
      {...props}
    >
      {children}
    </div>
  );
};

export default ModeOptimizedWrapper;