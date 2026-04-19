# Phase 7: ドキュメント・サンプル `packages/website/src/content/docs/guides/japanese.mdx` + `examples/*-ja/`

> 日本語対応実装の**第 7 マイルストーン**。Phase 6 までに実装・検証が完了した日本語パイプライン（KanjiVG 筆順 + 仮名バンドル + Sigma-Lognormal リズム）を、**エンドユーザーが実際に利用できる状態**に整える。Starlight ドキュメントに日本語ガイドを追加し、`PreviewApp` に日本語プリセットを常設し、`examples/react-ja/` と `examples/astro-ja/` で動作する最小コードを提供する。本 Phase 完了時点で、[requirements.md AC-4](../requirements.md) の 4 項目（日本語ガイド追加 / README 明記 / examples に日本語デモ / 生成 URL の動作）を満たし、Phase 8（リリース判断・上流提案）に引き渡し可能な状態となる。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **7 / 8** |
| マイルストーン名 | ドキュメント・サンプル（Starlight `japanese.mdx` 新規 + `PreviewApp` 日本語プリセット + `examples/react-ja/` と `examples/astro-ja/` 新規 + README 日本語明記） |
| ブランチ名 | `feat/ja-phase7-docs` |
| ステータス | ✅ 完了 (merged in `9058e56`) |
| 依存（前段） | [Phase 6: 検証・チューニング](./phase-6-validation.md)（main マージ済み必須、σ/μ パラメタ確定 / MOS 評価スコア確定 / 既知の限界リスト確定） |
| 依存（後段） | [Phase 8: リリース判断](./phase-8-release.md) が本 Phase のドキュメント一式を上流 PR 本文 / 自前リリース npm README のソースとして消費 |
| 並列関係 | **なし**（Phase 6 の成果物をドキュメント化するため、Phase 6 完了後に直列着手。ただし本 Phase 内では §4 の通り 3 担当が並列） |
| 想定期間 | **3 営業日**（一人稼働、チーム 3 名で並列 1.5 日）— ロードマップ 3 日想定と一致 |
| 担当見積 | `japanese.mdx` 執筆 1.0d + examples 実装 1.0d + `PreviewApp` プリセット + URL state 0.5d + README 差分 0.3d + ビルド確認・視覚 QA 0.2d |
| **リリース区分** | **リリース準備完了点**（Phase 6 の評価が合格済み → Phase 7 でドキュメント整備 → Phase 8 で公開判断） |
| **リスク評価** | 低：コード変更は最小差分（`PreviewApp` プリセット追加と URL state 拡張のみ）、リスクはドキュメント翻訳品質とライセンス記載漏れに限定（§9） |
| 関連要件 | [requirements.md](../requirements.md) AC-4 全 4 項目 / FR-8 (CLI) / NFR-4.1-4.4 (ライセンス) |
| 関連設計 | [japanese-support.md](../japanese-support.md) 既知の限界節 / §6 運用 |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §Phase 7（3 日想定 / 成果物 4 点） |
| 関連技術検証 | [technical-validation.md](../technical-validation.md) — 使い方の根拠として引用のみ（新規技術検証なし） |
| 前フェーズ申し送り | [phase-6-validation.md §12](./phase-6-validation.md) — 確定 σ/μ パラメタ / 評価スコア / 誤り字リスト / JIS 第 3/4 水準フォールバック挙動 |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続フェーズ or 対象外） |
|---|---|
| `packages/website/src/content/docs/guides/japanese.mdx` 新規作成（使い方 / サポート範囲 / 既知の限界 / ライセンス注意） | 英語版の `japanese.en.mdx`（§9-D で議論、Phase 8 にて判断） |
| `PreviewApp.tsx` に日本語プリセットボタン追加（`ja-basic` / `ja-kanji` の 2 種） | `PreviewApp` 全体の UX リファクタ（他言語切替 UI 等） |
| `url-state.ts` への `preset` キー追加（`pr` は pixelRatio で使用済のため別キー、`ja=1` 候補） | URL state の破壊的リネーム |
| `examples/react-ja/` 新規作成（Vite + React + tegaki の最小構成、`Hello` ではなく `ありがとう` を描く） | 他フレームワーク例（Vue/Svelte/Solid/WC）— §9-C で議論、Phase 8 で拡張可 |
| `examples/astro-ja/` 新規作成（Astro + tegaki/astro、SSG） | Next.js / Remix / Nuxt 等の追加例 |
| リポジトリ直下 `README.md` の Framework Support セクションに「Japanese support」行追加と CJK サンプル URL リンク | README 全体のリニューアル |
| `japanese.mdx` 内で Phase 6 確定の既知の限界（誤り字リスト）を表形式で明記 | 誤り字の修正（Phase 6 で扱う、または将来の KanjiVG 上流更新に委譲） |
| `japanese.mdx` 内で JIS 第 3/4 水準フォールバック挙動を記載（現行ヒューリスティックにフォールバック、警告ログ） | JIS 第 3/4 水準の正式サポート（[requirements.md §5 対象外](../requirements.md)） |
| CC-BY-SA 3.0 の share-alike 要件を `japanese.mdx` と `examples/*-ja/README.md` の両方に明記 | ライセンス変更（本体は MIT 維持） |
| `bun --filter @tegaki/website build` と `bun --filter examples/* build` で全例がビルド通過 | CI 化（§9-E で議論、Phase 8 の範囲） |
| `bun dev` で `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` が**デフォルト動作**（URL 到達で自動ロード） | PreviewApp のパフォーマンス最適化 |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[japanese-roadmap.md §Phase 7](../japanese-roadmap.md) と [requirements.md AC-4](../requirements.md) で規定される「エンドユーザーが日本語対応を発見・理解・利用できる」状態への到達が本 Phase の任務。Phase 1-6 で技術的な実装と検証は終わっているが、以下の 5 点が未達のままでは公開できない。

1. **発見可能性（Discoverability）の欠如** — Phase 6 完了時点でコードは動くが、Starlight ドキュメントには英語フォント（Caveat 等）の例しかなく、「日本語が使えること」が**ユーザーに伝わらない**。検索エンジンからの流入導線がない。日本語開発者が「tegaki 日本語」で検索した際に最初に到達する 1 ページが必要（[AC-4](../requirements.md) §1）。

2. **使い方（How-to）の欠如** — 内部開発者は `--dataset kanjivg` フラグや `Noto Sans JP` の Google Fonts 名を把握しているが、外部ユーザーには不明。最小動作コード（5 行程度）と、ライブデモ URL を 1 セット提示する必要がある（[requirements.md FR-8.1](../requirements.md)）。

3. **既知の限界（Known Limitations）の文書化欠如** — Phase 6 で発覚した「誤り字リスト」（例: 特定の漢字で KanjiVG の筆順が教育現場と乖離する事例）や、JIS 第 3/4 水準のフォールバック挙動は、**ドキュメント化されていなければユーザーは予期しない挙動にぶつかる**。[japanese-support.md](../japanese-support.md) の既知の限界節への追記と、`japanese.mdx` での同じリストの公開が必要。

4. **ライセンス要件の明示欠如** — KanjiVG データは CC-BY-SA 3.0 で、本体 tegaki は MIT。`@tegaki/dataset-cjk-kanjivg` を介した share-alike 連鎖は [NFR-4.2](../requirements.md) で隔離済だが、**エンドユーザーが再配布する際に「帰属表記が必要」であること**は `japanese.mdx` とサンプルコードで 2 重に明記する必要がある。Phase 1 の `ATTRIBUTION.md` だけでは気付かない。

5. **動作するサンプルの欠如** — `examples/remotion/` は唯一のサンプルで、英語のみ。React / Astro で日本語 Noto Sans JP を読み込んで `ありがとう` を描くコードが**コピペで動く最小形**で存在しなければ、ユーザーは「自分で試す」前に離脱する。[requirements.md AC-4 §3](../requirements.md)「`examples/` に日本語手書きデモ（最低 React + Astro）」を満たす必要がある。

### 2-2. Done の定義（測定可能）

以下 **15 項目すべて** を満たしたとき本チケット完了。[AC-4](../requirements.md) の 4 項目 + [NFR-4 ライセンス](../requirements.md) + 運用品質を網羅する構成。

