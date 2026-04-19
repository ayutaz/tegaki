# Phase 8: 上流提案 or 自前リリース `release decision`

> 日本語対応実装の**最終マイルストーン（8 / 8）**。Phase 1-7 で完成した成果物を、(1) 上流（`KurtGokhan/tegaki`）への PR 提案として送るか、(2) `@ayutaz/tegaki-ja` として自前で NPM 公開するか、(3) 両取り（上流 PR 先行 + 不応答時 NPM）のいずれかで外部流通可能にする。[requirements.md Q-7](../requirements.md) の未解決事項を**本 Phase で確定**し、プロジェクト完了として記録する。本 Phase はコード実装フェーズではなく**リリース判断 + 打診 + 配信**のメタ Phase である。

---

## §1. メタ情報

| 項目 | 値 |
|---|---|
| Phase | **8 / 8**（最終） |
| マイルストーン名 | 上流提案 or 自前リリース（Q-7 決定 + 配信） |
| ブランチ名 | 判断次第で `feat/ja-upstream-pr-series` / `release/v0.14.0-ja` |
| ステータス | 📝 未着手 |
| 依存（前段） | [Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md)（main マージ済必須、`guides/japanese.mdx` / README / examples 整備済） |
| 依存（後段） | なし（本 Phase がプロジェクト完了点） |
| 並列関係 | なし（最終フェーズ、先行フェーズ完了後に直列） |
| 想定期間 | **2 営業日**（一人稼働、並列化は最小限。打診〜反応待ちは営業日換算に含めず別途 1-4 週間の幅を想定） |
| 担当見積 | Discussion/Issue 投稿 0.3d + 分岐判断待ち 0.2d + PR 5 本分割・修正 or NPM publish 準備 1.0d + CHANGELOG / tag / アナウンス 0.3d + final QA 0.2d |
| **リリース区分** | **リリース判断フェーズ / プロジェクト完了点** |
| **リスク評価** | 中：上流不応答 / license 解釈 / 公開後メンテコストの長期リスクあり、ただし本 Phase 単体の技術リスクは低 |
| 関連要件 | [requirements.md](../requirements.md) Q-7 / NFR-4.1〜4.4（ライセンス） |
| 関連設計 | [japanese-support.md](../japanese-support.md) §6（公開戦略） |
| 関連ロードマップ | [japanese-roadmap.md](../japanese-roadmap.md) §Phase 8（本 Phase の判断テーブル） |
| 前フェーズ申し送り | [phase-7-docs-samples.md §12](./phase-7-docs-samples.md)（README/Changelog、公開前 final QA 項目、CC-BY-SA 表記） |
| チケットテンプレ | [docs/tickets/README.md](./README.md) |

### 1-1. このチケットが扱う範囲と扱わない範囲

