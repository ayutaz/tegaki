# 日本語対応 実装ロードマップ

設計方針は [japanese-support.md](./japanese-support.md) 参照。本ドキュメントは**具体的な実装手順・マイルストーン・検証計画**を定義する。

対象読者: 実装担当 / レビュアー / プロジェクト管理者。

---

## 0. 現在地

| 項目 | 状態 |
|---|---|
| アップストリーム fork | ✅ 完了 (`ayutaz/tegaki`、`upstream` = `KurtGokhan/tegaki`) |
| 設計メモ | ✅ 完了（[japanese-support.md](./japanese-support.md)） |
| データセット選定 | ✅ 完了（KanjiVG + Sigma-Lognormal ハイブリッド） |
| 実装 | ⬜ 未着手 |

---

## 1. 全体像

各フェーズは前段の成果物を前提とするため原則直列。ただし Phase 4 と Phase 5 は Phase 3 完了後に並列化できる。

```
Phase 1: データセットパッケージ           [~3 日]
  ↓
Phase 2: KanjiVG ローダー                [~5 日]
  ↓
Phase 3: パイプライン統合（筆順正しい状態）[~5 日]  ←★ここで第一次リリース可能
  ├→ Phase 4: 仮名バンドル                [~2 日]
  └→ Phase 5: Sigma-Lognormal リズム      [~7 日]  ←★自然さを付加
       ↓
Phase 6: 検証・チューニング               [~5 日]
  ↓
Phase 7: ドキュメント・サンプル           [~3 日]
  ↓
Phase 8: 上流への提案 or 自前リリース      [~2 日]
```

**合計見積: 約 30 営業日 (6 週間) / 一人稼働前提**

ソロ開発でない場合、Phase 4-5 を分担すれば 4 週間程度まで短縮可能。

---

## 2. Phase 別詳細

### Phase 1: データセットパッケージの雛形 `packages/dataset-cjk-kanjivg`

**目的**: CC-BY-SA 3.0 ライセンスを本体 MIT から隔離する。

**成果物**:
- `packages/dataset-cjk-kanjivg/` ディレクトリ
- `package.json` (name: `@tegaki/dataset-cjk-kanjivg`, license: `CC-BY-SA-3.0`)
- `LICENSE`, `ATTRIBUTION.md` (KanjiVG 帰属表記)
- `kanjivg/` サブディレクトリに元 SVG（git submodule or 固定バージョン取得スクリプト）
- `src/index.ts` — 型定義と `getKanjiSvg(codepoint: number): string | null` の最小 API

**受け入れ基準**:
- `bun checks` が通る
- `import { getKanjiSvg } from '@tegaki/dataset-cjk-kanjivg'` が他パッケージから動作
- `ATTRIBUTION.md` に KanjiVG のクレジットと share-alike 要件が明記

**リスク**:
- KanjiVG の生 SVG は約 30 MB。npm pack に全件入れると配布サイズ超過
- → 対策: `files` フィールドで必要な範囲のみ含め、フルセットはユーザーが `bun install --optional` で取得する形式を検討

---

### Phase 2: KanjiVG ローダー

**目的**: SVG → Tegaki 中間形式（ストローク順ポリライン）への変換。

**成果物**:
- `packages/generator/src/dataset/kanjivg.ts`
  - `parseKanjiSvg(svg: string): KanjiStroke[]`
  - 筆順は `<path>` の**出現順**で決定（`id="kvg:...-sN"` の N と一致、`kvg:StrokeNumber` 属性は実在しない）
  - `d` 属性（M/C/S コマンドのみ、S のリフレクション処理必須）を既存の `flattenPath()` でベジェ平坦化
  - `kvg:type` から終端種別（tome/hane/harai/点）を推定。**仮名は `kvg:type` なしなので `default` フォールバック**
- 新規 dev 依存: `@xmldom/xmldom` (MIT, ~50 KB) を Bun/Node での SVG パース用に追加
- `packages/generator/src/dataset/kanjivg.test.ts`
  - 代表字（一、右、田、必、き、ア）でストローク数と順序を検証

**型定義**:
```ts
interface KanjiStroke {
  points: Point[];       // 109正規化座標
  endpointType: 'tome' | 'hane' | 'harai' | 'dot' | 'default';
  strokeNumber: number;  // 1-origin
}
```

