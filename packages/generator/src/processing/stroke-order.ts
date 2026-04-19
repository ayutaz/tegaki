// Stage 5 of the pipeline — see commands/generate.ts.
// Group polylines into connected components, decide draw order (top-to-bottom,
// left-to-right) and per-stroke direction, then assign each point a normalized
// time `t` ∈ [0, 1] for animation. Stroke widths are looked up from the
// inverse distance transform (or pre-supplied by the voronoi path).

import type { EndpointType, Point, Stroke, TimedPoint } from 'tegaki';
import { remapTime, strokeParams } from 'tegaki/core';
import { ORIENT_X_WEIGHT } from '../constants.ts';
import { getStrokeWidth } from './width.ts';

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/**
 * Orient a polyline so the "natural" starting point comes first.
 *
 * For near-closed loops (start ≈ end), rotates the chain to start from the
 * leftmost point — the natural pen entry for Latin handwriting.
 *
 * For open polylines, reverses if the end has a better (lower) orientation
 * score than the start, preferring left-to-right flow.
 */
function orientPolyline(points: Point[]): Point[] {
  if (points.length < 2) return points;

  const start = points[0]!;
  const end = points[points.length - 1]!;

  // Near-closed loop: rotate to start from the leftmost point
  if (dist(start, end) < 5) {
    let bestIdx = 0;
    let bestX = points[0]!.x;
    let bestY = points[0]!.y;
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      if (p.x < bestX || (p.x === bestX && p.y < bestY)) {
        bestX = p.x;
        bestY = p.y;
        bestIdx = i;
      }
    }
    if (bestIdx !== 0) {
      return [...points.slice(bestIdx), ...points.slice(1, bestIdx + 1)];
    }
    return points;
  }

  // Open polyline: prefer starting from the left (with top as tiebreaker)
  const startScore = start.y + start.x * ORIENT_X_WEIGHT;
  const endScore = end.y + end.x * ORIENT_X_WEIGHT;

  if (endScore < startScore) {
    return [...points].reverse();
  }
  return points;
}

/**
 * Process polylines into strokes, preserving the order from traceAndSimplify
 * which already implements proximity-based ordering (middle-left start,
 * closest-to-last-end sequencing).
 *
 * Each polyline is oriented for natural handwriting direction, then assigned
 * t parameter (animation progress) and stroke width values.
 */
/**
 * Rhythm-shaping options for `orderStrokes`.
 *
 * When `mode === 'lognormal'`, per-point `t` values are passed through
 * Plamondon's lognormal CDF (see packages/renderer/src/lib/rhythm.ts) so
 * the renderer, which replays points on a uniform time axis, produces the
 * asymmetric bell-shaped speed profile humans actually exhibit.
 * Endpoint types parallel `polylines` and come from the KanjiVG dataset
 * in Phase 3 — missing or undefined entries default to 'default'.
 */
export interface RhythmConfig {
  mode: 'lognormal';
  endpointTypes?: readonly EndpointType[];
}

/** Average turning per unit length — 0 for a straight line, higher for curves. */
function meanCurvature(points: Point[]): number {
  if (points.length < 3) return 0;
  let turn = 0;
  let len = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const ax = b.x - a.x;
    const ay = b.y - a.y;
    const bx = c.x - b.x;
    const by = c.y - b.y;
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) continue;
    const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    turn += Math.acos(cos);
    len += la;
  }
  const lastSeg = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  len += Math.hypot(lastSeg.x - prev.x, lastSeg.y - prev.y);
  return len > 0 ? turn / len : 0;
}

export function orderStrokes(
  polylines: Point[][],
  inverseDT: Float32Array | null,
  bitmapWidth: number,
  _connectionThreshold = 3,
  precomputedWidths?: number[][],
  rhythm?: RhythmConfig,
): Stroke[] {
  if (polylines.length === 0) return [];

  const strokes: Stroke[] = [];

  for (let order = 0; order < polylines.length; order++) {
    const polyline = polylines[order]!;
    const oriented = orientPolyline(polyline);
    const totalLen = pathLength(oriented);

    // Look up precomputed widths by matching the original polyline reference
    const origIdx = precomputedWidths ? polylines.indexOf(polyline) : -1;
    const pWidths = origIdx >= 0 ? precomputedWidths![origIdx] : null;

    // Per-stroke lognormal parameters (null when rhythm === undefined).
    const rhythmParams =
      rhythm?.mode === 'lognormal' ? strokeParams(totalLen, meanCurvature(oriented), rhythm.endpointTypes?.[order] ?? 'default') : null;

    // Assign t parameter and width
    let cumLen = 0;
    const points: TimedPoint[] = oriented.map((p, i) => {
      if (i > 0) {
        cumLen += dist(oriented[i - 1]!, p);
      }
      const u = totalLen > 0 ? cumLen / totalLen : 0;
      const t = rhythmParams ? remapTime(u, rhythmParams.sigma, rhythmParams.mu) : u;
      // Precomputed widths use original point order; check if oriented is reversed
      const isReversed = oriented !== polyline && oriented[0] !== polyline[0];
      const widthIdx = isReversed ? oriented.length - 1 - i : i;
      const width = pWidths ? (pWidths[widthIdx] ?? 1) : inverseDT ? getStrokeWidth(p.x, p.y, inverseDT, bitmapWidth) : 1;
      return { x: p.x, y: p.y, t, width };
    });

    strokes.push({ points, order, length: totalLen, animationDuration: 0, delay: 0 });
  }

  // Single-point strokes (dots) get their width from the distance transform which
  // represents the blob's inscribed radius, not the pen width. Replace with the
  // average width of other strokes so dots match the visual weight of the glyph.
  const multiPointStrokes = strokes.filter((s) => s.points.length > 1);
  if (multiPointStrokes.length > 0) {
    const avgWidth =
      multiPointStrokes.reduce((sum, s) => sum + s.points.reduce((ps, p) => ps + p.width, 0) / s.points.length, 0) /
      multiPointStrokes.length;
    for (const s of strokes) {
      if (s.points.length === 1) {
        s.points[0]!.width = Math.round(avgWidth * 100) / 100;
      }
    }
  }

  return strokes;
}
