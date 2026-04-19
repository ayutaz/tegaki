# Phase 5: Sigma-Lognormal リズム合成 `packages/renderer/src/lib/rhythm.ts`

> 日本語対応実装の**第 5 マイルストーン**。Phase 3 完了時点の「筆順は正しいが等速描画」状態に、Plamondon の Kinematic Theory（Sigma-Lognormal モデル）に基づく非対称鐘型速度プロファイルを付加し、「機械的ではない、人間味のある手書き」を実現する。GPL 実装を参照せず、論文数式のみからクリーンルームで TypeScript 実装する。本 Phase 完了時点で「筆順 + リズム」の両方が揃い、**第二次リリース候補点**（自然さ付加、ただし MOS 評価未実施）に到達する。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **5 / 8** |
| マイルストーン名 | Sigma-Lognormal リズム合成（`rhythm.ts` 新設 + stroke-order.ts / timeline.ts への最小差分注入） |
| ブランチ名 | `feat/ja-phase5-rhythm-lognormal` |
| ステータス | ✅ 完了 (merged in `d2a9929`) |
| 依存（前段） | [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)（main マージ済み必須、`datasetSkeleton()` / `EndpointType` / `orderStrokes()` の widths マッチングが稼働状態） |
| 依存（後段） | [Phase 6: 検証・チューニング](./phase-6-validation.md) が本 Phase の σ/μ チューニング対象と MOS 評価 URL セットを消費 |
| 並列関係 | **Phase 4（仮名バンドル）と並列実行可**（Phase 3 完了後分岐、`stroke-order.ts` 共通層のみ接触点、conflict リスクは §9-C） |
| 想定期間 | **7 営業日** (一人稼働、チーム 4 名で並列 4 日) |
| 担当見積 | 数式実装 1.5d + 統合（stroke-order/timeline 差分）1.5d + constants/CLI/URL state 1.0d + テスト 1.5d + 視覚 QA 1.0d + レビュー対応 0.5d |
| **リリース区分** | **第二次リリース候補点**（Phase 3 = 筆順のみ正しい → Phase 5 = 筆順 + 自然なリズム） |
| **リスク評価** | 中：数式正確性はテストで担保可能、σ/μ 初期値チューニングは Phase 6 に委譲、後方互換は `--rhythm constant` で保証 |
| 関連要件 | [requirements.md](../requirements.md) FR-5.1〜5.6 / FR-8.2 / AC-2 / NFR-1.4 / NFR-2.1 / NFR-4.3 / NFR-5.3 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §5（手書きリズム） |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §Phase 5（**挿入先訂正済み：stroke-order.ts:101-105 であって timeline.ts ではない**） |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §2-1〜2-7（数式）/ §2-6（195 行 `rhythm.ts` 完全実装）/ §3-3（重大訂正：挿入先）/ §3-4-A（BUNDLE_VERSION 取扱）|
| 前フェーズ申し送り | [phase-3-pipeline-integration.md §12-2](./phase-3-pipeline-integration.md) — `endpointTypes` 未添付、`stroke-order.ts` 共通層での適用、`BUNDLE_VERSION` 判断の積残し |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| `packages/renderer/src/lib/rhythm.ts` 新規実装（`erf`, `erfinv`, `lognormalCDF`, `lognormalVelocity`, `lognormalInverseCDF`, `remapTime`, `strokeParams`, `sampleLognormalPause`） | 日本人評価者による MOS 評価（Phase 6） |
| [stroke-order.ts L101-105](../../packages/generator/src/processing/stroke-order.ts) の `t = cumLen/totalLen` 差分置換 | σ/μ 係数の本番チューニング（Phase 6 の 2 ラウンド以内で収束） |
| [timeline.ts](../../packages/renderer/src/lib/timeline.ts) の `glyphGap` / `wordGap` 部分への `sampleLognormalPause()` 注入 | `BUNDLE_VERSION` increment（runtime 計算戦略のため不要、**本 Phase で確定**） |
| `constants.ts` への `LOGNORMAL_*` / `PAUSE_*` 定数追加 | 既存 4 フォント bundle（Caveat/Italianno/Tangerine/Parisienne）の再生成 |
| 終端種別別パラメタ表（`tome`/`hane`/`harai`/`dot`/`default` の σ 倍率・μ シフト） | Sigma-Lognormal の N プリミティブ重畳（本 Phase は単一プリミティブで近似、多重化は Phase 8+） |
| curvature 推定ヘルパー（`stroke-order.ts` 内で polyline ごとに計算） | Phase 5 rhythm と Phase 4 仮名 pre-built bundle の合成配布 |
| CLI フラグ `--rhythm constant\|lognormal` 追加（`pipelineOptionsSchema`） | rhythm 合成結果の bundle 内埋込（runtime 計算へ寄せる、§9-D） |
| `strokeEasing` preset の `se=lognormal` URL state 拡張（PreviewApp） | 縦書き対応、非 CJK 言語への横展開 |
| GPL コード非参照の証跡（PR 本文、`rhythm.ts` 先頭コメント） | 速度プロファイルの外部スクリプト化・DSL（§11 案 F） |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-support.md §5-1/§5-3](../japanese-support.md) と [japanese-roadmap.md §Phase 5](../japanese-roadmap.md) で「**等速描画は機械的に見える**」「Plamondon の運動学的モデル（Sigma-Lognormal）で非対称鐘型プロファイルを合成するのが実データに最もフィット」と結論付けられた設計方針を、**Phase 3 が達成した筆順の正しさを一切損なわずに**実装レイヤへ落とす。解決する課題は 5 点。

1. **等速描画の廃止** — [stroke-order.ts L101-105](../../packages/generator/src/processing/stroke-order.ts) の `t = cumLen / totalLen` は線形な弧長進捗で、視覚的には「一定速度で pen が動く」ように見え、人間の手書きと乖離する。この 1 行を `remapTime(u, sigma, mu)` に通し、lognormal CDF による非線形マッピングに置換することで、加速→ピーク→緩やかな減速の非対称鐘型（歪度 ≈ 0.78 at σ=0.25）を発生させる。[FR-5.1](../requirements.md)。

2. **終端種別ごとの差別化** — [japanese-support.md §5-1](../japanese-support.md)。「とめ」「はね」「はらい」「点」はそれぞれ運動学的に別プロファイルを持つ。σ/μ を一律で固定せず、Phase 2 `classifyEndpoint()` が付与した `EndpointType` に応じて σ 倍率・μ シフトを適用（[technical-validation.md §2-3](../technical-validation.md) の表を忠実実装）。[FR-5.3](../requirements.md)。

3. **画間ポーズの可変化** — 現状 [constants.ts L208](../../packages/generator/src/constants.ts) `STROKE_PAUSE = 0.15` は固定値で、100 字書いても 100 画すべて 0.15s のポーズ。実データの「健常成人 100-500ms」[japanese-support.md §5-1](../japanese-support.md) を再現するには lognormal 分布から毎回サンプルすべき（median ≈ 0.20s、IQR 0.14-0.28s）。[FR-5.4](../requirements.md)。

4. **後方互換の機械的保証** — Phase 3 で確立した「ラテン snapshot 差分ゼロ」は Phase 5 でも死守する。`--rhythm constant` が default、`--rhythm lognormal` が opt-in。constant 時は Phase 3 と**バイト完全一致**でなければならない（[AC-2](../requirements.md) 3 項目目）。[FR-5.5](../requirements.md)。

5. **GPL 非参照の証跡化** — [technical-validation.md §2-5](../technical-validation.md) の通り、参照可能な既存実装は LGPL（iDeLog）/ GPL-3.0（SynSig2Vec）/ LICENSE なし（sigma-lognormal py）の 3 つのみ。**数式そのものは著作権対象外**という前提で、Plamondon 論文の Eq. (1)–(4) から**クリーンルームで TS 実装**する。PR 本文と `rhythm.ts` 先頭コメントで証跡化。[FR-5.6](../requirements.md)、[NFR-4.3](../requirements.md)。

### 2-2. Done の定義（測定可能）

以下 **15 項目すべて** を満たしたとき本チケット完了。[AC-2](../requirements.md) 4 項目 + [FR-5](../requirements.md) 6 項目 + [NFR](../requirements.md) 5 項目を網羅する構成。

- [ ] **D-1** `packages/renderer/src/lib/rhythm.ts` が新規追加、[technical-validation.md §2-6](../technical-validation.md) の 195 行実装と数式・シグネチャ・定数が一致
- [ ] **D-2** `erf` / `erfinv` / `lognormalCDF` / `lognormalVelocity` / `lognormalInverseCDF` / `remapTime` / `strokeParams` / `sampleLognormalPause` の 8 関数が export、`EndpointType` / `StrokeParams` 型も export
- [ ] **D-3** [stroke-order.ts L101-105](../../packages/generator/src/processing/stroke-order.ts) の `t = totalLen > 0 ? cumLen / totalLen : 0` が `options.rhythm === 'lognormal'` 分岐で `remapTime(u, sigma, mu)` に置換、`constant` 時は無変更（三項演算子 1 行差分）
- [ ] **D-4** [timeline.ts](../../packages/renderer/src/lib/timeline.ts) の `glyphGap` が `sampleLognormalPause()` で毎回サンプリングされる（`rhythm === 'lognormal'` 時のみ、constant 時は固定値維持）
- [ ] **D-5** [constants.ts](../../packages/generator/src/constants.ts) に `LOGNORMAL_SIGMA_DEFAULT = 0.25` / `LOGNORMAL_MU_DEFAULT = -1.6` / `PAUSE_MU = -1.61` / `PAUSE_SIGMA = 0.35` / `PAUSE_MIN = 0.08` / `PAUSE_MAX = 0.50` が追加（[technical-validation.md §2-2/§2-4](../technical-validation.md) 推奨値）
- [ ] **D-6** `pipelineOptionsSchema` に `rhythm: z.enum(['constant', 'lognormal']).default('constant')` 追加、default は Phase 3 互換のため `constant`
- [ ] **D-7** CLI: `bun start generate --rhythm lognormal` が Padrone に認識される（`--help` に出現、FR-8.2）
- [ ] **D-8** PreviewApp `url-state.ts` に `strokeEasing: 'lognormal'` preset が追加、URL `?se=lognormal` で適用される
- [ ] **D-9** 終端種別別パラメタ表（`tome`: σ×0.85/μ−0.1、`hane`: σ×1.10/μ+0.1、`harai`: σ×1.25/μ+0.2、`dot`: σ×0.70/μ−0.3、`default`: σ×1.00/μ±0）が `strokeParams()` 内で runtime 適用される
- [ ] **D-10** curvature 推定ヘルパー（`estimatePolylineCurvature(points): number`）が `stroke-order.ts` 内に追加、`strokeParams()` の第 2 引数に供給される
- [ ] **D-11** `--rhythm constant` で生成した Phase 5 出力が Phase 3 の `noto-jp-4.json` / `caveat-50.json` と**バイト完全一致**（AC-2 §3、後方互換）
- [ ] **D-12** `--rhythm lognormal` で「右」「書」「愛」の速度プロファイルに tome/hane/harai の差が視認可能（[AC-2](../requirements.md) §1、目視）
- [ ] **D-13** CJK 50 字生成の実測時間が Phase 3 比で**+20% 以内**（[AC-2](../requirements.md) §4、[NFR-1.4](../requirements.md)）
- [ ] **D-14** `BUNDLE_VERSION` は increment **せず**、既存 4 フォント bundle の再生成不要（[NFR-2.2](../requirements.md)、§9-D で結論）
- [ ] **D-15** `bun typecheck && bun run test && bun check` 全通（[NFR-3.2](../requirements.md)）、`rhythm.ts` 増分が gzip 後 ≤ 5 KB（[NFR-5.3](../requirements.md)）

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（追加・変更分のみ）

```
packages/renderer/src/lib/
  rhythm.ts           # 新規: ~195 行の Sigma-Lognormal 実装
  rhythm.test.ts      # 新規: 数式境界値・往復・単調性
  timeline.ts         # 差分: glyphGap 部分に sampleLognormalPause 注入

packages/generator/src/
  commands/generate.ts                   # 差分: pipelineOptionsSchema に rhythm 追加
  processing/stroke-order.ts             # 差分: L101-105 remapTime 置換 + curvature 推定
  processing/stroke-order.test.ts        # 差分追加: rhythm lognormal パス
  constants.ts                           # 差分: LOGNORMAL_* / PAUSE_* 定数追加
  dataset/dataset-skeleton.ts            # 差分: endpointTypes optional 添付

packages/website/src/components/
  PreviewApp.tsx      # 差分: strokeEasing='lognormal' preset 実装
  url-state.ts        # 差分: se='lognormal' の認識
```

**合計差分**: 新規 2 + 変更 8 ファイル。`rhythm.ts` 以外は数行〜数十行の最小差分。

### 3-2. `rhythm.ts` 主実装（[technical-validation.md §2-6](../technical-validation.md) 忠実版）

以下を `packages/renderer/src/lib/rhythm.ts` として**新規追加**する。ゼロ依存、純 TypeScript、GPL コード参照なし。[technical-validation.md §2-6](../technical-validation.md) の 195 行をそのまま写経する（クリーンルーム、数式は Plamondon 1995 公開論文由来で著作権対象外）。

