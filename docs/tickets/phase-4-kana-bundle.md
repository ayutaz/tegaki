# Phase 4: 仮名バンドル `tegaki/fonts/ja-kana`

> 日本語対応実装の**第 4 マイルストーン、第一次リリース同梱要素**。Phase 3 で CJK 筆順が正しく描画される経路が整ったのを受け、ひらがな 89 字 + カタカナ 90 字 = **合計 179 字**を **pre-built bundle** として `packages/renderer/fonts/ja-kana/` に格納し、`import kana from 'tegaki/fonts/ja-kana'` でエンドユーザーが即座に使える状態にする。既存 4 フォント（Caveat / Italianno / Tangerine / Parisienne）と**同じ export パターン**・**同じ生成フロー**（`generate-fonts` スクリプト）・**同じ `TegakiBundle` 型**を貫く — 本フェーズの価値は「新規抽象化を増やさず、既存仕組みを 5 つ目のバンドルに拡張するだけ」で日本語仮名をワンラインで使えるようにする点にある。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **4 / 8** |
| マイルストーン名 | 仮名バンドル `tegaki/fonts/ja-kana`（ひらがな 89 + カタカナ 90 = 179 字、事前配布） |
| ブランチ名 | `feat/ja-phase4-kana-bundle` |
| ステータス | 📝 未着手 |
| 依存（前段） | [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)（`main` マージ必須。`datasetSkeleton()` + `--dataset kanjivg` CLI が動作する前提） |
| 依存（後段） | [Phase 6: 検証・チューニング](./phase-6-validation.md)（仮名の目視確認対象に含む）、[Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md)（`import kana from 'tegaki/fonts/ja-kana'` を使う example を追加） |
| 並列可能性 | [Phase 5: Sigma-Lognormal リズム](./phase-5-rhythm-synthesis.md) と**同時並行可**（両者とも Phase 3 の `datasetSkeleton()` を前提にし、互いに干渉しない）|
| 想定期間 | **2 営業日**（一人稼働、並列化で 1.5 日） |
| 担当見積 | バンドル生成 0.5d + export 設定 0.5d + テスト 0.5d + レビュー対応 0.5d |
| **リリース区分** | **第一次リリース同梱**（筆順のみ正しい第一次リリースに、仮名バンドルも含めた状態で公開） |
| **リスク評価** | 中（バンドルサイズ 300 KB 超過、フォント選択失敗、既存生成フローへの副作用が主リスク） |
| 関連要件 | [requirements.md](../requirements.md) FR-6.1〜FR-6.4 / NFR-1.3 / NFR-5.1 / NFR-2.1〜NFR-2.3 |
| 関連設計 | [japanese-support.md](../japanese-support.md) §3-1 / §10 |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §2 Phase 4 |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) §1-4（仮名収録数: ひらがな 89 / カタカナ 90）/ §1-6 #2（仮名は `kvg:type` 空、`default` フォールバック） |
| 前フェーズ申し送り | [phase-3-pipeline-integration.md §12-1](./phase-3-pipeline-integration.md)（Phase 4 への import path / 生成コマンド / バンドルサイズ想定 900 KB / gzip 後 300 KB 近辺） |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズへ） |
|---|---|
| `packages/renderer/fonts/ja-kana/` の新規バンドル（ttf + glyphData.json + bundle.ts） | 漢字バンドル配布（Phase 8 or スコープ外） |
| 既存 `generate-fonts` npm script への `Noto Sans JP` 追加 | 他仮名フォント（明朝・Zen Kurenaido 等）複数配布（§11 案 E 参照） |
| `packages/renderer/package.json` の `exports` に `./fonts/ja-kana` 追加 | Sigma-Lognormal リズム適用（Phase 5） |
| 全 179 字の glyph 存在確認 unit テスト | 日本人評価者による目視確認（Phase 6） |
| 画分離テスト（「き」= 4 画、「さ」= 3 画 等） | 縦書きモード `writing-mode: vertical-rl` |
| `PreviewApp` で `?f=ja-kana` が動作 | 濁音・半濁音の合成（事前配布では `が`/`ぱ` 単独字として収録） |
| README への import 例追加 | 既存 Caveat / Italianno / Tangerine / Parisienne bundle の再生成（NFR-2.2 により禁止） |
| `tegaki/fonts/ja-kana` の npm package export | CI 化（generate フロー自動化 — 本 Phase §3-6 で方針判断のみ） |
| ファイルサイズ ≤ 300 KB（NFR-5.1） | dynamic import / lazy loading（§11 案 C は将来） |
| Noto Sans JP の使用（理由: Google Fonts 無料・OFL・仮名完備・`unitsPerEm=1000`） | 別フォント使用許諾交渉 |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-roadmap.md §2 Phase 4](../japanese-roadmap.md) および [requirements.md FR-6](../requirements.md) で「**全 179 字の仮名を `tegaki/fonts/ja-kana` として事前配布**」と確定した要件を実装レイヤに落とす。解決する課題は 4 点。

1. **ユーザーの 0-setup 体験** — Phase 3 完了時点では、ユーザーが日本語を描画するには `bun tegaki-generator generate --family "Noto Sans JP" --chars あいうえお...`  を**自前で走らせる**必要がある。仮名 179 字は**種類が有限**（漢字と違い Unicode 範囲全体を覆える）のため、**代表的な 1 フォントで pre-built**して npm に同梱すれば、ユーザーは `import kana from 'tegaki/fonts/ja-kana'` の 1 行で仮名全域を描画できる。
2. **既存 export パターンの一貫性** — Caveat / Italianno / Tangerine / Parisienne の 4 フォントはすべて `tegaki/fonts/<family>` でアクセス可能。[FR-6.2](../requirements.md) で「**既存の `tegaki/fonts/caveat` 等と同じ export パターン**」と明示されており、ユーザーの学習コストをゼロに保つ。
3. **バンドルサイズの予測と制約** — Phase 3 §12-1 では「仮名 179 字 × ~5 KB ≈ 900 KB、gzip 後 ~300 KB」と試算。[NFR-5.1](../requirements.md) の **300 KB 上限**（gzip 前 or 後かは本 Phase §9-1 で確認）に**近接**するため、ttf 選択とサブセット化が実装成否の分岐点になる。
4. **Phase 5 リズムとの並列進行** — Phase 3 の `datasetSkeleton()` が安定した時点で、Phase 4（仮名配布）と Phase 5（rhythm）は**別レイヤに責務が分離**されている。本 Phase は **「KanjiVG 仮名 179 字を `datasetSkeleton()` に通して bundle に焼く」だけ**の実装で、rhythm 未適用でも動作する。これにより Phase 5 完了を待たず第一次リリースに間に合わせられる。

### 2-2. Done の定義（測定可能）

以下 **10 項目すべて** を満たしたときチケット完了とする。

- [ ] **D-1** `packages/renderer/fonts/ja-kana/` に `bundle.ts`, `glyphData.json`, `<fontFile>.ttf` の 3 点（及び Caveat 同様のサブセット ttf があれば 4 点）が存在し git commit 済
- [ ] **D-2** `packages/renderer/package.json` の `exports` に `./fonts/ja-kana` エントリが追加され、Caveat パターンと構造が一致（`tegaki@dev` / `source` / `types` / `node` / `default` の 5 condition）
- [ ] **D-3** `packages/renderer/package.json` の `generate-fonts` スクリプトに `bun --filter tegaki-generator start generate "Noto Sans JP" --chars <kana 179 chars> --dataset kanjivg --output ../renderer/fonts/ja-kana` が含まれる
- [ ] **D-4** `import kana from 'tegaki/fonts/ja-kana'` が TypeScript 解決可能（`bun typecheck` 全通）
- [ ] **D-5** `kana.glyphData` に **179 キー**存在（ひらがな 89 + カタカナ 90）
- [ ] **D-6** 代表 6 字（「き」「さ」「ふ」「を」「ア」「ン」、[roadmap Phase 6 テスト字セット](../japanese-roadmap.md) と一致）が期待画数で収録（き=4、さ=3、ふ=4、を=3、ア=2、ン=2）
- [ ] **D-7** 各 glyph の `strokes` 配列長が 1 以上（0 画 glyph が存在しない）
- [ ] **D-8** バンドルサイズ（`bundle.ts` + `glyphData.json` + `.ttf`）合計が **≤ 300 KB**（NFR-5.1 — gzip 前で判定、余裕があれば gzip 後も記録）
- [ ] **D-9** React example（`<TegakiRenderer font={kana}>あいうえお</TegakiRenderer>`）および PreviewApp URL `http://localhost:4321/tegaki/generator/?f=ja-kana&t=あいうえお&m=text` が描画
- [ ] **D-10** `bun typecheck && bun run test && bun check` が全通、かつ既存 4 フォント bundle（Caveat 他）が**1 バイトも変更されていない**（`git status packages/renderer/fonts/caveat /italianno /tangerine /parisienne` で diff なし）

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（最終形）

```
packages/renderer/fonts/ja-kana/
├── bundle.ts                        # 自動生成、Caveat と同構造
├── glyphData.json                   # 179 字分の glyph data（compact 形式）
├── noto-sans-jp-<hash>.ttf          # subset ttf（仮名 179 字 + メタ、想定 ~80-150 KB）
└── noto-sans-jp.ttf                 # full family ttf（仮名フォールバック描画用、想定 ~150-250 KB、もしくはサブセット）
```

**Caveat との 1:1 対応**: [packages/renderer/fonts/caveat/bundle.ts](../../packages/renderer/fonts/caveat/bundle.ts) の構造（`fontUrl` = subset、`fullFontUrl` = full、`fontFaceCSS` で両 `@font-face` 宣言）をそのまま踏襲。generator が自動生成するファイル構成のため、**手で書くのは `package.json` の exports / generate-fonts script のみ**。

### 3-2. Noto Sans JP を推奨フォントとする理由

| 評価軸 | Noto Sans JP | 代替: M PLUS 1 | 代替: Zen Kurenaido | 代替: IPAex 明朝 |
|---|---|---|---|---|
| ライセンス | **SIL OFL 1.1** | SIL OFL 1.1 | SIL OFL 1.1 | IPA Font License |
| Google Fonts 配信 | ✅ | ✅ | ✅ | ❌（別途取得） |
| 仮名 179 字完備 | ✅ | ✅ | ✅ | ✅ |
| unitsPerEm | 1000（Tegaki 既定フィット） | 1000 | 1000 | 2048 |
| 手書き感 | **低**（ゴシック） | 中 | **高** | 中（明朝） |
| サブセット化容易性 | ✅ | ✅ | ✅ | △ |
| `kvg:type` 未付与仮名との相性 | 問題なし（Phase 3 `default` フォールバック済） | 同 | 同 | 同 |
| 初回リリースの「無難さ」 | **◎**（世界標準、読みやすい） | ○ | △（演出寄り） | ○ |

