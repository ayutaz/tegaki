# Phase 6: 検証・チューニング `MOS 評価 + Playwright 視覚回帰 + σ/μ 収束`

> 日本語対応実装の**第 6 マイルストーン、品質検証フェーズ**。Phase 3（筆順の正しさ）+ Phase 4（仮名バンドル）+ Phase 5（Sigma-Lognormal リズム）の 3 成果物を**日本人評価者の目で「違和感がない」と言わせる**状態まで収束させる。これが通らなければ本プロジェクトの**最終目的（[requirements.md §1-2](../requirements.md) 「日本人が見て違和感のない手書きアニメーション」）は未達**のままになるため、全 8 Phase で**唯一「落ちたら後続 Phase 7/8 に進めない」Phase**。MOS ≥ 4.0 / 5.0 を達成し、客観メトリクス 5 種で統計的に裏付け、Playwright による視覚回帰基盤を Phase 7+ 以降の退行検知資産として整備する。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **6 / 8** |
| マイルストーン名 | 検証・チューニング（日本人 MOS 評価 + 5 評価メトリクス + Playwright 視覚回帰 + σ/μ 2 ラウンド収束 + KanjiVG 誤り字上書き機構） |
| ブランチ名 | `feat/ja-phase6-validation` |
| ステータス | 📝 未着手 |
| 依存（前段） | [Phase 5: Sigma-Lognormal リズム合成](./phase-5-rhythm-synthesis.md)（main マージ済み必須。`rhythm.ts` / `--rhythm lognormal` / PreviewApp `se=lognormal` が稼働状態） |
| 依存（後段） | [Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md) が本 Phase の MOS 結果、残課題、既知の限界リストを消費 |
| 並列関係 | **単独実行**（Phase 4/5 の並列は前段で完了済み、本 Phase は人的評価ループを含むため単独）。ただし Playwright 基盤整備（§3-4）とメトリクス実装（§3-7）は内部並列化可 |
| 想定期間 | **5 営業日**（一人稼働、チーム 4 名で並列 3.5 日） |
| 担当見積 | 評価設計 + URL セット整備 1.0d + Playwright 導入 2.0d + メトリクス実装 1.0d + MOS 評価実施 1.0d + チューニング反復 1.0d + レポート取りまとめ 0.5d |
| **リリース区分** | **品質検証フェーズ、必達**（Phase 7 ドキュメント化と Phase 8 リリース判断の**前提条件**、落ちたら後続 Phase に進めない） |
| **リスク評価** | 高：(1) 評価者確保に失敗すると MOS が取れない、(2) σ/μ チューニングが振動して 2 ラウンドで収束しないと Phase 延長、(3) Playwright flaky で CI 信頼性低下、(4) KanjiVG 誤り字（娩・庫・炭）の扱いで fix-overrides 機構が本 Phase スコープ肥大化 |
| 関連要件 | [requirements.md](../requirements.md) AC-3 全項目 / KPI 全項目 / NFR-1.4 / R-1 / R-3 / R-6 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §5（手書きリズム評価基準） |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §Phase 6（Playwright 導入 2-3 日のコスト / 評価者 3-5 名 / 2 ラウンド以内収束） |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §2-7（評価メトリック 5 種: SNR / peak-speed ratio / 歪度 / KS 距離 / MOS） / §1-6 #8（KanjiVG 誤り字: 娩・庫・炭） / §3-4-C（Playwright 未導入） |
| 前フェーズ申し送り | [phase-5 §12-1](./phase-5-rhythm-synthesis.md)（MOS 評価 URL セット雛形 / σ/μ チューニング手順 / 既知の不自然さパターン 5 種） |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| 日本人評価者 3-5 名による MOS（Mean Opinion Score）評価、目標 ≥ 4.0 / 5.0 | 評価者 100 名超の crowdsourcing（§11 案 C） |
| 評価用 URL セット 20-30 字（Gist または Notion 管理、Phase 5 §12-1-1 を拡張） | 教育工学標準データセットとの比較（§11 案 E） |
| 筆順テスト字 7 字: 右 / 左 / 田 / 必 / 成 / 乃 / 艹部首系（艹 を含む字 → 草・花・茶 等から 1 字） | LLM による自然さ自動評価（§11 案 F） |
| リズムテスト字 7 字: 永 / 書 / 愛 / 字 / 人 / 大 / 川 | 旧版（Phase 5 未適用）との A/B test framework（§11 案 D） |
| 仮名テスト字 6 字: き / さ / ふ / を / ア / ン | JIS 第 3/4 水準漢字の評価（対象外） |
| Playwright + `@playwright/test` + `chromium` の GitHub Actions 導入（2-3 日コスト、`.visual-baselines/` に snapshot git 管理） | runtime クラッシュレポート集積（Phase 8+） |
| 評価フロー整備: 5 段階評価シート（Google Forms または Notion Form）、フィードバック集約 CSV、評価者説明書 | 縦書き・簡体字・繁体字・韓国語対応 |
| σ/μ チューニングループ: 低評価字 → `constants.ts` 更新 → 再評価、**2 ラウンド以内で収束** | 商用利用向け SLA / MOS 4.5 超え |
| 5 評価メトリクス実装（`metrics.ts` 新規）: SNR / peak-speed timing ratio / velocity skewness / KS distance on pauses / MOS 集約 | プロダクション monitoring（Sentry 等） |
| KanjiVG 誤り字（娩・庫・炭）の目視検証と `fix-overrides.json` 機構（KanjiVG の stroke data を上書き） | 文部科学省「筆順指導の手びき」(NINJAL) の機械可読化 |
| 本 Phase 評価結果レポート（`docs/phase-6-validation-report.md` または Notion ページ）と Phase 7/8 申し送り | 評価者の本採用（本 Phase は試験運用） |
| `docs/japanese-support.md` への「既知の限界」節追記（低評価字・KanjiVG 誤り・σ/μ 既定値根拠） | `package.json` の公式版 bump（Phase 8） |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

本 Phase で解決する課題は、Phase 3-5 で「動くものは出来た」状態を「**日本人が見て違和感を感じない**」状態に**実証レベルで引き上げる**こと。具体課題は 5 点。

1. **主観品質の実証不在** — Phase 3/4/5 時点では「筆順が MEXT 準拠」「仮名 179 字が描画できる」「リズムが lognormal」は**機械的に検証済み**だが、「**日本人の目に自然か**」は一度も検証していない。Phase 5 §12-1-2 で列挙した 5 つの不自然さパターン（短画 tome / 連続 harai / curvature 破綻 / 仮名 rhythm / pause ばらつき）を含め、主観評価抜きに Phase 7 ドキュメント化に進むのは**最終目的達成の論理飛躍**。[AC-3 §1](../requirements.md)、[KPI §9](../requirements.md)。

2. **σ/μ 既定値の経験的根拠不足** — Phase 5 で採用した `σ=0.25, μ=-1.6` は [Frontiers 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3867641/) の健常成人**ラテン筆記**統計値で、日本字特有の筆致（長 harai / 深い曲折 / 撥ね直前の溜め）で最適値と一致する保証はない。Phase 5 §9-A「σ/μ 初期値が日本字に合わない可能性」を**実データで検証**し、2 ラウンド以内で収束させる。

3. **評価再現性の不足** — 本 Phase の評価結果を Phase 7 ドキュメントの「既知の限界」節や Phase 8 リリース判断に使うためには、**評価者の主観メモだけでは不十分**。客観メトリクス 5 種（SNR / peak-speed ratio / velocity skewness / KS distance / MOS）で数値裏付けを取り、Phase 7 以降のリグレッション検知に使える状態にする。[technical-validation.md §2-7](../technical-validation.md)。

4. **視覚回帰基盤の不在** — Phase 5 までは Playwright / 視覚回帰テストフレームワーク**未導入**（[technical-validation.md §3-4-C](../technical-validation.md)）。Phase 7 ドキュメント作業以降で画像差分を検知する CI が無いと、**「動いてたはずが動かなくなる」退行**を運用フェーズで気付けない。本 Phase で導入し、`.visual-baselines/` を git 管理する。Playwright 導入コスト 2-3 日は [japanese-roadmap.md §Phase 6](../japanese-roadmap.md) で予告済み。