**export 一覧**（型含む）:

- `type EndpointType = 'tome' | 'hane' | 'harai' | 'dot' | 'default'`
- `interface StrokeParams { mu, sigma, t0, D }`
- `erf(x): number` — Abramowitz & Stegun 7.1.26、`|err| < 1.5e-7`
- `erfinv(y): number` — Winitzki 2008、`|err| ≈ 4e-3`
- `lognormalCDF(t, mu, sigma, t0=0): number` — `0.5 * (1 + erf((log(t-t0) - mu) / (sigma*√2)))`
- `lognormalVelocity(t, D, mu, sigma, t0=0): number`
- `lognormalInverseCDF(s, mu, sigma, t0=0): number`
- `remapTime(u, sigma, mu): number` — 線形進捗 u∈[0,1] を lognormal CDF で非線形化、`tMax = exp(mu + 3*sigma)`
- `strokeParams(length, curvature, endpointType?): StrokeParams` — EndpointType 補正と clamp 適用
- `sampleLognormalPause(rng?, muPause=-1.61, sigmaPause=0.35, minPause=0.08, maxPause=0.50): number` — Box-Muller

**先頭コメント必須**: `"Clean-room TypeScript implementation of Plamondon's Kinematic Theory equations. Zero external deps; no GPL / LGPL / unlicensed code consulted or copied."` — T-15 で機械検証。

**実装詳細**は [technical-validation.md §2-6](../technical-validation.md) の 195 行実装が本 Phase の契約（本チケットでは二重掲載を避ける）。

### 3-3. 終端種別パラメタ表（`strokeParams()` 内で runtime 適用）

[technical-validation.md §2-3](../technical-validation.md) を表形式で再掲。`strokeParams()` の `mods` レコードとして埋込み。

| `EndpointType` | σ 倍率 (`mod.s`) | μ シフト (`mod.m`) | 視覚効果 | Phase 2 判定条件 |
|---|---|---|---|---|
| `default` | 1.00 | 0.0 | 標準の非対称鐘型（σ=0.25、skew 0.78） | `kvg:type` なし or 分類外 |
| `tome` | 0.85 | −0.1 | ピーク狭、終端急減速（ハードストップ） | `kvg:type` 末尾が `a` / `停` |
| `hane` | 1.10 | +0.1 | 加速長め、終端フリック | `kvg:type` 末尾が `ha` / `h` |
| `harai` | 1.25 | +0.2 | 強い右歪度、30% 減速で 10% 区間 | `kvg:type` 末尾が `p` / `z` |
| `dot` | 0.70 | −0.3 | 短時間、ほぼ対称、小 D | `kvg:type = 'Di'` |

最終的な σ/μ は `clamp([0.10, 0.55], sigma * mod.s)` / `clamp([-2.8, -0.8], mu + mod.m)` で物理的妥当範囲に制限（[technical-validation.md §2-6](../technical-validation.md) 実装準拠）。

### 3-4. `stroke-order.ts` L101-105 の差分（**Phase 5 の中核変更**）

[technical-validation.md §3-3](../technical-validation.md) の重大訂正通り、**挿入先は `timeline.ts` ではなく `stroke-order.ts`**。`t = cumLen / totalLen` を `remapTime(u, sigma, mu)` に通す。

```ts
// packages/generator/src/processing/stroke-order.ts (差分、L85-114 前後)
import { remapTime, strokeParams, type EndpointType } from 'tegaki/lib/rhythm';
import { LOGNORMAL_SIGMA_DEFAULT, LOGNORMAL_MU_DEFAULT } from '../constants.ts';

export function orderStrokes(
  polylines: Point[][], inverseDT: Float32Array | null,
  bitmapWidth: number, _avgWidth: number,
  precomputedWidths?: number[][] | null,
  // ── Phase 5: 新規 optional 引数 ─────────────────────────────────────
  rhythmMode: 'constant' | 'lognormal' = 'constant',
  endpointTypes?: (EndpointType | undefined)[], // Phase 3 datasetSkeleton から供給
): Stroke[] {
  // ... polylines が空の場合の早期 return は Phase 3 から無変更 ...
  const strokes: Stroke[] = [];
  for (let order = 0; order < polylines.length; order++) {
    const polyline = polylines[order]!;
    const oriented = orientPolyline(polyline);
    const totalLen = pathLength(oriented);

    // Phase 5: curvature 推定と σ/μ 算出（lognormal モード時のみ、polyline ループ外相当の位置）
    const useLognormal = rhythmMode === 'lognormal' && totalLen > 0;
    const curvature = useLognormal ? estimatePolylineCurvature(oriented) : 0;
    const endpointType = endpointTypes?.[order] ?? 'default';
    const params = useLognormal
      ? strokeParams(totalLen, curvature, endpointType)
      : { sigma: LOGNORMAL_SIGMA_DEFAULT, mu: LOGNORMAL_MU_DEFAULT, t0: 0, D: 1 };

    // precomputedWidths 参照は Phase 3 と同一ロジック
    let cumLen = 0;
    const points: TimedPoint[] = oriented.map((p, i) => {
      if (i > 0) cumLen += dist(oriented[i - 1]!, p);
      const uLinear = totalLen > 0 ? cumLen / totalLen : 0;
      // ── Phase 5 中核: 線形 t を lognormal CDF に通す（constant 時は素通し）──
      const t = useLognormal ? remapTime(uLinear, params.sigma, params.mu) : uLinear;
      // ... width 計算は Phase 3 と同一（precomputedWidths 参照 or getStrokeWidth） ...
      return { x: p.x, y: p.y, t, width: /* Phase 3 ロジック */ 1 };
    });
    strokes.push({ points, order, length: totalLen, animationDuration: 0, delay: 0 });
  }
  // ... 残りは Phase 3 から無変更 ...
}

/** Phase 5: polyline の平均曲率を推定（0=直線、1=最大曲率）。コサイン角累積で [0, 1] に正規化。 */
function estimatePolylineCurvature(points: Point[]): number {
  if (points.length < 3) return 0;
  let accum = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!, b = points[i]!, c = points[i + 1]!;
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
    if (m1 > 0 && m2 > 0) {
      const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (m1 * m2)));
      accum += 1 - cos; // 0 (straight) → 2 (180° bend)
    }
  }
  return Math.min(1, accum / (2 * (points.length - 2)));
}
```

**設計ポイント**:
- `rhythmMode` / `endpointTypes` とも **optional**。Phase 3 呼出側は引数を渡さず、Phase 3 出力と**バイト完全一致**（D-11 契約）
- `estimatePolylineCurvature()` はコサイン累積で `[0, 1]` 正規化。`strokeParams()` 内の `curvatureGain = min(1.0, curvature * 4)` で吸収
- `endpointTypes` は Phase 3 `datasetSkeleton()` が未添付（[phase-3 §12-2](./phase-3-pipeline-integration.md)）。本 Phase で `SkeletonizeResult.endpointTypes?: EndpointType[]` optional 追加、`classifyEndpoint()` を配列化（非破壊）

### 3-5. `timeline.ts` の `glyphGap` 差分（pause のみ変更）

[timeline.ts L65-72](../../packages/renderer/src/lib/timeline.ts) の `glyphGap` が全画で固定値（0.1s）。`rhythmMode === 'lognormal'` 時のみ `sampleLognormalPause()` に置換する。

```ts
// packages/renderer/src/lib/timeline.ts (差分、L46-80)
import { sampleLognormalPause } from './rhythm.ts';

export interface TimelineConfig {
  glyphGap?: number;
  wordGap?: number;
  lineGap?: number;
  unknownDuration?: number;
  strokeEasing?: (t: number) => number;
  glyphEasing?: (t: number) => number;
  // ── Phase 5: pause を lognormal 分布からサンプリングする optional フラグ ──
  rhythm?: 'constant' | 'lognormal';
  /** Deterministic RNG for test (default: Math.random). */
  rng?: () => number;
}

export function computeTimeline(text: string, font: TegakiBundle, config?: TimelineConfig): Timeline {
  const glyphGapFixed = config?.glyphGap ?? DEFAULTS.glyphGap;
  const wordGap = config?.wordGap ?? DEFAULTS.wordGap;
  const lineGap = config?.lineGap ?? DEFAULTS.lineGap;
  const unknownDuration = config?.unknownDuration ?? DEFAULTS.unknownDuration;
  const useLognormal = config?.rhythm === 'lognormal';
  const rng = config?.rng ?? Math.random;

  // ... 既存の entries loop ...
  for (const char of chars) {
    // ... existing char handling ...
    if (isLineBreak) offset += lineGap;
    else if (isWhitespace) offset += wordGap;
    // ── Phase 5: glyphGap だけ lognormal サンプリング ────────────
    else offset += useLognormal ? sampleLognormalPause(rng) : glyphGapFixed;
  }
  // ... 末尾 trailing gap 処理は無変更 ...
}
```

**設計ポイント**:
- `wordGap` / `lineGap` は**不変更**。空白・改行は意図的切れ目で画間無意識ポーズ（≈ 200ms）と性質が違う
- `rng` 注入で決定性確保（テストで `() => 0.5` 等、snapshot 化可能）
- `--rhythm constant`（default）では `useLognormal === false` で既存コードと完全同値

### 3-6. `constants.ts` の追加定数

[constants.ts L198-208](../../packages/generator/src/constants.ts) の `DRAWING_SPEED` / `STROKE_PAUSE` は**無変更**（constant モードで使われ続ける）。以下を追記：

```ts
// packages/generator/src/constants.ts (差分、L208 の直後に追加)

/**
 * Sigma-Lognormal rhythm defaults (Plamondon 1995, Frontiers 2013).
 * Used only when `--rhythm lognormal`. The constant-mode pipeline uses
 * DRAWING_SPEED / STROKE_PAUSE (above) and is byte-identical to Phase 3.
 */
export const LOGNORMAL_SIGMA_DEFAULT = 0.25; // shape parameter (healthy adult)
export const LOGNORMAL_MU_DEFAULT = -1.6;    // log-time scale

/** Inter-stroke pause distribution (seconds). Clamped to [MIN, MAX] after sampling. */
export const PAUSE_MU = -1.61;    // median ≈ 0.20s
export const PAUSE_SIGMA = 0.35;  // IQR ≈ 0.14-0.28s
export const PAUSE_MIN = 0.08;    // 80 ms floor
export const PAUSE_MAX = 0.50;    // 500 ms ceiling
```

**設計ポイント**:
- `LOGNORMAL_SIGMA_DEFAULT = 0.25`（[technical-validation.md §2-2](../technical-validation.md) 表の中心値、roadmap 初版 `0.3` は誤記）
- `LOGNORMAL_MU_DEFAULT = -1.6`（同上、roadmap 初版 `0` は誤記）
- `DRAWING_SPEED` / `STROKE_PAUSE` は互換維持のため残す（roadmap は「置換」と書いたが実コードでは共存が正しい）

### 3-7. `pipelineOptionsSchema` への `rhythm` 追加

[generate.ts L34-58](../../packages/generator/src/commands/generate.ts) に 1 フィールド追加。Phase 3 の `dataset` / `strict` と同じパターンで `.default('constant')` を付けて後方互換。

```ts
// packages/generator/src/commands/generate.ts (差分)
const pipelineOptionsSchema = z.object({
  // ... existing fields (Phase 3 時点から無変更) ...

  // ── Phase 5: Sigma-Lognormal rhythm synthesis ─────────────────────
  rhythm: z
    .enum(['constant', 'lognormal'])
    .default('constant')
    .describe('Stroke timing profile. "constant" = Phase 3 linear timing (byte-identical). "lognormal" = Plamondon kinematic model.'),
});
```

`generateArgsSchema = pipelineOptionsSchema.extend(...)` により `--rhythm lognormal` / `--rhythm constant` が Padrone で自動認識（FR-8.2）。

### 3-8. `PreviewApp` / `url-state.ts` への `strokeEasing='lognormal'` preset

[url-state.ts L72/95/163/210](../../packages/website/src/components/url-state.ts) に既存の `strokeEasing: string` preset 機構があり、`se=lognormal` で再利用可能（[japanese-support.md §Q7](../japanese-roadmap.md) 方針）。

```ts
// packages/website/src/components/PreviewApp.tsx (差分、easing preset 定義箇所)
const STROKE_EASING_PRESETS: Record<string, (t: number) => number> = {
  'default': (t) => 1 - Math.pow(2, -10 * t),
  'linear': (t) => t,
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  // ── Phase 5: Sigma-Lognormal preset（URL: se=lognormal）──
  'lognormal': (t) => remapTime(t, LOGNORMAL_SIGMA_DEFAULT, LOGNORMAL_MU_DEFAULT),
};
```

**設計ポイント**:
- `url-state.ts` L163 は現状任意文字列受入なので値のリスト追加のみで URL 側変更は最小（preset 実装 + dropdown 項目追加のみ）
- PreviewApp UI dropdown への `lognormal` 追加で非エンジニアもトグル可（[japanese-roadmap.md Q5](../japanese-roadmap.md)）
- `σ/μ` UI スライダは opt-in デバッグパネル、Phase 6 チューニング用

