import { renderHook, act } from '@testing-library/react';
import { useAudioFeedback } from '../useAudioFeedback';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import audioFeedbackService from '../../services/AudioFeedbackService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock the AudioFeedbackService
jest.mock('../../services/AudioFeedbackService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(),
    setPreferences: jest.fn(),
    playAudioCue: jest.fn().mockResolvedValue(),
    speak: jest.fn().mockResolvedValue(),
    stopSpeaking: jest.fn(),
    sonifyData: jest.fn().mockResolvedValue(),
    announceDataPoint: jest.fn().mockResolvedValue(),
    announceTrend: jest.fn().mockResolvedValue(),
    playInteractionFeedback: jest.fn().mockResolvedValue(),
    playTone: jest.fn().mockResolvedValue(),
    getAvailableVoices: jest.fn().mockReturnValue([]),
    testAudio: jest.fn().mockResolvedValue({
      audioContext: true,
      speechSynthesis: true,
      audioPlayback: true,
      speechPlayback: true
    }),
    isSupported: jest.fn().mockReturnValue({
      audioContext: true,
      speechSynthesis: true,
      webAudio: true,
      speech: true
    }),
  },
}));

// Wrapper component for testing
const wrapper = ({ children }) => (
  <AccessibilityProvider>{children}</AccessibilityProvider>
);