**判定**: **Noto Sans JP を第一候補**。理由: (1) Google Fonts 標準配信でダウンロードが確実（既存 [download.ts](../../packages/generator/src/font/download.ts) がそのまま使える）、(2) `unitsPerEm=1000` で既存 Tegaki 座標系と無修正整合、(3) ゴシック系で最初に届く「手書き感のない標準体」として第一次リリースの無難な選択、(4) ライセンスが SIL OFL 1.1 で商用利用・再配布ともに問題なし。§11-6 で「手書き感の強いフォントを追加配布するか」を評価軸として残し、初期リリースは Noto Sans JP 1 種で走り出す。

**許容される代替**: 本 Phase で `generate-fonts` スクリプトを「フォント名をパラメタ化」しておけば、将来「Zen Kurenaido 版も配布したい」という要望に `fonts/ja-kana-zen-kurenaido/` を追加するだけで対応できる（§11-7 の布石）。

### 3-3. `bundle.ts` の自動生成内容（generator が出力）

`bun --filter tegaki-generator start generate "Noto Sans JP" --output ../renderer/fonts/ja-kana/` が生成する `bundle.ts` のひな形。[Caveat の bundle.ts](../../packages/renderer/fonts/caveat/bundle.ts) と 1:1 対応（`family` / `fullFamily` / `fontUrl` / `unitsPerEm` の値が Noto Sans JP 由来に変わるだけ）:

```ts
// packages/renderer/fonts/ja-kana/bundle.ts （自動生成）
// Auto-generated by Tegaki. Do not edit manually.
import fontUrl from './noto-sans-jp-<hash>.ttf' with { type: 'url' };
import fullFontUrl from './noto-sans-jp.ttf' with { type: 'url' };
import glyphData from './glyphData.json' with { type: 'json' };

const bundle = {
  version: 0,
  family: 'Noto Sans JP Tegaki <hash>',
  fullFamily: 'Noto Sans JP',
  lineCap: 'round',
  fontUrl,
  fullFontUrl,
  fontFaceCSS: `@font-face { font-family: 'Noto Sans JP Tegaki <hash>'; src: url(${fontUrl}); } @font-face { font-family: 'Noto Sans JP'; src: url(${fullFontUrl}); }`,
  unitsPerEm: 1000,
  ascender: 1160,   // Noto Sans JP 由来。opentype.js で読み取って埋め込み
  descender: -288,  // 同上
  glyphData,
} as const;

export default bundle;
```

**重要**: [BUNDLE_VERSION = 0](../../packages/renderer/src/types.ts) のまま。[NFR-2.4](../requirements.md) により既存 Caveat 他 4 フォントの再生成を避けるため、**Phase 4 では `BUNDLE_VERSION` を increment しない**。Phase 5 rhythm 実装時も runtime 計算を優先（[Q-6 デフォルト方針](../japanese-roadmap.md)）。

### 3-4. `glyphData.json` の内容（179 字 compact 形式）

[types.ts TegakiGlyphData](../../packages/renderer/src/types.ts) の compact 形式に従う。各文字は以下の構造:

```json
{
  "あ": {
    "w": 1000,
    "t": 1.15,
    "s": [
      { "p": [[x, y, width], ...], "d": 0, "a": 0.38 },
      { "p": [[...]], "d": 0.42, "a": 0.33 },
      { "p": [[...]], "d": 0.78, "a": 0.37 }
    ]
  },
  ...
}
```

- `w` — advance width（font units、Noto Sans JP では通常 1000）
- `t` — total animation duration（seconds、`orderStrokes()` 由来）
- `s[i].p` — points as `[x, y, width]` tuples（font units）
- `s[i].d` — stroke start delay（seconds）
- `s[i].a` — stroke animation duration（seconds）

**収録 179 字**: ひらがな U+3041-U+3094（89 字、KanjiVG 収録分、[technical-validation.md §1-4](../technical-validation.md)）+ カタカナ U+30A1-U+30FC（90 字、同）。濁音・半濁音・小書き仮名（ぁぃぅぇぉっゃゅょ）も**単独字として収録**（Unicode 合成しない — §9-4 参照）。

### 3-5. 使用する KanjiVG 収録仮名の完全リスト

Phase 1 で downloaded された `packages/dataset-cjk-kanjivg/kanjivg/` のうち、**ひらがな 89 字** (`03041.svg`〜`03094.svg` のうち存在する codepoint) + **カタカナ 90 字** (`030a1.svg`〜`030fc.svg` のうち存在する codepoint) を使用。実コマンド引数は以下:

```bash
# ひらがな 89 字
HIRAGANA=ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔ

# カタカナ 90 字
KATAKANA=ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶー

# 合計 179 字を --chars に指定
bun --filter tegaki-generator start generate "Noto Sans JP" \
    --chars "$HIRAGANA$KATAKANA" \
    --dataset kanjivg \
    --output ../renderer/fonts/ja-kana/
```

**補足**: カタカナの**長音符 `ー` (U+30FC)** は KanjiVG 収録だが「1 画の直線」となる。Noto Sans JP の glyph も単純ベクトルなので問題なし。

### 3-6. `package.json` への exports 追加

[packages/renderer/package.json](../../packages/renderer/package.json) L81-108 の既存 4 フォント exports と同じ structure で 5 番目のエントリを追加:

```json
{
  "exports": {
    "...": "...",
    "./fonts/caveat": {
      "tegaki@dev": "./fonts/caveat/bundle.ts",
      "source": "./fonts/caveat/bundle.ts",
      "types": "./dist/fonts/caveat/bundle.d.mts",
      "node": "./fonts/caveat/bundle.ts",
      "default": "./dist/fonts/caveat/bundle.mjs"
    },
    "./fonts/italianno": { "...": "..." },
    "./fonts/tangerine":  { "...": "..." },
    "./fonts/parisienne": { "...": "..." },
    "./fonts/ja-kana": {
      "tegaki@dev": "./fonts/ja-kana/bundle.ts",
      "source":     "./fonts/ja-kana/bundle.ts",
      "types":      "./dist/fonts/ja-kana/bundle.d.mts",
      "node":       "./fonts/ja-kana/bundle.ts",
      "default":    "./dist/fonts/ja-kana/bundle.mjs"
    }
  }
}
```

### 3-7. `generate-fonts` スクリプト拡張

既存 L123 の `generate-fonts` スクリプトに Noto Sans JP 生成行を append:

```json
{
  "scripts": {
    "generate-fonts":
      "bun --filter tegaki-generator start generate Caveat --output ../renderer/fonts/caveat && \
       bun --filter tegaki-generator start generate Italianno --output ../renderer/fonts/italianno && \
       bun --filter tegaki-generator start generate Tangerine --output ../renderer/fonts/tangerine && \
       bun --filter tegaki-generator start generate Parisienne --output ../renderer/fonts/parisienne && \
       bun --filter tegaki-generator start generate 'Noto Sans JP' --chars 'ぁあぃいぅう...ヶー' --dataset kanjivg --output ../renderer/fonts/ja-kana"
  }
}
```

**設計判断**: `--chars` を展開して 1 行に埋め込むと JSON エスケープで破綻する可能性があるため、**`scripts/generate-kana.sh`** のような別スクリプトを切り出す選択肢もある（§11 案の布石）。初期実装は JSON 内で文字列として直書きし、問題が出たら切り出す（YAGNI）。

### 3-8. バンドル生成フロー（CI 化 vs 手動 commit）

本 Phase で判断すべき最重要運用事項。選択肢 2 つ。

| 方針 | 動作 | Pros | Cons | 本 Phase 判定 |
|---|---|---|---|---|
| **方針 X: 手動 generate + commit（現状の Caveat 他と同じ）** | 開発者が `bun run generate-fonts` を手元で走らせて `.ttf` + `.json` + `.ts` を git commit | 既存 4 フォントと完全一致の運用、CI 実行時間増ゼロ、`bun.lock` への Noto Sans JP 追加不要（devDep でない） | 再生成が人手作業に依存、KanjiVG / Noto Sans JP 更新時に開発者が再実行必要 | **採用** |
| **方針 Y: CI で generate 自動化** | GitHub Actions で `bun run generate-fonts` を走らせ、生成物を artifact or auto-commit | 再現性高、upstream 更新に追従 | CI 時間増（~30 秒）、artifact vs auto-commit のフロー設計、失敗時ロールバック手順 | **将来タスク**（Phase 8 リリース判断時に再評価） |

**判定根拠**: 既存 Caveat 他 4 フォントが方針 X で運用されており、本 Phase で 5 つ目に **運用ギャップを導入しない**（[NFR-3.3 既存コードスタイル準拠](../requirements.md)）。方針 Y への昇格は Phase 8 以降、仮名バンドルが複数フォント化したときに検討。

### 3-9. README 更新内容

`packages/renderer/README.md` の "Framework Support" セクション（または "Pre-generated bundles" セクション）に Caveat / Italianno / Tangerine / Parisienne の下に `ja-kana` を追加:

```md
## Pre-generated font bundles

| Bundle | Import | Characters | Size |
|---|---|---|---|
| Caveat       | `tegaki/fonts/caveat`       | Latin A-Z a-z 0-9 + accents | ~150 KB |
| Italianno    | `tegaki/fonts/italianno`    | Latin script                | ~150 KB |
| Tangerine    | `tegaki/fonts/tangerine`    | Latin script                | ~150 KB |
| Parisienne   | `tegaki/fonts/parisienne`   | Latin script                | ~150 KB |
| **Japanese kana** | `tegaki/fonts/ja-kana` | **Hiragana 89 + Katakana 90 = 179 chars** | **≤ 300 KB** |

### Japanese kana usage

\`\`\`tsx
import { TegakiRenderer } from 'tegaki';
import kana from 'tegaki/fonts/ja-kana';

<TegakiRenderer font={kana}>あいうえお</TegakiRenderer>
\`\`\`
```

---

## §4. エージェントチーム構成

Phase 4 は **3 名編成**（Phase 3 の 4 名から減員）。本 Phase は「既存仕組みを 5 つ目に拡張するだけ」で新規ロジックが最小のため、実装 1 + export/CI 1 + テスト 1 の役割分担で十分。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **バンドル生成担当** | 1 | Noto Sans JP の GoogleFonts 経由取得、`generate` 実行、`fonts/ja-kana/` 配下 3 点（bundle.ts / glyphData.json / ttf）出力、bundle サイズ計測、サブセット ttf 容量確認 | Tegaki generator CLI、opentype.js サブセット、GoogleFonts CSS endpoint 仕様 | 0.5d |
| 2 | **export 設定担当** | 1 | `packages/renderer/package.json` の `exports` に `./fonts/ja-kana` 追加、`generate-fonts` script 拡張、README `ja-kana` セクション追加、tsdown build 確認 | package.json exports conditions、TypeScript types 生成、Bun workspaces | 0.5d |
| 3 | **テスト担当** | 1 | `tegaki/fonts/ja-kana` の import テスト、179 字存在確認、画分離テスト（「き」4 画等）、React + PreviewApp e2e、既存 4 フォントの無変更検証 | Bun test, TegakiBundle 型、PreviewApp URL state | 0.5d |

