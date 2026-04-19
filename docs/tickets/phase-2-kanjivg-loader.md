# Phase 2: KanjiVG ローダー `packages/generator/src/dataset/kanjivg.ts`

> 日本語対応実装の第 2 マイルストーン。Phase 1 で整備したデータ供給層 `@tegaki/dataset-cjk-kanjivg` から生の SVG 文字列を受け取り、**Tegaki パイプラインの中間表現 `KanjiStroke[]` に変換する**ローダーを実装する。筆順は `<path>` 要素の出現順で決定し、`kvg:type` から終端種別（tome/hane/harai/dot/default）を分類する。Phase 3 の `datasetSkeleton()` はこのローダーの戻り値を起点にパイプラインへ接続する。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **2 / 8** |
| マイルストーン名 | KanjiVG ローダー（SVG → `KanjiStroke[]`） |
| ブランチ名 | `feat/ja-phase2-kanjivg-loader` |
| ステータス | 📝 未着手 |
| 依存（前段） | [Phase 1: データセットパッケージ雛形](./phase-1-dataset-package.md) — `getKanjiSvg(codepoint)` / `hasKanji(codepoint)` / `KANJIVG_SHA` を利用 |
| 依存（後段） | [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md) がこのローダーを `datasetSkeleton()` 内部で呼び出す |
| 想定期間 | **5 営業日** (一人稼働) |
| 担当見積 | 設計 0.5d + パーサ実装 2.0d + テスト 1.5d + 仕様検証 0.5d + レビュー対応 0.5d |
| 関連要件 | [requirements.md](../requirements.md) FR-2.1 / FR-2.2 / FR-2.3 / FR-2.4 / FR-2.5 / FR-2.6 / FR-3.1 / FR-3.2 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §3-5 / §6 / §9 Step 1 |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §2 Phase 2 |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §1-1 / §1-2 / §1-3 / §1-5 / §1-6 / §1-7 / §1-8 |
| 前フェーズ申し送り | [phase-1-dataset-package.md §12](./phase-1-dataset-package.md) — 同期 API / SHA pin / 未収録時 null / `@xmldom/xmldom` 予告 |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| `packages/generator/src/dataset/kanjivg.ts` の実装（~150 行） | 座標変換 KanjiVG 109 正規化 → フォント `unitsPerEm`（Phase 3） |
| `KanjiStroke` 中間型の定義 | ラスタ投影・線幅実測 (`datasetSkeleton()`)（Phase 3） |
| `parseKanjiSvg(svg: string): KanjiStroke[]` の実装 | Sigma-Lognormal リズム合成（Phase 5） |
| `d` 属性の M / C / S コマンドパーサ（S のリフレクション含む） | CLI フラグ `--dataset kanjivg` の generate コマンド統合（Phase 3） |
| `kvg:type` → endpointType マッピング（スラッシュ記法・仮名フォールバック） | 視覚回帰テスト / 目視検証（Phase 6） |
| `@xmldom/xmldom@^0.9` を generator の `devDependencies` に追加 | `glyphData.json` への書き出し（Phase 3） |
| `kanjivg.test.ts` のユニットテスト（代表 6 字 + エッジケース） | 他フェーズのための interface 設計（`StrokeDatasetProvider` 抽象化は Phase 3 の冒頭で敷く） |
| 既存 `flattenPath()` / `rdpSimplify()` と**同じシグネチャの `Point[]`** を返すことの契約保証 | — |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-support.md §9 Step 1](../japanese-support.md) の「KanjiVG から `<path>` をストローク順に取得 → 既存 `flattenPath()` でベジェ平坦化 → 既存 `rdpSimplify()` で点数削減」の 3 段階を、**単一の `parseKanjiSvg(svg)` に封じ込める**。具体的に 3 点を解決:

1. **SVG → 中間形式の変換** — KanjiVG の `<path d="M...c...">` から、既存 Tegaki パイプラインが前提とする `Point[]` ポリラインへ変換する仲介データ構造 `KanjiStroke` を定義。[technical-validation.md §1-5](../technical-validation.md) で限定された 3 コマンド (M / C / S) のみを処理する軽量パーサを実装。
2. **筆順・終端種別のメタ情報抽出** — `<path>` 出現順を筆順（`id="kvg:...-sN"` の N）、`kvg:type` を終端種別（`㇒`=左払い、`㇐`=横、`㇀`=はね等）として抽出。`KanjiStroke.endpointType: 'tome' | 'hane' | 'harai' | 'dot' | 'default'` で Phase 5 の Sigma-Lognormal リズム合成へ受け渡す形で保持。
3. **Phase 1 のライセンス境界維持** — パース責務は generator 側に置き、`@tegaki/dataset-cjk-kanjivg` は data-only のまま（[phase-1-dataset-package.md §12-2](./phase-1-dataset-package.md)）。依存は `devDependencies` 経由で CC-BY-SA の `tegaki-generator` への波及を防ぐ。

### 2-2. Done の定義（測定可能）

以下 **12 項目すべて** を満たしたときチケット完了とする。

- [ ] **D-1** `packages/generator/src/dataset/kanjivg.ts` が存在し、`parseKanjiSvg(svg: string): KanjiStroke[]` をエクスポートしている
- [ ] **D-2** `KanjiStroke` 型が export され、`{ points: Point[]; endpointType: EndpointType; strokeNumber: number; kvgType: string | null }` を含む
- [ ] **D-3** 「右」(U+53F3) の SVG を入力したとき、**5 本**のストロークが返り、`endpointType` が順に `['harai', 'tome', 'tome', 'hybrid→tome', 'tome']`（後述 §3-6 参照）に一致する
- [ ] **D-4** 「田」(U+7530) の SVG を入力したとき、**5 本**のストロークが返り、最初が `'㇑'` (endpointType = `'tome'`) で始まる
- [ ] **D-5** 「き」(U+304D) の SVG を入力したとき、**4 本**のストロークが返り、`kvg:type` なしのため全ストロークが `endpointType = 'default'`
- [ ] **D-6** 「ア」(U+30A2) の SVG を入力したとき、**2 本**のストロークが返り、全ストロークが `endpointType = 'default'`
- [ ] **D-7** スラッシュ記法 `kvg:type="㇔/㇀"` を持つストロークが `endpointType = 'dot'`（前者 `㇔` 採用）に分類される
- [ ] **D-8** `<path>` の `d` 属性に含まれる S コマンドが、直前の C / S の制御点をリフレクションして正しく解釈される（単体テスト T-05 で保証）
- [ ] **D-9** Phase 1 の `getKanjiSvg(0x53f3)` → `parseKanjiSvg()` の連鎖が e2e で成功し、各ストロークの `points` が `Point[]`（長さ ≥ 2）で返る
- [ ] **D-10** `packages/generator/package.json` の `devDependencies` に `@xmldom/xmldom@^0.9` と `@tegaki/dataset-cjk-kanjivg: "workspace:*"` が追加されている
- [ ] **D-11** `bun typecheck && bun run test && bun check` が全通する（[phase-1-dataset-package.md D-7](./phase-1-dataset-package.md) と同じ厳格度）
- [ ] **D-12** `kanjivg.test.ts` が describe 単位で**最低 8 ケース**（§7 参照）を網羅し、coverage が主要分岐 100%

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（追加分のみ）

```
packages/generator/
├── package.json                           # devDependencies に @xmldom/xmldom 追加
└── src/
    └── dataset/                           # 新規ディレクトリ
        ├── kanjivg.ts                     # 本チケットの主成果物
        ├── kanjivg.test.ts                # ユニットテスト
        └── kanjivg-types.ts               # KanjiStroke / EndpointType（kanjivg.ts に内包でも可）
```

### 3-2. `kanjivg.ts` の完全実装（~150 行）

[technical-validation.md §1-7](../technical-validation.md) のコード例を忠実に反映した完成形を以下に示す。実装時はこれを骨子として、Tegaki 規約（`.ts` 拡張子 import、Zod v4 import）に従って微調整する。

