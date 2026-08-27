/**
 * Sonification mapping.
 *
 * The previous engine mapped every value onto one of three recorded WAV files,
 * so a gentle drift and a spike sounded identical. These tests pin the property
 * that replaced it: distinct values produce distinct pitches, ordered.
 */

import { AudioContext } from 'react-native-audio-api';

import {
  getFrequencyForRange,
  isSonificationPlaying,
  playDataSeries,
  stop,
  valueToFrequency,
} from '../sonification';
import type { DataPoint } from '../../types';

function series(values: number[]): DataPoint[] {
  return values.map((value, index) => ({
    value,
    timestamp: new Date(2026, 0, 1, index),
    range: 'normal' as const,
  }));
}

describe('sonification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stop();
  });

  describe('valueToFrequency', () => {
    it('maps distinct values to distinct pitches', () => {
      // The whole point of replacing the three-file approach.
      const pitches = [10, 20, 30, 40, 50].map((v) =>
        valueToFrequency(v, 10, 50),
      );
      expect(new Set(pitches).size).toBe(5);
    });

    it('rises monotonically with value', () => {
      const pitches = [0, 25, 50, 75, 100].map((v) =>
        valueToFrequency(v, 0, 100),
      );
      for (let i = 0; i < pitches.length - 1; i++) {
        expect(pitches[i]).toBeLessThan(pitches[i + 1]);
      }
    });

    it('stays inside the audible band at the extremes', () => {
      const low = valueToFrequency(0, 0, 100);
      const high = valueToFrequency(100, 0, 100);
      expect(low).toBeGreaterThan(200);
      expect(high).toBeLessThan(1200);
      expect(low).toBeLessThan(high);
    });

    it('clamps values outside the series range', () => {
      const below = valueToFrequency(-50, 0, 100);
      const above = valueToFrequency(500, 0, 100);
      expect(below).toBeCloseTo(valueToFrequency(0, 0, 100), 5);
      expect(above).toBeCloseTo(valueToFrequency(100, 0, 100), 5);
    });

    it('sounds a flat series in the middle rather than dividing by zero', () => {
      const pitch = valueToFrequency(70, 70, 70);
      expect(Number.isFinite(pitch)).toBe(true);
      expect(pitch).toBeGreaterThan(valueToFrequency(0, 0, 100));
    });

    it('is logarithmic, so equal value steps are equal pitch ratios', () => {
      // Pitch is perceived logarithmically; a linear mapping would make the
      // top of the range sound compressed.
      const a = valueToFrequency(0, 0, 100);
      const b = valueToFrequency(50, 0, 100);
      const c = valueToFrequency(100, 0, 100);
      expect(b / a).toBeCloseTo(c / b, 5);
    });

    it('returns a usable pitch for a non-finite value', () => {
      expect(Number.isFinite(valueToFrequency(NaN, 0, 100))).toBe(true);
    });
  });

  describe('getFrequencyForRange', () => {
    it('orders severities by pitch', () => {
      expect(getFrequencyForRange('normal')).toBeLessThan(
        getFrequencyForRange('warning'),
      );
      expect(getFrequencyForRange('warning')).toBeLessThan(
        getFrequencyForRange('danger'),
      );
    });
  });

  describe('playDataSeries', () => {
    it('schedules one oscillator per reading', async () => {
      const points = series([60, 70, 80]);
      await playDataSeries(points, { noteDurationMs: 1, gapMs: 0 });

      const context = (AudioContext as unknown as jest.Mock).mock.results[0]
        .value;
      expect(context.createOscillator).toHaveBeenCalledTimes(3);
      expect(context.createStereoPanner).toHaveBeenCalledTimes(3);
    });

    it('completes without scheduling anything for an empty series', async () => {
      const onComplete = jest.fn();
      await playDataSeries([], { onComplete });
      expect(onComplete).toHaveBeenCalled();
    });

    it('reports progress for each reading', async () => {
      const onProgress = jest.fn();
      await playDataSeries(series([1, 2, 3]), {
        noteDurationMs: 1,
        gapMs: 0,
        onProgress,
      });
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenLastCalledWith(2, 3);
    });

    it('is not playing once the series finishes', async () => {
      await playDataSeries(series([1, 2]), { noteDurationMs: 1, gapMs: 0 });
      expect(isSonificationPlaying()).toBe(false);
    });
  });

  describe('stop', () => {
    it('reports not playing afterwards', () => {
      stop();
      expect(isSonificationPlaying()).toBe(false);
    });

    it('is safe to call when nothing is playing', () => {
      expect(() => {
        stop();
        stop();
      }).not.toThrow();
    });
  });
});
