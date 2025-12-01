/**
 * Sonification Utility
 * 
 * Provides data sonification functionality using expo-av for audio playback.
 * Uses three discrete frequency bands (low, medium, high) for MVP implementation.
 * Backend returns band classification, frontend plays corresponding tones.
 * 
 * Note: expo-av is deprecated in SDK 54, will migrate to expo-audio in future update.
 * 
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { Audio } from 'expo-av';
import { FrequencyBand, DataPoint } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SonificationOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (index: number, total: number) => void;
}

export interface SonificationControl {
  stop: () => Promise<void>;
  isPlaying: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Frequency bands in Hz (Requirement 14.3, 14.4, 14.5)
const FREQUENCY_BANDS = {
  low: 300,      // 200-400 Hz range, using middle value
  medium: 500,   // 400-600 Hz range, using middle value
  high: 800,     // 600-1000 Hz range, using middle value
} as const;

// Audio file mapping - pre-generated tone files
const TONE_FILES = {
  low: require('../assets/audio/tone-low.wav'),
  medium: require('../assets/audio/tone-medium.wav'),
  high: require('../assets/audio/tone-high.wav'),
};

// Duration for each tone in milliseconds
const TONE_DURATION = 200;

// Gap between tones in milliseconds
const TONE_GAP = 50;

// ============================================================================
// Sonification State
// ============================================================================

let currentPlayback: {
  sounds: Audio.Sound[];
  isPlaying: boolean;
  shouldStop: boolean;
} | null = null;

// ============================================================================
// Initialize Audio
// ============================================================================

let isAudioInitialized = false;

async function initializeAudio(): Promise<void> {
  if (isAudioInitialized) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isAudioInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio for sonification:', error);
    throw new Error('Audio initialization failed');
  }
}

// ============================================================================
// Tone Generation
// ============================================================================

/**
 * Generate a tone using pre-generated audio files
 * Maps frequency to the appropriate tone file (low, medium, or high)
 */
async function generateTone(frequency: number, duration: number): Promise<Audio.Sound> {
  try {
    // Select the appropriate tone file based on frequency
    const toneFile = selectToneFile(frequency);
    
    console.log(`🎵 Loading sonification tone: ${frequency}Hz → ${toneFile}`);
    
    // Load the pre-generated audio file
    const { sound } = await Audio.Sound.createAsync(
      TONE_FILES[toneFile],
      { shouldPlay: false }
    );
    
    return sound;
  } catch (error) {
    console.error(`Failed to load tone at ${frequency}Hz:`, error);
    throw error;
  }
}

/**
 * Select the appropriate tone file based on frequency
 * Maps to low (300Hz), medium (500Hz), or high (800Hz)
 */
function selectToneFile(frequency: number): 'low' | 'medium' | 'high' {
  if (frequency <= 300) {
    return 'low';
  } else if (frequency <= 500) {
    return 'medium';
  } else {
    return 'high';
  }
}

// ============================================================================
// Frequency Band Mapping
// ============================================================================

/**
 * Map a data range to a frequency band
 * Requirement 14.3, 14.4, 14.5: Map data values to frequency bands
 */
