// Phase 6 — evaluation metrics for the Sigma-Lognormal rhythm model.
//
// Provides the five quantitative indicators used in the handwriting-natural
// evaluation loop (see docs/tickets/phase-6-validation.md §6):
//
//   1. Reconstructed-velocity SNR (dB)
//   2. Peak-speed timing ratio (t_peak / t_total)
//   3. Velocity-profile skewness (third standardized moment)
//   4. Kolmogorov–Smirnov distance against a target pause distribution
//   5. MOS aggregation helper (mean + 95% confidence interval)
//
// None of this module depends on Node or Bun APIs — the functions take plain
// number arrays so they can run inside tests, in the browser preview UI, or
// from a CI metric collector. Floating-point paths are chosen to stay stable
// when running against generated glyphData `strokes[].points[].t` time series.

import { lognormalVelocity, peakSpeedTime, type StrokeParams } from './rhythm.ts';

// ── Signal-to-noise ratio ───────────────────────────────────────────────────

/**
 * Signal-to-noise ratio of a reconstructed signal against a reference, in dB.
 *
 *   SNR = 10 · log10( Σ|v_ref|² / Σ|v_ref − v_synth|² )
 *
 * Higher is better. Plamondon's Frontiers 2013 paper calls ≥ 25 dB a good
 * fit for young adults and ≥ 15 dB acceptable for stylised glyphs. Arrays
 * must be the same length; pass matched time samples.
 */
export function velocitySNR(reference: readonly number[], synthesised: readonly number[]): number {
  if (reference.length !== synthesised.length) {
    throw new Error(`velocitySNR: length mismatch (${reference.length} vs ${synthesised.length})`);
  }
  let sigPow = 0;
  let noisePow = 0;
  for (let i = 0; i < reference.length; i++) {
    const r = reference[i]!;
    const e = r - synthesised[i]!;
    sigPow += r * r;
    noisePow += e * e;
  }
  if (noisePow === 0) return Number.POSITIVE_INFINITY;
  if (sigPow === 0) return Number.NEGATIVE_INFINITY;
  return 10 * Math.log10(sigPow / noisePow);
}

// ── Peak-speed timing ratio ─────────────────────────────────────────────────

/**
 * Ratio of the peak-speed time to total stroke duration, `t_peak / t_total`.
 *
 * Under a healthy-adult Plamondon prior the ratio sits around 0.35 ± 0.05 for
 * straight strokes and 0.45–0.55 for curved ones. Accepts either an explicit
 * (t_peak, t_total) pair or a `StrokeParams` object — the latter uses the
 * closed-form t_peak = t0 + exp(μ − σ²) and treats `exp(μ + 3σ)` as the
 * effective duration (99% of arc-length mass).
 */
export function peakSpeedRatio(params: StrokeParams): number;
export function peakSpeedRatio(tPeak: number, tTotal: number): number;
export function peakSpeedRatio(a: number | StrokeParams, b?: number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (b <= 0) return Number.NaN;
    return a / b;
  }
  if (typeof a === 'object') {
    const p = a;
    const tPeak = peakSpeedTime(p.mu, p.sigma, p.t0);
    const tTotal = p.t0 + Math.exp(p.mu + 3 * p.sigma);
    return tPeak / tTotal;
  }
  throw new Error('peakSpeedRatio: invalid arguments');
}

// ── Velocity-profile skewness ───────────────────────────────────────────────

/**
 * Theoretical skewness of a lognormal distribution:
 *
 *   γ = (exp(σ²) + 2) · sqrt(exp(σ²) − 1)
 *
 * At σ = 0.25 this is ≈ 0.78; our default stroke profile should land within
 * ±0.15 of this when Phase 5 parameters are untouched.
 */
export function theoreticalLognormalSkewness(sigma: number): number {
  const e = Math.exp(sigma * sigma);
  return (e + 2) * Math.sqrt(e - 1);
}

/**
 * Empirical skewness of an evenly-weighted sample (third standardized moment).
 *
 * Requires at least two samples. Returns NaN on degenerate input (zero
 * variance). Expect the result to match `theoreticalLognormalSkewness(σ)`
 * within ~0.1 when the samples come from the corresponding lognormal.
 */
