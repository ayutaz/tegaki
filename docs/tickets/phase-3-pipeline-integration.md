# Phase 3: 既存パイプラインへの統合 `packages/generator/src/commands/generate.ts`

> 日本語対応実装の**第 3 マイルストーン、かつ最優先リスクフェーズ**。Phase 1 の `@tegaki/dataset-cjk-kanjivg` と Phase 2 の `parseKanjiSvg()` を、Tegaki 既存の glyph-processing パイプラインへ**破壊せずに**接続する。CJK 文字のみ新しい `datasetSkeleton()` 経路に分岐し、ラテン文字は現行ヒューリスティック経路を 1 行も触らずに温存する。このフェーズ完了時点で「右」「左」「田」「必」が **日本筆順で** 描画され、**ラテン snapshot 差分ゼロ**が達成された状態が第一次リリース候補点となる。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **3 / 8 ★最優先リスク** |
| マイルストーン名 | 既存パイプラインへの統合（`isCJK()` 分岐 + `datasetSkeleton()` + CLI フラグ） |
| ブランチ名 | `feat/ja-phase3-pipeline-integration` |
| ステータス | ✅ 完了 (merged in `0a356aa`) |
| 依存（前段） | [Phase 1: データセットパッケージ雛形](./phase-1-dataset-package.md) + [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md)（両方 main にマージ済み必須） |
| 依存（後段） | [Phase 4: 仮名バンドル](./phase-4-kana-bundle.md) / [Phase 5: Sigma-Lognormal リズム](./phase-5-rhythm-synthesis.md) が本 Phase の `datasetSkeleton()` 出力を消費 |
| 想定期間 | **5 営業日** (一人稼働、チーム 4 名で並列 3 日) |
| 担当見積 | 座標変換 1.5d + 分岐/フォールバック実装 1.5d + テスト 1.0d + visual QA 0.5d + レビュー対応 0.5d |
| **リリース区分** | **第一次リリース候補点**（筆順のみ正しい、リズムは等速） |
| **リスク評価** | **最重要**：座標ズレは目視で即座に判明、後修正困難 |
| 関連要件 | [requirements.md](../requirements.md) FR-1.1〜1.3 / FR-3.1〜3.4 / FR-4.1〜4.2 / FR-7.1〜7.3 / FR-8.1 / FR-8.3 / AC-1 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §6 / §9 Step 1-3 |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §2 Phase 3 |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §3-1 / §3-2 / §3-4-B |
| 前フェーズ申し送り | [phase-1-dataset-package.md §12-7](./phase-1-dataset-package.md) + [phase-2-kanjivg-loader.md §12-1〜12-2](./phase-2-kanjivg-loader.md) |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| `pipelineOptionsSchema` の `dataset` / `strict` フィールド追加（[generate.ts L34-58](../../packages/generator/src/commands/generate.ts)） | Sigma-Lognormal リズム合成（Phase 5） |
| `isCJK(char)` 判定関数の新設 | 仮名 179 字の pre-built バンドル配布（Phase 4） |
| `processGlyph()` L189-206 への分岐挿入 | 日本人評価者による MOS 検証（Phase 6） |
| `skeletonize/index.ts` に `'dataset'` モード追加 | 視覚回帰テスト（Playwright）フレーム導入（Phase 6） |
| 新規 `datasetSkeleton()` 実装 | `@tegaki/dataset-cjk-kanjivg-json` 派生パッケージ化 |
| KanjiVG 109 座標 → bitmap 座標変換関数 | 縦書き対応、簡体字・繁体字・韓国語 |
| 既存 `raster.transform` / `toFontUnits()` の再利用 | 部首ハイライト、バリアント SVG (`*-Kaisho`) |
| `orderStrokes()` への `precomputedWidths` 経路確認 | KanjiVG 未収録字の `fix-overrides.json`（Phase 6） |
| フォールバック戦略（未収録 → existing `skeletonize()` + warn） | rhythm data の `BUNDLE_VERSION` increment（Phase 5） |
| CLI フラグ `--dataset kanjivg` / `--strict` | 他データセット（AnimCJK 等）の provider 実装 |
| ラテン文字出力の snapshot 差分ゼロ検証（AC-1） | ドキュメント・examples 整備（Phase 7） |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-support.md §9 Step 1-3](../japanese-support.md) および [japanese-roadmap.md §2 Phase 3](../japanese-roadmap.md) で「**CJK 文字のみを新パイプラインに流し、ラテン文字は現状維持**」と明示された設計方針を、実装レイヤに落とし込む。解決する課題は 4 点。

1. **CJK/ラテン 2 経路の分岐点の設計** — `processGlyph()` L189-206 は現在「Stage 1〜6 の直線的パイプライン」で分岐点が存在しない。これを**非侵襲的に**2 経路へ分岐。[technical-validation.md §3-2](../technical-validation.md) のコード差分を起点に、Zod schema `dataset: z.enum(['kanjivg']).optional()` と `isCJK(char)` 分岐のみで既存ラテン経路を**1 行も触らない**ことが理想。
2. **KanjiVG 109 座標系 → フォント unitsPerEm 座標系への正確な変換** — [FR-3.1〜3.4](../requirements.md)。KanjiVG の (54.5, 54.5) 中心・y-down 正規化空間を opentype.js の y-up フォント単位空間へ変換。**このフェーズ最大のリスクは座標ズレ**で、目視で即座に判明するが数値検証だけでは見落としやすい。
3. **線幅実測の既存パイプライン活用** — [FR-4.1〜4.3](../requirements.md)。KanjiVG は線幅情報を持たないため、同じ glyph を opentype でラスタライズし `computeInverseDistanceTransform()` を取り、KanjiVG 座標 → bitmap 投影 → `getStrokeWidth()` で実測。**既存関数の再利用のみで新規ロジックは実装しない**のが本 Phase の設計意図。
4. **未収録字のフォールバック** — [FR-7.1〜7.3](../requirements.md)。KanjiVG 未収録字は既存ヒューリスティックに fallback（warn ログ付き）。`--strict` フラグで fallback 禁止しエラー終了する opt-in も用意。

### 2-2. Done の定義（測定可能）

以下 **14 項目すべて** を満たしたときチケット完了。[AC-1](../requirements.md) の 6 項目を網羅しつつ、本 Phase 固有のテクニカルチェックを加えた構成。

- [ ] **D-1** `pipelineOptionsSchema` に `dataset: z.enum(['kanjivg']).optional().describe(...)` が追加、既存フィールドはすべて無変更
- [ ] **D-2** `isCJK(char: string): boolean` が `packages/generator/src/dataset/is-cjk.ts` に export され、正規表現 `/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/` で判定
- [ ] **D-3** `processGlyph()` L189-206 に `useDataset = options.dataset === 'kanjivg' && isCJK(char)` 分岐が挿入、true で `datasetSkeleton()`、false で既存 `skeletonize()`
- [ ] **D-4** `skeletonize/index.ts` の `SkeletonMethod` enum に `'dataset'` 追加、分岐 dispatcher から委譲
- [ ] **D-5** `datasetSkeleton({ char, subPaths, pathBBox, raster, inverseDT, options, font }): SkeletonizeResult` が実装、返り値型が既存 `{ skeleton, polylines, widths }` と完全互換
- [ ] **D-6** 座標変換関数 `transformKanjiVGToBitmap(points, raster, unitsPerEm)` が y 反転・中心 (54.5, 54.5) translate・unitsPerEm スケールを正しく実施
- [ ] **D-7** `orderStrokes()` への `precomputedWidths` 経路で polyline 参照一致による widths マッチングが動作（[stroke-order.ts L95-97](../../packages/generator/src/processing/stroke-order.ts)）
- [ ] **D-8** `bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg` が exit 0 で完走（AC-1 §1）
- [ ] **D-9** 生成 bundle で「右」が日本筆順 (ノ→一→口縦→口折れ→口底) で描画される（AC-1 §2、目視）
- [ ] **D-10** ラテン文字（Caveat 50 字）の snapshot 差分が**ゼロ**（AC-1 §4、`--dataset kanjivg` 有無で完全一致）
- [ ] **D-11** 未収録字（例: `𠮟` U+20B9F CJK Ext B）で既存パイプラインに fallback し warn ログ出力
- [ ] **D-12** `--strict` 付きで未収録字を含む生成が非ゼロ exit code で終了、エラーメッセージに未収録 codepoint 明記
- [ ] **D-13** 常用 20 字サンプル（§6 T-21）で筆順誤り 0 件（AC-1 §3、目視 + 自動化は Phase 6）
- [ ] **D-14** `bun typecheck && bun run test && bun check` 全通（AC-1 §5）

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（追加・変更分のみ）

```
packages/generator/
├── src/
│   ├── commands/generate.ts                # 差分: schema / processGlyph 分岐
│   ├── dataset/
│   │   ├── kanjivg.ts                      # Phase 2 成果物（無変更）
│   │   ├── is-cjk.ts                       # 新規: isCJK(char)
│   │   ├── is-cjk.test.ts                  # 新規
│   │   ├── dataset-skeleton.ts             # 新規: datasetSkeleton() 主成果物
│   │   ├── dataset-skeleton.test.ts        # 新規
│   │   ├── transform-kanjivg.ts            # 新規: 109 → bitmap 座標変換
│   │   └── transform-kanjivg.test.ts       # 新規
│   └── processing/skeletonize/index.ts     # 差分: SkeletonMethod に 'dataset' 追加
├── fixtures/snapshots/                     # 新規
│   ├── caveat-50.json                      # ラテン退行検知
│   └── noto-jp-4.json                      # 右左田必の成功基準
└── package.json                            # 差分なし（Phase 2 追加済）
```

### 3-2. `pipelineOptionsSchema` への `dataset` / `strict` 追加（[generate.ts L34-58](../../packages/generator/src/commands/generate.ts)）

[technical-validation.md §3-2](../technical-validation.md) のコード差分を忠実に反映。`.optional()` / `.default(false)` により既存 CLI・PreviewApp の Zod バリデーション互換性を完全維持（R-4 回避）。

```ts
// packages/generator/src/commands/generate.ts (差分)
const pipelineOptionsSchema = z.object({
  // ... existing fields (無変更) ...
  skeletonMethod: z
    .enum(['zhang-suen', 'guo-hall', 'medial-axis', 'lee', 'thin', 'voronoi', 'dataset']) // ← 'dataset' 追加
    .default(SKELETON_METHOD)
    .describe('Skeletonization algorithm'),
  // ... existing fields (無変更) ...

  // ── Phase 3: Dataset-driven stroke order for CJK ─────────────────────
  dataset: z
    .enum(['kanjivg'])
    .optional()
    .describe('CJK stroke-order dataset source. When set, CJK chars bypass heuristic skeletonization.'),
  strict: z
    .boolean()
    .default(false)
    .describe('When true, abort on CJK chars not covered by the dataset instead of falling back to heuristics.'),
});
```

`generateArgsSchema = pipelineOptionsSchema.extend(...)` により `dataset` / `strict` が自動継承。Padrone の自動解決で `--dataset kanjivg` / `--strict` が CLI で動作する。

### 3-3. `isCJK()` 判定関数（[FR-1.1](../requirements.md)）

```ts
// packages/generator/src/dataset/is-cjk.ts
// Scope: hiragana (U+3040–309F), katakana (U+30A0–30FF), CJK Unified Ideographs (U+4E00–9FFF).
// Out of scope (first release): CJK Compat (U+F900–FAFF), CJK Ext A/B/C/D/E/F.

const CJK_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

export function isCJK(char: string): boolean {
  if (!char || char.length === 0) return false;
  return CJK_RE.test(char);
}
```

### 3-4. `processGlyph()` L189-206 への分岐挿入

[technical-validation.md §3-2](../technical-validation.md) のコード差分を忠実に反映。**既存ラテン経路は 1 行も変更しない**。分岐は Stage 4（skeletonize）直前にのみ挿入。

