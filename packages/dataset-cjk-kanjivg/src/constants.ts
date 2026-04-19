import { resolve } from 'node:path';

/** Upstream KanjiVG git SHA / release tag the bundled SVGs originate from. */
export const KANJIVG_SHA = 'r20250816' as const;

/** Tarball URL for the pinned release. Single source of truth for scripts/fetch-kanjivg.ts. */
export const KANJIVG_RELEASE_TARBALL_URL = `https://github.com/KanjiVG/kanjivg/archive/refs/tags/${KANJIVG_SHA}.tar.gz` as const;

/** Sentinel value meaning "accept any sha256" — used when re-pinning a release. */
export const UNPINNED_SENTINEL = '__UNPINNED__';

/**
 * sha256 of the upstream tarball at `KANJIVG_SHA` (verified on 2026-04-19).
 * Updated manually on release bumps after integrity review.
 * Set to `UNPINNED_SENTINEL` to accept any sha256.
 */
export const EXPECTED_TARBALL_SHA256: string = '9dfd8ab58c82a4a2ad4c92480a4f80abf13042497c20af49ce081916193d950f';

/** Absolute path to the SVG directory bundled inside this package. */
export const KANJIVG_DIR = resolve(import.meta.dir, '..', 'kanjivg');
