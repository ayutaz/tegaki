import { describe, expect, it } from 'bun:test';

import {
  erf,
  erfinv,
  lognormalCDF,
  lognormalInverseCDF,
  lognormalVelocity,
  peakSpeedTime,
  remapTime,
  sampleLognormalPause,
  strokeParams,
} from './rhythm.ts';

// ── erf / erfinv ────────────────────────────────────────────────────────────

describe('erf', () => {
  it('is ≈0 at 0, odd-symmetric, saturating to ±1', () => {
    // A&S 7.1.26 bounds |error| by 1.5e-7 globally, so we only assert 6 places at 0.
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(erf(-0.5)).toBeCloseTo(-erf(0.5), 6);
    expect(erf(5)).toBeCloseTo(1, 6);
    expect(erf(-5)).toBeCloseTo(-1, 6);
  });

  it('matches known reference values within 1.5e-7', () => {
    // Reference: scipy.special.erf
    expect(erf(0.5)).toBeCloseTo(0.5204998778, 6);
    expect(erf(1)).toBeCloseTo(0.8427007929, 6);
    expect(erf(1.5)).toBeCloseTo(0.9661051465, 6);
  });
});

describe('erfinv', () => {
  it('returns 0 at 0 and saturates at boundaries', () => {
    expect(erfinv(0)).toBeCloseTo(0, 3);
    expect(erfinv(1)).toBe(Infinity);
    expect(erfinv(-1)).toBe(-Infinity);
  });

  it('is an approximate inverse of erf (Winitzki |error| ≈ 4e-3)', () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(erfinv(erf(x))).toBeCloseTo(x, 2);
      expect(erfinv(erf(-x))).toBeCloseTo(-x, 2);
    }
  });
});

// ── lognormalCDF / velocity / inverse ───────────────────────────────────────

