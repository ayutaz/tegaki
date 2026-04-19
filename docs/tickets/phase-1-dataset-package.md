# Phase 1: データセットパッケージ雛形 `@tegaki/dataset-cjk-kanjivg`

> 日本語対応実装の初段マイルストーン。KanjiVG の CC-BY-SA 3.0 ライセンスを本体 MIT から隔離した専用ワークスペースパッケージを立ち上げ、後段の KanjiVG ローダー（Phase 2）が `import` で参照できる最小 API（`getKanjiSvg(codepoint)` 等）と SVG データ供給基盤を提供する。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **1 / 8** |
| マイルストーン名 | データセットパッケージ雛形 `@tegaki/dataset-cjk-kanjivg` |
| ブランチ名 | `feat/ja-phase1-dataset-package` |
| ステータス | ✅ 完了 (merged in `5a560f6`) |
| 依存（前段） | なし（本プロジェクトの最初のフェーズ） |
| 依存（後段） | [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md) がこのパッケージを `dependencies` に加えて参照 |
| 想定期間 | **3 営業日** (一人稼働) |
| 担当見積 | 設計 0.5d + 実装 1.5d + テスト 0.5d + レビュー対応 0.5d |
| 関連要件 | [requirements.md](../requirements.md) FR-2.6 / FR-2.7 / FR-2.8 / NFR-4 / NFR-5 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §3-1 / §4 / §7 |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §2 Phase 1 |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §1-1 / §1-4 / §1-6 / §3-1 |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| `packages/dataset-cjk-kanjivg/` ディレクトリ新設と bun workspaces 登録 | SVG → ストローク配列パース（Phase 2） |
| KanjiVG の固定バージョン（`r20250816`）取得スクリプト | `kvg:type` の終端種別分類ロジック（Phase 2） |
| `getKanjiSvg(codepoint): string \| null` の最小 API | 座標変換・ラスタ投影（Phase 3） |
| `ATTRIBUTION.md` / `LICENSE` の整備（CC-BY-SA 3.0 表記） | 仮名バンドル生成（Phase 4） |
| バンドルサイズ ≤ 5 MB を守る `files` フィールド設計 | Sigma-Lognormal 実装（Phase 5） |
| 他パッケージから `import` できることの e2e 確認 | 視覚検証（Phase 6） |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-support.md §4](../japanese-support.md) で確定した「**本体 MIT 維持 + KanjiVG を CC-BY-SA 3.0 の別パッケージに隔離**」戦略を実装レイヤに落とす。具体的には以下の 3 点を解決する。

1. **ライセンス分離の物理的担保** — KanjiVG 由来データが `tegaki` / `tegaki-generator` / `@tegaki/website` の tarball に混入しないよう、ファイルレベルで workspace を分離する。
2. **KanjiVG データへの単一アクセス窓口** — 後段の Phase 2 ローダーや Phase 3 パイプラインが「どこから SVG を読むか」を気にせず、`getKanjiSvg(0x53f3)` という一行で「右」の SVG 文字列が取れる抽象層を提供する。
3. **データ不変性の保証** — KanjiVG は GitHub リリース毎に座標が微調整される ([technical-validation.md §1-6 落とし穴 9](../technical-validation.md))。固定 git SHA（`r20250816`）で pin したセットアップスクリプトで取得し、ビルドの再現性を守る。

### 2-2. Done の定義（測定可能）

以下 **10 項目すべて** を満たしたときチケット完了とする。

- [ ] **D-1** `packages/dataset-cjk-kanjivg/package.json` が存在し、`name: "@tegaki/dataset-cjk-kanjivg"`, `license: "CC-BY-SA-3.0"` で登録されている
- [ ] **D-2** ルート `package.json` の `workspaces` 配列に `packages/dataset-cjk-kanjivg` が含まれる（`packages/*` ワイルドカードで自動包含されるため実質は `bun install` が成功すること）
- [ ] **D-3** `packages/dataset-cjk-kanjivg/kanjivg/` 以下に KanjiVG の SVG ファイル（CJK 統合漢字 + 仮名、`r20250816` リリース）が配置されている（正確な字数は「常用漢字 2,136 字 + 人名用漢字 863 字 + ひらがな 89 字 + カタカナ 90 字」= **合計約 3,178 字**を最低ライン）
- [ ] **D-4** `ATTRIBUTION.md` に KanjiVG の (1) 著作者、(2) CC-BY-SA 3.0 表記、(3) share-alike 要件、(4) 入手元 URL、(5) 固定 SHA `r20250816`、(6) 変更有無の記載が含まれる
- [ ] **D-5** `src/index.ts` から `getKanjiSvg(codepoint: number): string | null` がエクスポートされ、存在字には SVG 文字列、未収録字には `null` を返す
- [ ] **D-6** 他のワークスペースパッケージ（テスト用に generator package）から `import { getKanjiSvg } from '@tegaki/dataset-cjk-kanjivg'` が解決できる
- [ ] **D-7** `bun install` → `bun test --filter @tegaki/dataset-cjk-kanjivg` → `bun typecheck` → `bun check` が全通する
- [ ] **D-8** `npm pack --dry-run` の tarball サイズが **≤ 5 MB**（[requirements.md NFR-5.2](../requirements.md)）
- [ ] **D-9** README または ATTRIBUTION 内で、本パッケージの CC-BY-SA 3.0 が tegaki 本体 (MIT) から隔離されていること、および利用者が opt-in でインストールする前提がユーザー向けに説明されている
- [ ] **D-10** セットアップスクリプト（`scripts/fetch-kanjivg.ts` 等）によって SVG データを git SHA `r20250816` で再現取得でき、取得成功後に SHA を verify するロジックが走る

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（最終形）

```
packages/dataset-cjk-kanjivg/
├── package.json                    # name / license / files / exports
├── LICENSE                         # CC-BY-SA 3.0 全文
├── ATTRIBUTION.md                  # KanjiVG の帰属表記
├── README.md                       # インストール方法・ライセンス警告・使用例
├── tsconfig.json                   # 他パッケージと同じベース継承
├── .gitignore                      # .cache/, node_modules, dist
├── scripts/
│   └── fetch-kanjivg.ts            # git SHA r20250816 で SVG を取得するセットアップスクリプト
├── src/
│   ├── index.ts                    # public API: getKanjiSvg / hasKanji / listCodepoints
│   ├── manifest.ts                 # 収録字リスト（codepoint -> 相対パス）
│   ├── constants.ts                # KANJIVG_SHA = 'r20250816' 等
│   └── index.test.ts               # Bun test: getKanjiSvg('右'), 未収録字, ひらがな
└── kanjivg/                        # KanjiVG SVG（本スクリプト実行で populate）
    ├── 03042.svg                   # U+3042 あ
    ├── 03044.svg                   # U+3044 い
    ├── ...
    ├── 053f3.svg                   # U+53F3 右
    └── README_KANJIVG.md           # 「このディレクトリは KanjiVG (CC-BY-SA 3.0) の SVG である」注意書き
```

> **補足**: `kanjivg/` ディレクトリは **git 管理下に含める**。理由は (1) `bun install` 時に追加のネットワーク取得が不要になる、(2) 固定 SHA pin の再現性を最も強く担保できる、(3) 後続 CI で `bun test` が外部接続不要で完結する。ただしサイズ制約（≤ 5 MB）を満たすため、(a) JIS 第 3/4 水準、(b) バリアントファイル（`*-Kaisho.svg`, `*-Jinmei.svg` 等）は `.gitignore` ではなく `files` フィールドで**配布時に除外**する方針（[requirements.md FR-2.5](../requirements.md)）。

### 3-2. `package.json` の完全な内容