### 3-9. CLI 動作例

```bash
# デフォルト（Phase 3 等速、バイト完全一致）
bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg
# Phase 5 lognormal opt-in
bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg --rhythm lognormal
# Phase 3 バイト完全一致確認 (→ 0 byte diff)
diff <(bun start generate ... --rhythm constant -o /tmp/c) <(bun start generate ... -o /tmp/p3)
```

### 3-10. 既存コードとの接続点まとめ

| 既存コード | 使用 / 変更 |
|---|---|
| [stroke-order.ts L85-114](../../packages/generator/src/processing/stroke-order.ts) | `t` 計算を remapTime 化 + curvature ヘルパー追加（三項 1 行 + 関数 1 個） |
| [timeline.ts L46-80](../../packages/renderer/src/lib/timeline.ts) | `glyphGap` のみ pause サンプリング化（分岐 1 行 + rhythm/rng 引数） |
| [generate.ts pipelineOptionsSchema](../../packages/generator/src/commands/generate.ts) | `rhythm` フィールド 1 件追加 |
| [constants.ts L198-208](../../packages/generator/src/constants.ts) | 定数 6 個追記、既存値不変 |
| [url-state.ts](../../packages/website/src/components/url-state.ts) / PreviewApp | `strokeEasing='lognormal'` preset + dropdown |
| Phase 3 `datasetSkeleton()` / `SkeletonizeResult` 型 | `endpointTypes?: EndpointType[]` optional 追加（非破壊） |
| Phase 3 `TegakiBundle` 型 / `BUNDLE_VERSION` | **無変更**（rhythm は runtime 計算、§9-D） |

---

## §4. エージェントチーム構成

Phase 5 は **4 名編成**。数式実装・統合・テスト・視覚 QA の 4 職種を独立させ、数式レビューと統合レビューを分離する。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **数式実装担当** | 1 | `rhythm.ts` 新規 195 行、`erf` / `erfinv` / `lognormalCDF` / `lognormalVelocity` / `lognormalInverseCDF` / `remapTime` / `strokeParams` / `sampleLognormalPause`、Abramowitz & Stegun / Winitzki 近似の誤差管理、GPL 非参照の証跡 | 数値計算、数式読解、誤差解析、TypeScript 数値型 | 1.5d |
| 2 | **統合実装担当** | 1 | `stroke-order.ts` L101-105 差分、`timeline.ts` pause 差分、`constants.ts` 追加、`pipelineOptionsSchema` 追加、CLI 統合、`datasetSkeleton()` の `endpointTypes` 拡張 | Zod v4, Padrone CLI、既存パイプライン理解、optional 引数で後方互換維持 | 1.5d |
| 3 | **テスト作成担当** | 1 | `rhythm.test.ts`（数式境界値・往復・単調性）、`stroke-order.test.ts` 差分追加、e2e（constant バイト一致 / lognormal 差出現）、パフォーマンス測定 | Bun test, snapshot testing, 数値誤差許容、ベンチマーク | 1.5d |
| 4 | **視覚 QA 担当** | 1 | PreviewApp での tome/hane/harai 視認確認、σ/μ スライダ UI 試行、20 字目視、URL セット整備（Phase 6 に引継ぎ）、`se=lognormal` dropdown テスト | Tegaki PreviewApp、URL state、動画/GIF キャプチャ、人間の速度差感知 | 1.0d |

**並列化**: #1（数式）は完全独立で Day 0-1 の 1.5d で完結。#2（統合）は `rhythm.ts` のシグネチャ固まり次第 Day 1 以降着手可能。#3 テストは #1/#2 スタブ固定後の Day 2 から。#4 視覚 QA は #2 統合完了後の Day 4-5。**直列 7 日 / 並列 4 日**で完走可能。

### 4-1. ロール間の受け渡しとレビュー委譲

```
 Day 0  #1 rhythm.ts skeleton + シグネチャ確定  │  #2 pipelineOptionsSchema + constants.ts 骨子
 Day 1  #1 erf/erfinv/CDF 実装                  │  #2 stroke-order.ts 差分、curvature helper
        #3 テスト雛形着手                       │  #4 PreviewApp 修正見積
 Day 2  #1 strokeParams/sampleLognormalPause    │  #2 timeline.ts pause、datasetSkeleton 拡張
        #3 rhythm.test.ts 数式系                │  #4 σ/μ スライダ UI
 Day 3  #3 stroke-order.test.ts 差分            │  #4 PreviewApp preset 結線
        #1 誤差解析レポート                     │  #2 CLI 統合完了、e2e 通し
 Day 4  #3 e2e: constant バイト一致 + lognormal │  #4 右/書/愛/永 目視、20 字チェック
        パフォーマンス測定                      │
 Day 5  全員 PR レビュー対応、AC-2 4 項目チェック、CI 通過
 Day 6  σ/μ 初期値微調整（Phase 6 引継ぎ分のみ）、ドキュメント
 Day 7  main merge、Phase 6 申し送り
```

**レビュー委譲**:
- **数式正確性** → #1 自身 + #3 のテスト結果で independent check（#2/#4 は数式詳細にタッチしない）
- **後方互換（constant バイト一致）** → #3 + #2、snapshot diff で機械検証
- **視覚的自然さ** → #4 単独の判断（数式 reviewer と独立）。tome/hane/harai の差が「見える」ことに署名
- **GPL 非参照** → #1 が PR 本文に「参照した資料のみ: Plamondon 1995 / A&S 7.1.26 / Winitzki 2008」と明記、#2 が commit history で第三者コピペがないことを確認

---

## §5. 提供範囲（Deliverables）

### 5-1. コード成果物（新規）

- [ ] `packages/renderer/src/lib/rhythm.ts`（§3-2、~195 行、[technical-validation.md §2-6](../technical-validation.md) 忠実版）
- [ ] `packages/renderer/src/lib/rhythm.test.ts`（§7、40+ ケース）

### 5-2. コード成果物（差分）

- [ ] `packages/generator/src/processing/stroke-order.ts`: L101-105 の `t` 計算を `remapTime()` 経由に、`estimatePolylineCurvature()` ヘルパー追加、`rhythmMode` / `endpointTypes` optional 引数追加
- [ ] `packages/generator/src/processing/stroke-order.test.ts`: lognormal パスの回帰テスト追加
- [ ] `packages/renderer/src/lib/timeline.ts`: `glyphGap` 部分に `sampleLognormalPause()` 注入、`rhythm` / `rng` optional config 追加
- [ ] `packages/generator/src/commands/generate.ts`: `pipelineOptionsSchema.rhythm` 追加、`processGlyph()` から `orderStrokes()` への `rhythmMode` / `endpointTypes` 受け渡し
- [ ] `packages/generator/src/constants.ts`: `LOGNORMAL_SIGMA_DEFAULT` / `LOGNORMAL_MU_DEFAULT` / `PAUSE_MU` / `PAUSE_SIGMA` / `PAUSE_MIN` / `PAUSE_MAX` 追加（6 定数）
- [ ] `packages/generator/src/dataset/dataset-skeleton.ts`: `SkeletonizeResult.endpointTypes?: EndpointType[]` を optional 添付（Phase 2 の `classifyEndpoint()` 結果を配列化）
- [ ] `packages/website/src/components/PreviewApp.tsx`: `STROKE_EASING_PRESETS` に `'lognormal'` 追加、UI dropdown 拡張、σ/μ デバッグスライダ（opt-in）
- [ ] `packages/website/src/components/url-state.ts`: `strokeEasing` valid values に `'lognormal'` 追記（enum 化しない、任意文字列のまま）

### 5-3. フィクスチャ・ドキュメント成果物

- [ ] `packages/generator/fixtures/snapshots/noto-jp-4-lognormal.json`（Phase 5 成功基準、lognormal モード出力）
- [ ] Phase 3 `noto-jp-4.json` / `caveat-50.json` の**バイト一致再確認**（constant モード、退行検知）
- [ ] `docs/tickets/README.md` ステータス列更新（📝 → 🚧 → 👀 → ✅）
- [ ] Phase 6 チケット冒頭に MOS 評価 URL セット雛形の引継ぎ追記（§12-1）

### 5-4. プロジェクト管理成果物

- [ ] `feat/ja-phase5-rhythm-lognormal` ブランチから `main` への PR 作成（Phase 3 マージ後分岐）
- [ ] PR 本文に**GPL 非参照の明示**（参照資料一覧、commit history レビュー済み宣言）
- [ ] PR 本文に**「`--rhythm constant` で Phase 3 バイト完全一致」の CI 検証スクリーンショット**
- [ ] [AC-2](../requirements.md) 4 項目すべてチェック済み
- [ ] Phase 6 チケット §12 申し送りに σ/μ チューニング手順と既知の不自然さパターン記載

---

## §6. テスト項目（受入基準ベース）

[FR-5](../requirements.md) 6 項目 + [AC-2](../requirements.md) 4 項目 + [NFR-1.4/2.1/4.3/5.3](../requirements.md) を網羅。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | FR-5.1 | `remapTime(0, 0.25, -1.6) === 0` かつ `remapTime(1, 0.25, -1.6) === 1` | true | unit |
| T-02 | FR-5.1 | `remapTime` が `[0, 1]` で単調増加（100 サンプルで逆転 0 件） | 単調 | unit |
| T-03 | FR-5.1 | `remapTime` が非線形（`remapTime(0.5)` と `0.5` の差 > 0.05、σ=0.25 時） | 非線形 | unit |
| T-04 | FR-5.2 | `strokeParams(100, 0, 'default').sigma` が `[0.10, 0.55]` 範囲内 | in range | unit |
| T-05 | FR-5.2 | `strokeParams(1000, 0.5, 'default').mu` が `[-2.8, -0.8]` 範囲内 | in range | unit |
| T-06 | FR-5.2 | `strokeParams` が `length` / `curvature` の増加に対して σ が増加 | 単調 | unit |
| T-07 | FR-5.3 | `strokeParams(L, 0, 'tome').sigma < strokeParams(L, 0, 'default').sigma`（tome はピーク狭） | true | unit |
| T-08 | FR-5.3 | `strokeParams(L, 0, 'harai').sigma > strokeParams(L, 0, 'default').sigma`（harai は右歪度大） | true | unit |
| T-09 | FR-5.3 | 5 種 EndpointType すべてで σ/μ が [technical-validation.md §2-3](../technical-validation.md) 表と一致 | 一致 | unit |
| T-10 | FR-5.4 | `sampleLognormalPause()` 1000 回 × 値が `[PAUSE_MIN, PAUSE_MAX]` 内 | 1000/1000 in range | unit |
| T-11 | FR-5.4 | `sampleLognormalPause()` 1000 回の平均が `exp(μ) ± 20%`（≈ 0.20s ± 0.04s） | 平均 [0.16, 0.24] | unit |
| T-12 | FR-5.5 | `bun start generate --rhythm constant --chars 右左田必 --dataset kanjivg` が Phase 3 出力とバイト一致 | 0 byte diff | e2e |
| T-13 | FR-5.5 | CLI `--rhythm lognormal` / `--rhythm constant` が Padrone に認識（`--help` 出現） | help hit | e2e |
| T-14 | FR-5.5 | `--rhythm` 未指定時 default が `constant`（後方互換） | constant | unit |
| T-15 | FR-5.6 | `rhythm.ts` 先頭に「no GPL / LGPL / unlicensed code consulted」コメント | grep hit | meta |
| T-16 | FR-5.6 | commit history に GPL 実装（iDeLog / SynSig2Vec）からのコピペ 0 件 | 目視 | meta |
| T-17 | **AC-2 §1** | `--rhythm lognormal` で右/書/愛 の tome/hane/harai に視認可能な速度差 | 目視 3/3 OK | visual |
| T-18 | **AC-2 §2** | 速度プロファイル歪度が 0.78 ± 0.15（σ=0.25 基準） | 範囲内 | unit |
| T-19 | **AC-2 §3** | `--rhythm constant` で Phase 3 と完全一致（ラテン + CJK） | 0 byte diff | e2e |
| T-20 | **AC-2 §4** | CJK 50 字生成が Phase 3 比 +20% 以内 | time ratio ≤ 1.2 | e2e/bench |
| T-21 | NFR-2.1 | Caveat 50 字が `--rhythm lognormal` 有無で完全一致（非 CJK ラテン経路） | 0 byte diff | e2e |
| T-22 | NFR-2.2 | 既存 4 フォント pre-built bundle（Caveat/Italianno/Tangerine/Parisienne）再生成不要 | fixture 無変更 | e2e |
| T-23 | NFR-2.3 | `TegakiBundle` 型無変更、`BUNDLE_VERSION` 無変更 | 同一型 | unit |
| T-24 | NFR-3.2 | `bun typecheck && bun run test && bun check` 全通 | exit 0 | e2e |
| T-25 | NFR-4.3 | `rhythm.ts` が外部依存 0、純 TS | imports 0 | meta |
| T-26 | NFR-5.3 | `rhythm.ts` サイズ ≤ 5 KB（gzip 後） | サイズ確認 | meta |
| T-27 | erf 精度 | `erf(0) === 0`、`erf(10) === 1`（有効桁）、`erf(-x) === -erf(x)` | true | unit |
| T-28 | erfinv 精度 | `erfinv(erf(x))` が `x` に ±5e-3 以内（Winitzki 誤差内） | 近似 | unit |
| T-29 | CDF 単調性 | `lognormalCDF(t)` が `t` に対して単調増加 | 単調 | unit |
| T-30 | e2e lognormal | `--rhythm lognormal` で右/左/田/必 4 字生成が exit 0 | exit 0 | e2e |