**受け入れ基準**:
- 「右」の 5 画が `ノ → 一 → 口(縦) → 口(折れ) → 口(底)` の順で取れる
- 「き」が 4 画で分離されて取れる
- 存在しない文字で `null` を返す

**リスク**:
- KanjiVG の `kvg:type` は網羅的でなく、一部字で終端種別が推定できない
- → 対策: 推定不能時は `'default'` にフォールバック、Phase 5 で補正

---

### Phase 3: 既存パイプラインへの統合

**目的**: CJK 文字のみ新パイプラインに流し、ラテン文字は現状維持。**このフェーズ終了時点で漢字・仮名の筆順が正しくなる**（リズムはまだ等速）。

**成果物**:
- [packages/generator/src/processing/skeletonize/index.ts](../packages/generator/src/processing/skeletonize/index.ts) に `'dataset'` モード追加
- [packages/generator/src/commands/generate.ts](../packages/generator/src/commands/generate.ts) で `isCJK(char)` 分岐
- 座標変換: KanjiVG の 109 正規化 → フォントの `unitsPerEm`
- 線幅は既存 `getStrokeWidth()` で実測（再利用）
- CLI フラグ `--dataset kanjivg` 追加

**実装詳細**:

```ts
// generate.ts:206 付近
const isCjkChar = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(char);
const useDataset = options.dataset === 'kanjivg' && isCjkChar;

const { skeleton, polylines, widths } = useDataset
  ? datasetSkeleton({ char, subPaths, pathBBox, raster, inverseDT, options })
  : skeletonize({ subPaths, pathBBox, raster, inverseDT, options });
```

**受け入れ基準**:
- `bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg` が成功
- 生成された bundle で「右」が日本筆順で描画される（目視確認）
- ラテン文字（`Caveat`）の挙動は無変更
- `bun typecheck && bun run test && bun check` が全通

**リスク**:
- 座標アライメントが微妙にずれる（KanjiVG の bbox とフォントの advanceWidth の対応）
- → 対策: Phase 6 で視覚調整用の `--offset-x/--offset-y` デバッグフラグを追加

---

### Phase 4: 仮名バンドル（並列実行可）

**目的**: 全 92 文字の仮名を pre-generated bundle として `tegaki/fonts/ja-kana` で配布。

**成果物**:
- `packages/renderer/fonts/ja-kana/` に pre-built bundle
- `packages/renderer/fonts/ja-kana/bundle.ts` エクスポート
- README に使用例追加

**受け入れ基準**:
- `import kana from 'tegaki/fonts/ja-kana'` が動作
- 全 92 文字（ひらがな 46 + 濁音半濁音 25 + 小書き + カタカナ 同等）が収録

---

### Phase 5: Sigma-Lognormal リズム合成（並列実行可）

**目的**: 等速描画を廃止し、人間の運動学的プロファイル（非対称鐘型速度）を付加する。

**成果物**:
- `packages/renderer/src/lib/rhythm.ts` — 数式実装 (Plamondon 1995 クリーンルーム、詳細は [technical-validation.md §2-6](./technical-validation.md))
  - `lognormalCDF(t, mu, sigma)`, `erf(x)`, `erfinv(y)`
  - `remapTime(u, sigma, mu)`, `strokeParams(length, curvature, endpointType)`
  - `sampleLognormalPause(rng, ...)`
- **ストローク内の `t` 非線形化は [stroke-order.ts:101-105](../packages/generator/src/processing/stroke-order.ts) を修正**
  （timeline.ts は「テキスト全体の offset 集計」なので無関係。ロードマップ初版の誤記を訂正）
- [timeline.ts](../packages/renderer/src/lib/timeline.ts): 画間ポーズのみ `sampleLognormalPause()` に置換
- [constants.ts](../packages/generator/src/constants.ts) に以下を追加:
  - `LOGNORMAL_SIGMA_DEFAULT = 0.3`（Plamondon 論文推奨値）
  - `LOGNORMAL_MU_DEFAULT = 0`
  - `TOME_DECEL_RATIO = 0.5`（終端区間 30% で速度 50% 減）
  - `HANE_ACCEL_RATIO = 1.4`
  - `HARAI_DECEL_RATIO = 0.3`
  - `PAUSE_DISTRIBUTION = { min: 0.1, max: 0.5, sigma: 0.2 }`