| 扱う（In Scope） | 扱わない（Out of Scope、後続運用へ） |
|---|---|
| `KurtGokhan/tegaki` への GitHub Discussion / Issue での打診テンプレ作成・投稿 | 簡体字 / 繁体字 / 韓国語対応（Phase 9+、[§12-3](#12-3-次の言語対応への申し送り)） |
| 上流応答の分岐判断（receptive / hesitant / unresponsive / refuse） | 縦書き対応（永続 Out of Scope、Q-3） |
| PR 5 本分割方針の確定と分割実行（Phase 1-2 / Phase 3 / Phase 4 / Phase 5 / Phase 7） | 手書き認識（Q-4 以降の別プロジェクト） |
| 自前リリース時の `@ayutaz/tegaki-ja` NPM publish 手順 | リリース後の継続的 issue triage / ユーザーサポート（運用フェーズ、§12-2） |
| `CHANGELOG.md` 更新（Keep-a-Changelog 準拠） | 有償サポートプラン / 企業向けライセンス交渉 |
| semantic versioning 判断（minor vs major、§3-6） | モノレポ → 単独 repo 分離（現状維持、必要性なし） |
| CC-BY-SA 3.0 依存の配布物明示（`ATTRIBUTION.md` / README / `package.json`） | 新機能追加（Phase 1-7 完了範囲を超える実装） |
| git tag `v0.14.0-ja` or `v1.0.0` 作成（SemVer 判断次第） | ベンチマークデータのサードパーティ公開（別途判断） |
| `packages/renderer` README と website 「Framework Support」セクションの日本語対応明記 | 宣伝活動（Zenn 記事執筆、Twitter / X 告知は運用側に委譲） |
| 最終 smoke test + `npm install <published>` の動作確認 | ML 統合（Phase 12+、Phase 3/5 §11 案 C） |

---

## §2. 目的とゴール

### 2-1. 解決したい課題

[requirements.md Q-7](../requirements.md) で**判断待ち**として明示されている「上流への PR 提案 or 自前リリース」を本 Phase で確定する。Phase 1-7 で完成した成果物（KanjiVG データセット + パイプライン統合 + 仮名バンドル + Sigma-Lognormal リズム + ドキュメント）が**外部ユーザー import 可能な状態**に到達していなければ、プロジェクトとしては完了していない。具体的に解決する課題は 4 点。

1. **Q-7 の確定** — [japanese-roadmap.md §Phase 8](../japanese-roadmap.md) の判断テーブル（上流が前向き → PR、CC-BY-SA 衝突 → 自前、不応答 → 自前先行）を、実際の上流応答をもって分岐実行する。3 年後に「なぜ PR 一本化しなかったか」「なぜ自前で切ったか」の根拠を本 Phase 成果物で残す。

2. **上流への貢献機会の最大化** — Tegaki OSS 全体にとって、日本語対応は**他 CJK 言語（簡体字・繁体字・韓国語）への拡張ベース**となる価値ある変更。上流がマージ可能なら、Tegaki 本体ユーザー全員（現時点で週間 download 規模、詳細は npm stat で確認）が恩恵を受ける。打診を省略して自前切り出しは貢献機会の逸失。

3. **自前リリース路の確保** — 上流が応答しない / 方針衝突の場合でも、**ユーザーが今すぐ使える状態**が必須。`npm install @ayutaz/tegaki-ja` で動く配布物（`package.json` / tag / NPM publish）を整備し、Phase 7 のドキュメントで案内する。

4. **CC-BY-SA 3.0 依存の適切な告知** — [NFR-4.2](../requirements.md) で `@tegaki/dataset-cjk-kanjivg` を CC-BY-SA 3.0 隔離済だが、**最終配布物のどこに CC-BY-SA の伝達が必要か**（本体 MIT パッケージの README？ `package.json` の `license` フィールド？ `ATTRIBUTION.md`？）を本 Phase で確定。ライセンス解釈ミスは公開後の訂正コストが大きく、本 Phase で専門的整理が必要。

### 2-2. Done の定義（測定可能）

以下 **12 項目すべて** を満たしたとき本 Phase 完了。[Q-7](../requirements.md) 確定 + [NFR-4](../requirements.md) 4 項目網羅。

- [ ] **D-1** `KurtGokhan/tegaki` の GitHub Discussion or Issue に打診ポストが投稿済（§3-1 テンプレ準拠、[japanese-roadmap.md](../japanese-roadmap.md) / [japanese-support.md](../japanese-support.md) を引用）
- [ ] **D-2** 上流応答（receptive / hesitant / unresponsive / refuse の 4 状態）を 2 週間以内に確認、[§3-2 判断表](#3-2-反応次第の分岐判断表)に従い分岐決定を本 Phase ticket に記録
- [ ] **D-3** 分岐が PR 提案の場合、PR #1（Phase 1-2 データセット + ローダー）が up されレビュー要請済
- [ ] **D-4** 分岐が PR 提案の場合、PR #2 以降（Phase 3 / 4 / 5 / 7）の分割計画が PR #1 本文で明示、リンクで連鎖
- [ ] **D-5** 分岐が自前リリースの場合、`@ayutaz/tegaki-ja` として NPM publish 済、`npm install @ayutaz/tegaki-ja` が外部から動作
- [ ] **D-6** 分岐が両取りの場合、D-3/D-4 の PR と D-5 の NPM publish が**矛盾なく共存**（同期メカニズムを §3-4 で記述）
- [ ] **D-7** `CHANGELOG.md` に Phase 1-7 の変更点を Keep-a-Changelog 準拠で記載、本 Phase でバージョン確定（SemVer、§3-6）
- [ ] **D-8** git tag が作成、`main` ブランチに push 済（`v0.14.0` or `v1.0.0` のいずれか）
- [ ] **D-9** `packages/renderer/README.md` の「Framework Support」セクションに日本語対応の明記、CC-BY-SA 依存の注意が記載
- [ ] **D-10** 配布物（npm tarball or 上流 PR 差分）に**ライセンス伝達が適切**（本体 MIT 維持、dataset CC-BY-SA 分離、ATTRIBUTION 同梱）
- [ ] **D-11** `npm install` → React で `<TegakiRenderer font={kana}>` が動くことを別 sandbox で確認（§8 e2e）
- [ ] **D-12** `bun typecheck && bun run test && bun check` 全通（[NFR-3.2](../requirements.md)）、脆弱性スキャン（`npm audit` / `bun audit` 相当）で **High/Critical 0 件**

---

## §3. 実装内容の詳細

### 3-1. 上流 Discussion / Issue 打診テンプレート

`KurtGokhan/tegaki` の [GitHub Discussion](https://github.com/KurtGokhan/tegaki/discussions) に新規ポストを立てる。Issue ではなく Discussion を選ぶ理由は (1) 設計議論ベースで始めるのが礼儀、(2) Issue 化は分岐判断後に reviewer が誘導することが多いため。

```markdown
# Proposal: Japanese (CJK) language support via KanjiVG + Sigma-Lognormal rhythm

## TL;DR
Fork [ayutaz/tegaki](https://github.com/ayutaz/tegaki) has implemented full
Japanese support (kanji + hiragana + katakana) with MEXT stroke order and
natural handwriting rhythm. ~6 weeks of work across 7 milestones. Seeking
direction: upstream merge, or downstream `@ayutaz/tegaki-ja` NPM package?

## Why upstream matters
- Japanese is the most-requested non-Latin language for handwriting animation
- The KanjiVG + Sigma-Lognormal approach generalizes to Simplified / Traditional Chinese, Korean (shared CJK infrastructure)
- Single canonical fork avoids ecosystem fragmentation

## What's implemented
See [japanese-roadmap.md](https://github.com/ayutaz/tegaki/blob/main/docs/japanese-roadmap.md) for the 7-phase breakdown:
(1) `@tegaki/dataset-cjk-kanjivg` (CC-BY-SA 3.0 isolated), (2) KanjiVG loader,
(3) pipeline integration with `--dataset kanjivg` flag, (4) pre-built kana
bundle (`tegaki/fonts/ja-kana`, 179 glyphs, ≤ 300 KB), (5) Sigma-Lognormal
rhythm (clean-room TS, no GPL), (6) MOS validation (N=3-5, avg ≥ 4.0), (7) docs + examples.

## License posture
Upstream MIT **preserved** — all core Tegaki packages remain MIT. KanjiVG data
(CC-BY-SA 3.0) is **isolated** in `@tegaki/dataset-cjk-kanjivg` subpackage;
users opt-in by installing it. Sigma-Lognormal is clean-room TS from Plamondon
1995 equations — no GPL/LGPL consulted or copied (commit history reviewable).

## Proposed path
- **Option U (Upstream PR series)**: 5 small PRs (Phase 1-2 / 3 / 4 / 5 / 7), each independently mergeable
- **Option D (Downstream package)**: `@ayutaz/tegaki-ja` NPM, upstream as peerDependency
- **Option H (Hybrid)**: Upstream where accepted, downstream for remainder

Which do you prefer? We can drive either path forward.

## Artifacts
Fork: https://github.com/ayutaz/tegaki / Design: [japanese-support.md](../japanese-support.md), [japanese-roadmap.md](../japanese-roadmap.md), [requirements.md](../requirements.md), [technical-validation.md](../technical-validation.md) / Demo: https://ayutaz.github.io/tegaki/generator/?f=Noto+Sans+JP&t=ありがとう
```

Discussion は**5 営業日以内に 1 回 bump**（同スレッドで「friendly ping after 5 days」）、**2 週間以内に反応なし**なら unresponsive 判定に移行（§3-2）。

### 3-2. 反応次第の分岐判断表

打診後の上流反応を 4 カテゴリに分け、各カテゴリでの本 Phase の次アクションを事前確定する。人間判断の恣意性を減らし、3 年後に「なぜ分岐したか」を説明可能にする。

| # | 反応カテゴリ | 判定条件（観測可能） | 次アクション | 工数内訳 |
|---|---|---|---|---|
| **R-1** | **Receptive**（前向き受諾） | メインテナが "Yes, PR welcome" 相当の明示肯定、特定 PR の粒度 / 順序について具体的要望あり | **Option U 採用** — PR #1（Phase 1-2）から順次 up。PR 間隔は review 負荷考慮で 5 営業日空ける | PR 5 本 × 0.5 日（分割 + 本文整形）+ 上流 review 対応 (時間依存、営業日外) |
| **R-2** | **Hesitant**（条件付き / 一部受諾） | 「リズム部分は入れたいがデータセットは外部に」等の部分応諾、または「まずは Discussion 継続」 | **Option H 採用** — 受諾された範囲のみ PR、残りは `@ayutaz/tegaki-ja` に独立 publish | 受諾範囲の PR 0.5d + NPM publish 0.5d + 同期戦略文書 0.5d |
| **R-3** | **Unresponsive**（沈黙） | 2 週間反応なし（Discussion 閲覧数はあるがコメントゼロ）、または "will review later" で 1 ヶ月停止 | **Option D 採用** — `@ayutaz/tegaki-ja` として自前 NPM publish 先行、将来 PR 化の余地は残す | NPM publish 0.5d + tag + アナウンス 0.3d |
| **R-4** | **Refuse**（明示拒否） | CC-BY-SA 衝突 / scope 外 / maintainer capacity 不足 を明示拒否 | **Option D 採用** + 拒否理由を ATTRIBUTION に記録 | NPM publish 0.5d + 理由記録 0.2d |

**補足**:
- **R-1 の PR 順序**は「機能的に無影響なものから」。Phase 1-2（dataset + loader、呼ばれないため影響ゼロ）→ Phase 3（CJK 統合、ラテン無影響）→ Phase 4（仮名 bundle、import 時のみ使用）→ Phase 5（rhythm、opt-in フラグ）→ Phase 7（ドキュメント）。この順序で「マージ途中で止まっても機能的に破綻しない」を機械保証。
- **R-2 の同期戦略**は §3-4 で詳細。
- **R-3 の unresponsive 期間**は上流の過去 issue / PR の応答速度から推定（`gh issue list --state closed --limit 20` で中央値計測、2026 年時点で 1-2 週間が目安）。
- **R-4 の refuse 理由**は Discussion スレッドに残り permanent record、後続フェーズ判断で参照。

### 3-3. PR 分割方針（5 本の小さい PR）

Option U / H 採用時の PR 分割規則。[japanese-roadmap.md §Phase 8](../japanese-roadmap.md) の「5 本の小さい PR」計画を本 Phase で具体化。各 PR は**独立にマージ可能**で、**途中で止まっても機能的破綻がない**ことを必須とする。

| PR # | スコープ | 差分規模（推定） | 依存 | 独立 merge 可否 |
|---|---|---|---|---|
| **PR #1** | Phase 1-2: `@tegaki/dataset-cjk-kanjivg` 雛形 + KanjiVG loader | +3,500 行 / -0 行、新規 package 1 本 | なし（最初） | ✅（loader は内部のみで機能呼出なし、merge しても既存挙動不変） |
| **PR #2** | Phase 3: パイプライン統合（`--dataset kanjivg` flag、`datasetSkeleton()` 分岐） | +1,200 行 / -50 行、既存 generator 差分 | PR #1 マージ後 | ✅（flag 未指定時は既存挙動、後方互換） |
| **PR #3** | Phase 4: 仮名バンドル（`tegaki/fonts/ja-kana/` pre-built） | +850 行 / -5 行、renderer 新規 font export | PR #2 マージ後 | ✅（import しなければ無影響） |
| **PR #4** | Phase 5: Sigma-Lognormal rhythm（`rhythm.ts` + stroke-order.ts 差分 + `--rhythm` flag） | +500 行 / -10 行、renderer + generator 両側 | PR #2 マージ後（PR #3 と並列可） | ✅（default `constant` で既存完全互換） |
| **PR #5** | Phase 7: ドキュメント + examples（`guides/japanese.mdx` + website PreviewApp プリセット） | +1,200 行 / -30 行、website 変更 | PR #3-4 マージ後 | ✅（ドキュメント追加のみ） |

**PR 本文テンプレート**（各 PR 共通のヘッダ）:

```markdown
## Summary (from Phase N ticket [phase-N-*.md](../docs/tickets/phase-N-*.md))
- <1-3 bullet points>

## Tests
- [ ] `bun typecheck && bun run test && bun check` all pass
- [ ] Phase N AC (acceptance criteria) satisfied: see ticket §6
- [ ] Phase N CI snapshot diff = 0 (backward compat)

## License
- All new code is MIT (matches upstream).
- CC-BY-SA 3.0 dataset **isolated** in `@tegaki/dataset-cjk-kanjivg` (PR #1 only).
- Sigma-Lognormal is clean-room implementation, no GPL consulted (PR #4 only).

## Related
- Previous PR: #<N-1> (merged)
- Next PR: #<N+1> (pending this PR)
- Design doc: [docs/japanese-support.md](../docs/japanese-support.md)
```

### 3-4. 自前リリース（`@ayutaz/tegaki-ja`）の npm publish 手順

Option D 採用時の具体的手順。Phase 7 で整備された配布物を**別 NPM namespace**として publish する。

```bash
# 1. ownership 確認: npm access ls-packages @ayutaz
# 2. packages/renderer/package.json を複製、@ayutaz/tegaki-ja へ rename、
#    @tegaki/dataset-cjk-kanjivg を peerDep 化
# 3. ビルド + dry-run: cd packages/renderer && bun run build && npm publish --access public --dry-run
# 4. 本番 publish: npm publish --access public
# 5. tag: git tag v0.14.0-ja && git push origin v0.14.0-ja
# 6. GitHub Release: gh release create v0.14.0-ja --title "v0.14.0 — Japanese support" --notes-file CHANGELOG.md --target main
```

**publish 前の必須チェック**:

| # | 項目 | コマンド | 失敗時対応 |
|---|---|---|---|
| P-1 | `package.json` の `version` 正 | `npm pkg get version` | §3-6 SemVer に従い訂正 |
| P-2 | `license` フィールド正（MIT） | `npm pkg get license` | `"MIT"` に設定 |
| P-3 | `files` フィールドで配布対象限定 | `npm pack --dry-run` | 余分なファイル除外 |
| P-4 | `peerDependencies` で CC-BY-SA データセット宣言 | `cat packages/renderer/package.json` | `@tegaki/dataset-cjk-kanjivg` を peerDep 化 |
| P-5 | `README.md` に CC-BY-SA 依存の明示 | 目視 | [§3-7](#3-7-cc-by-sa-依存の明示) 文面を追加 |
| P-6 | `npm audit` で High/Critical 脆弱性 0 件 | `npm audit --audit-level=high` | 個別対応 |
| P-7 | unpacked tarball で `import` が動くこと（§8 e2e） | `npm pack && cd /tmp && npm i tegaki-ja-*.tgz && node -e "import('@ayutaz/tegaki-ja/react')"` | paths 訂正 |

**両取り（Option H）の同期戦略**: 自前 `@ayutaz/tegaki-ja v0.14.0` を先に publish（Day 1、Phase 1-7 全部入り）→ 上流 PR up（Day 2 以降、一部受諾範囲）→ 上流マージ後（Day X）に自前 `v0.14.1` で上流分を移植・重複削減 → 全 PR マージ済み時点で自前 `v1.0.0-deprecated.1` を publish、README で「上流 + `@tegaki/dataset-cjk-kanjivg` に移行推奨」明記。

### 3-5. CHANGELOG 更新（Keep-a-Changelog 準拠）

`## [0.14.0] - 2026-04-XX — Japanese support` セクションを `CHANGELOG.md` に追加。必須セクション:
- **Added**: KanjiVG dataset 統合、`@tegaki/dataset-cjk-kanjivg` 新規、`--dataset kanjivg` / `--rhythm lognormal` flag、`tegaki/fonts/ja-kana` bundle、`rhythm.ts`、PreviewApp `se=lognormal` preset、`guides/japanese.mdx`、React + Astro examples
- **Changed**: `pipelineOptionsSchema` 拡張（後方互換 default）、`orderStrokes()` optional 引数追加、README Framework Support 節
- **Preserved (backward compatibility)**: ラテン出力 byte-identical、`BUNDLE_VERSION` 無変更、TegakiBundle consumer 互換
- **License notes**: Tegaki core = MIT 維持、KanjiVG 派生 = CC-BY-SA 3.0（isolated）、Sigma-Lognormal = clean-room（no GPL）
- **Contributors**: @ayutaz + Japanese MOS evaluators (N=3-5, anonymized)

### 3-6. Semantic Versioning 判断（minor bump か major か）

| 選択肢 | 根拠 | 適合条件 |
|---|---|---|
| **v0.14.0（minor bump）** | [NFR-2.1〜2.4](../requirements.md) のラテン無影響 / BUNDLE_VERSION 無変更 / TegakiBundle 型無変更 を満たす場合 | Phase 1-7 の CI 検証で後方互換が全項目通過 |
| **v1.0.0（major bump）** | 「日本語対応」という外部向けインパクトが大きく、semver の精神を超えてユーザー告知を優先する場合 | 既存ユーザーへの明示的告知が戦略的に有益（ブログ記事連動等） |

**推奨: v0.14.0**。根拠:

1. [AC-2 §3](../requirements.md) で「ラテン snapshot 差分ゼロ」を機械保証済（後方互換）
2. [NFR-2.4](../requirements.md) で `BUNDLE_VERSION` 互換性維持済
3. 新規 flag（`--dataset kanjivg` / `--rhythm lognormal`）はすべて opt-in
4. v1.0.0 はより重大な API 契約固定化（LTS 相当）を暗黙に示唆するため、日本語対応の完成度が十分に evaluator 検証済でも、**時期尚早**

**v1.0.0 に昇格する分岐条件**（本 Phase で採用しない想定）:
- Phase 6 MOS > 4.5 で「商用教育パートナー採用」の具体案件が存在
- 上流 (`KurtGokhan/tegaki`) から「major bump の PR で出して欲しい」と明示要望

### 3-7. CC-BY-SA 依存の明示

配布物に CC-BY-SA 伝達を**物理的に同梱**するため、以下 4 箇所を必須明記。

| # | 場所 | 内容 | 根拠 |
|---|---|---|---|
| L-1 | `packages/dataset-cjk-kanjivg/LICENSE` | CC-BY-SA 3.0 フルテキスト | [CC BY-SA 3.0 legal code](https://creativecommons.org/licenses/by-sa/3.0/legalcode) |
| L-2 | `packages/dataset-cjk-kanjivg/ATTRIBUTION.md` | KanjiVG 帰属 + SHA pin + share-alike 説明 | [FR-2.7/2.8](../requirements.md) |
| L-3 | `packages/renderer/README.md` に CC-BY-SA 依存の注記 | 「日本語対応を使う場合、CC-BY-SA 3.0 の KanjiVG データセットが別 package で供給されます」+ opt-in install 手順 | ユーザー告知義務 |
| L-4 | `packages/renderer/fonts/ja-kana/bundle.ts` ヘッダコメント | `// Derived from KanjiVG (CC-BY-SA 3.0). See @tegaki/dataset-cjk-kanjivg/ATTRIBUTION.md` | share-alike の派生物表示 |

**著作権解釈の整理**（本 Phase で専門的判断が必要な核心部分）:

- `glyphData.json` は KanjiVG SVG を変換した**派生物**で CC-BY-SA 継承
- pre-built bundle（`tegaki/fonts/ja-kana`）は `glyphData.json` を import するため CC-BY-SA 派生
- 一方、Tegaki 本体 renderer / generator コードは KanjiVG 由来データを**受動的に処理**するだけで、コード自体に著作物は含まない → **MIT 維持可能**
- ユーザーが仮名 bundle を import したアプリは CC-BY-SA 派生物配布と解釈、source 開示義務あり（share-alike）
- **推奨 UX**: ユーザーが「CC-BY-SA に触れたくない」場合、`@tegaki/dataset-cjk-kanjivg` を install せず、日本語 bundle を import しなければ MIT のまま運用可能

---

## §4. エージェントチーム構成

本 Phase は実装 Phase ではなく**調整 + 交渉 + 配信**の性質のため、**3 名編成**。独立した 3 職種を並列化する。

| # | 役割 | 人数 | 担当成果物 | 必要スキル | 工数 |
|---|---|---|---|---|---|
| 1 | **リリース調整担当** | 1 | NPM publish 手順（§3-4）実行、`package.json` 準備、tag 作成、`npm audit` 対応、dry-run 検証、P-1〜P-7 チェック | npm CLI、SemVer 判断、tarball 内容検証、配布レイアウト設計 | 0.8d |
| 2 | **上流交渉担当** | 1 | §3-1 Discussion/Issue 投稿、§3-2 応答カテゴリ判定、§3-3 PR 5 本の up、上流 review 対応、同期戦略（Option H） | GitHub Discussion / Issue / PR 作法、OSS コミュニケーション、英語、上流プロジェクト文化理解 | 0.7d（打診時間不含） |
| 3 | **リリースノート担当** | 1 | §3-5 CHANGELOG 作成、§3-7 license 表記（L-1〜L-4）、README 「Framework Support」更新、GitHub Release notes、D-9 Framework Support 節更新 | Keep-a-Changelog 規約、markdown 整形、ライセンス文面精度、英文 technical writing | 0.5d |

**並列化**: #1（リリース調整）と #3（リリースノート）は完全並列。#2（上流交渉）は Day 0 Discussion 投稿後、応答待ち期間は他 Phase 作業不可のため**間欠的作業**。**直列 2 日 / 並列 1 日（応答待ち時間を除く）**で完走可能。

### 4-1. ロール間の受け渡しとレビュー委譲

```
 Day 0  #2 Discussion 投稿（§3-1 テンプレ準拠）
        #1 package.json 準備（§3-4 P-1〜P-4）│ #3 CHANGELOG 初稿
 Day 1  応答観測（#2 Slack/email で ping）
        #1 npm publish dry-run（P-5〜P-7）   │ #3 README 更新
 Day 2  応答確定、分岐決定（§3-2）
        PR 分岐: #2 が PR #1〜#5 分割
        NPM 分岐: #1 が npm publish 本番、#3 が GitHub Release
        両取り: #1 NPM publish、#2 上流 PR #1 up、#3 両方のアナウンス
 後日   #2 上流 review 対応、#1 追加 bugfix patch 必要なら publish
```

**レビュー委譲**:
- **リリース手順の正確性** → #1 自身 + #3 の tarball 内容読み合わせ（P-3/P-5 確認）
- **ライセンス表記の正確性** → #3 が主担当、#1/#2 が cross-check（L-1〜L-4）
- **上流交渉内容の妥当性** → #2 単独の判断（礼節 / 英語文面 / OSS 文化）
- **CHANGELOG の漏れチェック** → #3 主担当、Phase 1-7 の各 ticket §5 Deliverables と照合

---

## §5. 提供範囲（Deliverables）

### 5-1. 投稿・交渉成果物

- [ ] `KurtGokhan/tegaki` Discussion ポスト 1 件（§3-1 テンプレ準拠、外部から閲覧可能）
- [ ] 2 週間以内の応答観測ログ（本 Phase ticket に追記、R-1〜R-4 判定記録）
- [ ] 分岐決定の明示（本 Phase ticket の「決定」セクション、不可逆記録）

### 5-2. PR 成果物（Option U / H 時）

- [ ] PR #1: Phase 1-2（データセット + ローダー）
- [ ] PR #2: Phase 3（パイプライン統合）
- [ ] PR #3: Phase 4（仮名バンドル）
- [ ] PR #4: Phase 5（rhythm）
- [ ] PR #5: Phase 7（ドキュメント）
- [ ] 各 PR 本文が §3-3 テンプレ準拠、Summary / Tests / License / Related を含む

### 5-3. NPM publish 成果物（Option D / H 時）

- [ ] `@ayutaz/tegaki-ja` NPM に publish 済（`npm view @ayutaz/tegaki-ja` で確認可能）
- [ ] unpacked tarball 内容が §3-4 P-1〜P-7 を満たす
- [ ] `peerDependencies` に `@tegaki/dataset-cjk-kanjivg` 宣言

### 5-4. リリース文書成果物

- [ ] `CHANGELOG.md` 更新（§3-5 テンプレ準拠）
- [ ] `packages/renderer/README.md` の Framework Support 節に日本語対応明記
- [ ] `ATTRIBUTION.md`（`@tegaki/dataset-cjk-kanjivg` 内、L-2）
- [ ] GitHub Release notes（tag `v0.14.0` 紐付け）

### 5-5. プロジェクト管理成果物

- [ ] git tag `v0.14.0`（`main` に push 済）
- [ ] [docs/tickets/README.md](./README.md) ステータス列が ✅ 完了
- [ ] 本 Phase ticket の「決定」セクションに R-1〜R-4 判定と選択された分岐が記録

---

## §6. テスト項目（受入基準ベース）

[Q-7](../requirements.md) 確定 + [NFR-4](../requirements.md) 4 項目 + 配布物の機械検証を網羅。

| # | 要件 ID | テスト内容 | 期待値 | 種別 |
|---|---|---|---|---|
| T-01 | D-1 | `gh api repos/KurtGokhan/tegaki/discussions/categories` で Discussion カテゴリ確認、投稿済を `gh discussion view <id>` で機械確認 | 投稿 hit | meta |
| T-02 | D-2 | 2 週間以内の応答観測、R-1〜R-4 分類記録が本 Phase ticket に存在 | 記録 hit | meta |
| T-03 | D-3 | Option U 時、PR #1 が `open` or `merged`、本文が §3-3 テンプレ準拠 | PR hit | e2e |
| T-04 | D-5 | `npm view @ayutaz/tegaki-ja version` で publish 済確認、`v0.14.0` 以上 | version match | e2e |
| T-05 | D-7 | `CHANGELOG.md` の [Unreleased] が空、[0.14.0] セクションが §3-5 準拠 | diff 0 | unit |
| T-06 | D-8 | `git tag --list v0.14.0` で tag 存在確認、`main` に到達 | tag hit | meta |
| T-07 | D-9 | `packages/renderer/README.md` の Framework Support 節に日本語対応明記 | grep hit | meta |
| T-08 | D-10 | `npm pack --dry-run` の tarball 内容に LICENSE / ATTRIBUTION / README 含む、CC-BY-SA 分離確認 | tarball check | e2e |
| T-09 | D-11 | 空 sandbox で `npm install @ayutaz/tegaki-ja react`、`<TegakiRenderer font={kana}>` が動作（§8） | 動作 | e2e |
| T-10 | D-12 | `bun typecheck && bun run test && bun check` 全通 | exit 0 | e2e |
| T-11 | D-12 | `npm audit --audit-level=high` High/Critical 0 件 | 0 findings | e2e/security |
| T-12 | [NFR-4.1](../requirements.md) | `packages/renderer/package.json` `license === "MIT"` | MIT | unit |
| T-13 | [NFR-4.2](../requirements.md) | `packages/dataset-cjk-kanjivg/package.json` `license === "CC-BY-SA-3.0"` | CC-BY-SA-3.0 | unit |
| T-14 | [NFR-4.3](../requirements.md) | `packages/renderer/src/lib/rhythm.ts` 先頭コメントに "clean-room"、"no GPL" 含む | grep hit | meta |
| T-15 | [NFR-4.4](../requirements.md) | `package.json` `dependencies` すべて MIT/BSD/Apache 由来（`npm ls --prod --all` で機械確認） | compliant | meta |

---

## §7. Unit テスト

本 Phase は実装 Phase ではないが、CI の smoke test として以下を実行可能にする。

### 7-1. CI smoke test（GitHub Actions に組み込み想定）

`.github/workflows/release-smoke.yml`（新規）。trigger: `push: tags: ['v*']` + `workflow_dispatch`。ステップ:
1. `actions/checkout@v4` + `oven-sh/setup-bun@v1`
2. `bun install`
3. `bun checks`（typecheck + lint + test）
4. `bun --filter tegaki build`
5. `cd packages/renderer && npm pack --dry-run > /tmp/pack-output.txt` → `grep LICENSE` + `grep README.md`
6. `npm audit --audit-level=high --production`
7. `grep -E "^## \[0\.14\.[0-9]+\]" CHANGELOG.md`

### 7-2. リリース script 単体テスト

`scripts/release.test.ts`（新規、任意）に以下 3 ケース:
- `CHANGELOG.md` の最新 version が `packages/renderer/package.json` version と一致
- `packages/dataset-cjk-kanjivg/ATTRIBUTION.md` に CC-BY-SA-3.0 URL が含まれる（L-2 契約）
- `packages/renderer/src/lib/rhythm.ts` ヘッダに "clean-room" 宣言（T-14 と同値）

---

## §8. e2e テスト

**目的**: 外部ユーザーの install → 使用フローが完全に動くことを **リアルな sandbox** で検証。

### 8-1. `npm install @ayutaz/tegaki-ja` 最小動作確認

```bash
# /tmp/tegaki-ja-e2e に空 Vite + React プロジェクト作成
mkdir -p /tmp/tegaki-ja-e2e && cd /tmp/tegaki-ja-e2e
npm init -y
npm install @ayutaz/tegaki-ja @tegaki/dataset-cjk-kanjivg react react-dom
npm install --save-dev vite @vitejs/plugin-react typescript @types/react @types/react-dom

# src/App.tsx に最小描画
# import { TegakiRenderer } from '@ayutaz/tegaki-ja/react';
# import kana from '@ayutaz/tegaki-ja/fonts/ja-kana';
# <TegakiRenderer bundle={kana} text="ありがとう" fontSize={96} />

npx vite build  # expect: exit 0、dist/assets/*.js 生成
npx vite preview --port 5173  # 「ありがとう」が描画される
```

### 8-2. CC-BY-SA 隔離の e2e 確認

`@tegaki/dataset-cjk-kanjivg` 未 install で、ラテン bundle（例: `caveat`）は動作、日本語 bundle（`ja-kana`）は peerDep 未解決エラーになることを確認。空 Node project に `npm install @ayutaz/tegaki-ja` のみでラテンが描画でき、日本語 import は gating される挙動が期待値。

### 8-3. 両取り（Option H）時の上流 `tegaki` + 自前 `@ayutaz/tegaki-ja` 共存確認

Option H 採用時のみ実行。`npm install tegaki@0.13.0 @ayutaz/tegaki-ja` が同居して依存解決成功、`npm ls` で conflict が 0 件であることを確認。自前側の `peerDependencies: { tegaki: '^0.13 || ^0.14' }` 宣言が機能していることの検証。

### 8-4. 失敗時の切り分け

| 失敗箇所 | 原因候補 | 対処 |
|---|---|---|
| §8-1 `npm install` 失敗 | `peerDependencies` 未宣言 or 誤名 | `package.json` 修正、再 publish |
| §8-1 build 失敗 | `exports` フィールド誤り | subpath exports 検証、v0.14.1 patch |
| §8-1 描画されない | CC-BY-SA dataset 未 install | README 誘導文面を §8-1 手順と一致させる |
| §8-2 Latin も失敗 | 上流 tegaki からの re-export 漏れ | `package.json` `exports` 追加 |
| §8-3 依存 conflict | `peerDependencies` ranges 狭すぎ | `^` to allow patch updates |

---

## §9. 懸念事項とリスク

本 Phase は技術実装ではなく**外部とのインターフェース**が主なため、技術リスクより**社会的 / 法的リスク**の比重が高い。7 項目に整理。

### 9-A: 上流の拒否（R-4）または長期不応答（R-3）

- **影響**: 中。Option U が取れず、Option D で運用する場合、Tegaki エコシステム分断の可能性
- **根本原因**: 上流メンテナの capacity 不足、CC-BY-SA 方針衝突、プロジェクトフォーカス差異
- **対策**: (1) §3-1 打診で選択肢を明示しメンテナに判断コスト最小化、(2) R-3 の場合は 2 週間 bump 後 unresponsive 確定ルールで意思決定遅延防止、(3) Option D 採用時も「将来 PR 化の余地」を README に明記し長期的合流可能性を残す
- **残余リスク**: 低。自前 publish は 0.5 日で完走可能、社会的機会損失は時間で回復

### 9-B: License 解釈のグレーゾーン（CC-BY-SA 3.0 派生物）

- **影響**: 高（license 違反は公開後の訂正コストが最大、企業ユーザーに対する信頼失墜リスク）
- **根本原因**: CC-BY-SA 3.0 の「派生物」範囲が、「KanjiVG SVG を TS pipeline で変換した glyphData.json」に及ぶか学説差あり
- **対策**: (1) 派生物とみなし CC-BY-SA 継承（保守的 / 安全側）、(2) `@tegaki/dataset-cjk-kanjivg` を完全分離、(3) renderer 本体 MIT 維持で opt-in 構造、(4) §3-7 の L-1〜L-4 で物理的同梱確保、(5) 疑義ある場合は Creative Commons 公式 FAQ + 法律相談（プロジェクト規模的には unlikely、本 Phase では保守的運用で pass）
- **残余リスク**: 中。企業法務部から疑義提起あれば [japanese-support.md](../japanese-support.md) + ATTRIBUTION で説明可能だが、完全に排除はできない

### 9-C: Public 公開後のメンテコスト（issue / PR 流入）

- **影響**: 中。個人 OSS 単独運用のため、issue 流入が週数件を超えると保守能力破綻
- **根本原因**: 日本語対応は潜在ユーザーベースが大きい（技術系 Twitter / 教育 EdTech）、想定外ユースケースの要望殺到可能性
- **対策**: (1) issue template で「再現手順 + 期待 / 実動作」を必須化（既存 [issue template](../../.github/ISSUE_TEMPLATE/) 再利用）、(2) `good first issue` ラベル活用で contributor 誘導、(3) 月 1 回 triage day 設定（§12-2 運用）、(4) 返信しない issue は 60 日で auto-close bot（GitHub Actions で実装可能、Phase 9+）
- **残余リスク**: 中。メンテ単独者の稼働余力次第、長期的には co-maintainer 募集を視野

### 9-D: バージョン競合（上流 tegaki と自前 @ayutaz/tegaki-ja）

- **影響**: 中。Option H 両取り時、ユーザーが両方 install すると duplicate symbol / 型不一致
- **根本原因**: 自前パッケージが上流のコードを duplicate する構造
- **対策**: (1) `peerDependencies: { tegaki: '^0.13 || ^0.14' }` で上流を peerDep 化、(2) 自前は「日本語追加部分のみ」を export、(3) README で「上流と自前を同時 install しない」を明示、(4) 上流 PR マージ後は自前を deprecated 化（§3-4 同期戦略）
- **残余リスク**: 低。Option D 単独採用なら発生せず、Option H では明示文書化で吸収

### 9-E: Phase 7 ドキュメントの Outdated リスク

- **影響**: 中。Phase 7 で整備した `guides/japanese.mdx` / examples は本 Phase 時点のバージョン依存記述で、バージョン bump で陳腐化
- **根本原因**: ドキュメントとコードの継続的同期が保守コスト
- **対策**: (1) 本 Phase 時点の doc を `v0.14.0` の時点スナップショットとして fix、(2) 将来バージョンアップでドキュメント更新が必要な箇所を `<!-- VERSION-PINNED -->` コメントで mark、(3) `guides/japanese.mdx` のコードサンプルは `@example` タグ付きで機械的 parse 可能
- **残余リスク**: 低。陳腐化は避けられないが、pinning で発見容易

### 9-F: セキュリティ（依存の脆弱性）

- **影響**: 高（High/Critical 脆弱性の公開放置は即時 trust 失墜）
- **根本原因**: 新規依存 `@xmldom/xmldom`（Phase 2）等の transitive dep に未知の CVE
- **対策**: (1) Release 前 `npm audit --audit-level=high` で 0 件確認（§3-4 P-6、§6 T-11）、(2) GitHub Dependabot alerts 有効化、(3) High/Critical 発見時は **24 時間以内に patch release**、(4) Phase 9+ で `snyk.io` 等の継続スキャン導入検討
- **残余リスク**: 低。音識別 + 自動 alert で反応時間最小化

### 9-G: 宣伝不足による採用ゼロリスク

- **影響**: 低〜中。公開しても誰にも知られず、Phase 6 MOS 評価以外の実利用データが蓄積されない
- **根本原因**: OSS 公開の価値は発見されなければゼロ、発信チャネルなしでは埋没
- **対策**: (1) 本 Phase では**実装的完了**のみを目標、宣伝は運用側に委譲、(2) Zenn / Qiita 記事は [japanese-roadmap.md](../japanese-roadmap.md) §7 の次のアクションとして記録、(3) `awesome-typescript` / `awesome-fonts` / `awesome-japanese` リストへの PR は Phase 9+ で段階的
- **残余リスク**: 中。技術的完成 != ユーザー獲得、だが本 Phase スコープ外

---

## §10. レビュー項目

PR レビュー時のチェックリスト。**リリース手順 / license / security / README 完成度の 4 観点で独立 LGTM**。

### 10-1. Final QA の観点（#1 + #3 が LGTM）

- [ ] `bun checks` exit 0
- [ ] 全 7 Phase の ticket ステータスが ✅ 完了（[docs/tickets/README.md](./README.md)）
- [ ] [AC-1〜AC-4](../requirements.md) の全項目チェック済（各 Phase ticket §6 参照）
- [ ] `CHANGELOG.md` の [0.14.0] セクションが Phase 1-7 の成果を網羅
- [ ] `packages/renderer/package.json` `version === "0.14.0"`（または合意済 SemVer）
- [ ] `git log v0.13.0..main --oneline` で Phase 1-7 の commit が全て reachable

### 10-2. License 表記の観点（#3 主担当、#1/#2 が cross-check）

- [ ] `packages/renderer/package.json` `license === "MIT"` ([NFR-4.1](../requirements.md))
- [ ] `packages/generator/package.json` `license === "MIT"`
- [ ] `packages/dataset-cjk-kanjivg/package.json` `license === "CC-BY-SA-3.0"` ([NFR-4.2](../requirements.md))
- [ ] `packages/dataset-cjk-kanjivg/LICENSE` にフルテキスト（L-1）
- [ ] `packages/dataset-cjk-kanjivg/ATTRIBUTION.md` に KanjiVG 帰属 + SHA pin（L-2）
- [ ] `packages/renderer/README.md` に CC-BY-SA 依存の注記（L-3）
- [ ] `packages/renderer/fonts/ja-kana/bundle.ts` ヘッダに派生物明示（L-4）
- [ ] `rhythm.ts` ヘッダに clean-room 宣言（[NFR-4.3](../requirements.md)）
- [ ] `bun pm ls --prod` の全 dep が MIT/BSD/Apache（[NFR-4.4](../requirements.md)）

### 10-3. セキュリティの観点（#1 主担当）

- [ ] `npm audit --audit-level=high` 0 件（§3-4 P-6）
- [ ] GitHub Dependabot alerts 確認、High/Critical 0 件
- [ ] `package.json` `scripts` に `postinstall` 等の任意コード実行なし（supply chain 対策）
- [ ] `publishConfig.access === "public"`（intended）
- [ ] `.npmignore` or `files` フィールドで `.env` / `*.key` / `secrets.json` 除外
- [ ] tag signature（GPG 署名）は個人開発スコープでは optional、Phase 9+ で検討

### 10-4. README 完成度の観点（#3 主担当）

- [ ] `packages/renderer/README.md` の "Framework Support" 節に日本語対応明記（L-3）
- [ ] 導入コードサンプルに Japanese の use case（`<TegakiRenderer font={kana}>`）
- [ ] CC-BY-SA opt-in 手順（`npm install @tegaki/dataset-cjk-kanjivg`）明示
- [ ] Phase 7 で整備した `guides/japanese.mdx` への anchor link
- [ ] 既知の限界（KanjiVG 未収録字、JIS 第 3/4 水準非対応）への link
- [ ] Japanese Contributors（MOS 評価者の anonymized 言及）

### 10-5. 実装規約観点（全員）

- [ ] Biome 準拠、`bun typecheck && bun run test && bun check` exit 0
- [ ] 本 Phase で新規追加ファイルに Zod v4 import 規則（`import * as z from 'zod/v4'`）遵守
- [ ] commit message が既存 convention（`feat:` / `fix:` / `chore:` / `docs:`）
- [ ] 本 Phase ticket の「決定」セクションが更新され、R-1〜R-4 判定と分岐選択が記録

---

## §11. 一から作り直す場合の設計思想

> Phase 8 の本質は「**Phase 1-7 の成果を外部世界に出す方法**」。Phase 1-7 §11 で確立した「今やる自由度は必要分だけ、契約だけ先に書く」原則を引継ぎつつ、Phase 8 固有の**配信経路という不可逆判断 + OSS ガバナンスという持続性要求 + 日本語 CJK ユーザーへの発見性**の 3 つをどう扱うかを問う。旧版では 4 案構成（A/B/C/D）だったが、本 §11 改訂で以下 3 点の重大欠落を批判的に再審査し補塡する:
>
> 1. **案 D「buy-out」の非現実性** — 「個人メンテナ (`KurtGokhan`) に共同 ownership を交渉で獲得する」という前提は、OSS 文化上 invitation でなく imposition になり礼節を欠く。さらに 30-60 日工数は Phase 8 予算（2 日）の 15-30 倍で、そもそもスコープ外。
> 2. **OSS ガバナンス視点の完全欠落** — Code of Conduct、貢献者ガイド、リリース頻度 SLA、issue triage 体制、bus factor の議論がゼロ。これらは「コードを書いた後の運用」の核心で、本 Phase の「外部流通」定義に不可分。
> 3. **サポート体制の持続性未検討** — issue 返信 SLA、リリース頻度の維持可能性、個人メンテ burnout リスク、co-maintainer 獲得経路の議論がゼロ。これらは 1 年後・3 年後の検算軸として必須。
>
> 本版では 6 案に拡張し、各案を以下の **5 軸** で評価する:
>
> - **軸 1**: Phase 8 の 2 日予算で完走できるか
> - **軸 2**: 上流エコシステム（`KurtGokhan/tegaki`）との連続性を断たないか
> - **軸 3**: 1 年後・3 年後の運用コストが個人メンテ能力で許容範囲か
> - **軸 4**: **OSS ガバナンス持続性**（CoC / CONTRIBUTING / 貢献者 onboarding / bus factor）
> - **軸 5**: **CC-BY-SA 由来の法的リスク管理**（企業法務通過率 / 伝染性制御 / 物理境界）

### 11-1. 設計空間の全体像（6 案）

配信経路を **上流関係 × リリース単位 × ガバナンス主体** の 3 次元に拡張、6 案で設計空間を網羅。

| 案 | 本質 | 上流関係 | リリース形態 | NPM namespace | ガバナンス主体 |
|---|---|---|---|---|---|
| **A** | **現行** — 上流打診 → 分岐（Option U / D / H） | 依存 | 打診次第 | 上流 `tegaki` or 自前 `@ayutaz/tegaki-ja` | 個人 (`@ayutaz`) |
| **B** | **fork を独自ブランド化**（`yose-tegaki` 等） | 明示分離 | 独立運用 | 独自 `yose-tegaki` | 個人 |
| **C** | **plugin エコシステム化**（`@tegaki-community/japanese`） | 無関係 | plugin として plug | community namespace | 個人 + 将来 contributor |
| **D'** | **Soft fork + 上流 mirror PR**（旧 D 置換、現実解） | 並走 | fork 側 release、上流へ継続 PR | 自前 `@ayutaz/tegaki-ja` + 上流 `tegaki` への mirror | 個人（上流調整は pull-based） |
| **E** | **GitHub Organization 化、upstream として維持** | 独立 upstream | organization 管理 | `@tegaki-ja/core` 等 org namespace | **Organization**（複数 maintainer） |
| **F** | **Dual license モデル**: core は CC-BY-SA 非依存、JP set は別 SKU | 上流 core は継承、JP は optional 層 | 2 パッケージ分割 | `tegaki` (core) + `@ayutaz/tegaki-ja-cc` (optional) | 個人 |

> 旧版 **案 D（上流 buy-out）は棄却**。理由:
>
> 1. `KurtGokhan` は 2024-2026 の間に 86 commits を単独プッシュしており、共同運用の兆候を**明示的には**示していない。共同メンテ提案は invitation 待ちでなく imposition になる。
> 2. OSS コミュニティで「buy-out」という語彙は商業的・敵対的ニュアンスが強く、協調の文脈に不適合。仮に実施するなら "co-maintainer invitation" 形に言い換えるべきだが、そもそも相手から発信される性質のもので、こちらから打診する時点で礼節違反のリスク。
> 3. 30-60 日の交渉予算を個人が単独で capacity 確保するのは非現実的（Phase 1-7 の実工数と同等）。
> 4. 法的整理（repo ownership 共有、license 整合、financial flow）で専門家相談必要、個人プロジェクトの scope を超越。
>
> これを現実的な **案 D'（Soft fork + Mirror PR）** に置換し、さらに **案 E（Organization 化）** と **案 F（Dual license 分割）** を追加して設計空間を埋めた。旧案 D の「共同メンテ化」という理念自体は Option U が 1-3 年順調な場合に上流から自然 invitation される形で実現されうる（§11-6 の 3 年後シナリオ参照）。

### 11-2. 定量比較（5 軸 + 副次指標）

> **数値の根拠と信頼度凡例**:
>
> - **（実測）** — 本リポジトリまたは上流 (`KurtGokhan/tegaki`) の観測値
> - **（推定）** — 類似 OSS プロジェクト（`react`, `vue`, `astro` 系の upstream fork 統合事例、`kanjivg`, `stroke-order-diagrams` 等の CJK 系 OSS 運用事例）からの類推
> - **（契約）** — [requirements.md Q-7](../requirements.md) / [NFR-4](../requirements.md) で確定した boolean

| 指標 | A | B | C | D' | E | F |
|---|---|---|---|---|---|---|
| **軸 1: Phase 8 工数** | 2 日（予算） | 3 日 | 4-5 日 | 2.5 日（A + mirror PR setup） | **5-7 日**（org 設立 + CoC + 貢献者ガイド + placeholder repo） | 3 日（dual package split 設計） |
| **軸 2: 上流合流可能性** | ◎（Option U/H で直接合流余地） | × | ○（plugin なら自由） | ◎（mirror で常時可） | △（独立 upstream 志向、合流動機低下） | ◎（core は license 互換で還流容易） |
| **軸 2: エコシステム分断リスク** | 低 | 高 | 低 | **最低**（fork + mirror で並走） | 中（独立 upstream で二重化） | 低 |
| **軸 3: 1 年後の保守コスト** | 中（個人メンテ） | 高（ブランド marketing 追加） | 中（plugin エコ育成） | 中（fork + mirror 同期） | 中（複数 maintainer で分散可だが 1 年では効果薄） | 中（2 パッケージ維持） |
| **軸 3: 3 年後の保守コスト** | 中 | 高 | 中 | 中 | **低**（org による bus factor 2+ が機能） | 中 |
| **軸 4: ガバナンス持続性** | 低（個人 bus factor 1、SLA 未定） | 低 | 中（plugin 公開 API で拘束） | 低 | **最高**（org CoC + 複数 maintainer + SLA rotation） | 低 |
| **軸 4: 貢献者 onboarding コスト** | 中（README のみ） | 中 | 高（plugin API 学習必要） | 中 | **低**（CoC + CONTRIBUTING.md + triage team で明文化） | 中 |
| **軸 4: サポート体制持続性**（issue 返信 SLA / リリース頻度） | 低（単独、返信 SLA 週 1 が上限） | 低 | 中 | 低 | **最高**（maintainer rotation 可能、SLA 日次化可） | 低 |
| **軸 5: CC-BY-SA 分離の物理的容易さ** | ◎（subpackage 隔離済） | ◎ | ○（plugin 境界で自然分離） | ◎ | ◎ | **◎◎**（パッケージ境界で完全物理分離） |
| **軸 5: CC-BY-SA 法的リスク管理** | 中（同梱前提） | 中 | ○（plugin 境界で opt-in） | 中 | 中 | **最高**（opt-in で users が明示選択） |
| **ブランド認知** | 低 | 中（独自名は検索可） | 低 | 中（`-ja` suffix で判別） | 中（org brand で権威付与） | **中**（core は既存 `tegaki` brand 継承） |
| **Japanese ユーザー発見性** | 中（`npm search tegaki` で hit） | 低（独立名は検索外） | 中 | 中 | 中（`tegaki-ja` で直接検索可） | **最高**（`tegaki` install だけで完結） |
| **上流メンテナ負担** | 低（5 PR を自走分割） | 0 | 0 | **最低**（完成品 PR のみ mirror） | 0 | 低（core PR のみ） |
| **プロジェクト死因リスク** | 中（個人 OSS 共通、bus factor 1） | 高（ブランド依存） | 中（plugin ecosystem 依存） | 中（fork 側 archive でも上流残存） | **低**（org で継続性担保） | 中 |
| **初動のリスク** | **最低**（打診失敗でも Option D fallback 0.5 日） | 中（独立路線の戻り道なし） | 中（plugin API 未確立） | 低（A より安全寄り、A に縮退可） | 高（org 設立手続きで失敗時の戻し困難） | 中（split 設計の一度きり判断） |
| **ロールバック容易性** | **最高**（判断を本 Phase 内で変更可） | 低（rebrand 戻しは信頼失墜） | 中 | 高（A に縮退可） | 低（org 解散は信頼失墜） | 中（パッケージ統合は可能だが users 混乱） |
| **YAGNI リスク** | 低 | 中 | **高**（plugin API は需要未検証） | 低 | **高**（1 人で org は過剰） | 中（dual SKU は CC-BY-SA fire 未発生で先出し） |
| **Plamondon 研究コミュニティ接点** | 中（個人 repo、引用困難） | 中 | 中 | 中 | **高**（org brand で研究者 attribution 容易） | 中 |
| **Phase 1-7 §11 との整合** | ◎（「今必要分、契約先に書く」に整合） | ×（Phase 1 判断と矛盾） | △（抽象度上げすぎ） | ◎（A の拡張） | △（規模先出し） | △（SKU 先出し） |

### 11-3. 各案の批判的要点

**案 A（現行、上流打診 → 分岐）** — Phase 8 ticket §3 そのもの、2 日予算完走可、Phase 1-7 §11 の原則に完全整合。

- **利点**: 初動リスク最低（打診不応答・拒否でも Option D で 0.5 日リカバリ可）、上流合流機会を逃さない、CC-BY-SA 分離済で license 安全、Phase 1-7 成果をそのまま活用。
- **弱点**: ガバナンス持続性が個人 bus factor 1 に依存、サポート SLA 未定、issue 返信が週 1 を超えると burnout リスク。
- **失敗モード**: Option H で同期運用が長期化、PR レビューが 3 ヶ月停止、Option D fallback で上流 PR 維持コストもゼロではない。
- **位置付け**: **本 Phase 採用**（ガバナンス・サポート補強は §11-7 の布石で対処）。

**案 B（fork を独自ブランド化、`yose-tegaki` 等）** — 上流完全分離、独自ブランド運用。

- **利点**: 独立運用自由度最高、日本語向け意思決定単独、CC-BY-SA 派生物として立場明快。
- **致命的欠点**: (1) 上流エコシステム分断で長期 diverge → 統合不能、(2) 個人 OSS での独立ブランド維持コストが Phase 1-7 技術実装と同等以上（marketing / SEO / brand 保護）、(3) `npm search tegaki` で hit せず発見性低下、(4) **Phase 1 §11 の「workspace 分離で上流同居」前提と矛盾**、(5) ガバナンス問題は案 A と同等（個人メンテ）で一切改善しない。
- **位置付け**: **永続棄却**。Phase 1 判断と矛盾、ブランド分離は発見性低下で ROI 負、ガバナンス改善ゼロ。

**案 C（plugin エコシステム形成、`@tegaki-community/japanese`）** — 上流 Tegaki に plugin API を提案し、Japanese 対応を plugin として実装、コミュニティ namespace で配布。

- **利点**: 上流メンテナ負担ゼロ、plugin boundary で CC-BY-SA 分離が構造的に自然、将来の他言語（簡体字 / 繁体字 / 韓国語）も同 plugin 枠で追加可能。
- **致命的欠点**: (1) 上流に plugin API **が存在しない** — 本案は上流の plugin API 設計 + 実装 + release が先行必要、Phase 8 の 2 日では不可能（plugin API 設計だけで 5-10 日）、(2) plugin エコ未形成（日本語対応は現時点 1 人の作業）、(3) 貢献者 onboarding コスト増（plugin API 学習負担）、(4) YAGNI（並行案件が日本語対応のみの時点では plugin 化の価値低）。
- **位置付け**: **Phase 9+ 棚上げ**（複数 CJK 言語対応が揃ってから上流に plugin API 提案として自然発生）。本 Phase では `@tegaki-community/` NPM namespace のみ予約。

**案 D'（Soft fork + Mirror PR、旧 D の現実的置換）** — 自前 fork で独立 release しつつ、成果を cherry-pick 相当で上流に継続 PR、上流の merge ペースに依存せず自前 release を先行。

- **利点**: (1) 上流合流機会を温存しつつ release 主権を持つ（buy-out のような交渉不要）、(2) 案 A の部分集合として段階導入可能、(3) 上流 archive / burnout 時も fork 側で生存、(4) mirror PR は上流マージ可否を外部が判定できる透明性担保。
- **弱点**: (1) fork と mirror PR の二重維持でメンテ負担増、(2) mirror PR が長期レビュー停止すると diff 累積で統合困難、(3) ユーザーから「どちらを install すべきか」の混乱、(4) ガバナンス改善は個人依存のまま。
- **位置付け**: **案 A の Option H が長期化した場合の自然な昇格先**。本 Phase では Option H 採用時に自動的に案 D' 運用に移行する形で契約だけ先に書く（`.github/workflows/mirror-upstream-pr.yml` の scaffold コメントのみ配置）。

**案 E（GitHub Organization 化、upstream として維持）** — `tegaki-ja` organization を設立、日本語機能を「組織 OSS」として multi-maintainer 体制で運用。将来的に他 CJK も吸収しうる独立 upstream を育てる。

- **利点**:
  1. **bus factor 2+ 確保**（co-maintainer 加入でプロジェクト継続性担保）
  2. CoC / CONTRIBUTING.md / SECURITY.md / GOVERNANCE.md を org 単位で一度整備すれば全 repo 横断で適用
  3. maintainer rotation で **サポート SLA 日次化可**（単独メンテの週 1 が上限の制約から解放）
  4. 企業採用で「個人 repo でなく org」であることが調達通過率に大きく寄与（多くの企業の OSS 利用ポリシーで「個人名義 repo は例外審査」）
  5. Plamondon / KanjiVG 研究コミュニティとの関係構築で org brand が権威として機能し、学術引用が容易
  6. GitHub の org 機能（teams、protected branches、required reviewers）でガバナンス自動化
- **致命的欠点**:
  1. **1 人で org を設立するのは YAGNI の極み** — 初期 maintainer が単独なら org の形骸化が避けられず、個人 repo と実質変わらない
  2. 設立 + governance 文書整備（CoC / CONTRIBUTING / GOVERNANCE / CODEOWNERS 等）で 5-7 日、Phase 8 予算（2 日）を 2.5-3.5 倍超過
  3. 後から個人 repo → org 移転は GitHub の transfer feature で `git` 履歴保持可能、**org 設立を急ぐ客観的理由がない**
  4. 上流 `tegaki` との position が「独立 upstream」になるため、案 A の上流合流優位性を失う（mutually exclusive）
- **位置付け**: **Phase 10-12 昇格**。発火条件を客観化:
  - 月次ダウンロード数 10k 超過（`npm` stat で計測可能）
  - 外部 contributor が 3 人以上コミットを merge 済
  - 上流 `KurtGokhan/tegaki` が 6 ヶ月以上 inactive
  - いずれか 1 つで発火検討、複数揃えば確定発火
- **本 Phase での布石**: `tegaki-ja` GitHub organization name を**予約**（設立せず name 確保のみ、name squatting 防止ポリシーに従い placeholder repo 1 個を作成して予約意図を README に明記）。

**案 F（Dual license モデル、CC-BY-SA 非依存 core + optional JP set）** — `tegaki` core は MIT/Apache-2.0 互換依存のみで構成、CC-BY-SA 派生データ（KanjiVG 由来）は `@ayutaz/tegaki-ja-cc` として別パッケージで opt-in 配布。

- **利点**:
  1. 企業 users が CC-BY-SA を自発的回避可、法務レビュー通過率が劇的改善（share-alike 伝染性への unfounded fear も物理境界で遮断）
  2. CC-BY-SA 伝染性の技術的グレーゾーンを**パッケージ境界で機械的に**遮断
  3. core は上流 `tegaki` への PR 還流が容易（license 均質で上流マージ判断が簡素）
  4. 研究者 / 学術用途は `-cc` パッケージで明示的 attribution 可能、KanjiVG コミュニティへの敬意を物理形で表明
  5. 商用 / 非商用の判断を users に委譲する構造で、maintainer が license 相談受付の負担軽減
- **致命的欠点**:
  1. 2 パッケージ運用コスト（release 同期、CI 重複、version 整合）が個人メンテで負担増
  2. users が「core + `-cc`」の 2 段インストールを理解する必要、README / migration guide の説明コストが初動で高い
  3. **そもそも CC-BY-SA 同梱による実害が未検証** — 企業 users から「CC-BY-SA で困る」という fire が発生してから分割するのが正しい順序（overengineering 回避）
  4. 分割後の API boundary 設計ミスで将来統合不能になる固定化リスク
- **位置付け**: **Phase 9+ 昇格**。発火条件を客観化:
  - 企業 users から CC-BY-SA 懸念の issue が 3 件以上立つ
  - 法務レビュー拒否事例が 1 件発生（企業法務部から明示拒否）
  - いずれかで発火検討、両方揃えば確定発火
- **本 Phase での布石**: `packages/renderer` の license 欄を「MIT」と明示、CC-BY-SA 由来データは `fonts/` subdirectory に物理隔離済（将来の package split 境界として既に確保）。

### 11-4. OSS ガバナンス視点からの追加考察

> 本節は旧版に完全欠落していた議論。6 案評価で「軸 4: ガバナンス持続性」「貢献者 onboarding コスト」「サポート体制持続性」の 3 副軸を追加した背景と、本 Phase で最小工数で整備すべき 3 要素を以下に整理する。

**ガバナンス 3 要素（CoC / 貢献者ガイド / リリース頻度）の本 Phase での最小整備:**

1. **Code of Conduct**: [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) 日本語公式訳を `CODE_OF_CONDUCT.md` として配置。日本語 OSS での導入事例（`vitejs`, `astro`, `nuxt` 等）に準拠し、連絡先を `security@` メールで受付。本 Phase で 15 分で完了。**目的**: 貢献者への安全宣言 + 企業採用時の最低要件充足。
2. **貢献者ガイド（CONTRIBUTING.md）**: 既存 [AGENTS.md](../../AGENTS.md) の「Conventions」節を contributor 向けに言い換えた `CONTRIBUTING.md` を追加。内容は (1) Bun setup、(2) `bun checks` 必須、(3) PR template 参照、(4) 日本語 issue OK（ただし reviewer 応答は英語優先）、(5) 最小再現手順を issue で必須化、の 5 項目。本 Phase で 30 分。**目的**: 外部貢献者の onboarding 摩擦を最小化。
3. **リリース頻度 SLA（SECURITY.md + README.md）**: 本 Phase では以下を明文化:
   - semver patch リリースは**月 1 回以内**（bug fix が溜まり次第）
   - security critical は**72 時間以内**（CVE 公表からの patch release SLA）
   - minor release は 3-6 ヶ月に 1 回（新 variant / 機能追加時）
   - 維持困難になった場合の `archived` 宣言 path も明示（案 A + Option D の「保守ゼロ耐久」と整合）
- 本 Phase で 15 分。**目的**: users への信頼性コミット + burnout 時の escape hatch 明示。

**サポート体制の持続性（issue 返信 / triage / burnout 対策）:**

- **単独メンテの現実的上限**: 「返信 SLA 週 1 回」が実用上限（Phase 6/7 §11 のコスト見積と整合）。本 Phase で `.github/ISSUE_TEMPLATE/` に「回答まで最大 7 日」を明記した bilingual（日本語 / 英語）template を配置。
- **burnout 防止機構**:
  1. 2 週間無応答の issue は `stale` label 自動付与（GitHub Actions で自動化、本 Phase 範囲外、Phase 9+ の issue triage 作業として §12 に申し送り）
  2. 60 日無応答で auto-close（同上、Phase 9+）
  3. `good first issue` label で外部 contributor 誘導（本 Phase から運用開始可能）
- **返信負荷が許容超えた場合の逃げ道**（3 段階エスカレーション）:
  1. 第 1 段: `good first issue` label で外部 contributor 誘導（追加工数ゼロ）
  2. 第 2 段: 特定 contributor に write 権限付与（GitHub 個人 repo でも collaborator 招待可能、追加工数 5 分 / 人）
  3. 第 3 段: **案 E（org 化）前倒し** — collaborator が 2 人以上の commit 実績を積んだ時点で org 化を提案、bus factor 2+ 確保（追加工数 7 日）

**ガバナンス文書が本 Phase で用意すべき理由**（先延ばしでない根拠）:
- `CODE_OF_CONDUCT.md` は GitHub の community profile で存在確認される、不在だと community health score 低下 → 発見性に間接影響
- 企業の OSS 採用審査で「CoC 有無」は最低チェック項目、不在だと採用見送りの理由になる
- 初回外部 contributor が issue を立てる前に整備しておくのが礼節（後出しは後出しの臭さが残る）
- 工数合計 45 分（CoC 15 分 + CONTRIBUTING 30 分 + SECURITY は既存 template 流用で 5 分）で Phase 8 の 2 日予算に十分収まる

### 11-5. 結論: 私ならこうする（断言）

**Phase 8 では案 A を採用する + ガバナンス文書 3 点を本 Phase で同時整備**。他案は以下の段階昇格で確定、曖昧さを排除:

- **案 B（独自ブランド化）**: **永続棄却**。Phase 1 判断と矛盾、ブランド分離は発見性で ROI 負、ガバナンス改善ゼロ。
- **案 C（plugin エコ形成）**: **Phase 9+ 昇格**。多言語対応（簡体字 / 繁体字 / 韓国語 3 言語が揃う時点）で上流 plugin API 提案として自然発生。本 Phase は `@tegaki-community/` NPM namespace 予約のみ。
- **案 D'（Soft fork + Mirror PR）**: **Option H 採用時に自動昇格**。本 Phase の R-3/R-4 分岐から自然移行する形で契約済、追加判断不要。
- **案 E（Organization 化）**: **Phase 10-12 昇格**（年次 dl 10k 超過 or 外部 contributor 3 人以上 or 上流 6 ヶ月 inactive のいずれかで発火）。本 Phase は `tegaki-ja` org name 予約 + placeholder repo 1 個のみ。
- **案 F（Dual license 分割）**: **Phase 9+ 昇格**（企業 users の CC-BY-SA 懸念 issue 3 件 or 法務拒否 1 件発生時に発火）。本 Phase は license 境界を `fonts/` subdirectory で既に確保済。
- **旧案 D（buy-out）**: **永続棄却**。上流への invitation 待ちが健全、こちらから提案する性質ではない。Option U が 1-3 年順調に運用された結果として上流から自然 invitation される形で実現されうる（それが旧案 D の健全な発火形）。

根拠（断言ベース、7 点）:

1. **案 A は 2 日予算で完走可能な唯一解** — Option U / D / H の 3 分岐それぞれが単独で 2 日内、失敗時 fallback が機械定義済で後戻り可能。
2. **案 B は Phase 1 §11 と矛盾** — workspace 分離 + 上流同居の方針を Phase 8 で反転する合理的理由がない。
3. **案 C は Phase 8 スコープで実装不能** — plugin API の上流設計 5-10 日、Phase 8 の 2 日で完走不可能。
4. **案 D' は案 A の拡張として既に契約済** — Option H 採用時に自動昇格する設計、本 Phase で追加判断不要。
5. **案 E は 1 人で org 設立する YAGNI** — 個人 → org transfer は後からでも可能（GitHub 機能で履歴保持）、org 設立は contributor 実績・downloads 数の客観的発火条件を待つ。
6. **案 F は CC-BY-SA 実害未検証で先出し過剰** — 企業 users からの fire が 1 件発生してから分割するのが正しい順序、物理境界（subdirectory）だけ本 Phase で担保。
7. **R-1〜R-4 分岐で想定外応答を網羅 + ガバナンス文書（CoC / CONTRIBUTING / SECURITY）を本 Phase で最小工数（45 分）整備** — 旧版の盲点（ガバナンス欠落）を補塡、本 Phase の 2 日予算に収まる。

**Phase 1-7 §11 との整合確認**: Phase 1（workspace 分離 + provider interface）→ Phase 2（自作 TS パーサ + provider 実装）→ Phase 3（三項分岐 + `StrokeSource` interface）→ Phase 4（pre-built bundle + variant 命名予約）→ Phase 5（lognormal remap + URL state slider）→ Phase 6/7（MOS 評価 + ドキュメント）の 7 Phase すべてが「案 A（最小実装） + 契約先書き」原則で揃っており、本 Phase の案 A 採用 + 案 D'/E/F の布石 + ガバナンス文書整備はその第 8 段として完全整合。PR #1〜#5 + ガバナンス文書（CoC / CONTRIBUTING / SECURITY）の段階 merge も各独立 merge 可能な単位で切れる。

### 11-6. 1 年後・3 年後の視点（検算）

- **1 年後**: Option U なら上流に 5 PR マージ済、Option D なら `@ayutaz/tegaki-ja` が月 dl 100-1000 規模で認知拡大、いずれも案 A 判断は妥当。外部 contributor 1-2 人コミットがあれば案 E 準備開始判断。CoC / CONTRIBUTING 整備で初回貢献者の onboarding は smooth のはず。
- **3 年後（C / E / F 昇格期）**: Phase 9+ で他 CJK 言語追加時に案 C、月次 dl 10k 超 or contributor 3 人以上で案 E、CC-BY-SA 法務 fire で案 F。Option U が 3 年順調なら **上流 `KurtGokhan` から co-maintainer invitation が自然に発生**（旧案 D の健全な発火形、こちらから提案するのでなく）。
- **3 年後（停滞シナリオ）**: 案 A（Option D）は「動く状態でフリーズ」可能、archive 後も既存 users install 継続動作（NPM tarball は永続）。保守ゼロ耐久力は維持。
- **3 年後（burnout シナリオ）**: 個人メンテが回らない場合、(1) `good first issue` で外部 contributor 誘導 → (2) collaborator 招待 → (3) 案 E 昇格、の 3 段階で対処。CoC / CONTRIBUTING が整備済だと第 1 段の成功率が高まる。

**判断が崩れるシナリオ**（拡張版、発火条件を客観化）:

| シナリオ | 発火条件（客観値） | 対応案 | 追加コスト |
|---|---|---|---|
| 上流メンテナ退任 | `KurtGokhan` が main に 6 ヶ月以上 push なし | 案 E 前倒し（org 化）or 案 D' 継続 | +7 日 / 0 日 |
| CC-BY-SA 法務 fire | 企業法務部からの明示拒否 1 件 or 懸念 issue 3 件以上 | 案 F 昇格（dual package split） | +3 日 |
| 他 CJK 言語同時要望 | 外部 contributor から簡体字 / 繁体字 / 韓国語の PR が 1 ヶ月に 3 件以上 | 案 C 前倒し（plugin API 提案） | +15-20 日 |
| 上流が別の日本語 PR マージ | 他開発者先行マージ | 案 A Option D に撤退、同居運用継続 | +2 日 |
| 個人メンテ burnout | 返信 SLA 2 週間超の停止が 1 ヶ月継続 | 段階エスカレーション（collaborator → org 化） | +0〜10 日 |
| 外部 contributor 3 人以上 | 3 人以上が merge 済 commit を持つ | 案 E 正規昇格 | +7 日 |
| 月次 dl 10k 超過 | `npm` stat で 3 ヶ月連続 10k 超 | 案 E 準備開始 + co-maintainer 募集 | +7 日（準備） |
| 上流 archive / deprecated 宣言 | `KurtGokhan/tegaki` repo archived | 案 D' 自動昇格 → 案 E 検討 | +0 日 / +7 日 |

### 11-7. 本 Phase で打っておく将来拡張の布石

- **案 C 布石**: `@tegaki-community/` NPM namespace を**予約**（owner 確保のみ、publish せず）、Phase 9+ 多言語対応時に正式活用
- **案 D' 布石**: `.github/workflows/mirror-upstream-pr.yml` の scaffold コメントのみ配置（実装は Option H 発火時）
- **案 E 布石**: `tegaki-ja` GitHub organization name を**予約**（設立はせず name 確保のみ、GitHub の name squatting 防止ポリシー遵守のため README に予約意図を明記した placeholder repo 1 個は作成）
- **案 F 布石**: `packages/renderer` の `license` 欄を「MIT」と明示、CC-BY-SA 由来データは `fonts/` subdirectory に物理隔離（将来の package split 境界として既に機能）
- **旧案 D の健全化布石**: Discussion 打診文面（§3-1）で長期協調可能性を示唆、`KurtGokhan` との関係構築を本 Phase から開始（invitation 待ちの健全形）
- **ガバナンス文書 3 点（新規、本 §11-4 で追加）**:
  - `CODE_OF_CONDUCT.md`（Contributor Covenant 2.1 日本語公式訳、15 分）
  - `CONTRIBUTING.md`（Bun setup + `bun checks` 必須 + 日本語 issue OK、30 分）
  - `SECURITY.md`（72 時間 SLA、`security@` 連絡先、CVE 報告プロセス、5 分）
  - **合計 50 分**、本 Phase 2 日予算に十分収まる
- **Issue template 2 種（新規）**: `.github/ISSUE_TEMPLATE/bug_report.yml` と `feature_request.yml` を日本語 / 英語バイリンガルで追加。返信 SLA「最大 7 日」明記、最小再現手順必須化。工数 20 分。
- **リリース自動化**: `.github/workflows/release-smoke.yml`（§7-1）を本 Phase で整備、Phase 9+ 言語追加時再利用
- **Dependabot alerts**: GitHub Dependabot 有効化で transitive dep CVE に自動対応、High/Critical alert を 72 時間 SLA と連動
- **`stale` bot 申し送り**: 2 週間無応答 issue の自動 label 化は Phase 9+ の issue triage 作業として §12 に申し送り

### 11-8. テスト戦略への反映

- **§7-1 CI smoke test**: tag push trigger、Phase 9+ 言語追加時も同構造で再利用可能
- **§8-1 e2e**: sandbox install → React 動作確認は Phase 9+ 他言語対応時も同 pattern（評価字変更のみ）
- **§8-2 CC-BY-SA 隔離 e2e**: license 構造の backstop、将来 license 変更を本テストで検知、**案 F 昇格時はこの e2e が package split の正当性検証として直接転用可能**
- **§8-3 両取り e2e**: Option H 採用時のみ有効、Option D 単独なら skip、案 D' 昇格時に mirror PR CI として拡張可能
- **§8-4（新）ガバナンス文書 presence test**: `CODE_OF_CONDUCT.md` / `CONTRIBUTING.md` / `SECURITY.md` の存在を CI で assert、削除事故を防止。テスト実装 5 分、CI での実行 1 秒以内。

### 11-9. Phase 1-7 §11 との相互検算

全 8 Phase 通じての共通原則は「**今回増やす自由度は必要分だけ、将来の自由度は interface 契約 + 物理境界だけ先に書く**」。本 Phase でも:

- **今やる**: 案 A（上流打診 → R-1〜R-4 の 4 カテゴリ事前確定）+ ガバナンス文書 3 点（CoC / CONTRIBUTING / SECURITY）+ issue template 2 種
- **契約 + 物理境界だけ先に書く**:
  - `@tegaki-community/` namespace 予約（案 C）
  - `tegaki-ja` GitHub org name 予約（案 E）
  - `fonts/` subdirectory で CC-BY-SA 隔離（案 F の package split 境界を既に確保）
  - Discussion 文面での協調示唆（旧案 D の健全化発火形）
  - `.github/workflows/mirror-upstream-pr.yml` scaffold コメント（案 D' の契約）
- **将来実装**:
  - Phase 9+ 他言語対応 + plugin API（案 C）
  - Phase 10-12 org 正規昇格（案 E）
  - Phase 9+ 法務 fire 発生時の dual split（案 F）
  - Option U の長期信頼構築後の自然 invitation（旧案 D の健全発火）
  - Option H 長期化時の案 D' 自動昇格
- **永続棄却**: 案 B（ブランド分離、Phase 1 判断と矛盾）、旧案 D（buy-out、invitation でなく imposition になるため不採用）

**案 A + ガバナンス布石は「今最小コスト、将来 C/D'/E/F 昇格最小コスト、B + 旧 D 永続棄却明示」の Pareto 最適**。旧版の 4 案構成に比べ、(1) OSS ガバナンス軸を追加（軸 4）、(2) 非現実的な「buy-out」を排除、(3) 組織化（案 E）・dual license（案 F）という 2 つの実務的進化路を明示、(4) 発火条件を客観化（dl 数 / contributor 数 / 法務 fire 件数 / 上流 inactive 期間）で意思決定の恣意性を排除、(5) サポート burnout 対策を 3 段階エスカレーションで具体化。1 年後・3 年後の自分が本 §11 で検算可能、旧版の「なぜその案を選んだか」を再説明する必要がないレベルで判断の根拠が明示されている。

---

## §12. 後続タスクへの申し送り

### 12-1. プロジェクト完了後の運用（Phase 9 以降、Issue Triage）

Phase 8 完了は「日本語対応」プロジェクトの実装完了点だが、Tegaki 全体の運用は継続する。本節では運用フェーズへの申し送り。

| 項目 | 値 / 場所 | 備考 |
|---|---|---|
| **Issue triage 頻度** | 月 1 回（毎月第 1 月曜を目安） | 個人 OSS 保守の持続可能性を優先 |
| **`good first issue` ラベル運用** | 日本語ドキュメント訂正 / KanjiVG 未収録字報告 / フォント variant 要望をラベル化 | 外部 contributor を誘導 |
| **stale issue auto-close** | 60 日 inactive で auto-close（Phase 9+ で GitHub Actions 導入検討） | 個人メンテ負荷軽減 |
| **KanjiVG SHA 更新判断** | 6 ヶ月に 1 回、KanjiVG 上流の riliace を check | データ更新は minor bump、snapshot 差分が発生する場合は major bump 検討 |
| **依存脆弱性 patch release** | High/Critical 発見時 24 時間以内 | §9-F 対策 |
| **MOS 評価の再取得** | 2 年に 1 回、N=5 評価者で自然さの経年変化 check | σ/μ パラメタ chronic drift 検知 |
| **ユーザーからのバグ報告** | GitHub Issues で受付、再現手順必須 | issue template で reproduction 必須化（既存 template 活用） |

### 12-2. リリース頻度の目安

| タイプ | 頻度 | 内容 |
|---|---|---|
| **Patch release（0.14.x）** | 随時（bug fix 1 件以上溜まったら） | 脆弱性 patch、bug fix、typo 訂正 |
| **Minor release（0.15.0, 0.16.0, ...）** | 3-6 ヶ月に 1 回 | 新フォント variant、新機能、performance 改善 |
| **Major release（1.0.0）** | Phase 6 MOS > 4.5 達成 + 商用案件発生 で発火 | 破壊的変更 + LTS 表明、本 Phase では封印 |
| **LTS サポート** | Major release の過去 1 世代（例: 1.0.x / 0.14.x）を patch release 対応 | バグ報告受付期限は 1 年 |

### 12-3. 次の言語対応への申し送り

Phase 8 完了後、他 CJK 言語対応を段階的に追加可能。[japanese-support.md §7](../japanese-support.md) / [japanese-roadmap.md Q-4](../japanese-roadmap.md) で「**対象外**（Phase 9+ で AnimCJK 等で将来対応可）」と位置付けられていた。本節では Phase 9+ の概算。

| 言語 | 推定 Phase | データソース | 工数見込み | 備考 |
|---|---|---|---|---|
| **簡体字**（Simplified Chinese） | Phase 9（3-6 ヶ月後） | [AnimCJK](https://github.com/parsimonhi/animCJK) `svgsZh`（MIT license 推定、要確認） or KanjiVG 兼用 | ~15 日 | KanjiVG は簡体字も一部含む、要選定 |
| **繁体字**（Traditional Chinese） | Phase 10（6-9 ヶ月後） | AnimCJK `svgsZh-hant` or [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) | ~15 日 | 簡体字との差分小、実装コスト軽減 |
| **韓国語**（ハングル） | Phase 11（9-12 ヶ月後） | AnimCJK `svgsKo` | ~20 日 | ハングル字素（자소）合成ルールの理解必要、Phase 1-8 の pipeline に適合するか要検証 |
| **モンゴル文字**（Mongolian Bichig） | Phase 12+ | 独自収集 or Unicode 8.0+ のフォント解析 | ~30 日以上 | 縦書き必須、Tegaki の縦書き対応（現状未実装）とセット |

**共通の実装戦略**（Phase 9+ 各言語で再利用可能）:

1. **Phase 1-2 パターン踏襲**: 各言語のデータセットパッケージを CC-BY-SA 相当 license で隔離（`@tegaki/dataset-cjk-<lang>`）
2. **Phase 3 パターン踏襲**: `isCJK(char)` に言語分岐を追加、`datasetSkeleton()` を language-aware に
3. **Phase 4 パターン踏襲**: 各言語の pre-built bundle（`tegaki/fonts/<lang>-*`）
4. **Phase 5 Sigma-Lognormal**: 言語中立、各言語の endpointType 分類だけ追加
5. **Phase 6 MOS 評価**: 各言語の native speaker で N=3-5 評価者を確保
6. **Phase 7 ドキュメント**: `guides/<lang>.mdx` を追加、本 Phase 7 テンプレート再利用
7. **Phase 8 リリース判断**: 本 Phase ticket を template として再利用、R-1〜R-4 分岐構造を維持

Phase 8 の判断（案 A 採用）が、将来の言語拡張でも**同じ判断フレーム**で判断できることが Phase 1-8 §11 の共通原則の延長。

### 12-4. Phase 8 公開後の長期保守上の注意事項

- **CC-BY-SA 解釈のグレーゾーン**: 法的疑義提起あれば [japanese-support.md](../japanese-support.md) + ATTRIBUTION で説明可能、完全排除はできないため企業法務相談の余地を残す（§9-B）
- **σ/μ チューニング結果の`constants.ts` 変更**: Phase 6 で収束した値を本 Phase の `v0.14.0` で固定化、将来の MOS 再評価で変更する場合は patch release（σ/μ は visual output に影響するため minor bump 検討）
- **KanjiVG 上流 update への追従**: KanjiVG の誤り字訂正 release があれば、本 Phase 時点の SHA を bump して新 release、`@tegaki/dataset-cjk-kanjivg` の patch 扱い
- **上流 PR が merged された場合**: Option U で全 PR マージ完了時、`@ayutaz/tegaki-ja` を deprecated 化、README で上流 `tegaki` への移行を案内（§3-4 同期戦略 Day Y）
- **co-maintainer 募集**: 個人 OSS の bus factor 1 リスク軽減のため、Phase 9+ の言語追加で共著者が出た時点で「co-maintainer 招聘」検討

### 12-5. プロジェクト完了ステータス更新

本 Phase 完了時に [docs/tickets/README.md](./README.md) の以下を更新:

```markdown
| 8 | リリース判断 | [phase-8-release.md](./phase-8-release.md) | ✅ 完了 | Phase 7 |
```

全 8 Phase が ✅ 完了となった時点で、「Tegaki Japanese Support」プロジェクト完了を本 README の上部に明記:

```markdown
---

## プロジェクトステータス

**完了 (2026-XX-XX)**: Tegaki Japanese Support v0.14.0 リリース済。詳細は [CHANGELOG.md](../../CHANGELOG.md) の [0.14.0] セクション参照。

運用継続中: 月次 issue triage、patch release 随時、Phase 9+ の言語拡張は未定。
```

### 12-6. Phase 8 → 運用フェーズの検証チェーン

Phase 8 完了は**プロジェクト完了点**だが、以下は運用フェーズで初めて観測可能:

- **実ユーザー採用数**（月間 download、GitHub star、Zenn 記事への反映）
- **バグ報告の実頻度**（issue 流入数、重大 bug の発生頻度）
- **CC-BY-SA 疑義の実発生**（企業法務相談件数、license 質問の issue 数）
- **上流合流の最終結果**（Option U/H の PR マージ率、Option D の deprecated タイミング）
- **他言語対応の実需要**（Phase 9+ の優先順位、AnimCJK 統合需要の観測）

運用フェーズの観測結果は 6 ヶ月後・1 年後・3 年後に **Phase 8 §11 の判断検算**に使用する。本 Phase 時点で「案 A を採用」と断言した根拠が妥当だったか、将来の自分が事後検証可能な形で記録を残す。

---

### 関連チケット

- [Phase 1: データセットパッケージ雛形](./phase-1-dataset-package.md)
- [Phase 2: KanjiVG ローダー](./phase-2-kanjivg-loader.md)
- [Phase 3: パイプライン統合](./phase-3-pipeline-integration.md)
- [Phase 4: 仮名バンドル](./phase-4-kana-bundle.md)
- [Phase 5: Sigma-Lognormal リズム合成](./phase-5-rhythm-synthesis.md)
- [Phase 6: 検証・チューニング](./phase-6-validation.md)
- [Phase 7: ドキュメント・サンプル](./phase-7-docs-samples.md)（**本 Phase の直接の前段**）
