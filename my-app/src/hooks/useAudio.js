import { useCallback } from 'react';

export const useAudio = () => {
  const playSound = useCallback((frequency = 440, duration = 200, type = 'sine', volume = 0.3) => {
    try {
      // Check if Web Audio API is available
      if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API not supported');
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, duration + 100);
    } catch (error) {
      console.warn('Failed to play audio:', error);
    }
  }, []);

  // Enhanced audio feedback for different interaction types
  const playSuccessSound = useCallback(() => {
    playSound(523, 150, 'sine', 0.3); // C5 note
  }, [playSound]);

  const playErrorSound = useCallback(() => {
    playSound(220, 300, 'sawtooth', 0.2); // A3 note with different waveform
  }, [playSound]);

  const playClickSound = useCallback(() => {
    playSound(440, 100, 'sine', 0.2); // A4 note
  }, [playSound]);

  // Mode-specific enhanced audio feedback
  const playModeChangeSound = useCallback((mode) => {
    switch (mode) {
      case 'visual':
        playSound(523, 200, 'sine', 0.25); // C5
        break;
      case 'audio':
        // Two-tone sound for audio mode
        playSound(440, 150, 'sine', 0.3); // A4
        setTimeout(() => playSound(523, 150, 'sine', 0.3), 100); // C5
        break;
      case 'hybrid':
        // Chord-like sound for hybrid mode
        playSound(440, 250, 'sine', 0.2); // A4
        setTimeout(() => playSound(523, 250, 'sine', 0.2), 50); // C5
        break;
      case 'simplified':
        playSound(392, 300, 'triangle', 0.25); // G4 with softer waveform
        break;
      default:
        playClickSound();
    }
  }, [playSound, playClickSound]);

  const playFocusSound = useCallback(() => {
    playSound(660, 80, 'sine', 0.15); // E5 - subtle focus indicator
  }, [playSound]);

  const playHoverSound = useCallback(() => {
    playSound(880, 60, 'sine', 0.1); // A5 - very subtle hover indicator
  }, [playSound]);

  const playNavigationSound = useCallback(() => {
    playSound(349, 120, 'sine', 0.2); // F4 - navigation feedback
  }, [playSound]);

  const playSettingsChangeSound = useCallback(() => {
    playSound(587, 180, 'triangle', 0.2); // D5 - settings update
  }, [playSound]);

  // Enhanced feedback for audio and hybrid modes
  const playEnhancedFeedback = useCallback((action, mode) => {
    if (mode !== 'audio' && mode !== 'hybrid') {
      return;
    }

    switch (action) {
      case 'button-hover':
        playHoverSound();
        break;
      case 'button-focus':
        playFocusSound();
        break;
      case 'navigation':
        playNavigationSound();
        break;
      case 'settings-change':
        playSettingsChangeSound();
        break;
      case 'mode-change':
        playModeChangeSound(mode);
        break;
      default:
        playClickSound();
    }
  }, [playHoverSound, playFocusSound, playNavigationSound, playSettingsChangeSound, playModeChangeSound, playClickSound]);

  return {
    playSound,
    playSuccessSound,
    playErrorSound,
    playClickSound,
    playModeChangeSound,
    playFocusSound,
    playHoverSound,
    playNavigationSound,
    playSettingsChangeSound,
    playEnhancedFeedback
  };
};