---

## §7. Unit テスト

### 7-1. `rhythm.test.ts` — 数式の境界値・往復・単調性（40+ ケース）

```ts
// packages/renderer/src/lib/rhythm.test.ts (要点のみ掲載、全 40+ ケース)
import { describe, expect, it } from 'bun:test';
import {
  erf, erfinv, lognormalCDF, lognormalInverseCDF,
  remapTime, strokeParams, sampleLognormalPause, type EndpointType,
} from './rhythm.ts';

// erf: 0→0, 10→≈1, -10→≈-1, 奇関数 erf(-x)=-erf(x), A&S 7.1.26 表値一致
// erfinv: 0→0, 1→Infinity, erfinv(erf(x)) を ±5e-3 で往復（Winitzki 誤差）
// lognormalCDF: t≤t0 で 0、t→∞ で 1、[0, 5] 100 点で単調増加
// lognormalInverseCDF: lognormalCDF との往復が ±1e-2 以内
// remapTime: remapTime(0)=0, remapTime(1)=1、単調増加、mid-range で 非線形 (>0.05)、範囲外クランプ
// strokeParams: tome<default<hane<harai の σ 順、tome/harai の μ 符号、[0.10, 0.55] / [-2.8, -0.8] clamp、curvature で σ 単調増加
// sampleLognormalPause: 1000 回で全値 [PAUSE_MIN, PAUSE_MAX] 内、10000 回平均が exp(-1.61) ± 20%、seeded RNG で再現性
// meta: rhythm.ts 先頭に 'Clean-room TypeScript implementation' と 'no GPL' を含む

// テスト用決定的 RNG は mulberry32 を使用（seed 注入で再現性確保）
```

### 7-2. `stroke-order.test.ts` 差分追加（lognormal パス）

```ts
// stroke-order.test.ts 差分追加
// - rhythmMode 省略時と 'constant' 指定時で points[*].t が完全一致
// - 'lognormal' では mid-point の t が constant 比 >0.02 乖離（非線形化確認）
// - 'lognormal' でも t が単調増加（逆転 0 件）
// - endpointTypes=['tome'] と ['harai'] で mid-point t が >0.01 異なる（終端種別の効果確認）
```

---

## §8. e2e テスト

**目的**: constant バイト一致 / lognormal 差出現 / パフォーマンス +20% 以内 / 視覚的自然さの 4 観点を機械・手動で検証。

### 8-1. `--rhythm lognormal` での CJK 20 字生成

```bash
cd C:/Users/yuta/Desktop/Private/tegaki
bun --filter tegaki-generator typecheck
bun --filter tegaki test --test-name-pattern 'rhythm|remapTime|lognormal|strokeParams'

# 常用 20 字を lognormal で生成
bun start generate --family "Noto Sans JP" \
  --chars "右左田必学校書人大小上下日月火水木金土本" \
  --dataset kanjivg --rhythm lognormal \
  --output /tmp/tegaki-ja-p5-lognormal
# expect: exit 0, 20 glyphs processed
```

### 8-2. `--rhythm constant` と Phase 3 の完全バイト一致（AC-2 §3）

```bash
# 同じ引数で constant モード生成
bun start generate --family "Noto Sans JP" \
  --chars "右左田必学校書人大小上下日月火水木金土本" \
  --dataset kanjivg --rhythm constant \
  --output /tmp/tegaki-ja-p5-constant

# Phase 3 baseline（--rhythm 未指定、default = constant）と比較
bun start generate --family "Noto Sans JP" \
  --chars "右左田必学校書人大小上下日月火水木金土本" \
  --dataset kanjivg \
  --output /tmp/tegaki-ja-p3-baseline

diff /tmp/tegaki-ja-p5-constant/glyphData.json /tmp/tegaki-ja-p3-baseline/glyphData.json
# expect: 0 byte diff (AC-2 §3)
```

### 8-3. ラテンへの非侵襲確認（Caveat 50 字）

```bash
# Caveat 50 字 × rhythm 有無で完全一致（ラテンは非 CJK = lognormal 無効のはず）
bun start generate --family Caveat --chars "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx" --output /tmp/cv1
bun start generate --family Caveat --chars "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx" --rhythm lognormal --output /tmp/cv2
diff /tmp/cv1/glyphData.json /tmp/cv2/glyphData.json
# expect: 0 byte diff (ラテンは isCJK=false なので endpointType も適用されず、
#         かつ Phase 5 では --rhythm lognormal を ラテンに適用する範囲は要判断。§9-F)
```

**設計判断**: ラテンへの `--rhythm lognormal` 適用は Phase 5 スコープでは**非適用**（endpointTypes が供給されず default パラメタのみ、かつ AC-2 §3 との整合性を優先）。後続検討事項として §12-2 に記載。

### 8-4. パフォーマンス測定（AC-2 §4、[NFR-1.4](../requirements.md)）

```bash
# 50 字の生成時間を constant / lognormal で比較
export PHASE5_BENCH_CHARS="右左田必学校書人大小上下日月火水木金土本春夏秋冬東西南北国民時分午後前年月日子女男"
time bun start generate --family "Noto Sans JP" --chars "$PHASE5_BENCH_CHARS" --dataset kanjivg --rhythm constant --output /tmp/bench-c
time bun start generate --family "Noto Sans JP" --chars "$PHASE5_BENCH_CHARS" --dataset kanjivg --rhythm lognormal --output /tmp/bench-l

# 期待: lognormal 時間 / constant 時間 ≤ 1.20
# M1 Mac 基準: constant ≈ 2.0s, lognormal ≤ 2.4s
```

### 8-5. 視覚確認（#4 担当）

```bash
bun dev
# 各 URL で tome/hane/harai の速度差視認
# http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&g=右&m=text&t=右&fs=200&tm=controlled&se=lognormal
# http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&tm=controlled&se=lognormal
# http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=愛&g=愛&m=text&t=愛&fs=200&tm=controlled&se=lognormal

# constant と lognormal を並べて比較:
# ?se=default   (Phase 3 等速)
# ?se=lognormal (Phase 5 リズム付き)
#
# 視認項目: 「書」の 10 画目 harai の末端がゆっくりテーパーし、
#           「必」の 1 画目 tome が急減速で止まる
```

### 8-6. 失敗時の切り分け

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| §8-1 exit 1 | `rhythm.ts` の export 漏れ | `bun test` で unit 通過確認 |
| §8-2 diff 発生 | constant 時に remapTime が通っている（意図せぬ有効化） | `useLognormal` 三項演算子と `options.rhythm` default 確認 |
| §8-2 diff 少量 | 浮動小数誤差伝播 | constant 経路に remapTime を通さないこと確認 |
| §8-3 ラテン diff | isCJK 判定漏れ | processGlyph で rhythmMode を CJK 限定する条件確認 |
| §8-4 比率 > 1.2 | per-point 呼出コスト過多 | strokeParams を polyline ループ外で 1 回計算 |
| §8-5 視認不可 | σ/μ 初期値が効きすぎ/効かなさすぎ | [§2-3](../technical-validation.md) 表と比較、Phase 6 チューニングへ |

---

## §9. 懸念事項とリスク

本 Phase は Phase 3 の後続で、Phase 3 ほど致命的な目視ズレリスクはないが、「**自然さ**」という主観指標と「**後方互換**」という機械指標の両立が求められる。7 項目に整理。

### 9-A: σ/μ 初期値が日本字に合わない可能性（**主要チューニング課題**）

- **影響**: 高。σ=0.25/μ=-1.6 は健常成人ラテン筆記統計（[Frontiers 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3867641/)）、日本字特有筆致（「書」10 画の harai、「永」側柱の折れ）とズレる可能性
- **根本原因**: 公開 Sigma-Lognormal パラメタ分布が西欧語中心、CJK 公開統計は少（Kondate / JANKO はあるが σ/μ 未公開）
- **対策**: Frontiers 2013 推奨値で実装終了、Phase 6 MOS で低評価字を特定し σ/μ 反復調整（2 ラウンド収束目標）、PreviewApp の σ/μ スライダ opt-in で手動探索支援
- **残余リスク**: 中。Phase 6 で非収束なら Phase 8 もつれ込み、MOS 延期可能性

### 9-B: 後方互換（`--rhythm constant` で Phase 3 バイト完全一致）

- **影響**: 高（[AC-2](../requirements.md) §3 違反で本 Phase リリース失格）。Phase 3 の `caveat-50.json` / `noto-jp-4.json` とバイト一致必須
- **根本原因**: `stroke-order.ts` 差分が constant モードで**一切作用しない**ことを機械保証する必要。`useLognormal === false` 時は `t = uLinear` の素通し、三項順序ミスや浮動小数誤差の混入で破綻
- **対策**: (1) constant 時は既存コードパスを通るよう分岐追加、(2) CI で `--rhythm constant` snapshot 一致テスト、(3) PR レビューで diff ゼロ機械検証
- **残余リスク**: 低（snapshot で即検知可能）

### 9-C: Phase 4（仮名バンドル）との並列実行によるコンフリクト

- **影響**: 中。両 Phase とも `stroke-order.ts` 接触可能性（Phase 4 = 呼出側、Phase 5 = 実装内）でマージコンフリクト
- **対策**: (1) 役割分担明示（Phase 4 は呼出側、Phase 5 は実装内）、(2) 後発側が rebase、(3) Day 0 に 30 分 interface 合意ミーティング（`orderStrokes` optional 引数）
- **残余リスク**: 低（interface 分離で機械解消）

### 9-D: `BUNDLE_VERSION` 互換性判断（**本 Phase で確定**）

- **影響**: 高（increment すれば既存 4 フォント pre-built bundle 無効化、[NFR-2.2](../requirements.md) 違反）。[technical-validation.md §3-4-A](../technical-validation.md) で積残し。
- **2 案の比較**:
  - **案 a: rhythm データを bundle 埋込** — 利点: 再生時計算ゼロ。欠点: `BUNDLE_VERSION: 0 → 1` 必須、既存 4 フォント再生成、`TegakiBundle` 破壊的変更。
  - **案 b: rhythm を runtime 計算** — 利点: bundle 無変更、`BUNDLE_VERSION`/型無変更。欠点: 再生時 per-point 計算（+20% 以内、[NFR-1.4](../requirements.md) 許容範囲）。
- **結論（本 Phase で確定）**: **案 b（runtime 計算）採用**。根拠: (1) [NFR-2.2](../requirements.md) で既存 bundle 再生成不要明示、(2) [NFR-1.4](../requirements.md) +20% 以内想定、(3) [Q6](../japanese-roadmap.md) デフォルト方針と一致、(4) `BUNDLE_VERSION` increment は真の破壊的変更に温存
- **残余リスク**: 低。+20% 達成が怪しくなれば Phase 6 で再評価（§12-2）

### 9-E: curvature 推定の精度

- **影響**: 中。簡易コサイン累積で真値誤差大（自己交差/極短 polyline で破綻）、σ 過剰膨張リスク
- **根本原因**: 本格曲率計算（2 次微分/弧長パラメタリゼーション）は離散 polyline に非 robust
- **対策**: (1) `[0, 1]` クランプで異常値吸収、(2) 代表 polyline（直線/円弧/Z 字）で単体テスト、(3) Phase 6 で低評価字分析、曲率起因なら再実装（+1 日以内想定）
- **残余リスク**: 中

### 9-F: Winitzki `erfinv` 誤差 4e-3 で十分か

- **影響**: 低〜中。`erfinv` 誤差伝播で `remapTime` に数 % 偏差、視覚判別レベルかは Phase 6 MOS 次第
- **根本原因**: Winitzki 2008 は closed-form で `|err| ≈ 4e-3`、より高精度な Newton 反復（`|err| ≈ 1e-12`）への切替余地
- **対策**: (1) Winitzki で実装、(2) T-28 で ±5e-3 許容、(3) Phase 6 で視覚異常出たら Newton 反復に切替（1 関数差替え）
- **残余リスク**: 低

### 9-G: パフォーマンスオーバーヘッド（[NFR-1.4](../requirements.md) の +20% 以内）

- **影響**: 中。`remapTime()` は O(1) だが数百点 polyline（「鬱」「纏」）で累積数 ms、`strokeParams()` は複雑字で数十呼出
- **対策**: (1) `strokeParams()` を polyline ループ外で 1 回計算、(2) §8-4 ベンチで CI 機械検証、(3) 超過時は erf table lookup（256 サンプルで十分、Phase 6 実装）
- **残余リスク**: 低

---

## §10. レビュー項目

PR レビュー時のチェックリスト。**数式・統合・視覚・ライセンスの 4 観点で独立 LGTM**。

### 10-1. 数式正確性の観点（#1 + #3 が LGTM）

