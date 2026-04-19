import opentype from 'opentype.js';
import { type BBox, BUNDLE_VERSION, type FontOutput, type LineCap, type Point, type Stroke } from 'tegaki';
import * as z from 'zod/v4';
import {
  BEZIER_TOLERANCE,
  charsHash,
  DEFAULT_FONT_FAMILY,
  DEFAULT_RESOLUTION,
  DISTANCE_TRANSFORM_METHOD,
  DRAWING_SPEED,
  JUNCTION_CLEANUP_MAX_ITERATIONS,
  MERGE_THRESHOLD_RATIO,
  RDP_TOLERANCE,
  SKELETON_METHOD,
  SPUR_LENGTH_RATIO,
  STROKE_PAUSE,
  THIN_MAX_ITERATIONS,
  TRACE_CURVATURE_BIAS,
  TRACE_LOOKBACK,
  VORONOI_SAMPLING_INTERVAL,
} from '../constants.ts';
import { datasetSkeleton, isCJK } from '../dataset/pipeline.ts';
import { extractGlyph, inferLineCap } from '../font/parse.ts';
import { computePathBBox, flattenPath } from '../processing/bezier.ts';
import { toFontUnits } from '../processing/font-units.ts';
import { rasterize } from '../processing/rasterize.ts';
import { skeletonize } from '../processing/skeletonize/index.ts';
import { orderStrokes } from '../processing/stroke-order.ts';
import { computeInverseDistanceTransform } from '../processing/width.ts';

// ── Pipeline option schema ─────────────────────────────────────────────────
// `PipelineOptions` and `DEFAULT_OPTIONS` are derived from this schema so the
// runtime defaults, the static type, and the CLI flag parsing all stay in sync.

const pipelineOptionsSchema = z.object({
  resolution: z.number().default(DEFAULT_RESOLUTION).describe('Bitmap resolution for skeletonization').meta({ flags: 'r' }),
  skeletonMethod: z
    .enum(['zhang-suen', 'guo-hall', 'medial-axis', 'lee', 'thin', 'voronoi'])
    .default(SKELETON_METHOD)
    .describe('Skeletonization algorithm'),
  lineCap: z
    .enum(['auto', 'round', 'butt', 'square'])
    .default('auto')
    .describe('Stroke line cap style (auto infers from font properties)')
    .meta({ flags: 'l' }),
  bezierTolerance: z.number().default(BEZIER_TOLERANCE).describe('Bezier curve flattening tolerance'),
  rdpTolerance: z.number().default(RDP_TOLERANCE).describe('Ramer-Douglas-Peucker simplification tolerance'),
  spurLengthRatio: z.number().default(SPUR_LENGTH_RATIO).describe('Minimum spur length as fraction of bitmap size'),
  mergeThresholdRatio: z.number().default(MERGE_THRESHOLD_RATIO).describe('Merge threshold as fraction of bitmap size'),
  traceLookback: z.number().default(TRACE_LOOKBACK).describe('Lookback window for junction direction estimation'),
  curvatureBias: z.number().default(TRACE_CURVATURE_BIAS).describe('Curvature extrapolation weight at junctions'),
  thinMaxIterations: z.number().default(THIN_MAX_ITERATIONS).describe('Max iterations for morphological thinning'),
  junctionCleanupIterations: z.number().default(JUNCTION_CLEANUP_MAX_ITERATIONS).describe('Max iterations for junction cluster cleanup'),
  dtMethod: z.enum(['euclidean', 'chamfer']).default(DISTANCE_TRANSFORM_METHOD).describe('Distance transform algorithm'),
  voronoiSamplingInterval: z.number().default(VORONOI_SAMPLING_INTERVAL).describe('Voronoi boundary sampling interval'),
  drawingSpeed: z.number().default(DRAWING_SPEED).describe('Drawing speed in font units per second'),
  strokePause: z.number().default(STROKE_PAUSE).describe('Pause duration in seconds between strokes'),
  ligatures: z.boolean().default(false).describe('Enable OpenType ligatures (calt, liga) in the font bundle'),
  dataset: z
    .enum(['kanjivg'])
    .optional()
    .describe(
      'Optional CJK stroke-order dataset. When set, characters covered by the dataset use its strokes instead of heuristic skeletonization.',
    ),
  strict: z
    .boolean()
    .default(false)
    .describe(
      'When combined with --dataset, abort on a CJK character that is not covered instead of falling back to heuristic skeletonization.',
    ),
  rhythm: z
    .enum(['constant', 'lognormal'])
    .default('constant')
    .describe(
      "Animation rhythm. 'constant' uses uniform per-stroke speed (back-compat default). 'lognormal' shapes each stroke with a Plamondon Sigma-Lognormal profile and, when dataset=kanjivg, modulates by tome/hane/harai/dot endpoints.",
    ),
});