```ts
// packages/generator/src/dataset/kanjivg.ts
// Phase 2 of the Japanese support effort — see docs/tickets/phase-2-kanjivg-loader.md.
// Parses a KanjiVG SVG string into Tegaki's intermediate stroke array (`KanjiStroke[]`),
// reusing the existing `flattenPath()` bezier subdivider and `rdpSimplify()` point reducer.
// No coordinate transforms here — Phase 3 handles 109→unitsPerEm scaling.

import { DOMParser } from '@xmldom/xmldom';
import type { PathCommand, Point } from 'tegaki';

import { flattenPath } from '../processing/bezier.ts';
import { rdpSimplify } from '../processing/trace.ts';

/** Stroke endpoint classification for Phase 5 rhythm synthesis. */
export type EndpointType = 'tome' | 'hane' | 'harai' | 'dot' | 'default';

/**
 * Intermediate representation of a single KanjiVG stroke.
 * Coordinates are in KanjiVG's 109×109 normalized space, y-down (SVG standard).
 * Phase 3 converts these to font units and flips y to match opentype's y-up.
 */
export interface KanjiStroke {
  /** Polyline points after bezier flattening + RDP simplification (length ≥ 2). */
  points: Point[];
  /** Endpoint classification derived from `kvg:type`. 'default' for kana and unrecognized. */
  endpointType: EndpointType;
  /** 1-origin stroke order, matches the N in `id="kvg:...-sN"` and the <path> array index + 1. */
  strokeNumber: number;
  /** Raw `kvg:type` attribute value (without slash-stripping). `null` when absent (kana). */
  kvgType: string | null;
}

/** CJK Strokes Unicode block (U+31C0–U+31E3) classification — see technical-validation.md §1-3. */
const ENDPOINT_BY_KVG_TYPE: Record<string, EndpointType> = {
  // dots
  '㇔': 'dot',
  // tome (stop): straight horizontal/vertical
  '㇐': 'tome',
  '㇑': 'tome',
  // hane (flick): upward/leftward hooks
  '㇀': 'hane',
  '㇁': 'hane',
  '㇂': 'hane',
  '㇃': 'hane',
  '㇆': 'hane',
  '㇈': 'hane',
  '㇉': 'hane',
  '㇖': 'hane',
  '㇙': 'hane',
  '㇚': 'hane',
  '㇟': 'hane',
  '㇡': 'hane',
  // harai (sweep): diagonal sweeps
  '㇇': 'harai',
  '㇋': 'harai',
  '㇏': 'harai',
  '㇒': 'harai',
  '㇓': 'harai',
  // hybrid (折れ系): stop-then-turn — map to tome for conservative endpoint behaviour
  '㇄': 'tome',
  '㇅': 'tome',
  '㇕': 'tome',
  '㇗': 'tome',
  '㇛': 'tome',
  '㇜': 'tome',
  '㇞': 'tome',
};

/**
 * Classify a `kvg:type` attribute value into an endpoint category.
 *
 * Handles:
 *   - Slash notation `㇔/㇀` → first symbol wins (technical-validation.md §1-6 #6).
 *   - Suffixes `a`/`b` (joint-kind marker): stripped before lookup.
 *   - Unknown / absent (kana): returns `'default'`.
 */
export function classifyEndpoint(kvgType: string | null | undefined): EndpointType {
  if (!kvgType) return 'default';
  const primary = kvgType.split('/')[0]!; // slash notation: take the first
  const base = primary.replace(/[ab]$/, ''); // strip joint suffix
  return ENDPOINT_BY_KVG_TYPE[base] ?? 'default';
}

/**
 * Parse a KanjiVG `d` attribute into `PathCommand[]` compatible with `flattenPath()`.
 * Handles only M/m, C/c, S/s (technical-validation.md §1-5). Materializes S as C using
 * reflection of the previous cubic's second control point.
 */
export function parseD(d: string): PathCommand[] {
  const out: PathCommand[] = [];
  const tokens = d.match(/[MmCcSs]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];

  let i = 0;
  let cx = 0, cy = 0; // current point
  let prevC2x = 0, prevC2y = 0; // last cubic second control point (for S reflection)
  let lastCmd = '';

  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/^[MmCcSs]$/.test(tok)) { lastCmd = tok; i++; continue; }

    const rel = lastCmd === lastCmd.toLowerCase();
    const base = lastCmd.toUpperCase();

    if (base === 'M') {
      const x = rel ? cx + Number.parseFloat(tok) : Number.parseFloat(tok);
      const y = rel ? cy + Number.parseFloat(tokens[i + 1]!) : Number.parseFloat(tokens[i + 1]!);
      i += 2;
      out.push({ type: 'M', x, y });
      cx = x; cy = y;
      lastCmd = rel ? 'l' : 'L';
    } else if (base === 'C') {
      const a = Array.from({ length: 6 }, (_, k) => Number.parseFloat(tokens[i + k]!));
      i += 6;
      const x1 = rel ? cx + a[0]! : a[0]!, y1 = rel ? cy + a[1]! : a[1]!;
      const x2 = rel ? cx + a[2]! : a[2]!, y2 = rel ? cy + a[3]! : a[3]!;
      const x  = rel ? cx + a[4]! : a[4]!, y  = rel ? cy + a[5]! : a[5]!;
      out.push({ type: 'C', x1, y1, x2, y2, x, y });
      prevC2x = x2; prevC2y = y2; cx = x; cy = y;
    } else if (base === 'S') {
      const a = Array.from({ length: 4 }, (_, k) => Number.parseFloat(tokens[i + k]!));
      i += 4;
      // Reflect prev C2 through current point (SVG spec); fallback to current if no prior cubic.
      const prevWasCubic = /^[CcSs]$/.test(lastCmd) || out.at(-1)?.type === 'C';
      const x1 = prevWasCubic ? 2 * cx - prevC2x : cx;
      const y1 = prevWasCubic ? 2 * cy - prevC2y : cy;
      const x2 = rel ? cx + a[0]! : a[0]!, y2 = rel ? cy + a[1]! : a[1]!;
      const x  = rel ? cx + a[2]! : a[2]!, y  = rel ? cy + a[3]! : a[3]!;
      out.push({ type: 'C', x1, y1, x2, y2, x, y });
      prevC2x = x2; prevC2y = y2; cx = x; cy = y;
    } else {
      i++; // defensive skip on unknown command
    }
  }

  return out;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const KVG_NS = 'http://kanjivg.tagaini.net';

/**
 * Parse a KanjiVG SVG string into ordered `KanjiStroke[]`.
 *
 * Contract:
 *   - Stroke order is the document order of `<path>` under `g[id^="kvg:StrokePaths"]`.
 *   - The `g[id^="kvg:StrokeNumbers"]` branch is ignored (it contains <text> glyph labels).
 *   - Returns `[]` if the SVG has no recognisable StrokePaths group.
 *   - Does not mutate coordinates; values are the raw 109-space numbers from `d`.
 */
export function parseKanjiSvg(svg: string): KanjiStroke[] {
  // xmldom does not fetch external DTDs; pass a silent error handler to suppress
  // the inline !ATTLIST advisory warnings every KanjiVG file carries.
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });
  const doc = parser.parseFromString(svg, 'image/svg+xml');

  const root = doc.documentElement;
  if (!root) return [];

  // Find the StrokePaths group. Prefer an id-prefixed lookup to avoid the StrokeNumbers group.
  const groups = root.getElementsByTagNameNS(SVG_NS, 'g');
  let strokePathsGroup: Element | null = null;
  for (let i = 0; i < groups.length; i++) {
    const id = groups[i]!.getAttribute('id') ?? '';
    if (id.startsWith('kvg:StrokePaths')) {
      strokePathsGroup = groups[i]!;
      break;
    }
  }
  if (!strokePathsGroup) return [];

  const paths = strokePathsGroup.getElementsByTagNameNS(SVG_NS, 'path');
  const strokes: KanjiStroke[] = [];

  for (let i = 0; i < paths.length; i++) {
    const node = paths[i]!;
    const d = node.getAttribute('d');
    if (!d) continue;

    // kvg:type uses the custom KanjiVG namespace; getAttributeNS is the robust path.
    // Some xmldom builds expose it only via getAttribute('kvg:type'); try both.
    const kvgType = node.getAttributeNS(KVG_NS, 'type') || node.getAttribute('kvg:type') || null;

    const commands = parseD(d);
    const subPaths = flattenPath(commands);
    // A KanjiVG stroke is a single M-started sub-path. We concatenate defensively.
    const flat: Point[] = subPaths.flat();
    if (flat.length < 2) continue;
    const simplified = rdpSimplify(flat);

    strokes.push({
      points: simplified,
      endpointType: classifyEndpoint(kvgType),
      strokeNumber: i + 1, // document-order 1-origin — matches "kvg:...-sN"
      kvgType,
    });
  }

  return strokes;
}
```

### 3-3. `package.json` の差分（`packages/generator/package.json`）

```jsonc
{
  "devDependencies": {
    // ... existing ...
    "@xmldom/xmldom": "^0.9.0",                                     // Bun/Node で SVG をパース（MIT, ~50 KB）
    "@tegaki/dataset-cjk-kanjivg": "workspace:*"                    // Phase 1 の成果物をテストから参照
  }
}
```

**設計ポイント**: どちらも `devDependencies` に限定。`@tegaki/dataset-cjk-kanjivg` を `dependencies` に入れると CC-BY-SA が generator 本体に波及する可能性（[phase-1-dataset-package.md §9-1](./phase-1-dataset-package.md) R1）があり、明示的に dev に留める。CJK を実際に使うエンドユーザーは `bun add @tegaki/dataset-cjk-kanjivg` を明示実行する設計（Phase 7 ドキュメントで案内）。外部公開時の `peerDependencies` 昇格は Phase 8 で再評価。

### 3-4. `KanjiStroke` 型と公開 API

| シグネチャ | 責務 |
|---|---|
| `type EndpointType = 'tome' \| 'hane' \| 'harai' \| 'dot' \| 'default'` | Phase 5 のリズム合成に渡す 5 値分類 |
| `interface KanjiStroke { points, endpointType, strokeNumber, kvgType }` | Phase 3 の `datasetSkeleton()` が消費する中間形式 |
| `parseKanjiSvg(svg: string): KanjiStroke[]` | **メインエントリ**。空配列は返すが throw しない |
| `classifyEndpoint(kvgType: string \| null): EndpointType` | テスト可能性のため export |
| `parseD(d: string): PathCommand[]` | S リフレクションのテスト用に export |

非公開: 内部定数 `ENDPOINT_BY_KVG_TYPE`、SVG / KVG namespace URL。

### 3-5. SVG path `d` 属性パーサの設計

KanjiVG の `d` 属性に登場するコマンドは **M / m / C / c / S / s の 3 種のみ** ([technical-validation.md §1-5](../technical-validation.md))。`L / Q / A / Z` は原典 SVG に含まれないため、汎用 SVG path パーサの代わりに **~50 行の軽量実装**で済む。