- [ ] **D-1** `packages/website/src/content/docs/guides/japanese.mdx` が新規追加、Starlight のサイドバーに「日本語対応」として項目表示（`getting-started`, `generating`, `rendering`, `streaming` と並ぶ `guides/` 直下）
- [ ] **D-2** `japanese.mdx` 内で **使い方** セクションが実装: 最小コード 5-10 行 + `bun dev` 起動手順 + ライブデモ URL（`/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` を iframe or リンク）
- [ ] **D-3** `japanese.mdx` 内で **サポート範囲** セクションが実装: 常用漢字 2,136 字 100% / 人名用漢字 863 字 95% / 仮名（ひら・カタ）100% / 半角数字・ラテン 100% を表形式で記載。Phase 6 確定値を反映（100%/95% は Phase 6 完了後に置換）
- [ ] **D-4** `japanese.mdx` 内で **既知の限界** セクションが実装: Phase 6 の誤り字リスト（最低 5 字想定）/ JIS 第 3/4 水準フォールバック挙動 / 縦書き非対応 / 簡体字・繁体字・韓国語非対応 を箇条書き（[requirements.md §5 対象外](../requirements.md) 準拠）
- [ ] **D-5** `japanese.mdx` 内で **ライセンス注意** セクションが実装: MIT (本体) + CC-BY-SA 3.0 (KanjiVG データ) の並立構造、share-alike 要件（派生データに CC-BY-SA 継承）、帰属表記サンプル（4 行の credit 文）
- [ ] **D-6** `PreviewApp.tsx` に日本語プリセットボタン 2 種追加（`ja-basic`: 仮名のみ `ありがとう` / `ja-kanji`: 常用漢字混在 `日本語を書く`）、クリックで `m=text` + `t=...` + `f=Noto+Sans+JP` + `rhythm=lognormal` を URL にセット
- [ ] **D-7** `url-state.ts` に `preset?: 'ja-basic' | 'ja-kanji'` 追加（key: `ps`）、URL `?ps=ja-basic` で D-6 のプリセット状態を復元可能
- [ ] **D-8** `examples/react-ja/` が新規作成、`bun --filter examples/react-ja build` が成功、`bun --filter examples/react-ja dev` で `ありがとう` が描画される
- [ ] **D-9** `examples/astro-ja/` が新規作成、`bun --filter examples/astro-ja build` が成功（SSG 出力に HTML としてパスが含まれる）
- [ ] **D-10** `examples/react-ja/README.md` と `examples/astro-ja/README.md` がそれぞれ存在し、CC-BY-SA 3.0 帰属表記とセットアップ手順（`bun install && bun dev`）を記載
- [ ] **D-11** リポジトリ直下 `README.md` の Framework Support セクションに「Japanese (CJK) support via KanjiVG — see [guides/japanese](...)」の 1 行追加、サンプル URL リンク
- [ ] **D-12** `bun dev` 起動後に `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` がフォント読込エラーなく描画（[AC-4 §4](../requirements.md)）
- [ ] **D-13** `bun --filter @tegaki/website build` が成功、ビルド成果物に `guides/japanese.html` が含まれる
- [ ] **D-14** `bun typecheck && bun run test && bun check` 全通（[NFR-3.2](../requirements.md)）
- [ ] **D-15** [japanese-support.md](../japanese-support.md) 既知の限界節に Phase 6 誤り字リストが追記されており、`japanese.mdx` の同セクションと内容が一致（2 重メンテの発生を意識して §9-A で議論）

---

## §3. 実装内容の詳細

### 3-1. ディレクトリツリー（追加・変更分のみ）

```
packages/website/src/
  content/docs/
    guides/
      japanese.mdx                         # 新規: ~300 行のガイド本文
  components/
    PreviewApp.tsx                         # 差分: 日本語プリセットボタン追加（~30 行差分）
    url-state.ts                           # 差分: preset キー追加（~10 行差分）

examples/
  react-ja/                                # 新規ディレクトリ
    package.json                           # 新規: Vite + React + tegaki 依存
    tsconfig.json                          # 新規: tegaki 本体と共通化
    vite.config.ts                         # 新規
    index.html                             # 新規
    src/
      main.tsx                             # 新規: createRoot
      App.tsx                              # 新規: <TegakiRenderer text="ありがとう" />
    README.md                              # 新規: 帰属表記 + セットアップ手順
  astro-ja/                                # 新規ディレクトリ
    package.json                           # 新規: Astro + tegaki/astro
    astro.config.ts                        # 新規
    tsconfig.json                          # 新規
    src/
      pages/
        index.astro                        # 新規: <TegakiRenderer text="ありがとう" />
    public/                                # 空（SSG 出力のみ）
    README.md                              # 新規

docs/
  japanese-support.md                      # 差分: 既知の限界節に Phase 6 誤り字リスト追記

README.md                                  # 差分: Framework Support セクションに日本語対応 1 行追加
```

**合計差分**: 新規 13 + 変更 4 ファイル。コード差分は小さく、ドキュメント（`.mdx` と `.md`）が中心。

### 3-2. `japanese.mdx` 構成（~300 行想定）

Starlight MDX で frontmatter + `<Aside>` / `<Steps>` / `<LinkCard>` を使い、以下 6 節構成で執筆。本文詳細は担当 A がドラフト、PR で確定。

