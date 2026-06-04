import { describe, it, expect } from 'vitest';
import fc from '../../server/lib/forecastEngine.cjs';

const { projectTuition, projectResidence, projectLifestyle, combineForecast, confidenceTier, canForecast } = fc;

describe('projectTuition', () => {
  it('zero remaining semesters → zero', () => {
    expect(projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 0 }).medianMinor).toBe(0);
  });
  it('no inflation, no waiver → avg × n', () => {
    const r = projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 4, inflationPct: 0, waiverPct: 0 });
    expect(r.medianMinor).toBe(20000000);
  });
  it('waiver reduces the projection proportionally', () => {
    const full = projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 4, inflationPct: 0, waiverPct: 0 });
    const half = projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 4, inflationPct: 0, waiverPct: 50 });
    expect(half.medianMinor).toBe(full.medianMinor / 2);
  });
  it('inflation raises the projection above the nominal', () => {
    const r = projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 4, inflationPct: 7.5, waiverPct: 0 });
    expect(r.medianMinor).toBeGreaterThan(20000000);
  });
  it('produces a symmetric band around the median', () => {
    const r = projectTuition({ avgSemesterNetMinor: 5000000, semestersRemaining: 4, inflationPct: 0, bandPct: 5 });
    expect(r.medianMinor - r.lowMinor).toBe(r.highMinor - r.medianMinor);
  });
});

describe('projectResidence', () => {
  it('rent × months with no growth', () => {
    const r = projectResidence({ monthlyRentMinor: 1500000, monthsRemaining: 12, growthPct: 0 });
    expect(r.medianMinor).toBe(18000000);
  });
  it('growth raises it above nominal', () => {
    const r = projectResidence({ monthlyRentMinor: 1500000, monthsRemaining: 24, growthPct: 7.5 });
    expect(r.medianMinor).toBeGreaterThan(36000000);
  });
});

describe('projectLifestyle — asymmetric band', () => {
  it('daily × 30.4 × months with no stdev → symmetric at median', () => {
    const r = projectLifestyle({ dailyAvgMinor: 20000, dailyStdevMinor: 0, monthsRemaining: 12, inflationPct: 0 });
    expect(r.medianMinor).toBe(Math.round(20000 * 30.4 * 12));
    expect(r.lowMinor).toBe(r.medianMinor);
    expect(r.highMinor).toBe(r.medianMinor);
  });
  it('upside gap is wider than downside (spend drifts up)', () => {
    const r = projectLifestyle({ dailyAvgMinor: 20000, dailyStdevMinor: 5000, monthsRemaining: 12, inflationPct: 0 });
    const lowGap = r.medianMinor - r.lowMinor;
    const highGap = r.highMinor - r.medianMinor;
    expect(highGap).toBeGreaterThan(lowGap);
  });
});

describe('combineForecast — variance-sum', () => {
  it('median is past + sum of sub-medians', () => {
    const a = { medianMinor: 1000, lowMinor: 900, highMinor: 1100 };
    const b = { medianMinor: 2000, lowMinor: 1800, highMinor: 2200 };
    const r = combineForecast([a, b], 500);
    expect(r.medianMinor).toBe(3500);
  });
  it('combined band is narrower than naive sum of bands (variance-sum)', () => {
    const a = { medianMinor: 1000, lowMinor: 900, highMinor: 1100 }; // gap 100
    const b = { medianMinor: 1000, lowMinor: 900, highMinor: 1100 }; // gap 100
    const r = combineForecast([a, b], 0);
    const naiveGap = 200; // 100 + 100
    const combinedGap = r.highMinor - r.medianMinor;
    expect(combinedGap).toBeLessThan(naiveGap);
    expect(combinedGap).toBe(Math.round(Math.sqrt(100 * 100 + 100 * 100))); // ~141
  });
  it('ignores null sub-models', () => {
    const r = combineForecast([null, { medianMinor: 1000, lowMinor: 900, highMinor: 1100 }], 0);
    expect(r.medianMinor).toBe(1000);
  });
});

describe('confidenceTier', () => {
  it('LOW for a fresh student', () => {
    expect(confidenceTier({ completedSemesters: 0, lifestyleDays: 0 })).toBe('LOW');
  });
  it('MEDIUM at 2 semesters', () => {
    expect(confidenceTier({ completedSemesters: 2, lifestyleDays: 0 })).toBe('MEDIUM');
  });
  it('HIGH at 4 semesters + 90 days + stable residence', () => {
    expect(confidenceTier({ completedSemesters: 4, lifestyleDays: 90, stableResidence: true })).toBe('HIGH');
  });
  it('caps at MEDIUM when >25% of data is backfilled', () => {
    expect(confidenceTier({ completedSemesters: 4, lifestyleDays: 90, stableResidence: true, backfillRatio: 0.4 })).toBe('MEDIUM');
  });
});

describe('canForecast', () => {
  it('false with no data', () => {
    expect(canForecast({ completedSemesters: 0, lifestyleDays: 0, hasResidence: false })).toBe(false);
  });
  it('true after one completed semester', () => {
    expect(canForecast({ completedSemesters: 1 })).toBe(true);
  });
  it('true with only a residence', () => {
    expect(canForecast({ hasResidence: true })).toBe(true);
  });
});