export type PipelineOptions = z.infer<typeof pipelineOptionsSchema>;
export const DEFAULT_OPTIONS: PipelineOptions = pipelineOptionsSchema.parse({});

// ── CLI argument schema ───────────────────────────────────────────────────

export const generateArgsSchema = pipelineOptionsSchema.extend({
  family: z.string().default(DEFAULT_FONT_FAMILY).describe('Google Fonts family name'),
  output: z.string().optional().describe('Output folder path for the font bundle').meta({ flags: 'o' }),
  chars: z
    .union([z.boolean(), z.string()])
    .default(false)
    .describe('Characters to process. `true` processes every glyph in the font, `false` uses the default character set.')
    .meta({ flags: 'c' }),
  force: z.boolean().default(false).describe('Re-download font even if cached').meta({ flags: 'f' }),
  debug: z.boolean().default(false).describe('Output intermediate steps (bitmap, skeleton, trace, animation SVGs)').meta({ flags: 'd' }),
});

export interface PipelineResult {
  char: string;
  unicode: number;
  advanceWidth: number;
  boundingBox: BBox;
  pathString: string;
  lineCap: LineCap;
  ascender: number;
  descender: number;

  // Stage 1: Flattened paths
  subPaths: Point[][];
  pathBBox: BBox;

  // Stage 2: Rasterized bitmap
  bitmap: Uint8Array;
  bitmapWidth: number;
  bitmapHeight: number;
  transform: { scaleX: number; scaleY: number; offsetX: number; offsetY: number };

  // Stage 3: Skeleton
  skeleton: Uint8Array;

  // Stage 4: Inverse distance transform
  inverseDT: Float32Array;

  // Stage 5: Traced polylines
  polylines: Point[][];

  // Stage 6: Ordered strokes (in bitmap space)
  strokes: Stroke[];

  // Stage 7: Font-unit strokes (final output)
  strokesFontUnits: (Stroke & { animationDuration: number; delay: number; length: number })[];
}

export interface ParsedFontInfo {
  family: string;
  style: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineCap: LineCap;
  font: opentype.Font;
  /** Additional subset fonts (e.g. CJK subsets from Google Fonts) */
  extraFonts?: opentype.Font[];
}

// ── Bundle types ──────────────────────────────────────────────────────────

export interface BundleFile {
  /** Relative path within the bundle (e.g., "font.json", "svg/A.svg") */
  path: string;
  /** File content — string for text files, Uint8Array for binary */
  content: string | Uint8Array;
}

export interface ExtractBundleInput {
  fontBuffer: ArrayBuffer;
  fontFileName: string;
  chars: string;
  options: PipelineOptions;
  onProgress?: (message: string, progress?: number) => void;
  /** Additional font buffers for extra subsets (e.g. CJK subsets from Google Fonts) */
  extraFontBuffers?: ArrayBuffer[];
  /**
   * When true (default), the bundle's font family is suffixed with "Tegaki" + a
   * hash so it doesn't collide with the user's full font. The original family
   * is stored as `fullFamily` so the renderer can fall back to it for
   * characters not in the generated glyph set.
   *
   * Set to false when the bundle contains the full font (e.g. `--chars true`).
   */
  subset?: boolean;
  /** Full (non-subsetted) font buffer, bundled alongside the subset so the renderer can fall back to it. */
  fullFontBuffer?: ArrayBuffer;
  /** Filename for the full font file (e.g. `caveat.ttf`). */
  fullFontFileName?: string;
}

export interface TegakiBundleOutput {
  fontOutput: FontOutput;
  glyphResults: Record<string, PipelineResult>;
  files: BundleFile[];
  stats: { processed: number; skipped: number };
}

// ── Pipeline functions ─────────────────────────────────────────────────────

/** Parse a font from an ArrayBuffer (browser-compatible) */
export function parseFont(buffer: ArrayBuffer, extraBuffers?: ArrayBuffer[]): ParsedFontInfo {
  const font = opentype.parse(buffer);
  const extraFonts = extraBuffers?.map((b) => opentype.parse(b));
  return {
    family: font.names.fontFamily?.en ?? 'Unknown',
    style: font.names.fontSubfamily?.en ?? 'Regular',
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    lineCap: inferLineCap(font),
    font,
    extraFonts: extraFonts?.length ? extraFonts : undefined,
  };
}

/**
 * Run the full processing pipeline for a single glyph.
 *
 * Each stage is one function call producing the input to the next; intermediate
 * outputs are also returned in PipelineResult so the website preview and debug
 * visualizers can render them. Stage definitions live in packages/generator/src/processing/.
 */