```json
{
  "name": "@tegaki/dataset-cjk-kanjivg",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "description": "KanjiVG stroke data for CJK characters, packaged for Tegaki. Contains CC-BY-SA 3.0 licensed content.",
  "keywords": ["kanjivg", "cjk", "kanji", "stroke-order", "japanese", "tegaki", "dataset"],
  "homepage": "https://github.com/ayutaz/tegaki/tree/main/packages/dataset-cjk-kanjivg#readme",
  "bugs": { "url": "https://github.com/ayutaz/tegaki/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ayutaz/tegaki.git",
    "directory": "packages/dataset-cjk-kanjivg"
  },
  "license": "CC-BY-SA-3.0",
  "author": { "name": "Tegaki contributors" },
  "contributors": [{ "name": "KanjiVG project", "url": "https://kanjivg.tagaini.net/" }],
  "exports": {
    ".": {
      "tegaki@dev": "./src/index.ts",
      "source": "./src/index.ts",
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./manifest": {
      "tegaki@dev": "./src/manifest.ts",
      "source": "./src/manifest.ts",
      "types": "./dist/manifest.d.mts",
      "import": "./dist/manifest.mjs"
    }
  },
  "files": ["dist/", "src/", "kanjivg/*.svg", "LICENSE", "ATTRIBUTION.md", "README.md"],
  "scripts": {
    "fetch-kanjivg": "bun scripts/fetch-kanjivg.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "build": "tsdown"
  },
  "dependencies": {},
  "peerDependencies": {},
  "devDependencies": {
    "@types/bun": "^1.3.12",
    "tsdown": "^0.21.8",
    "typescript": "^6.0.2"
  }
}
```