```ts
// packages/generator/src/commands/generate.ts (差分)
import { datasetSkeleton } from '../dataset/dataset-skeleton.ts';
import { isCJK } from '../dataset/is-cjk.ts';

export function processGlyph(fontInfo: ParsedFontInfo, char: string, options: PipelineOptions): PipelineResult | null {
  // ... Stage 1-3 無変更 ...
  const inverseDT = computeInverseDistanceTransform(raster.bitmap, raster.width, raster.height, options.dtMethod);

  // ── Phase 3: CJK dataset dispatch ─────────────────────────────────────
  const useDataset = options.dataset === 'kanjivg' && isCJK(char);

  const { skeleton, polylines, widths } = useDataset
    ? datasetSkeleton({ char, subPaths, pathBBox, raster, inverseDT, options, font: fontInfo.font })
    : skeletonize({ subPaths, pathBBox, raster, inverseDT, options });

  // ... Stage 5-6 無変更 ...
}
```

**設計ポイント**: `useDataset` が false のとき `skeletonize()` の引数・戻り値は**現行と完全同一**で Biome diff は三項演算子行のみ。`datasetSkeleton()` の第 1 引数に `char` と `font` を追加するのは `unitsPerEm` が必要なため（`skeletonize()` は `font` を知らない）。

### 3-5. `skeletonize/index.ts` の `'dataset'` モード追加

既存 dispatcher に **1 分岐のみ**追加。他分岐（voronoi / zhang-suen / guo-hall / medial-axis / lee / thin）は 1 行も変更しない。

```ts
// packages/generator/src/processing/skeletonize/index.ts (差分)
export function skeletonize({ subPaths, pathBBox, raster, inverseDT, options }: SkeletonizeInput): SkeletonizeResult {
  // ── Phase 3: dataset-driven skeletonization ─────────────────────────
  // processGlyph() handles this branch directly with { char, font } context.
  // If called here (URL-state driven), throw — char+font context is unavailable.
  if (options.skeletonMethod === 'dataset') {
    throw new Error(
      `skeletonize({ method: 'dataset' }) requires char + font context. ` +
        `Call datasetSkeleton() directly from processGlyph() instead.`,
    );
  }
  // ... 既存 voronoi / thinning 分岐すべて無変更 ...
}
```

**設計判断**: `SkeletonizeInput` に `char` / `font` を追加すると既存 6 メソッド全 signature に影響。影響最小化のため `'dataset'` モードは「processGlyph 内で分岐済」前提の防御実装。URL-state 経由（PreviewApp `sk=dataset`）サポートは将来の別 Phase でリファクタ（§11 案 D）。

### 3-6. `datasetSkeleton()` 主実装（~180 行の骨子）

```ts
// packages/generator/src/dataset/dataset-skeleton.ts
import { getKanjiSvg, hasKanji } from '@tegaki/dataset-cjk-kanjivg';
import type opentype from 'opentype.js';
import type { BBox, Point } from 'tegaki';
import { getStrokeWidth } from '../processing/width.ts';
import type { RasterResult } from '../processing/rasterize.ts';
import type { SkeletonizeOptions, SkeletonizeResult } from '../processing/skeletonize/index.ts';
import { parseKanjiSvg } from './kanjivg.ts';
import { transformKanjiVGToBitmap } from './transform-kanjivg.ts';

export interface DatasetSkeletonInput {
  char: string;
  subPaths: Point[][];
  pathBBox: BBox;
  raster: RasterResult;
  inverseDT: Float32Array;
  options: SkeletonizeOptions & { strict?: boolean };
  font: opentype.Font;
}

export function datasetSkeleton(input: DatasetSkeletonInput): SkeletonizeResult {
  const { char, raster, inverseDT, options, font } = input;
  const codepoint = char.codePointAt(0);
  if (codepoint === undefined) throw new Error(`datasetSkeleton: invalid character "${char}"`);

  // Fallback path — codepoint not covered by KanjiVG
  if (!hasKanji(codepoint)) {
    const msg = `[dataset] char "${char}" (U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}) not in KanjiVG; falling back to heuristic skeletonize`;
    if (options.strict) throw new Error(`${msg} (--strict). Aborting.`);
    console.warn(msg);
    return fallbackToHeuristic(input);
  }

  // Primary path
  const svg = getKanjiSvg(codepoint);
  if (!svg) {
    throw new Error(`datasetSkeleton: manifest drift (hasKanji=true but getKanjiSvg=null). See phase-1 §9-3.`);
  }

  const strokes = parseKanjiSvg(svg);
  if (strokes.length === 0) {
    const msg = `[dataset] char "${char}" parsed to 0 strokes (corrupt SVG?); falling back`;
    if (options.strict) throw new Error(`${msg} (--strict).`);
    console.warn(msg);
    return fallbackToHeuristic(input);
  }

  // Coordinate transform: KanjiVG 109-space → bitmap-space
  const polylines: Point[][] = [];
  const widths: number[][] = [];
  for (const stroke of strokes) {
    const bitmapPoints = transformKanjiVGToBitmap(stroke.points, raster, font.unitsPerEm);
    polylines.push(bitmapPoints);
    widths.push(bitmapPoints.map((p) => getStrokeWidth(p.x, p.y, inverseDT, raster.width)));
  }

  // Synthesize skeleton bitmap for debug visualization
  const skeleton = new Uint8Array(raster.width * raster.height);
  for (const pl of polylines) {
    for (const p of pl) {
      const px = Math.round(p.x), py = Math.round(p.y);
      if (px >= 0 && px < raster.width && py >= 0 && py < raster.height) {
        skeleton[py * raster.width + px] = 1;
      }
    }
  }
  return { skeleton, polylines, widths };
}

// Dynamic import to break circular dep with processing/skeletonize/index.ts
function fallbackToHeuristic(input: DatasetSkeletonInput): SkeletonizeResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { skeletonize } = require('../processing/skeletonize/index.ts');
  return skeletonize(input);
}
```

`fallbackToHeuristic` の circular import 回避は代替案（`datasetSkeleton` が null を返して `processGlyph` が分岐）もあり、レビュー時に §11 案 B として検討。

### 3-7. KanjiVG 109 座標 → bitmap 座標の変換関数

[FR-3.1〜3.4](../requirements.md) の中核。**このフェーズ最大のリスクが集約される箇所**。

```ts
// packages/generator/src/dataset/transform-kanjivg.ts
// KanjiVG: viewBox "0 0 109 109", y-down, center (54.5, 54.5)
// opentype: baseline-left origin, y-up
// Transform chain:
//   KanjiVG (109, y-down, center 54.5)
//     → normalized to [-54.5, +54.5]
//     → scaled to unitsPerEm, y-flipped for opentype
//     → translated via raster.transform to bitmap coords

import type { Point } from 'tegaki';
import type { RasterResult } from '../processing/rasterize.ts';

export function transformKanjiVGToBitmap(
  kvgPoints: Point[],
  raster: RasterResult,
  unitsPerEm: number,
): Point[] {
  const KVG_SIZE = 109;
  const KVG_CENTER = 54.5;
  const scale = unitsPerEm / KVG_SIZE;

  // Glyph center in absolute font units (from raster.transform)
  const bboxMidXFont = raster.transform.offsetX + raster.width / raster.transform.scaleX / 2;
  const bboxMidYFont = raster.transform.offsetY + raster.height / raster.transform.scaleY / 2;

  return kvgPoints.map((p) => {
    // 1. Normalize to [-54.5, +54.5]
    const nx = p.x - KVG_CENTER;
    const ny = p.y - KVG_CENTER; // still y-down

    // 2. Scale to font units + flip y (SVG y-down → opentype y-up)
    const fontX = nx * scale;
    const fontY = -ny * scale; // y-flip here

    // 3. Translate to absolute font-unit coords
    const absFontX = bboxMidXFont + fontX;
    const absFontY = bboxMidYFont + fontY;

    // 4. Apply raster.transform to land in bitmap coords
    const bitmapX = (absFontX - raster.transform.offsetX) * raster.transform.scaleX;
    const bitmapY = (absFontY - raster.transform.offsetY) * raster.transform.scaleY;

    return { x: bitmapX, y: bitmapY };
  });
}
```

**座標変換の目視検証項目**:
1. 「右」の 1 画目（ノ）が**左上から右下**に向かう
2. 「田」の 1 画目（左縦）が bitmap の**左側**に位置
3. 「必」の点が**下側**に配置（上下逆転していない）
4. bbox 占有率が opentype pathBBox と ±10% 以内で一致（[FR-3.4](../requirements.md)）

### 3-8. `orderStrokes()` への `precomputedWidths` 経路確認

既存 [`orderStrokes()` L79-132](../../packages/generator/src/processing/stroke-order.ts) は voronoi 経路からの `precomputedWidths` を前提に実装済。本 Phase の `datasetSkeleton()` も同じ契約（L96: `indexOf(polyline)` で検索、L107-108: reverse 時の index 反転）を守る必要あり。

**契約**:
- `precomputedWidths[i]` は `polylines[i]` と**同一参照**かつ**同一長**
- `orientPolyline()` の reverse は widths を反転 index で参照
- polylines 順序は `orderStrokes()` が**変更しない**

`datasetSkeleton()` は polylines と widths を**並列に構築**（§3-6 参照）するため契約は自然に守られる。ただし `map()` chain で構築すると参照が切れる罠があるため、**for ループで明示的に push** する実装とする。

### 3-9. CLI フラグと Padrone 統合

`generateArgsSchema = pipelineOptionsSchema.extend(...)` により自動継承（§3-2）。Padrone は Zod schema から CLI フラグを自動解決するため追加実装不要。

**動作例**:
```bash
# Primary path
bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg
# Strict mode
bun start generate --family "Noto Sans JP" --chars 右𠮟 --dataset kanjivg --strict
# → exit 1, error: char 𠮟 (U+20B9F) not in KanjiVG (--strict)
# Fallback (default non-strict)
bun start generate --family "Noto Sans JP" --chars 右𠮟 --dataset kanjivg
# → warn for 𠮟, success
```

### 3-10. フォールバック戦略の詳細

| 未収録パターン | 例 | 動作 | ログ | exit |
|---|---|---|---|---|
| CJK Ext A (U+3400-4DBF) | `㐀` | fallback to heuristic | warn | 0 |
| CJK Ext B+ (U+20000-) | `𠮟` | fallback | warn | 0 |
| CJK Compat (U+F900-FAFF) | `豈` | fallback | warn | 0 |
| KanjiVG 欠落（常用内） | — | fallback | warn | 0 |
| SVG パース失敗（破損） | — | fallback | error warn | 0 |
| 非 CJK（`useDataset === false`） | `A` | existing path | なし | 0 |
| 上記すべてで `--strict` | — | **throw** | error | **1** |

**ログフォーマット**:
```
[dataset] char "𠮟" (U+20B9F) not in KanjiVG; falling back to heuristic skeletonize
[dataset] char "喆" parsed to 0 strokes (corrupt SVG?); falling back
```

### 3-11. 既存コードとの接続点まとめ

