/**
 * Sonification
 *
 * Plays a series of health readings as sound, so a data trend can be heard
 * rather than seen.
 *
 * The previous implementation mapped every value onto one of three
 * pre-recorded WAV files, so "frequency" collapsed into three buckets: a
 * gentle upward drift and a spike sounded identical. This synthesises tones
 * instead, giving continuous pitch across the whole series.
 *
 * Three channels carry meaning at once:
 *   - pitch  -> the value, mapped logarithmically across the series range
 *   - stereo -> position in time, panning left to right as playback advances
 *   - timbre -> clinical severity, so an out-of-range reading is audibly
 *               different rather than merely higher or lower
 */

import { AudioContext } from "react-native-audio-api";

import type { DataPoint, DataRange } from "../types";

// ── Tuning ───────────────────────────────────────────────────────────────────

/**
 * Pitch range, in Hz.
 *
 * Roughly C4 to C6. Kept inside the region where pitch differences are easiest
 * to judge, and clear of the very low frequencies phone speakers cannot render.
 */
const MIN_FREQUENCY = 261.63;
const MAX_FREQUENCY = 1046.5;

/** How long each reading sounds for, and the gap between readings. */
const DEFAULT_NOTE_MS = 180;
const DEFAULT_GAP_MS = 40;

/** Fade applied to each note's edges to avoid clicks. */
const FADE_SECONDS = 0.012;

/** Peak gain per note. Leaves headroom so a long series does not fatigue. */
const NOTE_GAIN = 0.22;

/** Waveform per severity: a rougher wave reads as more urgent. */
const WAVEFORM_FOR_RANGE: Record<DataRange, OscillatorType> = {
  normal: "sine",
  warning: "triangle",
  danger: "sawtooth",
};

type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SonificationOptions {
  /** Duration of each note in milliseconds. */
  noteDurationMs?: number;
  /** Silence between notes in milliseconds. */
  gapMs?: number;
  /** Pan across the stereo field as playback advances. Defaults to true. */
  useStereoPanning?: boolean;
  onProgress?: (index: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// ── Engine state ─────────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null;
let activeToken = 0;
let playing = false;

/** Lazily creates the shared AudioContext, reused across playbacks. */
function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// ── Mapping ──────────────────────────────────────────────────────────────────

/**
 * Maps a value to a pitch, logarithmically across the series' own range.
 *
 * Pitch is perceived logarithmically, so a linear mapping makes differences at
 * the top of the range sound smaller than identical differences at the bottom.
 * Scaling against the series rather than a fixed scale means a flat series
 * still uses the full pitch range and stays audible.
 */
export function valueToFrequency(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) return MIN_FREQUENCY;

  const span = max - min;
  // A flat series has no meaningful position; sound it in the middle.
  const ratio = span === 0 ? 0.5 : (value - min) / span;
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    MIN_FREQUENCY * Math.pow(MAX_FREQUENCY / MIN_FREQUENCY, clamped)
  );
}

/** Returns the representative pitch for a severity, for preview and legends. */
export function getFrequencyForRange(range: DataRange): number {
  switch (range) {
    case "danger":
      return MAX_FREQUENCY;
    case "warning":
      return Math.sqrt(MIN_FREQUENCY * MAX_FREQUENCY);
    default:
      return MIN_FREQUENCY;
  }
}

// ── Playback ─────────────────────────────────────────────────────────────────

/**
 * Schedules one note: an oscillator through a gain envelope and a stereo pan.
 */
function scheduleNote(
  context: AudioContext,
  frequency: number,
  range: DataRange,
  startTime: number,
  durationSeconds: number,
  pan: number,
): void {
  const oscillator = context.createOscillator();
  oscillator.type = WAVEFORM_FOR_RANGE[range] ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  const gain = context.createGain();
  // Fade in and out so notes do not click at their boundaries.
  const fade = Math.min(FADE_SECONDS, durationSeconds / 3);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(NOTE_GAIN, startTime + fade);
  gain.gain.setValueAtTime(NOTE_GAIN, startTime + durationSeconds - fade);
  gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds);

  const panner = context.createStereoPanner();
  panner.pan.setValueAtTime(pan, startTime);

  oscillator.connect(gain);
  gain.connect(panner);
  panner.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds);
}

/**
 * Plays a series of readings as a sequence of tones.
 *
 * Resolves once the series has finished or has been stopped. Calling it again
 * cancels any playback already in progress.
 */
export async function playDataSeries(
  data: DataPoint[],
  options: SonificationOptions = {},
): Promise<void> {
  const {
    noteDurationMs = DEFAULT_NOTE_MS,
    gapMs = DEFAULT_GAP_MS,
    useStereoPanning = true,
    onProgress,
    onComplete,
    onError,
  } = options;

  stop();

  if (!data.length) {
    onComplete?.();
    return;
  }

  const token = ++activeToken;
  playing = true;

  try {
    const context = getContext();

    const values = data
      .map((point) => Number(point.value))
      .filter(Number.isFinite);
    if (!values.length) {
      playing = false;
      onComplete?.();
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    const noteSeconds = noteDurationMs / 1000;
    const stepSeconds = (noteDurationMs + gapMs) / 1000;
    // Small lead-in so the first note is not scheduled in the past.
    const startAt = context.currentTime + 0.05;

    data.forEach((point, index) => {
      const frequency = valueToFrequency(Number(point.value), min, max);
      // Sweep left to right so position in the series is audible on its own.
      const pan =
        useStereoPanning && data.length > 1
          ? (index / (data.length - 1)) * 2 - 1
          : 0;

      scheduleNote(
        context,
        frequency,
        point.range ?? "normal",
        startAt + index * stepSeconds,
        noteSeconds,
        pan,
      );
    });

    // Report progress on the JS side while the audio thread plays.
    if (onProgress) {
      for (let index = 0; index < data.length; index++) {
        if (token !== activeToken) return;
        onProgress(index, data.length);
        await delay(stepSeconds * 1000);
      }
    } else {
      await delay(data.length * stepSeconds * 1000);
    }

    if (token !== activeToken) return;

    playing = false;
    onComplete?.();
  } catch (error) {
    playing = false;
    const wrapped =
      error instanceof Error ? error : new Error("Sonification failed");
    console.error("Sonification failed:", wrapped);
    onError?.(wrapped);
  }
}

/** Stops playback immediately and silences anything already scheduled. */
export function stop(): void {
  activeToken++;
  playing = false;

  // Closing the context cancels every scheduled note. A fresh one is created
  // on the next play, which is cheap next to leaving notes queued.
  if (audioContext) {
    audioContext.close().catch(() => {
      // Already closed, or never opened; nothing to recover from.
    });
    audioContext = null;
  }
}

/** Reports whether a series is currently playing. */
export function isSonificationPlaying(): boolean {
  return playing;
}

/** Resolves after the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