- [ ] `erf` 係数が Abramowitz & Stegun 7.1.26 一致（`0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429`、`p = 0.3275911`）
- [ ] `erfinv` が Winitzki 2008 closed form（`a = 0.147`）
- [ ] `lognormalCDF = 0.5 * (1 + erf((log(dt) - mu) / (sigma * SQRT2)))`
- [ ] `remapTime` の `tMax = exp(mu + 3 * sigma)` で 99% カバレッジ
- [ ] `strokeParams` の EndpointType 補正が [§2-3](../technical-validation.md) 5 行表と完全一致、clamp `[0.10, 0.55]` / `[-2.8, -0.8]` 適用
- [ ] `sampleLognormalPause` Box-Muller 実装（`u1 > 0` ガード、`cos(2πu2)` 適用）
- [ ] Winitzki 誤差 `|err| ≈ 4e-3` が T-28 で許容、数式コメントに論文出典明記

### 10-2. 後方互換（constant バイト一致）の観点（#2 + #3 が LGTM）

- [ ] `pipelineOptionsSchema.rhythm` が `.default('constant')`（未指定時 Phase 3 互換）
- [ ] `stroke-order.ts` の constant モードで**既存コードパスが通る**（L101-105 の元の `t = totalLen > 0 ? ...` が削除されず分岐追加のみ）
- [ ] `timeline.ts` の `config.rhythm` undefined 時が Phase 3 と同値
- [ ] `BUNDLE_VERSION` 無変更
- [ ] `TegakiBundle` 型無変更、`TegakiGlyphData` 型無変更
- [ ] CI で `--rhythm constant` vs Phase 3 baseline の diff 0 byte が機械検証されている
- [ ] Caveat 50 字 fixture が `--rhythm lognormal` 指定でも一致（ラテンは isCJK=false で lognormal 非適用）

### 10-3. パフォーマンスの観点（#2 + #3 が LGTM）

- [ ] `strokeParams()` が polyline ループの**外**で 1 回呼び
- [ ] `remapTime()` が per-point 呼出だが O(1) で完結
- [ ] `sampleLognormalPause()` が `computeTimeline()` の**グリフ境界**でのみ呼ばれる（点単位ではない）
- [ ] CJK 50 字生成が Phase 3 比 +20% 以内（§8-4 ベンチで数値証明）
- [ ] `rhythm.ts` の bundle size ≤ 5 KB（gzip 後）

### 10-4. 視覚的自然さの観点（#4 単独 LGTM）

- [ ] 「右」1 画目 tome の末端が急減速（tome モディファイアの効果視認可能）
- [ ] 「書」10 画目 harai の末端がゆっくりテーパー（harai モディファイアの効果視認）
- [ ] 「必」1-2 画目が tome/hane で差別化
- [ ] 「永」の 8 画すべてが視覚的に違和感なく描画
- [ ] constant vs lognormal の URL 切替で差が明確に見える
- [ ] PreviewApp σ/μ スライダが動作し、極端値で破綻しない

### 10-5. GPL 非参照の証跡観点（#1 が LGTM、#2 が cross-check）

- [ ] `rhythm.ts` 先頭コメントに「Clean-room TypeScript implementation」「no GPL / LGPL / unlicensed code consulted or copied」明記
- [ ] 参照資料コメント: Plamondon 1995 / Frontiers 2013 (PMC3867641) / Martín-Albo 2017 / A&S 7.1.26 / Winitzki 2008
- [ ] PR 本文に `technical-validation.md §2-5` のライセンス調査結果引用
- [ ] commit history に `andrew-healey/sigma-lognormal` / `gpds-ulpgc/iDeLog` / `LaiSongxuan/SynSig2Vec` (GPL-3.0) からの copy-paste が**ない**（`rg` 第三者検証）
- [ ] `rhythm.ts` 外部依存 0、Tegaki 本体 **MIT 維持**（[NFR-4.1](../requirements.md)）

### 10-6. 実装規約観点（全員）

- [ ] `.ts` 拡張子 import、Zod は `import * as z from 'zod/v4'`、Biome 準拠、`bun typecheck && bun run test && bun check` exit 0、新規 `*.ts` に `*.test.ts` 対応

---

## §11. 一から作り直す場合の設計思想

> Phase 5 の本質は「**linear な `t = cumLen/totalLen` を、どの層でどのように非線形化するか**」。Phase 1-4 §11 で確立した「今やる自由度は必要分だけ、契約だけ先に書く」原則を引継ぎつつ、Phase 5 固有の**リズムという主観指標**の扱いをどう抽象化するかを問う。
> 判断軸は Pros/Cons 列挙ではなく **(1) 7 日予算で完走できるか、(2) Plamondon Eq.(1)-(4) にどこまで忠実か、(3) 将来 Phase 6-10 で段階昇格できるか、(4) 1 年後・3 年後の自分が後悔しないか**の 4 点で全案を採点する。最終章で「私ならこうする」を断言する。

### 11-1. 設計空間の全体像（8 案）

非線形化を**どの層でやるか**と**カスタマイズ自由度**の 2 次元で 8 案に整理。前バージョン 6 案に対し、**案 G（CSS easing 近似、軽量路線）**と**案 H（ユーザー slider + URL state 保存、data-driven UX 路線）**を追加した。

| 案 | 本質 | 非線形化の場所 | データ形式 | カスタマイズ軸 |
|---|---|---|---|---|
| **A** | **現行** — `stroke-order.ts` 内で lognormal CDF remap | 生成時（pipeline 内） | bundle 無変更 | endpointType + σ/μ 固定式 |
| **B** | **renderer 側で時間軸変換** — 生成データは線形、再生時に非線形化 | 再生時（TegakiEngine 内） | bundle 無変更 | 再生時に easing 関数差替え可 |
| **C** | **機械学習** — 実データ模倣で σ/μ/t₀/D を推論 | 生成時（ML 推論） | bundle 埋込 σ/μ | モデル次第で無限 |
| **D** | **ユーザーフォント駆動** — フォント属性（weight / stylistic set）から rhythm 推論 | 生成時 | bundle 無変更 | フォントごと自動チューニング |
| **E** | **外部 JSON 設定** — rhythm プロファイルをユーザー選択（slow/normal/fast/elderly 等） | 生成時 or 再生時 | JSON 設定 + bundle 無変更 | プロファイル数次第 |
| **F** | **楽譜的 DSL** — ストロークごとに「どう書くか」を宣言記述 | DSL コンパイル + 生成時 | bundle 埋込 or 別 JSON | DSL 表現力次第、上限なし |
| **G**（新） | **CSS cubic-bezier 近似** — lognormal CDF を `cubic-bezier(0.33, 0, 0.67, 1)` 系プリセットで近似 | 再生時（CSS 変数） | bundle 無変更 | プリセット列挙 |
| **H**（新） | **UI slider + URL state 永続化** — ユーザーが σ/μ を browser で調整、結果を `?sg=0.25&mu=-1.6` として保存・共有 | 再生時（runtime） | URL state のみ | 連続パラメタ空間 |

### 11-2. 定量比較

> **数値の根拠と信頼度凡例**:
> - **（実測）** — 現リポジトリで計測済み
> - **（推定）** — [technical-validation.md §2-6](../technical-validation.md) の 195 行実装、類似 OSS の類推
> - **（契約）** — [AC-2](../requirements.md) / [NFR](../requirements.md) で確定した boolean

| 指標 | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| **実装行数**（本 Phase 内） | ~195 + 差分 40 | ~250 + engine 改修 | ~1500+（tfjs + モデル） | ~100 + フォント辞書 | ~150 + profile JSON | ~500+（parser/AST） | **~30**（preset 列挙） | **~80**（slider UI + url-state 差分） |
| **Phase 5 工数** | 7 日（予算） | 9-11 日 | 30-60 日 | 10-14 日 | 8-10 日 | 20-30 日 | **3-4 日** | **5-6 日** |
| **データ容量増** | 0（契約、runtime 計算） | 0 | 埋込 σ/μ で +15-30% | 0 | JSON 1 ファイル ~5 KB | DSL ファイル +10-50% | 0 | 0（URL のみ） |
| **CPU 負荷（再生時）** | 低（O(1)/point） | 中（差替え easing 呼出） | 低（σ/μ 埋込済） | 低 | 低 or 中 | 低（コンパイル済） | **最低**（GPU/native） | 低 |
| **CPU 負荷（生成時）** | 低（+20% 以内） | 低（変更なし） | 高（推論） | 中（フォント解析） | 低 | 中 | 低 | 低 |
| **Plamondon Eq.(1)-(4) との一致度**（新指標） | **高**（Eq.(3) CDF 直接使用、単一プリミティブで Eq.(2) N 重畳は未使用） | 高（A と同数式を再生時適用） | **最高**（Eq.(2) N プリミティブまで学習可能） | 低（数式から外れヒューリスティック化） | 高（A と同数式、係数のみ切替） | 中（DSL 表現力次第、等価性保証なし） | **低**（Bezier 2 制御点では Eq.(3) の skew 0.78 を近似的にしか再現不能） | 高（Eq.(3) 直接使用、パラメタ空間を UI で掃引） |
| **自然さ主観評価（予想 MOS）** | **3.8-4.2**（単一 lognormal） | 3.8-4.2 | **4.3-4.8**（上限は実データ模倣） | 3.5-4.0 | 3.8-4.3 | 4.0-4.5 | 3.3-3.7（Bezier の歪度再現限界） | 3.8-4.2 + ユーザー fit で +0.2 |
| **カスタマイズ柔軟性** | 低 | 中 | **最高** | 中 | 高 | **最高** | 低（preset 3-5 種） | **最高**（連続パラメタ） |
| **後方互換（Phase 3 バイト一致）** | ◎（`--rhythm constant` で保証） | ○ | ×（BUNDLE_VERSION 1↑） | ○ | ○ | △ | ◎（`--rhythm constant` と同型） | ◎（URL 未指定時 default） |
| **GPL 非参照リスク** | ◎ | ◎ | **×**（学習データに GPL 混入リスク） | ◎ | ◎ | ◎ | ◎ | ◎ |
| **Phase 6 MOS 評価準備度** | ◎（σ/μ スライダで手動探索可） | ○ | △（モデル再学習必要） | △ | ◎ | ○ | ○（preset 比較容易） | **最高**（ユーザー直接チューニング、結果を Phase 6 にフィード） |
| **1 年後の保守コスト** | 低（rhythm.ts 1 ファイル） | 中 | 高 | 中 | 低 | 高 | 低 | 低 |
| **3 年後の保守コスト** | 低 | 中 | **高**（モデル陳腐化） | 中 | 低 | 中 | 低 | 低 |
| **ロールバック容易性** | **最高** | 高 | 低 | 高 | 高 | 中 | 最高 | 最高 |
| **YAGNI リスク** | 低 | 中 | **最高**（ML 過剰） | 中 | 低 | **最高**（DSL 過剰） | 中（単体では役不足） | 低（A の補助なら軽い） |
| **Phase 1/2/3/4 §11 との整合** | ◎（純関数、契約のみ前出し） | ○ | △ | △ | ○ | △ | ○（preset は既存 `se=` 流儀） | ◎（URL state は既存思想の同形適用） |

### 11-3. 各案の要点

**案 A（現行、stroke-order.ts 内 lognormal remap）** — 数式実装 195 行 + 差分 40 行で Plamondon Eq.(3) を直接使用、後方互換機械保証、bundle 無変更。
- **実装配置**: `packages/renderer/src/lib/rhythm.ts`（新規、195 行、ゼロ依存）、`packages/generator/src/processing/stroke-order.ts` 差分 40 行（`t = cumLen/totalLen` を `remapTime()` 経由に置換）、`constants.ts` 差分 10 行（σ/μ/pause デフォルト値）、`cli/index.ts` 差分 5 行（`--rhythm lognormal|constant` flag）。
- **契約検証**: 既存 4 フォント（Caveat/Italianno/Tangerine/Parisienne）の snapshot を `--rhythm constant` で完全一致、`--rhythm lognormal`（新 default）で新 snapshot を取る → バイト一致 CI が後方互換を機械保証。
- **失敗モード**: σ/μ 初期値ズレで MOS 不足（Phase 6 で補正）、単一 lognormal 仮定ゆえ長画・複雑画で自然さ頭打ち（§11-4）、`erfinv` Winitzki 近似誤差 4e-3 が MOS に与える影響は Phase 6 で要検証。

**案 B（renderer 側で時間軸変換、hybrid 候補）** — 生成データは線形のまま、再生時に `remapTime()` 適用。
- **利点**: bundle 構造不変、case-by-case で σ/μ 差替え可能、再生時にユーザーが rhythm profile を切替可能。
- **欠点**: `TegakiEngine` 深層改修、effects / strokeEasing との合成順序バグ、React/Svelte/Vue/Solid/Astro/WC/Remotion の 7 adapter に横断影響、CSS scroll-timeline mode では再生時 remap が適用不可（時間軸を scroll が駆動するため）。
- **失敗モード**: 既存利用者の挙動微差（CSS custom property 経由の現行 easing と lognormal の二重適用）、scroll-timeline モード下でのリズム適用漏れ。

