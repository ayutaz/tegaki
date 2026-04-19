// Phase 5 — Sigma-Lognormal rhythm synthesis.
//
// Clean-room TypeScript implementation of Plamondon's Kinematic Theory of
// rapid human movements (Biol. Cybern. 1995; Frontiers in Psychology 2013).
// Used to replace the linear t = cumLen / totalLen mapping in stroke-order
// with a non-uniform mapping that produces the asymmetric bell-shaped speed
// profile humans actually exhibit when handwriting.
//
// No GPL code is consulted or adapted; only the published equations are
// re-implemented from the primary literature. See docs/technical-validation.md
// §2 for the mathematical derivation and source citations.
//
// Core equations used here:
//   Λ(t; t0, μ, σ) = 1/(σ√(2π)(t−t0)) · exp(−[ln(t−t0)−μ]² / (2σ²))   velocity kernel
//   Φ(t; t0, μ, σ) = ½[1 + erf((ln(t−t0) − μ) / (σ√2))]              cumulative arc length
//   t(s)           = t0 + exp(μ + σ√2 · erfinv(2s − 1))              inverse CDF

export type EndpointType = 'tome' | 'hane' | 'harai' | 'dot' | 'default';

export interface StrokeParams {
  /** Log-time scale (mean of ln(stroke duration)). */
  mu: number;
  /** Log-response-time (shape/asymmetry; larger = more right-skewed = slower decay). */
  sigma: number;
  /** Central-command time, relative to stroke onset. 0 in local stroke coordinates. */
  t0: number;
  /** Input command amplitude; normalized to 1 for the per-stroke remap use case. */
  D: number;
}

// ── erf / erfinv ────────────────────────────────────────────────────────────

/** erf(x) via Abramowitz & Stegun 7.1.26. |error| < 1.5e-7 across the real line. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Inverse erf via Winitzki 2008 closed-form approximation. |error| ≈ 4e-3 on (−1, 1). */
export function erfinv(y: number): number {
  if (y <= -1) return -Infinity;
  if (y >= 1) return Infinity;
  const a = 0.147;
  const ln1y2 = Math.log(1 - y * y);
  const term = 2 / (Math.PI * a) + ln1y2 / 2;
  const inner = term * term - ln1y2 / a;
  return Math.sign(y) * Math.sqrt(Math.sqrt(inner) - term);
}

// ── Lognormal distribution primitives ───────────────────────────────────────

/** Lognormal CDF. Returns the fraction of arc-length completed by time `t`. */
export function lognormalCDF(t: number, mu: number, sigma: number, t0 = 0): number {
  const dt = t - t0;
  if (dt <= 0) return 0;
  return 0.5 * (1 + erf((Math.log(dt) - mu) / (sigma * Math.SQRT2)));
}

/** Lognormal velocity magnitude at time `t`. Returns 0 for t ≤ t0. */
export function lognormalVelocity(t: number, D: number, mu: number, sigma: number, t0 = 0): number {
  const dt = t - t0;
  if (dt <= 0) return 0;
  const z = (Math.log(dt) - mu) / sigma;
  return (D / (sigma * Math.sqrt(2 * Math.PI) * dt)) * Math.exp(-0.5 * z * z);
}

/** Inverse CDF: the time at which `s ∈ [0, 1]` of the arc length has been traced. */
export function lognormalInverseCDF(s: number, mu: number, sigma: number, t0 = 0): number {
  if (s <= 0) return t0;
  if (s >= 1) return t0 + Math.exp(mu + 6 * sigma);
  return t0 + Math.exp(mu + sigma * Math.SQRT2 * erfinv(2 * s - 1));
}

/** Time of peak speed — mode of the lognormal: t0 + exp(μ − σ²). */
export function peakSpeedTime(mu: number, sigma: number, t0 = 0): number {
  return t0 + Math.exp(mu - sigma * sigma);
}

// ── High-level remap used by stroke-order ───────────────────────────────────