**並列化**: #1 のバンドル生成が完了したら #2 / #3 は独立に並列。**直列 2 日 / 並列 1.5 日**。

### 4-1. ロール間の受け渡し

```
 Day 0  #1 Noto Sans JP 取得 + 仮名 179 字リスト確定
         #2 exports + generate-fonts script 先行追加（ダミー or skip 構文）
 Day 1  #1 bundle 生成 + commit、サイズ計測
         #2 README 更新、tsdown build 確認
         #3 unit テスト作成（glyph 存在、画分離）
 Day 2  #3 e2e テスト（React + PreviewApp）、既存 4 フォント無変更検証
         #1 #2 #3 で PR レビュー対応、Phase 6 申し送り更新
```

**レビュー委譲**: サイズ超過リスク（NFR-5.1 300 KB 上限）は **#1 + #2** で独立 LGTM、画分離正しさ（「き」4 画等）は **#1 + #3**、export パターン整合は **#2 単独**で問題なし。

---

## §5. 提供範囲（Deliverables）

### 5-1. コード成果物（新規）

- [ ] `packages/renderer/fonts/ja-kana/bundle.ts`（generator 自動生成、手書き不可）
- [ ] `packages/renderer/fonts/ja-kana/glyphData.json`（179 字、生成物）
- [ ] `packages/renderer/fonts/ja-kana/noto-sans-jp-<hash>.ttf`（subset ttf）
- [ ] `packages/renderer/fonts/ja-kana/noto-sans-jp.ttf`（full/fallback ttf）

### 5-2. コード成果物（差分）

- [ ] `packages/renderer/package.json`: `exports['./fonts/ja-kana']` 追加（Caveat パターン踏襲）、`generate-fonts` script に Noto Sans JP 行追加
- [ ] `packages/renderer/README.md`: Japanese kana セクション追加

### 5-3. テスト成果物

- [ ] `packages/renderer/fonts/ja-kana/bundle.test.ts`（新規、179 字の存在確認 / 画分離 / 0 画 glyph 不在）
- [ ] `packages/website/src/components/HomePageExamples.tsx` etc. のどこかに `<TegakiRenderer font={kana}>あいうえお</TegakiRenderer>` 例を追加（Phase 7 で本格化、Phase 4 は最小動作確認まで）

### 5-4. ドキュメント成果物

- [ ] `docs/tickets/README.md` ステータス列更新（📝 未着手 → 🚧 → 👀 → ✅ 完了）
- [ ] [Phase 5 チケット](./phase-5-rhythm-synthesis.md) §12 申し送りに「仮名バンドルは rhythm 合成対象に含めるか」の本 Phase §12-1 からの情報反映
- [ ] [Phase 6 チケット](./phase-6-validation.md) §12 申し送りに「仮名代表 6 字（き / さ / ふ / を / ア / ン）の目視対象」追記

### 5-5. プロジェクト管理成果物

- [ ] `feat/ja-phase4-kana-bundle` ブランチから `main` への PR 作成
- [ ] PR 本文に本チェックリスト埋め込み、**バンドルサイズ実測値**を明記（例: `Bundle size: 245 KB (target ≤ 300 KB)`）
- [ ] [FR-6.1〜6.4](../requirements.md) および [NFR-5.1](../requirements.md) のチェック結果を PR 本文に添付

---

## §6. テスト項目（受入基準ベース）

[FR-6.1〜FR-6.4](../requirements.md) および [NFR-5.1](../requirements.md) を網羅する 14 テスト。**バンドルサイズ実測は必須項目**。

| # | 要件ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | FR-6.1 | `Object.keys(kana.glyphData).length` が 179 | 179 | unit |
| T-02 | FR-6.1 | ひらがな 89 字全部存在（あいう...を ん ゔ） | all present | unit |
| T-03 | FR-6.1 | カタカナ 90 字全部存在（アイウ...ヲ ン ヴ ヵ ヶ ー） | all present | unit |
| T-04 | FR-6.1 | 小書き仮名（ぁぃぅぇぉっゃゅょ）が独立字として収録 | 9 chars present | unit |
| T-05 | FR-6.1 | 濁音・半濁音（がぎぐ...ぱぴぷ）が独立字として収録 | 25 chars present | unit |
| T-06 | FR-6.2 | `import kana from 'tegaki/fonts/ja-kana'` が TypeScript 解決 | typecheck exit 0 | unit |
| T-07 | FR-6.2 | bundle オブジェクトが `TegakiBundle` 型に conform（`version` / `family` / `fontUrl` / `glyphData` 等） | structural match | unit |
| T-08 | FR-6.2 | `package.json` exports の 5 condition が Caveat と同構造 | structural match | meta |
| T-09 | **NFR-5.1** | bundle directory 合計サイズ ≤ 300 KB（ttf + json + ts） | size ≤ 307200 | meta |
| T-10 | FR-6.3 | 各 glyph の `strokes.length ≥ 1`（0 画 glyph なし） | all ≥ 1 | unit |
| T-11 | FR-6.3 | 代表 6 字の画数（き=4, さ=3, ふ=4, を=3, ア=2, ン=2） | exact match | unit |
| T-12 | FR-6.4 | React: `<TegakiRenderer font={kana}>あいうえお</TegakiRenderer>` が描画 | 5 strokes visible | e2e |
| T-13 | FR-6.4 | PreviewApp: `?f=ja-kana&t=あいうえお&m=text` が描画 | canvas非空 | e2e |
| T-14 | NFR-2.1 | 既存 Caveat / Italianno / Tangerine / Parisienne bundle が**1 バイトも変更されていない** | `git diff` empty | e2e |
| T-15 | NFR-2.2 | 既存 pre-built bundle（4 フォント）は**再生成されていない** | mtime unchanged | meta |
| T-16 | NFR-3.2 | `bun typecheck && bun run test && bun check` 全通 | exit 0 | e2e |

---

## §7. Unit テスト

### 7-1. `bundle.test.ts` — 179 字の存在確認（約 40 行）

```ts
// packages/renderer/fonts/ja-kana/bundle.test.ts
import { describe, expect, it } from 'bun:test';
import kana from './bundle.ts';

const HIRAGANA_89 = Array.from('ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔ');
const KATAKANA_90 = Array.from('ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶー');

describe('ja-kana bundle export', () => {
  it('is a TegakiBundle-shaped default export', () => {
    expect(kana.version).toBe(0);
    expect(kana.family).toContain('Noto Sans JP');
    expect(typeof kana.fontUrl).toBe('string');
    expect(kana.unitsPerEm).toBe(1000);
    expect(typeof kana.glyphData).toBe('object');
  });

  it('contains exactly 179 glyphs', () => {
    expect(Object.keys(kana.glyphData)).toHaveLength(179);
  });

  it('covers all 89 hiragana (U+3041-U+3094)', () => {
    for (const ch of HIRAGANA_89) {
      expect(kana.glyphData[ch], `missing hiragana "${ch}" (U+${ch.codePointAt(0)!.toString(16)})`).toBeDefined();
    }
  });

  it('covers all 90 katakana (U+30A1-U+30FC)', () => {
    for (const ch of KATAKANA_90) {
      expect(kana.glyphData[ch], `missing katakana "${ch}"`).toBeDefined();
    }
  });

  it('has no empty (0-stroke) glyphs', () => {
    for (const [ch, data] of Object.entries(kana.glyphData)) {
      expect(data.s!.length, `"${ch}" has 0 strokes`).toBeGreaterThanOrEqual(1);
    }
  });
});
```

### 7-2. `bundle.test.ts` — 画分離（約 30 行）

```ts
describe('ja-kana stroke counts (MEXT-aligned representative chars)', () => {
  // From roadmap Phase 6 test-char set: き/さ/ふ/を/ア/ン
  const EXPECTED_STROKES: Record<string, number> = {
    'き': 4,  // 教科書体: 一 一 ノ + 縦棒（分断）
    'さ': 3,  // 教科書体: 一 ノ ム
    'ふ': 4,  // 教科書体: 点 ノ 点 点
    'を': 3,  // 一 折れ ノ
    'ア': 2,  // 横→左下払い、縦棒
    'ン': 2,  // 点、右下払い
  };

  for (const [ch, expected] of Object.entries(EXPECTED_STROKES)) {
    it(`"${ch}" has ${expected} strokes per KanjiVG/MEXT`, () => {
      const data = kana.glyphData[ch];
      expect(data).toBeDefined();
      expect(data!.s!.length).toBe(expected);
    });
  }
});
```

### 7-3. `bundle.test.ts` — 小書き / 濁音・半濁音の独立収録（約 20 行）

```ts
describe('ja-kana small/dakuten coverage', () => {
  const SMALL_KANA = ['ぁ','ぃ','ぅ','ぇ','ぉ','っ','ゃ','ゅ','ょ','ゎ'];
  const DAKUTEN   = ['が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ'];
  const HANDAKUTEN = ['ぱ','ぴ','ぷ','ぺ','ぽ'];

  it('includes all small hiragana (ぁぃぅぇぉっゃゅょゎ)', () => {
    for (const ch of SMALL_KANA) expect(kana.glyphData[ch]).toBeDefined();
  });
  it('includes all voiced (dakuten) hiragana', () => {
    for (const ch of DAKUTEN) expect(kana.glyphData[ch]).toBeDefined();
  });
  it('includes all semi-voiced (handakuten) hiragana', () => {
    for (const ch of HANDAKUTEN) expect(kana.glyphData[ch]).toBeDefined();
  });
});
```

### 7-4. `bundle-size.test.ts` — サイズ測定（約 20 行）

```ts
// packages/renderer/fonts/ja-kana/bundle-size.test.ts
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'bun:test';

describe('ja-kana bundle size (NFR-5.1)', () => {
  it('totals ≤ 300 KB uncompressed', () => {
    const dir = resolve(import.meta.dir);
    const total = readdirSync(dir)
      .filter((f) => /\.(ttf|json|ts)$/.test(f) && !f.endsWith('.test.ts'))
      .map((f) => statSync(resolve(dir, f)).size)
      .reduce((a, b) => a + b, 0);
    expect(total, `bundle size = ${total} bytes`).toBeLessThanOrEqual(300 * 1024);
  });
});
```

---

## §8. e2e テスト

**目的**: `import kana from 'tegaki/fonts/ja-kana'` が framework ユーザーの目線で動作することを確認する。React + PreviewApp の 2 経路で検証し、既存 4 フォントへの副作用ゼロを機械検証する。

### 8-1. React レンダリング e2e

```tsx
// packages/website/src/components/KanaExample.tsx （検証用、Phase 7 で本格配置）
import { TegakiRenderer } from 'tegaki';
import kana from 'tegaki/fonts/ja-kana';

export function KanaExample() {
  return <TegakiRenderer font={kana}>あいうえお</TegakiRenderer>;
}
```