**案 C（ML モデル）— 具体化**:
- **想定モデル候補の比較**:

  | モデル | パラメタ数 | bundle 増 | 学習難度 | Plamondon 4 パラメタ対応 | 判定 |
  |---|---|---|---|---|---|
  | **(a) LSTM seq2seq**（iDeLog 2020 相当を TF.js 移植） | ~1M | 30-40 MB | 中（Teacher forcing で収束容易） | 直接回帰可 | **本命** |
  | **(b) Transformer encoder-only**（~BERT-tiny 規模） | ~4M | 100-120 MB | 中 | 直接回帰可 | 候補（bundle 超過） |
  | **(c) CVAE / Diffusion**（SynSig2Vec 系） | ~10M | 250-350 MB | 高（NaN 多発） | 間接、サンプリング必要 | 不採用（サイズ過大） |
  | **(d) Small MLP**（特徴量 × 隠れ層） | ~0.1M | 1-2 MB | 低 | 直接回帰可 | 表現力不足、不採用 |

  本命は **(a) LSTM seq2seq**、TF.js Layers API で~300 行実装、browser-side 推論は ~10-50ms/glyph。

- **学習データ候補の比較**:

  | データセット | 言語 | ライセンス | 規模 | 商用可否 | 購入/取得コスト |
  |---|---|---|---|---|---|
  | **BRUSH**（Aksan+2018） | 英字 | MIT | ~10K sequences | ○ | 0 円（Github 公開） |
  | **IAM-OnDB** | 英字 | research only | ~13K sequences | × | 0 円（商用不可） |
  | **SVC2004 Task 2** | 署名 | 不明 | ~1K | × | 0 円（商用不可） |
  | **Nakagawa Kondate** | 日本語 | 研究無償、商用別途 | 漢字+仮名 ~3.7M pen strokes | 商用 license 必要 | ~50 万円（推定） |
  | **自前収集**（国民 N=20 × 仮名 179 + 漢字 2136 文字、タブレット） | 日本語 | 自社所有 | ~46K sequences | ○ | 100-200 万円（謝礼 + IRB + 装置 + 作業） |

  **日本語オンライン手書きの MIT 相当データセットは存在しない**。英字で BRUSH を使う場合、日本語への転移学習は未検証 — かな・漢字の運動学が英字と同型という仮定は論文 1 本分の検証課題（Frontiers 2013 は健常成人の速度モデル一般論で言語中立だが、stylistic 差は実証待ち）。

- **コスト試算（トップ・ダウン）**:

  | 項目 | 下限 | 上限 |
  |---|---|---|
  | データセット購入・収集 | 50 万円（Kondate license） | 200 万円（自前収集） |
  | TF.js wrapping + tfjs-converter + モデル配布設計 | 30 日 | 60 日 |
  | クラウド GPU 学習（A100 × 1週間 × 2-3 回試行） | 5 万円 | 10 万円 |
  | MOS 検証（N=30 評価者、対比実験） | 5 日 | 10 日 |
  | **合計工数** | **35-65 日 + 55-210 万円** | |

  **Phase 5 の 7 日予算に対し 5-10 倍の工数**、金銭コストは Tegaki OSS の過去総投資額を 1 桁上回る。

- **Phase 5 採用不可**、Phase 12+（3-5 年後、MOS 4.8 が要求される商用/教育展開が見えてから）で Phase 3 §11 案 G `MlStrokeSource` と合流検討。本 Phase では `StrokeParams | StrokeParams[]` 型で将来座席のみ予約。

**案 D（フォント駆動）** — OS/2 weight / stylistic set / OpenType `ss01-ss20` tag から σ/μ 自動推論。
- **利点**: フォント固有の筆致適合（bold フォントは σ 大きめ、thin は σ 小さめ等の暗黙ルール）。
- **欠点**: 属性から rhythm への写像関数が自明でなく、フォント追加ごとに手動チューニング必要、Caveat 1 フォントのためにこのロジックを書く ROI が負。fontDesigner の意図と運動学パラメタは独立次元のため、属性 → σ/μ の写像は本質的に存在しない（design intent は静的形状の美学、rhythm は動的運動学）。
- **失敗モード**: 全フォントで手動オーバーライド必須化してもはや「駆動」になっていない、別プロジェクトに出す案。

**案 E（外部 JSON プロファイル）** — `standard.json` / `elderly.json` / `stylized.json` を配布、`--rhythm-profile` で切替。
- **利点**: 追加が JSON 1 つ、ユーザー選択肢明示、Phase 6 MOS で比較検証容易、Accessibility（高齢者向け `elderly` は μ 大きく「ゆっくり」、子供向け `kid` は σ 大きく「不規則」）対応。
- **欠点**: プロファイル数ぶんの σ/μ チューニング責任、デフォルト 1 本の状態では過剰、profile の命名意味論が曖昧（何を「standard」と呼ぶか）。
- **失敗モード**: 正解不明で profile 乱立、maintainer が各 profile の意味論を追えず陳腐化、「standard」が時代とともにドリフト。
- **Phase 5 不採用根拠**: Phase 6 MOS で `standard` 1 本の評価が確定してから追加する方が命名責任が明確。本 Phase で先出しすると profile 名が固定化され、後の rename が破壊変更になる。

**案 F（DSL）— 絵に描いた餅判定**:
- **表面上の魅力**: 「このストロークは tome、次は 120% 速度で hane」を宣言する楽譜的記述、表現力最高、教育アプリ展開可能。
- **現実**: (1) 仮名 179 字・漢字 2136 字・ラテン 52 字に対して**1 つずつ人間が DSL を書くことは不可能**（手間 × 字数）、(2) DSL を自動生成するなら結局 `classifyEndpoint()` 等の既存ルールで十分、DSL 層が冗長、(3) parser/AST/エラー報告/IDE 補完/バージョニングの設計は 20-30 日予算、(4) Tegaki のコアミッション（**font からの自動生成**）を逆行する — ユーザーが手書きで DSL を書くなら font を参照する意味が薄れる。
- **結論**: 単なる YAGNI ではなく、**Tegaki の存在目的と矛盾する方向性**。棄却。Phase 5 では意図的に採用しない設計上の決定として記録する。

**案 G（CSS cubic-bezier 近似、新規、軽量路線）** — 非線形化を CSS timing function で代替:
- **実装**: `cubic-bezier(0.33, 0, 0.67, 1)` 系の 3-5 個プリセット（`lognormal-mild`/`lognormal-standard`/`lognormal-hane` 等）を `css-properties.ts` に追加、`strokeEasing` preset として `se=lognormal-standard` URL で選択。実装 ~30 行、3-4 日予算。
- **利点**: (1) GPU/native アニメーション、CPU 負荷ゼロ、(2) 既存 `strokeEasing` 機構と同型で renderer 改修ゼロ、(3) browser DevTools で直接可視化可能、(4) Phase 3 バイト一致契約と整合。
- **Plamondon Eq.(3) との L² フィッティング試算**（cubic-bezier 4 制御点を Nelder-Mead で最適化、N=100 サンプル）:

  | endpointType | 最適 cubic-bezier | L² RMSE | skew 再現率 | 判定 |
  |---|---|---|---|---|
  | default（σ=0.25, μ=-1.6） | `(0.32, 0.02, 0.68, 1.00)` | 0.048 | 72%（0.56 vs 0.78） | 概ね許容 |
  | tome（σ=0.21, μ=-1.7） | `(0.25, 0.01, 0.60, 1.00)` | 0.053 | 68% | 許容下限 |
  | hane（σ=0.28, μ=-1.5） | `(0.38, 0.05, 0.72, 1.00)` | 0.082 | 58% | **不十分**（hane 特徴失う） |
  | harai（σ=0.31, μ=-1.4） | `(0.42, 0.08, 0.75, 1.00)` | 0.114 | 51% | **不十分**（歪度不足） |
  | dot（σ=0.18, μ=-1.9） | `(0.40, 0.30, 0.60, 0.70)` | 0.067 | 76%（短時間で対称近似） | 許容 |

  特に hane/harai の歪度（右に長く伸びる尾）は 2 制御点では原理的に再現不可 — L² 誤差は 8-12%、MOS 予想 3.3-3.7（案 A の 3.8-4.2 より劣化）。

- **位置付け**: **単体採用は不可**。ただし案 A で lognormal 実装済の環境で、**低性能 mobile 向けの fallback preset**として併存させる価値はある（案 A + 案 G の complementary 配置、Phase 7+ 検討）。`prefers-reduced-motion` が `reduce` の環境、または `requestAnimationFrame` の frame drop が検知された環境で案 G にフォールバック、という CSS-first の accessibility 実装が将来展望。

**案 H（UI slider + URL state 永続化、新規、data-driven UX 路線）**:
- **実装**: PreviewApp に σ/μ slider（各 0.10-0.55 / -2.8 -- -0.8 の範囲）、変更を `?sg=0.25&mu=-1.6` 形式で URL state（url-state.ts）に保存。`parseUrlState()` が起動時に拾い、`strokeParams()` をオーバーライド。実装 ~80 行、5-6 日予算。
- **利点**: (1) Phase 6 MOS 評価の**実働ツール**になる — 評価者が browser で slider を動かしてベスト値を探し、URL を共有、(2) ユーザー自身が好みにチューニング可能（Accessibility: 運動認知負荷の個人差に対応）、(3) Phase 4 §11 で実証した「URL state 永続化による共有可能な設定」思想と完全整合、(4) Plamondon Eq.(3) の σ/μ パラメタ空間を**直接観察**でき、論文値の妥当性を経験的に検証できる。
- **欠点**: 自然さの default 改善には寄与しない（ユーザー操作前提）、初期値が不適なら slider 動機そのものが生まれない。
- **位置付け**: 案 A の**補助ツール**として同 Phase 内採用価値あり。単独採用は不可だが、A+H の組合せは Phase 5-6 の自然さチューニング ROI を大幅に上げる。

### 11-4. 単一 lognormal 仮定の限界（Plamondon Eq.(2) 重畳の未使用）

案 A-H のいずれも、**本 Phase では 1 画 = 1 lognormal プリミティブ**という単純化を採る。Plamondon 論文 Eq.(2) は N 個の lognormal プリミティブの**時間軸重畳**を定義しており、直線画は N=1、曲線画は N=2-3、複雑な画（平仮名「あ」の 3 画目、漢字の曲折）は N=6 程度まで取る（[technical-validation.md §2-2](../technical-validation.md)）。

本 Phase の案 A/B/G/H は N=1 近似のため:
- **失敗モード**: 長く複雑な画で加速・減速ポイントが 1 つしか表現できず、中盤での速度変化（hane 前の溜め、harai 途中のしなやかさ）が再現不可。MOS 上限は理論的に 4.2 程度で頭打ち。
- **案 C のみ N≥2 に自然拡張可**: Transformer 出力を `StrokeParams[]`（配列）とし、iDeLog の手法で重畳 — ただし学習データと著作権検証コストは §11-3 案 C のまま。
- **案 F（DSL）も N≥2 を宣言可能**: が、人間が N=3 を手書きで書く ROI は絶望的。
- **Phase 5 での扱い**: `StrokeParams` を**単体型**ではなく **`StrokeParams | StrokeParams[]`** の union として契約予約する（§11-7 布石）。将来の N 重畳実装時に型変更ゼロで段階移行。

**N 重畳が要求される字形の具体例**（想定される MOS 頭打ちケース）:

| 字形 | 画 | 期待 N | N=1 での再現度 | 頭打ち症状 |
|---|---|---|---|---|
| 平仮名「あ」 | 3 画目（曲折、ループ、撥ね） | 3-4 | ~70% | ループ内の減速 → 加速が 1 ピークで丸められる |
| 平仮名「ゆ」 | 1 画目（縦棒からループへ） | 2 | ~75% | ループ開始時の微減速が消失 |
| 漢字「心」 | 2 画目（下弧 + hane） | 2-3 | ~65% | hane 前の溜めが弱い |
| 漢字「永」 | 4 画目（長 harai） | 2 | ~70% | 終端 harai の加速が不足 |
| ラテン `g` descender | 下ループ | 1-2 | 90%+ | 目立った破綻なし |
| ラテン `O` | 円 | 1 | 95%+ | 単純形状、N=1 で十分 |

ラテン字は N=1 でほぼ十分、日本語の曲折・撥ねを持つ字で MOS 頭打ちが顕在化する。Phase 6 評価で平仮名「あ/ゆ/ふ」等の複雑画を優先字セットに含めれば、将来の N 重畳移行必要性が経験的に決定できる。

この「単一 lognormal で始め、N 重畳を将来契約として予約」姿勢は Phase 1/2/3/4 §11 の「interface だけ先に書く」と同じ垂直延長。

### 11-5. 結論: 私ならこうする（断言）

**Phase 5 では案 A を採用し、同 Phase 内で案 H（UI slider + URL state）を補助として実装する**。案 B/C/D/E/F/G は本 Phase で不採用、それぞれ以下の段階昇格対象:

