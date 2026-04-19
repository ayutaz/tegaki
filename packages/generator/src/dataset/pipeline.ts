// Phase 3 — dataset-driven skeletonization.
// Replaces Stage 4 (`processing/skeletonize`) for CJK characters by looking up
// KanjiVG stroke data instead of running thinning over the rasterized glyph.
// The output shape matches `SkeletonizeResult` so Stage 5 (`orderStrokes`) can
// consume it without changes — the only new channel is `endpointTypes`, which
// Phase 5's rhythm synthesis will read via the optional back-reference below.

import { getKanjiSvg, hasKanji } from '@tegaki/dataset-cjk-kanjivg';
import type { BBox, Point } from 'tegaki';
import type { RasterResult } from '../processing/rasterize.ts';
import type { SkeletonizeResult } from '../processing/skeletonize/index.ts';
import { getStrokeWidth } from '../processing/width.ts';
import { type EndpointType, parseKanjiSvg } from './kanjivg.ts';

/**
 * Unicode-block test for "this glyph is in a range KanjiVG typically covers".
 * Matches hiragana, katakana (with phonetic extensions), and CJK Unified Ideographs.
 * Excludes CJK Compatibility Ideographs, CJK Ext A–G, emoji, and Latin.
 */
const CJK_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/u;

/** Returns `true` when the input's first codepoint falls in the CJK core block. */
export function isCJK(char: string): boolean {
  return CJK_REGEX.test(char);
}

export interface DatasetSkeletonInput {
  char: string;
  pathBBox: BBox;
  raster: RasterResult;
  inverseDT: Float32Array;
}

export interface DatasetSkeletonResult extends SkeletonizeResult {
  /** Parallel to `polylines` — KanjiVG's endpoint classification. Phase 5 rhythm input. */
  endpointTypes: EndpointType[];
}

/**
 * Extract centerline polylines for a single CJK character from the KanjiVG
 * dataset, mapped into the same bitmap-space coordinate system the heuristic
 * skeletonizer produces.
 *
 * KanjiVG SVGs are authored in a 109×109 normalized canvas with the glyph
 * roughly centered at (54.5, 54.5). We fit that square onto the font glyph's
 * `pathBBox` while preserving aspect ratio (so squarish kanji fill the box and
 * tall kana are letterboxed rather than stretched), then push through
 * `raster.transform` to land in bitmap pixels.
 *
 * Returns `null` when the codepoint is not in KanjiVG's coverage — the caller
 * is expected to fall back to the heuristic pipeline (or abort under `--strict`).
 */
export function datasetSkeleton({ char, pathBBox, raster, inverseDT }: DatasetSkeletonInput): DatasetSkeletonResult | null {
  const cp = char.codePointAt(0);
  if (cp === undefined || !hasKanji(cp)) return null;
  const svg = getKanjiSvg(cp);
  if (!svg) return null;

  const strokes = parseKanjiSvg(svg);
  if (strokes.length === 0) return null;

  const bboxW = pathBBox.x2 - pathBBox.x1;
  const bboxH = pathBBox.y2 - pathBBox.y1;
  if (bboxW <= 0 || bboxH <= 0) return null;

  // Aspect-preserving fit of the 109-square into pathBBox (letterbox).
  const scaleFit = Math.min(bboxW / 109, bboxH / 109);
  const centerX = (pathBBox.x1 + pathBBox.x2) / 2;
  const centerY = (pathBBox.y1 + pathBBox.y2) / 2;
  const t = raster.transform;

  const polylines: Point[][] = [];
  const widths: number[][] = [];
  const endpointTypes: EndpointType[] = [];

  for (const s of strokes) {
    const pl: Point[] = new Array(s.points.length);
    const pw: number[] = new Array(s.points.length);
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i]!;
      // KanjiVG y-down → opentype screen-space (also y-down via getPath). Direct map.
      const fontX = centerX + (p.x - 54.5) * scaleFit;
      const fontY = centerY + (p.y - 54.5) * scaleFit;
      const bmX = (fontX - t.offsetX) * t.scaleX;
      const bmY = (fontY - t.offsetY) * t.scaleY;
      pl[i] = { x: bmX, y: bmY };
      // Width is sampled from the font glyph's own distance transform, so
      // thickness matches the upstream font's weight rather than KanjiVG's
      // uniform stroke-width:3 styling.
      pw[i] = getStrokeWidth(bmX, bmY, inverseDT, raster.width);
    }
    polylines.push(pl);
    widths.push(pw);
    endpointTypes.push(s.endpointType);
  }

  // Synthesize a 1-pixel skeleton from the polylines so debug visualization
  // stays uniform across skeletonization paths.
  const skeleton = new Uint8Array(raster.width * raster.height);
  for (const pl of polylines) {
    for (const p of pl) {
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      if (px >= 0 && px < raster.width && py >= 0 && py < raster.height) {
        skeleton[py * raster.width + px] = 1;
      }
    }
  }

  return { skeleton, polylines, widths, endpointTypes };
}