export function empiricalSkewness(samples: readonly number[]): number {
  const n = samples.length;
  if (n < 2) return Number.NaN;
  let sum = 0;
  for (const s of samples) sum += s;
  const mean = sum / n;
  let m2 = 0;
  let m3 = 0;
  for (const s of samples) {
    const d = s - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
  }
  const variance = m2 / n;
  if (variance === 0) return Number.NaN;
  const sd = Math.sqrt(variance);
  return m3 / n / (sd * sd * sd);
}

// ── Kolmogorov–Smirnov distance ─────────────────────────────────────────────

/**
 * Two-sample Kolmogorov–Smirnov distance: the maximum vertical gap between
 * two empirical CDFs. 0 = identical distributions, 1 = completely disjoint.
 *
 * Used here to compare a sampled pause distribution against a target set
 * (e.g. Kondate-derived priors of {median 0.18 s, IQR 0.11–0.28 s}).
 */
export function ksDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) return Number.NaN;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  let i = 0;
  let j = 0;
  let maxGap = 0;
  while (i < sa.length && j < sb.length) {
    const va = sa[i]!;
    const vb = sb[j]!;
    if (va <= vb) i++;
    if (vb <= va) j++;
    const fa = i / sa.length;
    const fb = j / sb.length;
    const gap = Math.abs(fa - fb);
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

// ── MOS aggregation ─────────────────────────────────────────────────────────

export interface MosSummary {
  /** Sample size (count of non-null ratings). */
  n: number;
  /** Arithmetic mean of the ratings. */
  mean: number;
  /** Sample standard deviation (n−1 denominator; 0 when n < 2). */
  stdDev: number;
  /** Inclusive 95% confidence interval `[mean − 1.96·SE, mean + 1.96·SE]`. */
  ci95: readonly [number, number];
  /** True when `mean` is at or above the target (default 4.0/5 from AC-3). */
  passes: boolean;
}

/**
 * Aggregate a set of 1–5 Mean Opinion Score ratings into mean / stdev / 95%
 * CI and return whether the mean clears the pass threshold (Phase 6 AC-3
 * requires ≥ 4.0 / 5.0 across 3–5 native evaluators).
 */
export function summariseMOS(ratings: readonly number[], threshold = 4): MosSummary {
  const clean = ratings.filter((r): r is number => Number.isFinite(r));
  const n = clean.length;
  if (n === 0) {
    return { n: 0, mean: Number.NaN, stdDev: 0, ci95: [Number.NaN, Number.NaN], passes: false };
  }
  const mean = clean.reduce((s, r) => s + r, 0) / n;
  if (n === 1) {
    return { n, mean, stdDev: 0, ci95: [mean, mean], passes: mean >= threshold };
  }
  let sqSum = 0;
  for (const r of clean) sqSum += (r - mean) ** 2;
  const stdDev = Math.sqrt(sqSum / (n - 1));
  const standardError = stdDev / Math.sqrt(n);
  const half = 1.96 * standardError;
  return { n, mean, stdDev, ci95: [mean - half, mean + half], passes: mean >= threshold };
}

// ── Helper: sample a Sigma-Lognormal velocity profile on a uniform grid ─────

/**
 * Sample the Plamondon velocity kernel `v(t)` on `steps` uniformly spaced
 * points across the 99%-mass window `[t0, t0 + exp(μ + 3σ)]`. Handy for
 * feeding `velocitySNR` or `empiricalSkewness` in tests.
 */
export function sampleLognormalProfile(params: StrokeParams, steps = 128): Float64Array {
  const out = new Float64Array(steps);
  const tEnd = params.t0 + Math.exp(params.mu + 3 * params.sigma);
  for (let i = 0; i < steps; i++) {
    const t = params.t0 + ((i + 1) / steps) * (tEnd - params.t0);
    out[i] = lognormalVelocity(t, params.D, params.mu, params.sigma, params.t0);
  }
  return out;
}