| 節 | 内容要点 | 主要コンポーネント |
|---|---|---|
| frontmatter | `title: 日本語対応` / `description` に CJK/KanjiVG/常用漢字等の SEO ワード / `sidebar.order: 5` / `sidebar.label: 日本語対応 (Japanese)` | — |
| 概要 | KanjiVG + Sigma-Lognormal での日本語サポート要旨、ライブデモへの導線 | `<LinkCard href="/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP" />` |
| 使い方 | (1) `bun add tegaki @tegaki/dataset-cjk-kanjivg` → (2) `bun start generate --font "Noto Sans JP" --dataset kanjivg --rhythm lognormal` → (3) React で `<TegakiRenderer text="ありがとう" bundle={notoJpBundle} />` | `<Steps>` + `<Aside type="tip">` で examples/*-ja 案内 |
| サポート範囲 | 4 列表（文字種 / カバレッジ / データソース / 備考）。ひら・カタ 100% / 常用 100% / 人名用 95% / JIS 第 1-2 水準約 90% / JIS 第 3-4 水準フォールバック / 半角数字・ラテン 100% | 表 |
| 既知の限界 | Phase 6 確定誤り字リスト（最低 5 字）、JIS 第 3/4 水準挙動（スケルトンフォールバック）、非対応（縦書き / 簡体字 / 繁体字 / 韓国語 / くずし字 / 手書き認識） | `<Aside type="caution">` |
| ライセンス注意 | 本体 MIT と KanjiVG CC-BY-SA 3.0 の並立、share-alike 継承、`@tegaki/dataset-cjk-kanjivg` 隔離構造（[NFR-4.2](../requirements.md)）、帰属表記テンプレ（Phase 1 `ATTRIBUTION.md` 準拠、コピペ可） | `<Aside>` + コードブロック |
| 関連ドキュメント | `./generating` / `./rendering` / `japanese-support.md` へのリンク | リンクのみ |

**帰属表記テンプレ**（Phase 1 `ATTRIBUTION.md` からコピー、本節とサンプル README で共用）:

```text
This work is derived from KanjiVG (https://kanjivg.tagaini.net/)
by Ulrich Apel and contributors, licensed under CC-BY-SA 3.0.
Modifications: stroke data converted to TegakiBundle format
(https://github.com/ayutaz/tegaki).
```

### 3-3. `PreviewApp.tsx` の差分（日本語プリセット追加）

[PreviewApp.tsx](../../packages/website/src/components/PreviewApp.tsx) の text モード UI に、「日本語プリセット」セクションを追加する。既存のフォント選択 UI の下、text 入力の上に配置。

```tsx
// packages/website/src/components/PreviewApp.tsx (差分、~30 行)
type JaPreset = 'ja-basic' | 'ja-kanji';

const JA_PRESETS: Record<JaPreset, { text: string; label: string; font: string }> = {
  'ja-basic': { text: 'ありがとう', label: '仮名のみ（ありがとう）', font: 'Noto Sans JP' },
  'ja-kanji': { text: '日本語を書く', label: '漢字混在（日本語を書く）', font: 'Noto Sans JP' },
};

function applyJaPreset(preset: JaPreset, setState: (updater: (s: State) => State) => void) {
  const { text, font } = JA_PRESETS[preset];
  setState((s) => ({
    ...s,
    mode: 'text',
    text,
    fontFamily: font,
    rhythm: 'lognormal',
    preset,
  }));
}

// ... UI (text モードのときのみ表示) ...
{mode === 'text' && (
  <div className="flex gap-2 my-2">
    <span className="text-sm">日本語プリセット:</span>
    {(['ja-basic', 'ja-kanji'] as const).map((p) => (
      <button
        key={p}
        onClick={() => applyJaPreset(p, setState)}
        className="px-2 py-1 rounded border text-xs"
      >
        {JA_PRESETS[p].label}
      </button>
    ))}
  </div>
)}
```

### 3-4. `url-state.ts` の差分（`preset` キー追加）

[url-state.ts](../../packages/website/src/components/url-state.ts) に `preset` フィールドを追加し、URL キー `ps` にマッピング。`pr` は pixelRatio で使用済のため衝突回避。

```ts
// packages/website/src/components/url-state.ts (差分)
export interface UrlState {
  // ... 既存フィールド ...
  preset?: 'ja-basic' | 'ja-kanji';
}

const URL_DEFAULTS: UrlState = {
  // ... 既存 ...
  preset: undefined,
};

export function parseUrlState(): UrlState {
  // ... 既存 parse ...
  if (p.has('ps')) {
    const ps = p.get('ps')!;
    if (ps === 'ja-basic' || ps === 'ja-kanji') state.preset = ps;
  }
  return state;
}

export function serializeUrlState(state: UrlState): string {
  const p = new URLSearchParams();
  // ... 既存 serialize ...
  if (state.preset) p.set('ps', state.preset);
  return p.toString();
}
```

### 3-5. `examples/react-ja/` 構成（~10 ファイル）

[examples/remotion/](../../examples/remotion/) を参考に、Vite + React の最小構成で作成する。`tegaki` は `workspace:*` で monorepo 内参照。

**`examples/react-ja/package.json`**:
```json
{
  "name": "example-react-ja",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tegaki": "workspace:*",
    "@tegaki/dataset-cjk-kanjivg": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.7.0",
    "vite": "^7.0.0"
  }
}
```

**`examples/react-ja/src/App.tsx`** の核は `<TegakiRenderer text="ありがとう" bundle={notoJpBundle} fontSize={96} rhythm="lognormal" />` + KanjiVG CC-BY-SA クレジット行。`README.md` は Setup（`bun install && bun --filter examples/react-ja dev`）と Credits（KanjiVG CC-BY-SA 3.0 + Noto Sans JP SIL OFL 1.1）の 2 節のみ。

### 3-6. `examples/astro-ja/` 構成（~8 ファイル）

Astro 最小構成 + `tegaki/astro` adapter。`src/pages/index.astro` frontmatter で `import { TegakiRenderer } from 'tegaki/astro'; import notoJpBundle from '../../generated/noto-sans-jp/bundle';` し、body に `<TegakiRenderer text="ありがとう" bundle={notoJpBundle} fontSize={96} rhythm="lognormal" />` + KanjiVG クレジットを配置。`<html lang="ja">` 必須。README は react-ja と同形式。

### 3-7. README 差分（Framework Support セクション）

リポジトリ直下 [README.md](../../README.md) の「Framework Support」節に 1 行追加:

```md
## Framework Support

| Framework | Entry Point | Example |
|---|---|---|
| React | `tegaki/react` | [examples/remotion](./examples/remotion) |
| Astro | `tegaki/astro` | [examples/astro-ja](./examples/astro-ja) (NEW) |
| ...（既存行）... | | |

## Language Support

| Language | Status | Guide |
|---|---|---|
| Latin (English, etc.) | Full support | — |
| Japanese (CJK) | Full support via KanjiVG | [guides/japanese](./packages/website/src/content/docs/guides/japanese.mdx) |
```

---

## §4. エージェントチーム構成

本 Phase は **3 名並列** で着手可能。依存関係上、Phase 6 完了後に開始する。担当 A/B/C それぞれの成果物は独立しており、3 日想定を 1.5 日まで短縮できる。

| 担当 | 役割 | 担当成果物 | 想定工数 | 依存 |
|---|---|---|---|---|
| **A. ドキュメント担当** | Starlight MDX 執筆 | `japanese.mdx`, `japanese-support.md` 既知の限界節追記, README 差分 | 1.2d | Phase 6 誤り字リスト確定 |
| **B. examples 実装担当** | React / Astro サンプル | `examples/react-ja/` 一式, `examples/astro-ja/` 一式, 各 README | 1.3d | Phase 3 完了（`tegaki` + KanjiVG バンドル利用可能） |
| **C. PreviewApp 拡張担当** | UI プリセット + URL state | `PreviewApp.tsx` 差分, `url-state.ts` 差分 | 0.5d | Phase 4 仮名バンドル存在 |

### 4-1. 並列化の調整

- **Phase 6 完了を全員の起点** とする（誤り字リストが確定しないと A の D-4 が書けない）
- **担当 A と B は完全独立**、conflict なし
- **担当 C は `PreviewApp.tsx` が Phase 6 でも触られる可能性があるため、Phase 6 の PR マージ後に着手**（§9-B）
- **全員の成果物が揃った時点で 1 本の PR にまとめる**（`feat/ja-phase7-docs` ブランチに全差分）

### 4-2. レビュー体制

PR レビューは最低 2 名。ドキュメント（MDX）は日本語ネイティブの 1 名が必須（§9-A）。コード差分（担当 C）は通常のレビューで十分。

---

## §5. 提供範囲（Deliverables）

本チケット完了時に納品されるもの一覧（§3 ディレクトリツリーの詳細版）:

### 5-1. 新規ファイル（13 点）

| パス | 種別 | 行数想定 |
|---|---|---|
| `packages/website/src/content/docs/guides/japanese.mdx` | MDX | ~300 行 |
| `examples/react-ja/package.json` | JSON | ~30 行 |
| `examples/react-ja/tsconfig.json` | JSON | ~15 行 |
| `examples/react-ja/vite.config.ts` | TS | ~15 行 |
| `examples/react-ja/index.html` | HTML | ~15 行 |
| `examples/react-ja/src/main.tsx` | TSX | ~10 行 |
| `examples/react-ja/src/App.tsx` | TSX | ~30 行 |
| `examples/react-ja/README.md` | MD | ~40 行 |
| `examples/astro-ja/package.json` | JSON | ~25 行 |
| `examples/astro-ja/astro.config.ts` | TS | ~15 行 |
| `examples/astro-ja/tsconfig.json` | JSON | ~15 行 |
| `examples/astro-ja/src/pages/index.astro` | Astro | ~40 行 |
| `examples/astro-ja/README.md` | MD | ~40 行 |

### 5-2. 変更ファイル（4 点）

| パス | 変更内容 | 差分行数 |
|---|---|---|
| `packages/website/src/components/PreviewApp.tsx` | 日本語プリセットボタン追加 | +30 行 |
| `packages/website/src/components/url-state.ts` | `preset` キー追加 | +10 行 |
| `docs/japanese-support.md` | 既知の限界節に Phase 6 誤り字リスト追記 | +20 行 |
| `README.md` | Language Support 節追加 | +15 行 |

### 5-3. 動作確認ドキュメント

PR 本文に以下を記載:

1. スクリーンショット: `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` の描画結果
2. 動作手順: `bun install && bun dev` から開始する最短再現手順
3. Starlight ビルド出力の一部（`guides/japanese.html` が生成されていることの証跡）

---

## §6. テスト項目（受入基準マッピング）

[AC-4](../requirements.md) の 4 項目をテストケースへ機械的にマッピング。各テストが D-XX の Done 定義と対応する。

| AC-4 項目 | 対応する Done 定義 | テスト種別 | 実施タイミング |
|---|---|---|---|
| AC-4 §1. `guides/japanese.mdx` 追加 | D-1 〜 D-5 | ファイル存在 + MDX ビルド成功 | §7 Unit |
| AC-4 §2. README に日本語サポート明記 | D-11 | `grep -i 'japanese' README.md` | §7 Unit |
| AC-4 §3. `examples/` に React + Astro デモ | D-8, D-9 | ディレクトリ存在 + ビルド成功 | §7 Unit |
| AC-4 §4. `bun dev` で所定 URL 動作 | D-12 | §8 e2e | §8 e2e |

### 6-1. 追加テスト（AC-4 外、品質担保）

| # | テスト | 対応 D | 種別 |
|---|---|---|---|
| T-1 | `japanese.mdx` frontmatter の `title` / `description` / `sidebar` が揃っている | D-1 | 静的検証 |
| T-2 | `japanese.mdx` に CC-BY-SA 3.0 の帰属表記テンプレが含まれる | D-5 | grep |
| T-3 | `japanese.mdx` の既知の限界節が Phase 6 誤り字リストと一致 | D-4, D-15 | 手動 diff |
| T-4 | `PreviewApp` 日本語プリセットボタンクリックで URL に `ps=ja-basic` が反映 | D-6, D-7 | e2e（Playwright 可） |
| T-5 | `examples/react-ja/` / `astro-ja/` 各 README に帰属表記あり | D-10 | grep |
| T-6 | `bun --filter examples/react-ja build` 成功 | D-8 | CI |
| T-7 | `bun --filter examples/astro-ja build` 成功 | D-9 | CI |
| T-8 | `bun --filter @tegaki/website build` 成功、`dist/guides/japanese/index.html` 生成 | D-13 | CI |

---

## §7. Unit テスト

Phase 7 はドキュメント中心なので Unit テストは最小限。**ビルド通過** と **静的検証** が中心。

### 7-1. MDX ビルド

```bash
# Starlight / Astro のビルドが成功すれば MDX 構文は valid
bun --filter @tegaki/website build
# 出力に guides/japanese/index.html が含まれることを確認
ls packages/website/dist/guides/japanese/
```

### 7-2. examples ビルド

```bash
# React + Vite
bun --filter examples/react-ja build
# 出力: examples/react-ja/dist/index.html + assets/

# Astro + SSG
bun --filter examples/astro-ja build
# 出力: examples/astro-ja/dist/index.html
```

### 7-3. URL state テスト

`url-state.ts` の parseUrlState / serializeUrlState を対象に、`ps=ja-basic` / `ps=ja-kanji` の往復テスト（`packages/website/src/components/url-state.test.ts` を新規 or 既存に追加）:

```ts
// url-state.test.ts (新規 or 追記)
import { parseUrlState, serializeUrlState } from './url-state.ts';

test('ja-basic preset round-trips', () => {
  const state = { ...URL_DEFAULTS, preset: 'ja-basic' as const };
  const serialized = serializeUrlState(state);
  expect(serialized).toContain('ps=ja-basic');
  // parseUrlState は location.search 直読みのため、window.location モック必要
});
```

### 7-4. PreviewApp プリセットボタン

React Testing Library で `PreviewApp` をマウントし、「日本語プリセット」ボタンクリックで state 遷移を検証（`packages/website/src/components/PreviewApp.test.tsx` 新規）:

```tsx
test('ja-basic preset button updates text and font', async () => {
  render(<PreviewApp />);
  await userEvent.click(screen.getByText(/仮名のみ/));
  expect(screen.getByLabelText('text')).toHaveValue('ありがとう');
  expect(screen.getByLabelText('font')).toHaveValue('Noto Sans JP');
});
```

### 7-5. README 日本語明記

```bash
grep -i 'japanese' README.md   # 少なくとも 1 行ヒット
grep -i 'japanese' packages/website/src/content/docs/guides/japanese.mdx  # 複数ヒット
```

---

## §8. e2e テスト

### 8-1. PreviewApp での日本語描画（AC-4 §4 直接対応）

```bash
bun dev
# ブラウザで以下 URL を開く
# http://localhost:4321/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP
```

**期待される動作**:
1. Noto Sans JP が Google Fonts から読み込まれる
2. `ありがとう` が 5 画分のアニメーションで描画される（あ=3, り=2, が=4, と=2, う=2 の計 13 画）
3. コンソールエラーなし
4. `rhythm=lognormal` が URL に含まれていれば、非対称鐘型の速度プロファイルで描画

### 8-2. Starlight ドキュメントでの日本語ガイド表示

```bash
bun dev
# http://localhost:4321/tegaki/guides/japanese/
```

**期待される動作**:
1. サイドバーに「日本語対応」項目表示
2. 本文に「概要」「使い方」「サポート範囲」「既知の限界」「ライセンス注意」「関連ドキュメント」の 6 セクション
3. LinkCard が `/tegaki/generator/?m=text&t=...` にリンク
4. Aside（caution / tip）が正しくレンダリング
5. コード例がシンタックスハイライト適用

### 8-3. examples 動作確認

```bash
# React
cd examples/react-ja && bun install && bun dev
# ブラウザで http://localhost:5173 → ありがとう が描画される

# Astro
cd examples/astro-ja && bun install && bun dev
# ブラウザで http://localhost:4321 → ありがとう が描画される（SSG 出力）
```

### 8-4. 上流 PR 提案用の動作検証（Phase 8 への橋渡し）

Phase 8 で `KurtGokhan/tegaki` に PR 提案する際、本 Phase の examples と docs がそのまま使える状態を検証:

- `examples/react-ja` を別ディレクトリに独立コピーしても `bun install && bun dev` で動く（monorepo 依存性の明示）
- `japanese.mdx` が Starlight 以外でも読める Markdown として有効（GFM ベースなので OK）

---

## §9. 懸念事項とリスク

### §9-A. ドキュメントの翻訳品質（中リスク）

**問題**: `japanese.mdx` は日本語で執筆するが、Tegaki の他ドキュメントは英語中心。用語（"stroke order" → "筆順"、"rhythm" → "リズム合成"）の表記揺れが発生する。

**対策**:
- 執筆前に用語集（glossary）を作成、PR 本文に添付
- レビュー時に日本語ネイティブ 1 名を必須化
- [japanese-support.md](../japanese-support.md) と用語揃え（すでに日本語で執筆済）

### §9-B. examples の古くなりやすさ（中リスク）

**問題**: `examples/*-ja/` は Vite / Astro / tegaki 依存の version が上がるたびに追従が必要。リリース後の放置リスク。

**対策**:
- `package.json` で `workspace:*` を使い monorepo 内部は自動追従
- 外部依存（Vite 等）は CI で build 検証（§7）
- Phase 8 で `.github/workflows/` に examples build を追加（本 Phase では CI 化せず、次 Phase で扱う）

### §9-C. ライセンス記載漏れ（高リスク）

**問題**: CC-BY-SA 3.0 の share-alike は厳格で、記載漏れは法的問題。`japanese.mdx` と `examples/*/README.md` と `@tegaki/dataset-cjk-kanjivg/ATTRIBUTION.md`（Phase 1）の 3 箇所で一貫性が必要。

**対策**:
- テンプレ文字列を Phase 1 の `ATTRIBUTION.md` から**コピー**（手書きせず）
- D-5, D-10 を Done 定義で機械検証（grep で 3 箇所全て確認）
- Phase 8 のリリース前最終チェックにも明記

### §9-D. 英語版の要否（中リスク）

**問題**: `japanese.mdx` だけ日本語で、他ドキュメントは英語。英語話者が日本語サポートを発見できない可能性。一方、`japanese.en.mdx` を作ると翻訳の二重メンテ発生。

**対策（採用案）**:
- 本 Phase では**日本語版のみ**
- README（英語）の Language Support セクションに「Japanese (CJK) support — see guides/japanese for Japanese-language documentation」と記載し、発見可能性を担保
- Phase 8 で上流提案する際に英語版 summary を別途作成（PR 本文）

### §9-E. PreviewApp の機能肥大化（低リスク）

**問題**: 日本語プリセット追加が UX を複雑化する可能性。他言語プリセットが追加されるとボタン数が増える。

**対策**:
- 今回は 2 プリセット（`ja-basic`, `ja-kanji`）のみ、ドロップダウン化は将来拡張
- `url-state.ts` の `preset` は `string` 型ではなく `'ja-basic' | 'ja-kanji'` リテラル型で制限（無制限追加を防ぐ）

### §9-F. Phase 6 依存の待ち時間（低リスク）

**問題**: D-4（既知の限界リスト）と D-15（誤り字リスト）が Phase 6 完了待ち。Phase 6 が遅れると Phase 7 全体がブロック。

**対策**:
- 担当 A は Phase 6 完了前でも D-1 〜 D-3 / D-5 は着手可能（骨組みは Phase 6 の有無に関わらず書ける）
- Phase 6 完了後に D-4 を埋めるだけの状態を作っておく

### §9-G. 2 重メンテ問題（[japanese-support.md](../japanese-support.md) vs `japanese.mdx`）

**問題**: 既知の限界が内部設計書（`japanese-support.md`）と公開ドキュメント（`japanese.mdx`）の両方に記載されると、更新時の漏れが発生。

**対策（採用案）**:
- `japanese-support.md` は**内部設計書**として詳細版を維持
- `japanese.mdx` は**ユーザー向け**としてサマリを記載、末尾に「詳細は [japanese-support.md]」リンク
- 更新時は常に設計書を先に更新、mdx は「いつ時点のスナップショットか」の日付コメント付与

---

## §10. レビュー項目

PR レビュー時のチェックリスト（レビュアーが順に確認）:

### 10-1. ドキュメント正確性

- [ ] `japanese.mdx` frontmatter（`title`, `description`, `sidebar.order`, `sidebar.label`）が Starlight 規約に準拠
- [ ] 使い方セクションのコード例が**そのまま動く**（コピペして `bun install && bun dev` で実行可能）
- [ ] サポート範囲のパーセンテージが Phase 6 実測値と一致
- [ ] 既知の限界の誤り字リストが Phase 6 結果と一致（漢字一つひとつ diff）
- [ ] 非対応項目（縦書き / 簡体字 / くずし字）が [requirements.md §5](../requirements.md) と一致
- [ ] ライセンス節の帰属表記が Phase 1 `ATTRIBUTION.md` と**バイト一致**

### 10-2. example 動作

- [ ] `bun --filter examples/react-ja dev` が起動、ブラウザで `ありがとう` が描画
- [ ] `bun --filter examples/react-ja build` が成功、`dist/` に HTML 生成
- [ ] `bun --filter examples/astro-ja build` が成功
- [ ] 各 example の `README.md` に帰属表記、セットアップ手順、ライセンス明記
- [ ] `package.json` の依存が `workspace:*` で monorepo と整合
- [ ] `tsconfig.json` が strict + nodenext（[AGENTS.md](../../AGENTS.md) 規約）

### 10-3. i18n（多言語化の余地）

- [ ] `japanese.mdx` は日本語のみ、英語版は Phase 8 で判断する旨の注釈あり
- [ ] README の Language Support 節は英語（発見可能性担保）
- [ ] サイドバーの label は「日本語対応 (Japanese)」併記で英語話者も判別可能

### 10-4. SEO

- [ ] `japanese.mdx` frontmatter `description` に検索キーワード（"Japanese", "CJK", "KanjiVG", "常用漢字"）含む
- [ ] `<LinkCard>` / `<Aside>` 内の anchor text が意味を持つ（"ここ" などの非記述的な文言禁止）
- [ ] Starlight の自動 sitemap / RSS に `/guides/japanese/` が含まれる

### 10-5. コード品質（差分レビュー）

- [ ] `PreviewApp.tsx` の差分が既存パターン（state 管理 / className 規則）に準拠
- [ ] `url-state.ts` の `preset` フィールドが optional、既存 URL との互換性維持
- [ ] 新規依存は MIT / BSD / Apache のいずれか（[NFR-4.4](../requirements.md)）
- [ ] Biome lint + format 通過、`bun checks` 通過

### 10-6. リリース準備（Phase 8 への橋渡し）

- [ ] 本 PR マージ後、`bun --filter @tegaki/website build` でドキュメントサイトが完全ビルド可能
- [ ] サイトデプロイ時（GitHub Pages 等）に `guides/japanese/` が到達可能
- [ ] Phase 8 の上流 PR 提案時に本 Phase 成果物（ドキュメント + examples）をそのまま引用可能

---

## §11. 一から作り直す場合の設計思想

本 Phase のスコープ（「ユーザー向けドキュメントと最小動作サンプル」）を、経験を前提にゼロから設計するとしたら、採り得るアプローチを **7 案** 検討する。評価軸は以下 6 点 — (1) 初期開発工数、(2) **継続保守コスト（コード変更時の追従容易性）**、(3) **i18n 戦略（英語版の扱い）**、(4) AC-4 直接充足度、(5) 学習効果・発見可能性（SEO）、(6) 法的リスク（ライセンス記載の正確性）。絵に描いた餅（実現性の低い試算）は現実的な数値に引き下げた上で評価する。

### 11-1. i18n 戦略の基本方針（全案共通の前提）

本 Phase のドキュメント主言語は **日本語固定** とし、英語話者への導線は以下 **3 段** で担保する（Phase 8 以降で本格的な多言語化の必要性が生じたら独立 Phase で再検討する）。

1. **リポジトリ直下 `README.md`（英語、既存）の Language Support 節で明示** — 「Japanese support via KanjiVG — see [guides/japanese] for Japanese-language documentation」の 1 行 + CJK サンプル URL（`/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP`）を記載。英語話者は存在に気付ける。
2. **`japanese.mdx` の frontmatter `sidebar.label` を日英併記** — 「日本語対応 (Japanese)」のように Starlight サイドバーで両言語ユーザーから識別可能。`description` にも英語キーワード（"Japanese", "CJK", "KanjiVG", "kanji stroke order"）を並記し SEO を担保。
3. **Phase 8 上流 PR 本文に英語 summary を別途作成** — 正式な `japanese.en.mdx` は本 Phase で作らず、PR 本文の `## Overview (English)` セクションに要約 30 行程度を書く。公式サイト埋込は需要実績（GitHub Issues の英語質問比率が 30% 超になった等）を待ってから判断。

