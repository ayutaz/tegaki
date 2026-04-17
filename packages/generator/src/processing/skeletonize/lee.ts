// Lee's thinning algorithm + the topology-preserving LUT it shares with the
// morphological thinner. The LUT and neighborhood encoder are exported so
// `morphological.ts` can use them without duplicating the precomputed table.

/**
 * Build a 256-entry lookup table for topology-preserving pixel removal.
 * Index is the 8-bit encoding of the 3×3 neighborhood (P2..P9 mapped to bits 0..7).
 * A pixel is removable if: 2 ≤ B(P) ≤ 6 and A(P) = 1.
 */
function buildRemovalLUT(): Uint8Array {
  const lut = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    const p2 = (i >> 0) & 1;
    const p3 = (i >> 1) & 1;
    const p4 = (i >> 2) & 1;
    const p5 = (i >> 3) & 1;
    const p6 = (i >> 4) & 1;
    const p7 = (i >> 5) & 1;
    const p8 = (i >> 6) & 1;
    const p9 = (i >> 7) & 1;

    const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
    if (B < 2 || B > 6) continue;

    const seq = [p2, p3, p4, p5, p6, p7, p8, p9];
    let A = 0;
    for (let j = 0; j < 8; j++) {
      if (seq[j] === 0 && seq[(j + 1) % 8] === 1) A++;
    }
    if (A !== 1) continue;

    lut[i] = 1;
  }

  return lut;
}

/** Encode 8-connected neighborhood as an 8-bit index: P2(N)=bit0 … P9(NW)=bit7 */
export function encodeNeighborhood(x: number, y: number, bitmap: Uint8Array, width: number, height: number): number {
  let code = 0;
  if (y > 0 && bitmap[(y - 1) * width + x]) code |= 1;
  if (y > 0 && x < width - 1 && bitmap[(y - 1) * width + x + 1]) code |= 2;
  if (x < width - 1 && bitmap[y * width + x + 1]) code |= 4;
  if (y < height - 1 && x < width - 1 && bitmap[(y + 1) * width + x + 1]) code |= 8;
  if (y < height - 1 && bitmap[(y + 1) * width + x]) code |= 16;
  if (y < height - 1 && x > 0 && bitmap[(y + 1) * width + x - 1]) code |= 32;
  if (x > 0 && bitmap[y * width + x - 1]) code |= 64;
  if (y > 0 && x > 0 && bitmap[(y - 1) * width + x - 1]) code |= 128;
  return code;
}

// Precompute once at module level
export const REMOVAL_LUT = buildRemovalLUT();

/** 8 border directions for Lee/morphological thinning. */
export const BORDER_DIRS = [
  { dx: 0, dy: -1 }, // N
  { dx: 1, dy: -1 }, // NE
  { dx: 1, dy: 0 }, // E
  { dx: 1, dy: 1 }, // SE
  { dx: 0, dy: 1 }, // S
  { dx: -1, dy: 1 }, // SW
  { dx: -1, dy: 0 }, // W
  { dx: -1, dy: -1 }, // NW
];

/**
 * Lee's thinning algorithm adapted for 2D (Lee, Kashyap & Chu, 1994).
 *
 * Uses a precomputed lookup table with 8 directional sub-iterations per pass.
 * Each sub-iteration only considers border pixels from one direction (N, NE, E,
 * SE, S, SW, W, NW) and removes those whose 3×3 neighborhood passes the LUT
 * topology check (A=1, 2≤B≤6).
 *
 * The 8-directional sweep reduces directional bias compared to Zhang-Suen's
 * 2 sub-iterations, producing more symmetric skeletons with cleaner junctions.
 */
export function leeThin(bitmap: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(bitmap);

  let changed = true;
  while (changed) {
    changed = false;

    for (const dir of BORDER_DIRS) {
      const toDelete: number[] = [];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (result[idx] === 0) continue;

          // Only process border pixels for this direction
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && result[ny * width + nx] !== 0) continue;

          const neighbors = encodeNeighborhood(x, y, result, width, height);
          if (REMOVAL_LUT[neighbors]) {
            toDelete.push(idx);
          }
        }
      }

      for (const idx of toDelete) {
        result[idx] = 0;
        changed = true;
      }
    }
  }

  return result;
}
