import { useEffect, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import audioFeedbackService from '../services/AudioFeedbackService';

/**
 * Custom hook for audio feedback functionality
 * Provides methods to manage audio cues, speech, and sonification
 */
export function useAudioFeedback() {
  const accessibilityContext = useAccessibility();
  const preferences = accessibilityContext?.preferences || {
    audioSettings: {
      enableSonification: false,
      audioVolume: 0.7,
      speechRate: 1,
      preferredVoice: null
    }
  };

  // Initialize audio feedback service on mount
  useEffect(() => {
    try {
      if (preferences?.audioSettings?.enableSonification) {
        audioFeedbackService.initialize();
        
        // Update service preferences
        audioFeedbackService.setPreferences({
          audioEnabled: preferences.audioSettings.enableSonification,
          volume: preferences.audioSettings.audioVolume,
          speechRate: preferences.audioSettings.speechRate,
          preferredVoice: preferences.audioSettings.preferredVoice
        });
      }
    } catch (error) {
      console.error('Error initializing audio feedback service:', error);
    }

    return () => {
      // Don't destroy the service as it might be used by other components
      // audioFeedbackService.destroy();
    };
  }, [
    preferences.audioSettings.enableSonification,
    preferences.audioSettings.audioVolume,
    preferences.audioSettings.speechRate,
    preferences.audioSettings.preferredVoice
  ]);

  /**
   * Play an audio cue
   */
  const playAudioCue = useCallback(async (cueType, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.playAudioCue(cueType, options);
    } catch (error) {
      console.warn('Failed to play audio cue:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Speak text using text-to-speech
   */
  const speak = useCallback(async (text, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.speak(text, options);
    } catch (error) {
      console.warn('Failed to speak text:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    audioFeedbackService.stopSpeaking();
  }, []);

  /**
   * Sonify data points for audio visualization
   */
  const sonifyData = useCallback(async (dataPoints, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.sonifyData(dataPoints, options);
    } catch (error) {
      console.warn('Failed to sonify data:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Announce data point with speech and audio cue
   */
  const announceDataPoint = useCallback(async (dataPoint, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.announceDataPoint(dataPoint, options);
    } catch (error) {
      console.warn('Failed to announce data point:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Announce data trend with sonification
   */
  const announceTrend = useCallback(async (trendData, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.announceTrend(trendData, options);
    } catch (error) {
      console.warn('Failed to announce trend:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Play UI interaction feedback
   */
  const playInteractionFeedback = useCallback(async (interactionType, options = {}) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.playInteractionFeedback(interactionType, options);
    } catch (error) {
      console.warn('Failed to play interaction feedback:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Get available voices for speech synthesis
   */
  const getAvailableVoices = useCallback(() => {
    return audioFeedbackService.getAvailableVoices();
  }, []);

  /**
   * Test audio functionality
   */
  const testAudio = useCallback(async () => {
    try {
      return await audioFeedbackService.testAudio();
    } catch (error) {
      console.warn('Failed to test audio:', error);
      return {
        audioContext: false,
        speechSynthesis: false,
        audioPlayback: false,
        speechPlayback: false
      };
    }
  }, []);

  /**
   * Check if audio features are supported
   */
  const isAudioSupported = useCallback(() => {
    return audioFeedbackService.isSupported();
  }, []);

  /**
   * Play tone with specified parameters
   */
  const playTone = useCallback(async (config) => {
    if (!preferences.audioSettings.enableSonification) return;
    
    try {
      await audioFeedbackService.playTone(config);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }, [preferences.audioSettings.enableSonification]);

  /**
   * Play success sound
   */
  const playSuccessSound = useCallback(async () => {
    try {
      await playAudioCue('success');
    } catch (error) {
      console.warn('Failed to play success sound:', error);
    }
  }, [playAudioCue]);

  /**
   * Play error sound
   */
  const playErrorSound = useCallback(async () => {
    try {
      await playAudioCue('error');
    } catch (error) {
      console.warn('Failed to play error sound:', error);
    }
  }, [playAudioCue]);

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(async () => {
    try {
      await playAudioCue('notification');
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [playAudioCue]);

  return {
    playAudioCue,
    speak,
    stopSpeaking,
    sonifyData,
    announceDataPoint,
    announceTrend,
    playInteractionFeedback,
    playTone,
    playSuccessSound,
    playErrorSound,
    playNotificationSound,
    getAvailableVoices,
    testAudio,
    isAudioSupported,
    isAudioEnabled: preferences.audioSettings.enableSonification,
    audioVolume: preferences.audioSettings.audioVolume,
    speechRate: preferences.audioSettings.speechRate,
  };
}