- [width.ts](../packages/generator/src/processing/width.ts) に終端タイプ別筆圧テーパ

**受け入れ基準**:
- Phase 3 のラテン文字出力は完全に同一（後方互換）
- `--rhythm lognormal` フラグで CJK に適用、`--rhythm constant` で従来等速
- 「右」「愛」「書」等の目視確認で「とめ」「はらい」の速度差が視認できる
- ベンチマーク: 50 字生成が従来比 +20% 以内の時間で完了

**リスク**:
- σ/μ パラメタの初期値が合わず不自然になる
- → 対策: Phase 6 で日本人ユーザーに目視評価してもらうループを組む
- **`BUNDLE_VERSION` 互換性**: rhythm データを bundle に埋め込む場合は 0 → 1 に increment 必要。既存 4 フォント bundle の再生成を避けるため、**rhythm は runtime 計算**に寄せる方針を推奨（既存 bundle 無変更で動作）

---

### Phase 6: 検証・チューニング

**目的**: 「日本人が見て自然」の検証。これが通らなければ本プロジェクトの目的未達。

**成果物**:
- 検証用 URL セット（`PreviewApp` の URL state で再現可能、[AGENTS.md の url-state 節](../AGENTS.md) 参照）
  - 筆順テスト: 右 / 左 / 田 / 必 / 成 / 乃 / 艹部首字
  - リズムテスト: 永 / 書 / 愛 / 字 / 人 / 大
  - 仮名テスト: き / さ / ふ / を / ア / ン
- 評価レポート（社内 or 知り合いの日本人 3–5 名に評価依頼）
- チューニング差分（constants.ts のパラメタ調整）

**受け入れ基準**:
- 評価者の過半数が「自然」「書き順として正しい」と回答
- 明らかな異常（画が抜ける、逆方向に描画等）が 0 件
- 既知のズレはすべて [japanese-support.md](./japanese-support.md) に記載

**方法**:
1. 検証 URL 一覧を Gist / Notion に作成
2. 評価者に共有、5 段階評価でフィードバック回収
3. 低評価の字を特定 → Phase 3/5 のパラメタを調整 → 再評価
4. 2 ラウンド以内に収束させる

**補助: 視覚回帰テスト基盤**
- 現行リポジトリには Playwright 等の VRT フレームが未導入
- 本フェーズで GitHub Actions に Playwright stage を追加する場合 **+2-3 日**のコスト
- 最小コストで進める場合は手動目視のみで第一次リリース、Phase 8 以降で VRT 整備

**リスク**:
- KanjiVG 自体の誤り（稀にストローク順が伝統と違うケースあり）
- → 対策: 文部科学省「筆順指導の手びき」と照合して issue 化、KanjiVG 上流に報告

---

### Phase 7: ドキュメント・サンプル

**成果物**:
- [packages/website/src/content/docs/](../packages/website/src/content/docs/) に `guides/japanese.mdx` を追加
  - 使い方、サポート範囲、ライセンス注意
- `PreviewApp` に日本語プリセット追加（URL state で切替可）
- `examples/` に日本語手書きアニメのデモ（React / Astro）
- README の Framework Support セクションに日本語対応明記

**受け入れ基準**:
- `bun dev` で `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` が動作
- ドキュメントサイトで日本語ガイドが表示される

---

### Phase 8: 上流提案 or 自前リリース

**判断ポイント**:

| 条件 | 選択肢 | 理由 |
|---|---|---|
| 上流 (`KurtGokhan/tegaki`) が日本語対応に前向き | **PR 提案** | メンテナンス負担を共有、ユーザーベース広い |
| CC-BY-SA 依存が上流方針と衝突 | **自前リリース** | `@ayutaz/tegaki-ja` として NPM 公開 |
| 上流が応答しない / 方針未確定 | **自前リリース先行** | 後から PR 化してもよい |

**推奨**: まず GitHub Discussion か Issue で打診（[japanese-support.md](./japanese-support.md) と本ロードマップを提示）。反応次第で分岐。

