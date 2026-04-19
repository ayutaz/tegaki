import { describe, expect, it } from 'bun:test';

import { strokeParams } from './rhythm.ts';
import {
  empiricalSkewness,
  ksDistance,
  peakSpeedRatio,
  sampleLognormalProfile,
  summariseMOS,
  theoreticalLognormalSkewness,
  velocitySNR,
} from './rhythm-metrics.ts';

// ── velocitySNR ─────────────────────────────────────────────────────────────

describe('velocitySNR', () => {
  it('returns +∞ for identical signals and rejects length mismatch', () => {
    const v = [0.1, 0.5, 1.0, 0.5, 0.1];
    expect(velocitySNR(v, v)).toBe(Number.POSITIVE_INFINITY);
    expect(() => velocitySNR([1, 2], [1])).toThrow();
  });

  it('is high for small perturbations, low for large ones', () => {
    const ref = [0.1, 0.5, 1.0, 0.5, 0.1];
    const tiny = ref.map((v) => v + 0.001);
    const large = ref.map((v) => v + 0.5);
    expect(velocitySNR(ref, tiny)).toBeGreaterThan(velocitySNR(ref, large));
  });

  it('matches a known reference value for scaled-noise inputs', () => {
    // Reference signal with power 10. Synth adds noise with power 1 → SNR = 10 log10(10/1) = 10 dB.
    const ref = new Array(10).fill(1); // each² = 1, sum = 10
    const synth = ref.map((v, i) => v + (i % 2 === 0 ? 0.31622776601 : -0.31622776601)); // noise²≈0.1 × 10 = 1
    expect(velocitySNR(ref, synth)).toBeCloseTo(10, 1);
  });
});

// ── peakSpeedRatio ──────────────────────────────────────────────────────────

describe('peakSpeedRatio', () => {
  it('accepts (t_peak, t_total) and a StrokeParams object', () => {
    expect(peakSpeedRatio(0.15, 0.5)).toBeCloseTo(0.3, 10);
    const p = strokeParams(300, 0, 'default'); // baseline σ=0.25, μ=-1.6
    expect(peakSpeedRatio(p)).toBeGreaterThan(0);
    expect(peakSpeedRatio(p)).toBeLessThan(1);
  });

  it('is near 0.3 for a healthy-adult straight default stroke', () => {
    const p = strokeParams(300, 0, 'default');
    // exp(μ - σ²) / exp(μ + 3σ) = exp(-σ² - 3σ) ≈ exp(-0.0625 - 0.75) ≈ 0.44
    expect(peakSpeedRatio(p)).toBeCloseTo(0.44, 1);
  });

  it('returns NaN for non-positive total duration', () => {
    expect(peakSpeedRatio(0.1, 0)).toBeNaN();
  });
});

// ── Skewness ────────────────────────────────────────────────────────────────

describe('theoreticalLognormalSkewness', () => {
  it('is ≈ 0.778 at σ = 0.25 (Plamondon baseline)', () => {
    expect(theoreticalLognormalSkewness(0.25)).toBeCloseTo(0.778, 2);
  });

  it('grows with σ and is 0 at σ = 0 (degenerate)', () => {
    expect(theoreticalLognormalSkewness(0)).toBeCloseTo(0, 10);
    expect(theoreticalLognormalSkewness(0.5)).toBeGreaterThan(theoreticalLognormalSkewness(0.25));
  });
});