**英語版 `japanese.en.mdx` を本 Phase で作らない理由**: (i) Phase 7 は 3 日スコープで翻訳品質担保の工数が入らない、(ii) 翻訳すると以降すべての更新が 2 重メンテになる、(iii) 現時点で英語話者の需要が未実証、(iv) 上流 `KurtGokhan/tegaki` 本家が採用した場合は本家側で英語化される可能性が高く二重投資を避けたい、(v) Phase 7 は「日本語話者が日本語で日本語対応を読めるようにする」が最優先の目的（AC-4 §1）。

以下、各案は **「この i18n 戦略とどう整合するか」** を評価軸の 1 つとする。

### 11-2. 各案の詳細

#### 案 A: 現行（Starlight MDX + examples/ ディレクトリ）

本チケット採用案。`guides/japanese.mdx` + `examples/react-ja` + `examples/astro-ja` + PreviewApp プリセット。

- **長所**: 既存 Starlight 構造と統一、search/sidebar/RSS 再利用、`bun --filter` で examples build 検証可能、MDX 内で JSX コンポーネント（`<LinkCard>` `<Aside>` `<Steps>`）埋込可能、既存コントリビューターが即時レビュー可能。
- **短所**: 静的ドキュメントなので試行錯誤学習に不向き、examples ファイル数が多い（React+Astro で 13 ファイル）、MDX 内コードブロックは型検証されない（コードが腐るリスク）。
- **i18n**: §11-1 の 3 段戦略をそのまま実装。追加作業ゼロ。
- **保守コスト（コード追従）の内訳**: 本体 API 変更時の追従対象は (i) `japanese.mdx` 内の使い方コードブロック、(ii) `examples/react-ja/src/App.tsx`、(iii) `examples/astro-ja/src/pages/index.astro` の 3 箇所。`examples/*` は `workspace:*` で `tegaki` 本体に自動追従（型エラーは `bun typecheck` で検知）、MDX コードブロックは `examples/*` からの逐語コピーとして運用すれば実質 1 箇所の更新で済む。**年あたり追従工数: ~0.5 日**。
- **総コスト**: 開発 3 日 / 保守 年 0.5 日 / ホスティング 無料（GitHub Pages）。