**PR の分割方針**:
1. Phase 1-2（データセットパッケージ + ローダー、機能的にはまだ影響なし）
2. Phase 3（CJK 統合、ラテン無影響）
3. Phase 4（仮名バンドル）
4. Phase 5（リズム、opt-in フラグ）
5. Phase 7（ドキュメント）

5 本の小さい PR に分けることでレビュー負担を最小化し、途中段階で止まっても実用価値がある状態を維持する。

---

## 3. ブランチ戦略

```
main (origin = ayutaz/tegaki)
  ├─ feat/ja-phase1-dataset-package
  ├─ feat/ja-phase2-kanjivg-loader       ← phase1 をベース
  ├─ feat/ja-phase3-pipeline-integration ← phase2 をベース
  ├─ feat/ja-phase4-kana-bundle          ← phase3 をベース
  ├─ feat/ja-phase5-rhythm-lognormal     ← phase3 をベース（並列）
  └─ feat/ja-phase7-docs                 ← phase5 をベース
```

各フェーズを PR 化し、`main` にマージ後、次のフェーズを開始。

**上流追従**: 週 1 回 `git fetch upstream && git merge upstream/main` で同期。

---

## 4. テスト戦略

| レイヤ | 手法 | 対象 |
|---|---|---|
| **ユニット** | `bun test` | KanjiVG loader、座標変換、Sigma-Lognormal 関数 |
| **スナップショット** | 生成した `glyphData.json` を fixture として保存 | 主要 10 字でパイプライン差分を検知 |
| **視覚回帰** | `PreviewApp` の URL をフル画面スクリーンショット | 主要字形をコミット毎に比較（GitHub Actions で playwright） |
| **ベンチマーク** | `bun bench` (将来) | 50 字生成時間、バンドル読込時間 |
| **手動評価** | Phase 6 の日本人評価 | 自然さの主観指標 |

---

## 5. 未解決の論点

実装開始前に決めるべき点（判断者=実装担当）:

| # | 論点 | デフォルト方針 |
|---|---|---|
| Q1 | KanjiVG の同梱方式（submodule vs npm 依存 vs 固定 tarball） | **固定 tarball** を取得するセットアップスクリプト |
| Q2 | 常用外の字（JIS 第 3/4 水準）で未収録時の挙動 | 現行ヒューリスティックにフォールバック、警告ログ |
| Q3 | 縦書き対応 | **Phase 対象外**（`writingMode: vertical-rl` は将来課題） |
| Q4 | 他の東アジア言語（簡体字・繁体字・韓国語） | **Phase 対象外**（AnimCJK の `svgsZh/svgsKo` で将来対応可） |
| Q5 | Sigma-Lognormal のパラメタチューニング UI | `PreviewApp` に slider で露出（デバッグ用、opt-in） |
| Q6 | リズム合成の offline pre-compute vs runtime 計算 | **runtime 計算**（bundle 無変更で既存 4 フォント互換維持。初版でのデフォルト） |
| Q7 | 既存の `strokeEasing` (se) URL パラメタを rhythm 用に拡張するか | `se=lognormal` プリセットとして露出、既存 easing preset 機構を再利用 |

---

## 6. 成功指標（KPI）

| 指標 | 目標 |
|---|---|
| 常用漢字 2,136 字の筆順正確性 | 99% 以上（目視 20 字サンプルで 0 件誤り） |
| 日本人評価者の「自然さ」5 段階平均 | 4.0 以上 |
| 既存ラテン文字出力への影響 | 完全後方互換（snapshot 差分ゼロ） |
| バンドルサイズ増 | `tegaki/fonts/ja-kana` 単体で 300 KB 以下 |
| 生成速度 | CJK 50 字が 3 秒以内（M1 Mac 基準） |

---

## 7. 次のアクション

実装を開始する場合:

```bash
git checkout -b feat/ja-phase1-dataset-package
mkdir -p packages/dataset-cjk-kanjivg/{src,kanjivg}
# Phase 1 の成果物作成へ
```

実装を開始しない場合:

- 上流 (`KurtGokhan/tegaki`) の GitHub Issue で本ロードマップを提示して意見聴取
- 日本語対応の需要調査（Discord / Twitter / Zenn 記事）
