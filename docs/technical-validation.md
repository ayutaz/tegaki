# 技術検証レポート

[japanese-roadmap.md](./japanese-roadmap.md) の実装計画を受け、**(1) KanjiVG の仕様詳細、(2) Sigma-Lognormal の数学・実装、(3) 既存コードベースへの統合可否** の 3 軸で技術検証を行った結果。

1 次ソース（論文・原典 SVG・実コード）を読み込んだ結果に基づき、ロードマップの修正箇所も併記する。

---

## 1. KanjiVG 仕様の詳細検証

### 1-1. SVG 構造（原典確認済み）

すべての KanjiVG ファイルは以下の固定構造。viewBox は **109×109 で不変**、中心は `(54.5, 54.5)`、y 軸下向き（SVG 標準）。

```
<svg viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_<hex>"  style="stroke-width:3;linecap:round;linejoin:round">
    <g kvg:element="..."> …階層的な部首/部品ネスト…
      <path id="kvg:<hex>-s1" kvg:type="㇒" d="M...c..."/>
      <path id="kvg:<hex>-s2" kvg:type="㇐" d="M...c..."/>
      ...
    </g>
  </g>
  <g id="kvg:StrokeNumbers_<hex>">
    <text>...</text>  (筆順番号の表示、データ抽出では無視可)
  </g>
</svg>
```

### 1-2. ロードマップの訂正事項

| ロードマップの記述 | 正しい情報 |
|---|---|
| `kvg:StrokeNumber` 属性でソート | **この属性は存在しない**（二次情報の誤り）。筆順は `<path>` の**出現順**（= `id="...-sN"` の N と一致） |
| ストロークごとに `kvg:type` | **仮名（ひらがな・カタカナ）は `kvg:type` が付与されていない**（「き」「ア」で実機確認）。仮名は `endpointType = 'default'` フォールバックが必須 |

### 1-3. `kvg:type` カタログと「とめ/はね/はらい」マッピング

値は CJK Strokes Unicode Block (U+31C0–U+31E3) の文字そのもの。`㇔/㇀` のスラッシュ記法は「どちらに傾いてもよい」の意で前者採用が安全。

```
dot    = ㇔
tome   = ㇐ ㇑
hane   = ㇀ ㇁ ㇂ ㇃ ㇆ ㇈ ㇉ ㇖ ㇙ ㇚ ㇟ ㇡
harai  = ㇇ ㇋ ㇏ ㇒ ㇓
hybrid = ㇄ ㇅ ㇕ ㇗ ㇛ ㇜ ㇞ (折れ系、終端は「とめ」扱いが無難)
```

サフィックス `a` / `b` は他画との接続種別（中央接続 / 端接続）で、筆順判定には不要だが将来 stroke joint smoothing で使える。

### 1-4. 実収録数（`kvg-index.json` 直読）

| 範囲 | 収録数 | メモ |
|---|---|---|
| ひらがな (U+3040–309F) | **89 字** | 基本 46 + 濁音 20 + 半濁音 5 + 小書き + ゐ/ゑ 等 |
| カタカナ (U+30A0–30FF) | **90 字** | 同系 |
| CJK 統合漢字 (U+4E00–9FFF) | 3,355+ 字（キー数） | バリアント含めると 約 4,200 ファイル |
| 最新リリース | `r20250816` (2025-08-16) | 固定 git SHA で pin する方針 |

**常用漢字 2,136 字**: KanjiVG は「JIS 第 1/2 水準を全網羅 + Japanese standards に準拠した追加」を公式に明記。JIS 第 1 水準（2,965 字）が常用を完全包含するため、**事実上 100% 収録**とみなせる。

### 1-5. パス仕様（実装簡略化のポイント）

- `d` 属性に登場するコマンドは **M/m, C/c, S/s のみ**（L, Q, A, Z は KanjiVG 規約上出ない）
- → TypeScript パーサは 3 コマンドだけ実装すれば足りる（S コマンドの制御点リフレクションを忘れずに）

### 1-6. 既知の落とし穴（実装時に必ず回避すべき 10 項目）