#### 案 B: 対話型チュートリアル（ブラウザ内でステップバイステップ）

SQLBolt / Codecademy 風の「入力 → 実行結果 → 次へ」フロー。`TutorialJapanese.tsx` 新規、`TegakiRenderer` を動的レンダー、localStorage で進捗保存、期待出力との diff 判定。

- **長所**: 学習効果最高（try-driven）、単一 URL で完結、マーケティング訴求力大、離脱ステップ分析が可能。
- **短所**: 工数が静的ドキュメントの 4-5 倍、UI 仕様変更で全面改修、コンテンツ更新のハードルが高い（MDX の静的ビルドでなく React runtime 依存）。
- **i18n**: チュートリアル文字列を i18n ライブラリ（`react-intl` 等）で管理する必要あり、日本語 + 英語の 2 重メンテが義務化。§11-1 の「3 段戦略」では足りず、UI 内部のボタン・ヒント・検証メッセージも多言語化必要。
- **保守コスト**: API 変更時に各ステップのサンプルコード + 期待出力検証ロジックが破綻、年 **~2 日** の追従。
- **総コスト**: 開発 12 日（当初試算 15 日は過大、スコープを「1 コース 5 ステップ」に絞った現実値）/ 保守 年 2 日 / ホスティング 無料。

#### 案 C: ビデオチュートリアル（YouTube / Loom）

5-10 分のスクリーンキャスト 2-3 本を制作、ドキュメントに埋込。「はじめての日本語手書き」+「高度な使い方」+ 英語字幕。

- **絵に描いた餅の補正**: 当初試算「制作 10 日」は「プロ品質の編集・字幕・BGM・複数テイク」前提だった。現実的には Loom で 1 発撮り、字幕を Whisper 自動生成 → 手修正 → YouTube アップロードで **制作 3 日 / 1 本**（3 本で 9 日）。ただしこれは「質を妥協した最短ルート」で、本家 tegaki のブランディングに使える質を担保するなら +3-5 日追加が必要。つまり 9-14 日のレンジ。
- **長所**: SNS 拡散しやすい、初心者の心理的障壁は低い、1 回作れば UI が変わらない限り多年活用。
- **短所**: SEO に不利（動画内テキストは Google インデックス対象外）、アクセシビリティ対応（字幕・音声説明）が必要、UI 刷新のたびに全撮り直し、埋込 iframe は Starlight のレイアウトを崩しがち、動画プラットフォーム側の仕様変更リスク。
- **i18n**: 字幕翻訳で対応可能だが、音声吹替は現実的でない。日本語音声 + 英語字幕が最大限の妥協点。
- **保守コスト**: **高（年 3-5 日）**。UI 見た目が変わる PR をマージするたびに撮り直し判断が必要、判断コスト自体も無視できない。
- **総コスト**: 制作 9 日（最低品質）/ 保守 年 3-5 日 / ホスティング YouTube 無料。

#### 案 D: Storybook で全コンポーネント公開

`packages/renderer` 内に Storybook 設置、各フレームワーク adapter（react/vue/svelte/solid/astro/wc）を story 化、`JapaneseDemo.stories.tsx` で日本語露出、Chromatic で視覚回帰テスト連携。

- **長所**: 全コンポーネントの一元デモ、視覚回帰自動化、コンポーネントライブラリとしてのブランディング確立、PR ごとに視覚差分確認可能。
- **短所**: Tegaki の本質は「コンポーネントライブラリ」ではなく「**アニメーション生成エンジン**」なので Storybook の形式と構造的にミスマッチ、日本語サポートを探すユーザーが Storybook ページに辿り着く SEO 導線がない、Storybook 自体の学習コストがコントリビューターにかかる、Chromatic は OSS 無料枠があるが商用では有料。
- **i18n**: story の `description` を日英併記可能だが、Storybook UI chrome（Addons、Toolbar、Canvas）は英語固定で日本語話者には環境自体が異質。
- **保守コスト**: 本体 API 変更のたびに adapter 単位で 6 本の stories を追従、年 **~1 日**。
- **総コスト**: 開発 7 日 / 保守 年 1 日 / ホスティング Chromatic（$149/月〜、OSS 無料枠あり）or GitHub Pages 無料。

