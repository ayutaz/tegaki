import { describe, expect, it } from 'bun:test';

import type { BBox } from 'tegaki';
import { datasetSkeleton, isCJK } from './pipeline.ts';

// ── isCJK ───────────────────────────────────────────────────────────────────

describe('isCJK', () => {
  it('matches hiragana', () => {
    expect(isCJK('あ')).toBe(true);
    expect(isCJK('ん')).toBe(true);
    expect(isCJK('ゝ')).toBe(true);
  });

  it('matches katakana', () => {
    expect(isCJK('ア')).toBe(true);
    expect(isCJK('ン')).toBe(true);
    expect(isCJK('ヴ')).toBe(true);
  });

  it('matches common CJK ideographs', () => {
    expect(isCJK('右')).toBe(true);
    expect(isCJK('田')).toBe(true);
    expect(isCJK('一')).toBe(true);
  });

  it('rejects Latin letters and digits', () => {
    expect(isCJK('A')).toBe(false);
    expect(isCJK('z')).toBe(false);
    expect(isCJK('0')).toBe(false);
  });

  it('rejects punctuation and whitespace', () => {
    expect(isCJK(' ')).toBe(false);
    expect(isCJK('!')).toBe(false);
    expect(isCJK('。')).toBe(false); // CJK punctuation block, out of our scope
  });

  it('rejects emoji and astral-plane codepoints', () => {
    expect(isCJK('😀')).toBe(false);
    expect(isCJK('🀄')).toBe(false);
  });

  it('rejects CJK Compatibility Ideographs (U+F900–FAFF, out of scope)', () => {
    expect(isCJK('\uf900')).toBe(false);
  });
});

// ── datasetSkeleton — behavior without bundled data ─────────────────────────
// The committed package ships an empty manifest (SVGs are fetched on demand).
// These assertions target the null/fallback path that's reachable even so.

const BBOX: BBox = { x1: 100, y1: 100, x2: 900, y2: 900 };

// Mock raster with an identity-ish transform — real numbers come out of
// `rasterize()` at runtime, but the null-return paths never read them.
function mockRaster(
  w = 400,
  h = 400,
): {
  bitmap: Uint8Array;
  width: number;
  height: number;
  transform: { scaleX: number; scaleY: number; offsetX: number; offsetY: number };
} {
  return {
    bitmap: new Uint8Array(w * h),
    width: w,
    height: h,
    transform: { scaleX: w / 1000, scaleY: h / 1000, offsetX: 0, offsetY: 0 },
  };
}

describe('datasetSkeleton — uncovered inputs', () => {
  it('returns null for an empty string', () => {
    const raster = mockRaster();
    const result = datasetSkeleton({
      char: '',
      pathBBox: BBOX,
      raster,
      inverseDT: new Float32Array(raster.width * raster.height),
    });
    expect(result).toBeNull();
  });

  it('returns null for a Latin character (never in KanjiVG scope)', () => {
    const raster = mockRaster();
    const result = datasetSkeleton({
      char: 'A',
      pathBBox: BBOX,
      raster,
      inverseDT: new Float32Array(raster.width * raster.height),
    });
    expect(result).toBeNull();
  });

  it('returns null when pathBBox is degenerate (zero width or height)', () => {
    const raster = mockRaster();
    const result = datasetSkeleton({
      char: '右',
      pathBBox: { x1: 0, y1: 0, x2: 0, y2: 100 },
      raster,
      inverseDT: new Float32Array(raster.width * raster.height),
    });
    expect(result).toBeNull();
  });

  it('returns null for a covered char when the manifest is empty (current committed state)', () => {
    // The dataset package ships with an empty manifest until
    // `bun run fetch-kanjivg` has populated src/manifest.ts and kanjivg/*.svg.
    // In that state every lookup must null-out so the heuristic fallback engages.
    const raster = mockRaster();
    const result = datasetSkeleton({
      char: '右',
      pathBBox: BBOX,
      raster,
      inverseDT: new Float32Array(raster.width * raster.height),
    });
    expect(result).toBeNull();
  });
});