**設計ポイント**
- `private: false` — Phase 8 のリリース判断で npm publish 可能な状態を維持。
- `license: "CC-BY-SA-3.0"` — SPDX 識別子 ([SPDX License List](https://spdx.org/licenses/))。`"MIT"` から文字列レベルで切り分け、ライセンス scanner が誤検知しないようにする。
- `dependencies: {}` — 実行時に外部依存ゼロ。SVG は単なる静的ファイル読み込みで完結させる。
- `peerDependencies: {}` — Phase 2 の loader 側で `@xmldom/xmldom` 等を持つ。このパッケージは**データ供給のみ**に責任を限定する。
- `files` フィールドの `kanjivg/*.svg` — バリアントファイル（`*-Kaisho.svg`, `*-Jinmei*.svg` 等）はこのパターンにマッチせず tarball から自動除外される…ではなく、**マッチする**ため ([requirements.md FR-2.5](../requirements.md) で除外が要件)、次節の fetch スクリプトで**ダウンロード段階で除外**する方針に揃える。

### 3-3. `ATTRIBUTION.md` の内容サンプル

```markdown
# Attribution — KanjiVG

The SVG files under `kanjivg/` in this package are derived from the **KanjiVG
project** and are distributed under the **Creative Commons Attribution-ShareAlike
3.0 Unported (CC-BY-SA 3.0)** license.

## Source

- Project page: https://kanjivg.tagaini.net/
- Repository:  https://github.com/KanjiVG/kanjivg
- Release:     `r20250816` (git SHA pinned; see `src/constants.ts`)
- Downloaded:  via `bun scripts/fetch-kanjivg.ts`

## License

The KanjiVG SVG data is Copyright (C) 2009–2025 Ulrich Apel and KanjiVG
contributors, and is licensed under CC-BY-SA 3.0.

- License text: https://creativecommons.org/licenses/by-sa/3.0/legalcode
- See also `./LICENSE` in this package.

## ShareAlike notice

Redistributions of this package, modifications to SVG content, or derivative
works containing these SVG files **must be distributed under CC-BY-SA 3.0 or a
compatible license** (see CC "Compatible Licenses" list).

The Tegaki project isolates this dataset in a dedicated workspace package —
`@tegaki/dataset-cjk-kanjivg` — so that the CC-BY-SA 3.0 share-alike obligation
does **not** propagate to the main `tegaki` (renderer) and `tegaki-generator`
packages, which remain under the **MIT License**.

Users who install `@tegaki/dataset-cjk-kanjivg` thereby opt in to the
CC-BY-SA 3.0 terms for the dataset portion only.

## Modifications to upstream

This package includes the SVG files **as-is** from upstream
`KanjiVG/kanjivg @ r20250816`, filtered to exclude variant files
(`*-Kaisho.svg`, `*-Jinmei.svg`, etc.) and JIS level 3/4 characters that
are out of scope for Tegaki's first Japanese release.

No edits are made to the SVG content; no `<path d="...">` coordinate, no
`kvg:element` or `kvg:type` attribute, is modified.

## Citation

When you publish work (academic, commercial, or otherwise) that uses these
stroke-order animations, please cite:

> KanjiVG — Stroke order animations of the kanji.  
> https://kanjivg.tagaini.net/  Ulrich Apel and contributors, 2009–2025.
```

### 3-4. KanjiVG データの取得方法（固定 SHA `r20250816`）

**方針**: GitHub Release の **tarball を固定 SHA で取得**し、展開後 SHA 一致検証を行う。セットアップスクリプトは CI・ローカル両方で再現実行できるよう冪等 (idempotent) に設計する。

`scripts/fetch-kanjivg.ts` 擬似コード（骨子のみ。実装時に完成させる）:

```ts
// packages/dataset-cjk-kanjivg/scripts/fetch-kanjivg.ts
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as z from 'zod/v4';

import { EXPECTED_TARBALL_SHA256, KANJIVG_RELEASE_TARBALL_URL, KANJIVG_SHA } from '../src/constants.ts';

const OUT_DIR = resolve(import.meta.dir, '..', 'kanjivg');
const CACHE_DIR = resolve(import.meta.dir, '..', '.cache');
const VARIANT_SUFFIXES = ['-Kaisho', '-Jinmei', '-HyogaiKanji', '-DaSeM'];

const allowlistSchema = z.object({
  joyo: z.array(z.number().int()),    //  2,136 chars
  jinmei: z.array(z.number().int()),  //   ~863 chars
  kana: z.array(z.number().int()),    //    179 chars
});

async function main() {
  // 1. download tarball to .cache/ (idempotent: re-use if sha256 matches)
  const tarball = await downloadWithCache(KANJIVG_RELEASE_TARBALL_URL, CACHE_DIR);

  // 2. verify sha256 — refuse to run against a drifted release
  const actual = createHash('sha256').update(tarball).digest('hex');
  if (actual !== EXPECTED_TARBALL_SHA256) {
    throw new Error(
      `KanjiVG tarball sha256 mismatch!\n  expected: ${EXPECTED_TARBALL_SHA256}\n  actual:   ${actual}\n` +
        `Upstream release may have been re-rolled. Update EXPECTED_TARBALL_SHA256 only after review.`,
    );
  }

  // 3. extract, filter by allowlist + variant-suffix, write SVGs to kanjivg/
  const allow = allowlistSchema.parse(JSON.parse(await readFile(resolve(import.meta.dir, 'allowlist.json'), 'utf-8')));
  const allowed = new Set<number>([...allow.joyo, ...allow.jinmei, ...allow.kana]);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let included = 0;
  for (const entry of await extractTarball(tarball)) {
    if (VARIANT_SUFFIXES.some((sfx) => entry.name.includes(sfx))) continue;
    const cp = parseInt(entry.name.replace('.svg', ''), 16);
    if (!Number.isFinite(cp) || !allowed.has(cp)) continue;
    await writeFile(join(OUT_DIR, entry.name), entry.content);
    included++;
  }

  // 4. emit src/manifest.ts (deterministic generated module, committed to git)
  await writeManifestModule(OUT_DIR, included);
  console.log(`[fetch-kanjivg] ${KANJIVG_SHA}: ${included} SVGs written.`);
}

// helpers: downloadWithCache / extractTarball / writeManifestModule — see implementation.
await main();
```

**補助ファイル `scripts/allowlist.json`** — 常用 + 人名用 + 仮名の codepoint 配列を事前に収めておく。このファイル自体は Tegaki 側で生成する（公的ソース[常用漢字表](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/kanji/) + 人名用漢字表から機械的に作成）ため KanjiVG のライセンスには影響しない。

### 3-5. `src/index.ts` のエクスポート API

**最小責務**: (1) codepoint → SVG 文字列の lookup、(2) 存在確認、(3) 全収録 codepoint のイテレート。パース・ストローク配列化は Phase 2 の責務。

```ts
// packages/dataset-cjk-kanjivg/src/index.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KANJIVG_DIR } from './constants.ts';
import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';

/** Metadata about a single SVG entry (minimal; may grow in Phase 2). */
export interface KanjiManifestEntry {
  file: string;
}

/**
 * Load the raw KanjiVG SVG string for a single codepoint.
 * Synchronous by design — see docs/tickets/phase-1-dataset-package.md §11 for the rationale.
 *
 * @param codepoint Unicode codepoint, e.g. `0x53f3` for 「右」. BMP only for the first release.
 * @returns The SVG as a UTF-8 string, or `null` if the codepoint is not covered
 *          (e.g. JIS L3/L4, CJK compat, emoji).
 */
export function getKanjiSvg(codepoint: number): string | null {
  const entry = MANIFEST.get(codepoint);
  if (!entry) return null;
  try {
    return readFileSync(join(KANJIVG_DIR, entry.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Cheap existence check (no file I/O). Used in the `isCJK(char) && dataset.has(char)` dispatch. */
export function hasKanji(codepoint: number): boolean {
  return MANIFEST.has(codepoint);
}

/** Iterate over all covered codepoints — ascending sorted, stable across runs. */
export function listCodepoints(): Iterable<number> {
  return MANIFEST.keys();
}

export function getManifestEntry(codepoint: number): KanjiManifestEntry | null {
  return MANIFEST.get(codepoint) ?? null;
}
```

**補足**: `src/manifest.ts` は `scripts/fetch-kanjivg.ts` によって**生成される**（`Map<number, KanjiManifestEntry>`）。手書きしない。再現性のため `git` に commit する。

### 3-6. `src/constants.ts` サンプル

```ts
// packages/dataset-cjk-kanjivg/src/constants.ts
import { resolve } from 'node:path';

/** Upstream KanjiVG git SHA / release tag the bundled SVGs originate from. */
export const KANJIVG_SHA = 'r20250816' as const;

/** Tarball URL for the pinned release. Kept here so scripts/fetch-kanjivg.ts has a single source of truth. */
export const KANJIVG_RELEASE_TARBALL_URL =
  `https://github.com/KanjiVG/kanjivg/archive/refs/tags/${KANJIVG_SHA}.tar.gz` as const;

/**
 * sha256 of the upstream tarball at `KANJIVG_SHA`.
 * Updated manually on release bumps after integrity review.
 * See scripts/fetch-kanjivg.ts.
 */
export const EXPECTED_TARBALL_SHA256 =
  '<to-be-filled-at-implementation-time>' as const;

export const KANJIVG_DIR = resolve(import.meta.dir, '..', 'kanjivg');
```

---

## §4. エージェントチーム構成

Phase 1 は 3 名編成のスモールチーム。必要スキルセットと担当成果物を以下に示す。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **パッケージ設計リード** | 1 | `package.json`, `tsconfig.json`, workspace 連携、`src/index.ts` / `constants.ts` / `manifest.ts` 設計、`exports` マップ、後続 Phase 2 からの import 確認 | Bun workspaces, TypeScript strict, ESM exports map | 1.5d |
| 2 | **ライセンス / 帰属担当** | 1 | `LICENSE` (CC-BY-SA 3.0 全文配置), `ATTRIBUTION.md`, `README.md` の免責と opt-in 説明、SPDX 識別子検証、MIT 本体との分離が法的に成立していることの確認 | OSS ライセンス知識（特に share-alike 系）、SPDX、CC ライセンス互換性 | 0.5d |
| 3 | **データ取得 / テスト担当** | 1 | `scripts/fetch-kanjivg.ts` 実装、`scripts/allowlist.json` 作成、SHA pin と完全性検証、`src/index.test.ts` のユニットテスト、サイズ計測（`npm pack --dry-run`） | Bun scripting, tar 展開、sha256 検証、Bun test runner | 1.0d |

**並列化の余地**: #2 (ライセンス) は #1/#3 と独立に進められる。#3 のデータ取得スクリプトは #1 の `constants.ts` に依存するが、#1 がまず定数のみ先行 commit すれば #3 が並行開始できる。結果、直列では 3 日、並列なら **実働 1.5-2 日** まで短縮可能。

### 4-1. ロール間の受け渡し

```
 #1 constants.ts skeleton  ──┬──→ #3 fetch-kanjivg.ts 実装開始
                            └──→ #2 ATTRIBUTION.md / LICENSE
 #3 kanjivg/ populate  ────────→ #1 manifest.ts 生成, src/index.ts 完成
 #1, #2, #3 全完了 ───────────→ #3 tests + size check + bun checks
```

---

## §5. 提供範囲（Deliverables）

このチケットで納品するもののチェックリスト。レビュー時に PR 本文へ貼り付けて使用する。

### 5-1. コード成果物

- [ ] `packages/dataset-cjk-kanjivg/package.json`
- [ ] `packages/dataset-cjk-kanjivg/tsconfig.json`（ルート tsconfig を extends）
- [ ] `packages/dataset-cjk-kanjivg/.gitignore`（`.cache/`, `dist/`, `node_modules/`）
- [ ] `packages/dataset-cjk-kanjivg/src/index.ts`（public API: `getKanjiSvg`, `hasKanji`, `listCodepoints`, `getManifestEntry`, `KANJIVG_SHA`）
- [ ] `packages/dataset-cjk-kanjivg/src/constants.ts`（`KANJIVG_SHA`, `KANJIVG_RELEASE_TARBALL_URL`, `EXPECTED_TARBALL_SHA256`, `KANJIVG_DIR`）
- [ ] `packages/dataset-cjk-kanjivg/src/manifest.ts`（`Map<number, KanjiManifestEntry>` の自動生成物）
- [ ] `packages/dataset-cjk-kanjivg/src/index.test.ts`（§7 のケース群）
- [ ] `packages/dataset-cjk-kanjivg/scripts/fetch-kanjivg.ts`
- [ ] `packages/dataset-cjk-kanjivg/scripts/allowlist.json`

### 5-2. データ成果物

- [ ] `packages/dataset-cjk-kanjivg/kanjivg/*.svg`（約 3,178 ファイル、すべて `r20250816` 由来）
- [ ] `packages/dataset-cjk-kanjivg/kanjivg/README_KANJIVG.md`（ディレクトリ直下の注意書き）

### 5-3. ドキュメント成果物

- [ ] `packages/dataset-cjk-kanjivg/LICENSE`（CC-BY-SA 3.0 全文）
- [ ] `packages/dataset-cjk-kanjivg/ATTRIBUTION.md`（§3-3 サンプルの実装版）
- [ ] `packages/dataset-cjk-kanjivg/README.md`（インストール方法、使用例、ライセンス警告）
- [ ] ルート `docs/tickets/README.md` のステータス列を「📝 未着手」→「🚧 実装中」→「✅ 完了」で遷移更新

### 5-4. プロジェクト管理成果物

- [ ] `feat/ja-phase1-dataset-package` ブランチから `main` への PR 作成
- [ ] PR 本文に本チェックリストを埋め込み、CC-BY-SA 3.0 に関する注記を冒頭に明示
- [ ] Phase 2 チケット ([phase-2-kanjivg-loader.md](./phase-2-kanjivg-loader.md)) に §12 の申し送り事項を反映

---

## §6. テスト項目（受入基準ベース）

[requirements.md FR-2](../requirements.md) の各項目を Phase 1 の範囲にマッピングしたテストケース。Phase 1 は「データ供給層」のためパース系は Phase 2 に委譲しているが、**データ取得の正当性**と**API シグネチャの契約**はここで担保する。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | FR-2.6 | `KANJIVG_SHA` が `'r20250816'` にハードコードされている | 定数一致 | unit |
| T-02 | FR-2.6 | `EXPECTED_TARBALL_SHA256` と実 tarball の sha256 が一致 | sha256 一致 | integration (fetch script) |
| T-03 | FR-2.7 | `package.json` の `license` が `"CC-BY-SA-3.0"` | 文字列完全一致 | unit |
| T-04 | FR-2.7 | ルート `tegaki` / `tegaki-generator` / `@tegaki/website` の `license` が MIT のまま | 4 パッケージで `"MIT"` | unit (workspace scan) |
| T-05 | FR-2.8 | `ATTRIBUTION.md` に (a) "KanjiVG"、(b) "CC-BY-SA 3.0"、(c) `r20250816`、(d) "ShareAlike" のキーワードすべて含む | grep 検証 | unit |
| T-06 | FR-2.8 | `README.md` に CC-BY-SA の share-alike 警告と opt-in 記述あり | grep 検証 | unit |
| T-07 | FR-2.5 | バリアントファイル (`*-Kaisho.svg` 等) が `kanjivg/` に**含まれていない** | ファイル列挙で 0 件 | unit |
| T-08 | NFR-5.2 | `npm pack --dry-run` の tarball サイズ ≤ 5 MB | サイズ比較 | e2e |
| T-09 | NFR-6 常用 100% | 常用漢字 2,136 字のすべてが `hasKanji()` で true を返す | 2,136 件 pass | unit |
| T-10 | NFR-6 人名用 95%+ | 人名用漢字 863 字のうち ≥ 820 件 (95%) が `hasKanji()` で true | 件数カウント | unit |
| T-11 | NFR-6 ひらがな 100% | ひらがな 89 字のすべてが `hasKanji()` で true | 89 件 pass | unit |
| T-12 | NFR-6 カタカナ 100% | カタカナ 90 字のすべてが `hasKanji()` で true | 90 件 pass | unit |
| T-13 | —（API 契約） | `getKanjiSvg(0x53f3)` ＝「右」が SVG 文字列を返し、冒頭 `<?xml` または `<svg` から始まる | 正規表現 match | unit |
| T-14 | —（API 契約） | `getKanjiSvg(0x1F600)` ＝ 😀 が `null` を返す | 厳密 null | unit |
| T-15 | FR-2.1 | 取得 SVG 文字列に `id="kvg:StrokePaths_053f3"` が含まれる（データ整合性） | regex match | unit |
| T-16 | —（互換性） | 他 workspace パッケージ (例: generator) から `import { getKanjiSvg } from '@tegaki/dataset-cjk-kanjivg'` が成功 | module resolution 成功 | e2e |
| T-17 | NFR-3 | `bun typecheck` が exit 0 | exit 0 | unit |
| T-18 | NFR-3 | `bun check` (Biome) が exit 0 | exit 0 | unit |
| T-19 | NFR-3.4 | `src/index.test.ts` が exit 0 で全 pass | exit 0 | unit |
| T-20 | —（再現性） | `scripts/fetch-kanjivg.ts` を 2 回連続実行しても冪等（結果が同一） | diff 0 bytes | integration |

---

## §7. Unit テスト

`packages/dataset-cjk-kanjivg/src/index.test.ts` に以下の 7 ケースを配置する。Bun の `test()` / `describe()` / `expect()` を使用。既存リポジトリの `.ts` 拡張子規約に揃える。

```ts
// packages/dataset-cjk-kanjivg/src/index.test.ts
import { describe, expect, it } from 'bun:test';

import { KANJIVG_SHA, getKanjiSvg, getManifestEntry, hasKanji, listCodepoints } from './index.ts';

describe('@tegaki/dataset-cjk-kanjivg', () => {
  it('pins KANJIVG_SHA to r20250816 — see docs/technical-validation.md §1-6 pitfall #9', () => {
    expect(KANJIVG_SHA).toBe('r20250816');
  });

  describe('getKanjiSvg()', () => {
    it('returns an SVG string for U+53F3 (右) with the canonical KanjiVG fingerprint', () => {
      const svg = getKanjiSvg(0x53f3);
      expect(svg).not.toBeNull();
      expect(svg).toMatch(/^<\?xml|^<svg/);
      expect(svg).toContain('id="kvg:StrokePaths_053f3"');
      expect(svg).toContain('viewBox="0 0 109 109"'); // technical-validation.md §1-1
    });

    it('returns an SVG for U+3042 (あ) and U+30A2 (ア) — kana coverage', () => {
      expect(getKanjiSvg(0x3042)).toContain('id="kvg:StrokePaths_03042"');
      expect(getKanjiSvg(0x30a2)).toContain('id="kvg:StrokePaths_030a2"');
    });

    it('returns null for out-of-scope codepoints (emoji / CJK Ext A)', () => {
      expect(getKanjiSvg(0x1f600)).toBeNull();
      expect(getKanjiSvg(0x3400)).toBeNull();
    });

    it('returns null for bad inputs without throwing', () => {
      expect(getKanjiSvg(-1)).toBeNull();
      expect(getKanjiSvg(Number.NaN)).toBeNull();
    });
  });

  describe('hasKanji() — requirements.md §3 NFR-6 coverage targets', () => {
    it('covers 100% of the Joyo Kanji list', async () => {
      const { default: al } = await import('../scripts/allowlist.json');
      expect((al.joyo as number[]).filter((cp) => !hasKanji(cp))).toEqual([]);
    });

    it('covers 100% of hiragana and katakana', async () => {
      const { default: al } = await import('../scripts/allowlist.json');
      expect((al.kana as number[]).filter((cp) => !hasKanji(cp))).toEqual([]);
    });

    it('covers ≥ 95% of Jinmei-yo kanji', async () => {
      const { default: al } = await import('../scripts/allowlist.json');
      const jinmei = al.jinmei as number[];
      expect(jinmei.filter((cp) => hasKanji(cp)).length / jinmei.length).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('listCodepoints()', () => {
    it('returns codepoints ascending with no duplicates (variants deduped)', () => {
      const list = [...listCodepoints()];
      expect(list.length).toBeGreaterThan(3000);
      expect(list).toEqual([...list].sort((a, b) => a - b));
      expect(new Set(list).size).toBe(list.length);
    });
  });

  describe('getManifestEntry()', () => {
    it('returns { file } for covered codepoints and null otherwise', () => {
      expect(getManifestEntry(0x53f3)?.file).toBe('053f3.svg');
      expect(getManifestEntry(0x1f600)).toBeNull();
    });
  });
});
```

**カバレッジ観点**
- 正常系: 漢字 / ひらがな / カタカナの代表 1 件ずつ
- 異常系: 未収録漢字 (Ext A) / 絵文字 / 負の codepoint / NaN
- バルク: 常用・人名用・仮名すべての allowlist 照合（件数ベース）
- 不変条件: `listCodepoints()` の順序・重複なし
- メタ: SHA pin、ファイル名規約

---

## §8. e2e テスト

**目的**: 他ワークスペースパッケージから `import` → `getKanjiSvg(0x53f3)` で実際に「右」の SVG が取れるまでの一気通貫を検証する。これが通れば Phase 2 の loader はこのパッケージに安心して依存できる。

### 8-1. テストシナリオ

```bash
# Step 1. クリーン状態を作る
cd C:/Users/yuta/Desktop/Private/tegaki
rm -rf node_modules packages/*/node_modules
bun install                                                    # workspaces 全 install

# Step 2. KanjiVG データを取得（初回のみ、以降は冪等）
bun --filter @tegaki/dataset-cjk-kanjivg fetch-kanjivg          # scripts/fetch-kanjivg.ts 実行

# Step 3. パッケージ単体テスト
bun --filter @tegaki/dataset-cjk-kanjivg test                   # T-01〜T-15 相当
bun --filter @tegaki/dataset-cjk-kanjivg typecheck

# Step 4. 他パッケージからのインポート解決確認 (e2e)
cat > /tmp/tegaki-phase1-e2e.ts <<'TS'
import { getKanjiSvg, hasKanji, KANJIVG_SHA } from '@tegaki/dataset-cjk-kanjivg';

const migi = getKanjiSvg(0x53f3);
if (!migi) throw new Error('e2e: 右 not found');
if (!migi.includes('id="kvg:StrokePaths_053f3"')) throw new Error('e2e: malformed SVG');

if (!hasKanji(0x5de6)) throw new Error('e2e: 左 not found');
if (hasKanji(0x1f600)) throw new Error('e2e: emoji should not be covered');

console.log(`e2e ok: KANJIVG_SHA=${KANJIVG_SHA}, 右 byte length = ${migi.length}`);
TS
bun run /tmp/tegaki-phase1-e2e.ts
# expect: e2e ok: KANJIVG_SHA=r20250816, 右 byte length = <positive int>

# Step 5. 全体チェック
bun checks                                                       # lint + format + typecheck + tests
```

### 8-2. 期待される最終出力

```
e2e ok: KANJIVG_SHA=r20250816, 右 byte length = 4821
```

(byte length は KanjiVG の実 SVG サイズによる。4-6 KB が標準)

### 8-3. サイズ制約の検証

```bash
bun --filter @tegaki/dataset-cjk-kanjivg pack --dry-run
# expect 最終行: "package size: X.XX MB" で X.XX ≤ 5.00
```

### 8-4. 失敗時の切り分け手順

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| Step 2 で 403/404 | 上流が `r20250816` リリースを取り下げ | `KANJIVG_SHA` を直近 release に更新 + `EXPECTED_TARBALL_SHA256` 再計算 |
| Step 2 で sha256 mismatch | 上流が tarball を再生成 | 手動で差分レビューしてから constants を更新 |
| Step 3 の T-09 (常用 100%) が fail | allowlist.json と KanjiVG の不整合 | `scripts/allowlist.json` を再生成、または missing codepoint の調査 |
| Step 4 で module not found | exports マップの typo / workspace 未登録 | `bun install` 再実行、`package.json` exports を再確認 |
| Step 5 で Biome エラー | `.ts` 拡張子漏れ・import order | `bun fix` |

---

## §9. 懸念事項とリスク

[technical-validation.md §1-6](../technical-validation.md) の 10 個の落とし穴と [requirements.md §7](../requirements.md) のリスク一覧を Phase 1 に影響する範囲で反映。

### 9-1. R1: CC-BY-SA と MIT の分離が**法的に**成立していることの確認

- **影響**: 高。分離に隙間があると本体 tegaki パッケージ全体が CC-BY-SA の share-alike に巻き込まれる最悪シナリオ。
- **根本原因**: workspace monorepo では物理的にファイルは同一リポジトリに存在するため、「ライセンス境界」がパッケージ単位で成立するかは、(a) npm 上で独立配布されていること、(b) 本体パッケージが dataset を `dependencies` に含めないこと、(c) 生成物（`glyphData.json` 等）に KanjiVG 座標が含まれる場合の扱い — の 3 点に依存する。
- **対策**:
  1. 本体 `tegaki` / `tegaki-generator` の `package.json` の `dependencies` に `@tegaki/dataset-cjk-kanjivg` を**絶対に入れない**（Phase 2 では generator の `devDependencies` または別途ドキュメント記載で済ませる）。
  2. Phase 3 で生成される `glyphData.json` が KanjiVG 座標を含む場合、生成物ファイル自体に CC-BY-SA が派生するため、**生成物のライセンス扱いを Phase 3 チケットで明記**する。
  3. ATTRIBUTION.md の冒頭に「opt-in installation」を明言。
- **残余リスク**: 中。CC の派生著作定義のグレーゾーンは残るが、パッケージ分離 + 明示 opt-in で実務上のリスクは最小化できる。

### 9-2. R2: KanjiVG のバンドルサイズ 5 MB 制約（NFR-5.2）

- **影響**: 中。常用 + 人名用 + 仮名で ~3,178 ファイル × 平均 4 KB ≈ **12 MB** となり、素直に全投入すると制約を大幅超過する。
- **根本原因**: KanjiVG の SVG はインデント・コメント・`<text>` ノード（stroke number 表示用）を含み冗長。
- **対策案（複数組合せ）**:
  | 案 | 削減率 | 副作用 |
  |---|---|---|
  | バリアント除外 (`*-Kaisho` 等) | 10-15% | ほぼ無し（[requirements.md FR-2.5](../requirements.md) で要件） |
  | `kvg:StrokeNumbers` グループ削除 | 20-30% | Phase 2 loader が影響を受けないことを検証必要 |
  | SVG 内空白・コメント除去 (minify) | 15-25% | 可読性低下。デバッグは upstream を参照 |
  | gzip 前提で同梱しない（npm は gzip 配布） | — | 実効サイズはさらに圧縮されるが、展開後サイズは変わらない |
- **推奨**: バリアント除外 + stroke-number グループ削除 + 軽量 minify で ~4 MB を狙う。サイズ計測を `bun --filter ... pack --dry-run` で CI 化する。
- **残余リスク**: 低。常用 + 人名用なら 4 MB 前後に収まる見込み。JIS 第 2 水準まで拡張する将来の拡張では再設計必要。

### 9-3. R3: KanjiVG リリース更新時の座標ドリフト

- **影響**: 中〜高。`r20250816` 以降のリリースで「右」のストローク座標が 1 px 単位で変わると、Phase 3 以降のスナップショットテストが全破綻する。
- **根本原因**: KanjiVG は上流 issue fix を定期的にマージしており、過去にも座標微調整例あり ([technical-validation.md §1-6 #9](../technical-validation.md))。
- **対策**:
  1. `EXPECTED_TARBALL_SHA256` で tarball レベルの完全性を担保。
  2. 更新作業は**手動レビュー必須**のドキュメント化（`scripts/fetch-kanjivg.ts` のコメント）。
  3. Phase 6 のスナップショットテスト基盤と連動して、更新時の diff を可視化する仕組みを将来整備。
- **残余リスク**: 低（Phase 1 の範囲内では発生しない）。

### 9-4. R4: 既知の誤り字（娩・庫・炭）が常用に含まれる

- **影響**: 低（Phase 1 では表面化しない、Phase 6 で顕在化）。
- **根本原因**: [technical-validation.md §1-6 #8](../technical-validation.md) で指摘されている KanjiVG の既知 issue。
- **対策**: Phase 1 では**何もしない**（スコープ外）。`ATTRIBUTION.md` の末尾に "Known inaccuracies" 節を設け、将来 `fix-overrides.json` を導入する含みを残す。
- **残余リスク**: Phase 6 に委譲。

### 9-5. R5: 取得スクリプトの環境依存（Windows での tar 展開）

- **影響**: 中（Windows 環境での開発者体験）。
- **根本原因**: 現環境は Windows + bash (msys 派生)。`tar` コマンドの挙動が GNU tar と差異あり、シンボリックリンクや長パス名でエラーが起きやすい。
- **対策**:
  1. `scripts/fetch-kanjivg.ts` は**純 Bun / Node 実装**で完結させ、shell の `tar` を呼び出さない（Bun 標準 API で tar 展開できない場合、`fflate` や `tar-stream` などの pure-JS ライブラリを **devDependencies** に検討。ただし `fflate` は既に generator で使用中なので重複ゼロ）。
  2. OUT_DIR のファイル名を ASCII のみに制限（KanjiVG は hex codepoint なので自然に守られる）。
  3. CI で Windows / Linux / macOS 3 OS マトリクスを実行（既存ワークフローがあればそれに合流）。
- **残余リスク**: 低。

### 9-6. R6: `@xmldom/xmldom` 不在時の DTD 読み込み警告（落とし穴 #3）

- **影響**: Phase 1 では**表面化しない**（Phase 2 以降）。ただし Phase 1 のテストで raw SVG を文字列として扱う限り、DTD は問題にならない。
- **対策**: Phase 1 では SVG をパースせず raw string として扱うため、本リスクはスコープ外であることをドキュメント化。Phase 2 チケットに `@xmldom/xmldom` 導入の TODO を渡す（§12 参照）。

### 9-7. R7: サブモジュール方式 vs git 管理 vs fetch スクリプトの選択肢再燃

- **影響**: 中（設計変更コスト）。
- **状況**: [requirements.md Q-1](../requirements.md) で「固定 tarball + セットアップスクリプト」が defaults だが、レビュー時に「submodule のほうがよいのでは」「npm 依存 (`kanjivg` パッケージ)のほうがよいのでは」と再議論される可能性あり。
- **対策**: §11 で 3 案を比較検討済みとして、選定理由を PR 本文で明示。レビュー時の議論を最小化。

---

## §10. レビュー項目

PR レビュー時のチェックリスト。レビュワーは以下を順に確認し、指摘があればコメントする。

### 10-1. ライセンス観点

- [ ] `package.json` の `license` が正確に `"CC-BY-SA-3.0"`（SPDX 識別子）
- [ ] `LICENSE` ファイルに CC-BY-SA 3.0 の**完全な**ライセンス本文が含まれている
- [ ] `ATTRIBUTION.md` に §3-3 の必須項目（著作者、SPDX、share-alike 警告、入手元、SHA、改変有無）すべて含む
- [ ] ルート `tegaki` / `tegaki-generator` / `@tegaki/website` のいずれも `dependencies` に `@tegaki/dataset-cjk-kanjivg` を含まない
- [ ] `ATTRIBUTION.md` の share-alike 節が opt-in でユーザーに明示されている

### 10-2. ファイル構成観点

- [ ] ディレクトリ構造が §3-1 のツリーと一致
- [ ] `files` フィールドが SVG / dist / src / LICENSE / ATTRIBUTION.md / README.md のみを含む
- [ ] バリアントファイル（`*-Kaisho.svg` 等）が配布 tarball に含まれていない（`npm pack --dry-run` で確認）
- [ ] `.gitignore` が `.cache/` `dist/` `node_modules/` を含む
- [ ] `kanjivg/README_KANJIVG.md` が存在しディレクトリの由来を説明

### 10-3. API 設計観点

- [ ] `getKanjiSvg(codepoint: number): string | null` シグネチャが仕様通り
- [ ] `hasKanji(codepoint: number): boolean` が副作用・file I/O なし
- [ ] `listCodepoints(): Iterable<number>` が sorted ascending
- [ ] `KANJIVG_SHA` が export されている
- [ ] TypeScript strict 下でエラーなし
- [ ] Zod は Phase 1 では使わない（allowlist.json のバリデーションのみ `import * as z from 'zod/v4'` で正しく書く）

### 10-4. テストカバレッジ観点

- [ ] §7 の 7+ describe ブロックすべて実装されている
- [ ] 正常系・異常系・バルク照合のバランス（各カテゴリ最低 1 件）
- [ ] `bun test --filter @tegaki/dataset-cjk-kanjivg` が exit 0
- [ ] `bun pack --dry-run` のサイズが ≤ 5 MB
- [ ] 常用 100% / 仮名 100% / 人名用 ≥95% の達成率が自動テストで担保

### 10-5. ドキュメント観点

- [ ] `README.md` に「インストール = opt-in」「CC-BY-SA 3.0」「share-alike に関する警告」が記載
- [ ] `README.md` に最低 1 つの使用例（`getKanjiSvg(0x53f3)` 等）
- [ ] `ATTRIBUTION.md` が§3-3 をほぼそのまま実装している
- [ ] `docs/tickets/README.md` のステータス列が「✅ 完了」に更新
- [ ] Phase 2 チケットの冒頭に、Phase 1 で確定した API シグネチャと `@xmldom/xmldom` TODO が追記

### 10-6. 再現性・CI 観点

- [ ] `scripts/fetch-kanjivg.ts` が冪等（2 回連続実行で差分なし）
- [ ] `EXPECTED_TARBALL_SHA256` が定数化されており、ドリフト時に確実に fail する
- [ ] `bun install` → `bun --filter @tegaki/dataset-cjk-kanjivg fetch-kanjivg` → `bun checks` が CI 上で通る
- [ ] Windows / Linux / macOS で fetch スクリプトが動く（少なくとも手元の Windows で確認済）

---

## §11. 一から作り直す場合の設計思想

> このフェーズを **一度経験した前提** で、1 年後・3 年後の自分が「あの Phase 1 の判断は妥当だったか」を検算できるよう、5 つの代替アーキテクチャを定量的に比較する。感情的な Pros/Cons ではなく**数字と失敗モード**で判断し、最終章で「私ならこうする」を断言する。

### 11-1. 設計空間の全体像

CC-BY-SA 3.0 データを MIT 本体に同居させない、という制約のもとで取りうる選択肢は 5 つに整理できる。

| 案 | 本質 | ライセンス境界 | データの置き場所 |
|---|---|---|---|
| **A** | workspace 内分離（= 現行案） | パッケージ境界 | `packages/dataset-cjk-kanjivg/kanjivg/*.svg`（git 管理） |
| **B** | generator が build-time に HTTP fetch | 使用時点で分離 | ユーザーの `.cache/`（git 管理なし） |
| **C** | 別リポジトリの npm パッケージ | リポジトリ境界 | `ayutaz/tegaki-dataset-cjk-kanjivg` |
| **D** | データセット抽象化層 + plug-in 方式 | プラグイン境界 | 複数パッケージ（KanjiVG / AnimCJK / Kanji alive）を差し替え |
| **E** | データセットパッケージを廃止、generator CLI が HTTP fetch | 実行時点で分離 | 生成成果物 `glyphData.json` のみ、SVG は一切配布しない |

### 11-2. 定量比較（同一スコープ = 常用 + 人名用 + 仮名 ≈ 3,178 字で試算）

常用 + 人名用 + 仮名 3,178 字、平均 SVG 原サイズ 3.8 KB、バリアント除外 + stroke-number 削除 + 軽量 minify 後 1.3 KB と仮定（[§9-2](#9-2-r2-kanjivg-のバンドルサイズ-5-mb-制約nfr-52) の試算）。

| 指標 | 案 A | 案 B | 案 C | 案 D | 案 E |
|---|---|---|---|---|---|
| **repo 展開後サイズ増** (git clone) | +4.1 MB | 0 | 0 | +4.1 MB（A と同じ） | 0 |
| **npm tarball（dataset 側）** | 4.1 MB (gzip 前) / ~1.6 MB (gzip 後) | — | 案 A と同じ | 案 A と同じ | — |
| **ユーザーの初回 DL（CJK opt-in 時）** | 1.6 MB（1 req） | 3,178 req × 1.3 KB ≈ 4.1 MB | 1.6 MB（1 req） | 1.6 MB × N dataset | 1 req で `glyphData.json` のみ（3,178 字で ~1.3 MB 想定） |
| **オフライン CI で動くか** | ✅ | ❌（致命的） | ✅ | ✅ | ❌（初回のみ fetch 必要） |
| **KanjiVG 更新時の PR 数** | 1 PR（dataset のみ） | 0 PR（SHA 定数 1 行変更を次回 generator リリースに同梱） | 2 PR（dataset repo + 本体 repo） | 1 PR（該当 plugin のみ） | 0 PR（generator 側の定数 1 行） |
| **KanjiVG 更新頻度の実績** | 年 1-2 回（実績: 2024-2025 で 3 release） | 同じ | 同じ | 同じ | 同じ |
| **バンドル再生成頻度** | NFR-2.2 により **ゼロ**（既存 4 フォント bundle は再生成不要、CJK bundle は新規生成のみ） | 同じ | 同じ | 同じ | 同じ |
| **Phase 1 実装工数** | 3 日 | 4-5 日（cache 層） | 5-6 日（repo 分割 + CI 複製） | 4-5 日（抽象 API + adapter 1 本） | 3-4 日（fetch + integrity 検証） |
| **Phase 1 CI 時間増** | +15s (test + pack) | +30s（fetch のモック困難） | +10s | +20s | +20s（fetch + sha verify） |
| **同期 API 維持可能か** | ✅ | ❌（async 必須） | ✅ | ✅（adapter 内で同期化可能） | ❌（async 必須） |
| **法務レビュー深度** | 中（同居だが分離） | 低（ユーザー fetch） | 低（別 repo） | 中 | 低（配布物にソースなし） |
| **複数データセット併用** | 不可（単一 KanjiVG） | 不可 | 不可 | ✅（A+ と B を混載可） | 不可 |
| **簡体字・繁体字・韓国語への横展開コスト** | 新 workspace 追加（+3-4 日 / 言語） | URL 変更のみ | 新 repo 追加（+5-6 日 / 言語） | **plugin を書くだけ**（+1-2 日 / 言語） | URL + schema 変更 |

### 11-3. 案 D: データセット抽象化層（plug-in 方式）

KanjiVG を foundational data として位置付け、その上に `DatasetProvider` インターフェイスを敷く構造。Phase 2 以降の loader はこの interface のみを知る。

```ts
// packages/generator/src/dataset/provider.ts
export interface StrokeDatasetProvider {
  readonly id: string;                              // 'kanjivg' | 'animcjk-ja' | 'kanji-alive'
  readonly license: string;                          // 'CC-BY-SA-3.0' | 'LGPL-3.0' | 'CC-BY-4.0'
  has(codepoint: number): boolean;
  getStrokes(codepoint: number): StrokeData | null;  // 正規化済み中間表現
}

// packages/dataset-cjk-kanjivg/src/provider.ts  (this phase)
// packages/dataset-cjk-animcjk/src/provider.ts  (future)
// packages/dataset-cjk-kanji-alive/src/provider.ts  (future)
```

- **利点**: [japanese-support.md §3](../japanese-support.md) で整理した 3 つのデータセット（KanjiVG / AnimCJK / Kanji alive）をシナリオ別に切替可能。ユーザーが「MIT 同梱が必須」なら Kanji alive、「常用 100%」なら KanjiVG、という選択肢を提供できる。
- **利点**: 将来の簡体字・繁体字・韓国語（[requirements.md §5](../requirements.md) で「対象外」指定だが、AnimCJK で将来対応可とされている）横展開が **plugin 追加のみ**で済む。
- **欠点**: Phase 1 で**未使用な抽象化を設計するコスト**（YAGNI の悪例になりうる）。現時点で 2 つ目以降の provider 実装予定はない。
- **欠点**: 「正規化済み中間表現 `StrokeData`」を Phase 1 で固めると Phase 2 以降の loader の自由度を奪う。逆に Phase 2 まで waiting にすると抽象化が骨抜きになる。

### 11-4. 案 E: データセットパッケージを廃止し、generator CLI が build-time fetch

もっともラディカル。`@tegaki/dataset-cjk-kanjivg` を**作らず**、generator の `--dataset kanjivg` フラグが発動した時だけ generator CLI が GitHub tarball を 1 回 fetch → 展開 → そのまま `glyphData.json` にパイプする。配布物は**最終生成物のみ**で、SVG は tegaki エコシステムのどこにも残らない。

```
ユーザー:
  bun add tegaki-generator        # MIT のみ、サイズ増ゼロ
  bun tegaki-generator generate --dataset kanjivg --chars 右左田
  # → CLI 内部で r20250816 tarball を .cache/ に落とし、生成物のみ commit
```

- **利点**: 本リポジトリから CC-BY-SA データが**完全に消える**。ライセンス境界が最強（`glyphData.json` が派生物として CC-BY-SA を引き継ぐだけ）。
- **利点**: サイズ 0、PR diff 0、clone 時間 0。npm tarball の `files` 設計も不要。
- **利点**: KanjiVG 更新は generator の `constants.ts` 1 行変更で完結（dataset パッケージのリリースフロー不要）。
- **欠点**: 初回生成時にネットワーク必須（CI はキャッシュ設定が必要）。ただし案 B と違い**1 回だけ**で、kanji ごとの req は発生しない。
- **欠点**: Phase 4 の仮名バンドル (`tegaki/fonts/ja-kana`) は結局 pre-built で配布するため、「仮名だけは renderer に同梱、漢字は build-time fetch」という非対称設計になる。
- **欠点**: 「generator を install したユーザーが生成物に CC-BY-SA を引き継ぐ」ことを明示する UX が必要（警告メッセージ + prompt）。

### 11-5. 結論: 私ならこうする

**案 A を採用する。ただし案 D の抽象化境界は Phase 2 で敷く**、というのが私の結論である。

根拠は以下の 3 点に集約される。

1. **案 B / 案 E はオフライン CI で死ぬ** — Tegaki の CI は GitHub Actions 上で走り、同じ GitHub 上の raw ファイルを毎回 fetch する構造は rate limit (60 req/h 未認証) で即破綻する。キャッシュ戦略を真面目に設計すると案 B は 4-5 日、案 E も 3-4 日かかり、案 A の 3 日より高コスト。
2. **案 C は実装者 1 名体制の OSS で持続不可能** — 別 repo の CI、issue triage、release cadence を二重管理するコストは、CC-BY-SA 境界を**リポジトリ境界**に引くために払う対価として高すぎる。パッケージ境界（案 A）で法務的に十分なら、それ以上の分離は YAGNI。
3. **案 D の抽象化は Phase 1 では過剰、Phase 2 で丁度良い** — Phase 1 の目的は「KanjiVG SVG を取り出せる最小 API」で、provider interface を切るのは早すぎる。だが Phase 2 で `datasetSkeleton()` を実装する段階で、**loader が直接 `@tegaki/dataset-cjk-kanjivg` を知る**のではなく **`StrokeDatasetProvider` 経由で知る**設計にしておけば、将来の AnimCJK / Kanji alive plugin 追加が `bun add @tegaki/dataset-cjk-xxx` 1 行で済む。

つまり、**Phase 1 では案 A、Phase 2 のローダー設計で案 D の interface boundary を敷く** のが最小コストで最大の拡張性を得る解である。

### 11-6. この判断が 1 年後・3 年後に妥当だったと言えるか

- **1 年後（常用 + 人名用で運用中）**: 案 A のサイズ 4 MB / 年 1-2 回の SHA 更新は PR レビュー負担として許容内。§12-5 の「JIS 第 2 水準拡張」要望が出たら案 E を再検討、くらいの温度感で妥当。
- **3 年後（簡体字 / 繁体字 / 韓国語拡張中、あるいは JIS 第 2 水準追加済み）**: ここで案 D の interface boundary を Phase 2 で敷いておいた判断が効いてくる。敷いていなければ「KanjiVG 直呼びが generator 深層に散らばった状態」からの抽象化リファクタに 5-10 日かかる。敷いてあれば provider を `bun add` するだけ。
- **3 年後（仮にプロジェクトが停滞した場合）**: 案 A は「動く状態でフリーズ」できる。案 B / 案 E は上流 KanjiVG repo の URL 構造変更や rate limit 強化で**静かに壊れる**。案 A の保守性ゼロでの耐久力は見逃せない利点。

### 11-7. 今のうちに残しておく将来拡張の布石

`src/index.ts` の API 設計で、**将来の案 D 昇格**と**将来の案 E 検討**の両方に備える一手を打っておく。

- `getKanjiSvg(codepoint)` は同期 API を採用（案 A / C / D 互換、案 B / E 非互換）。これは意図的な判断で、**案 B / E へ移行するときは破壊的変更を許容する**方針。案 A 自体が async wrapper を持てば済むため、今から `Promise` 化する予防的抽象化は行わない（YAGNI）。
- `getManifestEntry()` を別関数に切り出し済み — Phase 2 で `StrokeDatasetProvider` を設計するとき、`has` / `getStrokes` / `getMetadata` の 3 分割に自然にマップできる。
- `KANJIVG_SHA` を export 済み — 案 E への移行時にはこの定数が generator 側 `constants.ts` に移動するだけで済む。

以上により、**案 A を選ぶことは「今は最小コスト、将来の移行コストも最小」という Pareto 最適**であることが示せる。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 2（KanjiVG ローダー）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **import path** | `import { getKanjiSvg, hasKanji, listCodepoints } from '@tegaki/dataset-cjk-kanjivg'` | `src/index.ts` からの再エクスポート |
| **API シグネチャ** | `getKanjiSvg(codepoint: number): string \| null`（**同期**） | 案 A の選定により同期維持。async 化は Phase 2 で必要なら議論 |
| **データ粒度** | codepoint ごとに 1 ファイル、KanjiVG 原典 SVG を**改変なし**で保持 | Phase 2 側で XML パース時に DOCTYPE 警告抑制必須 |
| **SHA pin** | `KANJIVG_SHA = 'r20250816'` | `import { KANJIVG_SHA }` で参照可能 |
| **収録範囲** | 常用 2,136 + 人名用 ~820+ + ひらがな 89 + カタカナ 90 = **約 3,150-3,180 字** | Phase 2 の snapshot test ではこの範囲内の字を使う |
| **未収録字の挙動** | `getKanjiSvg()` / `hasKanji()` 共に `null` / `false` | Phase 2 loader は null を受けたら**そのまま null を上流に返す**（fallback は Phase 3 の責務） |

### 12-2. Phase 2 で発生する追加依存の予告

- `@xmldom/xmldom@^0.9` を `packages/generator/package.json` の `devDependencies` に追加予定（[technical-validation.md §1-7](../technical-validation.md)）。Phase 1 の範囲外なのでここでは追加しない。
- Phase 2 ではこのパッケージに**手を加えない** — `@tegaki/dataset-cjk-kanjivg` は data-only 層で、パース責務は generator 側に置く。この責務分離を Phase 2 PR でレビュワーに念押しすること。

### 12-3. 既知のバリアント字問題（先送り）

- KanjiVG には `05cf6-Kaisho.svg`（楷書異体）、`*-Jinmei.svg`（人名用異体）等のバリアント SVG が存在する。
- Phase 1 の `fetch-kanjivg.ts` ではこれらを**一律除外**（[requirements.md FR-2.5](../requirements.md)）。
- Phase 2 以降で「明朝体と楷書の両対応をしたい」要望が出たときは、`getKanjiSvg(codepoint, { variant: 'Kaisho' })` の第 2 引数で opt-in する設計拡張を検討する。現時点では API シグネチャを単引数に保ち、将来の拡張余地だけ残す。

### 12-4. 既知誤り字のリスト（Phase 6 用）

- **娩（U+5A29）/ 庫（U+5EAB）/ 炭（U+70AD）**: [technical-validation.md §1-6 #8](../technical-validation.md) 参照。Phase 6 の視覚検証で目視確認対象。Phase 1 では何もしない。
- Phase 6 での対応方針: `packages/generator/src/dataset/fix-overrides.json` を作成し、KanjiVG の誤り字を上書きする機構を追加。Phase 1 の段階ではこのパスを**予約のみ**（`ATTRIBUTION.md` の末尾に "Known inaccuracies — see Phase 6 ticket" の注記を置く）。

### 12-5. サイズ制約の将来拡張シナリオ

- 現行スコープ（常用 + 人名用 + 仮名）では 5 MB 以内に収まる見込み。
- **JIS 第 2 水準（3,390 字）まで拡張する将来シナリオ**では、常用 + 人名用との合算で推定 10+ MB となり、`NFR-5.2` を見直す必要がある。このときは案 B（runtime fetch）または案 C（別 repo 化）への移行が現実的な選択肢になる。
- この申し送りは Phase 8 のリリース判断で再評価する。

### 12-6. パッケージ管理上の注意

- [requirements.md NFR-2.2](../requirements.md) により、**既存の 4 フォント bundle（Caveat / Italianno / Tangerine / Parisienne）は再生成不要**。Phase 1 での変更はこれらに一切影響しない（workspace 追加のみ）。
- ただし `bun install` の lockfile (`bun.lock`) には変更が入る。Phase 1 PR でこの lockfile 差分をレビュワーが確認する必要あり。

### 12-7. Phase 3 への橋渡し

- Phase 3 の `isCjkChar(char) && dataset.has(char)` 分岐は、本パッケージの `hasKanji(codepoint)` を使う。Phase 3 チケット冒頭でこのパスを明示すること。
- Phase 3 での `datasetSkeleton()` は Phase 2 の loader を呼び、loader が本パッケージの `getKanjiSvg()` を呼ぶ、という 3 層構造になる。**本パッケージは Phase 3 から直接呼ばれない**という点をアーキテクチャ図に反映。

---

### 関連チケット

- 前: —
- 次: [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md)
- 一覧: [docs/tickets/README.md](./README.md)

### 関連ドキュメント

- 設計方針: [japanese-support.md](../japanese-support.md)（§3-1 / §4 / §7）
- 実装ロードマップ: [japanese-roadmap.md](../japanese-roadmap.md)（§2 Phase 1）
- 技術検証: [technical-validation.md](../technical-validation.md)（§1-1, §1-4, §1-6, §3-1）
- 要件定義: [requirements.md](../requirements.md)（FR-2, NFR-4, NFR-5, NFR-6）
- プロジェクト全体: [AGENTS.md](../../AGENTS.md)