**実行**:
```bash
cd C:/Users/yuta/Desktop/Private/tegaki
bun dev
# http://localhost:4321/tegaki/ でコンポーネント描画確認
# 「あいうえお」の 5 字分が順に描画されること（ストロークが見える）
```

### 8-2. PreviewApp による URL-state e2e

```bash
bun dev
# http://localhost:4321/tegaki/generator/?f=ja-kana&t=あいうえお&m=text&fs=96&tm=controlled&ct=3.5
# 目視: 5 字すべて描画、筆順が正しい（あ=3画 / い=2画 / う=2画 / え=2画 / お=3画）
```

**URL パラメタ補足**: PreviewApp は `f` をバンドル名として解釈する（`caveat` / `italianno` 等と同様）。本 Phase で `ja-kana` が追加されると [url-state.ts](../../packages/website/src/components/url-state.ts) の font 選択肢に自動反映される（既存パターン踏襲時）。PreviewApp の実装側で `ja-kana` を**明示的にリストする**必要があるかは §9-5 で確認。

### 8-3. 既存 4 フォントの無変更検証

```bash
# Phase 4 PR の git diff で、既存 bundle が触られていないことを機械検証
git diff --stat main...HEAD -- packages/renderer/fonts/caveat \
                              packages/renderer/fonts/italianno \
                              packages/renderer/fonts/tangerine \
                              packages/renderer/fonts/parisienne
# expect: no diff (0 files changed)
```

### 8-4. generator 一括走行

```bash
# generate-fonts script が新規 Noto Sans JP 行を含めて exit 0 で完走
bun --filter tegaki run generate-fonts
# expect: 5 bundle が出力される、既存 4 bundle はサイズ・ハッシュが commit と一致
```

### 8-5. 失敗時の切り分け

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| §8-1 レンダリング無し | `exports.'./fonts/ja-kana'` の condition 欠落 | package.json conditions を Caveat と diff |
| §8-1 筆順逆 | Phase 3 の `datasetSkeleton` y 反転漏れ | Phase 3 §8-4 座標検証に戻る |
| §8-2 `f=ja-kana` が解決されない | PreviewApp 側 font リスト未更新 | `packages/website/src/components/PreviewApp.tsx` の font 選択処理確認 |
| §8-3 既存 fonts に diff | `generate-fonts` script で誤って既存フォントを regenerate した | script を精査、Caveat 行が無変更であることを確認 |
| §8-4 Noto Sans JP DL 失敗 | GoogleFonts の `User-Agent` 問題 / CSS endpoint 仕様変更 | [packages/generator/src/font/download.ts](../../packages/generator/src/font/download.ts) の UA ヘッダ確認、`.cache/fonts/.tmp` を削除して再試行 |
| サイズ超過（>300 KB） | ttf サブセット不十分、glyph 座標精度高すぎ | サブセット限定 179 字のみ、`pr`（pixel ratio）/ `ss`（stroke segment）を generate 時に調整 |

---

## §9. 懸念事項とリスク

本 Phase は Phase 3 と比べてリスクは中程度だが、**バンドルサイズ**と**フォント選択判断**の 2 つが主リスクとして浮上する。

### 9-1. R-A: バンドルサイズが NFR-5.1（300 KB）を超える

- **影響**: **高**（要件違反）。Phase 3 §12-1 の試算「仮名 179 字 × 5 KB ≈ 900 KB、gzip 後 ~300 KB」と同規模なら**gzip 後**で辛うじて 300 KB に収まる想定。gzip 前基準で 300 KB 要求されると **要件未達確定**。
- **根本原因**: (1) ttf 本体が subset 後も ~100-200 KB 残る、(2) 179 字 × 平均ストローク数 5 × 平均 40 点 = ~36,000 points、compact 表現 `[x,y,w]` で tuple 3 値なら~900 KB、(3) JSON オーバーヘッド、(4) Noto Sans JP のヒンティング情報。
- **対策**:
  - **対策 1**: [NFR-5.1](../requirements.md) 本文を再確認し「gzip 前/後」どちらで判定するか本 Phase 冒頭で確定（§6 T-09 の実測値で決着）
  - **対策 2**: ttf サブセット時、本体 1000+ の glyph を 179 字に絞る（`opentype.js` の subset API）
  - **対策 3**: glyph 点列の量子化（x/y を整数に round、width を 2 桁 fixed）を generator 側で実施
  - **対策 4**: `fullFontUrl` を省略し、`fontUrl`（subset ttf）のみで運用（Caveat の二重 ttf 戦略を踏襲しないオプション — UI 上の fallback font 設計で代替可）
  - **対策 5**: サイズ超過時は `ja-kana` バンドルを「ひらがな 89 のみ」に縮小して `ja-hiragana` / `ja-katakana` 2 バンドルに分割する退避案（§11 案 C / E の前倒し部分移行）
- **残余リスク**: 中。実測しないと判断不能なため、**Day 1 時点でサイズ計測を実施し、超過時は対策 3-4 を即決断**する。

### 9-2. R-B: Noto Sans JP が仮名の「手書き感」を出すのに不適

- **影響**: 中。Noto Sans JP はゴシックで「手書きアニメーション」としての美的品質が低い可能性。レビュー段階で「ユーザーが期待する見た目と違う」という feedback が出うる。
- **根本原因**: Tegaki 既存 4 フォントは Caveat / Italianno / Tangerine / Parisienne と**筆記体系**で選定されており、ゴシック体を混在させるとトーン不統一。
- **対策**:
  - **対策 1**: 第一次リリースは「筆順が正しい・画分離がある」ことを primary value として、「手書き風」は secondary に位置付け（リリースノートで明記）
  - **対策 2**: 将来 `ja-kana-zen-kurenaido`（手書き風）を追加配布（§11 案 E）
  - **対策 3**: 本 Phase §11-6 で「Noto Sans JP は『読みやすさ』重視、手書き感は Phase 7 / 8 で追加」という判断を明文化
- **残余リスク**: 低（第一次リリースのトーン設定として、Phase 6 評価者 feedback で調整）。

### 9-3. R-C: KanjiVG の仮名が `kvg:type` を持たないため rhythm 適用時に `default` プロファイル固定

