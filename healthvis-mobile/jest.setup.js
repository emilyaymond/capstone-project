// Add custom jest matchers from jest-native
// Note: @testing-library/jest-native is deprecated, using built-in matchers instead

// Mock Expo's import.meta and winter runtime
global.__ExpoImportMetaRegistry = {
  get: jest.fn(),
  set: jest.fn(),
};

global.structuredClone = global.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj)));

// Mock expo modules
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// react-native-audio-api is a native module, so tests get a graph of stubs
// that record the calls without producing sound.
jest.mock('react-native-audio-api', () => {
  const audioParam = () => ({
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    setValueCurveAtTime: jest.fn(),
  });

  return {
    AudioManager: {
      setAudioSessionOptions: jest.fn(),
      setAudioSessionActivity: jest.fn().mockResolvedValue(true),
    },
    AudioContext: jest.fn().mockImplementation(() => ({
      currentTime: 0,
      sampleRate: 44100,
      destination: { connect: jest.fn() },
      createOscillator: jest.fn(() => ({
        type: 'sine',
        frequency: audioParam(),
        detune: audioParam(),
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      })),
      createGain: jest.fn(() => ({
        gain: audioParam(),
        connect: jest.fn(),
      })),
      createStereoPanner: jest.fn(() => ({
        pan: audioParam(),
        connect: jest.fn(),
      })),
      close: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(true),
    })),
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));
