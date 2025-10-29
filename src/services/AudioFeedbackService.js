/**
 * AudioFeedbackService - Manages audio feedback, sonification, and text-to-speech
 * Provides comprehensive audio accessibility features for the application
 */
class AudioFeedbackService {
  constructor() {
    this.isInitialized = false;
    this.audioContext = null;
    this.speechSynthesis = null;
    this.audioEnabled = true;
    this.volume = 0.7;
    this.speechRate = 1.0;
    this.speechPitch = 1.0;
    this.preferredVoice = null;
    this.audioNodes = new Map();
    this.soundLibrary = new Map();
    this.currentSpeech = null;
  }

  /**
   * Initialize the audio feedback service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Web Audio API
      await this.initializeAudioContext();
      
      // Initialize Speech Synthesis API
      this.initializeSpeechSynthesis();
      
      // Load default sound library
      await this.loadDefaultSounds();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('AudioFeedbackService: Failed to initialize audio features', error);
      // Continue without audio features
      this.isInitialized = true;
    }
  }

  /**
   * Initialize Web Audio API context
   */
  async initializeAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      throw new Error('Web Audio API not supported');
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Handle audio context state
    if (this.audioContext.state === 'suspended') {
      // Audio context starts suspended in modern browsers
      // It will be resumed on first user interaction
      document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
      document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
    }
  }

  /**
   * Resume audio context (required for modern browsers)
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Initialize Speech Synthesis API
   */
  initializeSpeechSynthesis() {
    if (!window.speechSynthesis) {
      console.warn('Speech Synthesis API not supported');
      return;
    }

    this.speechSynthesis = window.speechSynthesis;
    
    // Load available voices
    this.loadVoices();
    
    // Listen for voice changes
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  /**
   * Load available voices for speech synthesis
   */
  loadVoices() {
    if (!this.speechSynthesis) return;

    const voices = this.speechSynthesis.getVoices();
    
    // Find a good default voice (prefer English, then system default)
    if (!this.preferredVoice && voices.length > 0) {
      this.preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.default
      ) || voices.find(voice => 
        voice.lang.startsWith('en')
      ) || voices[0];
    }
  }

  /**
   * Load default sound library
   */
  async loadDefaultSounds() {
    const defaultSounds = {
      // UI interaction sounds
      click: { frequency: 800, duration: 0.1, type: 'sine' },
      hover: { frequency: 600, duration: 0.05, type: 'sine' },
      focus: { frequency: 1000, duration: 0.08, type: 'sine' },
      error: { frequency: 300, duration: 0.3, type: 'sawtooth' },
      success: { frequency: 1200, duration: 0.2, type: 'sine' },
      
      // Data sonification sounds
      dataPoint: { frequency: 440, duration: 0.1, type: 'sine' },
      dataIncrease: { frequency: 880, duration: 0.15, type: 'sine' },
      dataDecrease: { frequency: 220, duration: 0.15, type: 'sine' },
      dataStable: { frequency: 440, duration: 0.1, type: 'triangle' },
      
      // Navigation sounds
      menuOpen: { frequency: 523, duration: 0.1, type: 'sine' },
      menuClose: { frequency: 392, duration: 0.1, type: 'sine' },
      pageChange: { frequency: 659, duration: 0.15, type: 'sine' },
    };

    for (const [name, config] of Object.entries(defaultSounds)) {
      this.soundLibrary.set(name, config);
    }
  }

  /**
   * Play an audio cue
   */
  async playAudioCue(cueType, options = {}) {
    if (!this.audioEnabled || !this.audioContext) {
      return;
    }

    try {
      await this.resumeAudioContext();
      
      const soundConfig = this.soundLibrary.get(cueType);
      if (!soundConfig) {
        console.warn(`AudioFeedbackService: Unknown audio cue type: ${cueType}`);
        return;
      }

      const mergedConfig = { ...soundConfig, ...options };
      await this.playTone(mergedConfig);
    } catch (error) {
      console.warn('AudioFeedbackService: Failed to play audio cue', error);
    }
  }

  /**
   * Play a tone with specified parameters
   */
  async playTone({ frequency, duration, type = 'sine', volume = this.volume }) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Configure oscillator
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Configure gain (volume)
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Play tone
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);

    return new Promise(resolve => {
      oscillator.onended = resolve;
    });
  }

  /**
   * Speak text using text-to-speech
   */
  speak(text, options = {}) {
    if (!this.speechSynthesis || !text) {
      return Promise.resolve();
    }

    // Cancel current speech if any
    this.stopSpeaking();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = options.rate || this.speechRate;
      utterance.pitch = options.pitch || this.speechPitch;
      utterance.volume = options.volume || this.volume;
      
      if (options.voice || this.preferredVoice) {
        utterance.voice = options.voice || this.preferredVoice;
      }

      // Set up event handlers
      utterance.onend = () => {
        this.currentSpeech = null;
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.currentSpeech = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Store current speech for potential cancellation
      this.currentSpeech = utterance;
      
      // Speak
      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (this.speechSynthesis && this.currentSpeech) {
      this.speechSynthesis.cancel();
      this.currentSpeech = null;
    }
  }

  /**
   * Sonify data points for audio visualization
   */
  async sonifyData(dataPoints, options = {}) {
    if (!this.audioEnabled || !this.audioContext || !dataPoints.length) {
      return;
    }

    const {
      duration = 2000, // Total duration in ms
      minFrequency = 200,
      maxFrequency = 1000,
      noteLength = 100,
      pause = 50
    } = options;

    try {
      await this.resumeAudioContext();

      // Calculate frequency mapping
      const values = dataPoints.map(point => point.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue || 1;

      // Play each data point as a tone
      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i];
        const normalizedValue = (point.value - minValue) / valueRange;
        const frequency = minFrequency + (normalizedValue * (maxFrequency - minFrequency));

        await this.playTone({
          frequency,
          duration: noteLength / 1000,
          type: 'sine',
          volume: this.volume * 0.5
        });

        // Pause between notes
        if (i < dataPoints.length - 1) {
          await this.delay(pause);
        }
      }
    } catch (error) {
      console.warn('AudioFeedbackService: Failed to sonify data', error);
    }
  }

  /**
   * Announce data point with speech and audio cue
   */
  async announceDataPoint(dataPoint, options = {}) {
    const { includeAudioCue = true, includeDescription = true } = options;

    // Play audio cue first
    if (includeAudioCue) {
      await this.playAudioCue('dataPoint');
    }

    // Construct speech text
    let speechText = `${dataPoint.value}`;
    
    if (dataPoint.unit) {
      speechText += ` ${dataPoint.unit}`;
    }
    
    if (dataPoint.timestamp) {
      const date = new Date(dataPoint.timestamp);
      speechText += ` at ${date.toLocaleTimeString()}`;
    }
    
    if (dataPoint.trend) {
      speechText += `. Trend: ${dataPoint.trend}`;
    }
    
    if (includeDescription && dataPoint.description) {
      speechText += `. ${dataPoint.description}`;
    }

    // Speak the announcement
    try {
      await this.speak(speechText);
    } catch (error) {
      console.warn('AudioFeedbackService: Failed to announce data point', error);
    }
  }

  /**
   * Announce data trend with sonification
   */
  async announceTrend(trendData, options = {}) {
    const { trendType, description, dataPoints } = trendData;
    
    // Play trend-specific audio cue
    let cueType = 'dataStable';
    if (trendType === 'increasing') cueType = 'dataIncrease';
    else if (trendType === 'decreasing') cueType = 'dataDecrease';
    
    await this.playAudioCue(cueType);
    
    // Speak trend description
    let speechText = `Data trend: ${trendType}`;
    if (description) {
      speechText += `. ${description}`;
    }
    
    try {
      await this.speak(speechText);
      
      // Optionally sonify the trend data
      if (dataPoints && options.includeSonification) {
        await this.delay(500); // Brief pause
        await this.sonifyData(dataPoints, { duration: 1500 });
      }
    } catch (error) {
      console.warn('AudioFeedbackService: Failed to announce trend', error);
    }
  }

  /**
   * Play UI interaction feedback
   */
  async playInteractionFeedback(interactionType, options = {}) {
    const feedbackMap = {
      click: 'click',
      hover: 'hover',
      focus: 'focus',
      error: 'error',
      success: 'success',
      menuOpen: 'menuOpen',
      menuClose: 'menuClose',
      pageChange: 'pageChange'
    };

    const cueType = feedbackMap[interactionType];
    if (cueType) {
      await this.playAudioCue(cueType, options);
    }
  }

  /**
   * Set audio preferences
   */
  setPreferences(preferences) {
    if (preferences.audioEnabled !== undefined) {
      this.audioEnabled = preferences.audioEnabled;
    }
    
    if (preferences.volume !== undefined) {
      this.volume = Math.max(0, Math.min(1, preferences.volume));
    }
    
    if (preferences.speechRate !== undefined) {
      this.speechRate = Math.max(0.1, Math.min(10, preferences.speechRate));
    }
    
    if (preferences.speechPitch !== undefined) {
      this.speechPitch = Math.max(0, Math.min(2, preferences.speechPitch));
    }
    
    if (preferences.preferredVoice !== undefined) {
      this.preferredVoice = preferences.preferredVoice;
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    if (!this.speechSynthesis) {
      return [];
    }
    
    return this.speechSynthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService,
      voiceURI: voice.voiceURI
    }));
  }

  /**
   * Test audio functionality
   */
  async testAudio() {
    const results = {
      audioContext: false,
      speechSynthesis: false,
      audioPlayback: false,
      speechPlayback: false
    };

    // Test audio context
    try {
      if (this.audioContext) {
        results.audioContext = true;
        
        // Test audio playback
        await this.playTone({ frequency: 440, duration: 0.1 });
        results.audioPlayback = true;
      }
    } catch (error) {
      console.warn('Audio context test failed:', error);
    }

    // Test speech synthesis
    try {
      if (this.speechSynthesis) {
        results.speechSynthesis = true;
        
        // Test speech playback (very brief)
        await this.speak('Test', { rate: 2, volume: 0.1 });
        results.speechPlayback = true;
      }
    } catch (error) {
      console.warn('Speech synthesis test failed:', error);
    }

    return results;
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if audio features are supported
   */
  isSupported() {
    return {
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      speechSynthesis: !!window.speechSynthesis,
      webAudio: !!this.audioContext,
      speech: !!this.speechSynthesis
    };
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy() {
    // Stop any current speech
    this.stopSpeaking();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clear references
    this.audioContext = null;
    this.speechSynthesis = null;
    this.currentSpeech = null;
    this.audioNodes.clear();
    this.soundLibrary.clear();
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const audioFeedbackService = new AudioFeedbackService();

export default audioFeedbackService;
export { AudioFeedbackService };