describe('useAudioFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should initialize audio feedback service when sonification is enabled', () => {
    // Mock preferences to enable sonification
    const mockPreferences = JSON.stringify({
      audioSettings: {
        enableSonification: true,
        audioVolume: 0.7,
        speechRate: 1.0,
        preferredVoice: null
      }
    });
    localStorageMock.getItem.mockReturnValue(mockPreferences);

    renderHook(() => useAudioFeedback(), { wrapper });

    expect(audioFeedbackService.initialize).toHaveBeenCalled();
    expect(audioFeedbackService.setPreferences).toHaveBeenCalledWith({
      audioEnabled: true,
      volume: 0.7,
      speechRate: 1.0,
      preferredVoice: null
    });
  });

  test('should provide playAudioCue function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.playAudioCue('click', { volume: 0.5 });
    });

    expect(audioFeedbackService.playAudioCue).toHaveBeenCalledWith('click', { volume: 0.5 });
  });

  test('should provide speak function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.speak('Hello world', { rate: 1.5 });
    });

    expect(audioFeedbackService.speak).toHaveBeenCalledWith('Hello world', { rate: 1.5 });
  });

  test('should provide stopSpeaking function', () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    act(() => {
      result.current.stopSpeaking();
    });

    expect(audioFeedbackService.stopSpeaking).toHaveBeenCalled();
  });

  test('should provide sonifyData function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });
    const mockData = [{ value: 10 }, { value: 20 }];

    await act(async () => {
      await result.current.sonifyData(mockData, { duration: 1000 });
    });

    expect(audioFeedbackService.sonifyData).toHaveBeenCalledWith(mockData, { duration: 1000 });
  });

  test('should provide announceDataPoint function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });
    const mockDataPoint = { value: 120, unit: 'mmHg' };

    await act(async () => {
      await result.current.announceDataPoint(mockDataPoint, { includeAudioCue: true });
    });

    expect(audioFeedbackService.announceDataPoint).toHaveBeenCalledWith(mockDataPoint, { includeAudioCue: true });
  });

  test('should provide announceTrend function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });
    const mockTrend = { trendType: 'increasing', description: 'Going up' };

    await act(async () => {
      await result.current.announceTrend(mockTrend, { includeSonification: true });
    });

    expect(audioFeedbackService.announceTrend).toHaveBeenCalledWith(mockTrend, { includeSonification: true });
  });

  test('should provide playInteractionFeedback function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.playInteractionFeedback('click', { volume: 0.8 });
    });

    expect(audioFeedbackService.playInteractionFeedback).toHaveBeenCalledWith('click', { volume: 0.8 });
  });

  test('should provide playTone function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });
    const toneConfig = { frequency: 440, duration: 0.5 };

    await act(async () => {
      await result.current.playTone(toneConfig);
    });

    expect(audioFeedbackService.playTone).toHaveBeenCalledWith(toneConfig);
  });

  test('should provide getAvailableVoices function', () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    act(() => {
      result.current.getAvailableVoices();
    });

    expect(audioFeedbackService.getAvailableVoices).toHaveBeenCalled();
  });

  test('should provide testAudio function', async () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.testAudio();
    });

    expect(audioFeedbackService.testAudio).toHaveBeenCalled();
  });

  test('should provide isAudioSupported function', () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    act(() => {
      result.current.isAudioSupported();
    });

    expect(audioFeedbackService.isSupported).toHaveBeenCalled();
  });

  test('should return audio settings from preferences', () => {
    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    expect(typeof result.current.isAudioEnabled).toBe('boolean');
    expect(typeof result.current.audioVolume).toBe('number');
    expect(typeof result.current.speechRate).toBe('number');
  });

  test('should not call audio functions when sonification is disabled', async () => {
    // Mock preferences to disable sonification
    const mockPreferences = JSON.stringify({
      audioSettings: {
        enableSonification: false,
        audioVolume: 0.7,
        speechRate: 1.0,
        preferredVoice: null
      }
    });
    localStorageMock.getItem.mockReturnValue(mockPreferences);

    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.playAudioCue('click');
      await result.current.speak('test');
      await result.current.sonifyData([{ value: 10 }]);
      await result.current.announceDataPoint({ value: 120 });
      await result.current.announceTrend({ trendType: 'stable' });
      await result.current.playInteractionFeedback('hover');
      await result.current.playTone({ frequency: 440 });
    });

    expect(audioFeedbackService.playAudioCue).not.toHaveBeenCalled();
    expect(audioFeedbackService.speak).not.toHaveBeenCalled();
    expect(audioFeedbackService.sonifyData).not.toHaveBeenCalled();
    expect(audioFeedbackService.announceDataPoint).not.toHaveBeenCalled();
    expect(audioFeedbackService.announceTrend).not.toHaveBeenCalled();
    expect(audioFeedbackService.playInteractionFeedback).not.toHaveBeenCalled();
    expect(audioFeedbackService.playTone).not.toHaveBeenCalled();
  });

  test('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    audioFeedbackService.playAudioCue.mockRejectedValue(new Error('Audio error'));

    const { result } = renderHook(() => useAudioFeedback(), { wrapper });

    await act(async () => {
      await result.current.playAudioCue('click');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to play audio cue:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  test('should memoize callback functions', () => {
    const { result, rerender } = renderHook(() => useAudioFeedback(), { wrapper });

    const firstRenderCallbacks = {
      playAudioCue: result.current.playAudioCue,
      speak: result.current.speak,
      stopSpeaking: result.current.stopSpeaking,
      sonifyData: result.current.sonifyData,
      announceDataPoint: result.current.announceDataPoint,
      announceTrend: result.current.announceTrend,
      playInteractionFeedback: result.current.playInteractionFeedback,
      playTone: result.current.playTone,
      getAvailableVoices: result.current.getAvailableVoices,
      testAudio: result.current.testAudio,
      isAudioSupported: result.current.isAudioSupported,
    };

    rerender();

    // Callbacks should be the same reference (memoized)
    expect(result.current.playAudioCue).toBe(firstRenderCallbacks.playAudioCue);
    expect(result.current.speak).toBe(firstRenderCallbacks.speak);
    expect(result.current.stopSpeaking).toBe(firstRenderCallbacks.stopSpeaking);
    expect(result.current.sonifyData).toBe(firstRenderCallbacks.sonifyData);
    expect(result.current.announceDataPoint).toBe(firstRenderCallbacks.announceDataPoint);
    expect(result.current.announceTrend).toBe(firstRenderCallbacks.announceTrend);
    expect(result.current.playInteractionFeedback).toBe(firstRenderCallbacks.playInteractionFeedback);
    expect(result.current.playTone).toBe(firstRenderCallbacks.playTone);
    expect(result.current.getAvailableVoices).toBe(firstRenderCallbacks.getAvailableVoices);
    expect(result.current.testAudio).toBe(firstRenderCallbacks.testAudio);
    expect(result.current.isAudioSupported).toBe(firstRenderCallbacks.isAudioSupported);
  });
});