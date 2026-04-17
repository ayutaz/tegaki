/**
 * Guo-Hall thinning algorithm (1989).
 * Two sub-iterations per pass, like Zhang-Suen, but uses paired-neighbor
 * counting: N = min(N1, N2) where N1 and N2 group adjacent neighbor pairs
 * with different offsets. This can produce slightly different junction
 * topology and thinner diagonal strokes compared to Zhang-Suen.
 */
export function guoHallThin(bitmap: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(bitmap);

  const get = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return result[y * width + x]!;
  };

  let changed = true;
  while (changed) {
    changed = false;

    // Sub-iteration 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y * width + x] === 0) continue;

        const p2 = get(x, y - 1);
        const p3 = get(x + 1, y - 1);
        const p4 = get(x + 1, y);
        const p5 = get(x + 1, y + 1);
        const p6 = get(x, y + 1);
        const p7 = get(x - 1, y + 1);
        const p8 = get(x - 1, y);
        const p9 = get(x - 1, y - 1);

        // C(P): number of 0→1 transitions in the ordered sequence
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9];
        let C = 0;
        for (let i = 0; i < 8; i++) {
          if (seq[i] === 0 && seq[(i + 1) % 8] === 1) C++;
        }
        if (C !== 1) continue;

        // N = min(N1, N2) using paired-neighbor groupings
        const n1 = (p9 | p2) + (p3 | p4) + (p5 | p6) + (p7 | p8);
        const n2 = (p2 | p3) + (p4 | p5) + (p6 | p7) + (p8 | p9);
        const N = Math.min(n1, n2);
        if (N < 2 || N > 3) continue;

        // Sub-iteration 1 condition
        if ((p2 | p3) & (p6 | p7)) continue;

        toDelete1.push(y * width + x);
      }
    }
    for (const idx of toDelete1) {
      result[idx] = 0;
      changed = true;
    }

    // Sub-iteration 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y * width + x] === 0) continue;

        const p2 = get(x, y - 1);
        const p3 = get(x + 1, y - 1);
        const p4 = get(x + 1, y);
        const p5 = get(x + 1, y + 1);
        const p6 = get(x, y + 1);
        const p7 = get(x - 1, y + 1);
        const p8 = get(x - 1, y);
        const p9 = get(x - 1, y - 1);

        const seq = [p2, p3, p4, p5, p6, p7, p8, p9];
        let C = 0;
        for (let i = 0; i < 8; i++) {
          if (seq[i] === 0 && seq[(i + 1) % 8] === 1) C++;
        }
        if (C !== 1) continue;

        const n1 = (p9 | p2) + (p3 | p4) + (p5 | p6) + (p7 | p8);
        const n2 = (p2 | p3) + (p4 | p5) + (p6 | p7) + (p8 | p9);
        const N = Math.min(n1, n2);
        if (N < 2 || N > 3) continue;

        // Sub-iteration 2 condition
        if ((p4 | p5) & (p8 | p9)) continue;

        toDelete2.push(y * width + x);
      }
    }
    for (const idx of toDelete2) {
      result[idx] = 0;
      changed = true;
    }
  }

  return result;
}