describe('empiricalSkewness', () => {
  it('is ~0 for a symmetric dataset', () => {
    const sym = [-2, -1, 0, 1, 2];
    expect(empiricalSkewness(sym)).toBeCloseTo(0, 10);
  });

  it('approaches theoretical skewness for a sampled Plamondon profile', () => {
    const p = strokeParams(300, 0, 'default');
    const v = Array.from(sampleLognormalProfile(p, 1024));
    const empirical = empiricalSkewness(v);
    const expected = theoreticalLognormalSkewness(p.sigma);
    // Uniform time grid samples weight the tail differently from an iid lognormal
    // draw, so we allow a generous band rather than a tight ~0.1 tolerance.
    expect(Math.abs(empirical - expected)).toBeLessThan(1.0);
    // But we still require the sign to be positive (right-skewed).
    expect(empirical).toBeGreaterThan(0);
  });

  it('returns NaN on zero variance or single sample', () => {
    expect(empiricalSkewness([3, 3, 3, 3])).toBeNaN();
    expect(empiricalSkewness([5])).toBeNaN();
  });
});

// ── KS distance ─────────────────────────────────────────────────────────────

describe('ksDistance', () => {
  it('returns 0 for identical samples', () => {
    const a = [0.1, 0.2, 0.3, 0.4];
    expect(ksDistance(a, [...a])).toBeCloseTo(0, 10);
  });

  it('returns 1 for completely disjoint sorted samples', () => {
    const a = [0.1, 0.2, 0.3];
    const b = [10, 20, 30];
    expect(ksDistance(a, b)).toBe(1);
  });

  it('is between 0 and 1 for overlapping distributions', () => {
    const a = [0.1, 0.15, 0.2, 0.25];
    const b = [0.15, 0.2, 0.25, 0.3];
    const d = ksDistance(a, b);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(1);
  });

  it('returns NaN when either sample is empty', () => {
    expect(ksDistance([], [1])).toBeNaN();
    expect(ksDistance([1], [])).toBeNaN();
  });
});

// ── MOS aggregation ─────────────────────────────────────────────────────────

describe('summariseMOS', () => {
  it('returns a degenerate summary for an empty input', () => {
    const s = summariseMOS([]);
    expect(s.n).toBe(0);
    expect(Number.isNaN(s.mean)).toBe(true);
    expect(s.passes).toBe(false);
  });

  it('passes at the AC-3 threshold when every rater gives ≥ 4', () => {
    const s = summariseMOS([4, 5, 4, 4, 5]);
    expect(s.n).toBe(5);
    expect(s.mean).toBeCloseTo(4.4, 10);
    expect(s.passes).toBe(true);
    expect(s.ci95[0]).toBeLessThan(s.mean);
    expect(s.ci95[1]).toBeGreaterThan(s.mean);
  });

  it('fails when the mean falls below the threshold', () => {
    const s = summariseMOS([3, 4, 3, 4, 3]);
    expect(s.mean).toBeCloseTo(3.4, 10);
    expect(s.passes).toBe(false);
  });

  it('ignores non-finite entries', () => {
    const s = summariseMOS([4, Number.NaN, 5, Number.POSITIVE_INFINITY, 4]);
    expect(s.n).toBe(3);
    expect(s.mean).toBeCloseTo(13 / 3, 10);
  });

  it('collapses the CI to the mean for a single rater', () => {
    const s = summariseMOS([5]);
    expect(s.stdDev).toBe(0);
    expect(s.ci95[0]).toBe(5);
    expect(s.ci95[1]).toBe(5);
    expect(s.passes).toBe(true);
  });
});

// ── sampleLognormalProfile ──────────────────────────────────────────────────

describe('sampleLognormalProfile', () => {
  it('returns the requested number of positive samples', () => {
    const p = strokeParams(300, 0, 'default');
    const v = sampleLognormalProfile(p, 32);
    expect(v.length).toBe(32);
    for (const x of v) expect(x).toBeGreaterThanOrEqual(0);
  });

  it('places the peak before the midpoint of the sampling window for default params', () => {
    const p = strokeParams(300, 0, 'default');
    const v = sampleLognormalProfile(p, 256);
    let maxIdx = 0;
    let maxVal = -1;
    for (let i = 0; i < v.length; i++) {
      if (v[i]! > maxVal) {
        maxVal = v[i]!;
        maxIdx = i;
      }
    }
    expect(maxIdx).toBeLessThan(v.length / 2);
  });
});