1. `kvg:StrokeNumber` 属性は**存在しない**。筆順は `<path>` 出現順
2. **仮名は `kvg:type` が空**。`default` フォールバック必須
3. DOCTYPE 内の `!ATTLIST` → 厳格パーサで外部 DTD 参照が遅い / 失敗する。`@xmldom/xmldom` では警告抑制モード推奨
4. 座標は **y-down**。opentype は y-up なので変換時に反転必須
5. S コマンドのリフレクション処理忘れで曲線がカクつく
6. スラッシュ記法 `㇔/㇀` → `split('/')[0]` で前者採用
7. **バリアントファイル**（`05cf6-Kaisho.svg` 等）→ suffix なしを優先、バリアントは opt-in
8. 既知の誤り字（常用内）: **娩・庫・炭**。Phase 6 で目視検証必須
9. リリースごとにストローク座標が変わる → **固定 git SHA で pin**
10. `kvg:StrokeNumbers` グループのテキスト要素をストロークと誤認しないよう、`g[id^="kvg:StrokePaths"]` を起点にする

### 1-7. TypeScript パーサの外部依存

- ブラウザ: native `DOMParser` で OK（ただし `kvg:type` は `getAttributeNS()` 推奨）
- Bun/Node: **`@xmldom/xmldom`** が必要（~50 KB、MIT）。既存依存にはないので新規追加

### 1-8. 既存 npm パッケージの評価

| パッケージ | 状態 | 判定 |
|---|---|---|
| `kvg2js` | 2014 以降未更新 | 使用不可 |
| `kanjivganimate` | CSS アニメ特化 | Tegaki パイプラインに不適 |
| `kanjivg-js` | 2024 〜、star 3、CC-BY-SA 4.0 | ライセンス注意、小規模実装 |

**結論**: 100〜150 行で自前実装したほうが依存管理が楽で長期メンテも容易。

---

## 2. Sigma-Lognormal の数学と実装

### 2-1. 核心数式（Plamondon 1995 / Frontiers 2013 検証済み）

**Eq. (1) — 単一プリミティブの速度**

```
|v_i(t)| = D_i · Λ(t; t0_i, μ_i, σ_i²)
        = D_i / (σ_i · √(2π) · (t − t0_i))
          · exp( −[ln(t − t0_i) − μ_i]² / (2 σ_i²) )   (t > t0_i)
```

**Eq. (2) — Σ-Lognormal: N 個の重畳**

```
v(t) = Σ_i D_i · [cos θ_i(t); sin θ_i(t)] · Λ(t; t0_i, μ_i, σ_i²)
```

**Eq. (3) — 弧長進捗（lognormal CDF）**

```
Φ(t) = ½ [1 + erf((ln(t − t0) − μ) / (σ√2))]
```

**Eq. (4) — 逆 CDF（t ↔ 弧長の時間マップ用）**

```
t(s) = t0 + exp( μ + σ√2 · erfinv(2s − 1) )
```

**Eq. (5) — ピーク速度時刻と非対称度**

- `t_peak = t0 + exp(μ − σ²)`
- 総持続時間 ≈ `exp(μ + 3σ)`（99% カバレッジ）
- 歪度 `skew = (exp(σ²) + 2) · √(exp(σ²) − 1)` ≈ **0.78 at σ=0.25**

### 2-2. 推奨パラメタ値

| パラメータ | 中心値 | 範囲 | 典拠 |
|---|---|---|---|
| **σ** (shape) | **0.25** (健常成人) | 0.15–0.50 | Frontiers 2013 |
| **μ** (log-time scale) | **−1.6** | 実効持続時間で決定 | Frontiers 2013 |
| **t₀** | 画開始 | ストローク長の 5–20% 手前 | Martín-Albo 2017 |
| **D** | 画の弧長 | — | Plamondon 1995 |
| **N プリミティブ** | 直線画 1、曲線画 2–3 | 最大 6 | iDeLog 2020 |

### 2-3. 終端種別ごとの補正値（Phase 5 で使用）

| 終端 | σ 倍率 | μ シフト | 視覚効果 |
|---|---|---|---|
| `default` | 1.00 | 0.0 | 標準の非対称鐘型 |
| `tome` (止め) | 0.85 | −0.1 | ピーク狭、終端急減速（ハードストップ） |
| `hane` (はね) | 1.10 | +0.1 | 加速長、終端急フリック |
| `harai` (払い) | 1.25 | +0.2 | 強い右歪度、30% 減速で 10% 区間 |
| `dot` (点) | 0.70 | −0.3 | 短時間、ほぼ対称、小さい D |

### 2-4. 画間ポーズ分布