/**
 * Remap a linear-arc-length progress value `u ∈ [0,1]` into a natural-rhythm
 * progress value, also in [0,1]. At the call site this converts
 * `t = cumLen / totalLen` (uniform along the polyline) into "the fraction of
 * the glyph drawn at this fraction of the stroke's duration", which the
 * renderer then replays on a uniform time axis to produce an asymmetric
 * bell-shaped speed profile.
 *
 * Identities:
 *   remapTime(0, …) === 0
 *   remapTime(1, …) === 1
 *   remapTime is strictly monotone non-decreasing in u
 */
export function remapTime(u: number, sigma: number, mu: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  // Treat u as a fraction of the stroke's effective duration, measured from
  // stroke onset (t0 = 0). We normalize by exp(μ + 3σ), which covers ~99.7%
  // of the lognormal mass — so u=1 maps to t_max and arc-length fraction ≈ 1.
  const tMax = Math.exp(mu + 3 * sigma);
  return lognormalCDF(u * tMax, mu, sigma, 0);
}

// ── Endpoint-aware parameter chooser ────────────────────────────────────────

const PARAM_MOD: Record<EndpointType, { s: number; m: number }> = {
  default: { s: 1.0, m: 0.0 },
  // tome (止め, hard stop): narrow peak, sharp deceleration at the end
  tome: { s: 0.85, m: -0.1 },
  // hane (跳ね, flick): longer acceleration, rapid terminal flick
  hane: { s: 1.1, m: 0.1 },
  // harai (払い, sweep): heavy right-skew, slow 30% terminal decay
  harai: { s: 1.25, m: 0.2 },
  // dot (点): short, near-symmetric, small amplitude
  dot: { s: 0.7, m: -0.3 },
};

/** Physiological bounds for σ (log response time). Clamped after modulation. */
const SIGMA_MIN = 0.1;
const SIGMA_MAX = 0.55;
/** Physiological bounds for μ (log time scale). Clamped after modulation. */
const MU_MIN = -2.8;
const MU_MAX = -0.8;

/**
 * Derive Plamondon (σ, μ, t0, D) for a stroke from its geometry.
 *
 * Defaults calibrated against the healthy-adult means reported in
 * Frontiers 2013 (σ ≈ 0.25, μ ≈ −1.6 → stroke duration ≈ 0.43 s at σ=0.25),
 * then modulated by endpoint type. Curvature widens σ slightly because curved
 * strokes are slower and more asymmetric than straight ones. Long strokes
 * shift μ up linearly in ln(length / 300) around a nominal 300-font-unit base.
 *
 * @param length Arc length of the stroke in font units.
 * @param curvature Mean turn angle per unit length (0 = straight line).
 * @param endpointType Phase 2 classification derived from `kvg:type`.
 */
export function strokeParams(length: number, curvature: number, endpointType: EndpointType = 'default'): StrokeParams {
  const SIGMA_BASE = 0.25;
  const MU_BASE = -1.6;

  const curvatureGain = Math.min(1, Math.max(0, curvature) * 4);
  let sigma = SIGMA_BASE + 0.08 * curvatureGain;
  let mu = MU_BASE + Math.log(Math.max(length, 10) / 300) * 0.3;

  const mod = PARAM_MOD[endpointType];
  sigma = Math.max(SIGMA_MIN, Math.min(SIGMA_MAX, sigma * mod.s));
  mu = Math.max(MU_MIN, Math.min(MU_MAX, mu + mod.m));

  return { sigma, mu, t0: 0, D: 1 };
}

// ── Inter-stroke pause sampler ──────────────────────────────────────────────

/**
 * Sample a pause duration (seconds) between strokes from a clamped lognormal.
 * Defaults match japanese-support.md §5-1: median ≈ 0.20 s, clamped to
 * [80 ms, 500 ms], drawn with Box-Muller.
 *
 * Pass a seeded PRNG as `rng` for deterministic test output.
 */
export function sampleLognormalPause(
  rng: () => number = Math.random,
  muPause = -1.61,
  sigmaPause = 0.35,
  minPause = 0.08,
  maxPause = 0.5,
): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  const zStd = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(minPause, Math.min(maxPause, Math.exp(muPause + sigmaPause * zStd)));
}
