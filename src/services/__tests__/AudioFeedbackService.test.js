import { AudioFeedbackService } from '../AudioFeedbackService';

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  state: 'running',
  currentTime: 0,
  destination: {}
};

const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { setValueAtTime: jest.fn() },
  type: 'sine',
  onended: null
};

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  }
};

// Mock Speech Synthesis API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { name: 'Test Voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }
  ]),
  onvoiceschanged: null
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: null,
  onend: null,
  onerror: null
}));

// Mock DOM methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Setup global mocks
global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

describe('AudioFeedbackService', () => {
  let service;

  beforeEach(() => {
    service = new AudioFeedbackService();
    
    // Setup mock returns
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (service.isInitialized) {
      service.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize audio context and speech synthesis', async () => {
      await service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(service.audioContext).toBeTruthy();
      expect(service.speechSynthesis).toBeTruthy();
    });

    test('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize();

      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors gracefully', async () => {
      global.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('Audio not supported');
      });

      await service.initialize();

      expect(service.isInitialized).toBe(true); // Should still be initialized
    });
  });

  describe('audio context management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should resume audio context when suspended', async () => {
      mockAudioContext.state = 'suspended';
      
      await service.resumeAudioContext();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should not resume audio context when already running', async () => {
      mockAudioContext.state = 'running';
      
      await service.resumeAudioContext();
      
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });
  });

  describe('audio cues', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should play audio cue', async () => {
      await service.playAudioCue('click');

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    test('should handle unknown audio cue types', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.playAudioCue('unknownCue');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown audio cue type: unknownCue')
      );
      
      consoleSpy.mockRestore();
    });

    test('should not play audio when disabled', async () => {
      service.audioEnabled = false;
      
      await service.playAudioCue('click');
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('tone generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should play tone with specified parameters', async () => {
      const config = {
        frequency: 440,
        duration: 0.5,
        type: 'sine',
        volume: 0.8
      };

      await service.playTone(config);

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(mockOscillator.type).toBe('sine');
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('speech synthesis', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should speak text', async () => {
      const text = 'Hello world';
      
      // Mock the utterance to trigger onend immediately
      const mockUtterance = { onend: null, onerror: null };
      mockSpeechSynthesisUtterance.mockReturnValue(mockUtterance);
      
      const speakPromise = service.speak(text);
      
      // Simulate speech completion
      if (mockUtterance.onend) {
        mockUtterance.onend();
      }
      
      await speakPromise;
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(text);
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should stop current speech', () => {
      service.currentSpeech = { text: 'test' };
      
      service.stopSpeaking();
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(service.currentSpeech).toBeNull();
    });

    test('should handle speech errors', async () => {
      const text = 'Hello world';
      
      // Mock the utterance to trigger onerror
      const mockUtterance = { onend: null, onerror: null };
      mockSpeechSynthesisUtterance.mockReturnValue(mockUtterance);
      
      const speakPromise = service.speak(text);
      
      // Simulate speech error
      if (mockUtterance.onerror) {
        mockUtterance.onerror({ error: 'network' });
      }
      
      await expect(speakPromise).rejects.toThrow('Speech synthesis error: network');
    });

    test('should not speak when speech synthesis is unavailable', async () => {
      service.speechSynthesis = null;
      
      const result = await service.speak('test');
      
      expect(result).toBeUndefined();
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });
  });

  describe('data sonification', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should sonify data points', async () => {
      const dataPoints = [
        { value: 10 },
        { value: 20 },
        { value: 15 }
      ];

      // Mock playTone to resolve immediately
      service.playTone = jest.fn().mockResolvedValue();
      
      await service.sonifyData(dataPoints, { duration: 300, noteLength: 50, pause: 10 });

      expect(service.playTone).toHaveBeenCalledTimes(3);
    });

    test('should handle empty data points', async () => {
      service.playTone = jest.fn();
      
      await service.sonifyData([]);
      
      expect(service.playTone).not.toHaveBeenCalled();
    });

    test('should not sonify when audio is disabled', async () => {
      service.audioEnabled = false;
      service.playTone = jest.fn();
      
      await service.sonifyData([{ value: 10 }]);
      
      expect(service.playTone).not.toHaveBeenCalled();
    });
  });

  describe('data announcements', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should announce data point', async () => {
      const dataPoint = {
        value: 120,
        unit: 'mmHg',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        trend: 'stable',
        description: 'Normal reading'
      };

      service.playAudioCue = jest.fn().mockResolvedValue();
      service.speak = jest.fn().mockResolvedValue();

      await service.announceDataPoint(dataPoint);

      expect(service.playAudioCue).toHaveBeenCalledWith('dataPoint');
      expect(service.speak).toHaveBeenCalledWith(
        expect.stringContaining('120 mmHg')
      );
    });

    test('should announce trend', async () => {
      const trendData = {
        trendType: 'increasing',
        description: 'Values are going up',
        dataPoints: [{ value: 10 }, { value: 20 }]
      };

      service.playAudioCue = jest.fn().mockResolvedValue();
      service.speak = jest.fn().mockResolvedValue();
      service.sonifyData = jest.fn().mockResolvedValue();

      await service.announceTrend(trendData, { includeSonification: true });

      expect(service.playAudioCue).toHaveBeenCalledWith('dataIncrease');
      expect(service.speak).toHaveBeenCalledWith(
        expect.stringContaining('Data trend: increasing')
      );
      expect(service.sonifyData).toHaveBeenCalledWith(trendData.dataPoints, { duration: 1500 });
    });
  });

  describe('interaction feedback', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should play interaction feedback', async () => {
      service.playAudioCue = jest.fn().mockResolvedValue();

      await service.playInteractionFeedback('click');

      expect(service.playAudioCue).toHaveBeenCalledWith('click', {});
    });

    test('should handle unknown interaction types', async () => {
      service.playAudioCue = jest.fn().mockResolvedValue();

      await service.playInteractionFeedback('unknownInteraction');

      expect(service.playAudioCue).not.toHaveBeenCalled();
    });
  });

  describe('preferences', () => {
    test('should set audio preferences', () => {
      const preferences = {
        audioEnabled: false,
        volume: 0.5,
        speechRate: 1.5,
        speechPitch: 0.8,
        preferredVoice: 'test-voice'
      };

      service.setPreferences(preferences);

      expect(service.audioEnabled).toBe(false);
      expect(service.volume).toBe(0.5);
      expect(service.speechRate).toBe(1.5);
      expect(service.speechPitch).toBe(0.8);
      expect(service.preferredVoice).toBe('test-voice');
    });

    test('should clamp volume values', () => {
      service.setPreferences({ volume: 2.0 });
      expect(service.volume).toBe(1.0);

      service.setPreferences({ volume: -0.5 });
      expect(service.volume).toBe(0.0);
    });

    test('should clamp speech rate values', () => {
      service.setPreferences({ speechRate: 15 });
      expect(service.speechRate).toBe(10);

      service.setPreferences({ speechRate: 0.05 });
      expect(service.speechRate).toBe(0.1);
    });
  });

  describe('voice management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should get available voices', () => {
      const voices = service.getAvailableVoices();

      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        name: 'Test Voice',
        lang: 'en-US',
        default: true,
        localService: true,
        voiceURI: 'test'
      });
    });

    test('should return empty array when speech synthesis unavailable', () => {
      service.speechSynthesis = null;
      
      const voices = service.getAvailableVoices();
      
      expect(voices).toEqual([]);
    });
  });

  describe('audio testing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should test audio functionality', async () => {
      service.playTone = jest.fn().mockResolvedValue();
      service.speak = jest.fn().mockResolvedValue();

      const results = await service.testAudio();

      expect(results.audioContext).toBe(true);
      expect(results.speechSynthesis).toBe(true);
      expect(results.audioPlayback).toBe(true);
      expect(results.speechPlayback).toBe(true);
    });
  });

  describe('support detection', () => {
    test('should check audio support', () => {
      const support = service.isSupported();

      expect(support.audioContext).toBe(true);
      expect(support.speechSynthesis).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('should destroy service and clean up resources', async () => {
      await service.initialize();
      service.currentSpeech = { text: 'test' };

      service.destroy();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(service.audioContext).toBeNull();
      expect(service.speechSynthesis).toBeNull();
      expect(service.currentSpeech).toBeNull();
      expect(service.isInitialized).toBe(false);
    });
  });
});