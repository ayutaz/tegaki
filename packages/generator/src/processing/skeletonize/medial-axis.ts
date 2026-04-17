import { degree } from './cleanup.ts';

/**
 * Distance-ordered homotopic thinning (medial axis extraction).
 *
 * Removes foreground pixels from boundary inward, ordered by distance
 * transform value (smallest first). Each pixel is only removed if it's
 * a "simple point" — its removal doesn't change the topology (doesn't
 * disconnect the skeleton or create holes).
 *
 * Because high-DT pixels (on the medial axis) are removed last, the
 * resulting skeleton lies on the true medial axis of the shape.
 */
export function medialAxisThin(bitmap: Uint8Array, dt: Float32Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(bitmap);

  // Collect all foreground pixels with their DT values
  const pixels: { idx: number; dt: number }[] = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i]) {
      pixels.push({ idx: i, dt: dt[i]! });
    }
  }

  // Sort by DT ascending — remove boundary pixels first, preserve medial axis last
  pixels.sort((a, b) => a.dt - b.dt);

  for (const { idx } of pixels) {
    if (!result[idx]) continue; // already removed
    const x = idx % width;
    const y = (idx - x) / width;

    // Don't remove endpoints (degree <= 1) — preserves skeleton branches
    const deg = degree(x, y, result, width, height);
    if (deg <= 1) continue;

    // Simple point test: pixel can be removed without changing topology
    // A pixel is simple if the number of 8-connected foreground components
    // in its 3x3 neighborhood is exactly 1 (equivalent to A(P) = 1,
    // the 0→1 transition count used in Zhang-Suen).
    if (isSimplePoint(x, y, result, width, height)) {
      result[idx] = 0;
    }
  }

  return result;
}

/**
 * Check if a pixel is a simple point (topology-preserving removal).
 * A foreground pixel is simple if removing it doesn't change the number
 * of connected components or create/destroy holes.
 *
 * Uses the crossing number: count 0→1 transitions in the ordered
 * 8-neighbor sequence. If exactly 1, the pixel is simple.
 */
function isSimplePoint(x: number, y: number, bitmap: Uint8Array, width: number, height: number): boolean {
  const get = (nx: number, ny: number): number => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return 0;
    return bitmap[ny * width + nx]!;
  };

  const p2 = get(x, y - 1);
  const p3 = get(x + 1, y - 1);
  const p4 = get(x + 1, y);
  const p5 = get(x + 1, y + 1);
  const p6 = get(x, y + 1);
  const p7 = get(x - 1, y + 1);
  const p8 = get(x - 1, y);
  const p9 = get(x - 1, y - 1);

  // Count 0→1 transitions in clockwise order
  const seq = [p2, p3, p4, p5, p6, p7, p8, p9];
  let transitions = 0;
  for (let i = 0; i < 8; i++) {
    if (seq[i] === 0 && seq[(i + 1) % 8] === 1) transitions++;
  }

  return transitions === 1;
}