| 既存コード | 使用 | 変更 |
|---|---|---|
| [`processGlyph()`](../../packages/generator/src/commands/generate.ts#L189) | 分岐追加（3 行） | 最小差分 |
| [`pipelineOptionsSchema`](../../packages/generator/src/commands/generate.ts#L34) | `dataset` / `strict` / `skeletonMethod.'dataset'` 追加 | 2 フィールド + 1 enum 値 |
| [`skeletonize()`](../../packages/generator/src/processing/skeletonize/index.ts#L58) | defensive throw | 1 分岐追加 |
| [`orderStrokes()`](../../packages/generator/src/processing/stroke-order.ts#L79) | `precomputedWidths` 再利用 | 無変更 |
| [`getStrokeWidth()`](../../packages/generator/src/processing/width.ts#L160) | 線幅実測 | 無変更 |
| [`computeInverseDistanceTransform()`](../../packages/generator/src/processing/width.ts#L142) | `datasetSkeleton` 入力 | 無変更 |
| [`rasterize()` / `RasterResult.transform`](../../packages/generator/src/processing/rasterize.ts#L9) | 座標変換 | 無変更 |
| [`toFontUnits()`](../../packages/generator/src/processing/font-units.ts#L18) | Stage 6、無関与 | 無変更 |
| [Phase 2 `parseKanjiSvg()`](../../packages/generator/src/dataset/kanjivg.ts) | `datasetSkeleton` 内で呼出 | 無変更 |
| [Phase 1 `getKanjiSvg()` / `hasKanji()`](../../packages/dataset-cjk-kanjivg/src/index.ts) | 同上 | 無変更 |

---

## §4. エージェントチーム構成

Phase 3 は **4 名編成**（Phase 1/2 の 3 名から増員）。座標ズレが目視で即座に判明する最重要フェーズのため、実装 2 + テスト 1 + visual QA 1 の役割分担で reviewer 独立性を最大化。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **座標変換実装リード** | 1 | `transform-kanjivg.ts`、`unitsPerEm`・y 反転・中心 translate・`raster.transform` 連携、FR-3.1〜3.4 検証 | opentype.js coord system、SVG y-down vs font y-up、幾何変換 | 1.5d |
| 2 | **分岐・フォールバック実装** | 1 | `pipelineOptionsSchema.dataset` 追加、`isCJK()`、`processGlyph()` 分岐、`datasetSkeleton()` 本体、fallback + strict、CLI フラグ、`skeletonize/index.ts` dispatch | Zod v4, Padrone CLI, 関数型分岐、circular import 回避 | 1.5d |
| 3 | **テスト作成担当** | 1 | `is-cjk.test.ts`、`transform-kanjivg.test.ts`、`dataset-skeleton.test.ts`、snapshot fixture 生成、ラテン退行検知 e2e、AC-1 カバレッジ確認 | Bun test, snapshot testing, fixture design, regression 戦略 | 1.0d |
| 4 | **visual QA 担当** | 1 | 右/左/田/必 の 4 字 + 常用 20 字の PreviewApp 目視、URL-state による再現セット、座標ズレ検知、AC-1 §2/§3 達成 | Tegaki PreviewApp URL state、手動検証、日本筆順の知識 | 0.5d |

**並列化**: #1（座標変換）と #2（分岐）は独立に進行。#3 テストは #1/#2 骨子固定後の Day 2 から。#4 visual QA は #1/#2 完了後の Day 4-5。**直列 5 日 / 並列 3 日**で完走可能。

### 4-1. ロール間の受け渡しとレビュー委譲

```
 Day 0  #1 座標変換 interface + #2 分岐 interface 同時 skeleton 化
 Day 1  #1 transform-kanjivg.ts 本体     │   #2 schema + isCJK + datasetSkeleton 骨子
 Day 2  #1 座標検証（fontBox ±10%）       │   #2 CLI + strict mode
         #3 is-cjk + transform test 着手  │   #3 dataset-skeleton test mock
 Day 3  #1 PreviewApp で右/田 目視        │   #2 処理 flow 結線、e2e 4 字
         #3 snapshot fixture 生成         │   #4 URL セット整備
 Day 4  #3 ラテン snapshot 差分ゼロ検証   │   #4 右/左/田/必 目視、常用 20 字
         #3 fallback + strict テスト
 Day 5  全員で PR レビュー対応、AC-1 チェック、CI 通過確認
```

**レビュー委譲**: 座標変換の数値精度は **#1 + #4**、分岐と fallback は **#2 + #3**、snapshot 退行は **#3 + #1**、視覚検証は **#4 単独** が独立 LGTM。単独 reviewer が全観点を網羅する設計にしない（ヒューマンレビューの穴を潰す）。

---

## §5. 提供範囲（Deliverables）

### 5-1. コード成果物（新規）

- [ ] `packages/generator/src/dataset/is-cjk.ts`（§3-3、~20 行）
- [ ] `packages/generator/src/dataset/is-cjk.test.ts`（§7-1、10 ケース）
- [ ] `packages/generator/src/dataset/transform-kanjivg.ts`（§3-7、~60 行）
- [ ] `packages/generator/src/dataset/transform-kanjivg.test.ts`（§7-2、数値検証）
- [ ] `packages/generator/src/dataset/dataset-skeleton.ts`（§3-6、~180 行）
- [ ] `packages/generator/src/dataset/dataset-skeleton.test.ts`（§7-3、fallback / strict / 4 字流路）

### 5-2. コード成果物（差分）

- [ ] `packages/generator/src/commands/generate.ts`: `pipelineOptionsSchema.dataset` / `strict` / `SkeletonMethod.'dataset'` 追加、`processGlyph()` L189-206 分岐、新規 import 2 本
- [ ] `packages/generator/src/processing/skeletonize/index.ts`: `'dataset'` モード defensive throw
- [ ] `packages/generator/src/constants.ts`: `SkeletonMethod` 型定義への `'dataset'` 追加

### 5-3. フィクスチャ・ドキュメント成果物

- [ ] `packages/generator/fixtures/snapshots/caveat-50.json`（ラテン退行検知用）
- [ ] `packages/generator/fixtures/snapshots/noto-jp-4.json`（右左田必の Phase 3 成功基準）
- [ ] `docs/tickets/README.md` ステータス列更新（📝 未着手 → 🚧 → 👀 → ✅ 完了）
- [ ] Phase 4 / Phase 5 チケット冒頭に `datasetSkeleton()` シグネチャと fallback 動作を反映

### 5-4. プロジェクト管理成果物

- [ ] `feat/ja-phase3-pipeline-integration` ブランチから `main` への PR 作成
- [ ] PR 本文に本チェックリスト埋め込み、**最優先リスクフェーズ・visual QA 必須**を冒頭明示
- [ ] [AC-1](../requirements.md) 6 項目すべてチェック済み
- [ ] Phase 4 / Phase 5 チケットに §12 申し送りを反映

---

## §6. テスト項目（受入基準ベース）

[AC-1](../requirements.md) の 6 項目を網羅、[FR-1/3/4/7/8](../requirements.md) の各項目を Phase 3 範囲にマッピング。**座標ズレ視覚確認は必須項目**。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | FR-1.1 | `isCJK('右')` / `isCJK('あ')` / `isCJK('ア')` が true | true | unit |
| T-02 | FR-1.1 | `isCJK('A')` / `isCJK('1')` / `isCJK(' ')` が false | false | unit |
| T-03 | FR-1.1 | `isCJK('㐀')` (CJK Ext A) が false | false | unit |
| T-04 | FR-1.2 | `isCJK('豈')` (CJK Compat U+F900) が false | false | unit |
| T-05 | FR-1.2 | CJK Compat 範囲は fallback（warn 出力 + 処理成功） | warn | unit |
| T-06 | FR-1.3 | `--verbose` で isCJK 判定ログ出力（任意） | 1+ hit | e2e |
| T-07 | FR-3.1 | KanjiVG `(54.5, 54.5)` → glyph 中心 | 数値誤差 < 1% | unit |
| T-08 | FR-3.2 | y 軸反転: `(54.5, 0)` が bitmap 上部（小 y） | 符号反転確認 | unit |
| T-09 | FR-3.3 | 変換後合計 bbox 幅が `raster.width` と ±10% 以内 | `|w-rw|/rw<0.1` | unit |
| T-10 | FR-3.4 | 「田」の変換後 bbox が opentype pathBBox と ±10% 以内一致 | bbox 比較 | unit |
| T-11 | FR-4.1 | `computeInverseDistanceTransform()` 無変更で再利用 | diff 0 | unit |
| T-12 | FR-4.2 | 「田」各画の線幅が `getStrokeWidth()` で取得（widths[i].length === polylines[i].length） | 一致 | unit |
| T-13 | FR-4.3 | Noto Sans JP (ゴシック) と Zen Kurenaido (手書き) で線幅差が視認可能 | 視覚差異 | visual |
| T-14 | FR-7.1 | `𠮟` (U+20B9F) が fallback し heuristic 出力になる | polylines = heuristic 結果 | unit |
| T-15 | FR-7.2 | 未収録字処理時、stderr に `[dataset]` プレフィックス warn | grep hit | e2e |
| T-16 | FR-7.3 | `--strict` + 未収録字で exit 非ゼロ + stderr error | exit 1 + msg | e2e |
| T-17 | FR-8.1 | CLI: `--dataset kanjivg` が Padrone 認識 | help 掲載 | e2e |
| T-18 | FR-8.3 | CLI: `--strict` が認識 | help 掲載 | e2e |
| T-19 | **AC-1 §1** | `bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg` | exit 0 | e2e |
| T-20 | **AC-1 §2** | 「右」が日本筆順 (ノ→一→口縦→口折れ→口底) | 目視 + strokes[0].points[0] 位置 | visual |
| T-21 | **AC-1 §3** | 常用 20 字（右 左 田 必 学 校 書 人 大 小 上 下 日 月 火 水 木 金 土 本）で筆順誤り 0 件 | 目視 20/20 OK | visual |
| T-22 | **AC-1 §4** | ラテン Caveat 50 字が `--dataset kanjivg` 有無で完全一致 | diff 0 バイト | e2e |
| T-23 | **AC-1 §5** | `bun checks` 全通 | exit 0 | e2e |
| T-24 | **AC-1 §6** | `dataset-cjk-kanjivg/ATTRIBUTION.md` に CC-BY-SA 3.0（Phase 1 完了、再確認） | grep hit | unit |
| T-25 | NFR-2.1 | ラテン `processGlyph()` が `--dataset kanjivg` 有無で完全一致 | Object.is 相当 | unit |
| T-26 | NFR-2.2 | 既存 4 フォント bundle（Caveat/Italianno/Tangerine/Parisienne）再生成不要 | fixture 無変更 | e2e |
| T-27 | NFR-3.2 | `bun typecheck && bun run test && bun check` 全通 | exit 0 | unit |
| T-28 | NFR-3.4 | 新規 `*.ts` すべてに対応 `*.test.ts` 存在 | ファイル数一致 | meta |

---

## §7. Unit テスト

### 7-1. `is-cjk.test.ts` — Unicode 範囲（10 ケース）

```ts
// packages/generator/src/dataset/is-cjk.test.ts
import { describe, expect, it } from 'bun:test';
import { isCJK } from './is-cjk.ts';

describe('isCJK()', () => {
  it('returns true for hiragana (U+3040-309F)', () => {
    expect(isCJK('あ')).toBe(true); expect(isCJK('き')).toBe(true);
    expect(isCJK('ん')).toBe(true); expect(isCJK('ゔ')).toBe(true);
  });
  it('returns true for katakana (U+30A0-30FF)', () => {
    expect(isCJK('ア')).toBe(true); expect(isCJK('ン')).toBe(true); expect(isCJK('ヴ')).toBe(true);
  });
  it('returns true for CJK Unified (U+4E00-9FFF) incl. boundary', () => {
    expect(isCJK('右')).toBe(true); expect(isCJK('田')).toBe(true); expect(isCJK('必')).toBe(true);
    expect(isCJK('一')).toBe(true); // U+4E00 boundary
    expect(isCJK('鿿')).toBe(true); // U+9FFF boundary
  });
  it('returns false for ASCII letters/digits', () => {
    expect(isCJK('A')).toBe(false); expect(isCJK('a')).toBe(false);
    expect(isCJK('1')).toBe(false); expect(isCJK(' ')).toBe(false);
  });
  it('returns false for Latin accented (Caveat territory)', () => {
    expect(isCJK('é')).toBe(false); expect(isCJK('ñ')).toBe(false); expect(isCJK('ü')).toBe(false);
  });
  it('returns false for punctuation (even Japanese punctuation U+3001-)', () => {
    expect(isCJK('!')).toBe(false); expect(isCJK('、')).toBe(false); expect(isCJK('。')).toBe(false);
  });
  it('returns false for emoji (non-BMP)', () => {
    expect(isCJK('😀')).toBe(false); expect(isCJK('🀄')).toBe(false);
  });
  it('returns false for CJK Extension A (U+3400-4DBF) — out of scope', () => {
    expect(isCJK('㐀')).toBe(false); expect(isCJK('䶿')).toBe(false);
  });
  it('returns false for CJK Ext B+ (U+20000-) and Compat (U+F900-FAFF)', () => {
    expect(isCJK('𠮟')).toBe(false); expect(isCJK('\uF952')).toBe(false);
  });
  it('returns false for empty string', () => { expect(isCJK('')).toBe(false); });
});
```

### 7-2. `transform-kanjivg.test.ts` — 座標変換の正確性

```ts
// packages/generator/src/dataset/transform-kanjivg.test.ts
import { describe, expect, it } from 'bun:test';
import type { Point } from 'tegaki';
import type { RasterResult } from '../processing/rasterize.ts';
import { transformKanjiVGToBitmap } from './transform-kanjivg.ts';

function makeTestRaster(): RasterResult {
  return {
    bitmap: new Uint8Array(400 * 400),
    width: 400, height: 400,
    transform: { scaleX: 0.4, scaleY: 0.4, offsetX: 0, offsetY: -500 },
  };
}

describe('transformKanjiVGToBitmap()', () => {
  const raster = makeTestRaster();
  const unitsPerEm = 1000;

  it('maps KanjiVG center (54.5, 54.5) to glyph center', () => {
    const [out] = transformKanjiVGToBitmap([{ x: 54.5, y: 54.5 }], raster, unitsPerEm);
    expect(out!.x).toBeCloseTo(200, 1); expect(out!.y).toBeCloseTo(200, 1);
  });
  it('flips y: KanjiVG top (y=0) → small bitmap y', () => {
    const [out] = transformKanjiVGToBitmap([{ x: 54.5, y: 0 }], raster, unitsPerEm);
    expect(out!.y).toBeLessThan(200);
  });
  it('flips y: KanjiVG bottom (y=109) → large bitmap y', () => {
    const [out] = transformKanjiVGToBitmap([{ x: 54.5, y: 109 }], raster, unitsPerEm);
    expect(out!.y).toBeGreaterThan(200);
  });
  it('preserves horizontal symmetry', () => {
    const [l] = transformKanjiVGToBitmap([{ x: 0, y: 54.5 }], raster, unitsPerEm);
    const [r] = transformKanjiVGToBitmap([{ x: 109, y: 54.5 }], raster, unitsPerEm);
    expect(Math.abs(l!.x - 200)).toBeCloseTo(Math.abs(r!.x - 200), 1);
  });
  it('scales full 109 span to full bitmap width', () => {
    const [tl] = transformKanjiVGToBitmap([{ x: 0, y: 0 }], raster, unitsPerEm);
    const [br] = transformKanjiVGToBitmap([{ x: 109, y: 109 }], raster, unitsPerEm);
    expect(Math.abs(br!.x - tl!.x)).toBeCloseTo(400, 0);
    expect(Math.abs(br!.y - tl!.y)).toBeCloseTo(400, 0);
  });
  it('is idempotent', () => {
    const pts: Point[] = [{ x: 10, y: 20 }, { x: 30, y: 40 }];
    expect(transformKanjiVGToBitmap(pts, raster, unitsPerEm)).toEqual(transformKanjiVGToBitmap(pts, raster, unitsPerEm));
  });
  it('handles empty input', () => {
    expect(transformKanjiVGToBitmap([], raster, unitsPerEm)).toEqual([]);
  });
  it('handles unitsPerEm variations (1000, 2048)', () => {
    const [out1000] = transformKanjiVGToBitmap([{ x: 54.5, y: 54.5 }], raster, 1000);
    const [out2048] = transformKanjiVGToBitmap([{ x: 54.5, y: 54.5 }], raster, 2048);
    expect(out1000!.x).toBeCloseTo(200, 1); expect(out2048!.x).toBeCloseTo(200, 1);
  });
});
```

### 7-3. `dataset-skeleton.test.ts` — 経路・fallback・orderStrokes pass-through

```ts
// packages/generator/src/dataset/dataset-skeleton.test.ts
import { describe, expect, it } from 'bun:test';
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeInverseDistanceTransform } from '../processing/width.ts';
import { rasterize } from '../processing/rasterize.ts';
import { computePathBBox, flattenPath } from '../processing/bezier.ts';
import { extractGlyph } from '../font/parse.ts';
import { orderStrokes } from '../processing/stroke-order.ts';
import { datasetSkeleton } from './dataset-skeleton.ts';

const font = opentype.parse(readFileSync(resolve(import.meta.dir, '../../.cache/fonts/noto-sans-jp.ttf')).buffer);
function makeInput(char: string, strict = false) {
  const g = extractGlyph(font, char)!;
  const subPaths = flattenPath(g.commands);
  const pathBBox = computePathBBox(subPaths);
  const raster = rasterize(subPaths, pathBBox, 400);
  const inverseDT = computeInverseDistanceTransform(raster.bitmap, raster.width, raster.height);
  return { char, subPaths, pathBBox, raster, inverseDT, font, options: { strict } as any };
}

describe('datasetSkeleton() — primary path', () => {
  it('returns 5 polylines for 右 in KanjiVG document order (MEXT)', () => {
    const r = datasetSkeleton(makeInput('右'));
    expect(r.polylines).toHaveLength(5);
    expect(r.widths).toHaveLength(5);
    for (let i = 0; i < r.polylines.length; i++) expect(r.widths![i]!.length).toBe(r.polylines[i]!.length);
  });
  it('returns 5 polylines for 田 with widths index-aligned', () => {
    const r = datasetSkeleton(makeInput('田'));
    expect(r.polylines).toHaveLength(5);
    expect(r.widths![0]!.length).toBe(r.polylines[0]!.length);
  });
});

describe('datasetSkeleton() — fallback path (FR-7)', () => {
  it('falls back for CJK Ext B (𠮟 U+20B9F) with warn', () => {
    const spy = mockWarn();
    try {
      const r = datasetSkeleton(makeInput('𠮟'));
      expect(spy.calls.length).toBeGreaterThan(0);
      expect(spy.calls[0]!.join(' ')).toContain('[dataset]'); expect(spy.calls[0]!.join(' ')).toContain('𠮟');
      expect(r.polylines).toBeDefined();
    } finally { spy.restore(); }
  });
  it('throws on --strict + missing codepoint', () => {
    expect(() => datasetSkeleton(makeInput('𠮟', true))).toThrow(/--strict/);
  });
});

describe('orderStrokes pass-through', () => {
  it('preserves KanjiVG order when fed from datasetSkeleton', () => {
    const { polylines, widths } = datasetSkeleton(makeInput('右'));
    const strokes = orderStrokes(polylines, null, 400, 3, widths);
    expect(strokes).toHaveLength(5);
    // 1画目 (ノ) は左上領域に始点
    const first = strokes[0]!.points[0]!;
    expect(first.x).toBeLessThan(200); expect(first.y).toBeLessThan(200);
  });
});

function mockWarn() {
  const orig = console.warn; const calls: unknown[][] = [];
  console.warn = (...a: unknown[]) => calls.push(a);
  return { calls, restore: () => { console.warn = orig; } };
}
```

---

## §8. e2e テスト

**目的**: Phase 1 → 2 → 3 の 3 層連鎖が実配置環境で動作し、かつ**ラテン snapshot 差分ゼロ**を機械的に検証する。

### 8-1. CJK 4 字生成 + snapshot 検証

```bash
cd C:/Users/yuta/Desktop/Private/tegaki
rm -rf .cache/fonts/.tmp packages/*/node_modules && bun install
bun --filter @tegaki/dataset-cjk-kanjivg fetch-kanjivg

# Phase 3 単体テスト
bun --filter tegaki-generator test --test-name-pattern 'datasetSkeleton|transformKanjiVGToBitmap|isCJK'
bun --filter tegaki-generator typecheck

# e2e: 右左田必 を KanjiVG で生成
bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg --output /tmp/tegaki-ja-p3
# expect: exit 0, 4 glyphs processed, 0 skipped

# snapshot diff
diff <(jq -S . /tmp/tegaki-ja-p3/glyphData.json) \
     <(jq -S . packages/generator/fixtures/snapshots/noto-jp-4.json)
# expect: no diff
```

### 8-2. ラテン snapshot 差分ゼロ（AC-1 §4）

```bash
# Caveat 50 字を with/without --dataset kanjivg で完全一致確認
bun start generate --family Caveat --chars "ABCDEFGHIJabcdefghij0123456789" --output /tmp/t1
bun start generate --family Caveat --chars "ABCDEFGHIJabcdefghij0123456789" --dataset kanjivg --output /tmp/t2
diff /tmp/t1/glyphData.json /tmp/t2/glyphData.json
# expect: identical (0 byte diff)

# Caveat 50 字 fixture 一致確認
bun start generate --family Caveat --chars "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx" --output /tmp/tc
diff <(jq -S . /tmp/tc/glyphData.json) <(jq -S . packages/generator/fixtures/snapshots/caveat-50.json)
# expect: no diff
```

### 8-3. fallback + strict

```bash
# 未収録字 fallback（exit 0 + warn）
bun start generate --family "Noto Sans JP" --chars 右𠮟 --dataset kanjivg 2>&1 | tee /tmp/fallback.log
# expect: exit 0, 2 glyphs processed
grep '\[dataset\].*𠮟.*falling back' /tmp/fallback.log  # expect 1 match

# --strict + 未収録（exit 1 + error）
bun start generate --family "Noto Sans JP" --chars 右𠮟 --dataset kanjivg --strict 2>&1 || echo "exit=$?"
# expect: exit=1, stderr contains U+20B9F
```

### 8-4. 視覚確認（手動、#4 担当）

```bash
bun dev
# http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右左田必&m=text&t=右左田必&fs=96&tm=controlled&ct=2.0
# 目視: 「右」1 画目 (ノ) が左上→右下、2 画目 (一) が横棒、3-5 画目が口の箱
```

### 8-5. 失敗時の切り分け

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| §8-1 exit 1 | opentype が Noto JP サブセット解釈不能 | `--chars 右` で単体実行、glyph 欠落なら Google Fonts CSS URL 確認 |
| §8-1 snapshot diff 大量 | 座標変換バグ、y 反転漏れ | PreviewApp `s=skeleton` で KanjiVG スケルトンと glyph の重なり目視 |
| §8-1 diff 少量 | `transform-kanjivg.ts` の丸め誤差 | `toFontUnits()` の round2 確認 |
| §8-2 diff あり | ラテン経路に `useDataset` 漏れ | `isCJK('A') === false` unit test |
| §8-3 warn 無し | fallback 経路未実行、`hasKanji` 誤判定 | `hasKanji(0x20B9F)` unit test、Phase 1 manifest 確認 |
| §8-3 exit 0 | `--strict` フラグ Padrone 未認識 | `pipelineOptionsSchema.strict` 追加確認 |
| §8-4 筆順逆 | 座標 y 反転、KanjiVG document order reverse | `parseKanjiSvg()` の `strokeNumber = i+1` 確認 |

---

## §9. 懸念事項とリスク

本 Phase は[requirements.md §7](../requirements.md) の R-4 に加え、**座標ズレ** という本プロジェクト最大のリスクを集中的に扱う。[technical-validation.md §3-2](../technical-validation.md) の修正事項を反映しつつ 7 項目に整理。

### 9-1. R-A: 座標ズレは目視で即座に判明、後修正困難（**最重要**）

- **影響**: **致命的**。KanjiVG の 109 正規化 → bitmap 変換は、y 反転 / 中心 translate / unitsPerEm スケールの 3 段階すべてが正しく組み合わさらないと、glyph bbox と完全に外れる / 上下逆転 / ミラー反転のいずれかが発生。自動テストで「±10% 以内」と書いても、**50% ズレた図形も合計 bbox 幅は合う**ため目視検証が必須。
- **根本原因**: (1) y-down/y-up 反転忘れ、(2) 中心 (54.5, 54.5) の扱い間違い、(3) `unitsPerEm` scale と `raster.transform.scale` の二重適用、(4) `bboxMid` の pixel-unit / font-unit 混同
- **対策**: §7-2 の unit テスト 3 不変条件を pin、§8-4 visual QA を **必須** として §5-4 チェックリストに入れる（#4 が signoff）、`transformKanjiVGToBitmap()` を pure 関数化、PreviewApp 重ね合わせ経路確保
- **残余リスク**: 中。手動目視 4 字 + 20 字で漏れがあり得る。Phase 6 で 100 字以上に拡大検証。

### 9-2. R-B: Zod schema 変更の破壊的影響（[R-4](../requirements.md)）

- **影響**: 中。既存 CLI・PreviewApp の `pipelineOptionsSchema.parse()` が失敗する可能性。
- **根本原因**: `.extend()` で `.optional()` 付きなら後方互換だが、`.enum()` 値追加でも URL state や CLI の既存フラグパーサで副作用が出る可能性。
- **対策**: `dataset: z.enum(['kanjivg']).optional()` **必須**（[technical-validation.md §3-2](../technical-validation.md) 明示）、`strict: z.boolean().default(false)`、`SkeletonMethod` enum 追加は URL state `sk` の既存値で破綻しないこと確認、`DEFAULT_OPTIONS` runtime 値 unchanged を unit test で pin
- **残余リスク**: 低。

### 9-3. R-C: フォールバック時の動作曖昧性

- **影響**: 中。`useDataset === true && hasKanji === false` 時、`datasetSkeleton()` 内部で heuristic fallback する設計（§3-6）は、呼出側から**どちらを通ったか不明**。
- **根本原因**: 責任分離が曖昧（fallback 判定を `processGlyph()` でやるか `datasetSkeleton()` でやるか）。
- **対策**: warn ログに `[dataset]` プレフィックスを入れ grep 可能に、`PipelineResult.metadata?.source` の追加を Phase 4 で判断、代替案として `datasetSkeleton()` は null を返して `processGlyph()` で分岐する案（§11 案 B）も検討（circular import 回避の副効果あり）。
- **残余リスク**: 中。本 Phase で一方に倒す設計判断必要。

### 9-4. R-D: `orderStrokes()` の widths マッチング問題

- **影響**: 中。[stroke-order.ts L95-97](../../packages/generator/src/processing/stroke-order.ts) の `precomputedWidths` 経路は `polylines.indexOf(polyline)` に依存。`datasetSkeleton()` が polylines を `map(...)` で別配列化すると**参照が切れて widths 未適用**。
- **根本原因**: `orderStrokes()` が参照一致を前提にする既存設計。
- **対策**: polylines を「新規 push した配列」として返す（map chain ではなく for ループ）、`SkeletonizeResult` の契約を `widths.length === polylines.length` かつ `widths[i].length === polylines[i].length` と明記、unit test で「points[0].width が非 1（デフォルト値）」を検証。
- **残余リスク**: 低。

### 9-5. R-E: 既存ラテン経路への副作用

- **影響**: **高**（AC-1 §4 違反）。`processGlyph()` 分岐挿入時、誤って `skeletonize()` 引数を変えるとラテン出力が微変。
- **根本原因**: `SkeletonizeInput` 型を不注意で必須化する可能性。
- **対策**: `SkeletonizeInput` 型を本 Phase で**絶対に変更しない**（`char` / `font` を追加しない）、`datasetSkeleton()` は別型 `DatasetSkeletonInput` を受ける、§8-2 の snapshot diff を CI で機械検証、snapshot 差分あれば即 fail。
- **残余リスク**: 低（snapshot で検知可能）。

### 9-6. R-F: opentype.js の extraFonts / CJK サブセット対応

- **影響**: 中。Noto Sans JP は Google Fonts 経由で複数 TTF（CJK サブセット）を持ち、[generate.ts L121](../../packages/generator/src/commands/generate.ts) の `extractGlyph(font, char, extraFonts)` が extraFonts 側 glyph を返す可能性。`datasetSkeleton()` に `fontInfo.font`（main のみ）を渡すと `unitsPerEm` 不一致のリスク。
- **根本原因**: メインと extraFonts の `unitsPerEm` 一致が前提。
- **対策**: `extractGlyph()` が返す glyph の由来 font を Phase 3 内で確認（仕様確認、必要なら拡張）、`datasetSkeleton()` に渡す `font` はその glyph の由来 font、Noto 以外のフォント（Kosugi, Zen Kurenaido 等）でも確認。
- **残余リスク**: 中。Phase 6 で再検証。

### 9-7. R-G: `[dataset]` warn のユーザー UX

- **影響**: 低。100 字生成で 20 字 fallback すると 20 行の warn で見づらい。
- **対策**: 末尾に集計サマリ `[dataset] 4/20 chars not in KanjiVG; see --strict for fail-fast` 追加、`--verbose` / `--quiet` は Phase 7 で実装（本 Phase は per-char warn のみ）。
- **残余リスク**: 低。

---

## §10. レビュー項目

PR レビュー時のチェックリスト。**本 Phase は最優先リスクフェーズのため 4 観点で独立 LGTM を要求**。

### 10-1. 座標変換の数値精度観点（#1 + #4 が LGTM）

- [ ] `transformKanjiVGToBitmap()` が pure 関数（I/O なし、副作用なし）
- [ ] y 反転が `-ny * scale`（`+ny` になっていないか）
- [ ] KanjiVG 中心 (54.5, 54.5) が glyph の bbox 中心に写ることを §7-2 T-01 で検証
- [ ] `unitsPerEm` が 1000 / 2048 / 1024 で動作（Noto / Caveat 等）
- [ ] `raster.transform.scale` と KanjiVG scale を二重適用していない
- [ ] `bboxMid` の計算で pixel-unit / font-unit 混同なし
- [ ] テスト 8 ケース pass

### 10-2. Zod schema の optional 性観点（#2 + #3 が LGTM）

- [ ] `dataset: z.enum(['kanjivg']).optional()` で default 未指定
- [ ] `strict: z.boolean().default(false)`
- [ ] `DEFAULT_OPTIONS` の構造が structural equal（新フィールドが undefined / false で差分）
- [ ] `SkeletonMethod` enum に `'dataset'` 追加、既存 6 値は順不同でも同一集合
- [ ] URL state `sk` が既存値で parse 可能
- [ ] `generateArgsSchema.extend(...)` で自動継承

### 10-3. フォールバック動作観点（#2 + #3 が LGTM）

- [ ] `!hasKanji(cp)` で `console.warn('[dataset] ...')`
- [ ] `--strict` で `throw new Error(...)` → exit 1
- [ ] `getKanjiSvg() === null && hasKanji() === true` の矛盾パスで error throw（Phase 1 manifest drift 検知）
- [ ] SVG 破損（parseKanjiSvg が `[]`）で fallback + warn
- [ ] warn に `char` と `codepoint hex` 両方含む
- [ ] `isCJK('𠮟') === false` により CJK Ext B は `useDataset === false` で既存経路（fallback 経由せず）

### 10-4. Snapshot 退行観点（#3 + #1 が LGTM）

- [ ] `fixtures/snapshots/caveat-50.json` が PR 前で commit 済み
- [ ] Caveat の結果が fixture と完全一致
- [ ] `--dataset kanjivg` 有無で Caveat 出力が完全一致（diff 0 バイト）
- [ ] 既存 `processGlyph()` ラテン経路が**コード上 1 行も変更されていない**（git diff L189 周辺）
- [ ] `SkeletonizeInput` 型が変更されていない

### 10-5. 視覚検証観点（#4 が LGTM）

- [ ] 「右」1 画目が左上→右下のノ（払い）
- [ ] 「右」2 画目が横棒、3-5 画目が口の箱（左縦 → 折れ → 底）
- [ ] 「田」1 画目が左縦棒、5 画が正しい順序で描画
- [ ] 「必」の点が左下配置
- [ ] 常用 20 字で明らかな異常（画抜け・逆方向）0 件
- [ ] PreviewApp URL state による再現手順が PR 本文に記載

### 10-6. 実装規約観点（全員）

- [ ] `.ts` 拡張子 import（`import { foo } from './bar.ts'`）
- [ ] Zod は `import * as z from 'zod/v4'`
- [ ] Biome（single quotes, 2-space, 140-col）準拠
- [ ] `bun typecheck && bun run test && bun check` exit 0
- [ ] 新規 `*.ts` すべてに `*.test.ts` 対応
- [ ] circular import なし（`dataset-skeleton.ts` ⇄ `processing/skeletonize/index.ts` 要注意）

---

## §11. 一から作り直す場合の設計思想

> Phase 3 は最重要リスク（座標ズレ）を乗り越えた前提で、**CJK/ラテン分岐と fallback をどこに配線するか**を問う。Phase 1 §11-5（dataset パッケージ境界を `StrokeDatasetProvider` で将来切る）・Phase 2 §11-4（パース実装は provider interface 内側で差し替え可能な純関数に閉じる）の先行判断と**垂直方向に整合**させ、本 Phase では「その provider interface を **誰がどこで呼ぶか**」を設計する、という位置づけで書く。
> 感情的 Pros/Cons ではなく **数字と失敗モード** で判断し、定量表の各セルは **(実測 / 推定 / 契約)** を明示する。最終章で「私ならこうする」を断言し、**1 年後・3 年後の自分が検算可能**な形に残す。

### 11-1. 設計空間の全体像（7 案）

分岐配線は **分岐の高さ（processGlyph / pipeline / package 境界）** と **拡張軸（単一文字種 / 複数 dataset / ML 推論）** の 2 次元で 7 案に整理できる。案 A–E は本チケット起案時の選択肢。**案 F・G は Phase 1/2 §11 のレビュー後に追加**した、より高層の構造選択肢である。

| 案 | 本質 | 分岐場所 | 拡張軸 |
|---|---|---|---|
| **A** | 既存 `skeletonize()` に `'dataset'` モード + `processGlyph` 三項分岐 | processGlyph 冒頭 + skeletonize dispatch | 単一 dataset 想定 |
| **B** | 完全別パイプライン `processGlyphDataset()` を先頭分岐 | processGlyph 冒頭 early return | 単一 dataset 想定 |
| **C** | Pipeline を abstract class 化、Dataset / Heuristic subclass | class 生成時 | 単一 dataset 想定 |
| **D** | Plugin registry（`StrokeSourceRegistry.get(provider)`） | registry lookup | **複数 dataset 並列** |
| **E** | processGlyph の stage を hook 差し替え可能な関数型コンポジション化 | 各 stage の hook | **stage 単位の横展開** |
| **F** | **CJK パイプライン全体を別パッケージ `@tegaki/generator-cjk` に分離** | package 境界（dynamic import） | **ライセンス/依存/配布の分離** |
| **G** | **ストローク抽出責務を skeletonize から `StrokeSource` interface に分離**（`heuristic` / `dataset` / `hybrid` / `ml` 実装） | `StrokeSource` 実装選択 | **アルゴリズム族の並列進化（ML 将来対応）** |

抽象化の階層としては、**文字種判定（A/B/C）＜ dataset レジストリ（D）＜ stage hook（E）＜ ストローク抽出責務の抽象化（G）＜ package 境界（F）** という入れ子になり、上位案は下位案を包含可能。例えば **案 F の内部実装は案 D を内包**し、**案 G は案 A〜D のいずれの分岐法とも直交**する（実装層の分離）。

### 11-2. 定量比較

> **数値の根拠と信頼度凡例**:
>
> - **（実測）** — 現リポジトリで `bun test` / `tsc --noEmit` / `wc -l` 等で取得済の値。
> - **（推定）** — 既存実装の行数・Bun ベンチ（tegaki `bezier.ts` ~70-120 μs/path 等）・類似 OSS の類推から算出。本 Phase の Day 1 spike で **案 A の `generate.ts` 差分行数のみ実測確定**させ、他案は推定のまま退場判定に使う。
> - **（契約）** — 受入基準（[§4/§6](#)）や Phase 1/2 §11 で既に確定している boolean（例: 「ラテン snapshot 不変」）。実装時に機械検証可能。
>
> 評価軸: generate.ts diff、既存テスト破壊、工数、他データセット統合、mock 容易性、Phase 4/5 親和性、ML 将来対応、ロールバック、YAGNI、Phase 1/2 §11 整合。

| 指標 | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| **generate.ts 差分（行）** | ~10（推定） | ~60（推定） | ~100（推定） | ~40（推定） | ~150（推定） | ~20（推定、dynamic import 1 箇所） | ~25（推定） |
| **既存ラテン経路変更** | なし（契約） | なし（契約） | あり（契約違反） | なし（契約） | あり（契約違反） | なし（契約） | なし（契約、`StrokeSource=heuristic` が default） |
| **既存テスト破壊（件）** | 0（契約） | 0（契約） | 3-5（推定） | 0（契約） | 5-10（推定） | 0（契約、package 未導入時 skip） | 0-2（推定、skeletonize wrapper のみ） |
| **Phase 3 工数** | 5 日（本 Phase 予算） | 7-8 日（推定） | 10-12 日（推定） | 8-10 日（推定） | 14-18 日（推定） | 9-11 日（推定、package scaffolding 含） | 6-8 日（推定） |
| **他データセット追加コスト** | 中（if 分岐追加） | 高（関数コピー） | 中 | **最低**（`register` 1 行） | 低 | 低（別 package 追加） | **最低**（`new DatasetStrokeSource('animcjk')`） |
| **mock 容易性** | ◎（実測、既存パターン） | ○ | △（class 全体 mock） | ◎ | ○ | △（package mock 必要） | ◎（interface mock） |
| **Phase 4 仮名バンドル親和性** | ◎ | △ | ○ | ◎ | ◎ | ◎（kana も CJK package 内） | ◎ |
| **Phase 5 rhythm 親和性** | ◎（stroke-order.ts 共通） | △（両経路に同改修） | ○ | ◎ | ◎ | ◎ | ◎ |
| **複数 dataset 並列（AnimCJK, 漢検式）** | △（dispatch 肥大） | × | △ | ◎（registry） | ◎ | ◎（package / provider マップ） | ◎（StrokeSource 複数実装） |
| **ML 推論の将来接続（字形→筆順）** | ×（skeletonize 内に収まらない） | △（別経路新設で重複） | △（subclass 追加） | ○（provider として登録） | ◎（hook で stage 置換） | ○（別 package として incubate） | **◎（`MlStrokeSource` 並列実装、A/B 比較容易）** |
| **循環依存リスク** | 中（dataset-skeleton ⇄ skeletonize） | 低 | 低 | 低 | 中 | **最低**（package 境界で遮断） | 低（interface 経由） |
| **ロールバック容易性** | 高（フラグ外す） | 高 | 低（refactor revert） | 高 | 低 | 高（package 未導入で fallback） | 高（source を heuristic に戻す） |
| **YAGNI リスク** | 低 | 中 | 高 | 中 | 高 | **中〜高**（Phase 3 単体なら） | 中 |
| **Phase 1/2 §11 との整合** | ○（provider 内側実装） | ×（dataset 専用経路で抽象化迂回） | △ | ◎（provider registry そのもの） | ○ | ◎（package 境界を Phase 1 方針へ昇格） | **◎（抽象化層の位置を最適化）** |

**補足**: 上表で「既存ラテン経路変更: あり（契約違反）」と判定した案 C・E は、**[AC-1](#) (ラテン snapshot byte-identical) に抵触する確率が高い**ため、Phase 3 スコープでは実質的な候補ではない。Phase 8+ の大規模 refactor 時に再評価。

### 11-3. 各案の要点

**案 A（三項分岐）** — 既存コード最小侵襲、ラテン snapshot byte-identical を保証可能。欠点は `skeletonize` dispatcher と `processGlyph` に `'dataset'` 判定が二重に書かれる（軽微 DRY 違反）。失敗モード: `useDataset` 判定の typo や文字種判定漏れで CJK が heuristic に落ちるが、snapshot テストで検知可能。

**案 B（完全別パイプライン）** — 不可侵だが `extractGlyph`〜`toFontUnits` のロジック大半を関数コピーせざるを得ず DRY 違反深刻。Phase 5 rhythm を両経路へ同期適用する二重作業が半永久的に発生。失敗モード: 片側経路にだけ修正が入り、数ヶ月後に「CJK だけ rhythm が古い」等の隠れ差異が発生（発見困難）。

**案 C（abstract class）** — OOP 的に整うが Tegaki の関数型寄り文化（[AGENTS.md](../../AGENTS.md)）に逆行し、Bun tree-shaking を鈍らせる。Java/C# なら最適、TS ではオーバーエンジニアリング。失敗モード: subclass hierarchy が deep になるとテスト用 mock が書きづらく、Phase 5 で `RhythmPipeline extends DatasetPipeline` の多重継承が必要になる。

**案 D（Plugin registry）** — [Phase 1 §11-5](./phase-1-dataset-package.md) の `StrokeDatasetProvider` interface の素直な実装形。**他データセット追加が `registry.register('animcjk', ...)` 1 行**。Phase 3 単体では entry 1 件で YAGNI 気味、**Phase 5 後の段階移行が現実解**。失敗モード: registry の global mutable state が test isolation を破る（registry を per-test に reset する helper が必要）。

**案 E（関数型 hook）** — 将来 stage 追加（Stage 3.5 の pre-rhythm 等）や rhythm 挿入点選択が柔軟だが、全 6 stage refactor に 14-18 日。本 Phase スコープ完全超過。Phase 8 以降の大 refactor で検討。失敗モード: hook 間のデータ受け渡し型が安定しないと、中間型の互換性破壊で refactor 再燃。

**案 F（CJK パイプライン別パッケージ `@tegaki/generator-cjk`）— 新規追加** — [Phase 1 §11-5](./phase-1-dataset-package.md) の dataset 境界に加え、**generator 本体の CJK 依存も package 境界で分離**する構造。本体 `tegaki-generator` は `import('@tegaki/generator-cjk').catch(() => null)` で optional dependency として読み、`datasetSkeleton()` / `isCJK()` / `transformKanjiVG()` を CJK package 側に移す。
- 利点: **`@xmldom/xmldom` / KanjiVG dataset を触らないユーザー（ラテンのみ）が 0 byte 負担**。CC-BY-SA 同居問題が generator レイヤでも形式化。3 年後に簡体字 / 繁体字 / 韓国語を足す際 `@tegaki/generator-zh-cn` 等で水平分割可能。Phase 1 の workspace 分離方針を generator にも遡及適用する、という**一貫した境界設計**。
- 欠点: Phase 3 単体だと package 1 つのために scaffolding +2-3 日。リリースフロー（Changesets）に新 pkg 追加。**現時点の CJK 利用者しか恩恵を受けず YAGNI 濃厚**。dynamic import が Astro SSR / Cloudflare Workers 等 edge で warning を吐く可能性。
- 失敗モード: package 間バージョン drift（`tegaki-generator@1.2` と `@tegaki/generator-cjk@1.1` の組合せで実行時例外）。Changesets の peer dep 制約で機械的に防ぐ必要。
- **判定**: 方向性は Phase 1 §11 の自然な延長で正しいが、**Phase 3 では案 A を書き、内部構造を本 package 分離時に machine-movable に保つ**のが段階移行として素直。`packages/generator/src/dataset/` 以下を独立 TS module として閉じ、将来 `git mv -> packages/generator-cjk/src/` するだけで済む構造を本 Phase から維持する（§11-7 の布石）。

**案 G（`StrokeSource` interface でストローク抽出責務を分離）— 新規追加** — `skeletonize()` が担う「ビットマップ→骨格」責務を抽象化し、**`StrokeSource` interface** の複数実装として並列化する。これは案 D（provider registry = dataset 選択層）より **1 つ下のレイヤ** = アルゴリズム族そのものの選択層である。

```ts
// packages/generator/src/processing/stroke-source/index.ts
export interface StrokeSource {
  readonly id: 'heuristic' | 'dataset' | 'hybrid' | 'ml';
  readonly capabilities: { needsChar: boolean; needsFont: boolean; async: boolean };
  extract(input: StrokeSourceInput): StrokeExtractResult;      // sync: heuristic / dataset
  extractAsync?(input: StrokeSourceInput): Promise<StrokeExtractResult>; // async: ml / remote
}

// 実装一覧:
//   HeuristicStrokeSource  — 現行 skeletonize ラッパ（Zhang-Suen / Guo-Hall / voronoi 等を内包）
//   DatasetStrokeSource    — 本 Phase の datasetSkeleton（provider 経由で KanjiVG/AnimCJK 等）
//   HybridStrokeSource     — Phase 6 想定: dataset で stroke 境界、heuristic で width 補完
//   MlStrokeSource         — 3-5 年後想定: 字形 → 筆順推論モデル（ONNX/tfjs）
//   RemoteStrokeSource     — サーバーサイド推論 API ラッパ（CJK 収録外字の実行時取得）
```

- 利点:
  - **ML 将来対応の座席を予約**: 字形→筆順の推論モデル（ONNX / tfjs）を将来導入する際、`new MlStrokeSource({ model })` を差すだけで A/B 比較可能。`HeuristicStrokeSource` 出力と snapshot diff で ML 採用可否を定量判定できる。教師データは `DatasetStrokeSource` の出力をそのまま再利用可。
  - **Hybrid 戦略が自然に書ける**: 「KanjiVG 収録字は dataset、未収録字は heuristic」を `HybridStrokeSource` として明示化（現行 fallback も概念的にここ）。[technical-validation.md §3-2](../technical-validation.md) の「CJK 未収録字 fallback 未定義」課題への一般解になる。
  - 案 D（dataset レジストリ）と**直交**: `DatasetStrokeSource({ provider: registry.get('kanjivg') })` のように合成可能。責務分離が明確。
- 欠点:
  - Phase 3 単体では `Heuristic` と `Dataset` の 2 実装で abstraction の恩恵が薄い。
  - `extract()` を Promise 化すると既存 synchronous chain（[stroke-order.ts](../../packages/generator/src/processing/stroke-order.ts)）に影響。本 Phase は sync で閉じる判断もあり（`extractAsync?` で後付け可能な設計）。
  - `capabilities` フラグの増殖で interface が肥大化するリスク — 3 つ以上は増やさない規律が必要。
- 失敗モード: 各実装の「返す値の精度の差」が snapshot diff を汚染しないよう、`StrokeExtractResult` の座標系・単位系を仕様書で厳密に固定する必要。
- **判定**: 案 D と競合せず **補完的**。案 A を書きつつ `datasetSkeleton()` と `skeletonize()` の呼出面を `StrokeSource.extract()` と将来同型に揃えておく（§11-7）。**ML 対応が本気で視野に入るのは Phase 8+ 以降**、今は interface 契約だけ先行予約が最小コスト。

### 11-4. 結論: 私ならこうする（断言）

**Phase 3 では案 A を採用。Phase 5 完了後に案 D（registry）、Phase 6 前後で案 G（StrokeSource 抽象）、ML/他言語を本気で手がける Phase 8+ で案 F（package 分離）へ段階昇格**、というのが私の結論。案 B / C / E は棄却する。

この「**A → D → G → F** の段階昇格経路」は Phase 1 §11-5（dataset boundary）・Phase 2 §11-4（parser boundary）と**同じ設計原則の垂直延長**である:

1. **今回増やす自由度は、次に本当に必要になる自由度だけ**（Phase 3 時点で必要な分岐は 1 本 = 案 A）
2. **将来増やす予定の自由度の interface 契約だけは今書く**（§11-7 の布石）
3. **package 境界への昇格は、ライセンス・依存・リリースサイクルが実際に分岐してからで遅くない**（案 F は今やっても YAGNI）

根拠（定量）:

1. **案 A は AC-1（ラテン snapshot 不変）を機械的に保証できる唯一解** — 三項演算子 1 行挿入のみでラテン経路が byte-identical。他案は変更量が多く契約違反リスクが非零。
2. **案 B/C/E は Phase 3 予算超過（7-8 / 10-12 / 14-18 日 vs 予算 5 日）** — かつ得られる自由度は Phase 4/5 の実装で後からでも遅くない。特に案 B は Phase 5 rhythm 同期コストで長期的には案 A より高くつく。
3. **案 D は KanjiVG 単体時点では registry エントリが 1 件で YAGNI**。Phase 5 完了後（AnimCJK 検証 or 漢検式併用の引き合いが来た時）の段階移行で十分。`datasetSkeleton()` を `registry.get('kanjivg').source.extract(...)` に置換するだけで renderer / bundle 影響なし。
4. **案 G は「3-5 年後の ML 対応」という遠い未来への保険料**としては、interface 契約だけ先行予約する限り**ゼロに近いコスト**。`StrokeSource.extract()` のシグネチャを §11-7 の布石として露出させるのみで、Phase 3 の実装コードは案 A のまま。
5. **案 F は「CJK を触らないユーザーの 0 byte 負担」という実益が具体化するのが Phase 6 以降**。Phase 3 で先走って package 分離すると scaffolding コスト（2-3 日）が前倒しになるだけで、得られる BundleSize 削減は当面ゼロ。

**Phase 1 §11-5 / Phase 2 §11-4 との整合確認**:

| Phase | 結論 | 本 Phase での引継 |
|---|---|---|
| Phase 1 | 案 A 採用 + Phase 2 で provider interface 境界敷設 | `StrokeDatasetProvider` を本 Phase で「誰が呼ぶか」設計（案 A が interface の内側で呼ぶ） |
| Phase 2 | 案 A（自作 TS）採用 + Phase 3 後に JSON 派生（案 E） | `parseKanjiSvg()` を `datasetSkeleton()` 内部に閉込め、JSON 派生時の差替えを容易化 |
| Phase 3 | **案 A 採用 + Phase 5 後に D、Phase 6+ で G、Phase 8+ で F へ段階昇格** | Phase 4/5/6/8+ 各 Phase へ `StrokeSource` 契約を申し送り |

**棄却案の再検討**:

- **案 B（完全別パイプライン）の死因**: Phase 5 rhythm が `stroke-order.ts` 共通層で効くことが [technical-validation.md §3-3](../technical-validation.md) で確定したため、CJK/ラテン を別経路化すると **rhythm 適用の二重書き**が毎 Phase で発生する。長期で案 A より総コストが大きい。
- **案 C（abstract class）の死因**: Tegaki の `processGlyph()` は純粋関数 + stage 分割の関数型設計で、class hierarchy に置換する理由がない。TypeScript の構造的型付けの利点も失う。
- **案 E（全 stage hook 化）の死因**: Phase 3 の増えた分岐は**たった 1 箇所**（Stage 4 の skeletonize 前後）で、全 6 stage を hook 化する改修の 95% が将来にも使われない overhead。Phase 8+ で本当に stage 追加が発生した時に on-demand で refactor すれば十分。

**結論要約: 案 A で実装、§11-7 の布石で A→D→G→F の全段階へ昇格可能な状態を確保**。Pareto 最適。

### 11-5. 複数筆順データ併用・ML 推論・言語横展開シナリオ

| シナリオ | 時期 | 吸収案 | 必要な新コード | 追加工数 |
|---|---|---|---|---|
| **教科書体（MEXT 基準、KanjiVG default）** | Phase 3（本 Phase） | 案 A | `datasetSkeleton()` | 5 日（本 Phase 予算内） |
| **漢検式（日本漢字能力検定協会基準）** | Phase 6-7 | 案 A + 案 D | `kanjiKenteiProvider()` 新規 | +1-2 日 |
| **楷書（KanjiVG `*-Kaisho.svg` variants）** | Phase 8+ | 案 D `kanjiVGProvider({ variant: 'Kaisho' })` | variant フラグ追加のみ | +0.5 日 |
| **AnimCJK（LGPL、簡体字・日本語アニメ特化）** | Phase 6+ | 案 D + 案 F | `@tegaki/dataset-cjk-animcjk` + `animcjkProvider()` | +3-5 日 |
| **HanziWriter（MIT、簡体字）** | Phase 7+ | 案 D | `@tegaki/dataset-zh-hanziwriter` | +2-3 日 |
| **Kanji alive（CC-BY 4.0、教材向け SVG+メタデータ）** | Phase 7+ | 案 D | 独自 SVG spec のパーサ | +3-4 日 |
| **ML 推論（字形 → 筆順、ONNX/tfjs）** | Phase 8+（3-5 年後） | 案 G `MlStrokeSource` | 推論ラッパ + モデル配布 | +10-20 日 |
| **Hybrid（dataset 未収録字を heuristic 補完）** | Phase 5-6 | 案 G `HybridStrokeSource` | fallback ロジックを正規化 | +2-3 日 |
| **Remote 推論 API（CJK 収録外字の実行時取得）** | Phase 10+ | 案 G `RemoteStrokeSource` | HTTP client + cache 層 | +5-7 日 |
| **簡体字 / 繁体字 / 韓国語** | Phase 10+ | 案 F `@tegaki/generator-cjk` 分離 | 言語別 provider + フォント対応 | +10-15 日 |
| **ユーザー提供 custom dataset（教育機関の独自筆順 JSON）** | Phase 11+ | 案 D + 案 G | `CustomProvider({ jsonPath })` API | +3-5 日 |

本 Phase では上記**いずれも実装しない**。案 D/G/F 昇格時に自然に収まる構造を保つ（§11-7）ことだけ意識する。特に**「ML 推論」「Remote 推論 API」は本 Phase ではコードに一切現れないが、`StrokeSource` interface の `async` capability として契約だけ予約**することで、3-5 年後の追加時に `processGlyph()` 側を書き換える必要がなくなる。

### 11-6. この判断が 1 年後・3 年後に妥当か（検算）

- **1 年後（Phase 4/5 完了、常用+人名用運用中）**: 案 A のまま運用、Phase 4 仮名は `datasetSkeleton()` 経由、Phase 5 rhythm は `stroke-order.ts` で CJK/ラテン共通。registry 化の引き金はまだ引かれない。**不満ゼロ**。レビュー観点: 「案 D を前倒ししていたら YAGNI と指摘されていた」を確認できる状態で、むしろ Phase 5 rhythm 実装が案 B/E だった場合の二重同期コスト発生を回避できたことが評価される。
- **3 年後（漢検式 or AnimCJK 併用開始）**: Phase 6 前に案 D 段階移行済。registry に 2-3 provider 並ぶ。**案 A を選んだ判断に感謝**（案 C なら二重 refactor、案 B なら重複経路の同期コスト）。案 G の `StrokeSource` interface は `HeuristicStrokeSource` + `DatasetStrokeSource` の 2 実装で稼働、ML 導入検討の A/B 基盤が整う。Phase 1 §11 の「3 年後振り返り」予言がそのまま当たる構造。
- **3 年後（ML 推論導入検討開始）**: 案 G が予約しておいた `MlStrokeSource` 座席に ONNX ランタイムを差し込み、`HeuristicStrokeSource` 出力との snapshot diff で採用可否判定。**案 G を 3 年前に予約しておいた判断が効く**（interface 契約がない世界だと ML 導入時に processGlyph を書き換えるコストが発生）。教師データには Phase 3 で生成した `glyphData.json` がそのまま使えるため、別途データ収集プロジェクトを起こす必要がない。
- **3 年後（CJK 利用者急増 / BundleSize 削減要請）**: 案 F 昇格（`@tegaki/generator-cjk` 分離）を実行。§11-7 で `packages/generator/src/dataset/` を独立 module に保ったため、`git mv` + package.json 追加 + dynamic import 1 箇所で完了（推定 2-3 日）。**「3 年後に 2-3 日で package 分離できる」という保険**が本 Phase で手に入る。
- **3 年後（プロジェクト停滞シナリオ）**: 案 A は「動く状態でフリーズ」可能。CJK 未 install ユーザーは既存 heuristic、CJK 利用者は `--dataset kanjivg` で安定。**保守ゼロ耐久力**は案 A の隠れた強み。案 D/G/F は段階昇格しなくても放置可能で、`@tegaki/dataset-cjk-kanjivg` の license/SHA 更新だけで KanjiVG 追従が続く（workspace 構造が Phase 1 で確立済）。

**逆に判断が崩れるシナリオ**:

- KanjiVG が突如消滅 / license 変更 → 案 D のおかげで AnimCJK / HanziWriter へ provider 差替えで生存。最悪でも `@tegaki/dataset-cjk-kanjivg` をフォークすればそのまま運用可。
- Phase 4 仮名実装で「CJK だけ完全別経路が必要」な要件発覚 → 案 B への遡及移行コスト発生（発生確率: 低、[technical-validation.md §3](../technical-validation.md) の検証で見落としなし。仮名は `kvg:type` なしのフォールバック確認済）。
- ML 推論が想定より早く実用化（例: 2 年以内に実用レベルの筆順推論 OSS モデルが出現） → 案 G の interface 契約を Phase 5 に前倒し（コスト: +2-3 日）。案 A の実装に手を入れる必要なし。
- `StrokeSource` interface の契約が Phase 4/5 実装中に変化 → interface を `@tegaki/generator` 内部に閉じているため破壊的変更も吸収可能（外部公開は案 D 段階移行時まで遅延）。

### 11-7. 本 Phase で打っておく将来拡張の布石

Phase 1/2 §11-7 と同じ流儀で、**案 D/G/F 全段階への昇格と他データセット・ML 統合**に備える仕込みを本 Phase で済ませる。

**案 D（registry）への布石**:
- `datasetSkeleton()` の第 1 引数は structural 型 — 将来 `provider: StrokeDatasetProvider` 引数追加可能
- `parseKanjiSvg()` 呼出を `datasetSkeleton()` 内部に閉込め、外部非露出 — provider 経由化時に API 無変更
- `transformKanjiVGToBitmap()` は純関数、他 dataset 変換関数と**同一シグネチャ**（`transformToBitmap(points, raster, unitsPerEm)`）
- `SkeletonMethod.'dataset'` は**一時的表現** — 案 D 移行時に `'provider:kanjivg'` 昇格可能な文書化を PR 本文に含める
- CLI フラグ `--dataset` は将来 `--provider` リネームを許容（alias で後方互換）

**案 G（`StrokeSource`）への布石**:
- `datasetSkeleton()` と `skeletonize()` の戻り値を**同型** `{ skeleton, polylines, widths }` に厳格化 — 将来 `StrokeSource.extract()` の戻り値型に無変更で移行可能
- `processGlyph()` 内の三項分岐を **`const source = useDataset ? datasetSkeleton : skeletonize;`** の named binding にしておく — 将来 `const source = pickStrokeSource(char, options);` へ自然昇格
- Promise 化可能性を潰さない: `datasetSkeleton()` 内で sync / async 両対応可能な設計（現状 sync、将来 ML 導入時に async に昇格する際の破壊的変更を最小化）
- `StrokeExtractResult` の座標系・単位系を **本 Phase で仕様凍結**（font units / bitmap units / 正規化 109 系の混在を発生させない）

**案 F（package 分離）への布石**:
- `packages/generator/src/dataset/` 配下を**独立 TS module**として閉じる — 本体 `src/commands/generate.ts` 以外から depend されない構造。将来 `git mv packages/generator/src/dataset packages/generator-cjk/src/` だけで分離完了
- `@tegaki/dataset-cjk-kanjivg` の import を `dataset/` module 内部に閉じ、`commands/generate.ts` から直接露出させない — package 分離時に import 書換が dataset module 内のみで済む
- CJK 固有定数（`CJK_RE` / 座標正規化 109）は `dataset/constants.ts` に集約 — generator 共通 `constants.ts` に漏れさせない
- `dataset/` module 内で `@xmldom/xmldom` 以外の追加依存を増やさない — package 分離時の依存スコープを最小化

**言語・国際化への布石**:
- `isCJK()` は本 Phase では日本 CJK のみ判定、将来 `isKorean()` / `isChinese()` 追加余地を残す（関数名を `isJapaneseCJK()` にしない）
- エラーメッセージ・warn 文言は英語で統一 — 将来 i18n 化の予備動作
- Unicode 範囲定数（hiragana / katakana / CJK Unified Ideographs）は `dataset/ranges.ts` に集約 — 将来 CJK Ext A/B/C/D/E/F を追加する際の変更点を一箇所化

**ML 対応への布石**:
- `datasetSkeleton()` 内部の stroke 抽出結果を「筆順（ストローク間順序）+ 字形（polyline）+ 速度（width 配列）」に**概念的に 3 分割**した中間表現でログ可能に保つ — 将来 ML 推論の教師データ化・推論結果比較の基盤になる（本 Phase は実装しないが、変数名と型で意図を残す）
- `glyphData.json` の出力は KanjiVG 由来と heuristic 由来を**区別可能なメタデータ**（例: `source: 'kanjivg' | 'heuristic'`）を `t` / `s` と並列に持てる余地を残す — 将来 ML 教師データセットを自動構築する際の信頼度フラグ

**契約スケッチ（本 Phase では実装しない、コメントで意図だけ残す）**:

```ts
// packages/generator/src/dataset/dataset-skeleton.ts  — 本 Phase で書くコード
export interface DatasetSkeletonInput {
  char: string;
  subPaths: SubPath[];
  pathBBox: BBox;
  raster: Raster;
  inverseDT: Float32Array;
  options: PipelineOptions;
  font: opentype.Font;
}

export interface DatasetSkeletonResult {
  skeleton: Uint8Array;
  polylines: Point[][];
  widths: number[][];
}

// NOTE(phase-3/§11-7): このシグネチャは将来 `StrokeSource.extract()` と
// `StrokeDatasetProvider.skeleton()` に昇格する。input/output 型を
// structural に保つことで、実装時 breaking change を避ける。
export function datasetSkeleton(input: DatasetSkeletonInput): DatasetSkeletonResult {
  // ...
}
```

この型シグネチャを**本 Phase で確定**させておけば、案 D（registry）移行時は `datasetSkeleton` を `provider.extract` にリネーム改名するだけ、案 G（StrokeSource）移行時は `DatasetSkeletonInput/Result` を `StrokeSourceInput/ExtractResult` にリネームするだけで済む。**型名の変更は自動リファクタ可能**だが、型の**形状**（property 構成）を後から変えるのは深い refactor コストを生むため、本 Phase でフリーズする価値が高い。

### 11-8. テスト戦略への反映

将来の案 D/G/F 昇格をテスト資産で支えるため、本 Phase の unit / e2e テスト（[§7](#) / [§8](#)）に以下の方針を織り込む:

- **Snapshot テストは `datasetSkeleton()` の入出力**で取る（`processGlyph()` 経由ではなく）— interface 契約の機械検証基盤。将来 `StrokeSource.extract()` に昇格しても同じ snapshot が流用可能。
- **ラテン経路の snapshot（`fixtures/snapshots/caveat-50.json`）は案 A 固有ではなく、「CJK 分岐が生えていないラテン glyph を流した結果」として契約化** — 将来案 D/G 移行後も同じテストが pass しなければならない。
- `isCJK()` の Unicode カバレッジテストを本 Phase で充実させておく（hiragana / katakana / CJK Unified 全範囲の境界値）— 将来 CJK Ext A/B/C/D/E/F 追加時の回帰防止。
- `transformKanjiVGToBitmap()` の単体テストで座標変換 3 段（109 → bitmap → font units）を**各段分離**して検証 — 将来 AnimCJK / HanziWriter の座標系（1024 / 1000 等）が違っても変換層を再利用可能。

### 11-9. Phase 1/2 の判断との相互検算

Phase 1 §11-5 の 3 根拠（「オフライン CI」「OSS 保守不可能」「抽象化は Phase 2 で」）と Phase 2 §11-4 の 5 根拠（「wasm over-engineering」「lib 高コスト」「案 C/E は Phase 3 後」「案 F は Phase 4」「`flattenPath` 親和性」）は、**いずれも「今回やる自由度は必要分だけ、将来の自由度は interface 契約だけ」という同一原則の別角度適用**だった。本 Phase §11-4 の結論も同じ形になっている:

- **今やる**: 案 A（最小侵襲、契約機械検証可能）
- **契約だけ先に書く**: 案 D の `StrokeDatasetProvider`、案 G の `StrokeSource`、案 F の package 境界候補
- **将来実装する**: 案 D → 案 G → 案 F の段階昇格

この同一原則を 3 Phase 連続で適用できているのは、**Tegaki が OSS 単独メンテ体制で、自由度増分のコストが直接保守負担になる**という制約を各 Phase で共通に意識した結果。3 年後の自分から見ても、この 3 連の判断列は **「YAGNI と拡張性のバランスを毎回同じ流儀で取った」** と説明できる。

逆に、Phase 1/2/3 のいずれかで「最初から案 D/E/F を採用」していたら、単独メンテ体制では保守コストに耐えきれず、3 年後には「抽象化が負債として残る」状態になっていた可能性が高い。**小さく始め、境界契約だけを先に敷く**という方針こそが、OSS 単独プロジェクトで 3 年・5 年と生き残る設計の核心である。

以上により、**案 A を選ぶことは「今は最小コスト、将来の案 D/G/F 移行コストも最小、ML 対応への座席予約もゼロコスト」という Pareto 最適**。1 年後・3 年後の自分が検算しても、この判断に対し説明責任を負える自信がある。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 4（仮名バンドル）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **import path** | `import { datasetSkeleton } from 'tegaki-generator/src/dataset/dataset-skeleton.ts'` | `.ts` 拡張子付き |
| **関数シグネチャ** | `datasetSkeleton({ char, subPaths, pathBBox, raster, inverseDT, options, font }): SkeletonizeResult` | Phase 4 は仮名 89+90 字を CLI で一括生成 |
| **使用例** | `bun start generate --family "Noto Sans JP" --chars "$(cat kana-list.txt)" --dataset kanjivg --output packages/renderer/fonts/ja-kana` | kana-list.txt にひらがな 89 + カタカナ 90 |
| **想定 unitsPerEm** | Noto Sans JP = 1000、大半の日本語フォントは 1000 | unitsPerEm が 1000 以外（2048 系）でも動作確認 |
| **既知の挙動** | 仮名は `kvg:type` が null のため全 stroke が `endpointType = 'default'`（Phase 2 §12-3） | Phase 5 rhythm で standard プロファイルが適用 |
| **バンドルサイズ想定** | 仮名 179 字 × ~5 KB ≈ 900 KB、gzip 後 ~300 KB | [NFR-5.1](../requirements.md) 300 KB 上限に近い |
| **snapshot 更新** | 本 Phase で `noto-jp-4.json` commit、Phase 4 で仮名 179 字分追加 | `fixtures/snapshots/` |

### 12-2. Phase 5（Sigma-Lognormal リズム）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **rhythm 適用箇所** | [stroke-order.ts L101-105](../../packages/generator/src/processing/stroke-order.ts) の `t = cumLen / totalLen` を `remapTime(u, sigma, mu)` に置換 | [technical-validation.md §3-3](../technical-validation.md) 訂正事項 |
| **endpointType 情報** | 本 Phase の `datasetSkeleton()` は `EndpointType` を**まだ polyline に添付していない** | `SkeletonizeResult.endpointTypes?: EndpointType[]` を Phase 5 で optional 追加 |
| **widths への影響** | Phase 5 で「終端タイプ別筆圧テーパ」実装時に修正 | 本 Phase の widths はフラット（テーパなし） |
| **rhythm と両対応** | `stroke-order.ts` 修正は CJK/ラテン両方に効く | [AC-2](../requirements.md) で「`--rhythm constant` で Phase 3 と完全一致」を担保 |
| **`BUNDLE_VERSION`** | rhythm data を bundle に埋め込むなら increment、runtime 計算なら不要 | [Q-6](../requirements.md) デフォルト = runtime 計算 |

### 12-3. KanjiVG 統合 API の場所一覧

| API | ファイル | 公開性 |
|---|---|---|
| `isCJK(char): boolean` | [is-cjk.ts](../../packages/generator/src/dataset/is-cjk.ts) | public |
| `datasetSkeleton(input): SkeletonizeResult` | [dataset-skeleton.ts](../../packages/generator/src/dataset/dataset-skeleton.ts) | public |
| `transformKanjiVGToBitmap(points, raster, unitsPerEm): Point[]` | [transform-kanjivg.ts](../../packages/generator/src/dataset/transform-kanjivg.ts) | public |
| `parseKanjiSvg(svg): KanjiStroke[]` | [kanjivg.ts](../../packages/generator/src/dataset/kanjivg.ts) | public (Phase 2) |
| `getKanjiSvg(cp): string \| null` / `hasKanji(cp): boolean` | [@tegaki/dataset-cjk-kanjivg](../../packages/dataset-cjk-kanjivg/src/index.ts) | public (Phase 1) |
| `classifyEndpoint(kvgType): EndpointType` | [kanjivg.ts](../../packages/generator/src/dataset/kanjivg.ts) | public (Phase 2, Phase 5 使用) |

### 12-4. フォールバックの挙動（Phase 6 で検証対象）

- [FR-7.2](../requirements.md) の warn は `[dataset] char "X" (U+XXXX) not in KanjiVG; falling back to heuristic skeletonize` の**固定フォーマット**
- `--strict` は非ゼロ exit、stderr にエラー、stdout は何も出ない
- fallback した char は `PipelineResult.metadata.source` 等で識別可能にはしていない（Phase 4 で必要性判断）
- fallback 時の snapshot は**heuristic 経路と完全一致**（ラテン snapshot と同等検証を Phase 6 実施）

### 12-5. 既知の座標ズレ字一覧（Phase 6 で目視検証）

本 Phase で **visual QA 4 字 + 20 字**を実施するが、以下は **未検証**で Phase 6 確認対象:

| カテゴリ | 字数 | 重点確認項目 |
|---|---|---|
| 縦長字（丿 冫 冖 阝） | ~20 | y 軸スケールが正確か |
| 横長字（一 二 三 工） | ~15 | x 軸スケールが正確か |
| 複雑字（鬱 纏 鱲） | ~10 | 高ストローク数で座標崩れないか |
| 中心ズレ危険字（凹 凸 匚） | ~10 | 非対称 bbox で translate 正しいか |
| CJK Ext A 境界字（䴪 ䷀） | ~5 | 現在 fallback、Phase 6 で opt-in 検討 |
| **既知誤り字** 娩・庫・炭 | 3 | [Phase 2 §12-4](./phase-2-kanjivg-loader.md) 由来、Phase 6 で `fix-overrides.json` 実装 |

### 12-6. 運用・保守上の注意事項

- **`[dataset]` warn サマリ追加**: 本 Phase は per-char warn のみ。100 字生成で 20 字 fallback だと 20 行出力。Phase 7 で `--verbose` と末尾サマリ実装。
- **座標変換の回転・shear 検知漏れ**: T-07〜T-10 は中心一致・y 反転・bbox 幅一致までを担保するが、回転や shear の漏れは検知不能。Phase 6 で「上」の横棒が水平か等の追加テスト検討。
- **`extractGlyph` の extraFonts**: Noto Sans JP の CJK サブセットで `extraFonts[i]` から glyph 返却可能性。`datasetSkeleton()` に渡す `font` がメイン以外由来だと `unitsPerEm` 不一致リスク（§9-6）。Phase 6 再検証。
- **Phase 5 での rhythm 統合**: 本 Phase は `EndpointType` を**まだ渡していない**。Phase 5 で `SkeletonizeResult.endpointTypes?: EndpointType[]` を optional 追加。本 Phase の型を壊さない optional 追加で対応。

### 12-7. API 将来拡張余地

現在の `datasetSkeleton(input): SkeletonizeResult` からの**互換拡張**が可能:

- **複数 provider 対応**: `input.provider?: StrokeDatasetProvider` を追加（案 D 移行用）
- **バリアント対応**: `input.variant?: 'Kaisho' | 'Jinmei'`（Phase 8 以降）
- **EndpointType 返却**: `SkeletonizeResult.endpointTypes?: EndpointType[]`（Phase 5 使用）
- **座標変換パラメタ上書き**: `input.transformOverride?: { offsetX, offsetY, scale }`（Phase 6 offset 調整用）

### 12-8. Phase 3 → Phase 6 の検証チェーン

Phase 3 完了時点で **第一次リリース候補**。ただし以下は Phase 6「日本人評価者 MOS」で初検証:

- 筆順の**正確さ**（20 字サンプル → 100 字本番検証）
- 座標アライメントの**違和感**（上下左右 1-2% ズレは統計的検知困難、目視で顕在化）
- fallback 字の**見た目**（heuristic 経路混在で違和感ないか）
- rhythm 前の**等速描画**への評価（「機械的」と感じる人がいる可能性）

Phase 6 の低評価は**Phase 3 座標変換** or **Phase 5 rhythm** で fix 判断。本 Phase は「筆順のみ正しく、リズムは等速」を**意図的に受け入れ**、Phase 5 へ改善余地を残す。

---

### 関連チケット

- 前: [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md)
- 次: [Phase 4: 仮名バンドル](./phase-4-kana-bundle.md) / [Phase 5: Sigma-Lognormal リズム](./phase-5-rhythm-synthesis.md)（並列可）
- 一覧: [docs/tickets/README.md](./README.md)

### 関連ドキュメント

- 設計方針: [japanese-support.md](../japanese-support.md)（§6 / §9 Step 1-3）
- 実装ロードマップ: [japanese-roadmap.md](../japanese-roadmap.md)（§2 Phase 3）
- 技術検証: [technical-validation.md](../technical-validation.md)（§3-1 / §3-2 / §3-4-B）
- 要件定義: [requirements.md](../requirements.md)（FR-1, FR-3, FR-4, FR-7, FR-8, AC-1, NFR-2, NFR-3）
- プロジェクト全体: [AGENTS.md](../../AGENTS.md)
