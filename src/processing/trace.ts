import { RDP_TOLERANCE, SPUR_LENGTH_RATIO } from '../constants.ts';
import type { Point } from '../types.ts';

// 8-connected neighbor offsets
const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

function getNeighbors(x: number, y: number, skeleton: Uint8Array, width: number, height: number): Point[] {
  const neighbors: Point[] = [];
  for (let i = 0; i < 8; i++) {
    const nx = x + DX[i]!;
    const ny = y + DY[i]!;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height && skeleton[ny * width + nx]) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

function degree(x: number, y: number, skeleton: Uint8Array, width: number, height: number): number {
  return getNeighbors(x, y, skeleton, width, height).length;
}

function traceChain(startX: number, startY: number, skeleton: Uint8Array, visited: Uint8Array, width: number, height: number): Point[] {
  const chain: Point[] = [{ x: startX, y: startY }];
  visited[startY * width + startX] = 1;

  let cx = startX;
  let cy = startY;

  while (true) {
    const neighbors = getNeighbors(cx, cy, skeleton, width, height);
    const unvisited = neighbors.filter((n) => !visited[n.y * width + n.x]);

    if (unvisited.length === 0) {
      // No unvisited neighbors -- but if there's an already-visited junction nearby,
      // append it so this chain connects to the chain that passed through the junction.
      const visitedJunction = neighbors.find((n) => visited[n.y * width + n.x] && degree(n.x, n.y, skeleton, width, height) >= 3);
      if (visitedJunction) chain.push(visitedJunction);
      break;
    }

    // Prefer chain pixels (degree 2) over junctions
    const next = unvisited.find((n) => degree(n.x, n.y, skeleton, width, height) <= 2) ?? unvisited[0]!;

    visited[next.y * width + next.x] = 1;
    chain.push(next);
    cx = next.x;
    cy = next.y;

    // Stop at junctions (degree >= 3) or endpoints (degree 1)
    if (degree(cx, cy, skeleton, width, height) !== 2) break;
  }

  return chain;
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const ex = point.x - lineStart.x;
    const ey = point.y - lineStart.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  const ex = point.x - projX;
  const ey = point.y - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

export function rdpSimplify(points: Point[], tolerance = RDP_TOLERANCE): Point[] {
  if (points.length <= 2) return points;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), tolerance);
    const right = rdpSimplify(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Merge polylines whose endpoints are within `threshold` distance into longer chains.
 * This reconnects fragments split at junction points by the tracing algorithm.
 */
function mergePolylines(polylines: Point[][], threshold: number): Point[][] {
  if (polylines.length <= 1) return polylines;

  const used = new Uint8Array(polylines.length);
  const merged: Point[][] = [];

  for (let i = 0; i < polylines.length; i++) {
    if (used[i]) continue;
    used[i] = 1;

    let chain = [...polylines[i]!];
    let changed = true;

    while (changed) {
      changed = false;
      for (let j = 0; j < polylines.length; j++) {
        if (used[j]) continue;
        const other = polylines[j]!;

        const chainStart = chain[0]!;
        const chainEnd = chain[chain.length - 1]!;
        const otherStart = other[0]!;
        const otherEnd = other[other.length - 1]!;

        // Try all 4 orientations of joining
        if (dist(chainEnd, otherStart) < threshold) {
          chain = [...chain, ...other.slice(1)];
        } else if (dist(chainEnd, otherEnd) < threshold) {
          chain = [...chain, ...[...other].reverse().slice(1)];
        } else if (dist(chainStart, otherEnd) < threshold) {
          chain = [...other, ...chain.slice(1)];
        } else if (dist(chainStart, otherStart) < threshold) {
          chain = [...[...other].reverse(), ...chain.slice(1)];
        } else {
          continue;
        }

        used[j] = 1;
        changed = true;
      }
    }

    merged.push(chain);
  }

  return merged;
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

export function traceAndSimplify(
  skeleton: Uint8Array,
  width: number,
  height: number,
  rdpTolerance = RDP_TOLERANCE,
  spurMinLength?: number,
): Point[][] {
  const visited = new Uint8Array(width * height);
  const polylines: Point[][] = [];

  // First pass: start from endpoints (degree 1)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!skeleton[y * width + x] || visited[y * width + x]) continue;
      if (degree(x, y, skeleton, width, height) === 1) {
        const chain = traceChain(x, y, skeleton, visited, width, height);
        if (chain.length > 1) polylines.push(chain);
      }
    }
  }

  // Second pass: handle remaining unvisited pixels (loops, junctions)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!skeleton[y * width + x] || visited[y * width + x]) continue;
      const chain = traceChain(x, y, skeleton, visited, width, height);
      if (chain.length > 1) polylines.push(chain);
    }
  }

  // Merge chains whose endpoints are close (reconnects fragments split at junctions)
  const mergeThreshold = Math.max(width, height) * 0.08;
  const mergedPolylines = mergePolylines(polylines, mergeThreshold);

  // Compute spur length threshold: proportional to bitmap size, but capped so tiny glyphs aren't fully erased
  const effectiveSpurMin = spurMinLength ?? Math.min(Math.round(Math.max(width, height) * SPUR_LENGTH_RATIO), 10);

  // Prune short spurs, but never prune everything
  let pruned = mergedPolylines.filter((p) => pathLength(p) >= effectiveSpurMin);
  if (pruned.length === 0 && mergedPolylines.length > 0) {
    // Keep the longest polyline if all would be pruned
    pruned = [mergedPolylines.reduce((a, b) => (pathLength(a) >= pathLength(b) ? a : b))];
  }

  // Simplify with RDP
  return pruned.map((p) => rdpSimplify(p, rdpTolerance));
}