5. **KanjiVG 既知誤り字への対応方針未確定** — [technical-validation.md §1-6 #8](../technical-validation.md) で明示の「娩・庫・炭」等の常用内誤り字について、Phase 3-5 では機械的にそのまま採用している。本 Phase で**目視検証 + `fix-overrides.json` 機構**を実装し、ユーザー報告時の修正経路を確立する。[R-1](../requirements.md) 対策の実装担当。

### 2-2. Done の定義（測定可能）

以下 **18 項目すべて** を満たしたとき本チケット完了。[AC-3](../requirements.md) 3 項目 + [KPI](../requirements.md) 6 項目 + [NFR-1.4](../requirements.md) + [R-1/R-3/R-6](../requirements.md) を網羅。

- [ ] **D-1** 日本人評価者 3-5 名が確保され、評価シートの記入が全員完了（[AC-3 §1](../requirements.md)）
- [ ] **D-2** 評価対象 20 字（筆順 7 + リズム 7 + 仮名 6）の MOS 平均が**≥ 4.0 / 5.0**（[KPI §9](../requirements.md) / [AC-3 §1](../requirements.md)）
- [ ] **D-3** 評価用 URL セットが Gist または Notion ページで公開、評価者全員がアクセス可能
- [ ] **D-4** Playwright + chromium が `packages/website/e2e/` に導入、`bun --filter @tegaki/website e2e` で全テスト exit 0
- [ ] **D-5** `.visual-baselines/` に 20 字 × 3 時刻（開始 / 中盤 / 終盤）= 60 snapshot が git commit 済
- [ ] **D-6** GitHub Actions の `.github/workflows/` に Playwright stage が追加、main push 時に自動実行（[R-6](../requirements.md) 対策）
- [ ] **D-7** `packages/generator/src/processing/metrics.ts` が新規追加、5 評価メトリクス関数（`computeSNR`, `peakSpeedRatio`, `velocitySkewness`, `ksPauseDistance`, `aggregateMOS`）が export
- [ ] **D-8** `metrics.test.ts` が境界値・既知入力で全通（[AC-3 §2](../requirements.md)）
- [ ] **D-9** 明らかな異常（画抜け / 逆方向 / 文字化け）が 20 字**すべてで 0 件**（[AC-3 §2](../requirements.md)）
- [ ] **D-10** σ/μ チューニングが**2 ラウンド以内で収束**（ラウンド 2 以降で評価者平均が悪化しない）、最終値は `constants.ts` に反映
- [ ] **D-11** 評価結果レポートが `docs/phase-6-validation-report.md` に作成、評価スコア・メトリクス数値・問題字一覧を記載
- [ ] **D-12** `docs/japanese-support.md` に「既知の限界」節が追記され、低評価字・KanjiVG 誤り字・σ/μ 既定値の根拠が記述（[AC-3 §3](../requirements.md)）
- [ ] **D-13** KanjiVG 誤り字 3 字（娩・庫・炭）の目視検証が完了、評価シートに「要修正」または「許容範囲」のマークが付く
- [ ] **D-14** `fix-overrides.json` 機構の雛形が `packages/dataset-cjk-kanjivg/src/fix-overrides.json` として追加（初期は空 or 娩 1 字のみ修正）、ローダー側（Phase 2 `parseKanjiSvg`）が上書きを適用
- [ ] **D-15** パフォーマンス再測定: CJK 50 字生成が Phase 3 比**+20% 以内**を維持（[NFR-1.4](../requirements.md)）
- [ ] **D-16** KPI 再確認: 筆順正確性 99%+ / バンドルサイズ ≤ 300 KB / 生成速度 ≤ 3 秒が Phase 5 完了時点から劣化していないこと
- [ ] **D-17** Phase 7 / 8 への申し送りが §12 に作成（残課題、評価者連絡先、σ/μ 最終値、fix-overrides 運用ルール）
- [ ] **D-18** `bun typecheck && bun run test && bun check` 全通、`bun --filter @tegaki/website e2e` 全通、CI 緑

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（追加・変更分のみ）

```
packages/generator/src/processing/
  metrics.ts                         # 新規: 5 評価メトリクス実装
  metrics.test.ts                    # 新規: 境界値・既知入力テスト

packages/website/e2e/
  playwright.config.ts               # 新規: Playwright 設定
  specs/
    preview-app-baselines.spec.ts    # 新規: 20 字 × 3 時刻の視覚回帰
    preview-app-rhythm-diff.spec.ts  # 新規: constant vs lognormal の差異確認
  fixtures/
    evaluation-urls.json             # 新規: 評価 URL セット（プログラム読込可）
  visual-baselines/                  # 新規: snapshot 格納（git LFS or 通常 commit）
    right-start.png
    right-middle.png
    right-end.png
    ... × 20 字 × 3 時刻 = 60 枚

packages/dataset-cjk-kanjivg/src/
  fix-overrides.json                 # 新規: KanjiVG 誤り字上書きデータ（初期空 or 娩 1 字）
  fix-overrides.ts                   # 新規: JSON 読込 + 適用関数

packages/generator/src/dataset/
  kanjivg.ts                         # 差分: fix-overrides 適用フック追加（parseKanjiSvg 内）

packages/generator/src/constants.ts  # 差分: σ/μ 最終値反映（Phase 5 既定値の更新 or 据置）

packages/website/src/components/
  PreviewApp.tsx                     # 差分: evaluation-urls.json の URL リスト UI 露出（opt-in debug panel）

docs/
  phase-6-validation-report.md       # 新規: 評価結果レポート
  japanese-support.md                # 差分: 「既知の限界」節追記

.github/workflows/
  e2e-visual-regression.yml          # 新規: Playwright CI ジョブ

docs/tickets/
  phase-6-validation.md              # 本チケット自体
```

**合計差分**: 新規 8 ファイル + 変更 5 ファイル + 60 snapshot（視覚回帰 baselines）。本 Phase は**評価＋基盤整備＋チューニング**の 3 種成果物で、コード変更自体は控えめ。

### 3-2. 評価用 URL セット（Gist / Notion 管理、20-30 字）

Phase 5 §12-1-1 雛形を拡張し、**筆順 7 + リズム 7 + 仮名 6 = 20 字固定セット**を運用。評価者への共有形式は Gist（Markdown リスト）または Notion ページ（カード UI）を選択。`evaluation-urls.json` としてプログラムからも読める形で本リポジトリに commit。

**筆順テスト字（7 字）**:

| 字 | 選定理由 | KanjiVG 期待画数 | 注目ポイント |
|---|---|---|---|
| 右 | 日中筆順差（ノ→一→口 vs 一→ノ→口）、常用頻出 | 5 | 1 画目が `ノ` であること |
| 左 | 右と対称（一→ノ→工）、教育書体での反転 | 5 | 1 画目が `一` であること |
| 田 | 交差字（縦横 4 画）、Phase 3 分岐選択の典型ケース | 5 | 中央縦横が 2 画と認識されるか |
| 必 | 筆順複雑（上点→左払→心→左下点→右下点）、常用頻出 | 5 | 点 2 画が hane/harai と差別化 |
| 成 | PRC/ROC 差（点先行 vs 横先行）、hane 目視 | 6 | hane 1 画の末尾 |
| 乃 | PRC と終了画異（日本は `丿` 末尾）、ストローク方向 | 2 | 2 画目の `丿` 方向 |
| 草 | 艹部首（日本・PRC 3 画統合）、部首ネスト | 9 | 艹 が 3 画で描画 |

**リズムテスト字（7 字）**:

| 字 | 選定理由 | 期待画数 | 注目ポイント |
|---|---|---|---|
| 永 | 「永字八法」の代表字、8 筆法すべて含む | 5 | 全画で tome/hane/harai が識別可能 |
| 書 | 10 画、長 harai 含む、Phase 5 §12-1-1 推奨 | 10 | 10 画目の harai テーパ |
| 愛 | 曲折多い、上部「爫」下部「心」のリズム対比 | 13 | 心部 3 点の終端差 |
| 字 | 宀部 + 子部、撥ね 2 画含む | 6 | 2 画目と 6 画目の hane 識別 |
| 人 | 2 画 harai（連続 harai）、Phase 5 §12-1-2 #2 検証 | 2 | 2 画の σ 差別化 |
| 大 | 横 + 左払 + 右払、Phase 1 デモ頻出 | 3 | 2 画目と 3 画目の harai 強度 |
| 川 | 3 画縦棒（リズム重畳の最小事例）、§11-4 Phase 5 頭打ち検証 | 3 | 3 画が等価に見えず微差がある |

**仮名テスト字（6 字）**:

| 字 | 選定理由 | 期待画数 | 注目ポイント |
|---|---|---|---|
| き | 4 画（教科書体、分断筆）、Phase 4 §7-2 | 4 | 分離された 4 画が視認 |
| さ | 3 画（教科書体） | 3 | 1 画目と 2 画目のリズム差 |
| ふ | 4 画（点 4 つ相当、連続 dot） | 4 | 4 dot の短時間性 |
| を | 3 画（折れ含む） | 3 | 折れでの速度変化 |
| ア | 2 画（カタカナ、left-fall） | 2 | 1 画目の払い |
| ン | 2 画（カタカナ、点 + 右下払い） | 2 | 1 画目 dot と 2 画目 harai の差 |

**各字の URL 雛形**（`evaluation-urls.json` に JSON で保持）:

```json
{
  "strokeOrder": [
    {
      "char": "右",
      "urls": {
        "lognormal": "http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&g=右&m=text&t=右&fs=200&tm=controlled&se=lognormal",
        "constant": "http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&g=右&m=text&t=右&fs=200&tm=controlled&se=default",
        "snapshot_start": "...&ct=0.05",
        "snapshot_middle": "...&ct=1.50",
        "snapshot_end": "...&ct=3.00"
      },
      "expectedStrokes": 5,
      "focusPoint": "1画目がノ"
    }
  ],
  "rhythm": [/* ... */],
  "kana": [/* ... */]
}
```

### 3-3. 評価フロー（評価者 3-5 名）

**評価者要件**:
- 日本語母語話者（日本在住または日本語での書字経験 10 年以上）
- 年齢 20-60 歳、性別バランス（強制ではないが極端な偏り回避）
- 書道・習字経験不問（専門家評価ではなく一般ユーザー視点）
- 評価所要時間: 30-45 分 × 2 ラウンド

**評価シート構成**（Google Forms / Notion Form / 手動 Markdown いずれか）:

| 項目 | 内容 | 形式 |
|---|---|---|
| 評価者 ID | A/B/C/D/E（匿名化） | 固定 |
| 字 | 20 字各々 | 固定 |
| Q1: 筆順の正しさ | 1（誤り明白）- 5（正しい） | 5 段階 |
| Q2: リズムの自然さ | 1（非常に機械的）- 5（人間に近い） | 5 段階 |
| Q3: 全体の自然さ（MOS 本尺度） | 1（違和感大）- 5（違和感なし） | 5 段階 |
| Q4: 気づいた異常 | 自由記述（任意） | テキスト |

**運用フロー**:

```
Day 1: 評価 URL セット確定、Gist/Notion ページ公開、評価者リクルート
Day 2: Playwright 基盤整備、.visual-baselines/ 生成、メトリクス実装着手
Day 3: 評価ラウンド 1 実施（評価者 3-5 名同時並行、約 45 分/人）、フィードバック集約
Day 4: 低評価字特定 → σ/μ 調整（PreviewApp スライダで候補値探索、§3-6 参照）→ constants.ts 更新 → 評価ラウンド 2
Day 5: ラウンド 2 結果取りまとめ、レポート作成、Phase 7/8 申し送り
```

### 3-4. Playwright 導入（2-3 日コスト、[japanese-roadmap.md §Phase 6](../japanese-roadmap.md) 予告済）

**インストール**:

```bash
cd C:/Users/yuta/Desktop/Private/tegaki/packages/website
bun add -d @playwright/test
bunx playwright install chromium
```

**設定ファイル（`packages/website/e2e/playwright.config.ts`）**:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:4321/tegaki/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

**テストの書き方の核心**（`specs/preview-app-baselines.spec.ts`）:

```ts
import { test, expect } from '@playwright/test';
import evaluationUrls from '../fixtures/evaluation-urls.json';

for (const category of ['strokeOrder', 'rhythm', 'kana'] as const) {
  for (const entry of evaluationUrls[category]) {
    test(`${category}/${entry.char} baseline snapshot`, async ({ page }) => {
      for (const phase of ['snapshot_start', 'snapshot_middle', 'snapshot_end'] as const) {
        await page.goto(entry.urls[phase]);
        await page.waitForSelector('[data-tegaki-ready]', { timeout: 10_000 });
        const preview = page.locator('[data-tegaki-preview]');
        await expect(preview).toHaveScreenshot(`${entry.char}-${phase}.png`, {
          maxDiffPixelRatio: 0.01,
          threshold: 0.2,
        });
      }
    });
  }
}
```

**baseline 生成**（初回のみ）:

```bash
bun --filter @tegaki/website e2e --update-snapshots
git add packages/website/e2e/visual-baselines/
git commit -m "chore: add Phase 6 visual baselines (20 chars × 3 phases)"
```

**GitHub Actions 追加（`.github/workflows/e2e-visual-regression.yml`）**:

```yaml
name: E2E Visual Regression
on: [push, pull_request]
jobs:
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx playwright install --with-deps chromium
      - run: bun --filter @tegaki/website e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: packages/website/playwright-report/
```

### 3-5. 5 評価メトリクス実装（`metrics.ts` 新規）

[technical-validation.md §2-7](../technical-validation.md) の 5 指標を関数化。`packages/generator/src/processing/metrics.ts` に配置（generator 側に置く理由: 解析スクリプトがバンドル生成時のデータを直接消費するため）。

```ts
// packages/generator/src/processing/metrics.ts (概要、実装 ~180 行)

/** Metric 1: Reconstructed velocity SNR.
 *  SNR = 10 * log10(sum(v_ref^2) / sum((v_ref - v_synth)^2))
 *  Target: >= 25 dB (healthy adult baseline), >= 15 dB (stylized).
 */
export function computeSNR(vRef: number[], vSynth: number[]): number { /* ... */ }

/** Metric 2: Peak-speed timing ratio.
 *  ratio = t_peak / t_total
 *  Plamondon baseline: 0.35 ± 0.05 (straight strokes), 0.45-0.55 (curved).
 */
export function peakSpeedRatio(velocityProfile: number[]): number { /* ... */ }

/** Metric 3: Velocity profile skewness (Fisher-Pearson).
 *  For σ=0.25 lognormal, theoretical skew = 0.78.
 */
export function velocitySkewness(velocityProfile: number[]): number { /* ... */ }

/** Metric 4: KS distance on inter-stroke pauses.
 *  Target distribution: { median: 0.18, IQR: [0.11, 0.28] } s.
 *  KS = max |F_observed(x) - F_target(x)|.
 */
export function ksPauseDistance(pauses: number[]): number { /* ... */ }

/** Metric 5: Aggregate MOS with confidence interval.
 *  Bootstrap CI at 95% level.
 */
export function aggregateMOS(
  ratings: number[][], // ratings[evaluator][char]
): { mean: number; ci95Lower: number; ci95Upper: number; perChar: number[] } { /* ... */ }
```

### 3-6. σ/μ チューニングループ（2 ラウンド以内収束）

**ラウンド 1**:
1. Phase 5 既定値 `σ=0.25, μ=-1.6` で評価実施
2. 平均 MOS が 4.0 未満の字を抽出（例: 低評価字 = 「書」「愛」「ン」の 3 字）
3. PreviewApp の σ/μ スライダ（Phase 5 案 H 実装）で手動探索: σ ∈ [0.15, 0.45] / μ ∈ [-2.0, -1.2] を ±0.05 刻みでスキャン
4. 各字の**最良 σ/μ** を評価者で短時間選定（5 分/字）
5. 20 字の最良値を中央値で集約 → 次ラウンドの全字共通 σ/μ 案に

**ラウンド 2**:
1. ラウンド 1 で得た中央値候補（例: `σ=0.28, μ=-1.5`）を `constants.ts` に一時適用
2. 同じ 20 字を再評価
3. 収束判定:
   - **収束**: 平均 MOS ≥ 4.0 かつ全字で MOS ≥ 3.5
   - **非収束**: 平均 MOS が下がった、または全字下限 3.5 未満字が残る
4. 非収束時: 残課題字を §11 案 E のプロファイル案（`educational` / `handwriting`）に逃がすか、`strokeParams()` 内の終端種別補正値を調整（Phase 5 §3-3 の 5 行表の修正）

**振動リスク対策**（Phase 5 §9-A の残余リスク中）:
- スライダ探索で「評価者間で最良 σ/μ がバラつく」場合は**中央値ではなく各自の総意に近い値**を採用
- 2 ラウンドで収束しない場合、Phase 6 を延長せず **σ/μ 据置 + 問題字を §12 申し送り**で Phase 7 にエスカレ（Phase 8 リリース判断で再評価）

### 3-7. KanjiVG 誤り字と `fix-overrides.json` 機構

[technical-validation.md §1-6 #8](../technical-validation.md) で明示の常用誤り字:
- **娩**（U+5A29）: 女部の筆順が一部報告で MEXT と異なる
- **庫**（U+5EAB）: 广部以降の筆順にバリアント存在
- **炭**（U+70AD）: 山部 + 火部の分離筆順で KanjiVG 誤り報告あり

**目視検証手順**:
1. 評価 URL セットに 3 字の専用 URL を追加（必須評価対象ではなく opt-in）
2. 評価者 1-2 名（書道経験者優先）に「MEXT 筆順として正しいか」の Y/N 判定を依頼
3. 明白な誤りが確認された字は `fix-overrides.json` で上書き

**fix-overrides.json 形式**:

```json
{
  "overrides": {
    "娩": {
      "reason": "Phase 6 評価で女部の 3 画目方向が MEXT 非準拠と判定",
      "source": "文部科学省 常用漢字表 2010",
      "strokes": [
        { "d": "M10,20 C...", "kvgType": "㇒", "order": 1 },
        /* ... 各画の d 属性（SVG path）を記述 ... */
      ]
    }
  }
}
```

**ローダー側適用**（`packages/generator/src/dataset/kanjivg.ts` 差分）:

```ts
import { loadFixOverrides } from '@tegaki/dataset-cjk-kanjivg';

export function parseKanjiSvg(svg: string, char: string): KanjiStroke[] {
  const overrides = loadFixOverrides();
  if (overrides[char]) {
    // override 側の strokes を直接返す（KanjiVG を無視）
    return overrides[char].strokes.map(/* ... */);
  }
  // 従来の KanjiVG パース
  return parseOriginal(svg);
}
```

**Phase 6 での fix-overrides 運用範囲**:
- **本 Phase では機構の雛形のみ実装**（空 JSON または 1 字のみ）
- 追加修正は Phase 8+ のユーザー報告駆動で段階対応
- `docs/japanese-support.md` 既知の限界節に「KanjiVG 誤り報告時の overrides 追加方法」を記載

### 3-8. CLI / 運用コマンド

```bash
# Playwright ローカル実行（dev server 起動済み前提）
bun --filter @tegaki/website e2e

# baseline 再生成（Phase 5 rhythm 変更時に 1 度だけ）
bun --filter @tegaki/website e2e --update-snapshots

# メトリクス計算（評価レポート生成用、新規スクリプト）
bun run scripts/compute-metrics.ts --char 書 --ref fixtures/real-velocity.json

# 評価用 dev server 起動（評価者に共有する localhost URL）
bun dev
# → http://localhost:4321/tegaki/generator/?f=Noto+Sans+JP&ch=右&m=text&t=右&fs=200&se=lognormal
```

### 3-9. 既存コードとの接続点まとめ

| 既存コード | 使用 / 変更 |
|---|---|
| Phase 5 `rhythm.ts` | **無変更**（`metrics.ts` が独立に読み取るだけ、双方向依存なし） |
| Phase 5 `constants.ts` | σ/μ 最終値の反映（ラウンド 2 収束後、1-2 定数更新） |
| Phase 5 `PreviewApp` σ/μ スライダ | チューニング時の手動探索 UI として本 Phase で運用 |
| Phase 3 `datasetSkeleton()` | **無変更**（fix-overrides は Phase 2 `parseKanjiSvg` レイヤで適用） |
| Phase 2 `parseKanjiSvg()` | fix-overrides 適用フック追加（数行差分） |
| Phase 1 `@tegaki/dataset-cjk-kanjivg` | `fix-overrides.json` + `fix-overrides.ts` 追加（新規ファイル 2 つ） |
| 既存 CI (`bun checks`) | **無変更**（Playwright は別 workflow で並列実行） |

---

## §4. エージェントチーム構成

Phase 6 は **4 名編成**。評価設計・基盤整備・統計解析・評価コーディネートを分離し、**主観評価の担当と客観メトリクスの担当を独立**させて相互検証を効かせる。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **評価設計担当** | 1 | 評価 URL セット 20 字、評価シート（Google Forms / Notion Form）、評価者説明書、評価ラウンド 1/2 のスクリプト運用、低評価字特定と σ/μ 候補値探索、`docs/phase-6-validation-report.md` 作成、日本語書字知識の橋渡し | MOS 評価経験 or UX Research、日本語書字の基本知識、Google Forms / Notion 運用 | 1.5d |
| 2 | **Playwright 基盤担当** | 1 | `playwright.config.ts`、20 字 × 3 時刻 = 60 snapshot の baseline 生成、GitHub Actions workflow、`specs/*.spec.ts` 記述、flaky 対策（`waitForSelector` / `toHaveScreenshot` の maxDiffPixelRatio 調整） | Playwright API、GitHub Actions、snapshot testing、DOM ready 検知 | 2.0d |
| 3 | **統計解析担当** | 1 | `metrics.ts` 5 関数実装、`metrics.test.ts`、評価結果 CSV の集約スクリプト、bootstrap CI 計算、Phase 5 rhythm 出力から velocity profile を再構成する解析コード | 数値計算、統計学（KS 検定、bootstrap CI）、TypeScript 数値型、Plamondon 論文知識 | 1.5d |
| 4 | **評価コーディネート担当** | 1 | 評価者 3-5 名の募集・連絡、評価スケジュール調整、評価ラウンド 1/2 の対面 or 非同期実施、フィードバック回収（Gist コメント or Notion ページのコメント欄）、`fix-overrides.json` の誤り字検証実施、KanjiVG 上流への issue 化検討 | コミュニケーション、スケジューリング、評価者への技術的 UX 説明（スライダ操作手順等） | 1.0d |

**並列化**: #2（Playwright）は #1 の URL セットがある程度固まれば Day 1 後半から着手可能。#3（メトリクス）は完全独立で Day 1-2 で完結。#1（評価設計）と #4（評価コーディネート）は相互依存ありで Day 1 の設計・Day 3 の実施で密接連携。**直列 5 日 / 並列 3.5 日**で完走可能。

### 4-1. ロール間の受け渡しとレビュー委譲

```
 Day 0  #1 URL セット 20 字リスト確定          │  #4 評価者候補リスト作成
        #2 Playwright 導入手順書作成            │  #3 メトリクス関数シグネチャ確定
 Day 1  #1 評価シート Google Forms 構築          │  #2 playwright.config.ts + 1 字 spike
        #3 computeSNR + ksPauseDistance         │  #4 評価者 3 名確保、説明書送付
 Day 2  #1 evaluation-urls.json 確定             │  #2 20 字 × 3 時刻 baseline 生成
        #3 velocitySkewness + aggregateMOS      │  #4 評価ラウンド 1 日程確定
 Day 3  **評価ラウンド 1 実施**（全員同席 or 非同期）
        #1 結果集約 → 低評価字抽出              │  #3 メトリクス数値計算
        #2 GitHub Actions 追加                  │  #4 評価者フィードバック整理
 Day 4  #1 σ/μ 候補値探索（PreviewApp スライダ） │  #3 constants.ts 更新後のメトリクス再計算
        **評価ラウンド 2 実施**
        #4 KanjiVG 誤り字 3 字の目視検証        │  #2 視覚回帰 flaky 修正
 Day 5  全員 レポート作成、Phase 7/8 申し送り、fix-overrides.json 整備、CI 緑確認
```

**レビュー委譲**:
- **MOS 統計的妥当性** → #3 が bootstrap CI で検証、#1 が評価者応答の質チェック（独立判断）
- **視覚回帰安定性** → #2 が CI を 10 回連続通過（flaky 判定）、#1 が baseline の字形正確性を目視
- **σ/μ 収束の妥当性** → #1 + #3、平均 MOS 改善と全字 3.5 下限の両方を確認
- **fix-overrides の MEXT 準拠** → #4 が書道経験者 1 名に照会、判定記録を残す

---

## §5. 提供範囲（Deliverables）

### 5-1. コード成果物（新規）

- [ ] `packages/generator/src/processing/metrics.ts`（§3-5、~180 行、5 メトリクス関数 + ヘルパー）
- [ ] `packages/generator/src/processing/metrics.test.ts`（§7-1、~100 行、25+ ケース）
- [ ] `packages/website/e2e/playwright.config.ts`（§3-4、~35 行）
- [ ] `packages/website/e2e/specs/preview-app-baselines.spec.ts`（§3-4、~50 行、20 字 × 3 時刻ループ）
- [ ] `packages/website/e2e/specs/preview-app-rhythm-diff.spec.ts`（§8-3、~40 行、constant vs lognormal）
- [ ] `packages/website/e2e/fixtures/evaluation-urls.json`（§3-2、20 字の URL セット）
- [ ] `packages/dataset-cjk-kanjivg/src/fix-overrides.json`（§3-7、初期空 or 娩 1 字）
- [ ] `packages/dataset-cjk-kanjivg/src/fix-overrides.ts`（§3-7、ローダーヘルパー、~30 行）
- [ ] `.github/workflows/e2e-visual-regression.yml`（§3-4、Playwright CI）

### 5-2. コード成果物（差分）

- [ ] `packages/generator/src/dataset/kanjivg.ts`: `parseKanjiSvg()` に fix-overrides 適用フック追加（5-10 行）
- [ ] `packages/generator/src/constants.ts`: σ/μ 最終値反映（ラウンド 2 収束後、1-2 定数更新）
- [ ] `packages/website/src/components/PreviewApp.tsx`: evaluation-urls.json の URL リスト UI 露出（opt-in debug panel、~20 行）
- [ ] `package.json` root: `e2e` script 追加、Playwright devDep 追加

### 5-3. 視覚回帰 baselines

- [ ] `packages/website/e2e/visual-baselines/` に 20 字 × 3 時刻 = 60 PNG（合計目安 ~2-5 MB、通常 git commit で管理、超過時は git LFS 検討）

### 5-4. ドキュメント成果物

- [ ] `docs/phase-6-validation-report.md`（新規、評価結果レポート、~300-500 行）
  - 評価者属性（匿名）
  - 評価スコア集計（20 字 × 3 質問）
  - 平均 MOS + bootstrap CI
  - 5 メトリクス数値
  - 低評価字 TOP 5 と改善対応
  - σ/μ チューニング履歴（ラウンド 1/2 の値）
  - 残課題リスト
- [ ] `docs/japanese-support.md` の「既知の限界」節追記（§12-2、Phase 7 で参照）
- [ ] `docs/tickets/README.md` のステータス更新（📝 → 🚧 → 👀 → ✅）

### 5-5. プロジェクト管理成果物

- [ ] `feat/ja-phase6-validation` ブランチから `main` への PR 作成（Phase 5 マージ後分岐）
- [ ] PR 本文に MOS 平均値 + bootstrap CI 記載、視覚回帰 CI 緑のスクリーンショット添付
- [ ] PR 本文に fix-overrides.json の運用方針（ユーザー報告時の追加手順）明記
- [ ] [AC-3](../requirements.md) 3 項目すべてチェック済み
- [ ] Phase 7 チケット §12 申し送りに残課題リストと評価者連絡先を記載

---

## §6. テスト項目（受入基準ベース）

[AC-3](../requirements.md) 3 項目 + [KPI](../requirements.md) 6 項目 + [NFR-1.4](../requirements.md) + [R-1](../requirements.md) + [R-6](../requirements.md) を網羅。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | **AC-3 §1** | 日本人評価者 3-5 名の MOS 平均が ≥ 4.0 / 5.0 | 平均 ≥ 4.0 | 人的 |
| T-02 | **AC-3 §1** | 評価者過半数（3/5 or 2/3）が「自然」「書き順として正しい」と回答 | ≥ 過半数 | 人的 |
| T-03 | **AC-3 §2** | 20 字の評価セットで明らかな異常（画抜け・逆方向・文字化け）が 0 件 | 0 件 | 人的 |
| T-04 | **AC-3 §3** | 問題字がすべて issue 化され、`japanese-support.md` 既知の限界節に追記 | 記載完了 | meta |
| T-05 | KPI §1 | 常用漢字筆順正確性 99%+（20 字目視で誤り 0 件） | 0 件 / 20 字 | 人的 |
| T-06 | KPI §2 | 日本人評価者 MOS ≥ 4.0 | T-01 と同じ | 人的 |
| T-07 | KPI §3 | 既存ラテン出力に影響なし（snapshot 差分ゼロ） | 0 byte diff | e2e |
| T-08 | KPI §4 | 仮名バンドルサイズ ≤ 300 KB（Phase 4 から劣化なし） | ≤ 300 KB | e2e |
| T-09 | KPI §5 | CJK 50 字生成 ≤ 3 秒 | ≤ 3s | e2e/bench |
| T-10 | KPI §6 | カバレッジ 常用 100% / 人名用 95%+（Phase 1 から劣化なし） | ≥ 100% / ≥ 95% | e2e |
| T-11 | NFR-1.4 | rhythm 合成オーバーヘッド +20% 以内（Phase 5 から劣化なし） | ratio ≤ 1.2 | e2e/bench |
| T-12 | R-1 | KanjiVG 誤り字 3 字（娩・庫・炭）の目視検証完了 | 判定記録 3/3 | 人的 |
| T-13 | R-1 | fix-overrides.json 機構が稼働（雛形 or 1 字上書き） | 機構動作 | e2e |
| T-14 | R-3 | σ/μ チューニング 2 ラウンド以内で収束（平均 MOS 改善 or 維持） | 収束 | 人的 |
| T-15 | R-6 | Playwright 基盤が GitHub Actions で 10 回連続 green | 10/10 | e2e |
| T-16 | 視覚回帰 | 60 snapshot のうち意図的変更なしでの diff が 0 件 | 0 diff | e2e |
| T-17 | メトリクス | `computeSNR(v, v)` が +Infinity（同一信号） | Infinity | unit |
| T-18 | メトリクス | `peakSpeedRatio` が直線画相当で 0.35 ± 0.1 | in range | unit |
| T-19 | メトリクス | `velocitySkewness` が理論値（σ=0.25）で 0.78 ± 0.15 | in range | unit |
| T-20 | メトリクス | `ksPauseDistance` が同分布で ≤ 0.05 | ≤ 0.05 | unit |
| T-21 | メトリクス | `aggregateMOS` が既知データで bootstrap CI 正しく返す | CI 幅 > 0 | unit |
| T-22 | fix-overrides | overrides に存在する字は上書きされ、存在しない字は KanjiVG 由来 | 両経路動作 | unit |
| T-23 | Playwright flaky | `maxDiffPixelRatio: 0.01` でフォント描画の微差を許容 | flake 率 ≤ 5% | e2e |
| T-24 | `bun checks` | `bun typecheck && bun run test && bun check` exit 0 | exit 0 | e2e |
| T-25 | バイト一致 | Phase 5 からの generator 出力バイト一致（σ/μ 更新分以外） | 変更最小 | e2e |

---

## §7. Unit テスト

### 7-1. `metrics.test.ts` — 5 評価メトリクスの数学的正確性（25+ ケース）

```ts
// packages/generator/src/processing/metrics.test.ts (要点、全 25+ ケース)
import { describe, expect, it } from 'bun:test';
import { computeSNR, peakSpeedRatio, velocitySkewness, ksPauseDistance, aggregateMOS } from './metrics.ts';

describe('computeSNR', () => {
  it('returns +Infinity when ref === synth (no noise)', () => {
    const v = [1, 2, 3, 2, 1];
    expect(computeSNR(v, v)).toBe(Infinity);
  });
  it('returns 0 dB when synth is pure noise at ref power level', () => {
    // SNR = 10*log10(P_ref / P_noise)
    // When P_noise = P_ref → 10*log10(1) = 0
    const ref = [1, 1, 1, 1];
    const synth = [0, 0, 0, 0];  // 100% noise
    expect(computeSNR(ref, synth)).toBeCloseTo(0, 1);
  });
  it('matches expected 20 dB for 10% relative noise', () => { /* ... */ });
});

describe('peakSpeedRatio', () => {
  it('returns 0.35 ± 0.05 for σ=0.25 lognormal velocity (straight stroke baseline)', () => {
    const profile = generateLognormalVelocity(0.25, -1.6);
    const ratio = peakSpeedRatio(profile);
    expect(ratio).toBeGreaterThanOrEqual(0.30);
    expect(ratio).toBeLessThanOrEqual(0.40);
  });
  it('returns value in [0, 1]', () => { /* ... */ });
});

describe('velocitySkewness', () => {
  it('returns 0.78 ± 0.15 for σ=0.25 lognormal (theoretical baseline)', () => {
    const profile = generateLognormalVelocity(0.25, -1.6);
    expect(velocitySkewness(profile)).toBeCloseTo(0.78, 1);
  });
  it('returns 0 for symmetric Gaussian', () => {
    const gaussian = generateGaussianVelocity(0.3);
    expect(velocitySkewness(gaussian)).toBeCloseTo(0, 1);
  });
});

describe('ksPauseDistance', () => {
  it('returns 0 for identical distributions', () => {
    const target = generateLognormalSamples(1000, -1.61, 0.35);
    expect(ksPauseDistance(target)).toBeLessThanOrEqual(0.05);
  });
  it('returns > 0.2 for clearly different distribution', () => {
    const offTarget = Array(1000).fill(0).map(() => Math.random() * 2); // uniform
    expect(ksPauseDistance(offTarget)).toBeGreaterThan(0.2);
  });
});

describe('aggregateMOS', () => {
  it('returns mean 4.0 for 3 evaluators rating 4/5 uniformly', () => {
    const ratings = [[4,4,4],[4,4,4],[4,4,4]];
    const result = aggregateMOS(ratings);
    expect(result.mean).toBe(4.0);
    expect(result.ci95Lower).toBeLessThanOrEqual(4.0);
    expect(result.ci95Upper).toBeGreaterThanOrEqual(4.0);
  });
  it('returns wider CI for higher variance ratings', () => { /* ... */ });
  it('returns per-char average matching column means', () => { /* ... */ });
});
```

### 7-2. `fix-overrides.test.ts` — 上書き機構の動作

```ts
import { describe, expect, it } from 'bun:test';
import { parseKanjiSvg } from './kanjivg.ts';

describe('fix-overrides', () => {
  it('applies override when char is in fix-overrides.json', () => {
    // Mock fix-overrides with 娩 override
    const result = parseKanjiSvg(kanjiVgSvg娩, '娩');
    expect(result[0].kvgType).toBe('㇒'); // from override, not KanjiVG
  });
  it('falls through to KanjiVG when char is NOT in overrides', () => {
    const result = parseKanjiSvg(kanjiVgSvg右, '右');
    expect(result.length).toBe(5); // KanjiVG native
  });
  it('logs a warning when override is applied', () => { /* ... */ });
});
```

---

## §8. e2e テスト

**目的**: (1) Playwright で 20 字の URL ナビゲート + `ct` で時刻固定 + スクリーンショット差分、(2) constant vs lognormal の描画差が視認可能、(3) 既存 4 フォント + 仮名バンドルのラテン / 仮名 snapshot が無変更を機械検証。

### 8-1. Playwright による 20 字視覚回帰（`preview-app-baselines.spec.ts`）

§3-4 の spec を実行:

```bash
cd C:/Users/yuta/Desktop/Private/tegaki
bun dev &  # background dev server
sleep 3
bun --filter @tegaki/website e2e
# expect: 60 tests, all pass (20 chars × 3 phases)
```

**flaky 対策**:
- `maxDiffPixelRatio: 0.01`（1% 以下の差を許容、フォントヒンティング差に対応）
- `threshold: 0.2`（ピクセル色差の閾値）
- `waitForSelector('[data-tegaki-ready]')`（PreviewApp 準備完了を明示的に待つ、§8-5 で PreviewApp に data 属性追加）
- dev server 起動を `webServer` で Playwright に任せる

### 8-2. constant vs lognormal の差異確認（`preview-app-rhythm-diff.spec.ts`）

```ts
test('書 (stroke 10): constant and lognormal produce visibly different frames at t=1.5', async ({ page }) => {
  // Navigate to constant version, take snapshot at middle frame
  await page.goto('/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&se=default&ct=1.5&tm=controlled');
  await page.waitForSelector('[data-tegaki-ready]');
  const constantBuf = await page.locator('[data-tegaki-preview]').screenshot();

  // Navigate to lognormal version
  await page.goto('/tegaki/generator/?f=Noto+Sans+JP&ch=書&g=書&m=text&t=書&fs=200&se=lognormal&ct=1.5&tm=controlled');
  await page.waitForSelector('[data-tegaki-ready]');
  const lognormalBuf = await page.locator('[data-tegaki-preview]').screenshot();

  // They should differ (different timing → different partial stroke rendered)
  // Use perceptual hash or raw pixel diff
  const diffRatio = computePixelDiffRatio(constantBuf, lognormalBuf);
  expect(diffRatio).toBeGreaterThan(0.02); // at least 2% pixels differ
});
```

### 8-3. Phase 3-5 snapshot 無変更確認（ラテン退行検知）

```bash
# Caveat 50 字の既存 snapshot が Phase 5 から変わっていないこと
bun start generate --family Caveat --chars "$(cat packages/generator/fixtures/snapshots/caveat-50-chars.txt)" --output /tmp/caveat-p6
diff /tmp/caveat-p6/glyphData.json packages/generator/fixtures/snapshots/caveat-50.json
# expect: 0 byte diff
```

### 8-4. パフォーマンス再測定（[NFR-1.4](../requirements.md)）

```bash
# Phase 5 benchmark の再走、+20% 以内維持確認
export PHASE6_BENCH_CHARS="右左田必学校書人大小上下日月火水木金土本春夏秋冬東西南北国民時分午後前年月日子女男"
time bun start generate --family "Noto Sans JP" --chars "$PHASE6_BENCH_CHARS" --dataset kanjivg --rhythm constant --output /tmp/bench-p6-c
time bun start generate --family "Noto Sans JP" --chars "$PHASE6_BENCH_CHARS" --dataset kanjivg --rhythm lognormal --output /tmp/bench-p6-l
# ratio (lognormal / constant) <= 1.20
```

### 8-5. PreviewApp 準備完了 data 属性の追加

Playwright が安定してスクリーンショットを取るためには、描画完了タイミングの明示的シグナルが必要。

```tsx
// packages/website/src/components/PreviewApp.tsx (差分)
// TegakiEngine の onReady コールバック内で data-tegaki-ready="1" を setAttribute
// 初期 render で未定義 → TegakiBundle / FontFace ロード完了 + 初回フレーム描画後に "1"
```

### 8-6. 失敗時の切り分け

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| §8-1 baseline diff 発生 | Phase 5 rhythm 変更の副作用 | `--update-snapshots` で再生成、diff を commit で明示 |
| §8-1 flaky（実行ごと異なる） | フォントレンダリングのサブピクセル差、rAF タイミング | `maxDiffPixelRatio: 0.02` に緩和、または `scale: 'css'` 指定 |
| §8-2 diff ratio 不足 | `se=lognormal` が適用されていない（URL state parse 失敗） | `parseUrlState()` で `se` 値を console log 確認 |
| §8-3 ラテン snapshot diff | Phase 5 `useLognormal` 分岐の漏れ | Phase 5 §9-B 後方互換テストを再実行 |
| §8-4 ratio > 1.2 | Phase 5 からの劣化 | `strokeParams()` の polyline ループ位置確認 |
| §8-5 `data-tegaki-ready` 検知失敗 | onReady callback 発火タイミング | `waitForFunction` で `window.tegakiReady === true` に代替 |
| Playwright CI 失敗 | chromium install 失敗、ポート競合 | GitHub Actions で `--with-deps` 指定、dev server の port 変更 |

---

## §9. 懸念事項とリスク

本 Phase は**人的評価ループ**を含む初の Phase で、機械検証だけでは担保できないリスクが中核。7 項目に整理。

### 9-A: 評価者確保の失敗

- **影響**: **最大**（評価ができなければ本 Phase の最大成果物 MOS が得られず、Phase 8 リリース判断を先延ばし）。[要件 6-1](../requirements.md) で「評価者 3-5 名が確保できる」が前提条件として明示されているが、本 Phase でこれが破綻した場合の代替案は存在しない。
- **根本原因**: 個人 OSS プロジェクトで専門的評価者への謝礼予算がない、友人知人のスケジュール調整失敗、Remote で日本語書字検証のモチベーションが得られない等。
- **対策**: 
  1. **Day 0 時点で評価者 3 名の確約を得てから本 Phase 着手**（Day 0 チェックポイント）
  2. 評価所要時間を 30-45 分以内に収める（Google Forms で 20 字の 3 質問 = 60 項目、1 項目 30 秒換算）
  3. オンライン非同期評価で時差問題解消（Gist / Notion のコメント機能利用）
  4. 謝礼は金銭ではなく「プロジェクトへの crediting」（Phase 7 `japanese-support.md` に記名可）
- **残余リスク**: 中。Day 0 時点で 2 名しか確保できない場合、Phase を 1 週間延長するか、§11 案 F（LLM 評価）に部分移行するか判断が必要。

### 9-B: σ/μ チューニングの振動（2 ラウンドで収束しない）

- **影響**: 中〜高。Phase 5 §9-A の継続リスクで、「ラウンド 1 で低評価字を調整 → ラウンド 2 で別の字が低評価に」という振動が発生すると収束しない。
- **根本原因**: (1) 全字共通 σ/μ が日本字全体で最適解を持たない可能性、(2) 評価者間で最良 σ/μ の合意形成失敗、(3) 終端種別別パラメタ（Phase 5 §3-3）の補正が十分でない。
- **対策**:
  1. **2 ラウンド以内の収束を厳守**、非収束時は現状値据置で Phase 7/8 へ
  2. ラウンド 1 で複数の σ/μ 候補を並行評価（A/B test 形式、§11 案 D の部分導入）
  3. 終端種別別補正の再設定（Phase 5 §3-3 の 5 行表を本 Phase で更新）
  4. 仮名は別プロファイル（Phase 5 §12-1-2 #4「仮名の rhythm 違和感」）として逃がす（案 E への部分移行）
- **残余リスク**: 中。非収束時は Phase 7 でドキュメント側に「既知の調整余地」として明記し、Phase 8 でユーザー feedback 駆動で改善。

### 9-C: Playwright flaky の CI 信頼性低下

- **影響**: 中。`toHaveScreenshot` は OS / GPU / フォントバージョンでサブピクセル差が出やすく、CI で不定期に赤くなると開発速度低下。
- **根本原因**: (1) Ubuntu runner のフォント環境と開発者ローカルの違い、(2) rAF と Playwright スクリーンショット取得のタイミング競合、(3) CSS animation の精度。
- **対策**:
  1. `maxDiffPixelRatio: 0.01` で 1% 許容、必要なら `0.02` まで緩和
  2. `waitForSelector('[data-tegaki-ready]')` + `page.waitForTimeout(100)` で描画安定を待つ
  3. Playwright 実行環境を GitHub Actions の固定 ubuntu-latest に限定、フォントは `fonts-noto-cjk` を明示 install
  4. flaky 頻発時は retries: 2 → 3 に緩和
- **残余リスク**: 低〜中。CI retries で吸収、flaky 5% を超える場合は baseline 再生成ルールを明文化。

### 9-D: 主観評価の個人差

- **影響**: 中。3-5 名の評価者間で極端な意見差（例: 1 名が「完璧」4 名が「違和感」）があると平均 MOS が信頼できない。
- **根本原因**: 日本語書字経験の個人差、習字流派差、高解像度 / 低解像度ディスプレイの違い。
- **対策**:
  1. 評価者スクリーニング（日本語母語 + 書字経験 10 年以上）
  2. bootstrap 95% CI で不確実性を数値化、CI が広すぎる字は追加評価者で確認
  3. 評価者間の相関係数（Kendall's W）を計算、低い字は個別協議
  4. 外れ値評価者 1 名は統計解析時に除外可（事後的なバイアス防止のため、事前ルール明示）
- **残余リスク**: 低。bootstrap CI と外れ値除外ルールで吸収。

### 9-E: KanjiVG 誤り字の扱いで fix-overrides 機構の肥大化

- **影響**: 低〜中。娩・庫・炭の 3 字対応が本 Phase スコープ、だが評価者が追加の誤り字を発見した場合にスコープが膨らむ。
- **根本原因**: [R-1](../requirements.md) 対策として全字の誤り可能性を本 Phase で洗い出すのは工数上不可能。
- **対策**:
  1. 本 Phase は **機構の雛形のみ**（JSON 空 or 1 字）、実データ追加は Phase 8+ のユーザー報告駆動
  2. §12 申し送りで「追加誤り字報告時の overrides 追加手順」を明文化
  3. KanjiVG 上流（kanjivg/kanjivg GitHub）に issue 化してメンテナ側修正も促進
- **残余リスク**: 低。機構があれば後からいつでも追加可能。

### 9-F: メトリクス計算の「実データ vs 合成データ」の対照不在

- **影響**: 中。`computeSNR` は「参照データ v_ref」が必要だが、Tegaki は参照筆記データ（タブレット収録の実速度プロファイル）を持っていない。
- **根本原因**: Phase 1-5 でオンライン手書きデータセット（Kondate / IAM-OnDB 等）を採用していない（[technical-validation.md §2-5](../technical-validation.md) ライセンス課題）。
- **対策**:
  1. SNR は**内部一致検証**のみ実施（同一 σ/μ で 2 回生成して自己差分が 0、再現性テスト）
  2. 実データ比較が必要な場合は §11 案 C / 案 E の将来実装に委譲
  3. 残り 4 メトリクス（peak-speed ratio / skewness / KS / MOS）は合成データで Plamondon 理論値と比較、実用上十分
- **残余リスク**: 中。Phase 6 の SNR は「リグレッション検知用途」として割り切り、Phase 12+ で ML 統合時に再評価。

### 9-G: Phase 7 ドキュメント作業との接続不足

- **影響**: 低〜中。本 Phase の評価結果が Phase 7 の「既知の限界」節に十分な根拠で反映されないと、ユーザー向けドキュメントの質が下がる。
- **根本原因**: 本 Phase 終了時点の残課題リストが曖昧だと、Phase 7 で何を書くべきか不明確になる。
- **対策**:
  1. §12-2 で Phase 7 への具体的申し送り（問題字 + 現象 + 暫定対応）を整備
  2. `docs/japanese-support.md` の「既知の限界」節を本 Phase 内で書き始める（完成は Phase 7）
  3. 評価レポート `phase-6-validation-report.md` を Phase 7 の参照元として公開
- **残余リスク**: 低。§12-2 整備と Phase 7 チケットの連携で吸収。

---

## §10. レビュー項目

PR レビュー時のチェックリスト。**主観評価・客観メトリクス・視覚回帰・fix-overrides の 4 観点で独立 LGTM**。

### 10-1. 主観評価（MOS）の厳密性観点（#1 + #4 が LGTM）

- [ ] 評価者 3-5 名の属性（日本語母語、書字経験）が記録されている
- [ ] 評価シートが 20 字 × 3 質問（筆順 / リズム / 全体）の構造で統一
- [ ] サンプルサイズが bootstrap 95% CI の幅で妥当（CI 幅 ≤ 1.0 スコア）
- [ ] 評価者間相関係数（Kendall's W）が 0.5 以上、または低い字で個別協議済
- [ ] 明らかな異常 0 件の主張が目視記録で裏付けられる
- [ ] 低評価字（MOS < 4.0）のリストと改善対応が記録

### 10-2. 客観メトリクスの観点（#3 が LGTM、#1 が cross-check）

- [ ] `computeSNR`, `peakSpeedRatio`, `velocitySkewness`, `ksPauseDistance`, `aggregateMOS` の 5 関数が全て export
- [ ] T-17〜T-21 ユニットテストが全通
- [ ] bootstrap CI 実装が正しい（resample 数 ≥ 1000、95% 分位点で CI 境界）
- [ ] 歪度計算が Fisher-Pearson 定義（サンプル分散を n-1 で除する）
- [ ] KS 距離が empirical CDF 差の max で計算（Kolmogorov-Smirnov 定義準拠）
- [ ] 数値演算の浮動小数誤差（`Number.EPSILON` レベル）が許容範囲
- [ ] メトリクス関数が純関数（副作用なし、同一入力で同一出力）

### 10-3. 視覚回帰（Playwright）の安定性観点（#2 が LGTM）

- [ ] GitHub Actions で 10 回連続 green（flaky 率 ≤ 10%）
- [ ] 60 snapshot が git commit、baseline が正しい字形を描画
- [ ] `maxDiffPixelRatio: 0.01` または明示的に緩和理由記載
- [ ] `data-tegaki-ready` 属性で描画完了を待つ実装が入っている
- [ ] PR で baseline 更新時は `--update-snapshots` の commit 単独化
- [ ] dev server 起動失敗時の `timeout: 60_000` が十分
- [ ] `actions/upload-artifact` で失敗時のレポートが取得可能

### 10-4. fix-overrides 機構の観点（#4 + #1 が LGTM）

- [ ] `packages/dataset-cjk-kanjivg/src/fix-overrides.json` が存在、スキーマ明示
- [ ] 初期 overrides は空 or 目視検証済みの 1-3 字のみ
- [ ] `fix-overrides.ts` ローダーが JSON 欠損時に空 object を返す（fail-safe）
- [ ] `parseKanjiSvg` 内の適用フックが KanjiVG 経路を壊さない（T-22）
- [ ] 上書き根拠（文部科学省準拠資料）が reason フィールドに記録
- [ ] Phase 8+ の追加手順が §12 申し送り or README に明示
- [ ] KanjiVG 上流への issue 化検討が記録されている

### 10-5. 実装規約観点（全員）

- [ ] `.ts` 拡張子 import、`import * as z from 'zod/v4'`、Biome 準拠
- [ ] `bun typecheck && bun run test && bun check` exit 0
- [ ] `bun --filter @tegaki/website e2e` exit 0
- [ ] 新規 `*.ts` に対応する `*.test.ts` が存在
- [ ] `docs/phase-6-validation-report.md` が commit
- [ ] `docs/japanese-support.md` 既知の限界節が追記
- [ ] `docs/tickets/README.md` のステータス更新

---

## §11. 一から作り直す場合の設計思想

> Phase 6 は主観評価と客観メトリクスの**両輪設計**であり、Phase 1-5 の「今増やす自由度は必要分だけ」という原則を**評価方法論**に垂直延長する Phase。判断軸は **(1) 5 日予算で完走できるか、(2) AC-3 を機械的に満たせるか、(3) 将来の continuous validation に段階昇格できるか、(4) 1 年後・3 年後の自分が後悔しないか、(5) [Phase 5 §12-1-2](./phase-5-rhythm-synthesis.md) の 5 件の既知不自然さパターンを各案が拾えるか**の 5 点で全案を採点する。旧版 6 案（A-F）の試算には楽観バイアスと過小見積が残っていたため、本版で**案 G（日本語手書き認識器による逆認識）**と**案 H（GitHub Actions による継続運用化）**を追加、8 案に拡張した上で最終章で「私ならこうする」を断言する。

### 11-1. 設計空間の全体像（8 案）

評価方法論は **主観 vs 客観 × 小規模 vs 大規模 × 人的 vs 自動 × 単発 vs 継続** の 4 軸で 8 案に整理できる。旧版の 3 軸では「継続性」を欠いており、1 度きりの評価が 3 年後には再現困難になる盲点があった。継続性軸を追加し、案 H をその最上位レイヤに配置する。

| 案 | 本質 | 主観/客観 | 規模 | 自動化度 | 継続性 |
|---|---|---|---|---|---|
| **A** | **現行: MOS + 視覚回帰の組合せ**（評価者 3-5 名 + Playwright baselines） | 主観 + 客観 | 小規模 | 中 | 単発 |
| **B** | **完全自動化**（評価メトリクスのみ、人的評価なし） | 客観のみ | — | 高 | 単発 |
| **C** | **大規模 crowdsourcing**（100 名超、Lancers / 大学協力） | 主観（大規模） | 大規模 | 中 | 単発 |
| **D** | **A/B test framework**（旧版との直接比較、Phase 3 以前 vs Phase 5 以後） | 主観（相対評価） | 小〜中規模 | 中 | 単発 |
| **E** | **教育工学データセットで客観評価**（教科書・書道動画との機械比較） | 客観（外部基準） | — | 高 | 単発 |
| **F** | **LLM による自然さ評価**（Claude/GPT-4 に画像を投げて 5 段階評価） | 半自動（AI 擬似主観） | — | 高 | 単発 |
| **G** | **日本語 HWR モデルによる逆認識**（ETL/TUAT 由来 OCR で生成物を認識、認識率で自然さを近似） | 客観（認識器基準） | — | 高 | 単発 |
| **H** | **GitHub Actions 継続運用化**（PR 毎に VRT + metrics + 案 F/G を自動実行） | 客観（継続） | — | 極高 | **継続** |

抽象化階層: **人的スモール（A/D）＜ 自動化スモール（B/E/F/G）＜ 人的大規模（C）＜ 継続自動化（H）**。案 H は単発評価 A-G の**上位レイヤ**として機能し、単発評価を PR 駆動の継続評価に変換する meta-案である。

### 11-2. 定量比較

> **数値の根拠と信頼度凡例**:
> - **（実測）** — 本 Phase 仕様で計算済み
> - **（推定）** — 類似 UX Research / OSS benchmark / 論文からの類推
> - **（契約）** — [AC-3](../requirements.md) / [KPI](../requirements.md) で確定した boolean

| 指標 | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| **実装行数**（本 Phase） | ~300 | ~200 | ~400 | ~350 | ~250 | ~150 | ~220（ETL loader + CNN 推論） | ~180（CI YAML + runner 配線） |
| **Phase 6 工数** | **5 日**（予算） | 3 日 | 10-15 日 | 7-8 日 | 6-8 日 | 4 日 | 5-7 日（ETL 前処理含む） | 3-4 日（A/F/G 成果物前提） |
| **人的評価の必要性** | 3-5 名 | 不要 | **100 名超** | 5-10 名 | 不要 | 不要 | 不要 | 不要 |
| **統計的厳密性**（CI 幅） | 中（N=3-5 で bootstrap CI ≈ ±1.0） | 低 | **高**（N=100+ で CI ≈ ±0.2） | 中 | 低〜中 | 中（±0.5） | 中（認識率 ±3-5%） | —（meta） |
| **Plamondon 数式との一致**（§2-7 メトリクス） | ◎ | ◎ | ○ | △ | ◎ | △ | ○ | ◎（継承） |
| **自然さ主観評価の捕捉** | **◎** | **×** | **◎◎** | ○ | × | ○ | △（認識率は近似） | ×（単体では） |
| **[§12-1-2](./phase-5-rhythm-synthesis.md) 5 パターン捕捉率** | **5/5**（MOS 字別 + 自由記述） | 2/5（短画 tome / pause のみ数値化可） | **5/5**（N=100 で統計強度） | 4/5（仮名除く相対比較） | 3/5（筆順・速度・画数） | 4/5（LLM 自由記述で 3-5 拾える可能性） | 2/5（認識率は rhythm に鈍感） | 継承（A/F/G に依存） |
| **コスト（金銭）** | 0 円（友人知人、§9-A で失敗時保険必要） | 0 円 | **¥39K-150K**（品質フィルタ込み見直し） | ¥0-5K | ¥5-20K（教科書）+ CV 実装 | US$1.4-6（精密化、旧 US$4 は 2x 余裕） | 0 円（ETL 学術無償、CPU 推論） | 月 US$10-30（Actions 分 + API） |
| **5 日予算内完走** | ✅ | ✅ | ❌ | ◎ ギリギリ | △（CV 実装で超過） | ✅ | △（ETL 前処理が律速、Phase 7 初日分割推奨） | ✅ ただし A/F/G 完了後 |
| **AC-3 §1 達成可能性** | ✅ | ❌ | **✅◎** | △ | ❌ | △ | ❌（認識率は MOS ではない） | —（他案に被せるだけ） |
| **AC-3 §2 達成可能性**（異常検知） | ✅ | ○ | ✅ | ✅ | ○ | ○ | **◎**（認識失敗 = 強い異常信号） | **◎◎**（退行検知で継続異常補足） |
| **AC-3 §3 達成可能性**（既知の限界） | ✅ | △ | ✅ | ○ | ○ | △ | ○（認識失敗字で具体限界） | ✅（CI ログ時系列で蓄積） |
| **再現性**（3 ヶ月後） | 中（評価者再召集） | **◎** | 低 | ○ | ◎ | ○（モデル固定で） | **◎**（モデル + seed 固定で決定的） | **◎◎**（git commit 単位で完全再現） |
| **Phase 7 ドキュメント原資** | ◎ | 低 | ◎◎ | ○ | ○ | △ | ○（「ETL9B 認識率 X%」定量主張可） | ◎（CI バッジでリリースノート補強） |
| **1 年後の保守コスト** | 低 | 極低 | 高 | 中 | 低 | 低 | 低 | **極低**（CI が自動代行） |
| **3 年後の拡張余地** | E/C/D 併用可 | ML 判断基盤 | 定期 crowdsourcing | continuous A/B | データ増強 | LLM 精度向上 | HWR モデル更新で追従 | 全単発案を包摂 |
| **倫理・IRB 負担** | 軽 | 0 | **重**（IRB + consent form、学術公表なら所属機関審査） | 軽 | 0 | 0（LLM 利用規約のみ） | 0（ETL 学術利用 OK、TUAT は要許諾） | 0 |

### 11-3. 各案の要点

**案 A（現行: MOS + 視覚回帰）** — Phase 5 §12-1 / Phase 6 §3 の仕様。MOS で主観捕捉、Playwright で機械検証、bootstrap CI で統計的厳密性を一部確保。
- **利点**: 予算内完走 ◎、OSS 単独メンテ体制と整合、Phase 8 リリース判断に必要最小十分、倫理負担軽。
- **欠点**: N=3-5 で CI 幅が広い（±1.0）、評価者個人差の影響大、統計的確信度は中程度。
- **§12-1-2 接続**: 5/5 字別 MOS + 自由記述で全パターン拾える。問題字発見 → fix-overrides / σ/μ 調整に直結。
- **失敗モード**: 評価者確保失敗（§9-A）、σ/μ 振動（§9-B）。
- **コスト試算の楽観性検証**: 「0 円」は友人知人 3-5 名が即日確保できる前提。§9-A でリスク明示されているため純粋な 0 円前提は甘く、保険として案 F/G 併用を前提にすると実質 +¥600 程度の LLM API / 認識器コスト負担が発生する。

**案 B（完全自動化、客観メトリクスのみ）** — 人的評価を排除し、メトリクス 5 種 + Plamondon 理論値との比較のみで合否判定。
- **利点**: 予算内完走、完全再現性、倫理負担 0。
- **欠点**: **AC-3 §1「日本人評価者 MOS ≥ 4.0」の達成が原理的に不可能**（要件違反）、§12-1-2 のうち「仮名 rhythm 違和感」「連続 harai 差別化不足」は数値 metric に落ちず捕捉不可。
- **§12-1-2 接続**: 2/5（短画 tome の急減速は速度プロファイル、pause は `sampleLognormalPause` 分布で数値化可）。残 3 パターンは主観領域。
- **失敗モード**: 要件充足失敗、Phase 8 リリース判断で「この評価は本当に人間評価か？」と問い直される。
- **Phase 6 不採用根拠**: AC-3 要件と直接衝突。

**案 C（大規模 crowdsourcing）— コスト試算の再検証**:

- **想定サービスと品質フィルタ後の実効 N**:

  | プラットフォーム | 単価 | 100 名で合計 | 品質フィルタ後の実効 N | 日本語話者確保容易性 |
  |---|---|---|---|---|
  | Amazon MTurk | US$0.50-2.00 / 20 字 | US$50-200 | 日本語 Worker 少で実効 N=30-50 | 低 |
  | Lancers / CrowdWorks | ¥300-800 / 20 字 | ¥30,000-80,000 | attention check 失敗 20-30% 脱落 → 実効 N=70-80、N=100 確保なら **¥39,000-104,000** | **高** |
  | Prolific | £0.50-1.50 / 20 字 | £50-150 | 日本居住者限定で候補枯渇 | 中 |
  | 大学学生協力 | 謝礼品 ¥500-1,500 / 人 | ¥50,000-150,000 | 学内倫理審査で +2-4 週間 | 高 |

- **旧版試算の誤りと訂正**:
  - 下限 ¥30,000 は「Lancers で N=100 ぴったり」前提だったが、品質フィルタ（attention check）で 20-30% 脱落するため **N=130 確保が必要 → ¥39,000 下限**
  - IRB を「Lancers 契約ベースで軽い」としていたが、学術利用で公表する場合は所属機関倫理審査が必須になるケースあり、**下限工数も +2 日**（審査書類作成）
  - 真のコスト下限は **¥39,000 + 7-10 日**、旧版の「5-8 日 + ¥30,000」から悪化

- **§12-1-2 接続**: 5/5（N=100 で字別 / パターン別に統計強度あり）
- **利点**: N=100+ で CI ≈ ±0.2、AC-3 §1 を余裕で充足、Phase 7 原資豊富、「一般ユーザー体験」に近い。
- **欠点**: OSS 体制の金銭負担超過、IRB 負担、低品質応答の除外コスト、attention check 設計コスト。
- **Phase 6 不採用根拠**: 予算 2-3 倍超過、金銭コストが OSS 常識的範囲超、Phase 12+ 商用展開時に改めて発動が素直。

**案 D（A/B test framework、旧版との比較）** — Phase 3-4-5 各版の描画を並列表示し、評価者に相対選好を問う（「どっちが自然？」）。
- **利点**: 相対評価は絶対 MOS より個人差が小、Phase 5 rhythm の寄与を定量化できる（Phase 3 等速 vs Phase 5 lognormal）、Phase 8 リリース判断で「改善効果あり」の説得力。
- **欠点**: AC-3 の絶対 MOS ≥ 4.0 に直接応答不可（相対順位のみ）、並列 UI + URL state rhythm 切替で実装コスト高。
- **§12-1-2 接続**: 4/5（短画 tome / harai / curvature / pause は旧版 vs 現行で比較可、仮名は旧版も全 `default` なので差分なし）。
- **Phase 6 不採用根拠**: 案 A の MOS と両立不可（評価者負担倍増）、Phase 7+ documentation 時に限定採用が整合。

**案 E（教育工学データセットで客観評価）— 実現性の再検証**:

- **想定データセットと実装コストの再見積**:

  | データセット | 内容 | 本 Phase 予算内 | 実装コストの再見積 |
  |---|---|---|---|
  | 小学校書写教科書 動画/画像 | 文部科学省採択 8 社 × 1-6 年 | ¥5-15K で入手可 | 書写教科書は**紙ベースで動画収録なし** → 速度プロファイル比較は原理的不可、stroke order diagram のみ利用可 |
  | NINJAL「筆順指導の手びき」 | 1958 原典 | 0 円、機械化に 5 日 | PDF スキャン → OCR → stroke vector 抽出で追加 3-5 日、**単独で予算超過** |
  | 書道家 YouTube 動画 | 個別筆致 | 0 円 | フレーム抽出 + 速度ベクトル推定（CV）で +5-10 日、ライセンス個別確認 |
  | 日本語学習アプリ動画（Anki 等） | 学習者向け | Fair use 内 | アプリごとの抽出スクリプト必要、構造化データなし |

- **旧版試算の誤りと訂正**: 「¥5-15K で主要教科書入手 + CV 処理 5-10 日」としていたが、教科書は動画ではなく**静止画 stroke order diagram** のみ。速度比較は書道 YouTube or 学習アプリ動画に限定され、ライセンス確認 + CV 実装で **実質 10-15 日**、旧版 6-8 日から実質ほぼ倍増。
- **比較指標**: 筆順一致率（DTW 距離）、速度プロファイル類似度（SNR）、ストローク数一致率（画数）。
- **§12-1-2 接続**: 3/5（筆順と画数、速度一部）。rhythm 系パターンは書道家の個性と区別不能。
- **利点**: 人的評価ゼロで客観基準との比較、Phase 10+ ML 学習データとして活用可、「教科書と一致率 X%」の定量主張可。
- **欠点**: AC-3 §1 の MOS ≥ 4.0 は充足不可、CV 実装コスト大、ライセンス精査の工数。
- **Phase 6 不採用根拠**: AC-3 §1 と直接対応しない、CV 実装で予算大幅超過、Phase 10+ ML 統合時の補助指標として発動。

**案 F（LLM による自然さ評価）— 2026 年時点の現実性の再評価**:

- **想定プロンプト**:

  ```
  以下は漢字「書」を描画するアニメーション動画（5 秒）のスクリーンショット 10 枚です。
  日本語母語話者の視点で、この手書きアニメーションの「自然さ」を 1-5 段階で評価してください。
  評価基準:
  - 5: 実際の手書きと見分けがつかない
  - 4: やや機械的だが自然と言える
  - 3: ぎこちなさがあるが許容範囲
  - 2: 明らかに機械的
  - 1: 全く手書きに見えない

  また、気づいた異常（画抜け、逆方向、リズム不自然）があれば自由記述してください。
  ```

- **評価エンジン候補（2026 年時点）**:

  | モデル | 画像入力 | 動画入力 | コスト / 字 | 日本語手書き評価の実証 | 本 Phase 適合 |
  |---|---|---|---|---|---|
  | Claude Opus 4.7 | ✅ | ❌（10 枚静止画で代替） | US$0.07-0.10 | **未確立**（一般画像評価の日本語 benchmark はあるが、手書きアニメ評価は未検証） | **本命**（補助として） |
  | GPT-4o / 4.1 / 5 | ✅ | 一部 | US$0.05-0.20 | 同上 | 候補 |
  | Gemini 2.5 Pro | ✅ | ✅ | 無料枠 + 有償 | 同上、動画直接入力が利点 | 動画評価の試験採用 |

- **コスト内訳の精密化**: Claude Opus 4.7 の画像入力は ~US$0.005/枚（1024x1024 相当）、10 枚/字 × 20 字 = 200 枚 = US$1.0。プロンプト tokens（入力 ~500 + 出力 ~300）× 20 字 × US$10/M input + US$50/M output で約 US$0.4。合計 **US$1.4-2.0**、旧版 US$4 は 2 倍の余裕を含んでいた。3 試行の評価者間一致 κ 算出で ×3 しても **US$6 以下**。

- **Claude / GPT-4 視覚能力の限界（新たに強調）**:
  - **学習分布外**: 2026 年の top-tier モデルでも「手書きアニメーションの自然さ」は学習データに存在しない領域。プリント体 OCR や一般画像 caption の精度 ≠ 手書き自然さ評価精度。
  - **10 枚静止画による動画近似の情報損失**: rhythm（pause タイミング、tome/hane 急減速）は 10 フレームだと aliasing で消失。Gemini 2.5 Pro の動画入力は視覚的 rhythm を拾える可能性があるが、一貫性検証が別途必要。
  - **プロンプト sensitivity**: 「自然さ 1-5」の anchor point が曖昧、同一画像でも再試行で σ ≈ 0.3-0.5（temperature=0 でも完全決定的ではない）。
  - **経時 drift**: モデル更新で評価値変動、3 ヶ月後の再評価で同一画像の MOS が変わる。seed + temperature=0 + **モデルバージョン pinning**（例: `claude-opus-4-7-20260101`）が必須。

- **§12-1-2 接続**: 4/5（1 短画 tome / 2 harai 差別化 / 3 curvature / 5 pause は自由記述で拾える可能性。4 仮名 rhythm は「日本語母語話者の違和感」に LLM が敏感な保証なし）。
- **Phase 6 併用根拠**: AC-3 §1「日本人評価者」とは定義上不一致だが、評価者確保失敗時の予備チャネルとして意義大、実装コスト US$6 + 0.5 日で吸収可能。

**案 G（日本語 HWR 認識器による逆認識）— 新規追加**:

Phase 6 生成物（描画の最終フレーム静止画 or アニメーション終了時の完成形）を日本語手書き文字認識器に入力し、**正解文字と認識結果の一致率**を自然さの客観近似指標とする。「自然な手書き ⇔ 認識器が高精度で認識できる」という仮説に基づく。

- **想定認識モデル / データセット**:

  | モデル / データセット | 由来 | ライセンス | 入手 | ベースライン（人間手書き認識率） |
  |---|---|---|---|---|
  | **ETL Character Database** (ETL1-ETL9) | AIST 産総研、1973-1984 収集 | 学術利用無償（要申請） | https://etlcdb.db.aist.go.jp/ | 生データのみ、モデル別途 |
  | **Kondate** (TUAT 中川研) | 農工大、オンライン手書き | 学術利用要許諾 | — | オンライン認識率 ~95% |
  | **HANDS-kuchibue_d-97-06** (TUAT) | 農工大、オンライン | 同上 | — | 認識率 ~92% |
  | **ETL9B 事前学習済 CNN**（OSS 実装） | ETL9B 71 万サンプル 3036 字 | MIT / Apache（個別リポジトリ次第） | GitHub 公開多数、test 精度 ~95% | 参考値 |

- **実装スケッチ**:
  1. Phase 6 生成字 20 字の**最終静止画**を 64x64 二値化で抽出
  2. ETL9B 事前学習済 CNN（公開モデル採用 or 自前 1-2 日再訓練）に入力
  3. **Top-1 / Top-5 認識率**を字別に集計、MOS と相関分析
  4. 加えて**動画フレームごとの認識率推移**（25% / 50% / 75% / 100% 進行時点）で「途中段階で何字に見えるか」を観察、筆順自然さの間接指標とする
- **コスト試算**:
  - ETL9B 取得 + 前処理: 1 日（ライセンス申請は平日即日発行）
  - 認識モデル（公開 Keras 実装採用）組込: 1-2 日
  - 評価スクリプト + レポート: 1-2 日
  - **合計 5-7 日**、金銭コスト 0 円、GPU 不要（CPU 推論で十分）
- **利点**:
  - 人的評価ゼロで**完全再現性**、CI 組込可（案 H と直交）
  - 「認識率 ≥ X%」の定量主張で Phase 7 原資強化
  - §12-1-2 パターン 3（「鬱」等の curvature 破綻）は認識失敗で検知可能、**強い異常信号**
  - 案 A/F と相関しない**独立情報源** — 併用価値が高い
- **欠点**:
  - 認識率は自然さの近似指標で MOS と等価ではない: 認識器は静止画の「形」を評価、rhythm には鈍感。§12-1-2 パターン 1/2/5（tome/harai/pause）は捕捉不可
  - ETL9B は清書体（教科書体）訓練、手書き風アニメ最終フレームは**訓練分布外**で認識率が不当に低下する可能性（False negative）
  - 仮名は ETL1/ETL6、パターン 4「仮名 rhythm」は静止画では検知不可
  - AC-3 §1「日本人評価者 MOS」とは直接対応しない補助指標
- **§12-1-2 接続**: 2/5（パターン 3 curvature 破綻、異常検知全般）。rhythm 系には鈍感。
- **Phase 6 採用判断**: **補助として採用候補**。案 F と組合せて「2 系統の自動評価 + 人的 MOS」の三本柱を形成。単独では AC-3 §1 不達。

**案 H（GitHub Actions による継続運用化）— 新規追加**:

旧版 §11-6 で「Playwright 拡張」として軽く触れていた CI 化を**独立した案**に昇格。本 Phase 成果物（metrics / Playwright / 案 F / 案 G）を **PR 毎に自動実行**する workflow を整備し、単発評価を継続評価に変換する meta-案。

- **ジョブ構成**:

  | ジョブ | 実行タイミング | 実体 | 目標実行時間 | コスト（GitHub Actions 無料枠 2,000 分/月 前提） |
  |---|---|---|---|---|
  | **VRT**（Playwright baselines） | 全 PR + main merge | 20 字 × 3 ブラウザの snapshot 比較 | 3-5 分 | 月 ~300 分（50 PR × 6 分） |
  | **Metrics 退行検知** | 全 PR | `compareToBaseline()` で Plamondon 5 メトリクス | 1-2 分 | 月 ~100 分 |
  | **案 F（LLM 評価）** | main merge + release tag | Claude API 呼出 20 字 × 1 試行 | 3-5 分 | 月 US$6-10 + 200 分 |
  | **案 G（HWR 認識）** | 全 PR | ETL9B pre-trained CNN 推論 | 1-2 分 | 月 ~100 分（CPU 推論） |
  | **Nightly 統合レポート** | cron daily | 全字 × 全評価系の dashboard 生成 | 10-15 分 | 月 ~450 分 |

  **合計月間 ~1,150 分、無料枠内**。LLM API は月 US$10-30 に収まる（release tag 起動頻度次第）。

- **実装スケッチ**:
  - `.github/workflows/validation.yml` に 5 ジョブ、`workflow_dispatch` で手動再実行可能
  - baseline 更新は専用 PR ラベル `update-baselines` で opt-in 再生成
  - 退行検知時は PR に自動コメント（「字 "書" の速度プロファイル SNR が baseline 比 15% 悪化」など）
  - nightly レポートは GitHub Pages で公開、時系列 dashboard で品質トレンド可視化
- **コスト試算**:
  - 本 Phase 工数: **3-4 日**（案 A / F / G の単発実装完了が前提）
  - 月間ランニング: GitHub Actions 無料枠内 + LLM API US$10-30
  - 初期実装で済み、継続コストは実質ゼロ
- **利点（最大の価値）**:
  - Phase 6 で確立したベースラインが **Phase 7/8/9/10 全期間で自動維持**、σ/μ 更新や fix-overrides 追加の副作用を即検知
  - **継続性** = 単発評価 A-G の弱点（1 回きりの結果）を根本解決、3 年後の保守コスト激減
  - Phase 7 の σ/μ 微調整 PR / fix-overrides 追加 PR / 新規フォント追加 PR のすべてに品質ゲート
  - AC-3 §2「異常検知」を **PR レベルで先制対応**、Phase 8 以降の「リリース後に発覚」シナリオを事前排除
  - リリースノートに CI バッジを貼ることで Phase 7 ドキュメントと商用展開（Phase 12+）両方で訴求可
- **欠点**:
  - 単独では AC-3 §1（人的 MOS）を満たせず、単発評価 A / F / G との組合せが前提
  - flaky test リスク: Playwright 3 ブラウザ並列で rendering 差異による false positive、[§9](#9-懸念事項とリスク) で既に言及済
  - LLM 評価を CI に載せる場合、API drift でアラート連発の恐れ → モデルバージョン固定 + baseline 変更を月次レビュー化
- **§12-1-2 接続**: 単体では接続なし、案 A / F / G を CI に載せた時点で各案の接続率を継承。
- **Phase 6 採用判断**: **本 Phase 末日に MVP 実装、Phase 7+ で段階拡充**。案 A/F/G の単発結果が出た直後に workflow 化することで、成果が「1 回きりの評価レポート」で終わらず**継続資産**になる。Phase 7 ドキュメント化より優先すべき布石。

### 11-4. 結論: 私ならこうする（断言）

**Phase 6 では案 A + 案 F + 案 G の三本柱を採用し、本 Phase 末日に案 H（CI 化 MVP）で三本柱を自動継続化する**。案 B/C/D/E は本 Phase 不採用、それぞれ段階昇格:

- **案 A**: **本 Phase 主軸**（AC-3 §1 を 5 日予算で達成できる唯一解）
- **案 B**: 永続棚上げ（AC-3 §1 と原理的に衝突）
- **案 C**: Phase 12+（商用展開 + N=100 の価値が証明されたら、品質フィルタ込みで **¥39K-150K + 7-15 日**）
- **案 D**: Phase 7+（ドキュメント用 Phase 3 vs Phase 5 比較 demo 制作時に限定採用）
- **案 E**: Phase 10+（ML 統合時に教育工学データセットを学習データとして活用、CV 実装込み 10-15 日）
- **案 F**: **本 Phase 併用（補助 1）**（US$6 + 0.5 日、案 A 評価者確保失敗時の予備チャネル + §12-1-2 の 4 パターン自由記述拾い）
- **案 G**: **本 Phase 併用（補助 2）**（5-7 日、ETL9B で curvature 破綻字の異常検知、案 F と直交する独立情報源）
- **案 H**: **本 Phase 末日 MVP + Phase 7+ 拡充**（3-4 日、単発評価を継続評価に変換、Phase 8+ 全 PR に品質ゲート）

根拠（断言ベース）:

1. **案 A は AC-3 §1「日本人評価者 MOS ≥ 4.0」を 5 日予算で達成できる唯一解** — 評価者 3-5 名確保は [要件 6-1](../requirements.md) 前提で明示済み、Phase 5 §12-1 の URL セット雛形を拡張するだけで Day 1 運用開始可。
2. **案 F + G 併用で評価者確保失敗時の予備チャネルが二重化** — §9-A リスクに対し、LLM（人間近似）と HWR（客観）の異質な 2 系統でフォロー。案 F 単独では rhythm に強く形に弱い、案 G 単独では形に強く rhythm に弱い、**相補関係**にある。コスト合計 US$6 + 6-8 日で 5 日予算を微超過するため、案 G は Phase 7 初日にスライド可能な 2 段階戦略を採る。
3. **案 H は「評価が 1 回きり」の問題を根本解決** — 単発評価 A/F/G は Phase 6 終了で凍結し、Phase 7+ の σ/μ 微調整や fix-overrides 追加で再現困難になるリスク。CI 化で PR 毎に自動再評価され、**Phase 8 以降の品質維持コストが激減**。3-4 日投資で 3 年分の保守削減、ROI 明確にプラス。
4. **案 C は「具体化」してもなお Phase 6 スコープ外** — 品質フィルタ込みで ¥39K-150K + 7-15 日、旧版見積より更に重く、Phase 12+ 商用展開時に budget 化。
5. **案 B は AC-3 §1 衝突で永続棚上げ** — 「日本人評価者 MOS」要件は本プロジェクトの目的（「日本人が見て違和感のない」）と直結、要件変更確率極めて低い。
6. **案 D / E は Phase 7 / 10+ に段階昇格** — 案 D は demo 制作時限定、案 E は ML 統合時の学習 + benchmark として発動。
7. **§12-1-2 の 5 パターン接続表**:

   | パターン | 案 A | 案 F | 案 G | 案 H（継続） |
   |---|---|---|---|---|
   | 1. 短画 tome 止まりすぎ | ◎字別 MOS | ○自由記述 | × | 案 A/F 継承 |
   | 2. 連続 harai 差別化不足 | ◎「人」専用設問 | ○ | × | 案 A/F 継承 |
   | 3. curvature 破綻「鬱」 | ◎字別 MOS | ○ | **◎認識失敗で強い信号** | 全案継承 |
   | 4. 仮名 rhythm 違和感 | ◎仮名 6 字 MOS | △ | ×（静止画評価不適） | 案 A 継承 |
   | 5. pause ばらつき過多 | ○自由記述 | ○動画全体印象 | × | 案 A/F 継承 |

   **A + F + G 三案併用で 5/5 を全方位捕捉、案 H で CI 化することで回帰防止**。

**Phase 1/2/3/4/5 §11 との整合確認**:

| Phase | §11 結論 | 本 Phase での引継 |
|---|---|---|
| Phase 1 | dataset provider 境界を敷設、案 A で開始 | 本 Phase は `@tegaki/dataset-cjk-kanjivg` に fix-overrides を追加、dataset 境界を尊重 |
| Phase 2 | KanjiVG 自前 parse + 将来 JSON 派生は別 Phase | `parseKanjiSvg` に fix-overrides 適用フック（最小差分 5-10 行） |
| Phase 3 | `datasetSkeleton` + CJK 分岐 + ラテン snapshot 不変 | 視覚回帰でラテン描画が Phase 5 から無変更を機械検証 |
| Phase 4 | pre-built bundle 案 A + variant 命名規則予約 | 仮名 6 字が MOS 評価対象、サイズ退行検知 |
| Phase 5 | 案 A（lognormal remap）+ 案 H（URL state）併設 | 本 Phase で σ/μ チューニング、Phase 5 案 H のスライダ UI を実運用 |
| **Phase 6** | **案 A + F + G 三本柱 + 案 H（CI 化）、B は永続棚上げ、C/D/E は段階昇格** | Phase 7 で案 D（A/B demo）前倒し、Phase 10+ で案 E、Phase 12+ で案 C |

**棄却案の整理**:
- **案 B 永続棚上げ**: AC-3 §1「日本人評価者」要件と直接衝突、要件変更可能性極めて低い。
- **案 C Phase 12+ 昇格**: OSS 単独体制のコスト超過、商用展開前提の大規模評価は時期尚早。
- **案 D Phase 7 部分採用**: ドキュメント demo 制作時に旧版比較を視覚化するために限定採用。
- **案 E Phase 10+ 昇格**: ML 統合 + 教育工学データセットの価値が Phase 10+ 商用展開ビジョンで初めて合う。

**結論要約: 案 A + F + G 三本柱 + 案 H で継続運用化、Phase 7/8/10/12 に D/E/C を段階昇格、B は永続棚上げ**。8 案中 4 案採用（A/F/G/H）、1 案永続棚上げ（B）、3 案段階昇格（D/E/C）。Pareto 最適かつ AC-3 要件機械的充足。

### 11-5. 1 年後・3 年後の視点（検算）

- **1 年後（Phase 7/8 完了、Tegaki v1.0 リリース運用中）**: 案 A MOS ベースライン（平均 4.0+）を案 H で継続モニタリング。新規フォント / 追加字の評価再実施フローが CI で半自動化。案 F（LLM）と案 G（HWR）が副次的に「CI 内の自然さ + 形状回帰検知」として稼働。Phase 7 で案 D（A/B demo）が documentation として完成。
- **3 年後（案 E/C 昇格検討期）**: 教育工学データセット入手性が改善、案 E で客観基準との一致率を定量主張可。ユーザーベース拡大で商用展開が具体化したら案 C（crowdsourcing）で N=100+ 厳密評価を発動。案 H の CI 資産は**3 年通じて稼働継続**、保守ゼロ。
- **3 年後（ML 統合検討期）**: Phase 10+ で `MlStrokeSource` 導入時、案 E データセットを学習データ転用、案 G の HWR モデルで ML 出力の形状妥当性を逆検証。案 H CI が ML 判断基盤として発展。
- **3 年後（プロジェクト停滞シナリオ）**: 案 A は評価結果レポート凍結、案 H の CI が退行検知で稼働継続、保守ゼロ耐久力。**案 H 投資の最大の価値は停滞シナリオでも自動品質維持される点**。

**判断が崩れるシナリオ**:

| シナリオ | 発火条件 | 対応案 | 追加コスト | 事前検知テスト |
|---|---|---|---|---|
| **評価者確保失敗で N=2 以下** | Day 0 で確約得られず | 案 F + G 前倒し、案 A を主要予備に | +1 日 | Day 0 評価者確約チェックポイント |
| **σ/μ 2 ラウンドで非収束** | 平均 MOS 悪化 or 問題字減らず | 現状据置で Phase 7 へ、案 D demo で改善方向示す | +2 日（Phase 7 影響） | ラウンド 2 終了時に評価者相関再確認 |
| **MOS 平均 3.5 未満で AC-3 未達** | ラウンド 2 後 MOS 3.5 | Phase 6 延長、案 C 前倒し or σ/μ 大幅調整 | +5-10 日 | ラウンド 1 で MOS < 3.5 の字が 50% 超 |
| **Playwright CI が flaky 50% 超** | 毎回 3+ テスト失敗 | baseline 緩和 or 視覚回帰を opt-in 化 | +1 日 | CI 10 回連続通過テスト |
| **KanjiVG 誤り字が 3 字超** | 評価中に追加発見 | fix-overrides 追加は Phase 8+ 運用、Phase 6 は機構のみ | 0（予算内） | 評価ラウンド 1 で筆順異常 Q1 のみ集計 |
| **案 F LLM 評価の一貫性 κ < 0.3** | 3 試行で評価ばらつき大 | 案 G 優先、案 F は参考値扱いに格下げ | 0 | 本 Phase 初日に pilot 3 字で κ 算出 |
| **案 G HWR 認識率が清書体バイアスで不当低下** | 手書き風アニメで Top-1 < 70% | ETL9B + 手書き風 augmentation で fine-tune、または認識率比較を断念 | +2 日 | 3 字で pilot、人間手書き認識率と比較 |
| **案 H CI コストが月 US$50 超** | LLM 評価過剰呼出 | release tag 起動に限定、nightly 廃止 | 0 | 月次コストレビュー |
| **商用展開の前倒し要望** | 外部パートナーから MOS 4.5 要求 | 案 C 前倒し + 案 E 併用 | +10-15 日 + ¥39-150K | Phase 8 リリース直後のユーザー要望調査 |

### 11-6. 本 Phase で打っておく将来拡張の布石

- **案 D（A/B test、Phase 7）**: 本 Phase の `evaluation-urls.json` スキーマに `variants` フィールドを予約（現状は `lognormal` / `constant` のみだが `phase3` / `phase5` / `custom` への拡張余地）。
- **案 E（教育工学、Phase 10+）**: `metrics.ts` に `compareToGroundTruth(v_generated, v_reference): Metric[]` の interface を予約（現状は未実装、コメントで TODO 明記）。
- **案 C（crowdsourcing、Phase 12+）**: 評価シートを Google Forms / Notion Form で構築する時点で、MTurk / Lancers 形式（CSV export）への変換容易性を確保。
- **案 F（LLM 評価）**: 本 Phase 併用で実装、Phase 7+ で Claude API / OpenAI API / Gemini API を切替可能な抽象化（`EvaluationEngine` interface）を最小実装で済ませる。モデルバージョン固定を config 化。
- **案 G（HWR 認識）**: 認識モデルを `RecognitionEngine` interface で抽象化、ETL9B → TUAT Kondate → 将来の custom 学習モデルへの差替え余地を確保、重みは git-lfs 管理で固定。
- **案 H（CI 化）**: workflow YAML に `strategy.matrix` で字セット / rhythm 設定を pluggable に、Phase 7+ で評価対象拡張時の workflow 書換えを不要化。`workflow_dispatch` で手動再実行のエントリポイントを最初から用意。
- **Playwright 拡張**: `@playwright/test` の `trace: 'on-first-retry'` で自動トレース記録、Phase 8+ のユーザー再現 bug 対応に活用。
- **fix-overrides スキーマ**: Phase 8+ でのユーザー追加報告に対応、JSON Schema を明記（`strokes[].d` / `strokes[].kvgType` / `strokes[].order` の型定義）、Phase 9+ でスクリプト化（ユーザー report → override 追加 PR）予約。

### 11-7. テスト戦略への反映

- **メトリクス関数の参数化テスト**: `describe.each` で σ/μ の複数組合せ（`[0.15, 0.25, 0.35] × [-2.0, -1.6, -1.2]`）を横断、Phase 6 で σ/μ 更新時に同じテストで新値検証可能
- **Playwright baseline の意図的更新フロー**: `--update-snapshots` を commit に含めるときはコミットメッセージに「Phase X の意図的変更」と明示、リグレッションとの区別を自動化
- **評価結果の rerun 可能性**: `evaluation-urls.json` 固定化により、3 ヶ月後に再評価しても同じ URL セットで比較可能
- **MOS 計算の monotonic テスト**: `aggregateMOS` が入力スコアを 1 上げたとき平均が単調増加することをテスト、回帰防止
- **LLM 評価の seed 固定**（案 F）: `temperature=0` + `seed` 固定 + **モデルバージョン pinning** で再現性確保、drift 検知のため baseline 再計算を月 1 回
- **HWR 認識の決定性**（案 G）: モデル重みを git-lfs で固定、推論は CPU eager mode で非決定要素排除、pilot 3 字で基準認識率を記録
- **CI の smoke test**（案 H）: workflow 自体に `validation-workflow-healthcheck.yml` を追加、3 字だけの軽量版で CI が壊れていないかを検知

### 11-8. Phase 1-5 §11 との相互検算

6 Phase 通じての共通原則は「**今回増やす自由度は必要分だけ。将来の自由度は interface 契約だけ先に書く**」。本 Phase でも:

- **今やる**: 案 A（MOS + 視覚回帰）+ 案 F（LLM 補助）+ 案 G（HWR 補助）+ 案 H（CI 化 MVP）
- **契約だけ先に書く**: `evaluation-urls.json` の variants フィールド予約、`metrics.ts` の `compareToGroundTruth` interface 予約、`fix-overrides.json` の JSON Schema、`EvaluationEngine` / `RecognitionEngine` 抽象化、workflow YAML の `strategy.matrix` 拡張余地
- **将来実装**: Phase 7 案 D（A/B demo）、Phase 10+ 案 E（教育工学）、Phase 12+ 案 C（crowdsourcing）
- **永続棚上げ**: 案 B（AC-3 §1 衝突）

**6 Phase 連続整合**:
- Phase 1: workspace 分離案 A + provider interface 布石
- Phase 2: 自作 TS パーサ案 A + provider interface 実装
- Phase 3: 三項分岐案 A + `StrokeSource` interface 布石
- Phase 4: pre-built bundle 案 A + variant 命名規則予約
- Phase 5: 案 A（lognormal remap）+ 案 H（URL state）併設、残 6 案は段階昇格
- **Phase 6: 案 A + F + G 三本柱 + 案 H（CI 化）、B は永続棚上げ、C/D/E は段階昇格**

**案 A + F + G + H の四本柱は「今最小コスト、AC-3 §1 要件充足確実、評価者確保失敗時の予備チャネル二重化、§12-1-2 の 5 パターン全方位捕捉、継続品質維持、将来 C/D/E 昇格の interface 契約済」の Pareto 最適**。さらに案 B を**永続棚上げとして明文化**することで、3 年後の自分が「LLM 精度向上で人的評価を不要にする」誘惑に駆られたとき「Phase 6 §11-4 で AC-3 §1 と衝突と決定した」と差し戻せる。Phase 6 は評価方法論だけでなく、**Tegaki が「日本人の目で自然」を主張する正統性の根拠を構築する Phase**、さらに**その正統性を 3 年後まで CI で自動維持する Phase** でもある。

**批判的自己レビュー（本 §11 残リスク）**:
- **案 F + G + H を予算内で吸収可能か** — 回答: 案 F 0.5 日、案 G 5-7 日（うち 2-3 日は Phase 7 初日にスライド可）、案 H 3-4 日（A/F/G 完了後）。本 Phase 予算 5 日では **案 A + F + H MVP が確実に収まり、案 G は Phase 7 Day 0-1 に委譲する 2 段階戦略**が現実的。§1 の 5 日予算を絶対とするなら Phase 6 内は A + F + H MVP、案 G は Phase 7 初日扱い。
- **案 C のコスト試算が ¥39K-150K に膨張、判断に影響するか** — 回答: 個人 OSS で ¥30K 超は Phase 12+ 商用展開時まで延期が妥当、判断は不変。
- **案 B 永続棚上げは強すぎないか** — 回答: AC-3 §1 要件が改訂されない限り妥当。将来「LLM 時代に人的評価不要」という要件改訂が認められるなら、その時点で要件を書き換えた上で案 B 再採用が手続的に正しい。今の時点で要件違反を許容するのは順序が逆。
- **案 F の LLM 視覚能力は 2026 年時点で手書きアニメ評価に足りるか** — 回答: 学習分布外領域のため足りない可能性が高く、だからこそ案 A の**補助**として位置付け、単独採用しない。κ < 0.3 シナリオで案 G にフォールバックする設計でリスク吸収。
- **案 G の HWR 認識率は MOS の代替足りうるか** — 回答: 代替不可、あくまで補助。認識率高 ≠ 自然、認識率低 ⇒ 明確異常、という**片側検知指標**として運用。AC-3 §1 は案 A 依存。
- **案 H の CI ランニングコストは 3 年で積むと US$360-1080、投資に見合うか** — 回答: 3-4 日の初期工数 + 月 US$10-30 で 3 年間の品質維持を自動化、単発再評価で人的工数 3-5 日 × 年 2-3 回相当（案 A 評価者再召集コスト含む）を節約。ROI は明確にプラス。
- **8 案は多すぎないか** — 回答: 4 つの設計軸（主観/客観 × 規模 × 自動化度 × 継続性）を張るには 8 案で最小十分。継続性軸を旧版で欠いていたのが最大の盲点、案 H 追加でカバー。9 案目以降は本質的に既存案の combination（例: 「案 F + 案 H 限定」は案 H 配下の部分集合）なので独立案としての追加は不要。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 7（ドキュメント・サンプル）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **評価結果レポート** | [docs/phase-6-validation-report.md](../phase-6-validation-report.md) | Phase 7 の「ユーザー向け期待値設定」の原資 |
| **既知の限界リスト** | [japanese-support.md](../japanese-support.md) 既知の限界節（本 Phase で追記） | Phase 7 で `guides/japanese.mdx` の「既知の限界」セクションに転記 |
| **σ/μ 最終値** | `constants.ts` の `LOGNORMAL_SIGMA_DEFAULT` / `LOGNORMAL_MU_DEFAULT` | ドキュメントで「手書きのリズムは Plamondon 推奨値 + 本プロジェクトでのチューニング結果（本 Phase ラウンド 2 収束値）」と記述 |
| **問題字リスト**（MOS < 4.0） | 評価レポート §X 参照 | Phase 7 ユーザー向けガイドで「やや機械的に見える字」として明示、期待値調整 |
| **fix-overrides 追加手順** | `packages/dataset-cjk-kanjivg/src/fix-overrides.json` スキーマ + Phase 8 運用ルール | Phase 7 README で「KanjiVG 誤り字の報告方法」として記述、ユーザー貢献経路確立 |
| **LLM 評価結果**（案 F 併用） | 評価レポート §X | Phase 7 の「評価手法」セクションで補助的に引用 |
| **評価 URL セット** | `packages/website/e2e/fixtures/evaluation-urls.json` | Phase 7 demo / example 作成で流用可能 |
| **視覚回帰 baseline** | `packages/website/e2e/visual-baselines/` 60 snapshot | Phase 7 ドキュメントに「本プロジェクトの描画品質検証基盤」として言及可 |

### 12-1-1. Phase 7 ユーザー向けガイドで触れるべき既知の限界

以下の 5 項目を最低限 `guides/japanese.mdx` の「既知の限界」セクションに記載:

1. **KanjiVG 由来の筆順誤り可能性**: 常用漢字内で報告されている誤り字 3 字（娩・庫・炭）および未発見字への対処として `fix-overrides.json` による上書き機構を提供
2. **σ/μ 既定値の適用範囲**: 健常成人ラテン筆記統計 + 本プロジェクトでのチューニング結果、教育書体・高齢者向けには未対応（Phase 7/8 以降 プロファイル追加検討）
3. **仮名の rhythm は `default` プロファイル**: KanjiVG が `kvg:type` を仮名に付与しないため、tome/hane/harai の差別化は漢字のみ（Phase 5 §12-1-2 #4）
4. **短画 tome の過剰減速 / 連続 harai の識別不足**: Phase 5 §12-1-2 で既知の現象、本 Phase 評価で確認
5. **Playwright 視覚回帰の差分許容**: `maxDiffPixelRatio: 0.01` で 1% 以下のピクセル差は許容、フォント描画のサブピクセル差は意図的変更ではない

### 12-2. Phase 8（リリース判断）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **MOS 平均値と bootstrap CI** | 評価レポート §X | Phase 8 リリース可否判断の定量的根拠 |
| **問題字の残課題** | §X 参照 | 追加 fix-overrides の優先度判断材料 |
| **評価者連絡先**（匿名化 or 本人同意時のみ実名） | Phase 6 運営メモ（公開しない） | Phase 8 以降の再評価時に声をかける窓口 |
| **σ/μ チューニング履歴** | 本チケット §3-6 + 評価レポート | 将来の σ/μ 変更時の参考、Phase 5 §12-1 からの時系列 |
| **Playwright flaky 率** | CI 過去 10-20 回の統計 | Phase 8+ で CI 信頼性の継続モニタリング指標 |
| **Phase 7 ドキュメント整合チェック** | `japanese-support.md` / `guides/japanese.mdx` の整合 | Phase 8 リリース判断時、ドキュメントと実装の乖離がないか確認 |
| **KanjiVG 上流 issue 化候補** | 誤り字 3 字（娩・庫・炭）+ 発見字 | Phase 8+ で KanjiVG 上流（github.com/KanjiVG/kanjivg）に issue 提出検討 |
| **案 E（教育工学）/ 案 C（crowdsourcing）昇格条件** | §11-5 のシナリオ表 | 商用展開 / ユーザー要望次第で段階昇格 |

### 12-3. 残課題と明示的に扱わない範囲

本 Phase で完全解決できない項目:

1. **MOS ≥ 4.5 の達成**: 本 Phase 目標は ≥ 4.0、それ以上は Phase 12+ で案 C（crowdsourcing）採用時に再評価
2. **全常用漢字 2,136 字の網羅評価**: 本 Phase は 20 字サンプル、全字評価は Phase 8+ で継続モニタリング
3. **runtime での自然さ改善**: σ/μ 更新以外の rhythm モデル改善（N プリミティブ重畳等）は Phase 10+ の案 C（ML）
4. **教育工学標準との一致率**: 案 E の教科書動画比較は Phase 10+
5. **LLM 評価単独での MOS 代替**: 案 B 永続棚上げ、要件改訂なしには不採用

### 12-4. 運用・保守上の注意事項

- **評価再実施のトリガー**: σ/μ 変更 / 新フォント追加 / KanjiVG SHA 更新時は本 Phase 評価を再実施（Day 1 URL セット再運用、評価者連絡先参照）
- **Playwright baseline 更新**: Phase 5 rhythm 変更時は `--update-snapshots` を明示的に commit、意図的変更との区別を確保
- **fix-overrides 追加**: ユーザー報告時は `fix-overrides.json` に追記、Phase 2 `parseKanjiSvg` の自動適用、再生成は不要（runtime lookup）
- **LLM 評価再現性**: Claude / GPT モデルバージョン更新時は再評価、Phase 6 評価時のモデル名を `phase-6-validation-report.md` に記録
- **評価者謝礼**: 本 Phase は無償（友人知人ベース）、Phase 12+ で商用化時に案 C（MTurk / Lancers）へ移行

### 12-5. API / 機構の公開性

| API / 機構 | ファイル | 公開性 |
|---|---|---|
| `computeSNR(vRef, vSynth): number` | [metrics.ts](../../packages/generator/src/processing/metrics.ts) | internal（generator のみ、将来 public 化候補） |
| `peakSpeedRatio(profile): number` | 同上 | internal |
| `velocitySkewness(profile): number` | 同上 | internal |
| `ksPauseDistance(pauses): number` | 同上 | internal |
| `aggregateMOS(ratings): { mean, ci95Lower, ci95Upper, perChar }` | 同上 | internal |
| `loadFixOverrides(): Record<string, Override>` | [fix-overrides.ts](../../packages/dataset-cjk-kanjivg/src/fix-overrides.ts) | public（dataset パッケージ export） |
| Playwright config | [playwright.config.ts](../../packages/website/e2e/playwright.config.ts) | internal（website e2e のみ） |
| `evaluation-urls.json` | [fixtures](../../packages/website/e2e/fixtures/evaluation-urls.json) | internal（e2e / Phase 7 demo） |

### 12-6. Phase 6 → Phase 7/8 の検証チェーン

Phase 6 完了時点で **品質検証合格**、Phase 7/8 進行可。以下が Phase 7/8 で消費される:

- **MOS ≥ 4.0 の実績**（Phase 7 ドキュメントで「日本人評価済み」と記述可）
- **Playwright 視覚回帰基盤**（Phase 7 以降の ドキュメント更新時の自動検証）
- **fix-overrides 機構**（Phase 8 リリース後のユーザー報告対応）
- **σ/μ 最終値**（Phase 7 `guides/japanese.mdx` でチューニング根拠を記述）
- **評価レポート**（Phase 8 リリースアナウンスで「品質検証結果」として公開可）

Phase 6 の未達は**Phase 7 ドキュメント化・Phase 8 リリースを直接ブロック**。本 Phase は「Frontiers 2013 推奨値 + Phase 5 実装」を日本人評価で検証し、必要に応じて調整する、**本プロジェクトの最終目的（日本人が見て違和感のない手書きアニメーション）達成の判定 Phase**。

### 12-7. Phase 4 / 5 との統合確認

| 接点 | 確認事項 | 担当 |
|---|---|---|
| Phase 4 仮名バンドル | 仮名 6 字（き/さ/ふ/を/ア/ン）が MOS 評価対象、仮名特有の不自然さ（Phase 5 §12-1-2 #4）を本 Phase で検証 | Phase 6 #1 評価設計 |
| Phase 5 rhythm | σ/μ チューニング結果が `constants.ts` に反映、Phase 5 案 H の URL state スライダが本 Phase で実運用 | Phase 6 #1 / #3 |
| Phase 5 `endpointTypes` | 仮名で `kvg:type` null の挙動（全 `default`）が自然さ許容範囲内か評価 | Phase 6 #1 |
| Phase 3 `datasetSkeleton` | 筆順検証で Phase 3 の座標変換精度が確認、差異があれば Phase 3 issue 追加 | Phase 6 #4 |

仮名の rhythm が本 Phase で「やや機械的」と評価された場合、Phase 7 で仮名用プロファイル追加（§11 案 E の部分導入）が Phase 8 以降の改善候補として §12-2 に記録される。

---

### 関連チケット

- 前: [Phase 5: Sigma-Lognormal リズム合成](./phase-5-rhythm-synthesis.md)（**本 Phase の直接の前段、σ/μ チューニング対象**）
- 次: [Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md)（**本 Phase の直接の後段、評価結果と既知の限界を消費**）/ [Phase 8: リリース判断](./phase-8-release.md)（品質検証合格時のみ進行）
- 並列: なし（本 Phase は単独実行、人的評価ループのため）
- 依存資源: [Phase 4: 仮名バンドル](./phase-4-kana-bundle.md)（仮名 6 字を評価対象に含む）
- 一覧: [docs/tickets/README.md](./README.md)

### 関連ドキュメント

- 設計方針: [japanese-support.md](../japanese-support.md)（§5 手書きリズム評価基準、本 Phase で「既知の限界」節追記）
- 実装ロードマップ: [japanese-roadmap.md](../japanese-roadmap.md)（§Phase 6 Playwright 導入 2-3 日 / 評価者 3-5 名）
- 技術検証: [technical-validation.md](../technical-validation.md)（§2-7 評価メトリック 5 種 / §1-6 #8 KanjiVG 誤り字 / §3-4-C Playwright 未導入）
- 要件定義: [requirements.md](../requirements.md)（AC-3 / KPI / NFR-1.4 / R-1 / R-3 / R-6）
- プロジェクト全体: [AGENTS.md](../../AGENTS.md)（URL state によるテスト基盤、Playwright 連携）