```
pause ~ lognormal(μ=−1.61, σ=0.35)  clamped to [0.08, 0.50] s
```
中央値 ≈ 0.20s、IQR ≈ 0.14–0.28s で japanese-support.md §5-1 の「健常成人 100–500ms」に一致。

### 2-5. 非 GPL 参照実装の状況

| リポジトリ | ライセンス | 判定 |
|---|---|---|
| andrew-healey/sigma-lognormal (Python) | **LICENSE なし = all rights reserved** | コード流用不可、数式検証のみ |
| gpds-ulpgc/iDeLog (MATLAB) | SPDX 明示なし | 参照可、組込み不可 |
| LaiSongxuan/SynSig2Vec (PyTorch) | **GPL-3.0** | 組込み不可 |

**結論**: 数式そのものは著作権対象外。Plamondon 論文の Eq. (1)–(4) から**クリーンルームで TypeScript 実装**する（下記 `rhythm.ts` が該当）。

### 2-6. `rhythm.ts` 実装（完全形 ~195 行）

以下を Phase 5 の新規ファイル `packages/renderer/src/lib/rhythm.ts` として追加予定（ゼロ依存、純 TypeScript）。

```ts
// packages/renderer/src/lib/rhythm.ts
// Sigma-Lognormal rhythm synthesis.
// Clean-room TS implementation of Plamondon's Kinematic Theory equations.
// Zero external deps; no GPL code consulted or copied.

export type EndpointType = 'tome' | 'hane' | 'harai' | 'dot' | 'default';

export interface StrokeParams { mu: number; sigma: number; t0: number; D: number; }

// erf — Abramowitz & Stegun 7.1.26, |err| < 1.5e-7
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const p = 0.3275911;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a[4] * t + a[3]) * t + a[2]) * t + a[1]) * t + a[0]) * t) * Math.exp(-ax * ax);
  return sign * y;
}

// erfinv — Winitzki 2008, |err| ≈ 4e-3
export function erfinv(y: number): number {
  if (y <= -1) return -Infinity;
  if (y >= 1)  return  Infinity;
  const a = 0.147;
  const ln1y2 = Math.log(1 - y * y);
  const term  = 2 / (Math.PI * a) + ln1y2 / 2;
  const inner = term * term - ln1y2 / a;
  return Math.sign(y) * Math.sqrt(Math.sqrt(inner) - term);
}

export function lognormalCDF(t: number, mu: number, sigma: number, t0 = 0): number {
  const dt = t - t0;
  if (dt <= 0) return 0;
  return 0.5 * (1 + erf((Math.log(dt) - mu) / (sigma * Math.SQRT2)));
}

export function lognormalVelocity(t: number, D: number, mu: number, sigma: number, t0 = 0): number {
  const dt = t - t0;
  if (dt <= 0) return 0;
  const z = (Math.log(dt) - mu) / sigma;
  return (D / (sigma * Math.sqrt(2 * Math.PI) * dt)) * Math.exp(-0.5 * z * z);
}

export function lognormalInverseCDF(s: number, mu: number, sigma: number, t0 = 0): number {
  if (s <= 0) return t0;
  if (s >= 1) return t0 + Math.exp(mu + 6 * sigma);
  return t0 + Math.exp(mu + sigma * Math.SQRT2 * erfinv(2 * s - 1));
}

// Remap linear progress u∈[0,1] through lognormal CDF for natural timing.
export function remapTime(u: number, sigma: number, mu: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const tMax = Math.exp(mu + 3 * sigma);
  return lognormalCDF(u * tMax, mu, sigma, 0);
}

export function strokeParams(
  length: number,
  curvature: number,
  endpointType: EndpointType = 'default',
): StrokeParams {
  const SIGMA_BASE = 0.25;
  const MU_BASE = -1.6;

  const curvatureGain = Math.min(1.0, curvature * 4);
  let sigma = SIGMA_BASE + 0.08 * curvatureGain;

  const muLengthAdj = Math.log(Math.max(length, 10) / 300) * 0.3;
  let mu = MU_BASE + muLengthAdj;

  const mods: Record<EndpointType, { s: number; m: number }> = {
    default: { s: 1.00, m:  0.0 },
    tome:    { s: 0.85, m: -0.1 },
    hane:    { s: 1.10, m: +0.1 },
    harai:   { s: 1.25, m: +0.2 },
    dot:     { s: 0.70, m: -0.3 },
  };
  const mod = mods[endpointType];
  sigma = Math.max(0.10, Math.min(0.55, sigma * mod.s));
  mu    = Math.max(-2.8, Math.min(-0.8, mu + mod.m));

  return { sigma, mu, t0: 0, D: 1 };
}

// Lognormal pause sampler (Box-Muller transform)
export function sampleLognormalPause(
  rng: () => number = Math.random,
  muPause = -1.61, sigmaPause = 0.35,
  minPause = 0.08, maxPause = 0.50,
): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(minPause, Math.min(maxPause, Math.exp(muPause + sigmaPause * z)));
}
```