export function processGlyph(fontInfo: ParsedFontInfo, char: string, options: PipelineOptions): PipelineResult | null {
  const rawGlyph = extractGlyph(fontInfo.font, char, fontInfo.extraFonts);
  if (!rawGlyph) return null;

  const lineCap: LineCap = options.lineCap === 'auto' ? fontInfo.lineCap : options.lineCap;

  // Stage 1: Flatten bezier outline commands into polyline sub-paths (font units).
  const subPaths = flattenPath(rawGlyph.commands, options.bezierTolerance);
  const pathBBox = computePathBBox(subPaths);

  // Stage 2: Rasterize flattened paths into a binary bitmap.
  const raster = rasterize(subPaths, pathBBox, options.resolution);

  // Stage 3: Compute inverse distance transform — per-pixel stroke radius field.
  const inverseDT = computeInverseDistanceTransform(raster.bitmap, raster.width, raster.height, options.dtMethod);

  // Stage 4: Extract skeleton + centerline polylines.
  // For CJK chars with a dataset lookup available, we use the pre-authored stroke
  // order instead of running heuristic thinning. Uncovered chars and all non-CJK
  // glyphs continue through the existing Voronoi / thinning path.
  let skeleton: Uint8Array;
  let polylines: import('tegaki').Point[][];
  let widths: number[][] | undefined;
  let endpointTypes: readonly import('tegaki').EndpointType[] | undefined;
  const datasetOut = options.dataset === 'kanjivg' && isCJK(char) ? datasetSkeleton({ char, pathBBox, raster, inverseDT }) : null;
  if (datasetOut) {
    skeleton = datasetOut.skeleton;
    polylines = datasetOut.polylines;
    widths = datasetOut.widths;
    endpointTypes = datasetOut.endpointTypes;
  } else {
    if (options.dataset === 'kanjivg' && isCJK(char)) {
      if (options.strict) {
        throw new Error(
          `--strict: character "${char}" (U+${char.codePointAt(0)?.toString(16).toUpperCase()}) is not in the KanjiVG dataset.`,
        );
      }
      console.warn(
        `[generate] "${char}" (U+${char.codePointAt(0)?.toString(16).toUpperCase()}) not in KanjiVG dataset; falling back to heuristic skeletonization.`,
      );
    }
    const r = skeletonize({ subPaths, pathBBox, raster, inverseDT, options });
    skeleton = r.skeleton;
    polylines = r.polylines;
    widths = r.widths;
  }

  // Stage 5: Order strokes (draw order + direction) and assign per-point time `t`.
  // `rhythm: 'lognormal'` opts into the Sigma-Lognormal remap — when combined
  // with a dataset lookup the per-stroke endpoint types (tome/hane/harai/dot)
  // modulate σ/μ; without a dataset everything uses the 'default' modulation.
  const strokes = orderStrokes(
    polylines,
    inverseDT,
    raster.width,
    3,
    widths,
    options.rhythm === 'lognormal' ? { mode: 'lognormal', endpointTypes } : undefined,
  );

  // Stage 6: Convert to font units and compute animation timing.
  const strokesFontUnits = toFontUnits(strokes, raster.transform, options.drawingSpeed, options.strokePause);

  return {
    char,
    unicode: rawGlyph.unicode,
    advanceWidth: rawGlyph.advanceWidth,
    boundingBox: rawGlyph.boundingBox,
    pathString: rawGlyph.pathString,
    lineCap,
    ascender: fontInfo.ascender,
    descender: fontInfo.descender,
    subPaths,
    pathBBox,
    bitmap: raster.bitmap,
    bitmapWidth: raster.width,
    bitmapHeight: raster.height,
    transform: raster.transform,
    skeleton,
    inverseDT,
    polylines,
    strokes,
    strokesFontUnits,
  };
}

// ── Bundle extraction (pure — no file I/O) ────────────────────────────────

