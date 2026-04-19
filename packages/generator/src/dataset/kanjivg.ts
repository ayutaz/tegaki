// Phase 2 — KanjiVG loader.
// Parses a single KanjiVG SVG document into an ordered array of strokes.
// Stroke order is the document order of `<path>` elements under the
// `kvg:StrokePaths_*` group (this matches the `id="kvg:<hex>-sN"` suffix).
//
// The SVG `d` attribute uses only M/m, C/c, S/s commands in KanjiVG; no
// L/Q/A/Z. The S (smooth cubic) command requires reflecting the previous
// curve's second control point through the current point — we implement that
// explicitly rather than pulling in a generic path parser.
//
// Output polylines are in KanjiVG's 109×109 normalized space with y-down.
// Subsequent pipeline stages (Phase 3) rescale to font units and flip y.

import { DOMParser } from '@xmldom/xmldom';
import type { PathCommand, Point } from 'tegaki';
import { flattenPath } from '../processing/bezier.ts';

export type EndpointType = 'tome' | 'hane' | 'harai' | 'dot' | 'default';

export interface KanjiStroke {
  /** Polyline sampled from the cubic Bezier path, in 109-normalized KanjiVG space (y-down). */
  points: Point[];
  /** Endpoint classification derived from `kvg:type`. `'default'` when no hint is present (e.g. kana). */
  endpointType: EndpointType;
  /** 1-origin stroke number, matching `<path id="kvg:<hex>-sN">`. */
  strokeNumber: number;
  /** Raw `kvg:type` attribute value, preserved for later refinement. `null` for kana / untagged strokes. */
  kvgType: string | null;
}

// CJK Strokes block (U+31C0–U+31E3). Only the shapes KanjiVG actually uses.
const HANE = new Set(['㇀', '㇁', '㇂', '㇃', '㇆', '㇈', '㇉', '㇖', '㇙', '㇚', '㇟', '㇡']);
const HARAI = new Set(['㇇', '㇋', '㇏', '㇒', '㇓']);
const TOME = new Set(['㇐', '㇑']);

/**
 * Classify a `kvg:type` attribute value into the endpoint taxonomy used by
 * the rhythm model (Phase 5).
 *
 * Subtype letters (`a`, `b`, `c`, `v`) encode connection geometry at
 * junctions and are ignored here. Slash notation (`㇔/㇀`) means "either
 * shape is acceptable" — we take the first option.
 */
export function classifyEndpoint(kvgType: string | null | undefined): EndpointType {
  if (!kvgType) return 'default';
  const base = kvgType.split('/')[0]?.replace(/[abcv]+$/u, '') ?? '';
  if (!base) return 'default';
  if (base === '㇔') return 'dot';
  if (TOME.has(base)) return 'tome';
  if (HANE.has(base)) return 'hane';
  if (HARAI.has(base)) return 'harai';
  return 'default';
}

// ── SVG path data parser ────────────────────────────────────────────────────

const CMD_RE = /([MmCcSs])|(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;

interface CursorState {
  cx: number;
  cy: number;
  /** Previous C/c/S/s command's second control point (absolute coords). */
  lastC2x: number;
  lastC2y: number;
  /** True when the previous command produced a cubic — needed for S reflection. */
  lastWasCubic: boolean;
}

/**
 * Parse a KanjiVG SVG path `d` attribute into Tegaki's `PathCommand[]`.
 *
 * KanjiVG restricts `d` to M/m, C/c, S/s. Implicit line-tos after M are not
 * used upstream; if they ever appear in a future release the parser skips
 * them silently (they would produce L commands which `flattenPath` accepts).
 */
export function parseD(d: string): PathCommand[] {
  const tokens: string[] = [];
  for (const m of d.matchAll(CMD_RE)) tokens.push(m[0]!);

  const cmds: PathCommand[] = [];
  const st: CursorState = { cx: 0, cy: 0, lastC2x: 0, lastC2y: 0, lastWasCubic: false };

  let i = 0;
  let prev: string | null = null;

  const take = (): number => {
    const tok = tokens[i++];
    if (tok === undefined) throw new Error(`parseD: unexpected end of path in "${d}"`);
    return Number(tok);
  };

  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/[MmCcSs]/.test(tok)) {
      prev = tok;
      i++;
      continue;
    }
    if (prev === null) throw new Error(`parseD: numeric token before any command in "${d}"`);

    const cmd: string = prev;
    const rel = cmd === cmd.toLowerCase();

    if (prev === 'M' || prev === 'm') {
      const x = rel ? st.cx + take() : take();
      const y = rel ? st.cy + take() : take();
      cmds.push({ type: 'M', x, y });
      st.cx = x;
      st.cy = y;
      st.lastWasCubic = false;
      // Per SVG spec, additional coordinate pairs after M become implicit L.
      prev = rel ? 'l' : 'L';
    } else if (prev === 'L' || prev === 'l') {
      const x = rel ? st.cx + take() : take();
      const y = rel ? st.cy + take() : take();
      cmds.push({ type: 'L', x, y });
      st.cx = x;
      st.cy = y;
      st.lastWasCubic = false;
    } else if (prev === 'C' || prev === 'c') {
      const x1 = rel ? st.cx + take() : take();
      const y1 = rel ? st.cy + take() : take();
      const x2 = rel ? st.cx + take() : take();
      const y2 = rel ? st.cy + take() : take();
      const x = rel ? st.cx + take() : take();
      const y = rel ? st.cy + take() : take();
      cmds.push({ type: 'C', x, y, x1, y1, x2, y2 });
      st.lastC2x = x2;
      st.lastC2y = y2;
      st.cx = x;
      st.cy = y;
      st.lastWasCubic = true;
    } else if (prev === 'S' || prev === 's') {
      // Reflect last cubic's C2 through the current point. If the previous
      // command was not a cubic, the implicit control point is the current
      // point itself (per SVG 1.1 §8.3.6).
      const x1 = st.lastWasCubic ? 2 * st.cx - st.lastC2x : st.cx;
      const y1 = st.lastWasCubic ? 2 * st.cy - st.lastC2y : st.cy;
      const x2 = rel ? st.cx + take() : take();
      const y2 = rel ? st.cy + take() : take();
      const x = rel ? st.cx + take() : take();
      const y = rel ? st.cy + take() : take();
      cmds.push({ type: 'C', x, y, x1, y1, x2, y2 });
      st.lastC2x = x2;
      st.lastC2y = y2;
      st.cx = x;
      st.cy = y;
      st.lastWasCubic = true;
    } else {
      throw new Error(`parseD: unsupported command "${prev}" in "${d}"`);
    }
  }

  return cmds;
}