function mapRangeToFrequencyBand(range: 'normal' | 'warning' | 'danger'): FrequencyBand {
  switch (range) {
    case 'normal':
      return 'medium';
    case 'warning':
      return 'high';
    case 'danger':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Get frequency for a given band
 */
function getFrequencyForBand(band: FrequencyBand): number {
  return FREQUENCY_BANDS[band];
}

// ============================================================================
// Main Sonification Function
// ============================================================================

/**
 * Play a data series as sonification
 * 
 * Requirement 14.2: Play data series using expo-av
 * Requirement 14.3, 14.4, 14.5: Use discrete frequency bands
 * Requirement 14.6: Provide stop functionality
 * 
 * @param data - Array of data points to sonify
 * @param options - Optional callbacks for completion, error, and progress
 * @returns Control object with stop function and isPlaying status
 */
export async function playDataSeries(
  data: DataPoint[],
  options: SonificationOptions = {}
): Promise<SonificationControl> {
  // Handle empty data gracefully (Requirement: Handle empty data)
  if (!data || data.length === 0) {
    const error = new Error('No data available for sonification');
    if (options.onError) {
      options.onError(error);
    }
    return {
      stop: async () => {},
      isPlaying: false,
    };
  }

  // Stop any existing playback
  if (currentPlayback?.isPlaying) {
    await stopPlayback();
  }

  // Initialize audio
  try {
    await initializeAudio();
  } catch (error) {
    if (options.onError) {
      options.onError(error as Error);
    }
    return {
      stop: async () => {},
      isPlaying: false,
    };
  }

  // Initialize playback state
  currentPlayback = {
    sounds: [],
    isPlaying: true,
    shouldStop: false,
  };

  // Create control object
  const control: SonificationControl = {
    stop: stopPlayback,
    isPlaying: true,
  };

  // Start playback asynchronously
  playSequence(data, options).catch((error) => {
    console.error('Error during sonification playback:', error);
    if (options.onError) {
      options.onError(error);
    }
  });

  return control;
}

// ============================================================================
// Playback Sequence
// ============================================================================

/**
 * Play the sequence of tones for the data series
 */
async function playSequence(
  data: DataPoint[],
  options: SonificationOptions
): Promise<void> {
  if (!currentPlayback) return;

  try {
    for (let i = 0; i < data.length; i++) {
      // Check if we should stop
      if (currentPlayback.shouldStop) {
        break;
      }

      const point = data[i];
      
      // Map data range to frequency band
      const band = mapRangeToFrequencyBand(point.range);
      const frequency = getFrequencyForBand(band);

      // Generate and play tone
      const sound = await generateTone(frequency, TONE_DURATION);
      
      if (currentPlayback) {
        currentPlayback.sounds.push(sound);
      }

      // Play the tone
      await sound.playAsync();

      // Report progress
      if (options.onProgress) {
        options.onProgress(i + 1, data.length);
      }

      // Wait for tone duration plus gap
      await new Promise(resolve => setTimeout(resolve, TONE_DURATION + TONE_GAP));

      // Cleanup the sound
      await sound.unloadAsync();
      if (currentPlayback) {
        currentPlayback.sounds = currentPlayback.sounds.filter(s => s !== sound);
      }
    }

    // Playback complete
    if (currentPlayback && !currentPlayback.shouldStop) {
      if (options.onComplete) {
        options.onComplete();
      }
    }
  } finally {
    // Cleanup
    await cleanupPlayback();
  }
}

// ============================================================================
// Stop Playback
// ============================================================================

/**
 * Stop the current sonification playback
 * Requirement 14.6: Provide stop button functionality
 */
async function stopPlayback(): Promise<void> {
  if (!currentPlayback) return;

  // Signal to stop
  currentPlayback.shouldStop = true;
  currentPlayback.isPlaying = false;

  // Cleanup all sounds
  await cleanupPlayback();
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup all sound objects and reset state
 */
async function cleanupPlayback(): Promise<void> {
  if (!currentPlayback) return;

  try {
    // Unload all sound objects
    for (const sound of currentPlayback.sounds) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.error('Error unloading sound during cleanup:', error);
      }
    }
  } catch (error) {
    console.error('Error during sonification cleanup:', error);
  } finally {
    currentPlayback = null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if sonification is currently playing
 */
export function isSonificationPlaying(): boolean {
  return currentPlayback?.isPlaying ?? false;
}

/**
 * Get the frequency for a specific data range
 * Useful for testing or displaying frequency information
 */
export function getFrequencyForRange(range: 'normal' | 'warning' | 'danger'): number {
  const band = mapRangeToFrequencyBand(range);
  return getFrequencyForBand(band);
}