#### 案 E: API reference 自動生成（TypeDoc 等）

TypeScript 型コメントから API ドキュメントを自動生成。`types.ts` に JSDoc 充実、CI で `bun typedoc`、Starlight に埋込 or 独立サイト。

- **長所**: **ドキュメントと実装のズレが構造的に発生しない（保守コストほぼゼロ）**、型定義コメントが副産物として充実、Phase 8 で npm publish 後の API 探索に有効。
- **短所**: How-to でなく reference（辞書）なので初心者には不親切、**既知の限界・ライセンス・文化的背景（なぜ KanjiVG なのか、筆順がなぜ重要か）のような人間向け記述は自動化不可**、AC-4 の「使い方ドキュメント」要件を満たせない、Starlight との統合はプラグイン開発が必要。
- **i18n**: JSDoc コメント自体の多言語化は事実上不可能、**英語固定**。§11-1 の戦略と両立不可。
- **保守コスト**: **最低（年 0.1 日）**。CI で自動再生成されるため人手不要。
- **総コスト**: 開発 4 日 / 保守 年 0.1 日 / ホスティング無料。

#### 案 F（新規）: LLM による対話式 Q&A ドキュメント（ユーザー質問に回答）

ChatGPT / Claude 等の外部 LLM API を使い、ユーザー質問にリアルタイム回答する FAQ エンドポイントを提供。実装は 2 つのサブ案に分岐し、コストが大きく異なる。

- **F-1（自前実装）**: 公式ドキュメント（`japanese.mdx` + `japanese-support.md` + `requirements.md`）を RAG context として埋め込んだ自前チャット UI を `/tegaki/docs/ask/` として構築。Anthropic SDK or OpenAI SDK で実装、Vercel AI SDK で streaming 対応。
- **F-2（外部プラットフォーム活用）**: OpenAI GPTs / Anthropic Projects / Mendable 等に `japanese.mdx` + `japanese-support.md` を登録し、URL を docs から共有。自前インフラ不要。

**長所**: 未知の質問（「くずし字は描けますか?」「`rhythm=lognormal` と `sigma` の関係は?」「KanjiVG のどの筆順が教育現場と違うのか?」）に対話的に回答、ユーザー自身の語彙で理解できる、**i18n を LLM が自動吸収**（日本語質問には日本語で、英語質問には英語で、中国語質問にも対応可能）、翻訳メンテ **ゼロ**。

**短所**: (i) 回答の正確性保証が困難（**hallucination リスク**）、(ii) 外部 API 依存（料金 + rate limit）、(iii) ドキュメント更新のたびに RAG context 再埋込が必要、(iv) Phase 6 の誤り字リスト等「厳密に一致すべき情報」をハルシネーションで歪める危険、(v) オフライン閲覧不可、(vi) 利用ログのプライバシー問題。

**i18n 観点の優位性**: F-1/F-2 いずれも LLM の多言語能力で日英両対応、かつ補足として中国語・韓国語の質問も吸収可能。§11-1 の 3 段戦略を **超える** 多言語対応を低コストで実現。ただし「翻訳品質 = LLM 品質」に完全依存。

**保守コスト**: RAG 再埋込のみ（年 **~0.3 日**）、ただし初期実装は F-1 で 5-7 日、F-2 で 1 日。

**総コスト**: 開発 F-1: 7 日 / F-2: 1 日 / 保守 年 0.3 日 / ホスティング F-1: 月 $20-50（API 料金）/ F-2: 無料。

**致命的欠点**: ライセンス記載（CC-BY-SA 3.0 の share-alike 要件の帰属表記テンプレ）や誤り字リストの **法的・技術的に正確であるべき情報** で、LLM が誤情報を生成してもそれを検知する仕組みがない。例えば LLM が「tegaki は MIT なので自由に商用利用可能」とだけ答えて KanjiVG データの share-alike に触れないハルシネーションをした場合、ユーザーがライセンス違反を犯す可能性がある。**補助ツールとしてなら価値あり、単独でドキュメントを代替することは不可**。

#### 案 G（新規）: Docusaurus / VitePress への移行

現行 Astro + Starlight を捨て、Docusaurus（Facebook/Meta 製、React + MDX）または VitePress（Vue ベース、Vite 製）に乗り換え、本 Phase の日本語追加と同時に site 基盤を刷新。

- **長所**: Docusaurus は **i18n のデファクト**（Crowdin 連携、`docs/i18n/ja/docusaurus-plugin-content-docs/current/` 標準ディレクトリ構造、翻訳カバレッジ CLI ツール）、バージョン管理ドキュメント（`docs/v1.x/` `docs/v2.x/` 等）の仕組みが組込、Algolia DocSearch が OSS に無料提供、検索・RSS・PWA が完成度高い。VitePress は超高速、最小構成、Vue エコシステム向け、Starlight より高速なビルド。
- **短所**: **既存 Starlight サイトの完全書き直し** — `src/content/docs/*.mdx` 全ファイル移行、カスタム React コンポーネント（`PreviewApp.tsx`、`LiveDemo.tsx`、`HomePageExamples.tsx` 等）を Docusaurus 流に書き直し、`astro.config.ts` → `docusaurus.config.js` に置換、`base: '/tegaki'` ルーティング再構築。Tegaki の既存 UX（`PreviewApp` を Astro ページ直接埋込）が壊れる。`tegaki` のメイン site として Astro を選択した設計判断を覆す破壊的変更。本 Phase の 3 日スコープを **桁違いに超える**（移行のみで 10-15 日）。
- **i18n 観点**: Docusaurus なら `i18n` フォルダで `en/` `ja/` 自動ルーティング、翻訳抜けを CLI で検出可能、将来的に 3 言語以上に拡張する場合は圧倒的に有利。§11-1 を超える本格多言語化が可能。
- **保守コスト（移行後）**: 低（Docusaurus の巨大エコシステムに乗る）、ただし Astro 特有の最適化（Islands アーキテクチャ、部分ハイドレーション）を失う。
- **総コスト**: 移行 12 日 + 本 Phase 3 日 = **15 日（本 Phase スコープの 5 倍）**、保守 年 0.5 日、ホスティング無料。

**致命的欠点**: 本 Phase は「既存 site に日本語ページを **足す**」スコープであり、**site 基盤の入れ替えは Phase 7 の範疇外**。将来多言語化を本格化する段階で「Phase N: site 基盤刷新」として独立 Phase を切るべきで、本チケットで扱うものではない。また `tegaki@dev` Vite エイリアス（[packages/website/astro.config.ts](../../packages/website/astro.config.ts)）による monorepo 内部参照の仕組みを新基盤で再現する追加コストも発生する。

### 11-3. 定量比較（7 案）

| 項目 | A (現行) | B (対話型) | C (ビデオ) | D (Storybook) | E (TypeDoc) | F (LLM Q&A) | G (Docusaurus 移行) |
|---|---|---|---|---|---|---|---|
| 初期開発工数 (日) | **3** | 12 | 9 | 7 | 4 | F-2: **1** / F-1: 7 | 15 |
| 年間保守コスト (日) | 0.5 | 2 | **3-5** | 1 | **0.1** | 0.3 | 0.5 (移行後) |
| コード変更時の追従容易性 | 手動 grep + examples 型検証 | 検証ロジック破綻リスク | **全撮り直し** | stories 6 本更新 | **完全自動** | RAG 再埋込 | 手動（現行と同等） |
| 学習効果 | 中 | **最高** | 高 | 低 | 低 | 高 | 中 |
| 発見可能性 (SEO) | **高** | 中 | 低 (動画不可) | 低 | 中 | 中 | **高** |
| i18n 戦略との整合 | 良 (日英併記) | 悪 (2 重メンテ) | 可 (字幕) | 悪 (英語固定) | 悪 (英語固定) | **最良** (LLM 自動) | **最良** (i18n ネイティブ) |
| 英語版の扱い | README 英語節 + PR 英語 summary | UI 完全 2 言語化 | 英語字幕のみ | story 英語固定 | 全文英語固定 | LLM が自動応答 | `i18n/en/` `i18n/ja/` 分離 |
| Phase 8 リリース貢献 | **高** | 中 | 中 | 低 | 中 | 低 (補助のみ) | 低 (破壊的変更) |
| AC-4 直接充足 | **直接** | 間接 | 間接 | 不十分 | 不十分 | 間接 | 直接 (移行コスト別) |
| 法的リスク (ライセンス記載) | 低 | 低 | 低 | 低 | 低 | **高 (hallucination)** | 低 |
| オフライン閲覧 | ○ | ○ | ○ (DL) | ○ | ○ | × | ○ |
| 本 Phase 3 日スコープ適合 | **○** | × | × | × | △ | △ (F-2 のみ ○) | × |

### 11-4. 保守コスト（コード変更時の追従）比較