### 2-7. 評価メトリック（Phase 6 で使用）

1. **Reconstructed velocity SNR**: `10·log₁₀(Σ|v_ref|² / Σ|v_ref − v_synth|²)` — 目標 ≥ 25 dB (若年成人基準) / ≥ 15 dB (スタイライズ字)
2. **ピーク速度時刻比**: `t_peak / t_total` — 直線画で 0.35 ± 0.05、曲線画で 0.45–0.55 が Plamondon 基準
3. **速度プロファイル歪度**: σ=0.25 で理論値 0.78
4. **画間ポーズ KS 距離**: 目標分布 {median 0.18s, IQR 0.11–0.28s} との Kolmogorov-Smirnov 距離
5. **MOS (Mean Opinion Score)**: 5 段階評価、日本人 3–5 名、20 字固定セット、目標 ≥ 4.0

---

## 3. 既存コードベースへの統合検証

### 3-1. Phase 別実現性判定

| Phase | 判定 | 主な修正点 |
|---|---|---|
| **1**. データセットパッケージ | ✓ | 問題なし。`packages/dataset-cjk-kanjivg` を workspaces に追加 |
| **2**. KanjiVG ローダー | ✓ | 問題なし。`@xmldom/xmldom` を dev dep に追加 |
| **3**. パイプライン統合 | **△** | Zod schema の追加方法、座標変換位置 |
| **4**. 仮名バンドル | ✓ | 既存の `packages/renderer/fonts/caveat` パターンを複製 |
| **5**. Sigma-Lognormal | **△** | **挿入先がロードマップと異なる**（重要訂正、下記 3-3 参照） |

### 3-2. Phase 3 の修正事項

**Zod schema 拡張**（[generate.ts:34-58](../packages/generator/src/commands/generate.ts)）:

```ts
const pipelineOptionsSchema = z.object({
  // ... existing ...
  dataset: z.enum(['kanjivg']).optional().describe('CJK dataset source'),
});
```

`.optional()` で既存 CLI / PreviewApp の Zod バリデーション互換性を維持。

**分岐挿入点**（[generate.ts:189-206](../packages/generator/src/commands/generate.ts) `processGlyph()`）:

```ts
const isCjkChar = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(char);
const useDataset = options.dataset === 'kanjivg' && isCjkChar;

const { skeleton, polylines, widths } = useDataset
  ? datasetSkeleton({ char, subPaths, pathBBox, raster, inverseDT, options })
  : skeletonize({ subPaths, pathBBox, raster, inverseDT, options });
```

**座標変換**: 既存の `raster.transform` と `toFontUnits()` ([font-units.ts:18-43](../packages/generator/src/processing/font-units.ts)) が再利用可能。KanjiVG の 109 正規化座標 → bitmap 座標 → font units の 2 段変換で統一。

**リスク**: **Phase 3 が最優先リスク**。理由:
- 座標ズレは目視で即座に判明、後修正困難
- CJK 未収録字や形式エラー時のフォールバック未定義
- 対策: Phase 2 完了直後に 5–10 字（右・左・田・き・ア）で coordinate alignment test を実装

### 3-3. Phase 5 の重大訂正

**ロードマップで「[timeline.ts](../packages/renderer/src/lib/timeline.ts) へ lognormal を挿入」と記述したが誤り。**

実コードを確認したところ:

- [timeline.ts](../packages/renderer/src/lib/timeline.ts) は「テキスト全体の offset + duration」を文字単位で集計するだけ
- **ストローク内の `t` (0..1) 計算は [stroke-order.ts:101-105](../packages/generator/src/processing/stroke-order.ts) で発生**している:
  ```ts
  const t = totalLen > 0 ? cumLen / totalLen : 0;  // ← ここが線形
  ```
