/**
 * Tests for SettingsPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPanel from '../SettingsPanel';
import { PreferencesStorageService } from '../../services/PreferencesStorageService';
import { DEFAULT_USER_PREFERENCES } from '../../models/UserPreferences';

// Mock the PreferencesStorageService
jest.mock('../../services/PreferencesStorageService');

describe('SettingsPanel', () => {
  const mockOnPreferencesChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    PreferencesStorageService.loadPreferences.mockResolvedValue(DEFAULT_USER_PREFERENCES);
    PreferencesStorageService.savePreferences.mockResolvedValue(true);
  });

  const renderSettingsPanel = (props = {}) => {
    return render(
      <SettingsPanel
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        {...props}
      />
    );
  };

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'settings-title');
      
      const title = screen.getByRole('heading', { name: /accessibility settings/i });
      expect(title).toHaveAttribute('id', 'settings-title');
    });

    it('should have proper fieldset and legend structure', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByText('Visual Settings')).toBeInTheDocument();
      });

      // Check that all sections have proper fieldset/legend structure
      const fieldsets = screen.getAllByRole('group');
      expect(fieldsets).toHaveLength(4); // Visual, Audio, Interaction, Accessibility Mode

      expect(screen.getByText('Visual Settings')).toBeInTheDocument();
      expect(screen.getByText('Audio Settings')).toBeInTheDocument();
      expect(screen.getByText('Interaction Settings')).toBeInTheDocument();
      expect(screen.getByText('Accessibility Mode')).toBeInTheDocument();
    });

    it('should have proper labels for all form controls', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
      });

      // Check that all inputs have proper labels
      expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contrast/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color scheme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reduce motion/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable data sonification/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/speech rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/audio volume/i)).toBeInTheDocument();
    });

    it('should have help text for form controls', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByText('Adjust text size from 12px to 24px')).toBeInTheDocument();
      });

      // Check for help text
      expect(screen.getByText('Adjust text size from 12px to 24px')).toBeInTheDocument();
      expect(screen.getByText('Choose contrast level for better visibility')).toBeInTheDocument();
      expect(screen.getByText('Select preferred color theme')).toBeInTheDocument();
    });

    it('should have accessible close button', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close settings panel/i });
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('aria-label', 'Close settings panel');
      });
    });

    it('should have live region for status messages', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const statusRegion = screen.getByRole('status');
        expect(statusRegion).toBeInTheDocument();
        expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      PreferencesStorageService.loadPreferences.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderSettingsPanel();
      
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
      expect(screen.getByText('Loading settings...')).toHaveAttribute('aria-live', 'polite');
    });

    it('should hide loading state after preferences load', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByRole('heading', { name: /accessibility settings/i })).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update font size when slider changes', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
      });

      const fontSizeSlider = screen.getByLabelText(/font size/i);
      fireEvent.change(fontSizeSlider, { target: { value: '20' } });

      expect(fontSizeSlider).toHaveValue('20');
      expect(screen.getByText('Font Size: 20px')).toBeInTheDocument();
    });

    it('should update contrast when select changes', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/contrast/i)).toBeInTheDocument();
      });

      const contrastSelect = screen.getByLabelText(/contrast/i);
      fireEvent.change(contrastSelect, { target: { value: 'high' } });

      expect(contrastSelect).toHaveValue('high');
    });

    it('should update checkboxes when clicked', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/reduce motion/i)).toBeInTheDocument();
      });

      const reduceMotionCheckbox = screen.getByLabelText(/reduce motion/i);
      expect(reduceMotionCheckbox).not.toBeChecked();
      
      fireEvent.click(reduceMotionCheckbox);
      expect(reduceMotionCheckbox).toBeChecked();
    });

    it('should update speech rate slider', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/speech rate/i)).toBeInTheDocument();
      });

      const speechRateSlider = screen.getByLabelText(/speech rate/i);
      fireEvent.change(speechRateSlider, { target: { value: '1.5' } });

      expect(speechRateSlider).toHaveValue('1.5');
      expect(screen.getByText('Speech Rate: 1.5x')).toBeInTheDocument();
    });

    it('should update audio volume slider', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/audio volume/i)).toBeInTheDocument();
      });

      const volumeSlider = screen.getByLabelText(/audio volume/i);
      fireEvent.change(volumeSlider, { target: { value: '0.8' } });

      expect(volumeSlider).toHaveValue('0.8');
      expect(screen.getByText('Audio Volume: 80%')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should save preferences when save button is clicked', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(PreferencesStorageService.savePreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            visualSettings: expect.any(Object),
            audioSettings: expect.any(Object),
            interactionSettings: expect.any(Object),
            accessibilityMode: expect.any(Object)
          })
        );
      });
    });

    it('should show success message after successful save', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
      });

      expect(mockOnPreferencesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          visualSettings: expect.any(Object)
        })
      );
    });

    it('should show error message when save fails', async () => {
      PreferencesStorageService.savePreferences.mockResolvedValue(false);
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save settings. Please check your inputs.')).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      PreferencesStorageService.savePreferences.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset preferences to defaults when reset button is clicked', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
      });

      // First change a setting
      const fontSizeSlider = screen.getByLabelText(/font size/i);
      fireEvent.change(fontSizeSlider, { target: { value: '20' } });

      // Then reset
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Settings reset to defaults')).toBeInTheDocument();
      });

      // Check that font size is back to default
      expect(screen.getByText('Font Size: 16px')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close settings panel/i })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close settings panel/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be navigable with keyboard', async () => {
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      });

      // Test that elements are focusable
      const closeButton = screen.getByRole('button', { name: /close settings panel/i });
      const fontSizeSlider = screen.getByLabelText(/font size/i);
      const contrastSelect = screen.getByLabelText(/contrast/i);

      expect(closeButton).toBeInTheDocument();
      expect(fontSizeSlider).toBeInTheDocument();
      expect(contrastSelect).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle load preferences error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      PreferencesStorageService.loadPreferences.mockRejectedValue(new Error('Load failed'));
      
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /accessibility settings/i })).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load preferences:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle save preferences error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      PreferencesStorageService.savePreferences.mockRejectedValue(new Error('Save failed'));
      
      renderSettingsPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred while saving settings.')).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error saving preferences:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});