「本体 `packages/renderer/src/types.ts` や `tegaki/react` エクスポートに破壊的変更が入った際、ドキュメント側で何が起きるか」を案ごとに整理する。これは Tegaki のリリース頻度（月 1-2 回、破壊的変更 1-2 回/年）を前提とした実質的な運用コストである。

| 案 | 破壊的変更時の検知方法 | 必要な手作業 | 腐敗リスク |
|---|---|---|---|
| A (現行) | `examples/*` の `bun typecheck` が失敗 | MDX コードブロックを手動更新（examples から逐語コピー運用なら自動化可） | 中（MDX 内コードは型検証対象外） |
| B (対話型) | チュートリアル UI が runtime エラー | 各ステップの期待出力 + 検証ロジック + 翻訳文字列を更新 | 高（ステップ間の整合性維持困難） |
| C (ビデオ) | **検知不可**（UI 変更にビデオは追従しない） | 全テイク撮り直し + 字幕再生成 | **極高**（視聴者が古い UI を見続ける） |
| D (Storybook) | stories の型検証失敗 | adapter 6 本の stories を更新、Chromatic snapshot 更新 | 低〜中 |
| E (TypeDoc) | **自動追従**（JSDoc 変更で再生成） | ほぼなし（JSDoc コメント自体の更新のみ） | **最低** |
| F (LLM Q&A) | **検知不可**（RAG context が古くても LLM は何か答える） | RAG context 再埋込 + ハルシネーション検出は不可 | **極高**（誤回答を検知できない） |
| G (Docusaurus) | MDX の型検証 + `i18n` diff CLI | A と同等 + i18n 同期 | 中 |

**結論**: 保守コスト観点で最良は **案 E（自動追従）**、次点が **案 A（examples の型検証）**。案 C/F は腐敗リスクが極めて高く、ユーザーに古い or 誤った情報を提示し続ける危険がある。

### 11-5. 意思決定プロセス

本 Phase の採用基準は以下 3 条件の AND 論理で判定する:

1. **AC-4 を直接充足できるか**（§2-1 の 5 点欠如を解消できるか）
2. **3 日スコープに収まるか**（§1 の想定期間に合致するか）
3. **法的リスクが低いか**（§9-C のライセンス記載漏れを避けられるか）

各案の判定結果:

| 案 | 条件 1 (AC-4) | 条件 2 (3 日) | 条件 3 (法的安全) | 採否 |
|---|---|---|---|---|
| A | ○ | ○ | ○ | **採用** |
| B | △ | × | ○ | 却下（3 日超過） |
| C | × | × | ○ | 却下 |
| D | × | × | ○ | 却下 |
| E | × | ○ | ○ | 却下（AC-4 未充足） |
| F | × | △ (F-2 なら可) | × | 却下（法的リスク高） |
| G | ○ | × | ○ | 却下（3 日超過） |

**案 A のみが 3 条件すべてを満たす**。

### 11-6. 結論（断言）

**本 Phase は案 A（Starlight MDX + examples）で確定する**。他案は Phase 7 の 3 日スコープ・AC-4 直接充足・法的安全性のいずれかを必ず満たさない。以下、各案の取扱いを明言する:

1. **案 A = 採用**。本チケット §3-§10 の実装で固定、変更なし。i18n は §11-1 の 3 段戦略を適用。
2. **案 B = リリース +3 ヶ月以降に限定導入を検討**。`japanese.mdx` の「使い方」節のみを対話型コンポーネントに置換、フルチュートリアル化は過剰投資なので採用しない。
3. **案 C = 却下（本 Phase と Phase 8 を含め当面作らない）**。保守コストが高すぎ、SEO でも案 A に劣り、腐敗リスクが極大。宣伝素材として 1 本だけ作るなら別予算・別プロジェクトで。
4. **案 D = 恒久的に却下**。Tegaki のプロダクト本質（アニメーション生成エンジン）と Storybook の形式（コンポーネントカタログ）が構造的にミスマッチ。
5. **案 E = Phase 8 完了後に案 A と併存で導入を推奨**。API が安定した段階で TypeDoc を別ルート（`/tegaki/api/`）として追加、`japanese.mdx`（案 A）は How-to として維持する二層構造。
6. **案 F = 補助ツールとしてのみ Phase 9+ で検討**。F-2（Anthropic Projects / OpenAI GPTs）を **ユーザー FAQ の補助** として設置する価値はあるが、**ライセンス・既知の限界・筆順データの正確性を LLM に委ねることは不可**。`japanese.mdx`（案 A）は単一の真実源として維持必須。案 F はあくまで「ドキュメントを補完する問い合わせ窓口」であり、「ドキュメントの代替」ではない。
7. **案 G = 本 Phase では却下、将来の独立 Phase で再評価**。本格的な多言語化（3 言語以上）を決断するタイミングで「Phase N: site 基盤刷新」として独立チケット化。本 Phase では案 A の 3 段 i18n 戦略で十分であり、site 基盤刷新を Phase 7 の 3 日スコープに混ぜるのは不適切。

**最終判断**: 案 A を採用し、案 E/F を将来拡張候補として §12-4 に申し送る。案 B は将来の限定導入のみ、案 C/D/G は恒久的に却下（C/D は構造的ミスマッチ、G は独立 Phase 扱い）。ロードマップ想定 3 日で完了させ、Phase 8 に引き渡す。**絵に描いた餅（制作コストの過大見積もり、LLM の万能視、site 基盤の軽視）には陥らず、現実的な工数・保守コスト・法的安全性のバランスで案 A を選ぶ**。これが本 Phase の設計思想である。

### 11-7. 長期ロードマップ（案 A → 段階的拡張）

本 Phase（案 A）でリリース後、以下のロードマップで段階的に拡張する。各ステップは独立 Phase として切り出し、本チケット範囲外。

| 時期 | アクション | 対応案 | 前提条件 |
|---|---|---|---|
| 本 Phase（Phase 7） | Starlight MDX + examples 追加 | A | Phase 6 完了 |
| Phase 8（リリース判断） | 英語 summary を上流 PR 本文に記載 | A の拡張 | 本 Phase 完了 |
| Phase 9（リリース +1 ヶ月） | TypeDoc を別ルート（`/tegaki/api/`）で追加 | E 併存 | npm publish 完了、API 安定 |
| Phase 10（リリース +3 ヶ月） | `japanese.mdx` 使い方節を対話型に置換（部分導入） | B 部分 | ユーザー feedback 蓄積 |
| Phase 11（リリース +6 ヶ月） | F-2 を FAQ 補助として追加（LLM 回答は補助扱い明示） | F-2 補助 | `japanese.mdx` が安定、RAG 品質検証 |
| Phase 12（リリース +12 ヶ月） | 多言語化需要が実証された場合のみ site 基盤刷新検討 | G 検討 | 英語質問比率 30% 超 等の実証 |

このロードマップは案 A を基盤とし、他案を「補強」として位置付ける構造。案 A を **単一の真実源（Single Source of Truth）** として恒久的に維持し、他案は常にその周辺で機能する。

### 11-8. 案 A 実装時の具体的な運用ガイド

本 Phase を案 A で実装する際、§11-4 の保守コスト最小化のために以下の運用を徹底する。これは単なる「実装後の運用ルール」ではなく、**実装時点で仕組みとして組み込む** べき事項。

1. **examples の型検証を CI に組み込む** — `bun --filter examples/react-ja typecheck` と `bun --filter examples/astro-ja typecheck` を PR 必須チェックにする（本 Phase では Phase 8 で CI 化、§9-B）。これにより本体 API 変更時に examples が壊れた場合は即検知できる。
2. **MDX コードブロックは examples からの逐語コピーとする** — `japanese.mdx` の使い方コードは `examples/react-ja/src/App.tsx` の核部分をそのまま貼り付ける方針にし、「examples を更新したら MDX も更新」というフローを確立。レビューチェックリスト（§10-1）に明記。
3. **ライセンステンプレ文字列を単一ソース化** — CC-BY-SA 3.0 帰属表記は Phase 1 の `ATTRIBUTION.md` を唯一の真実源とし、`japanese.mdx` と `examples/*/README.md` はそこから **バイト一致** でコピー。§10-1 で「バイト一致」を明記。
4. **既知の限界リストは `japanese-support.md` を単一ソース化** — `japanese.mdx` の既知の限界節は `japanese-support.md` のサマリ版とし、末尾に「詳細は [japanese-support.md]」リンクで誘導。§9-G の 2 重メンテ問題を構造的に回避。

### 11-9. 案選択における反面教師

本節の批判的レビューで露呈した「当初案の問題点」を教訓として整理する。将来の Phase で同種の設計判断をする際の判断材料として残す。