// ── SVG document walk ────────────────────────────────────────────────────────

interface RawPathEntry {
  d: string;
  kvgType: string | null;
  strokeNumber: number;
}

function readAttr(el: unknown, name: string): string | null {
  const e = el as { getAttribute?: (n: string) => string | null } | null;
  if (!e?.getAttribute) return null;
  return e.getAttribute(name) ?? null;
}

/**
 * Upstream KanjiVG declares the `kvg:` prefix inside the DOCTYPE ATTLIST,
 * not inline on `<svg>`. Strict namespace-aware parsers (including
 * @xmldom/xmldom) reject any `kvg:*` attribute in that state with
 * "NamespaceError: prefix is non-null and namespace is null". Preprocess the
 * markup so the namespace is bound inline and the DTD internal subset is
 * removed, giving us a clean single-pass parse without losing data.
 */
function normalizeKanjiSvg(raw: string): string {
  let s = raw;
  // Drop the DOCTYPE + internal ATTLIST subset entirely. We don't rely on
  // default attributes it declares; all attributes we read are present on
  // the elements themselves.
  s = s.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/u, '');
  s = s.replace(/<!DOCTYPE[^>]*>/u, '');
  // Ensure the kvg namespace is declared inline on the root <svg>.
  s = s.replace(/<svg\b([^>]*?)>/u, (match, attrs: string) => {
    if (/xmlns:kvg\s*=/u.test(attrs)) return match;
    return `<svg${attrs} xmlns:kvg="http://kanjivg.tagaini.net">`;
  });
  return s;
}

/**
 * Collect the raw `<path>` entries from the `kvg:StrokePaths_*` group, in
 * document order. The `id` attribute on each path ends in `-sN`; that N is
 * the 1-origin stroke number.
 */
function collectStrokePaths(svg: string): RawPathEntry[] {
  const parser = new DOMParser({
    onError: (_level, _msg) => {
      // Swallow xmldom warnings (the normalized input rarely triggers them).
    },
  });
  const doc = parser.parseFromString(normalizeKanjiSvg(svg), 'image/svg+xml');

  const allPaths = Array.from(doc.getElementsByTagName('path'));
  const entries: RawPathEntry[] = [];

  for (const p of allPaths) {
    const id = readAttr(p, 'id') ?? '';
    // Ignore `<text>` numbering paths (they live under kvg:StrokeNumbers_*);
    // only stroke paths have the `-sN` suffix.
    const m = /-s(\d+)$/.exec(id);
    if (!m) continue;
    const d = readAttr(p, 'd');
    if (!d) continue;
    entries.push({
      d,
      kvgType: readAttr(p, 'kvg:type'),
      strokeNumber: Number(m[1]),
    });
  }

  entries.sort((a, b) => a.strokeNumber - b.strokeNumber);
  return entries;
}

/**
 * Parse a KanjiVG SVG string into an ordered list of strokes, each with
 * endpoint classification and a flattened polyline in 109-normalized space.
 */
export function parseKanjiSvg(svg: string): KanjiStroke[] {
  const raw = collectStrokePaths(svg);
  const out: KanjiStroke[] = [];
  for (const r of raw) {
    const cmds = parseD(r.d);
    const subPaths = flattenPath(cmds);
    // KanjiVG strokes are single sub-paths (one M per `<path>`). If future
    // releases ever break that invariant, concatenate the sub-paths.
    const points = subPaths[0] ?? [];
    if (points.length === 0) continue;
    out.push({
      points,
      endpointType: classifyEndpoint(r.kvgType),
      strokeNumber: r.strokeNumber,
      kvgType: r.kvgType,
    });
  }
  return out;
}