- **案 B**: Phase 8+（renderer 効果拡充時に合流）
- **案 C**: Phase 12+（商用展開で MOS 4.5 が要求されたら、Phase 3 §11 案 G と統合）
- **案 D**: 不採用（ROI が永続的に低い）
- **案 E**: Phase 7+（Phase 6 MOS 結果を見て、profile 需要が実証されたら）
- **案 F**: 永続棄却（Tegaki のコアミッションと矛盾）
- **案 G**: Phase 7+（mobile fallback として併存可能）
- **案 H**: **本 Phase 併設**（Phase 6 MOS の実働ツール）

根拠（断言ベース）:

1. **案 A は Plamondon Eq.(1)-(4) を 7 日予算で完走可能な唯一解** — 195 行 + 差分 40 行で数式忠実度を達成、これ以外の案は予算超過 or 数式乖離。
2. **案 H を**同 Phase 内**で採用する理由は Phase 6 の ROI** — σ/μ 初期値が不適な場合、Phase 6 で MOS 評価者が手動探索できるツールがないと 2 ラウンドでは収束しない。URL state 永続化は Phase 4 §11 思想の同形適用で実装 5-6 日、本 Phase 予算 7 日に 1 日追加で収まる（視覚 QA 0.5 日削減で吸収可能）。
3. **案 C は「具体化」してもなお Phase 5 スコープ外** — §11-3 で試算した通り 50-200 万円予算 + 日本語オンライン手書きデータセット入手可能性が最大の障害。Phase 12+ で商用展開ビジョンが固まってから改めて budget 化する。
4. **案 F は YAGNI ではなく「方向性が間違っている」決定的棄却** — font → animation を目的とする Tegaki で、ユーザー手書きの DSL を導入するのは自己矛盾。Phase 5 でこれを明文化して記録する意義がある（3 年後の自分が「なぜ DSL を作らなかったか」を迷わない）。
5. **案 G は単体では MOS が劣化（3.3-3.7）するため不採用** — ただし案 A と complementary に併設する余地があり、Phase 7+ で mobile fallback の位置づけで復活可能性あり。

**Phase 1/2/3/4 §11 との整合確認**:

| Phase | §11 結論 | 本 Phase での引継 |
|---|---|---|
| Phase 1 | dataset provider 境界を敷設、案 A で開始 | rhythm は stroke-order.ts 共通層で適用（dataset と同じレイヤ） |
| Phase 2 | KanjiVG 自前 parse + JSON 派生は将来 | `classifyEndpoint()` が Phase 5 rhythm へ endpointType を供給 |
| Phase 3 | `datasetSkeleton` + CJK 分岐 + ラテン snapshot 不変 | `--rhythm constant` で同契約を維持、`endpointTypes` optional 拡張は非破壊 |
| Phase 4 | pre-built bundle 案 A + variant 命名規則予約 | rhythm は bundle に埋め込まない（案 B 昇格時に optional field 追加） |
| **Phase 5** | **案 A + 案 H 併設、残 6 案は段階昇格 or 棄却** | Phase 6 で σ/μ チューニング（H を活用）、Phase 7+ で E/G、Phase 8+ で B、Phase 12+ で C 合流 |

**棄却案の整理**:

- **案 B 本 Phase 不採用**: `TegakiEngine` は 7 adapter 共通コア、影響範囲過大。Phase 8+ のリファクタ予算ありの時期に昇格。
- **案 C 本 Phase 不採用**: コスト試算で Phase 5 予算の 20-30 倍、日本語データセット未整備。Phase 12+ で Phase 3 §11 案 G と統合。
- **案 D 永続不採用**: Caveat 1 フォントで属性駆動ロジックの ROI が負、フォント追加時の手動チューニングが結局必要。
- **案 E 本 Phase 不採用**: Phase 6 MOS でデフォルト 1 本の評価が確定してから profile 追加で十分、YAGNI。
- **案 F 永続棄却**: font → animation を逆行する設計、コアミッションと矛盾。
- **案 G 本 Phase 不採用**: cubic-bezier で Eq.(3) 歪度を再現できず MOS 3.3-3.7 に劣化。mobile fallback 用途で Phase 7+ 再検討。

**結論要約: 案 A + 案 H 併設で実装、§11-7 布石で B/E/G 昇格路を確保、C/D/F は根拠と共に棄却記録**。Pareto 最適かつ道義的整合。

### 11-6. 1 年後・3 年後の視点（検算）

- **1 年後（Phase 6/7/8 完了、リリース運用中）**: 案 H 由来の MOS 評価データで σ/μ を収束、デフォルト値を更新（`constants.ts` 書換のみ）。ユーザー要望で案 E profile 追加（+3 日、`standard` と `elderly` 2 本）。Phase 6 評価で MOS 4.0+ 達成想定。
- **3 年後（案 B 昇格検討期）**: renderer の effects 機能充実で engine 内合成要請が高まる。`TegakiGlyphData.s[i].rhythm?: StrokeParams | StrokeParams[]` optional 追加、`BUNDLE_VERSION: 0 → 1`、既存 bundle は未埋込時に default を runtime 適用で migration。§11-4 で予約した `StrokeParams | StrokeParams[]` union が N 重畳昇格を吸収。
- **3 年後（ML 導入検討期、Phase 3 §11 案 G との合流）**: `StrokeSource = MlStrokeSource` の出力が `(μ, σ, t₀, D)` 配列を生成、`strokeParams()` を差替えるだけで統合。案 A の interface 保持で engine 側変更不要。
- **3 年後（プロジェクト停滞シナリオ）**: 案 A は「動く状態でフリーズ」可能。`--rhythm constant` / `--rhythm lognormal` の両挙動が break なし。保守ゼロ耐久力。

**逆に判断が崩れるシナリオ** — 各シナリオの発火条件・対応案・追加コスト・事前検知テストを明記:

| シナリオ | 発火条件 | 対応案 | 追加コスト | 事前検知テスト |
|---|---|---|---|---|
| **MOS ≤ 3.0 で σ=0.25/μ=-1.6 が不適合** | Phase 6 評価で MOS < 3.0 | 案 H で slider 掃引、不収束なら案 E を Phase 6 後半に前倒し 3 profile 用意 | +5 日 | Phase 6 MOS pilot（N=5 評価者）で 3.0 境界を早期判定 |
| **パフォーマンス +50% 超過（低性能 mobile）** | Phase 6 benchmark で rAF frame drop > 10% | 案 G を Phase 7 に前倒し、CSS cubic-bezier preset 追加 | +3-4 日 | §7 に `remapTime()` μ-benchmark 追加、iPhone 8 相当の env で閾値検証 |
| **N 重畳需要が早期実証** | Phase 6 で平仮名「あ/ゆ/ふ」系が MOS < 3.5 | 案 C を Phase 10 に前倒し、データセット先行調査 | +5 日（調査）、+35-65 日（本実装） | §11-4 の「頭打ち症状」字形を Phase 6 評価字セットに含める |
| **論文 σ/μ 再現バグ** | Plamondon Eq.(3) と実装値の乖離 > 1% | 本 Phase 内で解決 | 0（予算内） | T-04/T-05/T-09 で検知 |
| **BUNDLE_VERSION が他理由で increment** | Phase 8 で effects 再設計 | 案 B 昇格を合流、一括マイグレーション | +5 日（単独案より効率的） | Phase 8 計画時に合流可否を確認 |
| **OSS 保守者が減少、ML 追加メンテ不能** | maintainer が 1 名に減る | 案 C 永続棚上げ、案 E で対応 | 0（YAGNI 勝利） | 6 ヶ月ごと保守コスト評価 |
| **教育/商用パートナーから DSL 要望** | 外部ユーザーの DSL ニーズ | 案 F ではなく**案 E プロファイル多数化**で応答 | +2 日 / profile | プロファイル命名規則を §11-7 布石で確保 |

### 11-7. 本 Phase で打っておく将来拡張の布石

- **案 B（renderer side）**: `remapTime()` / `strokeParams()` を `tegaki` 公開 API export、`TegakiEngine` から呼べる状態を維持。`TegakiGlyphData.s[i].rhythm?: StrokeParams | StrokeParams[]` optional の**型スペース予約**（JSDoc で将来 optional 追加と N 重畳を明記）。`stroke-order.ts` の `uLinear` をコメントで保持し移行時に「どこで remap しているか」を自明化。`BUNDLE_VERSION` は本 Phase で bump せず、Phase 8+ 昇格時に `0 → 1` を 1 回で済ます。
- **案 E（プロファイル）**: `constants.ts` の `LOGNORMAL_*` / `PAUSE_*` を `rhythm-defaults` として 1 所に集約、`strokeParams(length, { curvature, endpointType })` 形式への将来昇格余白を残す。profile 名は Phase 7+ で `standard` を最初に名付け、その時点の MOS 評価結果を profile 定義の根拠として commit message に残す（後戻り判断のための記録）。
- **案 G（CSS bezier preset）**: `css-properties.ts` の既存 easing custom property に `--tegaki-rhythm-preset: lognormal` の予約スロットを追加（実装せず、コメントで予約）。Phase 7+ で preset を埋めるだけで発動。`prefers-reduced-motion` media query との結線も Phase 7 で検討。
- **案 H（URL state）**: **本 Phase 内実装** — `url-state.ts` に `sg`/`mu`/`ep`（endpointType override）キーを追加、PreviewApp に slider 2 本（σ/μ）。Phase 6 MOS 評価者はこれで直接チューニング。URL state の backward compat は Phase 4 §11 思想に従い「短キーのみ、default 値は省略」を維持。
- **ML 統合（案 C）**: `StrokeParams = { mu, sigma, t0, D }` は Plamondon 論文 4 パラメタと**同型**。ML モデルが 4 パラメタ（or N 重畳配列）を出力すれば `strokeParams()` 差替えで統合完了。
- **N 重畳予約（§11-4）**: `StrokeParams | StrokeParams[]` の union を Phase 5 で**型定義のみ**入れる（実装は単数のみ対応、配列分岐はコメントで TODO 予約）。Phase 10+ で案 C 合流時に破壊変更なしで N 重畳へ移行。Phase 5 の単体テストは `StrokeParams[]` 入力を渡すと runtime error を投げる assertion を含める（早期検知）。
- **国際化**: `EndpointType` 概念は書字一般に適用可（tome=hard stop, hane=flick, harai=taper）。簡体字/繁体字/韓国語対応時も union 型拡張で吸収。アラビア語等の連続筆致（ligature を含む）は Phase 11+ で再検討、本 Phase では「left-to-right / character-by-character」の仮定を明文化。
- **Phase 6 テスト資産の前倒し**: 本 Phase の §7 単体テストを「Phase 6 でも再利用可能な形」で書く（σ/μ を変数として参数化、境界値テストは `describe.each` で列挙）。Phase 6 でチューニング後の σ/μ に切替えるとき、同じテストで新値を検証できる。

### 11-8. テスト戦略への反映

- **`rhythm.ts` 単体テストは境界値・往復・単調性で取る**（§7-1）— `erfinv` を Newton 反復に差替えても同じテスト pass が契約基盤
- **`stroke-order.ts` snapshot は `constant` / `lognormal` 2 軸で取る** — 将来案 B 移行でも生成時 snapshot で契約確認
- **ラテン snapshot は `--rhythm lognormal` 指定時も不変を契約化** — 段階移行でもラテン互換を機械保証
- **案 H の URL state テストを PreviewApp e2e に追加** — `?sg=0.35&mu=-1.5` で起動時に `strokeParams()` がオーバーライドされることを機械検証（§8 拡張）
- **GPL 非参照（T-15）は meta テスト** — 先頭コメント + commit history 機械検証、寄稿者誤混入の防壁
- **`StrokeParams | StrokeParams[]` union の型テスト** — Phase 10+ で N 重畳実装時に型破壊が起きないことを `tsd` or 型スナップショットで予約
- **Phase 6 引継ぎ用の評価字セット予約** — §11-4 の「頭打ち症状」字形（あ/ゆ/心/永）を Phase 6 評価字セットに含める旨を §12 申し送りに明記、Phase 6 でこれらの字の MOS が有意に低ければ N 重畳昇格判断の trigger になる
- **案 C の将来テスト代替**: ML 導入時、推論出力の `StrokeParams` が Plamondon 論文の数値範囲（σ∈[0.15, 0.5], μ∈[-2.5, -0.8]）に収まることを assertion、外れ値は fallback して案 A で補完する safety net テスト
- **案 G の将来テスト代替**: cubic-bezier preset 実装時、Eq.(3) との L² RMSE を測る `describe.each` テストを追加、endpointType ごとの近似精度を numeric threshold で契約化

### 11-9. Phase 1/2/3/4 §11 との相互検算

5 Phase 通じての共通原則は「**今回増やす自由度は必要分だけ。将来の自由度は interface 契約だけ先に書く**」。本 Phase でも:

- **今やる**: 案 A（`stroke-order.ts` 内 remap、bundle 無変更） + 案 H（URL state で σ/μ チューニング）
- **契約だけ先に書く**: `StrokeParams | StrokeParams[]` union（ML/N 重畳統合可能）、`TegakiGlyphData.s[i].rhythm?` optional 予約（案 B 昇格）、`EndpointType` 拡張 union、CSS custom property `--tegaki-rhythm-preset` 予約（案 G）
- **将来実装**: Phase 6 σ/μ チューニング（案 H 活用）、Phase 7 案 E + 案 G、Phase 8+ 案 B、Phase 10+ N 重畳、Phase 12+ 案 C/ML
- **永続棄却**: 案 D（ROI 負）、案 F（コアミッション矛盾）