**S コマンドのリフレクション** ([technical-validation.md §1-6 #5](../technical-validation.md))が最大の罠。SVG 仕様上、S は直前の C/S の第 2 制御点を現在点で反射した点を第 1 制御点とする:

```
直前: C x1 y1 x2 y2 x y
後続: S x2' y2' x' y'
反射: x1' = 2·x - x2,   y1' = 2·y - y2
```

S の直前が C/S でない（M 直後等）場合は「現在点をそのまま」。実装では `lastCmd` と `out.at(-1)?.type` の両方を見て判定（§3-2 参照）。

### 3-6. `kvg:type` → endpointType マッピング仕様

[technical-validation.md §1-3](../technical-validation.md) のカタログを忠実に反映。視覚効果の観点では以下の 5 区分で十分（Phase 5 の σ/μ 補正値表とも 1:1 対応）。

| Unicode | 文字 | 意味（KanjiVG 仕様） | `endpointType` | 備考 |
|---|---|---|---|---|
| U+31D4 | ㇔ | 点 | `dot` | 最短の一筆 |
| U+31D0 | ㇐ | 横画 | `tome` | 止め |
| U+31D1 | ㇑ | 縦画 | `tome` | 止め |
| U+31C0 | ㇀ | 右上はね | `hane` | 跳ね |
| U+31C1〜 | ㇁㇂㇃㇆㇈㇉㇖㇙㇚㇟㇡ | 各種はね | `hane` | すべて跳ね系 |
| U+31C7 | ㇇ | 左払い→跳ね | `harai` | 払い |
| U+31CB 等 | ㇋㇏㇒㇓ | 払い系 | `harai` | 払い |
| U+31C4 等 | ㇄㇅㇕㇗㇛㇜㇞ | 折れ（hybrid） | `tome`（保守的） | 終端の挙動は tome 扱いが安全 |

**特殊記法の扱い**:
- **スラッシュ記法** `㇔/㇀`（[technical-validation.md §1-6 #6](../technical-validation.md)）: 「どちらに傾いてもよい」の意で**前者採用**がコミュニティ慣習。実装で `split('/')[0]`。
- **`a`/`b` サフィックス** `㇕a` / `㇕b`: 「他画との接続種別（中央接続 / 端接続）」の補助情報で endpoint 判定には不要。`replace(/[ab]$/, '')` で除去してからマップ参照。
- **仮名フォールバック**: ひらがな・カタカナの SVG には `kvg:type` が一切無い（[technical-validation.md §1-2](../technical-validation.md)）。`classifyEndpoint(null) → 'default'` で Phase 5 の σ/μ 補正値表の「1.00x / 0.0shift」（標準の非対称鐘型）が適用される。トメ/ハネ/ハライ分類を仮名に押し付けない意図的設計。

### 3-7. 既存コードとの接続点

| 既存コード | 使用 | 変更 |
|---|---|---|
| [`flattenPath()`](../../packages/generator/src/processing/bezier.ts) | `parseKanjiSvg()` が C/S を polyline 化 | 無変更 |
| [`rdpSimplify()`](../../packages/generator/src/processing/trace.ts) | `parseKanjiSvg()` が polyline を点数削減 | 無変更 |
| `Point` / `PathCommand` ([renderer types.ts](../../packages/renderer/src/types.ts)) | `import type ... from 'tegaki'` | 無変更 |
| [`getKanjiSvg()`](../../packages/dataset-cjk-kanjivg/src/index.ts) | テストで raw SVG 取得 | 無変更 |

`flattenPath()` は `PathCommand[]` → `Point[][]`（sub-paths）を返すが、KanjiVG ストロークは単一 M で始まる単連続なので `.flat()` で 1 次元化して RDP に渡す。

---

## §4. エージェントチーム構成

Phase 2 は 3 名編成。並列化しやすく、直列 5 日 / 並列 3 日程度で完走可能。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **パーサ実装リード** | 1 | `kanjivg.ts` 本体（`parseKanjiSvg` / `parseD` / `classifyEndpoint`）、`KanjiStroke` 型定義、namespace 処理、xmldom 設定、`flattenPath()` / `rdpSimplify()` との結線、`package.json` の devDependency 追加 | TypeScript strict, SVG path 仕様 (W3C), xmldom の API、ベジェ曲線の数学 | 2.5d |
| 2 | **テスト作成担当** | 1 | `kanjivg.test.ts` の 8+ describe ケース（代表字 + エッジケース）、Phase 1 パッケージとの統合 e2e テスト、snapshot fixture の選定と固定、coverage 測定 | Bun test runner, mock / fixture design、KanjiVG の実データ読み込み、テスト設計原則 | 1.5d |
| 3 | **SVG 仕様検証担当** | 1 | SVG 1.1 path grammar の M/C/S 仕様照合、S リフレクションのベジェ連続性証明、xmldom の namespace 処理検証（Bun / Node の実機確認）、[technical-validation.md §1-6](../technical-validation.md) の 10 個の落とし穴が実装で回避されているかの**形式的チェックリスト**作成 | W3C SVG 1.1 仕様, XML namespace, Unicode CJK Strokes Block (U+31C0-31E3) | 1.0d |

### 4-1. ロール間の受け渡しとレビュー委譲

```
 #3 SVG grammar チェックリスト (0.5d) ──→ #1 parseD() / S-reflection 実装開始
 #1 KanjiStroke 型定義 (0.5d) ────────→ #2 test fixture / case 設計
 #1 parseKanjiSvg() 骨子 (1.0d) ──────→ #2 unit test 書き始め (#1 と並走)
 #1 完成 (2.5d) ──┬──────────────────→ #3 e2e 検証 / 10 落とし穴チェック
                  └──────────────────→ #2 coverage 測定 / 仕上げ
 #2 #3 完了 (4.5d) ─────────────────→ #1 レビュー対応、PR 化
```

レビュー委譲: API シグネチャは **#1**、テストカバレッジは **#2**、SVG 仕様・落とし穴チェックは **#3** が独立に LGTM を出す。単独 reviewer が全観点を網羅する必要なし。

---

## §5. 提供範囲（Deliverables）

このチケットで納品するもののチェックリスト。レビュー時に PR 本文へ貼り付けて使用する。

### 5-1. コード成果物

- [ ] `packages/generator/src/dataset/kanjivg.ts`（§3-2 実装、~150 行）
- [ ] `packages/generator/src/dataset/kanjivg.test.ts`（§7 の 8+ describe ブロック）
- [ ] `packages/generator/package.json` — `devDependencies` に `@xmldom/xmldom@^0.9.0` と `@tegaki/dataset-cjk-kanjivg: "workspace:*"` を追加
- [ ] ルート `bun.lock` の差分（`bun install` 後に自動生成）

### 5-2. ドキュメント成果物

- [ ] 本チケット `docs/tickets/phase-2-kanjivg-loader.md` のレビュー済み版
- [ ] `docs/tickets/README.md` のステータス列を「📝 未着手」→「🚧 実装中」→「👀 レビュー中」→「✅ 完了」で遷移更新
- [ ] Phase 3 チケット ([phase-3-pipeline-integration.md](./phase-3-pipeline-integration.md)) の冒頭に、Phase 2 で確定した `KanjiStroke` 型シグネチャおよび「未収録時 `[]` を返す」契約を反映

### 5-3. 追加依存

| パッケージ | バージョン | ライセンス | 用途 | インストール先 |
|---|---|---|---|---|
| `@xmldom/xmldom` | `^0.9.0` | MIT | Bun/Node での SVG XML パース | `packages/generator/devDependencies` |
| `@tegaki/dataset-cjk-kanjivg` | `workspace:*` | CC-BY-SA-3.0 | テスト / 実行時の raw SVG 供給 | `packages/generator/devDependencies`（波及抑制のため dev のみ） |

### 5-4. プロジェクト管理成果物

- [ ] `feat/ja-phase2-kanjivg-loader` ブランチから `main` への PR 作成
- [ ] PR 本文に本チェックリストを埋め込み、**CC-BY-SA を `devDependencies` 側に留める設計意図**を冒頭に明示
- [ ] Phase 3 チケット (`phase-3-pipeline-integration.md`) に §12 の申し送り事項を反映

---

## §6. テスト項目（受入基準ベース）

[requirements.md FR-2 / FR-3](../requirements.md) の各項目を Phase 2 の範囲にマッピングしたテストケース。Phase 2 は「SVG → 中間形式」変換層のため、座標変換 (FR-3.3 / FR-3.4) は Phase 3 のテスト項目として委譲する。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | FR-2.1 | 「右」(U+53F3) の SVG で `parseKanjiSvg()` が 5 本の stroke を返し、`strokeNumber` が `[1,2,3,4,5]` 順 | 配列長 5、昇順 | unit |
| T-02 | FR-2.1 | 「田」(U+7530) で 5 本、`strokeNumber` が `[1,2,3,4,5]` 順 | 配列長 5、昇順 | unit |
| T-03 | FR-2.1 | 「き」(U+304D) で 4 本、`strokeNumber` が `[1,2,3,4]` 順 | 配列長 4、昇順 | unit |
| T-04 | FR-2.1 | 「ア」(U+30A2) で 2 本、`strokeNumber` が `[1,2]` 順 | 配列長 2、昇順 | unit |
| T-05 | FR-2.2 | 「右」の endpointType 列が `['harai','tome','tome','tome','tome']` | 配列完全一致 | unit |
| T-06 | FR-2.2 | 「田」の endpointType 列の初手が `'tome'`（`㇑`） | strokes[0].endpointType === 'tome' | unit |
| T-07 | FR-2.3 | 「き」の全 stroke で `kvgType === null && endpointType === 'default'` | 4/4 件で true | unit |
| T-08 | FR-2.3 | 「ア」の全 stroke で `kvgType === null && endpointType === 'default'` | 2/2 件で true | unit |
| T-09 | FR-2.4 | `classifyEndpoint('㇔/㇀')` が `'dot'`（前者採用） | 文字列一致 | unit |
| T-10 | FR-2.4 | `classifyEndpoint('㇕a')` が `'tome'`（サフィックス除去後に hybrid→tome） | 文字列一致 | unit |
| T-11 | FR-2.5 | バリアントファイル `05cf6-Kaisho.svg` が Phase 1 で除外されているため `getKanjiSvg(0x5cf6)` → 本体のみ取得、バリアントは読めない | 本体 SVG のみ | unit |
| T-12 | FR-2.6 | Phase 1 の `KANJIVG_SHA === 'r20250816'` が維持されていること（再確認） | 文字列一致 | unit |
| T-13 | —（SVG 構造） | S コマンドのリフレクションで生成される C コマンドの第 1 制御点が、直前 C の第 2 制御点を現在点で反射した値に等しい | 数値誤差 < 1e-9 | unit |
| T-14 | —（異常系） | `parseKanjiSvg('')` が `[]` を返し throw しない | 配列長 0 | unit |
| T-15 | —（異常系） | `parseKanjiSvg('<svg></svg>')`（StrokePaths 無し）が `[]` を返し throw しない | 配列長 0 | unit |
| T-16 | —（異常系） | `parseKanjiSvg('not an xml at all')` が `[]` を返し throw しない（xmldom のエラーハンドラで抑制） | 配列長 0 | unit |
| T-17 | —（型契約） | 返り値の各 stroke で `points.length >= 2` かつ `points[0]` と `points[points.length-1]` が数値 | 不変条件 | unit |
| T-18 | —（e2e） | `getKanjiSvg(0x53f3)` → `parseKanjiSvg()` → 5 本取得の連鎖 | 配列長 5 | e2e |
| T-19 | NFR-3 | `bun typecheck` が exit 0 | exit 0 | unit |
| T-20 | NFR-3 | `bun check` (Biome) が exit 0 | exit 0 | unit |
| T-21 | NFR-3.4 | `kanjivg.test.ts` が exit 0 で全 pass | exit 0 | unit |

---

## §7. Unit テスト

`packages/generator/src/dataset/kanjivg.test.ts` に以下の 8+ describe ブロックを配置する。Bun の `test()` / `describe()` / `expect()` を使用。既存リポジトリの `.ts` 拡張子規約に揃える。

```ts
// packages/generator/src/dataset/kanjivg.test.ts
import { describe, expect, it } from 'bun:test';

import { getKanjiSvg } from '@tegaki/dataset-cjk-kanjivg';

import { classifyEndpoint, parseD, parseKanjiSvg } from './kanjivg.ts';

describe('parseKanjiSvg() — stroke extraction', () => {
  describe('right (右 U+53F3)', () => {
    it('returns 5 strokes in document order', () => {
      const svg = getKanjiSvg(0x53f3);
      if (!svg) throw new Error('Phase 1 did not include 右; check allowlist.json');
      const strokes = parseKanjiSvg(svg);
      expect(strokes).toHaveLength(5);
      expect(strokes.map((s) => s.strokeNumber)).toEqual([1, 2, 3, 4, 5]);
    });

    it('classifies endpointType as [harai, tome, tome, tome, tome] (㇒ ㇐ ㇑a ㇕b ㇐b)', () => {
      // Stroke 1: ノ→㇒→harai | 2: 一→㇐→tome | 3: 口左縦→㇑a→tome | 4: 口カド→㇕b→tome | 5: 口底→㇐b→tome
      const svg = getKanjiSvg(0x53f3)!;
      const strokes = parseKanjiSvg(svg);
      expect(strokes.map((s) => s.endpointType)).toEqual(['harai', 'tome', 'tome', 'tome', 'tome']);
    });

    it('each stroke has ≥ 2 simplified points', () => {
      const svg = getKanjiSvg(0x53f3)!;
      const strokes = parseKanjiSvg(svg);
      for (const s of strokes) expect(s.points.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('field (田 U+7530)', () => {
    it('returns 5 strokes ㇑→㇕a→㇑a→㇐a→㇐a; all tome', () => {
      const svg = getKanjiSvg(0x7530);
      if (!svg) throw new Error('Phase 1 did not include 田');
      const strokes = parseKanjiSvg(svg);
      expect(strokes).toHaveLength(5);
      expect(strokes[0]!.kvgType).toBe('㇑');
      expect(strokes.map((s) => s.endpointType)).toEqual(['tome', 'tome', 'tome', 'tome', 'tome']);
    });
  });

  describe('ki (き U+304D) — hiragana with no kvg:type', () => {
    it('returns 4 strokes (textbook-style split, not printed 2-stroke); all default', () => {
      const svg = getKanjiSvg(0x304d);
      if (!svg) throw new Error('Phase 1 did not include き');
      const strokes = parseKanjiSvg(svg);
      expect(strokes).toHaveLength(4);
      for (const s of strokes) {
        expect(s.kvgType).toBeNull();
        expect(s.endpointType).toBe('default');
      }
    });
  });

  describe('a-katakana (ア U+30A2) — katakana with no kvg:type', () => {
    it('returns 2 strokes, all default endpoints', () => {
      const svg = getKanjiSvg(0x30a2);
      if (!svg) throw new Error('Phase 1 did not include ア');
      const strokes = parseKanjiSvg(svg);
      expect(strokes).toHaveLength(2);
      for (const s of strokes) {
        expect(s.kvgType).toBeNull();
        expect(s.endpointType).toBe('default');
      }
    });
  });
});

describe('classifyEndpoint()', () => {
  it('handles slash notation by taking the first symbol — ㇔/㇀ → dot', () => {
    expect(classifyEndpoint('㇔/㇀')).toBe('dot');
  });

  it('strips a/b joint suffix before lookup — ㇕a → tome', () => {
    expect(classifyEndpoint('㇕a')).toBe('tome');
    expect(classifyEndpoint('㇐b')).toBe('tome');
    expect(classifyEndpoint('㇑a')).toBe('tome');
  });

  it('maps hane symbols to hane', () => {
    for (const s of ['㇀', '㇁', '㇖', '㇚']) {
      expect(classifyEndpoint(s)).toBe('hane');
    }
  });

  it('maps harai symbols to harai', () => {
    for (const s of ['㇒', '㇏', '㇓']) {
      expect(classifyEndpoint(s)).toBe('harai');
    }
  });

  it('maps hybrid symbols to tome (conservative)', () => {
    for (const s of ['㇕', '㇗', '㇞']) {
      expect(classifyEndpoint(s)).toBe('tome');
    }
  });

  it('returns default for null, empty, unknown', () => {
    expect(classifyEndpoint(null)).toBe('default');
    expect(classifyEndpoint(undefined)).toBe('default');
    expect(classifyEndpoint('')).toBe('default');
    expect(classifyEndpoint('unknown_symbol')).toBe('default');
  });
});

describe('parseD() — SVG path d attribute parser', () => {
  it('parses absolute M + C commands', () => {
    const cmds = parseD('M 10 20 C 30 40 50 60 70 80');
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toEqual({ type: 'M', x: 10, y: 20 });
    expect(cmds[1]).toMatchObject({ type: 'C', x1: 30, y1: 40, x2: 50, y2: 60, x: 70, y: 80 });
  });

  it('handles relative c commands cumulating from the current point', () => {
    const cmds = parseD('M 10 20 c 5 5 10 10 15 15');
    // 'c' relative: 10+15=25, 20+15=35 final
    expect(cmds[1]).toMatchObject({ type: 'C', x: 25, y: 35 });
    expect(cmds[1]).toMatchObject({ x1: 15, y1: 25, x2: 20, y2: 30 });
  });

  it('reflects the previous C control point in S: continuity of cubic beziers', () => {
    // M 0 0  C 10 0 20 10 30 10  S 50 10 60 10
    //                         ^ x2=20 y2=10, current=(30,10)
    // After S: reflected x1' = 2*30 - 20 = 40, y1' = 2*10 - 10 = 10
    const cmds = parseD('M 0 0 C 10 0 20 10 30 10 S 50 10 60 10');
    expect(cmds).toHaveLength(3);
    const s = cmds[2]!;
    expect(s.type).toBe('C'); // we materialize S as C
    expect((s as { x1: number }).x1).toBeCloseTo(40, 9);
    expect((s as { y1: number }).y1).toBeCloseTo(10, 9);
    expect((s as { x2: number }).x2).toBeCloseTo(50, 9);
    expect((s as { y2: number }).y2).toBeCloseTo(10, 9);
    expect((s as { x: number }).x).toBeCloseTo(60, 9);
  });

  it('when S follows a non-cubic, uses current point as first control (SVG spec)', () => {
    // M 10 10  S 20 20 30 30  — S after M → x1' = current.x = 10, y1' = 10
    const cmds = parseD('M 10 10 S 20 20 30 30');
    const s = cmds[1] as { type: string; x1: number; y1: number };
    expect(s.type).toBe('C');
    expect(s.x1).toBeCloseTo(10, 9);
    expect(s.y1).toBeCloseTo(10, 9);
  });
});

describe('parseKanjiSvg() — edge cases & variants', () => {
  it('returns [] for empty string without throwing', () => {
    expect(parseKanjiSvg('')).toEqual([]);
  });

  it('returns [] for SVG with no StrokePaths group', () => {
    expect(parseKanjiSvg('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>')).toEqual([]);
  });

  it('returns [] for malformed input instead of throwing', () => {
    expect(parseKanjiSvg('not an xml at all')).toEqual([]);
    expect(parseKanjiSvg('<svg><unclosed>')).toEqual([]);
  });

  it('ignores <text> children in the StrokeNumbers group', () => {
    const fakeSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net">
      <g id="kvg:StrokePaths_00001">
        <path kvg:type="㇐" d="M 10 10 C 20 10 30 10 40 10"/>
      </g>
      <g id="kvg:StrokeNumbers_00001">
        <text x="5" y="5">1</text>
      </g>
    </svg>`;
    const strokes = parseKanjiSvg(fakeSvg);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.kvgType).toBe('㇐');
    expect(strokes[0]!.endpointType).toBe('tome');
  });

  it('returns null (via Phase 1) for codepoints not covered by the dataset', () => {
    // 0x1F600 = 😀 ; 0x3400 = CJK Ext A start (not in allowlist)
    expect(getKanjiSvg(0x1f600)).toBeNull();
    expect(getKanjiSvg(0x3400)).toBeNull();
  });

  it('does not load Kaisho variants — Phase 1 excluded them (FR-2.5)', () => {
    // U+5CF6 (島) is a covered codepoint; the variant 05cf6-Kaisho.svg is NOT shipped.
    // Phase 1 returns only the base SVG for this codepoint.
    const svg = getKanjiSvg(0x5cf6);
    if (!svg) return; // if not in allowlist, skip; otherwise assert structure
    expect(svg).toContain('id="kvg:StrokePaths_05cf6"');
    expect(svg).not.toContain('Kaisho');
  });
});

