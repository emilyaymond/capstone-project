/**
 * Time range invariants.
 *
 * This vocabulary was declared four times, getStartDate existed twice byte for
 * byte, and the bucket widths disagreed between Trends and the detail screen.
 * These tests pin the behaviour that unification settled on.
 */

import {
  TIME_RANGES,
  getBucketMs,
  getDaysInRange,
  getStartDate,
  isLongRange,
  rangeLabel,
  type TimeRangeKey,
} from '../time-range';

const ALL: TimeRangeKey[] = ['H', 'D', 'W', 'M', '6M', 'Y'];

describe('time range', () => {
  it('lists every key exactly once', () => {
    expect(TIME_RANGES.map((r) => r.key)).toEqual(ALL);
  });

  describe('getStartDate', () => {
    it('is always in the past', () => {
      const now = new Date('2026-08-27T14:30:00Z');
      for (const range of ALL) {
        expect(getStartDate(range, now).getTime()).toBeLessThanOrEqual(
          now.getTime(),
        );
      }
    });

    it('reaches further back as the range widens', () => {
      const now = new Date('2026-08-27T14:30:00Z');
      const starts = ALL.map((r) => getStartDate(r, now).getTime());
      for (let i = 0; i < starts.length - 1; i++) {
        expect(starts[i]).toBeGreaterThanOrEqual(starts[i + 1]);
      }
    });

    it('starts the day range at local midnight', () => {
      const now = new Date(2026, 7, 27, 14, 30, 0);
      const start = getStartDate('D', now);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getDate()).toBe(27);
    });
  });

  describe('getBucketMs', () => {
    it('gives scatter a finer width than line and bar', () => {
      // Scatter re-buckets its input for display, so it can use more samples;
      // line and bar draw one mark per bucket and would over-plot.
      for (const range of ['D', 'W', 'M'] as TimeRangeKey[]) {
        expect(getBucketMs(range, 'scatter')).toBeLessThan(
          getBucketMs(range, 'line'),
        );
      }
    });

    it('treats line and bar identically', () => {
      for (const range of ALL) {
        expect(getBucketMs(range, 'bar')).toBe(getBucketMs(range, 'line'));
      }
    });

    it('widens buckets as the range widens', () => {
      for (const kind of ['scatter', 'line'] as const) {
        const widths = ALL.map((r) => getBucketMs(r, kind));
        for (let i = 0; i < widths.length - 1; i++) {
          expect(widths[i]).toBeLessThanOrEqual(widths[i + 1]);
        }
      }
    });

    it('defaults to the coarse width', () => {
      expect(getBucketMs('W')).toBe(getBucketMs('W', 'line'));
    });

    it('keeps every range under a few hundred buckets', () => {
      // Guards against a width that would try to plot thousands of marks.
      const now = new Date('2026-08-27T14:30:00Z');
      for (const range of ALL) {
        const span = now.getTime() - getStartDate(range, now).getTime();
        const buckets = span / getBucketMs(range, 'line');
        expect(buckets).toBeLessThanOrEqual(400);
      }
    });
  });

  describe('getDaysInRange', () => {
    it('never returns zero, so per-day averages cannot divide by zero', () => {
      for (const range of ALL) {
        expect(getDaysInRange(range)).toBeGreaterThan(0);
      }
    });
  });

  describe('isLongRange', () => {
    it('splits at the single-day boundary', () => {
      expect(isLongRange('H')).toBe(false);
      expect(isLongRange('D')).toBe(false);
      expect(isLongRange('W')).toBe(true);
      expect(isLongRange('Y')).toBe(true);
    });
  });

  describe('rangeLabel', () => {
    it('offers both casings for every range', () => {
      for (const range of ALL) {
        expect(rangeLabel(range, 'sentence').length).toBeGreaterThan(0);
        expect(rangeLabel(range, 'title').length).toBeGreaterThan(0);
      }
    });

    it('defaults to the sentence casing', () => {
      expect(rangeLabel('W')).toBe('this week');
      expect(rangeLabel('W', 'title')).toBe('This Week');
    });
  });
});