- **影響**: 低（本 Phase スコープ外、Phase 5 の責務）。[technical-validation.md §1-6 #2](../technical-validation.md) で明示されている既知事実。
- **根本原因**: KanjiVG は漢字向けに `kvg:type` を付与しており、仮名 179 字は未付与。
- **対策**: Phase 5 rhythm 実装時、`endpointType = 'default'` を fallback として設計済（Phase 2 §12-3 の申し送り）。本 Phase では特別対応不要。
- **残余リスク**: 低。Phase 5 で rhythm が仮名にも適用されるが、「標準プロファイル」で等速に近い自然な動きになる想定。

### 9-4. R-D: 小書き仮名・濁音・半濁音の取り扱い

- **影響**: 中（要件理解の齟齬が生じると 179 字の数合わせ失敗）。
- **課題**:
  - 小書き仮名（ぁぃぅぇぉっゃゅょゎ）は独立字として収録するか、Unicode 合成するか
  - 濁音（がぎぐ...）は独立字か、U+3099（合字マーカー）と合成するか
  - 同じ問題がカタカナ側（ァィゥェォッャュョヮ、ガギグ...）にも発生
- **判定**: **独立字として収録する**。理由: (1) [technical-validation.md §1-4](../technical-validation.md) の「ひらがな 89 / カタカナ 90」はすべて**独立 codepoint 単位**の収録数、(2) KanjiVG は `03060.svg`（だ）/ `03050.svg`（ぐ）等を独立 SVG として提供している、(3) Unicode 正規化の差異で glyph lookup が失敗するリスクを回避、(4) ユーザーが `<TegakiRenderer>がぎぐ</TegakiRenderer>` を書いたときに即座に解決される。
- **対策**: §7-3 テストで小書き 9 字 / 濁音 20 字 / 半濁音 5 字の独立収録を機械検証。
- **残余リスク**: 低。

### 9-5. R-E: PreviewApp の font 選択リストへの追加

- **影響**: 中。[url-state.ts](../../packages/website/src/components/url-state.ts) の `f` パラメタが既知 font 名のみ受理する実装なら、`ja-kana` を追加実装する必要あり。
- **根本原因**: PreviewApp の font 選択が hardcode か動的かが未確認。
- **対策**: 本 Phase 実装時に [PreviewApp.tsx](../../packages/website/src/components/PreviewApp.tsx) と [url-state.ts](../../packages/website/src/components/url-state.ts) を確認し、`ja-kana` を font リストに追加。generator を通さず pre-built bundle を選択する UI にする。
- **残余リスク**: 低（Phase 7 で PreviewApp UX 整備時に再確認予定）。

### 9-6. R-F: 既存 4 フォント bundle を意図せず再生成する事故

- **影響**: **高**（NFR-2.2 違反）。
- **根本原因**: `generate-fonts` script を単純な `&&` chain で拡張すると、スクリプト全体を実行したとき既存 bundle が upstream GoogleFonts の微細更新で**微変**する可能性。
- **対策**:
  - **対策 1**: PR では **Noto Sans JP の新規生成のみ commit**、既存 4 フォントの .ttf/.json/.ts は触らない（`git add` 除外）
  - **対策 2**: §8-3 の `git diff --stat` チェックを PR テンプレートに明記
  - **対策 3**: generator 側で「既存 output ディレクトリが存在する場合は hash 一致時に skip する」オプションは Phase 8 以降で検討（YAGNI）
- **残余リスク**: 低（git diff でレビュー時に検知可能）。

### 9-7. R-G: Noto Sans JP の `ascender`/`descender` が既存パターンと異なる

- **影響**: 中。Caveat の bundle.ts は `ascender: 960, descender: -300`（unitsPerEm = 1000）だが、Noto Sans JP は `ascender: ~1160, descender: ~-288`（OpenType vertMetrics 由来）。ベースライン計算が異なれば `<TegakiRenderer>` レイアウトが他フォントと齟齬。
- **対策**: generator が opentype.js から抽出した実値を埋め込む（既存パターン）。renderer 側は bundle 提供値を信頼する既存設計のため無変更で動作するはず。念のため §7-1 テストで `kana.ascender > 0 && kana.descender < 0` を検証。
- **残余リスク**: 低。

---

## §10. レビュー項目

PR レビュー時のチェックリスト。本 Phase は既存仕組みの拡張のため 3 観点で LGTM 可能。

### 10-1. バンドルサイズ観点（#1 + #2 が LGTM）

- [ ] `fonts/ja-kana/` 合計サイズが実測で **≤ 300 KB**（PR 本文に実測値記載）
- [ ] gzip 前/後どちらで判定したかを PR 本文に明記（NFR-5.1 解釈）
- [ ] サイズ超過時の対策（対策 3-5）が実施済
- [ ] ttf サブセットが正しく動作（179 字のみ、非 ASCII 他 glyph が削除されている）

### 10-2. Export パターン整合観点（#2 が LGTM）

- [ ] `packages/renderer/package.json` の `exports['./fonts/ja-kana']` が Caveat と同構造（5 condition）
- [ ] `generate-fonts` script に Noto Sans JP 行が追加されている
- [ ] `tsdown` build 時に `./dist/fonts/ja-kana/bundle.mjs` / `.d.mts` が生成される
- [ ] `import kana from 'tegaki/fonts/ja-kana'` が TypeScript で解決される
- [ ] `import kana from 'tegaki/fonts/ja-kana'` が Bun / Node 両 runtime で動作

### 10-3. 生成再現性観点（#1 + #3 が LGTM）

- [ ] `bun --filter tegaki-generator start generate "Noto Sans JP" --chars ... --dataset kanjivg --output ...` が exit 0 で完走
- [ ] 同コマンドを 2 回連続実行しても出力が bit-identical（hash で検証）
- [ ] 生成した glyphData.json の 179 キーが固定順（determinism）
- [ ] KanjiVG SHA pinned（Phase 1 `KANJIVG_SHA = 'r20250816'`）なため仮名 stroke 座標も再現可能

### 10-4. 既存フォント無変更観点（#3 が LGTM）

- [ ] `git diff main...HEAD -- packages/renderer/fonts/caveat italianno tangerine parisienne` が空
- [ ] Caveat / Italianno / Tangerine / Parisienne の mtime / 内容 hash 不変
- [ ] [NFR-2.2](../requirements.md) を満たす

### 10-5. CI 化の要否観点（全員）

- [ ] 本 Phase は**方針 X（手動 commit）を採用**（§3-8）
- [ ] CI 化は Phase 8 以降で再評価という判断が PR 本文に明記
- [ ] Phase 5 / 6 の申し送りに「仮名バンドル再生成トリガー」が記載されている

### 10-6. 実装規約観点（全員）

- [ ] `.ts` 拡張子 import（`import kana from './bundle.ts'` 等）
- [ ] Biome（single quotes, 2-space, 140-col）準拠
- [ ] `bun typecheck && bun run test && bun check` exit 0
- [ ] 新規テストファイル `bundle.test.ts` / `bundle-size.test.ts` が存在
- [ ] README の Japanese kana セクション追加

---

## §11. 一から作り直す場合の設計思想

> Phase 4 は技術リスクが低い保守的拡張に見えて、**配布戦略**の設計空間は実は最も広い Phase である。npm 同梱の周囲には runtime 生成 / lazy split / CDN / multi-variant / **Service Worker キャッシュ** / **常用漢字まで束ねた ja-full** などの代替が並び、**1 年後・3 年後の BundleSize 圧力・フォント多様化・オフライン要件・漢字バンドル昇格**という具体的圧力の下でどこまで今の案 A が耐えるかを、**7 案の定量比較と失敗モード分析**で検算する。Phase 1/2/3 §11 の「今は最小、境界契約は先に書く」という原則を**配布層に垂直延長**し、最終章で「私ならこうする」を断言して 1 年後・3 年後の自分が検算可能にする。

### 11-1. 設計空間の全体像（7 案）

配布戦略は **配布媒体（npm / CDN / SW cache）× 束ね粒度（単一 / split / multi-variant / ja-full）× 生成タイミング（build-time / runtime）** の 3 軸で 7 案に整理できる。案 A–E は起案時から列挙していた選択肢、**案 F・G は Phase 1/2/3 §11 との整合レビュー後に追加**した高層の構造選択肢である。

| 案 | 本質 | 配布媒体 | 束ね粒度 | 生成タイミング |
|---|---|---|---|---|
| **A** | 現行: pre-built npm bundle（`tegaki/fonts/ja-kana`、単一フォント） | npm package | 単一（179 字 1 本） | build-time |
| **B** | runtime 生成（ブラウザ内で opentype.js + KanjiVG + generator pipeline をオンデマンド実行） | client 内生成 | 任意 | runtime |
| **C** | lazy split（`ja-hiragana` / `ja-katakana` / `ja-kana-small` を dynamic import） | npm package（split） | 2-3 分割 | build-time |
| **D** | CDN fetch（jsDelivr / unpkg 経由、npm 未同梱） | CDN | 単一 or split | build-time |
| **E** | multi-variant（`ja-kana-noto` / `-mincho` / `-zen-kurenaido` など複数フォント同時配布） | npm package × N | N variant | build-time |
| **F** | **Service Worker + Cache Storage でオフラインファースト**（初回 CDN fetch → 永続キャッシュ、bundle サイズ 0） | CDN + SW cache | 任意 | build-time |
| **G** | **Font Subset API で常用漢字まで含めた `ja-full` 1 本化**（仮名 179 + 常用 2,136 の統合 bundle、subset 動的切替） | npm package or CDN | **ja-full 統合** | build-time + subset 指定 |

抽象化階層として **単一媒体（A/C/E）＜ 生成タイミング切替（B）＜ 媒体切替（D/F）＜ 内容粒度再設計（G）** の入れ子関係があり、案 F は D の「オフライン破綻」を構造的に解決する上位案、案 G は A/C/E の「仮名だけ配布」前提そのものを組み替える最上位の再設計である。

### 11-2. 定量比較

> **数値の根拠と信頼度凡例**:
> - **（実測）** — Phase 3 §12-1 および本 Phase Day 1 計測値。
> - **（推定）** — 既存 4 フォントサイズ / opentype.js client-side 実測 / woff2 subset の公開ベンチから類推。
> - **（契約）** — [requirements.md NFR-5.1](../requirements.md) 等の要件定義値。
> - 未実測値は Day 1 spike で案 A サイズのみ確定させ、他案は推定のまま退場判定に使う。

| 指標 | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| **bundle KB（初期 install）** | 300 KB（実測目標） | 0 KB（契約） | 100 KB × 必要字種（推定） | 0 KB（契約） | 300 KB × N（推定） | 0 KB（契約） | **仮名 300 KB + 漢字 3.6 MB = ~3.9 MB（推定）**、subset 有効化で実効 ~300 KB |
| **初回ロード ms（cached）** | <50（推定） | 5,000-10,000（推定） | 50-100 × split 数（推定） | 200-500（推定） | <50 × 1（推定） | <50（2 回目以降、SW cache hit 推定） | <50（仮名 subset のみ load、推定） |
| **初回ロード ms（uncached）** | 0（tree-shaken） | 同上 | 50-100 × split 数 | 300-800（推定） | 0 × 1 | 300-800（初回 CDN fetch、推定） | 0（subset 指定範囲のみ） |
| **ランタイムオーバーヘッド** | ゼロ | 高（主スレッド占有、WebWorker 必須） | ゼロ | ゼロ | ゼロ | 低（SW 登録 + cache lookup ~5 ms、推定） | 中（subset 境界計算 10-30 ms、推定） |
| **メンテ容易性** | **◎**（Caveat パターン踏襲） | △（generator を client 化、~10,000 行送る） | ○（split 単位の再生成ルール要） | △（CDN 可用性・SRI 管理） | ○（variant 追加容易、N 倍サイズ） | △（SW lifecycle / cache 破棄戦略の設計要） | **×**（subset API は TegakiBundle 型拡張が必要、renderer 6 adapter 改修） |
| **オフラインで動くか** | ✅ | ✅（KanjiVG 同梱なら） | ✅ | ❌（CDN 必須） | ✅ | ✅（2 回目以降、**初回のみ要 online**） | ✅ |
| **SSR / Astro / Workers 互換** | ✅ | △（WebWorker 前提） | ✅ | △（fetch polyfill 必要） | ✅ | **×**（SW は Workers/SSR で動かない） | ✅ |
| **サイズ超過リスク（NFR-5.1）** | 中（§9-1 対策要） | ゼロ | 低（split 可） | ゼロ | **高**（N 倍加算） | ゼロ（bundle 空） | **要 NFR-5.1 改訂**（300 KB → ja-full は数 MB 要件） |
| **仮名 300 KB 制約の構造的解決** | **なし**（正面突破のみ） | ✅（bundle 0） | △（split で 150 KB × 2、合計は変わらず） | ✅（bundle 0） | × 悪化 | ✅（bundle 0） | ✅（subset で実効サイズを動的制御） |
| **フォント多様化への柔軟性** | 低（1 固定） | **◎**（任意パラメタ化可） | 低 | 中（CDN URL 追加） | **◎**（variant 追加） | 中（CDN 側に追加のみ） | 低（subset は同一フォント前提） |
| **CC-BY-SA 3.0 との関係** | glyphData.json は派生物（継承） | KanjiVG SVG を client 配布 → 同じ | 同 | 同 | 同 | 同 | 同 |
| **Phase 4 実装工数** | 2 日（本 Phase 予算） | 10-15 日（推定） | 3-4 日（split 化、推定） | 3-5 日（CDN pipeline、推定） | 4-6 日（N variant、推定） | 5-7 日（SW 実装 + cache 戦略 + fallback、推定） | **10-12 日**（Phase 8 漢字 bundle の先食い） |
| **ロールバック容易性** | 高（フラグ外す） | 高 | 高 | 高 | 高 | 中（SW 解除 + cache 破棄が必要） | 低（renderer 型拡張後の revert は深い） |
| **本 Phase での判定** | **採用** | 棄却（YAGNI） | 棄却（YAGNI） | 棄却（オフライン破綻） | 将来案（Phase 8+） | 棄却（SW 依存 = SSR/Workers 破綻） | 棄却（Phase 8 先食い、NFR-5.1 改訂要） |

**補足**: 案 F は「SSR / Astro / Cloudflare Workers で SW が動かない」という framework-agnostic 契約違反で、案 G は「renderer 6 adapter 全てへ型拡張波及」という AC 相当契約違反で、Phase 4 候補から実質脱落。詳細な失敗モードは §11-3 で分析。

### 11-3. 各案の要点（失敗モード込み）

**案 A（pre-built npm bundle）** — 既存 Caveat 他 4 フォントと完全同型。学習コストゼロ、ユーザー体験が即座に統一される。欠点はフォント選択が 1 固定、サイズ超過リスク（§9-1）。失敗モード: Day 1 サイズ実測で 300 KB 超過時、対策 3-5（量子化 / subset / split 退避）を即決断。

**案 B（runtime 生成）** — ブラウザに KanjiVG SVG + generator pipeline を送り込み、初回 import 時に opentype.js → rasterize → skeletonize → trace を走らせる。利点: bundle 0 KB、フォント任意選択可、ユーザーが独自フォントも生成可。欠点: (1) generator は Bun/Node 前提で ~10,000 行を client 送出、(2) opentype.js だけで ~400 KB で結局サイズ増、(3) WebWorker 化必須でデータマーシャリングコスト非零、(4) 初回生成 5-10 秒で UX 破綻。**Phase 4 スコープ超過**、ML 時代（Phase 12+）まで塩漬け。

**案 C（lazy split）** — 179 字を hiragana/katakana に 2-3 分割、`import hiragana from 'tegaki/fonts/ja-kana-hiragana'` で必要分のみ読む。欠点: (1) 179 字は既に小さく分割利得が薄い（YAGNI）、(2) 漢字バンドル（Phase 8+）まで待てば同じ仕組みで 2,136 字に効かせられる。**前倒しコストが本質**で、仮名段階では純然たる無駄。

**案 D（CDN 配布）** — npm に入れず jsDelivr / unpkg から fetch。bundle 0 KB、edge 低レイテンシ。**致命的欠点**: (1) オフライン CI / SSR / Cloudflare Workers で破綻（Phase 1 §11-2 で案 B/E が同じ理由で棄却されたのと同型）、(2) SRI 管理 / CDN 可用性 / 第三者依存のセキュリティ。Tegaki のオフライン前提と構造的に相容れない。

**案 E（multi-variant）** — `ja-kana-noto`（ゴシック）/ `ja-kana-mincho`（明朝）/ `ja-kana-zen-kurenaido`（手書き）を 3-4 種配布、ユーザーが好みで選択。利点: (1) フォント多様化要望に応える、(2) Zen Kurenaido を標準提供、(3) tree-shake で実 bundle 増最小。欠点: (1) Phase 4 予算超過（4-6 日）、(2) N × 300 KB で tarball 肥大、(3) decision fatigue。**Phase 6 目視評価後**に feedback 次第で Phase 7-8 前倒し可能。

**案 F（Service Worker + Cache Storage でオフラインファースト）— 新規追加** — 初回のみ CDN から仮名 bundle を fetch、以降 SW が Cache Storage に永続化 → bundle 0 KB でオフラインも成立、という**案 D の欠点をインフラ層で解消**する構造。
- 利点: (1) 初期 install 0 KB（tarball 最小）、(2) 2 回目以降は 5 ms 以下の SW cache hit、(3) CDN 更新時の cache 無効化（`Cache-Control` / hash suffix）で漢字追加時の段階配信が書きやすい、(4) 実質的に案 D + 案 A を時系列で両取り。
- 欠点（致命的）:
  - **SSR / Astro SSG / Cloudflare Workers / Deno Deploy で SW が動かない** — Tegaki の対応環境の半分が落ちる。[astro/TegakiRenderer.astro](../../packages/renderer/src/astro/TegakiRenderer.astro) / [remotion](../../packages/renderer/src/remotion/) が壊滅。
  - **初回オフラインで動かない** — 開発環境初回起動 / CI 初回実行で fetch 必須、Phase 1 §11-2 の「オフライン CI 死亡」条件を踏む。
  - SW lifecycle（`install` / `activate` / `fetch`）を renderer パッケージ側に責任持たせる必要 = framework-agnostic でなくなる（AGENTS.md の核心設計違反）。
  - SW スコープは origin 単位のため、`<script type="module">` で import するユーザーは SW 登録を自力で行う必要 → UX 複雑化。
  - cache 破棄戦略 / 古い SW の置換えフロー設計で工数 5-7 日。
- 失敗モード: SW の `activate` phase が競合状態で 2 世代の cache が共存 → renderer が古い glyphData を掴んで描画崩壊。SSR/Workers 環境でユーザーが気づかずに import → build が壊れる。
- **判定**: 方向性は魅力的だが、**「オフライン初手で動く」「SSR/Workers 互換」という Tegaki の 2 つの必須契約を同時に破る**ため Phase 4 棄却。オフライン要件のある PWA エコシステム向け**別 adapter** (`tegaki/sw-cache-adapter` のような opt-in パッケージ) として Phase 11+ に切り出すほうが自然。導入判断をユーザー側に明け渡す設計。

**案 G（Font Subset API で `ja-full` に統合）— 新規追加** — 仮名 179 字と常用漢字 2,136 字を**同一バンドル**に束ね、renderer 側で「使われている文字の subset のみ」を load する構造。**仮名 300 KB 制約そのものを、分母を漢字込みの数 MB に拡張して『実効サイズは subset 結果』という別の物差しに組み替える**、最上位の再設計。
- 利点:
  - **「仮名だけ 300 KB」という窮屈な NFR の制約を、ja-full への昇格で意味が変わる境界として再解釈**できる（漢字 3.6 MB と比較すれば 300 KB は余裕、そもそも bundle 分割せず 1 本化が素直）。
  - subset 処理は woff2 `unicode-range` + `glyphData` の遅延 JSON parse の組合せで client 側実装可能（[packages/renderer/src/lib/font.ts](../../packages/renderer/src/lib/font.ts) に subset lookup を足す）。
  - ユーザーが「どのバンドルを import するか」を選ぶ decision fatigue を消せる（常に `tegaki/fonts/ja-full`）。
  - 漢字バンドル化（Phase 8+）が**本 Phase で設計完了**、段階移行コストをゼロにできる。
- 欠点（致命的）:
  - **TegakiBundle 型の拡張が必要** — 現行は単一 `glyphData: Record<char, Glyph>` 前提で、subset API は `loadSubset(chars: string): Promise<Glyph[]>` の async 前提。renderer 6 adapter（React / Svelte / Vue / Solid / Astro / WC）全てに波及。
  - NFR-5.1 の「300 KB 上限」を「ja-full は数 MB 要件」に改訂する必要。[requirements.md](../requirements.md) の契約変更は本 Phase スコープ外。
  - **仮名 179 字の単独 bundle のまま提供する誘因が消え**、ユーザーが「仮名だけ軽量に使いたい」ケースを切り捨てる。
  - Phase 8+ の漢字バンドルを**本 Phase で実装する**ことと等価（工数 10-12 日、Phase 4 予算 2 日を完全超過）。
  - subset 境界の cache / hit rate 最適化（どの漢字を事前 load するか）が runtime ヒューリスティクス設計になる。
- 失敗モード: subset load が async 化されることで renderer の初回描画が非決定的になり、PreviewApp の e2e テスト（§8-2）が全て書き直し。glyphData の lazy load が未解決状態でエンジンが timeline 計算に入ると stroke 数ゼロで空描画。
- **判定**: 魅力的だが、(1) 仮名単独 bundle という Phase 4 のスコープと、(2) 300 KB 上限という NFR 契約を両方壊す**最上位の再設計**。Phase 8（漢字バンドル）議論で案 G を正式に評価するのが段階設計として素直。**本 Phase では `tegaki/fonts/ja-kana` 命名を `ja-full` との将来統合に対し互換になるよう予約**（§11-7）して逃す。

### 11-4. 結論: 私ならこうする（断言）

**Phase 4 では案 A を採用。Phase 6 以降の feedback 次第で案 E へ段階拡張、Phase 8 の漢字バンドル議論で案 G を正式評価、サイズ圧力が致命化したら案 C、ML 生成 fallback が実用化したら案 B の部分導入**、というのが私の結論。**案 D はオフライン CI 破綻で棄却、案 F は SSR/Workers 非互換と初回オフライン不成立で棄却**（PWA adapter として Phase 11+ 分離）。

この「**A → E → G（Phase 8 再評価）→ C / B → F（PWA 分離）** の段階拡張経路」は Phase 1 §11-5（dataset boundary）・Phase 2 §11-4（parser boundary）・Phase 3 §11-4（`StrokeSource` interface）と**同じ原則の配布層への垂直延長**:

1. **今増やす自由度は、次に本当に必要になる自由度だけ**（Phase 4 時点で必要なのは「Noto Sans JP 仮名の pre-built 配布」1 種類 = 案 A）
2. **将来増やす予定の自由度の interface 契約だけは今書く**（§11-7 — `generate-fonts` script のパラメタ化、`fonts/ja-kana-*` / `ja-full` 命名規則の予約、bundle.ts の subset 対応余地）
3. **配布媒体の分岐は、配布媒体ごとの互換性契約（SSR / Workers / PWA）が本当に分岐してからで遅くない**（案 F の SW cache は Phase 11+ の PWA adapter で議論）

根拠（定量）:

1. **案 A は FR-6.1〜6.4 を機械的に満たす唯一の最小コスト解** — Caveat パターン踏襲で実装 2 日、学習コストゼロ、テスト容易、既存 4 フォントと byte-identical 保証可能（NFR-2.2）。
2. **案 B/C は Phase 4 予算超過（10-15 / 3-4 日 vs 予算 2 日）** — 得られる価値は Phase 8+ の漢字 bundle / 任意フォント生成で自然に必要になるまで待てる。
3. **案 D はオフライン CI で破綻**、Phase 1 §11-2 の判断と整合（GitHub Actions rate limit / SRI 管理コスト）。
4. **案 E は「フォント多様化要望」が実証されていない時点で前倒し** — 初期リリースで Noto Sans JP 1 種のみで Phase 6 feedback を取り、"手書き感" vs "読みやすさ" の比率実測後に判断。
5. **案 F は SSR / Astro / Cloudflare Workers / Deno Deploy 環境を壊す** — Tegaki の framework-agnostic 契約（AGENTS.md）と根本的に非互換。PWA 向け opt-in adapter として Phase 11+ 以降に分離。
6. **案 G は NFR-5.1 改訂 + renderer 型拡張 + Phase 8 先食い**の 3 重負担 — Phase 8 で改めて漢字バンドル議論に合流させるのが素直、本 Phase は `ja-full` 命名互換の予約だけ打つ（§11-7）。

**仮名 300 KB 制約への構造的回避策の整理**:

「仮名 179 字で 300 KB 近接」という NFR-5.1 の圧力は、本 Phase 内では**正面突破（量子化・subset・split 退避）**で乗り切るが、構造的には 3 つの回避経路がある:

| 回避策 | 発動 Phase | 効果 | 採用判断 |
|---|---|---|---|
| 案 G（ja-full 統合） | Phase 8 | 分母を MB 級に拡張、実効サイズは subset で制御 | **Phase 8 で正式評価**（本 Phase は命名予約のみ） |
| 案 F（SW cache） | Phase 11+ | bundle 0 KB、NFR-5.1 自体を bypass | PWA adapter として opt-in |
| 案 C（split lazy） | Phase 8 以降 | 物理分割、合計サイズは変わらず | 漢字バンドル時に本領発揮 |

**本 Phase では回避策を発動せず、NFR-5.1 を正面突破する**（§9-1 対策 3-5）。これは「300 KB 制約は仮名単体 bundle 前提の NFR で、ja-full 統合や SW cache が視野に入る Phase 8+ で再定義する」という前提の表明であり、本 Phase §12-4 の「NFR-5.1 の上限見直し」Phase 8 申し送りと符合する。

**Phase 1 §11-5 / Phase 2 §11-4 / Phase 3 §11-4 との整合確認**:

| Phase | 結論 | 本 Phase での引継 |
|---|---|---|
| Phase 1 | 案 A（workspace 分離）+ Phase 2 で provider interface | 本 Phase は `@tegaki/dataset-cjk-kanjivg` を参照せず、Phase 3 の `datasetSkeleton()` 経由で透過使用 |
| Phase 2 | 案 A（自作 TS パーサ） | 本 Phase の仮名 179 字生成で `parseKanjiSvg()` の「`kvg:type` 空 = default フォールバック」経路を初運用 |
| Phase 3 | 案 A（三項分岐）+ 段階昇格（D/G/F） | 本 Phase は `datasetSkeleton()` の**消費者**として機能、generator 側無変更 |
| **Phase 4** | **案 A（pre-built npm bundle）** | Phase 8+ で案 G（ja-full 統合）評価、その後 E（multi-variant）/ C（split）/ B（runtime）/ F（SW PWA adapter）へ段階昇格 |

**結論要約: 案 A で実装、§11-7 の布石で A → E → G → C / B → F 全段階への拡張可能性を確保**。Pareto 最適。

### 11-5. 複数フォント・新言語・動的生成シナリオ

| シナリオ | 時期 | 吸収案 | 必要な新コード | 追加工数 |
|---|---|---|---|---|
| **手書き感フォント追加（Zen Kurenaido 等）** | Phase 7-8 | 案 E | `fonts/ja-kana-zen-kurenaido/` + exports | +0.5-1 日 |
| **明朝体仮名 variant** | Phase 8+ | 案 E | `fonts/ja-kana-mincho/` | +1 日 |
| **漢字バンドル（常用 2,136 字）同梱要望** | Phase 8+ | 案 G（ja-full 統合） or 案 C（split） | `fonts/ja-full/` + subset 設計 or `fonts/ja-joyo/` split | +10-12 日（G）/ +3-5 日（C） |
| **ユーザー任意フォント対応（runtime 生成）** | Phase 10+ | 案 B 部分導入 | generator を browser build 化 | +15-20 日 |
| **PWA / オフラインファースト対応** | Phase 11+ | 案 F（`tegaki-sw-adapter` 別 package） | SW 登録 + Cache Storage 戦略 | +5-7 日 |
| **CDN opt-in 配布（オフライン不要ユーザー向け）** | Phase 11+ | 案 D | CDN fetch wrapper、SRI 管理 | +5-7 日 |
| **簡体字仮名相当（繁体字・広東語版）** | Phase 10+ | 案 E（別言語） | `fonts/zh-hant-kana/` 等 | +2-3 日 |
| **ML 生成 fallback（任意フォント + 任意文字）** | Phase 12+（3-5 年後） | 案 B + Phase 3 §11 案 G `MlStrokeSource` | 推論モデル + client runtime | +20-30 日 |
| **教育向け複数バンドル（小学校 1-6 年配当別）** | Phase 11+ | 案 E + 案 G（subset） | 学年別 glyphData.json | +3-5 日 / 学年 |

本 Phase では上記**いずれも実装しない**。案 E/G/C/B/F 昇格時に自然に収まる構造を保つ（§11-7）。

### 11-6. この判断が 1 年後・3 年後に妥当か（検算）

- **1 年後（Phase 5-7 完了、Noto Sans JP 仮名運用中）**: 案 A のまま運用。feedback で「手書き感欲しい」が増えれば Phase 7-8 で案 E、「サイズ大きい」なら案 C を検討。仮名 300 KB は現代 web では致命的な訴求にならず、**不満ゼロ**で継続運用見込み。
- **3 年後（漢字バンドル追加検討時）**: 漢字 2,136 字 = ~3.6 MB で案 A 単体では配布不能。ここで**案 G（ja-full 統合）が本領発揮** — 仮名と漢字を 1 バンドル化し subset で実効サイズ制御、案 C（split）/ 案 B（runtime）も併用視野。本 Phase で `ja-full` 命名を予約しておいた布石が効く（`ja-kana` を `ja-full[subset=kana]` のエイリアスに昇格）。
- **3 年後（ML 生成実用化シナリオ）**: Phase 3 §11 案 G `MlStrokeSource` + 案 B 部分導入で「任意フォント → client 推論 → cache」を構築。本 Phase で generator を Bun/Node 前提のまま維持した判断が、ML 時代に「browser build は別 Phase」と遅延できる保険として効く。
- **3 年後（PWA / オフライン要件の台頭）**: 案 F が `tegaki-sw-adapter` として incubate。本 Phase で案 F を**renderer 本体に混ぜなかった**判断により、PWA を使わないユーザーは 0 KB 負担で済む。AGENTS.md の framework-agnostic 契約を守った配当。
- **3 年後（プロジェクト停滞シナリオ）**: 案 A は「動く状態でフリーズ」可能。npm に `ja-kana` が残り続け、`import kana from 'tegaki/fonts/ja-kana'` はずっと動く。**保守ゼロ耐久力**は案 A の隠れた強み。

**判断が崩れるシナリオ**:

- KanjiVG 消滅 / Noto Sans JP license 変更 → 案 E へ遡及移行、別フォントで `ja-kana-*` 再生成。
- Phase 6 目視評価で「Noto Sans JP 不自然」が圧倒多数 → 案 E 前倒し、Phase 7 で手書き風フォント追加（工数 +1 日、許容）。
- 仮名 bundle が 300 KB を**大幅**超過（例: 500 KB）→ 案 C 部分導入（hiragana / katakana split、合計は変わらないが gzip 後の hot path 削減）。
- **PWA/オフライン要件が web 標準契約化** → 案 F を主経路化する逆転、ただし 3 年スパンで発生確率低。
- **NFR-5.1 の 300 KB が requirements レビューで改訂** → 案 G が本 Phase で前倒し候補に浮上、ただし Phase 8 先食いになるため極力避ける。

### 11-7. 本 Phase で打っておく将来拡張の布石

Phase 1/2/3 §11-7 と同じ流儀で、**案 E/G/C/B/F 全段階昇格**に備える仕込みを本 Phase で済ませる。

**案 E（multi-variant）への布石**:
- `fonts/ja-kana/` の無印採用（初版）を維持。将来 `-zen-kurenaido` / `-mincho` 追加時は**無印 = noto の alias**として後方互換。
- `generate-fonts` script が「フォント名 + output path」でパラメタ化されていることを確認（既存 4 フォント構造を流用、自動達成）。
- README の "Pre-generated bundles" は variant 予告を入れず、Noto Sans JP で statement。

**案 G（ja-full 統合）への布石**:
- `fonts/ja-kana/` 命名を **`fonts/ja-full/` への将来統合**と互換に保つ — subset 機構導入時に `ja-kana` を `ja-full` の仮名 subset エイリアスとして提供、後方互換維持。
- `bundle.ts` の `glyphData` は compact key 形式（Phase 3 確定）を維持 — subset lazy load 導入時に JSON chunk 境界が切りやすい。
- renderer 型 `TegakiBundle` は本 Phase で**変更しない** — 案 G 導入時に `loadSubset?: (chars: string) => Promise<TegakiGlyphData>` optional 拡張で加算（破壊変更なし）。

**案 C（split lazy loading）への布石**:
- `fonts/ja-kana/` は単一バンドル出力（split しない）。
- 将来 split 時は `bundle.ts` が `glyphData.json` を import する構造のため、`glyphData-hiragana.json` / `glyphData-katakana.json` 分割は bundle.ts 1 ファイルの編集で完結。
- `package.json` exports は 1 エントリで充分、将来 split 時に `./fonts/ja-hiragana` / `./fonts/ja-katakana` 追加。

**案 B（runtime 生成）への布石**:
- `packages/generator/` は Bun/Node 前提維持（browser build は Phase 10+ で別立て）。
- `glyphData.json` の schema は runtime 生成時も同形、renderer 互換性自動担保。
- KanjiVG データ（`@tegaki/dataset-cjk-kanjivg`）は Phase 1 で sync + fs 前提、browser 化時は async wrapper を別レイヤで追加（Phase 1 §11-7 申し送り）。

**案 F（SW cache / PWA adapter）への布石**:
- renderer 本体には SW / Cache Storage コードを**一切入れない** — framework-agnostic 契約維持。
- 将来 `tegaki-sw-adapter` / `tegaki/pwa` パスを追加するとき、`bundle.ts` の glyphData は `fetch(bundleUrl).then(r => r.json())` 経路でも動く構造（すでに JSON chunk として分離済）を維持。
- bundle.ts が `import glyphData from './glyphData.json'` の static import を使い続けることは SW adapter と**両立可能**（SW が cache したファイルを module import 経由でも fetch 経路でも食える）。

**CI 化への布石**:
- `generate-fonts` script が idempotent（§10-3 確認項目）。
- 生成物（.ttf + .json + .ts）が deterministic（KanjiVG SHA pinned + generator 入力固定）。
- Phase 8 以降の GitHub Actions 自動再生成 workflow 追加コストが小さい。

**contracts sketch（本 Phase では実装せず、コメントで意図だけ残す）**:

```ts
// packages/renderer/fonts/ja-kana/bundle.ts（自動生成）
// NOTE(phase-4/§11-7): このファイルは将来 (a) `ja-kana-noto` 等の variant、
// (b) `ja-full` 統合バンドルの仮名 subset エイリアス、のいずれにも昇格しうる。
// 無印 `ja-kana` は `-noto` の alias として後方互換を保つ。
// 案 C（split）時は glyphData.json を hiragana/katakana に分割、
// 案 G（ja-full 統合）時は TegakiBundle.loadSubset?() を optional 追加、
// 案 F（SW cache adapter）時は本ファイルを変更せず別 package から fetch 経路で利用。
```

### 11-8. テスト戦略への反映

将来の案 E/G/C/B/F 昇格をテスト資産で支えるため、本 Phase の unit / e2e テスト（§7 / §8）に以下を織り込む:

- **179 字存在確認テスト（§7-1 T-02, T-03）**は「この bundle が仮名 179 字の契約を満たす」**契約テスト**。将来 `ja-hiragana` / `ja-katakana` split 時は `describe.each(['ja-kana', 'ja-hiragana + ja-katakana', 'ja-full[subset=kana]'])` で併走可能。
- **画分離テスト（§7-2）は KanjiVG 由来の画数契約**を機械検証。将来 variant（明朝 / 手書き風）追加時も**同じ画数**が契約となり共有可能。
- **サイズテスト（§7-4）は NFR-5.1 契約検証**。将来 variant 追加時は variant 個別に 300 KB を課す（合計ではない）、案 G 採用時は ja-full 契約を別 NFR に切り出し。
- **PreviewApp URL state e2e（§8-2）は `f=ja-kana` 選択肢が生きていることを検証**。将来追加の `f=ja-kana-zen-kurenaido` / `f=ja-full` も同 pattern で拡張可能。

### 11-9. Phase 1/2/3 の判断との相互検算

Phase 1/2/3 §11 の案選定は **「今やる自由度は必要分だけ、将来の自由度は interface 契約だけ」** の同一原則。本 Phase §11-4 も同形:

- **今やる**: 案 A（既存パターン踏襲、最小実装）
- **契約だけ先に書く**: `generate-fonts` script のパラメタ化、`fonts/ja-kana/` の variant + ja-full 互換命名、bundle.ts の JSON 分離構造、renderer 型拡張余地、SW adapter 分離方針
- **将来実装する**: 案 E → 案 G → 案 C / 案 B → 案 F の段階昇格（feedback と実需要に応じて）

**Phase 1/2/3/4 全 §11 の原則一貫性**:
- Phase 1: workspace 分離案 A + provider interface 布石（Phase 2 実装）
- Phase 2: 自作 TS パーサ案 A + provider interface 実装
- Phase 3: 三項分岐案 A + `StrokeSource` interface 布石（Phase 5/6/8+ 段階昇格）
- **Phase 4: pre-built bundle 案 A + variant 命名 / ja-full 統合 / SW adapter 分離の 3 重布石（Phase 8+ 段階昇格）**

4 Phase 連続で同一原則を適用することで、「**Tegaki の OSS 単独メンテ体制で、自由度増分のコストが直接保守負担になる**」制約への耐久性ある設計が積み上がる。3 年後の自分から見ても、この 4 連の判断列は **「YAGNI と拡張性のバランスを毎回同じ流儀で取った」** と説明できる。

以上により、**案 A を選ぶことは「今は最小コスト、将来の E/G/C/B/F 移行コストも最小、仮名 300 KB 制約の構造的回避策（案 G）への予約もゼロコスト、PWA/オフライン要件（案 F）の分離も予約済」という Pareto 最適**。1 年後・3 年後の自分が検算しても、説明責任を負える自信がある。

---

## §12. 後続タスクへの申し送り

### 12-1. Phase 5（Sigma-Lognormal リズム）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **仮名は rhythm 合成対象に含める** | **含める（デフォルト）** | `ja-kana` bundle も `--rhythm lognormal` の対象。fall back プロファイルが `default` になる |
| **`kvg:type` が null の仮名の rhythm デフォルト挙動** | `endpointType = 'default'` → 標準 Lognormal プロファイル（σ=0.3, μ=0）、終端テーパなし | [technical-validation.md §1-6 #2](../technical-validation.md) + Phase 2 §12-3 |
| **本 Phase bundle の再生成要否** | **不要**（rhythm が runtime 計算の場合）、**必要**（bundle 埋込みの場合） | [Q-6 デフォルト: runtime 計算](../japanese-roadmap.md) により仮名 bundle 無変更で rhythm 動作 |
| **`BUNDLE_VERSION` 互換性** | 現在 0、Phase 5 で runtime 計算に寄せる限り **0 のまま** | [NFR-2.4](../requirements.md) 維持 |
| **rhythm 適用時の視覚確認対象** | 代表 6 字: き / さ / ふ / を / ア / ン | Phase 6 の視覚評価対象に本 Phase bundle を含める |
| **import path** | `import kana from 'tegaki/fonts/ja-kana'` | 本 Phase 完了後は Phase 5 側で rhythm を被せて試験可能 |

### 12-2. Phase 6（検証・チューニング）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **目視確認対象に追加する仮名字** | き（4画）/ さ（3画）/ ふ（4画）/ を（3画）/ ア（2画）/ ン（2画）| [japanese-roadmap.md §2 Phase 6](../japanese-roadmap.md) の仮名テスト字と一致 |
| **PreviewApp 再現 URL（推奨セット）** | `http://localhost:4321/tegaki/generator/?f=ja-kana&t=きさふをアン&m=text&fs=96&tm=controlled&ct=3.5` | 本 Phase 完了時に即試験可能 |
| **Noto Sans JP 以外の variant 要望の収集** | 「手書き風」vs「ゴシック」のユーザー好み比率を定性評価 | 案 E（複数 variant）への移行判断材料 |
| **既知の曖昧字** | ゐ（U+3090）/ ゑ（U+3091）等の歴史的仮名は収録されているが、現代教科書筆順と KanjiVG 筆順が一致するか未検証 | Phase 6 視覚確認で issue 化、必要時 Phase 8 fix-overrides |

### 12-3. Phase 7（ドキュメント・サンプル）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **ドキュメント追加場所** | `packages/website/src/content/docs/guides/japanese.mdx` | 本 Phase 完了後に Phase 7 で本格化 |
| **example 追加場所** | `packages/website/src/components/HomePageExamples.tsx` または `StaticChatDemo.tsx` | `<TegakiRenderer font={kana}>あいうえお</TegakiRenderer>` の 1 例を最小で |
| **README 拡張**: | `packages/renderer/README.md` の "Pre-generated bundles" セクション | 本 Phase §3-9 で最小追加済、Phase 7 で詳細使用例追加 |
| **Framework ごとの example** | React / Svelte / Vue / Solid / Astro / WC の 6 方式で仮名 example を Phase 7 で網羅 | 本 Phase では React 1 方式のみ先行 |

### 12-4. Phase 8（リリース判断）へ渡す情報

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **CI 化の要否** | **方針 X（手動 commit）継続推奨**、Phase 8 で CI 化検討 | §3-8 判定 |
| **variant 追加の検討トリガー** | Phase 6 目視評価で「手書き風希望」が過半数 → 案 E 前倒し、もしくは Phase 8 リリース判断時に variant 2 種追加 | §11-5 シナリオ参照 |
| **サイズモニタリング** | 本 Phase 実測値を基準に、KanjiVG / Noto Sans JP 更新時のサイズドリフトを Phase 8 リリース直前に計測 | 実測 >300 KB 危険域突入時は案 C 部分導入（§11-5 工数 +3-5 日） |
| **漢字バンドル（常用 2,136 字）の検討** | Phase 8 リリース後のユーザー要望次第。本 Phase の仮名 179 字経験から「1 文字当たり 1.7 KB」を類推し、常用 = **約 3.6 MB** と試算（案 A では配布不能、案 C 必須） | §11-5 シナリオ |
| **NFR-5.1 の上限見直し** | 300 KB は仮名単体前提。漢字追加時は上限再定義必要 | [requirements.md NFR-5.1](../requirements.md) 改訂候補 |

### 12-5. Phase 4 の成果物が影響する他パッケージ

| パッケージ | 影響 | 備考 |
|---|---|---|
| `tegaki`（renderer） | `exports['./fonts/ja-kana']` 追加、`fonts/ja-kana/` 配下に 3-4 ファイル追加 | 本 Phase の主変更 |
| `tegaki-generator` | **無変更**（既存 `generate` コマンドを `--dataset kanjivg` 付きで呼ぶだけ） | Phase 3 実装に依存 |
| `@tegaki/dataset-cjk-kanjivg` | **無変更**（Phase 3 の `datasetSkeleton()` 経由で透過的に使用） | Phase 1 実装に依存 |
| `@tegaki/website` | PreviewApp の font 選択リストに `ja-kana` 追加（本 Phase §9-5）、docs に example 追加（Phase 7） | 本 Phase 部分変更 |

### 12-6. 運用・保守上の注意事項

- **KanjiVG 更新時の仮名 bundle 再生成**: [Phase 1 KANJIVG_SHA pinning](../../packages/dataset-cjk-kanjivg/src/constants.ts) の SHA が更新されたら、本 Phase bundle も再生成が必要。`bun run generate-fonts` を手動実行 → 差分 commit の運用フロー。Phase 8 以降で CI 化検討。
- **Noto Sans JP 更新時の対応**: Google Fonts 側の Noto Sans JP バージョンアップは、`packages/generator/src/font/download.ts` の Google Fonts CSS endpoint fetch 経由で自動追従。ただしストローク座標が微変する可能性があるため、bundle 再生成後に §8-3 の **既存 4 フォント無変更**チェックに加えて**本 Phase bundle 内部の画数チェック**（§7-2）を再実行。
- **「濁音を U+3099 で合成したい」ユーザー要望への対応**: 現状は独立字 `が` / `ぱ` として収録。合成文字列 `か + U+3099` を glyphData lookup で解決する機構は未実装。Phase 7 のドキュメントで「本 bundle は単独 codepoint ベース」と明記、Unicode 正規化を事前に行うよう推奨。
- **縦書きモード（`writing-mode: vertical-rl`）**: 本 Phase スコープ外（[roadmap Q3 対象外](../japanese-roadmap.md)）。将来 Phase で対応する場合、本 bundle の glyph 座標は横書き前提なので transform を別途適用する必要あり。

### 12-7. API / バンドル形式の将来拡張余地

- **`fullFontUrl` 省略 option**: 現在 subset ttf + full ttf の 2 本配布だが、サイズ圧力時は full を省略し subset のみで運用可能。bundle.ts の `fullFontUrl` optional 化を検討（renderer 側 fallback 実装次第）。
- **複数 variant 同梱 bundle**: 将来案 E 昇格時、`ja-kana-multi` として複数 font 情報を 1 bundle に束ねる選択肢。ただし現状 `TegakiBundle` は単一 family 前提のため、型拡張が必要。Phase 8+ 議論。
- **バリアント字対応**（ゐゑ等の歴史的仮名、`ー` 以外の長音符等）: 現状 179 字に含まれるゐ・ゑはそのまま収録。将来「変体仮名」対応要望が出たら KanjiVG 収録外のため外部データ必要（Phase 11+）。
- **Subset fine-grained 制御**: ユーザーが「ひらがなだけ欲しい」場合に `tegaki/fonts/ja-hiragana` を split 提供するのは案 C の実装（Phase 8+）。

### 12-8. Phase 4 → Phase 6 の検証チェーン

Phase 4 完了時点で **第一次リリース同梱要素**。ただし以下は Phase 6「日本人評価者 MOS」で初検証:

- 仮名筆順の**正確さ**（代表 6 字 → 179 字本番検証）
- Noto Sans JP の**美的品質**（手書きアニメとして違和感ないか）
- 画数の**文部科学省 vs KanjiVG 差異**（ゐ・ゑ等の歴史的仮名）
- rhythm 前の**等速描画**への評価（Phase 5 rhythm で改善予定）

Phase 6 の低評価は **Phase 5 rhythm 適用**で多くが解決される見込み。本 Phase は「筆順のみ正しく、リズムは等速」を**意図的に受け入れ**、Phase 5 へ改善余地を残す点は Phase 3 §12-8 と同じ設計思想。

---

### 関連チケット

- 前: [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)
- 次: [Phase 5: Sigma-Lognormal リズム](./phase-5-rhythm-synthesis.md)（**並列可**）/ [Phase 6: 検証・チューニング](./phase-6-validation.md)
- 並列: [Phase 5: Sigma-Lognormal リズム](./phase-5-rhythm-synthesis.md)
- 一覧: [docs/tickets/README.md](./README.md)

### 関連ドキュメント

- 設計方針: [japanese-support.md](../japanese-support.md)（§3-1 / §10）
- 実装ロードマップ: [japanese-roadmap.md](../japanese-roadmap.md)（§2 Phase 4）
- 技術検証: [technical-validation.md](../technical-validation.md)（§1-4 仮名収録数 / §1-6 #2 `kvg:type` 空）
- 要件定義: [requirements.md](../requirements.md)（FR-6, NFR-1.3, NFR-5.1, NFR-2）
- プロジェクト全体: [AGENTS.md](../../AGENTS.md)