1. **案 C の当初「制作 10 日」見積もりは楽観的すぎた** — プロ品質前提を明記せず数値だけ出していた。現実的な最低品質ルートは 9 日、本家品質は 14 日で、**3 倍近いレンジ差**がある。工数見積もりは品質前提とセットで書かなければ比較不能。
2. **案 B の「学習効果最高」評価は、保守コストの高さを軽視していた** — Try-driven 学習が優れているのは事実だが、**年 2 日の追従コスト**は 5 年で 10 日の支払いとなり、初期投資 12 日に匹敵する。ROI で語らずメリットだけ挙げるのは危険。
3. **LLM 系案（F）を「翻訳メンテゼロ」と過大評価する誘惑** — 確かに i18n コストはゼロに近いが、**法的リスクは極大**（ライセンス記載のハルシネーション）。特定の評価軸だけで案を推すと致命的欠陥を見逃す。
4. **Docusaurus 移行（G）を「将来の多言語化に備える」と正当化する誘惑** — 将来の需要が未実証な段階で site 基盤を刷新するのは早期最適化の典型。需要実証（英語質問比率 30% 超等の定量データ）を待つのが正解。
5. **「英語版 `japanese.en.mdx`」を作らないという判断を明示する重要性** — 作らないことを明記しないと、レビュアーやコントリビューターが「作るべき」と誤解する。§11-1 で 5 つの理由を明示することで、将来の判断の根拠が残る。
6. **i18n 戦略を「後回し」にせず本 Phase で明文化する** — i18n は「いつでもできる」と思われがちだが、site 基盤を決める段階で戦略を決めないと、後から Docusaurus 移行（案 G）のような大改造が必要になる。本 Phase で 3 段戦略（§11-1）を明文化することで、将来の意思決定の羅針盤となる。

### 11-10. この節で評価しなかった選択肢（スコープ外）

以下はアプローチとして存在するが、本節の評価対象からは意図的に外した。理由を明示することで「なぜ比較しなかったか」の質問を事前に封じる。

- **Gitiles / MkDocs / Jekyll 等の別 SSG**: 案 G（Docusaurus/VitePress）で「既存基盤刷新」の代表例を論じており、これらも同じ却下理由（本 Phase 範疇外）に該当するため個別評価不要。
- **Confluence / Notion 等の外部サービス**: OSS プロジェクトとして docs をリポジトリ外に置くのは原則禁忌（PR レビュー不可、オフライン閲覧不可、ベンダーロックイン）。評価対象外。
- **AI 翻訳（DeepL / GPT 翻訳）で英語版を自動生成**: 翻訳品質の保証が困難（案 F の致命的欠点と同じ）、ライセンス・既知の限界の誤訳リスクあり。§11-1 の「作らない」判断で代替する。
- **コミュニティ翻訳（Crowdin / Weblate）**: 案 G（Docusaurus）なら対応するが、案 A（Starlight）では整備コストが高く、英語話者需要が未実証な本 Phase では時期尚早。

以上で §11 の検討を完結する。案 A 採用の判断は §11-5 の 3 条件 AND 論理で導かれ、§11-6 で断言、§11-7 のロードマップで長期拡張の道筋が示されている。

### 11-11. 本節の結論まとめ（1 行）

**案 A 採用 / 案 B・E・F-2 を将来補強として段階導入 / 案 C・D・G は却下（C/D 恒久、G は独立 Phase 扱い）/ i18n は §11-1 の 3 段戦略（英語版 mdx は作らない）で確定 / 保守コスト最小化のために §11-8 の 4 運用を実装時に組込む**。

---

## §12. 後続タスクへの申し送り

Phase 8（リリース判断・上流提案 or 自前 npm リリース）に引き渡す情報を整理。Phase 8 担当者は本節を起点に作業を開始すること。

### 12-1. ドキュメント状態（引き渡し時点）

本 Phase 完了時点で、以下のドキュメントが揃っている（Phase 8 の PR 本文 / リリースノートに引用可能）:

| ドキュメント | 用途 | Phase 8 での引用先 |
|---|---|---|
| `packages/website/src/content/docs/guides/japanese.mdx` | ユーザー向け使い方 | 上流 PR 本文、自前 npm README 冒頭 |
| `examples/react-ja/`, `examples/astro-ja/` | 動作サンプル | 上流 PR の「動作確認」セクション |
| `docs/japanese-support.md` | 内部設計書（既知の限界込み） | 上流 PR の technical appendix |
| `docs/requirements.md` | 要件定義 | 上流 PR の「スコープ説明」 |
| `docs/japanese-roadmap.md` | 実装ロードマップ | 上流 PR の「実装経緯」 |
| `docs/tickets/phase-1` ～ `phase-7` | 各フェーズチケット | 上流 PR の「変更規模」 |
| 本チケット `phase-7-docs-samples.md` | Phase 7 成果物一覧 | 上流 PR のレビュー支援 |

### 12-2. examples の動作確認済み証跡

Phase 8 担当者が独立検証できるよう、以下を Phase 7 PR 本文に記載:

- `bun --filter examples/react-ja build` の出力ログ（最終 30 行）
- `bun --filter examples/astro-ja build` の出力ログ（最終 30 行）
- `bun --filter @tegaki/website build` の出力ログ
- ブラウザスクリーンショット: `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` の描画結果（Phase 8 の上流 PR 本文に再利用）
- ブラウザスクリーンショット: `/tegaki/guides/japanese/` のレンダリング結果

### 12-3. 上流提案時の訴求ポイント

Phase 8 で `KurtGokhan/tegaki` に上流 PR を出す際、以下を訴求ポイントとして強調:

1. **ラテン文字に影響なし** — Phase 3 で確立した「snapshot 差分ゼロ」が Phase 7 でも維持（`bun run test` 全通）
2. **バンドル再生成不要** — 既存 4 フォント（Caveat/Italianno/Tangerine/Parisienne）の pre-built bundle は Phase 7 でも無変更（[NFR-2.2](../requirements.md)）
3. **ライセンス隔離済** — KanjiVG データは `@tegaki/dataset-cjk-kanjivg` に隔離、本体 tegaki は MIT 維持（[NFR-4.1](../requirements.md), [NFR-4.2](../requirements.md)）
4. **小さな PR セット** — [japanese-roadmap.md §2 Phase 8](../japanese-roadmap.md) の 5 本 PR 分割方針に従い、Phase 7 は「ドキュメント + examples」の独立 PR として提案可能
5. **動作するサンプル付き** — `examples/react-ja/` が `bun install && bun dev` で動き、レビュアーが即確認可能

### 12-4. 懸念事項の引き継ぎ

Phase 7 で解決しきれず Phase 8 に持ち越す項目:

| # | 懸念 | Phase 7 の対応 | Phase 8 での対応予定 |
|---|---|---|---|
| A | 英語版 `japanese.en.mdx` の要否 | 日本語版のみ作成 | 上流提案時に英語 summary を PR 本文に記載、本格的な英語版は需要次第で将来対応 |
| B | examples のフレームワーク網羅（Vue/Svelte/Solid/WC） | React + Astro のみ | リリース後のコミュニティ PR で拡充。Phase 8 では依頼フレーム（contributing guide）のみ整備 |
| C | examples の CI 化（ビルド検証の自動化） | 手動検証のみ | `.github/workflows/examples.yml` 新設、`bun --filter examples/* build` を PR トリガで実行 |
| D | PreviewApp のプリセット拡張（他言語） | `ja-basic`, `ja-kanji` のみ | 他言語サポート追加時に再検討、URL state の `preset` を拡張可能な設計にしてある |
| E | ビデオチュートリアル（§11 案 C） | 非対応 | リリース後のマーケティング素材として別予算、Phase 8 には含めない |
| F | Storybook / TypeDoc 導入（§11 案 D / E） | 非対応 | API 安定後（Phase 8 完了後）に別プロジェクトとして検討 |
| G | `japanese-support.md` と `japanese.mdx` の 2 重メンテ | 設計書を単一ソースとして公開 mdx は参照リンク | リリース後のドキュメント整理時に統合 or どちらか廃止を判断 |

### 12-5. Phase 8 開始時の確認事項

Phase 8 担当者は開始時に以下をチェック:

- [ ] 本チケット §5 Deliverables の 17 ファイル（新規 13 + 変更 4）がすべて main にマージ済
- [ ] `bun dev` で `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` が動作
- [ ] `bun dev` で `/tegaki/guides/japanese/` が表示
- [ ] `bun --filter @tegaki/website build` 成功
- [ ] `bun --filter examples/react-ja build` 成功
- [ ] `bun --filter examples/astro-ja build` 成功
- [ ] Phase 6 の σ/μ パラメタが `constants.ts` に反映済 + `japanese.mdx` サポート範囲に反映済
- [ ] [japanese-support.md](../japanese-support.md) 既知の限界節が Phase 6 結果と一致
- [ ] リポジトリ直下 `README.md` に Language Support 節追加済

上記が揃っていれば、Phase 8 は [japanese-roadmap.md §Phase 8](../japanese-roadmap.md) の判断フロー（上流 PR / 自前リリース）に進む準備が整っている。

---

**本チケット完了判定**: §2-2 Done 定義の D-1 ～ D-15 **全項目チェック** + §10 レビューチェックリスト全項目チェック + `bun checks` 全通。ブランチ `feat/ja-phase7-docs` を main にマージした時点で ✅ 完了ステータスへ遷移。