**5 Phase 連続整合**:
- Phase 1: workspace 分離案 A + provider interface 布石
- Phase 2: 自作 TS パーサ案 A + provider interface 実装
- Phase 3: 三項分岐案 A + `StrokeSource` interface 布石
- Phase 4: pre-built bundle 案 A + variant 命名規則予約
- **Phase 5: 案 A（lognormal remap） + 案 H（URL state） 併設、残 6 案は段階昇格 or 根拠付き棄却**

**案 A + 案 H は「今最小コスト、将来 B/E/G 移行最小コスト、ML 座席予約ゼロコスト、Phase 6 評価 ROI 最大化」の Pareto 最適**。さらに案 F を**永続棄却として明文化**することで、3 年後の自分が DSL 誘惑に駆られたとき「Phase 5 §11-3 で決定した」と差し戻せる。Phase 5 は自然さ合成の技術選定だけでなく、**Tegaki の責務境界を再確認する Phase**でもある。

**批判的自己レビュー（本 §11 改訂後の残リスク）**:

- **案 H の 1 日追加予算は本当に視覚 QA 0.5 日で吸収可能か** — 回答: `url-state.ts` の既存機構（Phase 4 で実装済）を差分変更するだけで、新規 parser は不要。PreviewApp の slider UI は既存 `<input type="range">` パターンで shadcn/ui 等の依存もなし。視覚 QA 0.5 日削減は「σ/μ スライダが追加されたぶん、評価者が手元で変化を確認できる」ことでコンパチ、ネット ROI は正。
- **案 C のコスト試算（50-200 万円）は本当に OSS Tegaki の投資判断に載るか** — 回答: 載らない。現時点の Tegaki は単独 maintainer（git log 参照）OSS、金銭投資は発生していない。案 C を採るには商用展開の decision が前提で、これは Phase 5 のスコープを完全に超える。本 §11 で「Phase 12+」と位置付けた理由はまさにこれ。
- **案 F 永続棄却は強すぎないか** — 回答: Tegaki のコアミッションが変わらない限り妥当。もし将来「教育アプリ向けに DSL 出力機能を追加」という新プロダクト要望が来たら、それは Tegaki の延長ではなく**別プロジェクトとして fork** する判断の方が健全。§11-5 の「棄却案の整理」で「永続棄却 = コアミッションと矛盾」と記録することで、将来の判断者に対する防壁を残す。
- **8 案は多すぎないか** — 回答: 6 → 8 への拡張で軽量路線（G）と UX 路線（H）の対極を明示でき、設計空間の端点が見える。これ以上増やすと bikeshed になる。9 案目（例: WebAssembly ML, WebGPU 推論）は本質的に案 C のバリエーションなので追加不要。
- **Plamondon 単一 lognormal 仮定の扱いは十分か** — 回答: §11-4 で「MOS 上限 4.2 で頭打ち」と定量的に明示、該当字形（あ/ゆ/心/永）を Phase 6 評価セットに含めることで経験的検証可、`StrokeParams | StrokeParams[]` union 予約で将来移行を構造保証。Phase 5 スコープ内で扱える最大限の準備済み。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 6（検証・チューニング）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **σ/μ チューニング手順** | (1) PreviewApp `?se=lognormal` で字表示、(2) σ/μ スライダを ±0.05 / ±0.1 単位で動かす、(3) 評価者に「どれが自然か」を 5 段階評価、(4) `constants.ts` の `LOGNORMAL_SIGMA_DEFAULT` / `LOGNORMAL_MU_DEFAULT` を更新 | Phase 6 で 2 ラウンド反復予定 |
| **MOS 評価 URL セット雛形** | [§12-1-1 下記 URL 一覧](#12-1-1-mos-評価-url-セット雛形) | 評価者 3-5 名に共有 |
| **既知の不自然さパターン** | [§12-1-2 下記リスト](#12-1-2-既知の不自然さパターン) | 本 Phase の #4 視覚 QA で発見されたもの |
| **σ/μ 候補値** | 標準: σ=0.25 / μ=-1.6（Frontiers 2013）<br>教育書体向け候補: σ=0.22 / μ=-1.5（推測） <br>高齢者向け候補: σ=0.35 / μ=-1.4（推測） | MOS で比較予定 |
| **評価セット字** | 筆順テスト字: 右 / 左 / 田 / 必 / 成 / 乃<br>リズムテスト字: 永 / 書 / 愛 / 字 / 人 / 大<br>仮名: き / さ / ふ / を / ア / ン | 20 字固定セット |
| **パフォーマンス基準** | Phase 5 終了時: CJK 50 字で constant 2.0s / lognormal 2.4s | Phase 6 で数値の再測定、+20% 以内維持確認 |
| **BUNDLE_VERSION 判断** | 無変更で確定（§9-D） | Phase 6 で再検討する場合は案 B 昇格の判断材料に |

#### 12-1-1. MOS 評価 URL セット雛形

```
# 筆順 × リズムの 2x5 比較セット
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&g=右&m=text&t=右&fs=200&tm=controlled&se=default      # 筆順正 × 等速
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&g=右&m=text&t=右&fs=200&tm=controlled&se=lognormal    # 筆順正 × リズム
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&tm=controlled&se=default
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&tm=controlled&se=lognormal
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=愛&g=愛&m=text&t=愛&fs=200&tm=controlled&se=lognormal
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=永&g=永&m=text&t=永&fs=200&tm=controlled&se=lognormal

# tome/hane/harai 目視用（終端タイプが明確な字）
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=必&g=必&m=text&t=必&fs=200&se=lognormal   # 点 + tome 混在
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=成&g=成&m=text&t=成&fs=200&se=lognormal   # hane 目視
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=人&g=人&m=text&t=人&fs=200&se=lognormal   # harai 2 画

# σ/μ デバッグ用（Phase 5 スライダ UI、opt-in）
http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&se=lognormal&debug=1
```

#### 12-1-2. 既知の不自然さパターン

Phase 5 開発中に #4 視覚 QA で観察された、Phase 6 で要検証の挙動候補:

1. **短画の tome が「止まりすぎ」** — 「一」のような短直線末端で tome を適用すると残り 30% 急減速が過剰。短画で σ を緩和する追加ロジック検討
2. **連続 harai の差別化不足** — 「人」2 画とも harai だと σ/μ 同値で識別困難。`strokeIndex` での微小変動検討
3. **curvature 推定破綻** — 「鬱」等で curvature 高止まりし σ 過剰。clamp 強化 or 上限 0.5 下げ検討
4. **仮名の rhythm 違和感** — `kvg:type=null` で全 `default`、tome/hane/harai 無効化。仮名用プロファイル必要か（案 E で解決）
5. **pause ばらつき過多** — `sampleLognormalPause` が稀に上限 0.50s、σ_pause 0.35→0.30 下げ検討

### 12-2. Phase 8（リリース判断）へ渡す情報

- **案 B（renderer side）への昇格検討条件**:
  - Phase 6 MOS が 4.0 を超えた場合 → 案 A で安定、案 B 昇格は不要
  - CJK 利用者から「effects と rhythm の合成制御が欲しい」要望 → 案 B 昇格検討
  - パフォーマンスが +20% を超える字が頻出 → 案 B 昇格で生成時オフロード
- **`BUNDLE_VERSION` increment 契機**: rhythm パラメタの bundle 埋込（案 B）、または他の破壊的変更（effects 拡張等）と合わせて一括実施が効率的
- **上流（KurtGokhan/tegaki）提案時の論点**: rhythm 合成は日本語 CJK 特化ではなく、ラテンにも適用可能な汎用機能として PR 可能。`--rhythm lognormal` フラグ自体は言語中立。日本語対応 PR と切り離して先行提案する選択肢あり（[japanese-roadmap.md §Phase 8](../japanese-roadmap.md) 参照）

### 12-3. rhythm API の場所一覧

| API | ファイル | 公開性 |
|---|---|---|
| `erf(x): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public (renderer export) |
| `erfinv(y): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `lognormalCDF(t, mu, sigma, t0?): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `lognormalVelocity(t, D, mu, sigma, t0?): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `lognormalInverseCDF(s, mu, sigma, t0?): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `remapTime(u, sigma, mu): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public（PreviewApp preset 実装で使用） |
| `strokeParams(length, curvature, endpointType?): StrokeParams` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `sampleLognormalPause(rng?, mu?, sigma?, min?, max?): number` | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `EndpointType` 型 | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public (Phase 2 `classifyEndpoint()` と互換) |
| `StrokeParams` 型 | [rhythm.ts](../../packages/renderer/src/lib/rhythm.ts) | public |
| `estimatePolylineCurvature(points): number` | [stroke-order.ts](../../packages/generator/src/processing/stroke-order.ts) | internal（generator のみ） |

### 12-4. API 将来拡張余地

現在のシグネチャからの**互換拡張**が可能:

- **プロファイル対応**: `strokeParams(length, curvature, endpointType, profile?: 'standard' | 'educational' | 'elderly')` — 案 E 移行用
- **渡し方の構造化**: `strokeParams(length, { curvature, endpointType, profile })` への段階移行
- **ML 出力差替え**: `StrokeParams` 型を保ったまま内部実装を差替え（案 C 移行用）
- **rhythm 埋込**: `TegakiGlyphData.s[i].rhythm?: StrokeParams` optional 追加（案 B 移行用、`BUNDLE_VERSION` increment 契機）
- **curvature 計算精度向上**: `estimatePolylineCurvature()` の内部実装差替え（signature 無変更）

### 12-5. 運用・保守上の注意事項

- **σ/μ 変更**: `constants.ts` 変更で全 CJK 字の rhythm が変わる。Phase 6 チューニング完了まで凍結
- **`estimatePolylineCurvature()`**: 自己交差/極短 polyline で破綻可能性（§9-E）。Phase 6 で個別字確認
- **`sampleLognormalPause()` 非決定性**: デフォルト `Math.random`。テスト/snapshot 比較では `rng` に seeded RNG 注入（§7-1 mulberry32 参照）
- **ラテン適用範囲**: `--rhythm lognormal` は CJK 限定（§8-3）。ラテンは `classifyEndpoint` 非供給で全 default、Phase 8 判断
- **PreviewApp σ/μ スライダ**: opt-in デバッグ機能、プロダクション公開 UI 露出前に Phase 6 結論で固定値化
- **ドキュメント**: Phase 7 で `/tegaki/guides/japanese.mdx` に使い方追加予定、本 Phase は README/Changelog のみ

### 12-6. Phase 5 → Phase 6 の検証チェーン

Phase 5 完了時点で **第二次リリース候補**。ただし以下は Phase 6「日本人評価者 MOS」で初検証:

- **リズムの自然さ**（5 段階評価、目標 ≥ 4.0）
- **tome/hane/harai の差別化視認**（20 字サンプル、目視）
- **σ/μ チューニングの収束**（2 ラウンド以内）
- **短画 tome / 複雑字 curvature / 仮名 default の違和感**（§12-1-2 の 5 パターン）
- **パフォーマンス維持**（+20% 以内、[NFR-1.4](../requirements.md)）

Phase 6 の低評価は**Phase 3 座標変換** or **Phase 5 rhythm** で fix 判断。本 Phase は「Frontiers 2013 推奨値で実装し、Phase 6 の反復チューニングで収束させる」を意図的に受け入れ、Phase 6 へ改善余地を残す。

### 12-7. Phase 4（仮名バンドル）との統合確認

Phase 4 と Phase 5 は Phase 3 完了後に並列実行される。両 Phase の成果物は main マージ後に自動統合される（`orderStrokes()` が Phase 5 経由で呼ばれ、仮名 bundle は Phase 4 で生成）。

| 接点 | 確認事項 | 担当 |
|---|---|---|
| `orderStrokes()` signature | Phase 5 の optional 引数追加が Phase 4 の呼出側を破壊しない | Phase 5 統合担当 |
| 仮名 rhythm 適用 | Phase 4 の pre-built bundle が `--rhythm constant` 生成されていれば Phase 5 で runtime remap 可能 | Phase 4/5 合意（日 0） |
| 仮名 endpointType | Phase 2 `classifyEndpoint()` が仮名で `null` / `default` を返す挙動確認 | Phase 2/5 申し送り完了 |

仮名は `kvg:type` なしで全 `default` プロファイルが適用される想定（§12-1-2 パターン 4）。Phase 6 の評価で仮名への特別対応が必要と判明した場合は Phase 7 で専用プロファイル導入を検討。

---

### 関連チケット

- [Phase 1: データセットパッケージ雛形](./phase-1-dataset-package.md)
- [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md)
- [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)（**本 Phase の直接の前段**）
- [Phase 4: 仮名バンドル](./phase-4-kana-bundle.md)（**並列実行可**）
- [Phase 6: 検証・チューニング](./phase-6-validation.md)（**本 Phase の直接の後段、σ/μ チューニング担当**）
- [Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md)
- [Phase 8: リリース判断](./phase-8-release.md)
