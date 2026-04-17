// Post-thinning cleanup for the skeletonize stage. Three concerns live here
// because they all operate on a thinned skeleton plus the distance transform
// and share the same 8-neighborhood helpers:
//   - `cleanJunctionClusters`: collapse multi-pixel junction clusters
//   - `restoreErasedComponents`: re-seed components that thinning fully erased
//   - `degree`/`DX`/`DY`: shared neighborhood utilities (also used by medial-axis)

import { JUNCTION_CLEANUP_MAX_ITERATIONS } from '../../constants.ts';

/** 8-connected neighbor offsets, clockwise from N. */
export const DX = [0, 1, 1, 1, 0, -1, -1, -1];
export const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

/** Count of foreground 8-neighbors at (x, y). */
export function degree(x: number, y: number, skel: Uint8Array, w: number, h: number): number {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    const nx = x + DX[i]!;
    const ny = y + DY[i]!;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h && skel[ny * w + nx]) count++;
  }
  return count;
}

export type ThinFn = (bitmap: Uint8Array, width: number, height: number) => Uint8Array;

/**
 * Restore skeleton pixels for bitmap connected components that were fully erased
 * by thinning. For each erased component, sets the pixel with the highest distance
 * transform value (the medial center) as a skeleton pixel.
 */
export function restoreErasedComponents(bitmap: Uint8Array, skeleton: Uint8Array, dt: Float32Array, width: number, height: number): void {
  const labels = new Int32Array(width * height);
  let nextLabel = 1;

  // Flood-fill to label connected components in the bitmap
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!bitmap[idx] || labels[idx]) continue;

      const label = nextLabel++;
      const queue: number[] = [idx];
      labels[idx] = label;

      while (queue.length > 0) {
        const ci = queue.pop()!;
        const cx = ci % width;
        const cy = (ci - cx) / width;

        for (let d = 0; d < 8; d++) {
          const nx = cx + DX[d]!;
          const ny = cy + DY[d]!;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (bitmap[ni] && !labels[ni]) {
            labels[ni] = label;
            queue.push(ni);
          }
        }
      }
    }
  }

  // For each label, check if any skeleton pixel exists
  const hasSkeleton = new Uint8Array(nextLabel);
  const bestIdx = new Int32Array(nextLabel).fill(-1);
  const bestDt = new Float32Array(nextLabel);

  for (let i = 0; i < bitmap.length; i++) {
    const label = labels[i]!;
    if (!label) continue;
    if (skeleton[i]) hasSkeleton[label] = 1;
    if (dt[i]! > bestDt[label]!) {
      bestDt[label] = dt[i]!;
      bestIdx[label] = i;
    }
  }

  for (let label = 1; label < nextLabel; label++) {
    if (!hasSkeleton[label] && bestIdx[label]! >= 0) {
      skeleton[bestIdx[label]!] = 1;
    }
  }
}

/**
 * Find and collapse junction clusters, iterating until stable.
 *
 * Each pass: find connected groups of degree-3+ pixels, collapse each to
 * the highest-DT pixel, reconnect arms via Bresenham, then re-thin.
 * Repeat because thinning can reintroduce clusters from reconnection lines.
 */
export function cleanJunctionClusters(
  skeleton: Uint8Array,
  dt: Float32Array,
  width: number,
  height: number,
  thin: ThinFn,
  maxIterations = JUNCTION_CLEANUP_MAX_ITERATIONS,
): Uint8Array {
  let current = skeleton;

  for (let iter = 0; iter < maxIterations; iter++) {
    const result = collapseClusterPass(current, dt, width, height);
    if (!result) break; // no clusters found
    current = thin(result, width, height);
  }

  return current;
}

/**
 * Single pass: find multi-pixel junction clusters and collapse each to one pixel.
 * Returns null if no clusters were found.
 */
function collapseClusterPass(skeleton: Uint8Array, dt: Float32Array, width: number, height: number): Uint8Array | null {
  const result = new Uint8Array(skeleton);

  // Find all junction pixels
  const isJunction = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result[y * width + x] && degree(x, y, result, width, height) >= 3) {
        isJunction[y * width + x] = 1;
      }
    }
  }

  // Flood-fill to find connected clusters of junction pixels
  const visited = new Uint8Array(width * height);
  let foundCluster = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isJunction[y * width + x] || visited[y * width + x]) continue;

      // BFS to collect all junction pixels in this cluster
      const cluster: { x: number; y: number; idx: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y * width + x] = 1;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const idx = curr.y * width + curr.x;
        cluster.push({ x: curr.x, y: curr.y, idx });

        for (let i = 0; i < 8; i++) {
          const nx = curr.x + DX[i]!;
          const ny = curr.y + DY[i]!;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (isJunction[nIdx] && !visited[nIdx]) {
            visited[nIdx] = 1;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      if (cluster.length <= 1) continue; // Single junction pixel, nothing to clean
      foundCluster = true;

      // Find the cluster pixel with highest DT value (true medial axis center)
      let bestIdx = cluster[0]!.idx;
      let bestDt = dt[bestIdx]!;
      for (const p of cluster) {
        if (dt[p.idx]! > bestDt) {
          bestDt = dt[p.idx]!;
          bestIdx = p.idx;
        }
      }

      // Find arm pixels: non-junction skeleton pixels adjacent to the cluster
      const arms: { x: number; y: number }[] = [];
      const clusterSet = new Set(cluster.map((p) => p.idx));

      for (const p of cluster) {
        for (let i = 0; i < 8; i++) {
          const nx = p.x + DX[i]!;
          const ny = p.y + DY[i]!;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (result[nIdx] && !clusterSet.has(nIdx)) {
            arms.push({ x: nx, y: ny });
          }
        }
      }

      // Remove all cluster pixels
      for (const p of cluster) {
        result[p.idx] = 0;
      }

      // Re-add the best pixel
      result[bestIdx] = 1;
      const bestX = bestIdx % width;
      const bestY = (bestIdx - bestX) / width;

      // Reconnect arms to the best pixel by drawing 1px-wide lines
      for (const arm of arms) {
        bresenham(result, bestX, bestY, arm.x, arm.y, width);
      }
    }
  }

  return foundCluster ? result : null;
}

/**
 * Draw a 1-pixel line between two points using Bresenham's algorithm.
 */
function bresenham(bitmap: Uint8Array, x0: number, y0: number, x1: number, y1: number, width: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (true) {
    bitmap[cy * width + cx] = 1;
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}
