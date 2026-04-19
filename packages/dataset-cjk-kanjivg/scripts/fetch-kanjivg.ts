// Populate `kanjivg/*.svg` and `src/manifest.ts` from the pinned KanjiVG release.
//
// Usage:
//   bun scripts/fetch-kanjivg.ts
//
// The script is idempotent: rerunning it with an already-downloaded tarball
// skips the network fetch and just re-extracts. The expected sha256 of the
// tarball is verified before extraction; a mismatch aborts with a clear error.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { EXPECTED_TARBALL_SHA256, KANJIVG_DIR, KANJIVG_RELEASE_TARBALL_URL, KANJIVG_SHA, UNPINNED_SENTINEL } from '../src/constants.ts';
import { buildAllowedCodepoints } from './allowlist.ts';

const SCRIPT_DIR = import.meta.dir;
const PKG_DIR = resolve(SCRIPT_DIR, '..');
const CACHE_DIR = resolve(PKG_DIR, '.cache');
const TARBALL_PATH = resolve(CACHE_DIR, `kanjivg-${KANJIVG_SHA}.tar.gz`);
const EXTRACT_DIR = resolve(CACHE_DIR, `extracted-${KANJIVG_SHA}`);
const MANIFEST_PATH = resolve(PKG_DIR, 'src', 'manifest.ts');

const VARIANT_SUFFIXES = ['-Kaisho', '-Jinmei', '-HyogaiKanji', '-DaSeM'];

async function downloadTarball(): Promise<Buffer> {
  if (existsSync(TARBALL_PATH)) {
    console.log(`[fetch-kanjivg] reusing cached tarball: ${TARBALL_PATH}`);
    return Buffer.from(await Bun.file(TARBALL_PATH).arrayBuffer());
  }
  console.log(`[fetch-kanjivg] downloading ${KANJIVG_RELEASE_TARBALL_URL}`);
  const res = await fetch(KANJIVG_RELEASE_TARBALL_URL, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`KanjiVG download failed: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(TARBALL_PATH, buf);
  return buf;
}

function verifySha256(buf: Buffer): string {
  const actual = createHash('sha256').update(buf).digest('hex');
  if (EXPECTED_TARBALL_SHA256 === UNPINNED_SENTINEL) {
    console.warn(
      `[fetch-kanjivg] EXPECTED_TARBALL_SHA256 is unpinned. Observed sha256: ${actual}\n` +
        '  → After reviewing the tarball, update src/constants.ts to pin this value.',
    );
  } else if (actual !== EXPECTED_TARBALL_SHA256) {
    throw new Error(
      `KanjiVG tarball sha256 mismatch!\n  expected: ${EXPECTED_TARBALL_SHA256}\n  actual:   ${actual}\n` +
        'Upstream release may have been re-rolled. Update EXPECTED_TARBALL_SHA256 only after integrity review.',
    );
  } else {
    console.log(`[fetch-kanjivg] sha256 ok: ${actual}`);
  }
  return actual;
}

function extractTarball(): void {
  rmSync(EXTRACT_DIR, { recursive: true, force: true });
  mkdirSync(EXTRACT_DIR, { recursive: true });
  // GNU tar on Windows misparses backslashes and drive-letter colons. Run with
  // cwd=PKG_DIR and pass relative POSIX-style paths so the tar binary gets
  // unambiguous inputs across Windows / macOS / Linux.
  const rel = (abs: string) => abs.slice(PKG_DIR.length + 1).replace(/\\/g, '/');
  const result = spawnSync('tar', ['--force-local', '-xzf', rel(TARBALL_PATH), '-C', rel(EXTRACT_DIR)], { stdio: 'inherit', cwd: PKG_DIR });
  if (result.status !== 0) {
    throw new Error(`tar extraction failed with exit code ${result.status}. Is GNU tar available?`);
  }
}

function findKanjiDir(): string {
  // GitHub release tarballs unpack into `kanjivg-<sha>/kanji/`.
  const entries = readdirSync(EXTRACT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = join(EXTRACT_DIR, entry.name, 'kanji');
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`Could not locate 'kanji/' directory under ${EXTRACT_DIR}`);
}

interface CopyResult {
  covered: Map<number, string>;
  skippedVariant: number;
  skippedOutOfRange: number;
}

function copyAllowed(kanjiDir: string): CopyResult {
  const allowed = buildAllowedCodepoints();
  // Remove stale .svg files only — keep committed files like README_KANJIVG.md
  // and any auxiliary metadata that lives alongside the dataset.
  mkdirSync(KANJIVG_DIR, { recursive: true });
  for (const existing of readdirSync(KANJIVG_DIR)) {
    if (existing.endsWith('.svg')) rmSync(join(KANJIVG_DIR, existing), { force: true });
  }

  const covered = new Map<number, string>();
  let skippedVariant = 0;
  let skippedOutOfRange = 0;

  for (const file of readdirSync(kanjiDir)) {
    if (!file.endsWith('.svg')) continue;
    if (VARIANT_SUFFIXES.some((sfx) => file.includes(sfx))) {
      skippedVariant++;
      continue;
    }
    const stem = file.slice(0, -4);
    const cp = parseInt(stem, 16);
    if (!Number.isFinite(cp)) continue;
    if (!allowed.has(cp)) {
      skippedOutOfRange++;
      continue;
    }
    copyFileSync(join(kanjiDir, file), join(KANJIVG_DIR, file));
    covered.set(cp, file);
  }

  return { covered, skippedVariant, skippedOutOfRange };
}

function writeManifest(covered: Map<number, string>): void {
  const sorted = [...covered.entries()].sort(([a], [b]) => a - b);
  const lines: string[] = [
    '// Auto-generated by scripts/fetch-kanjivg.ts. Do not edit by hand.',
    '// Map from Unicode codepoint to KanjiVG SVG file metadata.',
    '',
    'export interface KanjiManifestEntry {',
    '  file: string;',
    '}',
    '',
    'export const MANIFEST: ReadonlyMap<number, KanjiManifestEntry> = new Map([',
  ];
  for (const [cp, file] of sorted) {
    const hex = cp.toString(16).padStart(4, '0').toUpperCase();
    lines.push(`  [0x${hex}, { file: ${JSON.stringify(file)} }],`);
  }
  lines.push(']);');
  lines.push('');
  writeFileSync(MANIFEST_PATH, lines.join('\n'), 'utf-8');
}

function removeCachedTarballOnSuccess(): void {
  // Optional: keep the cache for next run. Flip this flag to clean up.
  const shouldClean = process.env.KANJIVG_CLEAN_CACHE === '1';
  if (shouldClean && existsSync(TARBALL_PATH)) unlinkSync(TARBALL_PATH);
}

async function main(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const tarball = await downloadTarball();
  verifySha256(tarball);
  extractTarball();
  const kanjiDir = findKanjiDir();
  const { covered, skippedVariant, skippedOutOfRange } = copyAllowed(kanjiDir);
  writeManifest(covered);
  removeCachedTarballOnSuccess();

  console.log(
    `[fetch-kanjivg] ${KANJIVG_SHA}: ${covered.size} SVGs written ` +
      `(skipped ${skippedVariant} variants, ${skippedOutOfRange} out-of-allowlist).`,
  );
}

await main();
