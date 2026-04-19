// Build the ja-kana pre-built bundle at packages/renderer/fonts/ja-kana/.
//
// Runs the Tegaki pipeline against Noto Sans JP subsetted to the 180 kana
// characters we cover and writes the generated bundle files (TTF, JSON,
// bundle.ts) into packages/renderer/fonts/ja-kana. Stroke order comes from
// the KanjiVG dataset (Phase 3) and rhythm from the Sigma-Lognormal model
// (Phase 5).
//
// We bypass the padrone CLI because its HTTP client is flaky in this
// environment; this script fetches the font (subset + full) via `fetch`
// directly and feeds buffers to `extractTegakiBundle`.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { HIRAGANA, KATAKANA } from '../packages/dataset-cjk-kanjivg/scripts/allowlist.ts';
import { DEFAULT_OPTIONS, extractTegakiBundle } from '../packages/generator/src/commands/generate.ts';

const ROOT = resolve(import.meta.dir, '..');
const CACHE_DIR = resolve(ROOT, 'packages/generator/.cache/fonts');
const OUT_DIR = resolve(ROOT, 'packages/renderer/fonts/ja-kana');
const FAMILY = 'Noto Sans JP';
const UA = 'tegaki/1.0';

/** Extract every `url(...)` advertised as `format('truetype')` from a Google Fonts CSS response. */
function extractTtfUrls(css: string): string[] {
  return [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]truetype['"]\)/g)].map((m) => m[1]!);
}

// Bun.fetch on Windows occasionally returns ConnectionRefused for the Google
// Fonts CSS endpoint (the same URL works fine through curl, so we shell out
// to curl to dodge that flakiness).
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

async function fetchCss(urlParams: string): Promise<string> {
  const url = `https://fonts.googleapis.com/css2?${urlParams}`;
  return curlText(url);
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  return curlBytes(url);
}

async function cachedFont(cacheName: string, cssParams: string): Promise<ArrayBuffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, cacheName);
  if (existsSync(cached)) return Bun.file(cached).arrayBuffer();
  const css = await fetchCss(cssParams);
  const urls = extractTtfUrls(css);
  if (urls.length === 0) throw new Error(`no TTF in CSS response for ${cssParams}:\n${css.slice(0, 400)}`);
  console.log(`[ja-kana] downloading ${cacheName} from ${urls[0]!.slice(0, 80)}…`);
  const buf = await fetchBytes(urls[0]!);
  writeFileSync(cached, Buffer.from(buf));
  return buf;
}

async function main(): Promise<void> {
  const chars = [...HIRAGANA, ...KATAKANA].map((cp) => String.fromCodePoint(cp)).join('');
  console.log(`[ja-kana] processing ${chars.length} characters`);

  // Subsetted TTF (only the kana glyphs) — goes into the bundle tarball.
  // The full Noto Sans JP is 5 MB; we intentionally skip the full-font
  // fallback here so the bundle stays well under 300 KB (NFR-5.1). Users
  // rendering text with non-kana characters should bring their own
  // fallback font or wait for a future `ja-full` bundle.
  const subsetBuf = await cachedFont(
    `noto-sans-jp-kana-${chars.length}.ttf`,
    `family=${encodeURIComponent(FAMILY)}&text=${encodeURIComponent(chars)}`,
  );

  const result = extractTegakiBundle({
    fontBuffer: subsetBuf,
    fontFileName: 'noto-sans-jp-kana.ttf',
    chars,
    options: { ...DEFAULT_OPTIONS, dataset: 'kanjivg', rhythm: 'lognormal' },
    subset: true,
    onProgress: (msg, p) => {
      if (p !== undefined && (p === 1 || Math.round(p * 100) % 10 === 0)) {
        console.log(`[ja-kana] ${Math.round(p * 100)}%  ${msg}`);
      }
    },
  });

  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of result.files) {
    const dst = join(OUT_DIR, f.path);
    if (typeof f.content === 'string') writeFileSync(dst, f.content, 'utf-8');
    else writeFileSync(dst, f.content);
  }

  console.log(
    `[ja-kana] wrote ${result.files.length} files to ${OUT_DIR}; processed=${result.stats.processed} skipped=${result.stats.skipped}`,
  );
}

await main();