export function extractTegakiBundle(input: ExtractBundleInput): TegakiBundleOutput {
  const {
    fontBuffer,
    fontFileName,
    chars: charsStr,
    options,
    onProgress,
    extraFontBuffers,
    subset = true,
    fullFontBuffer,
    fullFontFileName,
  } = input;
  const fontInfo = parseFont(fontBuffer, extraFontBuffers);

  const lineCap: LineCap = options.lineCap === 'auto' ? fontInfo.lineCap : options.lineCap;

  onProgress?.(`Processing ${fontInfo.family} ${fontInfo.style} (${fontInfo.unitsPerEm} units/em, ${lineCap} caps)`, 0);

  const output: FontOutput = {
    font: {
      family: fontInfo.family,
      style: fontInfo.style,
      unitsPerEm: fontInfo.unitsPerEm,
      ascender: fontInfo.ascender,
      descender: fontInfo.descender,
      lineCap,
    },
    glyphs: {},
  };

  const chars = [...charsStr];
  let processed = 0;
  let skipped = 0;
  const glyphResults: Record<string, PipelineResult> = {};

  for (const char of chars) {
    const result = processGlyph(fontInfo, char, options);
    if (!result) {
      skipped++;
      continue;
    }

    glyphResults[char] = result;

    const { strokesFontUnits, polylines, transform } = result;
    const skeletonFontUnits = polylines.map((pl) =>
      pl.map((p) => ({
        x: Math.round((p.x / transform.scaleX + transform.offsetX) * 100) / 100,
        y: Math.round((p.y / transform.scaleY + transform.offsetY) * 100) / 100,
      })),
    );

    const totalLength = Math.round(strokesFontUnits.reduce((sum, s) => sum + s.length, 0) * 100) / 100;
    const last = strokesFontUnits[strokesFontUnits.length - 1];
    const totalAnimationDuration = last ? Math.round((last.delay + last.animationDuration) * 1000) / 1000 : 0;

    output.glyphs[char] = {
      char: result.char,
      unicode: result.unicode,
      advanceWidth: result.advanceWidth,
      boundingBox: result.boundingBox,
      path: result.pathString,
      skeleton: skeletonFontUnits,
      strokes: strokesFontUnits,
      totalLength,
      totalAnimationDuration,
    };

    processed++;
    onProgress?.(`Processing glyph "${char}"`, processed / chars.length);
  }

  // Build bundle files
  const files: BundleFile[] = [];

  files.push({ path: fontFileName, content: new Uint8Array(fontBuffer) });

  // Compact glyph data: short keys, points as [x, y, width] tuples
  const glyphDataMap: Record<
    string,
    {
      w: number;
      t: number;
      s: { p: [number, number, number][]; d: number; a: number }[];
    }
  > = {};

  for (const glyph of Object.values(output.glyphs)) {
    glyphDataMap[glyph.char] = {
      w: glyph.advanceWidth,
      t: glyph.totalAnimationDuration,
      s: glyph.strokes.map((s) => ({
        p: s.points.map((p) => [p.x, p.y, p.width] as [number, number, number]),
        d: s.delay,
        a: s.animationDuration,
      })),
    };
  }

  files.push({ path: 'glyphData.json', content: JSON.stringify(glyphDataMap) });

  // When the bundle is a subset, suffix the font-family name so it doesn't
  // collide with a user-loaded full font. The full (non-subsetted) font is
  // bundled alongside so the renderer can fall back to it automatically.
  const bundleFamily = subset ? `${fontInfo.family} Tegaki ${charsHash(charsStr)}` : fontInfo.family;
  const fullFamily = subset ? fontInfo.family : undefined;

  if (subset && fullFontBuffer && fullFontFileName) {
    files.push({ path: fullFontFileName, content: new Uint8Array(fullFontBuffer) });
  }

  files.push({
    path: 'bundle.ts',
    content: generateGlyphsModule(
      fontFileName,
      bundleFamily,
      fullFamily,
      subset && fullFontFileName ? fullFontFileName : undefined,
      lineCap,
      fontInfo.unitsPerEm,
      fontInfo.ascender,
      fontInfo.descender,
    ),
  });

  return { fontOutput: output, glyphResults, files, stats: { processed, skipped } };
}

function generateGlyphsModule(
  fontFileName: string,
  fontFamily: string,
  fullFamily: string | undefined,
  fullFontFileName: string | undefined,
  lineCap: LineCap,
  unitsPerEm: number,
  ascender: number,
  descender: number,
): string {
  const esc = (s: string) => s.replace(/'/g, "\\'");
  const hasFull = fullFamily && fullFontFileName;

  const imports = [`import fontUrl from './${fontFileName}' with { type: 'url' };`];
  if (hasFull) imports.push(`import fullFontUrl from './${fullFontFileName}' with { type: 'url' };`);
  imports.push(`import glyphData from './glyphData.json' with { type: 'json' };`);

  const fontFaceRules = [`@font-face { font-family: '${esc(fontFamily)}'; src: url(\${fontUrl}); }`];
  if (hasFull) fontFaceRules.push(`@font-face { font-family: '${esc(fullFamily)}'; src: url(\${fullFontUrl}); }`);

  const props = [
    `  version: ${BUNDLE_VERSION},`,
    `  family: '${esc(fontFamily)}',`,
    ...(hasFull ? [`  fullFamily: '${esc(fullFamily)}',`] : []),
    `  lineCap: '${lineCap}',`,
    `  fontUrl,`,
    ...(hasFull ? [`  fullFontUrl,`] : []),
    `  fontFaceCSS: \`${fontFaceRules.join(' ')}\`,`,
    `  unitsPerEm: ${unitsPerEm},`,
    `  ascender: ${ascender},`,
    `  descender: ${descender},`,
    `  glyphData,`,
  ];

  return `// Auto-generated by Tegaki. Do not edit manually.
${imports.join('\n')}

const bundle = {
${props.join('\n')}
} as const;

export default bundle;
`;
}