describe('lognormalCDF', () => {
  it('is 0 for t ≤ t0 and saturates to 1 for large t', () => {
    expect(lognormalCDF(0, -1.6, 0.25)).toBe(0);
    expect(lognormalCDF(-1, -1.6, 0.25)).toBe(0);
    expect(lognormalCDF(10, -1.6, 0.25)).toBeGreaterThan(0.999);
  });

  it('is strictly monotone non-decreasing on a sweep of t', () => {
    const mu = -1.6;
    const sigma = 0.25;
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const v = lognormalCDF(t, mu, sigma);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('lognormalVelocity', () => {
  it('returns 0 at or before t0, positive afterwards, and peaks near exp(μ - σ²)', () => {
    const D = 1;
    const mu = -1.6;
    const sigma = 0.25;
    expect(lognormalVelocity(0, D, mu, sigma)).toBe(0);
    const tPeak = peakSpeedTime(mu, sigma);
    expect(tPeak).toBeCloseTo(Math.exp(mu - sigma * sigma), 10);
    // Velocity at peak is a local maximum.
    const vPeak = lognormalVelocity(tPeak, D, mu, sigma);
    expect(vPeak).toBeGreaterThan(lognormalVelocity(tPeak - 0.01, D, mu, sigma));
    expect(vPeak).toBeGreaterThan(lognormalVelocity(tPeak + 0.05, D, mu, sigma));
  });
});

describe('lognormalInverseCDF', () => {
  it('clamps s ≤ 0 to t0 and produces finite output for s < 1', () => {
    expect(lognormalInverseCDF(0, -1.6, 0.25)).toBe(0);
    expect(lognormalInverseCDF(-0.5, -1.6, 0.25)).toBe(0);
    expect(Number.isFinite(lognormalInverseCDF(0.999, -1.6, 0.25))).toBe(true);
  });

  it('round-trips through lognormalCDF within Winitzki tolerance', () => {
    const mu = -1.6;
    const sigma = 0.25;
    for (const s of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const t = lognormalInverseCDF(s, mu, sigma);
      expect(lognormalCDF(t, mu, sigma)).toBeCloseTo(s, 2);
    }
  });
});

// ── remapTime — the primary integration point ───────────────────────────────

describe('remapTime', () => {
  it('pins endpoints: remapTime(0) = 0, remapTime(1) = 1', () => {
    const mu = -1.6;
    const sigma = 0.25;
    expect(remapTime(0, sigma, mu)).toBe(0);
    expect(remapTime(1, sigma, mu)).toBe(1);
  });

  it('clamps outside [0,1]', () => {
    expect(remapTime(-0.5, 0.25, -1.6)).toBe(0);
    expect(remapTime(1.5, 0.25, -1.6)).toBe(1);
  });

  it('is monotone non-decreasing across a fine sweep', () => {
    const mu = -1.6;
    const sigma = 0.25;
    let prev = 0;
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const v = remapTime(u, sigma, mu);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('shapes a rhythm curve: values early in u bow toward the mid-range', () => {
    // For baseline (σ=0.25, μ=-1.6) the curve is front-loaded: at u=0.5
    // the pen has already covered more than half the arc.
    const v = remapTime(0.5, 0.25, -1.6);
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1);
  });
});

// ── strokeParams — endpoint modulation + clamps ─────────────────────────────

describe('strokeParams', () => {
  it('baseline (300 unit straight default) is close to σ=0.25, μ=-1.6', () => {
    const p = strokeParams(300, 0, 'default');
    expect(p.sigma).toBeCloseTo(0.25, 6);
    expect(p.mu).toBeCloseTo(-1.6, 6);
    expect(p.t0).toBe(0);
    expect(p.D).toBe(1);
  });

  it('tome shrinks σ and shifts μ down (hard stop)', () => {
    const base = strokeParams(300, 0, 'default');
    const tome = strokeParams(300, 0, 'tome');
    expect(tome.sigma).toBeLessThan(base.sigma);
    expect(tome.mu).toBeLessThan(base.mu);
  });

  it('harai widens σ and shifts μ up (slow terminal decay)', () => {
    const base = strokeParams(300, 0, 'default');
    const harai = strokeParams(300, 0, 'harai');
    expect(harai.sigma).toBeGreaterThan(base.sigma);
    expect(harai.mu).toBeGreaterThan(base.mu);
  });

  it('dot is the fastest, smallest-σ stroke', () => {
    const dot = strokeParams(300, 0, 'dot');
    const tome = strokeParams(300, 0, 'tome');
    expect(dot.sigma).toBeLessThan(tome.sigma);
    expect(dot.mu).toBeLessThan(tome.mu);
  });

  it('curvature widens σ for default endpoint', () => {
    const straight = strokeParams(300, 0, 'default');
    const curved = strokeParams(300, 1, 'default');
    expect(curved.sigma).toBeGreaterThan(straight.sigma);
  });

  it('clamps σ to the physiological band [0.10, 0.55]', () => {
    // Extreme curvature alone shouldn't push σ past the upper bound once the
    // harai multiplier is applied on top.
    const extreme = strokeParams(2000, 10, 'harai');
    expect(extreme.sigma).toBeLessThanOrEqual(0.55 + 1e-12);
    expect(extreme.sigma).toBeGreaterThanOrEqual(0.1 - 1e-12);
  });

  it('clamps μ to the physiological band [-2.8, -0.8]', () => {
    const tiny = strokeParams(1, 0, 'dot');
    const huge = strokeParams(10000, 0, 'harai');
    expect(tiny.mu).toBeGreaterThanOrEqual(-2.8 - 1e-12);
    expect(huge.mu).toBeLessThanOrEqual(-0.8 + 1e-12);
  });
});

// ── sampleLognormalPause ────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('sampleLognormalPause', () => {
  it('stays within [min, max] over many draws', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const p = sampleLognormalPause(rng, -1.61, 0.35, 0.08, 0.5);
      expect(p).toBeGreaterThanOrEqual(0.08);
      expect(p).toBeLessThanOrEqual(0.5);
    }
  });

  it('mean over a large sample is within a reasonable band around the median (~0.20 s)', () => {
    const rng = mulberry32(7);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) sum += sampleLognormalPause(rng);
    const mean = sum / n;
    // Lognormal(μ=-1.61, σ=0.35) pre-clamp mean ≈ exp(μ+σ²/2) ≈ 0.213 s.
    // Clamped to [0.08, 0.5] the mean stays near the same value.
    expect(mean).toBeGreaterThan(0.15);
    expect(mean).toBeLessThan(0.3);
  });

  it('is deterministic when fed a seeded PRNG', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 10; i++) {
      expect(sampleLognormalPause(a)).toBe(sampleLognormalPause(b));
    }
  });
});