describe('e2e — Phase 1 → Phase 2 chain', () => {
  it('getKanjiSvg(0x53f3) → parseKanjiSvg() → 5 strokes', () => {
    const svg = getKanjiSvg(0x53f3);
    expect(svg).not.toBeNull();
    const strokes = parseKanjiSvg(svg!);
    expect(strokes).toHaveLength(5);
    expect(strokes[0]!.endpointType).toBe('harai'); // ノ
    expect(strokes[1]!.endpointType).toBe('tome'); // 一
  });
});
```

**カバレッジ観点**
- 正常系: 漢字（右・田）/ ひらがな（き）/ カタカナ（ア）の代表 4 字
- `kvg:type` パターン網羅: スラッシュ記法、`a`/`b` サフィックス、hane/harai/hybrid/null
- SVG パーサの低レベルテスト: M 絶対 / c 相対 / S リフレクション / S-after-M 特殊ケース
- 異常系: 空文字列 / 構造欠損 / 不正 XML / 未収録 codepoint / バリアント非同梱
- 統合: Phase 1 → Phase 2 の 1 行連結

---

## §8. e2e テスト

**目的**: Phase 1 のデータ供給と Phase 2 のパース層が**実配置環境で**連結して動作することを確認する。これが通れば Phase 3 の `datasetSkeleton()` は安心して依存できる。

### 8-1. テストシナリオ

```bash
# Step 1. クリーン状態を作る
cd C:/Users/yuta/Desktop/Private/tegaki
rm -rf node_modules packages/*/node_modules
bun install                                              # workspaces 全 install

# Step 2. Phase 1 のデータを用意（初回のみ、以降は冪等）
bun --filter @tegaki/dataset-cjk-kanjivg fetch-kanjivg

# Step 3. Phase 2 のユニットテスト実行
bun --filter tegaki-generator test --test-name-pattern 'parseKanjiSvg|classifyEndpoint|parseD'
bun --filter tegaki-generator typecheck

# Step 4. Phase 1 + Phase 2 の連結 e2e
cat > /tmp/tegaki-phase2-e2e.ts <<'TS'
import { getKanjiSvg, KANJIVG_SHA } from '@tegaki/dataset-cjk-kanjivg';
import { parseKanjiSvg } from 'tegaki-generator/src/dataset/kanjivg.ts';

const cases: { cp: number; char: string; expectedStrokes: number }[] = [
  { cp: 0x53f3, char: '右',   expectedStrokes: 5 },
  { cp: 0x7530, char: '田',   expectedStrokes: 5 },
  { cp: 0x304d, char: 'き',   expectedStrokes: 4 },
  { cp: 0x30a2, char: 'ア',   expectedStrokes: 2 },
];

let ok = true;
for (const { cp, char, expectedStrokes } of cases) {
  const svg = getKanjiSvg(cp);
  if (!svg) { console.error(`FAIL: ${char} not in dataset`); ok = false; continue; }
  const strokes = parseKanjiSvg(svg);
  if (strokes.length !== expectedStrokes) {
    console.error(`FAIL: ${char} expected ${expectedStrokes} strokes, got ${strokes.length}`);
    ok = false;
  } else {
    console.log(`ok: ${char} (U+${cp.toString(16).toUpperCase()}) → ${strokes.length} strokes`);
  }
}

if (!ok) process.exit(1);
console.log(`e2e ok: KANJIVG_SHA=${KANJIVG_SHA}, all 4 cases passed`);
TS
bun run /tmp/tegaki-phase2-e2e.ts
# expect final line: e2e ok: KANJIVG_SHA=r20250816, all 4 cases passed

# Step 5. 全体チェック
bun checks                                                # lint + format + typecheck + tests
```

### 8-2. 期待される最終出力

```
ok: 右 (U+53F3) → 5 strokes
ok: 田 (U+7530) → 5 strokes
ok: き (U+304D) → 4 strokes
ok: ア (U+30A2) → 2 strokes
e2e ok: KANJIVG_SHA=r20250816, all 4 cases passed
```

### 8-3. 失敗時の切り分け手順

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| Step 3 で `parseKanjiSvg is not a function` | exports 設定漏れ | `packages/generator/src/dataset/kanjivg.ts` の export 宣言を確認 |
| Step 3 で xmldom の import エラー | devDependencies 未追加 | `bun add -D @xmldom/xmldom@^0.9.0 --filter tegaki-generator` |
| Step 4 で「右」が 0 stroke | `g[id^="kvg:StrokePaths"]` の lookup が通っていない | xmldom の `getElementsByTagNameNS` が namespace prefix 無しで動作するか確認、`getElementsByTagName` へのフォールバック追加 |
| Step 4 で「き」が 0 stroke | `kvg:type` なしで classifyEndpoint が例外 throw している | `classifyEndpoint(null)` が early return で `'default'` を返すかテスト |
| Step 4 で endpoint が期待と異なる | `㇐b` 等のサフィックス除去漏れ | `classifyEndpoint()` の `replace(/[ab]$/, '')` が動いているか確認 |
| Step 5 で Biome エラー | `.ts` 拡張子漏れ・import order | `bun fix` |

---

## §9. 懸念事項とリスク

[technical-validation.md §1-6](../technical-validation.md) の 10 個の落とし穴を、本 Phase の範囲で**回避済み / 後続委譲 / 残余リスク**に整理する。

### 9-1. 10 個の落とし穴 × Phase 2 対応一覧

| # | 落とし穴 | 影響 | 本 Phase の対策 | 残余リスク |
|---|---|---|---|---|
| 1 | `kvg:StrokeNumber` 属性は**存在しない**（二次情報の誤り） | 高 | `getElementsByTagNameNS(SVG_NS, 'path')` の配列順を `strokeNumber = i + 1` として採用。属性を参照しない | なし |
| 2 | 仮名 SVG には `kvg:type` が付与されていない | 高 | `classifyEndpoint(null) → 'default'` の early return。T-07/T-08 で全仮名テスト | なし（Phase 5 も標準プロファイル扱いで対処済） |
| 3 | DOCTYPE の `!ATTLIST` による DTD 警告・外部 fetch 挙動 | 中 | `new DOMParser({ errorHandler: { warning/error/fatalError: () => {} } })` で全抑制。`@xmldom/xmldom` はデフォルトで外部 DTD fetch しない | `fatalError` まで抑制するため、**真に破損した SVG と未収録を区別不能**。Phase 3 で `hasKanji()` 併用を義務付け（§12 申し送り） |
| 4 | 座標は y-down（opentype は y-up） | 本 Phase では顕在化せず | **座標変換を一切しない** — 109×109 の raw 値を保持 | Phase 3 へ委譲（§12） |
| 5 | S コマンドのリフレクション処理忘れ | 高 | `parseD()` が `prevC2x/prevC2y` を追跡、`lastCmd` と `out.at(-1)?.type` 両方で反射可否を判定。T-05/T-13 で ±1e-9 精度検証 | 低 |
| 6 | スラッシュ記法 `㇔/㇀` の解釈 | 低〜中 | `classifyEndpoint()` 冒頭で `split('/')[0]`。T-09 で保証 | なし |
| 7 | バリアントファイル（`*-Kaisho.svg` 等） | 本 Phase では顕在化せず | Phase 1 で除外済み。T-11 で再確認 | なし（将来の opt-in 時も parse 層は無変更で可） |
| 8 | 既知の誤り字（娩・庫・炭） | 本 Phase では顕在化せず | **何もしない**（Phase 2 責務外） | Phase 6 へ委譲。`fix-overrides.json` path を予約コメントで残す |
| 9 | リリース毎の座標ドリフト | 本 Phase では顕在化せず | Phase 1 の `KANJIVG_SHA = 'r20250816'` 固定に依存 | SHA 更新時に Phase 2 テスト fixture の見直しが必要（§12） |
| 10 | `kvg:StrokeNumbers` グループの `<text>` 誤認 | 中 | `strokePathsGroup = groups.filter(id.startsWith('kvg:StrokePaths'))` で先にグループ絞り込み、その配下の `<path>` のみ取得。T-15 で保証 | なし |

### 9-2. Phase 2 固有の追加リスク

| ID | リスク | 影響 | 対策 |
|---|---|---|---|
| R-11 | `@xmldom/xmldom` の namespace 処理が Bun / Node で挙動差 | 中 | Step 4 e2e を Bun / Node 両方で走らせる CI を Phase 8 で検討。当面は Bun のみサポート明示 |
| R-12 | `flattenPath()` / `rdpSimplify()` の既存挙動が rebase で変わる | 低 | monorepo 前提で常に最新を使う。behavioural diff が出たら既存テスト側で検知 |
| R-13 | `PathCommand` 型が renderer 側で破壊的変更される | 低 | `import type { PathCommand } from 'tegaki'` の型参照のみ。実装時に相互参照を確認 |
| R-14 | CC-BY-SA が generator に波及する法務懸念 | 高 | `@tegaki/dataset-cjk-kanjivg` を `devDependencies` 限定 + PR 本文冒頭で設計意図を明示。Phase 1 §9-1 と連動 |

---

## §10. レビュー項目

PR レビュー時のチェックリスト。レビュワーは以下を順に確認し、指摘があればコメントする。

### 10-1. パース正確性観点

- [ ] `parseD()` が M / m / C / c / S / s の 6 コマンドすべてで正しく動作する（T-13〜）
- [ ] S コマンドのリフレクションが「直前が C / S でない」（M 直後の S 等）でも正しく動作
- [ ] `flattenPath()` の戻り値を `.flat()` で 1 次元化（stroke 単一連続前提に依存しない defensive な実装）
- [ ] 数値パース正規表現が指数表記 `1.5e-3` を処理できる（`/-?\d*\.?\d+(?:e-?\d+)?/g`）
- [ ] 相対座標コマンド（小文字 c/s/m）が current point 基準で正しく展開

### 10-2. xmldom の使い方観点

- [ ] `new DOMParser({ errorHandler: ... })` で警告抑制（§9-1 #3）
- [ ] `getElementsByTagNameNS(SVG_NS, 'path')` で SVG namespace を明示
- [ ] `getAttributeNS(KVG_NS, 'type')` + `getAttribute('kvg:type')` の両方を試す
- [ ] `doc.documentElement` が null のとき `[]` を返す
- [ ] `@xmldom/xmldom` が `devDependencies` 側（`dependencies` ではない、§5-3）

### 10-3. namespace 処理観点

- [ ] `SVG_NS = 'http://www.w3.org/2000/svg'` と `KVG_NS = 'http://kanjivg.tagaini.net'` が定数化
- [ ] `g[id^="kvg:StrokePaths"]` で StrokeNumbers グループの混入を防ぐ（§9-1 #10）
- [ ] 子要素の探索が namespace-aware（T-15 で Bun / Node 一致を確認）

### 10-4. エラーハンドリング観点

- [ ] 空文字列 / 不正 XML / StrokePaths 欠損で throw せず `[]` を返す（T-14/15/16）
- [ ] `points.length < 2` の stroke は除外（T-17）
- [ ] `parseD()` が不正な d 属性で throw しない
- [ ] `fatalError` 抑制による「未収録」と「SVG 破損」の区別不能問題が Phase 3 側で意識されている（§9-1 #3 / §12）

### 10-5. テストカバレッジ・ライセンス・規約観点

- [ ] §7 の 8+ describe ブロックすべて実装、代表字（右・田・き・ア）が unit で pass、e2e (§8) が手元で pass
- [ ] スラッシュ記法 / a/b サフィックス / null / unknown が classifyEndpoint のテストで網羅、S リフレクションが ±1e-9 精度（T-05）
- [ ] `bun test --filter tegaki-generator` / `bun typecheck` / `bun check` すべて exit 0
- [ ] `@tegaki/dataset-cjk-kanjivg` が **`devDependencies` にのみ**（R-14 / §3-3）、`tegaki-generator` の `license` が `"MIT"` のまま
- [ ] PR 本文冒頭に「dev で使うが配布物に CC-BY-SA は波及しない」旨を明示
- [ ] import が `.ts` 拡張子付き、Zod を使う場合は `import * as z from 'zod/v4'`、Biome（single quote, 2-space, 140-col）準拠

---

## §11. 一から作り直す場合の設計思想

> SVG → 中間形式の変換層を**一度経験した前提**で、1 年後・3 年後の自分が「パーサ自作という判断は妥当だったか」を検算できるよう、6 つの代替アーキテクチャを定量比較する。感情的な Pros/Cons ではなく**数字と失敗モード**で判断し、最終章で「私ならこうする」を断言する。
> Phase 1 §11-5 の結論（「案 A 採用、Phase 2 で抽象化境界を敷く」）を引き継ぎ、本 Phase では**その抽象化境界の内側で最も適切なパース実装**を選ぶ、という位置付けで書く。

### 11-1. 設計空間の全体像

KanjiVG SVG を `KanjiStroke[]` に変換する方法は 6 つに整理できる。案 A–D は Phase 2 起案時点から列挙していた選択肢。案 E・F は Phase 1 §11-5 で敷いた `StrokeDatasetProvider` interface の存在を踏まえて**今回追加**した選択肢である。

| 案 | 本質 | パース実装 | 実行時コスト | 依存サイズ |
|---|---|---|---|---|
| **A** | 現行案: TS で自作パーサ（~150 行） | M/C/S 限定の軽量実装 | runtime parse | `@xmldom/xmldom` のみ (~50 KB) |
| **B** | `svg-path-parser` npm 依存で任せる | 汎用パーサ | runtime parse | `svg-path-parser` (~30 KB) + `@xmldom/xmldom` |
| **C** | ビルド時に SVG を事前処理して JSON 化 | ビルドステップに移動 | runtime 0（JSON fetch のみ） | ゼロ（ランタイム） / scripts は案 A 相当 |
| **D** | WebAssembly の Rust/C++ 高速パーサ | wasm バイナリ経由 | wasm 初期化コスト + parse | wasm ~100-500 KB |
| **E** | **KanjiVG リポジトリ全体を事前変換し `@tegaki/dataset-cjk-kanjivg-json` として npm 配布** | ビルドは**別パッケージのリリース時に 1 回**、本体側は JSON を読むだけ | runtime ~5 μs/字（decode のみ） | JSON 同梱（gzip ~500 KB、on-demand 取得可） |
| **F** | **ブラウザ側は DOM ネイティブ、Bun/Node 側は xmldom の dual implementation** | 同一 interface を 2 実装 | runtime parse（環境ごと最適） | ブラウザ 0 KB / Bun +50 KB |

### 11-2. 定量比較（常用 + 人名用 + 仮名 ≈ 3,178 字を 1 バッチでパース想定、M1 Mac 基準）

> **数値の根拠と信頼度**:
>
> - 案 A の 150-300 μs/字は **まだ実測していない推定**。根拠は (1) 既存 `packages/generator/src/processing/bezier.ts` の `flattenPath()` が同等規模の C コマンドを 70-120 μs で処理する実測値、(2) xmldom の属性アクセスが 1 node あたり 50-80 μs 程度という別プロジェクトでの実測、の積み上げ。§7-3 に**事前実測タスクを追加**する（Day 1 でスパイクを切る）。
> - 案 B の 200-400 μs は `svg-path-parser` の [公開ベンチ](https://github.com/hughsk/svg-path-parser) ではなく、案 A との相対比較（ライブラリ層のオーバーヘッドで 1.3-1.5 倍悪化）の推定値。
> - 案 C・E の 5-10 μs は `JSON.parse` の実測レンジ（500 KB の JSON を Bun 1.x で ~30 ms）から 1 字あたりに割った数字。
> - 案 D の 50-150 μs は opentype.js の wasm ポートや [resvg-js](https://github.com/yisibl/resvg-js) 等の公開ベンチの類推。**Tegaki 内部で wasm を動かした実績はない**ため信頼度最低。
>
> 未実測値は **(推定)** と表記する。

| 指標 | 案 A（自作 TS） | 案 B（svg-path-parser） | 案 C（ビルド時 JSON） | 案 D（wasm） | 案 E（JSON npm 配布） | 案 F（dual impl） |
|---|---|---|---|---|---|---|
| **LOC / 依存サイズ** | ~150 / +50 KB | ~80 / +80 KB | ~60 + scripts 200 / runtime 0 | ~100 / +100-500 KB | ~40 / 0 KB（JSON 別配布） | ~200（2 impl + adapter） / 0-50 KB |
| **1 字 parse 速度** | ~150-300 μs (推定) | ~200-400 μs (推定) | ~5-10 μs (推定、JSON decode) | ~50-150 μs (推定、信頼度低) | ~5 μs (推定、JSON decode) | ブラウザ ~80-200 μs (推定) / Bun ~150-300 μs (推定) |
| **3,178 字総時間** | ~500-900 ms (推定) | ~700-1200 ms (推定) | ~30 ms (推定) | ~200-500 ms + 初期化 20-100 ms (推定) | ~20 ms (推定) | ブラウザ ~300-600 ms (推定) / Bun ~500-900 ms (推定) |
| **メンテコスト** | 中（M/C/S 固定、L/Q 追加時要修正） | 低（lib 任せ） | 中（ビルド CI 維持） | **高**（wasm/Rust toolchain、semver 地獄） | 中（別パッケージのリリースフロー追加） | **高**（2 実装の差分テスト維持） |
| **エラーハンドリング** | ◎ 純 TS | ○ lib 任せ | ◎ 生成物検証可 | × wasm 内部追いにくい | ◎ schema 検証で弾ける | ○ 環境別の挙動差に注意 |
| **type safety / テスト性** | ◎ / ◎（単独 export） | △ / ○ | ◎ / ◎（スナップショット） | ○ / △ | ◎ / ◎（JSON Schema で契約） | ◎ / △（2 実装分テスト） |
| **バンドラ / ブラウザ互換性** | ◎ / ◎ | ◎ / ◎ | ◎ / ◎ | **×** SSR 制約 / △ モバイル Safari | ◎ / ◎ | ◎ / ◎ |
| **実装工数（Phase 2 内）** | 2.5d | 2.0d | 3.5d | **5-7d**（wasm toolchain 構築 1-2d + Rust 実装 2-3d + CI/binding 2d。Tegaki は純 Bun/TS で wasm 実績ゼロ） | 3.5d（パッケージ新設 + リリースパイプライン） | 3.5d（2 実装 + 差分 snapshot） |
| **JSON サイズ** | — | — | ~1.5 MB (gzip ~500 KB) | — | ~1.5 MB (gzip ~500 KB)、ただし本体 tarball には含まれない | — |
| **他フォーマット横展開** | 可（Provider 経由） | 可（Provider 経由） | **✓ 最良**（HanziWriter/AnimCJK を統一 schema で吸収） | 可 | **✓ 最良**（JSON schema を AnimCJK 等と共有可能） | 可（Provider 経由） |

### 11-3. 各案の要点

**案 A（自作 TS、~150 行）** — KanjiVG が M/C/S の 3 コマンドしか使わない仕様上の単純性を武器に、汎用パーサの機能を諦めて最小に絞る（[technical-validation.md §1-5](../technical-validation.md) で確認済み）。
- 利点: レビュー容易（150 行で 30 分） / 依存 1 つのみ / TS の型推論フル活用 / エラーハンドリング完全制御 / 既存 `flattenPath()` が消費する `PathCommand[]` に直接出力可能
- 欠点: L / Q の将来追加時に要修正（公式仕様上ありえず懸念低）、S リフレクションを自前で正しく書く必要（[technical-validation.md §1-6 No.5](../technical-validation.md) で明示）

**案 B（`svg-path-parser` npm 利用）** — SVG path `d` 属性の解釈を汎用 lib に委譲。本実装は xmldom → lib → `KanjiStroke` の変換に専念。
- 利点: SVG 1.1 全コマンド対応 / S リフレクションのバグを抱えない / LOC 80 行
- 欠点: lib メンテ状況に依存 / バージョン固定 + security audit / lib のエラー体系が Tegaki 慣習と合わない可能性
- 比較対象: `svg-path-parser`（最も枯れた ~30 KB、2018 以降軽微 update のみ）、`svgpath`（path manipulation 特化で機能過多）、`@svgdotjs/svg.js`（全体フレームワーク、論外）

**案 C（ビルド時 JSON 化、本体リポジトリ内）** — Phase 1 の `fetch-kanjivg.ts` を拡張し、`parseKanjiSvg()` 適用後の結果を `glyph-data.json` として commit。
- 利点: parse 速度 ~5-10 μs/字（JSON decode のみ） / ランタイム依存ゼロ / edge runtime 最良
- 欠点: ビルドパイプラインが重く（+2-300 行） / 本体 repo に 1.5 MB の生成物が紛れ込む / 分類ロジック変更時のホットリロード性低下 / Phase 3 が動的 JSON import 必要
- **案 E との違い**: JSON を**同一 repo に置く**のが C、**別パッケージとして npm 配布**するのが E

**案 D（wasm で Rust/C++ 高速パーサ）** — 理論上は案 A の 3-5 倍速。
- 利点: pure parse 速度は最速（と推定、未検証） / Rust の safety
- **欠点（致命的）**:
  - wasm バイナリ 100-500 KB（`tegaki-generator` 本体 50 KB の桁違い）
  - 初期化 20-100 ms（案 A の**総 parse 時間より長い**、最適化として逆効果）
  - CI に Rust toolchain 追加（wasm-pack / wasm-bindgen / cargo のバージョン管理）
  - **Tegaki の既存コードベースに wasm 実績ゼロ**（AGENTS.md 冒頭の「Runtime: Bun / Language: TypeScript」という約束を破る）
  - モバイル Safari / edge runtime の wasm 制約（CSP / sandbox）
  - 3,178 字で 1 秒未満の parse は**そもそも最適化対象ではない**（Phase 3 以降の `flattenPath()` + `rdpSimplify()` のほうが 1-2 桁重い）
- **コスト試算**: 現実には 1-2 週間。内訳は toolchain 選定・導入 2-3 日 / Rust 実装 3-5 日 / JS binding + bundler 統合 2-3 日 / CI 統合 + Windows/Linux cross-compile 検証 2-3 日
- **メンテリスク**: `wasm-bindgen` の semver drift、`@rollup/plugin-wasm` と Bun build の相性、Cloudflare Workers 等 edge での wasm size 制約、モバイル Safari の MemoryGrowth バグなど、**半年に 1 回踏みうる地雷が多い**

**案 E（KanjiVG を JSON 化し別 npm パッケージとして配布）— 新規追加**  — Phase 1 §11-5 で敷いた `StrokeDatasetProvider` interface の素直な帰結。`@tegaki/dataset-cjk-kanjivg`（生 SVG を抱える）に加え、**`@tegaki/dataset-cjk-kanjivg-json` を新設**し、事前変換済み `glyph-data.json` のみを同梱する。パース層は `JSON.parse` + schema 検証 ~40 行に縮退する。
- 利点:
  - **本 Phase の parse 実装は事実上消える**（provider 差し替えのみ）
  - SVG 版（フル情報）/ JSON 版（高速ロード）をユースケース別に **opt-in 選択可能**
  - AnimCJK / HanziWriter も同じ JSON schema に吸収すれば、provider 層が統一フォーマットで揃う（Phase 1 §11-3 の案 D 抽象化の完成形）
  - CC-BY-SA 境界が**派生物パッケージ**に明確化される（ライセンス透明性 UP）
- 欠点:
  - Phase 1 で「dataset パッケージを 1 つ」と決めた方針と整合取り直しが必要（= スコープ増）
  - SVG schema の変更追従と JSON schema の変更追従が 2 本立てになる
  - 「Phase 2 で SVG パーサを書く」という本チケットの存在意義そのものを揺るがす
- **判定**: 方向性として正しいが、**Phase 2 の実装は先に SVG パース（案 A）で済ませ、その出力を JSON にフリーズした瞬間から案 E 相当**になる。つまり**案 A を書かないと案 E を作れない**ため、本 Phase では案 A、Phase 3 完了後 / Phase 5 前あたりで `@tegaki/dataset-cjk-kanjivg-json` を派生公開、が段階移行として素直。

**案 F（ブラウザは DOM ネイティブ、Bun/Node は xmldom の dual implementation）— 新規追加**  — `technical-validation.md §1-7` が明示する「ブラウザは native `DOMParser` で OK / Bun・Node は `@xmldom/xmldom` 必要」という事実を**最初から実装に反映**する。
```ts
// packages/generator/src/dataset/parse/parse-kanji-svg.ts
export const parseKanjiSvg: (svgText: string) => KanjiGlyph =
  typeof globalThis.DOMParser !== 'undefined'
    ? parseWithNativeDom       // ~80 行、0 KB
    : parseWithXmldom;         // ~100 行、+50 KB
```
- 利点:
  - ブラウザで **xmldom を同梱しない**（website の generator UI が 50 KB 軽くなる）
  - Phase 4 の website 統合で「サーバー/ブラウザ両対応」という要件に正面から応える
  - 実行環境ごとにフェアに最速（native DOM は C++ 実装、xmldom の 3-10 倍速が期待できる、推定）
- 欠点:
  - **2 実装の差分テストが永遠の負債**（xmldom は `getAttributeNS()` が native とやや違う、`DOCTYPE` 挙動も差あり → `technical-validation.md §1-6 No.3`）
  - コードパスが倍になり、カバレッジ確保のためスナップショット + 差分 snapshot の二重管理
  - bundler の条件分岐が入り、Astro の SSR/CSR 境界で事故る可能性
- **判定**: Phase 2 単体の最適化としては過剰。**案 A をまず書き、`parseKanjiSvg()` の内部実装だけを環境分岐する**なら案 A + F ハイブリッドとして実現可能（=「案 A を書けば後から F にアップグレードできる」）。

### 11-4. 結論: 私ならこうする（断言）

**Phase 2 では迷わず案 A を採用する。Phase 3 完了後に案 E（JSON npm 配布）への派生、Phase 4 の website 統合時に案 F（dual impl）への内部置換、を検討**、というのが私の結論である。案 B / C / D は全て棄却する。

根拠は以下 5 点:

1. **案 D は完全な over-engineering。1-2 週間の工数を払って得られる価値がゼロ** — 3,178 字で 1 秒未満、wasm 初期化のほうが総 parse より長い。AGENTS.md の「Tegaki は Bun/TS で完結」という暗黙の契約を破る見返りが**ない**。3 年後に振り返って「なぜあの頃 wasm を入れたのか説明できない」案件になる。
2. **案 B は案 A より高コスト** — lib の security audit + バージョン pin + S リフレクション検証で案 A の実装（2.5d）と同等。しかも `kvg:type` → endpointType の分類層は lib に吸収されず自前実装必須（[technical-validation.md §1-3](../technical-validation.md) のマッピング）。節約にならない。
3. **案 C / 案 E は Phase 2 単独では過剰、Phase 3 完了後に意味を持つ** — 案 A の出力（`KanjiGlyph`）が安定してから JSON スキーマを凍結する段階移行が、設計変更コスト最小。**案 A を書かずに案 E は作れない**という実装順序上の事実も決定打。
4. **案 F は Phase 4 統合時の内部実装差し替え**として後置可能 — `parseKanjiSvg()` 関数の export シグネチャを今から固定しておけば、内部の environment 分岐は将来追加で済む。Phase 2 でやる必然性なし。
5. **案 A は既存 `flattenPath()` / `rdpSimplify()` との親和性が最良** — 既存パイプラインは `Point[]` / `PathCommand[]` 中心で、`parseD()` の戻り値がそのまま繋がる。案 B/C/D/E/F いずれも中間表現の統合コストが発生するが、案 A は**ゼロ**。

**Phase 2 では案 A、Phase 3 完了後に案 E へ段階派生、Phase 4 で案 F に内部置換**が Pareto 最適。これが Phase 1 §11-5 の「案 A 採用 + Phase 2 で抽象化境界を敷く」という先行判断と**完全に整合する**（provider interface の内側でパース実装を自由に差し替えられる構造を Phase 1 で敷いたからこそ、本 Phase は SVG パースだけに集中でき、Phase 3 以降で E/F へ派生できる）。

### 11-5. この判断が 1 年後・3 年後に妥当だったと言えるか

- **1 年後（常用 + 人名用で運用中、Phase 5 リズム合成完成済み）**: parse 時間は全生成プロセスの 1% 未満（推定）。案 E への派生は未発動で OK。案 A の 150 行は「KanjiVG 専用 provider の内部実装」として静かに生存。wasm を入れなかった判断に対して、不満は出ようがない。
- **3 年後（他言語対応 or JIS 第 2 水準拡張中）**: `StrokeDatasetProvider` interface の上に KanjiVG / AnimCJK / Kanji alive / HanziWriter の 4 provider が並ぶ姿になる。案 A のパース層は「KanjiVG 専用 plugin」として残り、案 E が「全 dataset 共通の JSON 配布レイヤ」として機能する。**ここで過去の自分に感謝するのは「interface boundary を Phase 1 で敷いた」判断であって、「wasm を入れた」判断ではない**。
- **3 年後（仮にプロジェクトが停滞した場合）**: 案 A は 150 行の TS で自己完結、`@xmldom/xmldom` も MIT で長期互換（2013- の枯れライブラリ）。Zhang-Suen 等と同様「動く状態でフリーズ」可能。案 D を採用していたら、3 年後に wasm-bindgen が semver break して静かに壊れる未来が濃厚。
- **逆に妥当性が崩れるシナリオ**: KanjiVG が突如仕様変更して L/Q/A コマンドを採用 → 案 A が 50-80 行の追加修正を要する（案 B なら 0 行）。だがこの確率は過去 15 年の実績からみて極めて低い。

### 11-6. 他データセット（AnimCJK / HanziWriter 等）のパーサを将来統合する際、今の実装は障害にならないか

**結論: ならない**。案 A の `parseKanjiSvg()` は `packages/generator/src/dataset/parse/` 配下に隔離する設計で、公開 API は `StrokeDatasetProvider.getStrokes(codepoint)` 経由のみ（Phase 1 §11-7 で敷いた boundary に準拠）。他データセット統合時は以下の独立ファイルが追加されるだけで、KanjiVG パーサに手を入れる必要はない。

| フォーマット | 変換層の想定 LOC | 配置 | 困難度 |
|---|---|---|---|
| **KanjiVG**（本 Phase） | 150（実装中） | `packages/generator/src/dataset/parse/parse-kanji-svg.ts` | — |
| **AnimCJK JSON** | ~80（既に構造化済） | `packages/dataset-cjk-animcjk/src/provider.ts` | 低 |
| **HanziWriter data**（character JSON + medians） | ~100 | `packages/dataset-cjk-hanziwriter/src/provider.ts` | 低 |
| **Kanji alive**（SVG + JSON メタ） | ~120（SVG パース部分を `parse-kanji-svg.ts` からは共有しない。KanjiVG と Kanji alive の SVG spec は別物） | `packages/dataset-cjk-kanji-alive/src/provider.ts` | 中 |
| **Make Me A Hanzi** | ~80（※ [japanese-support.md §3-3](../japanese-support.md) で日本用途不可と明示） | 同上 | 低（技術的には） |
| **KondateInkML（将来の時系列入力）** | ~200（時系列サンプリングの扱い要） | `packages/dataset-cjk-kondate/src/provider.ts` | 高 |

**注意点**: `parseKanjiSvg()` の戻り値型 `KanjiGlyph` を他 provider から再利用しようとすると KanjiVG 固有フィールド（`kvg:type`, `kvg:element`）が漏れる。そのため `StrokeDatasetProvider.getStrokes()` の戻り値は **KanjiVG 非依存の正規化型 `NormalizedStroke[]`**（§3-2 で定義）に閉じる設計を厳守する。これを怠ると 3 年後の AnimCJK 統合時に KanjiVG 型が generator 深層に漏出していて、抽象化リファクタに 5-10 日かかる未来が来る。

### 11-7. 本 Phase で今のうちに打っておく布石

Phase 1 §11-7 に倣い、将来の案 E / F 昇格と、他データセット統合の両方に備える仕込みを本 Phase で済ませておく。

- `parseKanjiSvg()` は `svgText: string` を受け `KanjiGlyph` を返す**純関数**として export — 環境非依存、I/O 非依存。案 F 化（native DOM / xmldom 分岐）は内部実装の置換のみで可能。
- `KanjiGlyph` と `NormalizedStroke` を**別型**として分離 — KanjiVG 固有フィールドの漏出を型レベルで禁止。他 provider 追加時の契約が明確。
- `@xmldom/xmldom` の import を `parseKanjiSvg()` 内部に閉じ込め、`index.ts` からは露出しない — 案 F 実装時に dead code elimination が効く。
- JSON schema（`KanjiGlyph` の JSON 表現）を `packages/generator/src/dataset/parse/schema.ts` に**今は書かない**が、`KanjiGlyph` の TypeScript 型には [`@sinclair/typebox`](https://github.com/sinclairzx81/typebox) 等での後付け schema 化を阻害する設計にしない（関数型 / オブジェクト型のみ、クラスや Symbol キーを使わない）。これで案 E 移行時に schema.ts を足すだけで JSON 配布が実現する。

以上により、**案 A を選ぶことは「今は最小コスト、将来の案 E / F / 他データセット統合への移行コストも最小」という Pareto 最適**であることが示せる。1 年後も 3 年後も、この判断に対して自分で説明責任を負える自信がある。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 3（パイプライン統合）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **import path** | `import { parseKanjiSvg, type KanjiStroke, type EndpointType } from 'tegaki-generator/src/dataset/kanjivg.ts'` | `.ts` 拡張子付きで import |
| **関数シグネチャ** | `parseKanjiSvg(svg: string): KanjiStroke[]`（**同期**） | 未収録 / 破損時は `[]` を返す（throw しない） |
| **座標系** | KanjiVG の **109×109 正規化空間、y-down**（SVG 標準） | Phase 3 で unitsPerEm にスケール、y 軸反転、advanceWidth に沿って translate |
| **未対応の座標変換** | y 軸反転 / 109 → unitsPerEm スケール / 中心 (54.5, 54.5) 原点 translate / advanceWidth アライメント | **Phase 3 の責務** |
| **`endpointType` の意味** | Phase 5 の σ/μ 補正値表 ([technical-validation.md §2-3](../technical-validation.md)) と 1:1 対応 | Phase 3 / Phase 5 で Sigma-Lognormal リズム合成に渡す |
| **`strokeNumber` の意味** | 1-origin、`id="kvg:...-sN"` の N と一致、配列 index + 1 | Phase 3 の `orderStrokes()` はこの順序を**変えない**運用 |
| **未収録字の扱い** | Phase 1 `getKanjiSvg(cp) === null` で判定済み、Phase 2 は空配列 `[]` を返す | Phase 3 の `datasetSkeleton()` は `hasKanji(cp)` で先に分岐、false なら existing `skeletonize()` にフォールバック |
| **SVG 破損の区別** | `getKanjiSvg(cp) !== null && parseKanjiSvg(svg).length === 0` の場合は**SVG 破損**の可能性大 | Phase 3 で warn ログ + fallback の設計を推奨（§9-3 参照） |

### 12-2. Phase 3 で必要になる追加実装

- `datasetSkeleton({ char, ... }): { skeleton: Uint8Array, polylines: Point[][], widths: number[][] }` — Phase 2 の `parseKanjiSvg()` を内部で呼び出す。
- 座標変換関数 `transformKanjiVGToFontUnits(stroke: KanjiStroke, font: opentype.Font): Point[]` — y 反転 + 109 → unitsPerEm スケール + bbox translate。
- 線幅実測 `measureStrokeWidthsFromFont(strokes: KanjiStroke[], inverseDT: Float32Array): number[][]` — 既存 `getStrokeWidth()` を再利用。
- CLI フラグ `--dataset kanjivg` の `pipelineOptionsSchema` への追加（[technical-validation.md §3-2](../technical-validation.md)）。

### 12-3. Phase 5（Sigma-Lognormal リズム）への引き継ぎ

- `EndpointType` の 5 値分類 (`'tome' | 'hane' | 'harai' | 'dot' | 'default'`) は [technical-validation.md §2-3](../technical-validation.md) の σ/μ 補正値表と一致させてある。
- Phase 5 で `strokeParams(length, curvature, endpointType)` を実装する際、**仮名の `'default'` が特別扱いされずに標準プロファイルに載る**ことを想定済み。
- ストローク単位の `length` と `curvature` は Phase 2 で計算しない（Phase 3 / Phase 5 で polyline から算出）。Phase 2 は raw points を渡すのみ。

### 12-4. 既知の未対応字一覧（Phase 6 へ）

本 Phase では以下の既知問題に**対応しない**。すべて Phase 6 の視覚検証で顕在化する。

| codepoint | 字 | 問題 | 申し送り先 |
|---|---|---|---|
| U+5A29 | 娩 | KanjiVG 上流の stroke order 誤り | Phase 6 |
| U+5EAB | 庫 | 同上 | Phase 6 |
| U+70AD | 炭 | 同上 | Phase 6 |
| — | — | バリアント字（Kaisho / Jinmei） | Phase 1 で除外済み、将来の opt-in 検討 |
| — | — | JIS 第 3/4 水準 | 対象外（[requirements.md §5](../requirements.md)）、fallback |
| — | — | CJK 互換漢字（U+F900–FAFF） | fallback、[requirements.md FR-1.2](../requirements.md) |

Phase 6 の対応方針: `packages/generator/src/dataset/fix-overrides.json` を追加し、Phase 2 の `parseKanjiSvg()` の戻り値を codepoint 単位で上書きする機構を実装する。Phase 2 の段階ではこの path を**予約のみ**（`kanjivg.ts` の末尾に `// TODO(phase-6): fix-overrides support` のコメントを置く）。

### 12-5. 運用・保守に関する注意事項

**リリース更新時の影響** — [phase-1-dataset-package.md §9-3](./phase-1-dataset-package.md) の R3 と連動。`KANJIVG_SHA` 更新時は **Phase 2 の test fixture も見直し必須**。T-01〜T-08 のストローク数・endpointType 列が変わる可能性あり。Phase 2 のテストは raw SVG の構造変化に対して**意図的に脆弱**で、silent drift 検知の仕組みとする。

**パッケージ配布** — `@tegaki/dataset-cjk-kanjivg` は `devDependencies` のみのため、`bun add tegaki-generator` した配布 tarball に CC-BY-SA データは含まれない。CJK 処理を使うエンドユーザーは `bun add @tegaki/dataset-cjk-kanjivg` を明示実行する必要があり、Phase 7 のドキュメントで明記。既存 4 フォント bundle（[requirements.md NFR-2.2](../requirements.md)）への影響なし。

**パース層抽象化の予約** — [phase-1-dataset-package.md §11-5](./phase-1-dataset-package.md) で提案された `StrokeDatasetProvider` interface を Phase 3 冒頭で敷く予定。本 Phase の `parseKanjiSvg()` はその `KanjiVGProvider.getStrokes(codepoint)` の内部実装として再利用される。将来 `KanjiStroke` 型名を `DatasetStroke` 等に昇格する可能性あり（本 Phase は `KanjiStroke` のまま）。

**API 将来拡張余地** — 現在の単引数 `parseKanjiSvg(svg): KanjiStroke[]` からの**互換拡張**が可能:
- バリアント対応: `parseKanjiSvg(svg, { variant: 'Kaisho' })` 形式の opts 引数
- 部首情報: `KanjiStroke.radical?: string` を `kvg:element` から抽出（Phase 6 以降の「部首ハイライト」で利用）
- 筆順番号の位置: `kvg:StrokeNumbers` グループの `<text>` 座標を別関数で export（Phase 7 の Preview UI で検討）

---

### 関連チケット

- 前: [Phase 1: データセットパッケージ雛形](./phase-1-dataset-package.md)
- 次: [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)
- 一覧: [docs/tickets/README.md](./README.md)

### 関連ドキュメント

- 設計方針: [japanese-support.md](../japanese-support.md)（§3-5 / §6 / §9 Step 1）
- 実装ロードマップ: [japanese-roadmap.md](../japanese-roadmap.md)（§2 Phase 2）
- 技術検証: [technical-validation.md](../technical-validation.md)（§1-1, §1-2, §1-3, §1-5, §1-6, §1-7, §1-8）
- 要件定義: [requirements.md](../requirements.md)（FR-2, FR-3, NFR-3）
- プロジェクト全体: [AGENTS.md](../../AGENTS.md)
