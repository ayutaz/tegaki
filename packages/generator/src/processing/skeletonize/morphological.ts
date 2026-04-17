import { BORDER_DIRS, encodeNeighborhood, REMOVAL_LUT } from './lee.ts';

/**
 * Morphological thinning with configurable iteration count.
 *
 * Uses the same topology-preserving LUT as Lee's method but with a maximum
 * iteration limit. Lower maxIterations produces thicker skeletons that preserve
 * more of the original stroke width.
 *
 * With maxIterations = Infinity this is equivalent to full Lee thinning.
 */
export function morphologicalThin(bitmap: Uint8Array, width: number, height: number, maxIterations: number): Uint8Array {
  const result = new Uint8Array(bitmap);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (const dir of BORDER_DIRS) {
      const toDelete: number[] = [];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (result[idx] === 0) continue;

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

    if (!changed) break;
  }

  return result;
}
