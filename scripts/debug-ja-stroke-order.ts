// Standalone Node-side reproduction for the hiragana stroke-order bug.
// Runs processGlyph on the full Noto Sans JP TTF for り (U+308A) with the
// dataset=kanjivg + rhythm=lognormal options the website uses, then prints
// the ordered stroke coordinates so we can see whether the generator pipeline
// itself reproduces the wrong ordering or whether the bug is browser-specific.
//
// KanjiVG's authoritative order for り is:
//   Stroke 1 — left vertical (starts ~x=38.75)
//   Stroke 2 — right curve    (starts ~x=69.37)
// If we see these in reverse, the Node pipeline already has the bug.
//
// Usage: bun --conditions=tegaki@dev scripts/debug-ja-stroke-order.ts

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEFAULT_OPTIONS, parseFont, processGlyph } from '../packages/generator/src/commands/generate.ts';

const ROOT = resolve(import.meta.dir, '..');
const CACHE_DIR = resolve(ROOT, 'packages/generator/.cache/fonts');
const FULL_TTF = join(CACHE_DIR, 'noto-sans-jp-full.ttf');
const KANJIVG_SVG = resolve(ROOT, 'packages/dataset-cjk-kanjivg/kanjivg/0308a.svg');
const FAMILY = 'Noto Sans JP';
const UA = 'tegaki/1.0';

function extractTtfUrls(css: string): string[] {
  return [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]truetype['"]\)/g)].map((m) => m[1]!);
}

function curlText(url: string): string {
  const r = Bun.spawnSync(['curl', '-sSL', '-A', UA, url]);
  if (r.exitCode !== 0) throw new Error(`curl ${url}: exit ${r.exitCode}\n${r.stderr.toString()}`);
  return r.stdout.toString();
}

function curlBytes(url: string): ArrayBuffer {
  const r = Bun.spawnSync(['curl', '-sSL', '-A', UA, url]);
  if (r.exitCode !== 0) throw new Error(`curl ${url}: exit ${r.exitCode}\n${r.stderr.toString()}`);
  const u8 = r.stdout as Uint8Array;
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

async function loadFullNotoSansJp(): Promise<ArrayBuffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  if (existsSync(FULL_TTF)) {
    console.log(`[debug] using cached ${FULL_TTF}`);
    return Bun.file(FULL_TTF).arrayBuffer();
  }
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FAMILY)}`;
  console.log(`[debug] fetching css: ${cssUrl}`);
  const css = curlText(cssUrl);
  const urls = extractTtfUrls(css);
  if (urls.length === 0) throw new Error(`no TTF url in css:\n${css.slice(0, 400)}`);
  console.log(`[debug] downloading ${urls[0]!.slice(0, 80)}…`);
  const buf = curlBytes(urls[0]!);
  writeFileSync(FULL_TTF, Buffer.from(buf));
  return buf;
}

async function main(): Promise<void> {
  const char = 'り';
  const cp = char.codePointAt(0)!;
  console.log(`[debug] target char: "${char}" U+${cp.toString(16).toUpperCase()}`);

  // KanjiVG dataset presence check — the bundled dataset ships the SVGs at
  // packages/dataset-cjk-kanjivg/kanjivg/<hex>.svg. If that file is missing
  // the pipeline will fall back to heuristic skeletonization and the test is
  // meaningless.
  if (!existsSync(KANJIVG_SVG)) {
    console.error(`[debug] KanjiVG SVG not found at ${KANJIVG_SVG} — dataset is not populated locally.`);
    process.exit(1);
  }
  console.log(`[debug] KanjiVG SVG present: ${KANJIVG_SVG}`);

  const fontBuf = await loadFullNotoSansJp();
  const fontInfo = parseFont(fontBuf);
  console.log(`[debug] font: ${fontInfo.family} ${fontInfo.style} (${fontInfo.unitsPerEm} upem)`);

  // Intercept console.warn so we can tell from *inside* the script whether
  // the pipeline took the heuristic fallback branch. (generate.ts emits the
  // message `[generate] "<char>" not in KanjiVG dataset; falling back…`)
  const origWarn = console.warn;
  let heuristicFallbackWarned = false;
  console.warn = (...args: unknown[]) => {
    const msg = args.map(String).join(' ');
    if (/not in KanjiVG dataset/.test(msg)) heuristicFallbackWarned = true;
    origWarn(...args);
  };
  const result = processGlyph(fontInfo, char, { ...DEFAULT_OPTIONS, dataset: 'kanjivg', rhythm: 'lognormal' });
  console.warn = origWarn;
  if (!result) {
    console.error(`[debug] processGlyph returned null for "${char}"`);
    process.exit(1);
  }

  const strokes = result.strokesFontUnits;
  console.log(`\n[debug] polyline count (traced): ${result.polylines.length}`);
  console.log(`[debug] stroke count (ordered, font units): ${strokes.length}`);
  console.log(`[debug] KanjiVG expects: 2 strokes (left vertical first, right curve second)`);
  console.log(
    `[debug] pipeline branch taken: ${heuristicFallbackWarned ? 'HEURISTIC (datasetSkeleton returned null — manifest empty?)' : 'datasetSkeleton (KanjiVG lookup hit)'}`,
  );

  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i]!;
    const pts = s.points;
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    console.log(`\n[debug] stroke ${i + 1}: ${pts.length} points`);
    console.log(`  first 3 points:`);
    for (let k = 0; k < Math.min(3, pts.length); k++) {
      const p = pts[k]!;
      console.log(`    [${k}] x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} w=${p.width.toFixed(2)}`);
    }
    console.log(`  last point:   x=${last.x.toFixed(2)} y=${last.y.toFixed(2)} w=${last.width.toFixed(2)}`);
    console.log(`  first.x=${first.x.toFixed(2)} last.x=${last.x.toFixed(2)}  (vertical stroke → these are close)`);
  }

  // Summary verdict: KanjiVG says stroke 1 starts ~x=38.75 (left), stroke 2
  // starts ~x=69.37 (right), in a 109-unit canvas. Noto Sans JP uses 1000upem
  // so we expect stroke 1's first.x to be noticeably smaller than stroke 2's.
  if (strokes.length >= 2) {
    const s1x = strokes[0]!.points[0]!.x;
    const s2x = strokes[1]!.points[0]!.x;
    console.log(`\n[debug] VERDICT:`);
    console.log(`  stroke 1 first.x = ${s1x.toFixed(2)}`);
    console.log(`  stroke 2 first.x = ${s2x.toFixed(2)}`);
    console.log(`  stroke 1 is ${s1x < s2x ? 'LEFT of' : 'RIGHT of'} stroke 2`);
    console.log(`  → Node pipeline ordering is ${s1x < s2x ? 'CORRECT (matches KanjiVG)' : 'WRONG (reversed)'}`);
  }
}

await main();
