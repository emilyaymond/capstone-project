/**
 * Registry invariants.
 *
 * Metric metadata used to live in three places that silently disagreed on eight
 * fields, including one that changed behaviour (weight aggregated as "latest"
 * on the detail screen and "avg" on Trends). These tests exist so a metric
 * cannot be half-registered or drift out of sync again.
 */

import {
  ALL_METRIC_TYPES,
  METRICS,
  METRIC_TYPE_TO_CATEGORY,
  NORMAL_RANGES,
  TREND_METRIC_TYPES,
  classifyRange,
  getCategoryForType,
  getMetric,
  getUnitForType,
  hasDefinedRange,
  normalRangeText,
} from '../metric-registry';
import { HealthMetricType } from '../../types/health-metric';

const VALID_CATEGORIES = [
  'vitals',
  'activity',
  'body',
  'nutrition',
  'sleep',
  'mindfulness',
];

describe('metric registry', () => {
  it('covers every metric type exactly once', () => {
    expect(ALL_METRIC_TYPES).toHaveLength(23);
    expect(new Set(ALL_METRIC_TYPES).size).toBe(ALL_METRIC_TYPES.length);
  });

  describe('every entry is complete', () => {
    it.each(ALL_METRIC_TYPES)('%s', (type) => {
      const metric = METRICS[type];

      expect(metric.label.length).toBeGreaterThan(0);
      expect(metric.spokenLabel.length).toBeGreaterThan(0);
      expect(metric.categoryLabel.length).toBeGreaterThan(0);
      expect(VALID_CATEGORIES).toContain(metric.category);
      expect(['avg', 'sum', 'latest']).toContain(metric.aggregation);
      expect(['scatter', 'line', 'bar']).toContain(metric.chart);
      expect(metric.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof metric.dailyIsTotal).toBe('boolean');
      expect(typeof metric.inTrends).toBe('boolean');
    });
  });

  it('gives cumulative metrics a per-day headline on long ranges', () => {
    // A metric whose daily value is a total needs to say what the number means
    // once the range covers many days, or "Today's Steps" labels a week.
    for (const type of ALL_METRIC_TYPES) {
      const metric = METRICS[type];
      if (metric.dailyIsTotal) {
        expect(metric.longRangeHeroLabel).toBeDefined();
        expect(metric.longRangeHeroMode).toBeDefined();
      }
    }
  });

  it('only sums metrics that are actually cumulative', () => {
    for (const type of ALL_METRIC_TYPES) {
      const metric = METRICS[type];
      if (metric.aggregation === 'sum') {
        expect(metric.dailyIsTotal).toBe(true);
      }
    }
  });

  describe('normal ranges', () => {
    it('derives NORMAL_RANGES from the registry entries', () => {
      for (const type of ALL_METRIC_TYPES) {
        expect(Boolean(NORMAL_RANGES[type])).toBe(hasDefinedRange(type));
      }
    });

    it('has min below max wherever a range is defined', () => {
      for (const [type, range] of Object.entries(NORMAL_RANGES)) {
        expect(range!.min).toBeLessThan(range!.max);
      }
    });

    it('renders range text only for metrics that define one', () => {
      expect(normalRangeText('heart_rate')).toBe('40–120 bpm');
      expect(normalRangeText('oxygen_saturation')).toBe('95–100%');
      expect(normalRangeText('steps')).toBeUndefined();
    });
  });

  describe('classifyRange', () => {
    it('treats a value inside the band as normal', () => {
      expect(classifyRange('heart_rate', 72)).toBe('normal');
    });

    it('flags just outside the band as a warning', () => {
      expect(classifyRange('heart_rate', 130)).toBe('warning');
    });

    it('flags more than 20% outside the band as danger', () => {
      expect(classifyRange('heart_rate', 160)).toBe('danger');
    });

    it('reports normal for metrics with no defined range', () => {
      expect(classifyRange('steps', 99999)).toBe('normal');
    });
  });

  describe('derived collections stay in step', () => {
    it('maps every type to the category on its entry', () => {
      for (const type of ALL_METRIC_TYPES) {
        expect(METRIC_TYPE_TO_CATEGORY[type]).toBe(METRICS[type].category);
        expect(getCategoryForType(type)).toBe(METRICS[type].category);
      }
    });

    it('lists exactly the metrics flagged for Trends', () => {
      const expected = ALL_METRIC_TYPES.filter((t) => METRICS[t].inTrends);
      expect(TREND_METRIC_TYPES).toEqual(expected);
      expect(TREND_METRIC_TYPES.length).toBeGreaterThan(0);
    });
  });

  it('falls back rather than throwing on an unknown type', () => {
    const unknown = 'not_a_metric' as HealthMetricType;
    expect(getMetric(unknown)).toBe(METRICS.heart_rate);
    expect(getUnitForType(unknown)).toBe('bpm');
  });
});