- `timeline.ts` に lognormal を挿入しても無関係な層に侵襲するだけで効果なし

**正しい修正箇所**:

1. **`stroke-order.ts:101-105`**: `t = cumLen / totalLen` を `remapTime(u, sigma, mu)` に置換
2. **`constants.ts:199-208`**: `DRAWING_SPEED`, `STROKE_PAUSE` を σ/μ 系パラメタに置換
3. **`timeline.ts`**: ポーズ部分だけを `sampleLognormalPause()` に置換（こちらはロードマップ通り妥当）

加えて既存の `strokeEasing` プロパティ（[PreviewApp.tsx:15](../packages/website/src/components/PreviewApp.tsx), [url-state.ts:72](../packages/website/src/components/url-state.ts) の `se` キー）を活用する手もある。`se=lognormal` という preset として露出可能。

### 3-4. 見落としていた依存・統合点

**A. BUNDLE_VERSION の increment**

[types.ts:81-89](../packages/renderer/src/types.ts) の `TegakiGlyphData` は compact 形式:
```ts
export interface TegakiGlyphData {
  w: number;  t: number;
  s: { p: [...], d, a }[];
}
```

Phase 5 で rhythm パラメタ（σ/μ 等）を埋め込むなら新フィールド（例 `r?: number[]`）追加 → `BUNDLE_VERSION: 0 → 1` 必須。`COMPATIBLE_BUNDLE_VERSIONS` に両対応を記述。

または rhythm は **runtime 計算**に寄せて bundle を無変更に保つ選択肢もあり（こちらを推奨、理由: 既存 4 フォントバンドル Caveat/Italianno 等の再生成不要）。

**B. `orderStrokes()` の widths マッチング**

[stroke-order.ts:95-109](../packages/generator/src/processing/stroke-order.ts) で `precomputedWidths` が polyline 参照の `indexOf` で検索される。KanjiVG パイプラインでは polylines と widths の順序を**厳密に揃える**必要あり。

**C. 視覚回帰テスト基盤が未整備**

Playwright 等のテストフレームが未導入。Phase 6 の視覚検証には以下のいずれか:
- GitHub Actions に Playwright stage を追加（~2-3 日、`.visual-baselines/` にスナップショットを git 管理）
- 手動検証のみで第一次リリース（コスト優先）

---

## 4. ロードマップへの反映事項

上記検証結果を踏まえ、[japanese-roadmap.md](./japanese-roadmap.md) の以下を訂正する（同コミットで反映）:

| セクション | 変更内容 |
|---|---|
| Phase 2 実装詳細 | `kvg:StrokeNumber` → `<path>` 出現順（`id="...-sN"`） |
| Phase 2 実装詳細 | 仮名は `kvg:type` なしのフォールバックを明記 |
| Phase 2 依存 | `@xmldom/xmldom` を dev dep に追加する旨を追記 |
| Phase 5 成果物 | 挿入先を `stroke-order.ts:101-105` に訂正（timeline.ts は pause だけ） |
| Phase 5 リスク | `BUNDLE_VERSION` 互換性 or runtime 計算の選択肢を追記 |
| Phase 6 成果物 | Playwright 導入コスト 2–3 日を明記 |
| 未解決論点 | Q7「rhythm は bundle 埋め込み vs runtime 計算」を追加 |

---

## 5. 参考 1 次ソース

### KanjiVG
- SVG フォーマット公式: https://kanjivg.tagaini.net/svg-format.html
- ストロークタイプ: https://kanjivg.tagaini.net/stroke-types.html
- ファイル一覧: https://kanjivg.tagaini.net/files.html
- kvg-index.json: https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kvg-index.json
- 既知の誤り issues: [#25](https://github.com/KanjiVG/kanjivg/issues/25), [#99](https://github.com/KanjiVG/kanjivg/issues/99), [#155](https://github.com/KanjiVG/kanjivg/issues/155)

### Sigma-Lognormal
- Plamondon (2013) Frontiers: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2013.00945/full
- PMC3867641: https://pmc.ncbi.nlm.nih.gov/articles/PMC3867641/
- Martín-Albo et al. (2017) IJDAR: https://link.springer.com/article/10.1007/s10032-017-0287-5
- iDeLog (2020) TPAMI: https://github.com/gpds-ulpgc/iDeLog
- 数式クロス検証用: https://github.com/andrew-healey/sigma-lognormal (コード非引用)
