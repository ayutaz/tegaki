# @tegaki/dataset-cjk-kanjivg

KanjiVG stroke-order data packaged for [Tegaki](https://github.com/ayutaz/tegaki).

> ⚠️ **License notice** — this package contains **CC-BY-SA 3.0** licensed data from
> [KanjiVG](https://kanjivg.tagaini.net/). It is **not** MIT-licensed and is
> isolated from the main Tegaki packages on purpose. Installing this package
> is an explicit opt-in to the CC-BY-SA 3.0 share-alike terms. See
> [`LICENSE`](./LICENSE) and [`ATTRIBUTION.md`](./ATTRIBUTION.md).

## Install

```bash
bun add @tegaki/dataset-cjk-kanjivg
# or
npm install @tegaki/dataset-cjk-kanjivg
```

## Use

```ts
import { getKanjiSvg, hasKanji, KANJIVG_SHA } from '@tegaki/dataset-cjk-kanjivg';

// "右" U+53F3
const svg = getKanjiSvg(0x53f3);
//     ^? string | null  (SVG markup string, or null if not covered)

if (hasKanji(0x53f3)) {
  console.log(`KanjiVG release ${KANJIVG_SHA} contains "右"`);
}
```

### Coverage

| Range | Count | Covered |
|---|---|---|
| Jōyō kanji (常用漢字) | 2,136 | **100%** |
| Jinmeiyō kanji (人名用漢字) | 863 | **≥ 95%** |
| Hiragana (ひらがな, U+3041–U+3096 + ゝゞ) | 89 | **100%** |
| Katakana (カタカナ, U+30A1–U+30FA + ヽヾ) | 90 | **100%** |
| JIS Level 3/4, CJK Compatibility | — | not included (first release) |

Characters outside coverage return `null` from `getKanjiSvg()`. Tegaki's
renderer pipeline falls back to a geometric heuristic for uncovered glyphs.

## API

```ts
/** Return the raw KanjiVG SVG as a UTF-8 string, or null if the codepoint is not covered. */
export function getKanjiSvg(codepoint: number): string | null;

/** Cheap existence check without any file I/O. */
export function hasKanji(codepoint: number): boolean;

/** Iterate over every covered codepoint, ascending-sorted and stable. */
export function listCodepoints(): Iterable<number>;

/** Metadata entry for a single covered codepoint. */
export function getManifestEntry(codepoint: number): KanjiManifestEntry | null;

/** Upstream KanjiVG git SHA / release tag (e.g. "r20250816"). */
export const KANJIVG_SHA: string;
```

The API is synchronous by design: it reads SVG files lazily from the bundled
`kanjivg/` directory via `node:fs`. Browser consumers should go through the
renderer layer, which does coordinate/stroke extraction server-side or at
build time.

## Populating / refreshing the data

The bundled SVGs are **not checked into git** — they are fetched on demand
from the pinned upstream release (currently `r20250816`). Run once after
cloning:

```bash
cd packages/dataset-cjk-kanjivg
bun run fetch-kanjivg
```

The script:

1. Downloads the upstream tarball from GitHub releases
2. Verifies its SHA-256 against `EXPECTED_TARBALL_SHA256` in
   [`src/constants.ts`](./src/constants.ts)
3. Filters by the allowlist in [`scripts/allowlist.ts`](./scripts/allowlist.ts)
   (hiragana, katakana, Jōyō / Jinmeiyō kanji — out-of-scope variants and JIS
   Level 3/4 are dropped)
4. Regenerates [`src/manifest.ts`](./src/manifest.ts) with the covered
   codepoints

The published npm tarball **does include** the filtered SVG set, so end users
do not need to run the fetch script — only contributors working on the
package itself.

## License

- **This package (dataset)**: CC-BY-SA 3.0 — see [`LICENSE`](./LICENSE) and
  [`ATTRIBUTION.md`](./ATTRIBUTION.md)
- **Tegaki core packages** (`tegaki`, `tegaki-generator`, `@tegaki/website`):
  MIT — unaffected by this package's share-alike requirement
