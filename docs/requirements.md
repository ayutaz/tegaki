# 日本語対応 要件定義

Tegaki に日本語（漢字・ひらがな・カタカナ）対応を追加する実装の正式要件。設計メモ [japanese-support.md](./japanese-support.md) と技術検証 [technical-validation.md](./technical-validation.md) を前提とする。

| 項目 | 値 |
|---|---|
| プロジェクト名 | Tegaki Japanese Support |
| バージョン | 0.1（要件定義初版） |
| 対象リポジトリ | `ayutaz/tegaki` (fork of `KurtGokhan/tegaki`) |
| 作成日 | 2026-04-19 |
| 対象リリース | 未定（Phase 3 完了時に第一次リリース判定） |

---

## 1. 背景とゴール

### 1-1. 背景

Tegaki は任意のフォントから手書きアニメーションを生成する OSS。現行パイプラインはラテン筆記体（Caveat 等）を前提とした形状ヒューリスティックで筆順を推定しており、CJK（漢字・仮名）では以下が発生する:

- 交差する縦横画が 1 本に融合される（例: 「十」「木」「田」）
- 筆順がラテン前提（左→右）で日本基準と不一致
- 止め/はね/払い が再現されない
- 等速描画で機械的な見た目

### 1-2. ゴール

**日本人が見て違和感のない手書きアニメーション**を実現する。

具体的には以下 4 条件を満たす:

1. 常用漢字・仮名の筆順が日本 MEXT 基準と一致する
2. 各画の書き終わり（止め/はね/払い）が視覚的に区別できる
3. 速度プロファイルが等速ではなく、自然な非対称鐘型になる
4. 既存のラテン文字出力に影響を与えない

---

## 2. 機能要件

### FR-1. 日本文字の自動検出

システムは処理対象文字が日本語範囲（U+3040–309F, U+30A0–30FF, U+4E00–9FFF）に属するかを判定し、適切なパイプラインに分岐する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-1.1 | ひらがな・カタカナ・漢字 Unicode 範囲の文字を自動検出 | MUST |
| FR-1.2 | CJK 互換漢字（U+F900–FAFF）は第一次リリースで対象外（フォールバック） | SHOULD |
| FR-1.3 | 検出結果はログ出力（`--verbose` 時）に反映 | MAY |

### FR-2. KanjiVG データセット統合

[KanjiVG](https://kanjivg.tagaini.net/) (CC-BY-SA 3.0) の MEXT 準拠ストロークデータを使用して筆順を決定する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-2.1 | `<path>` 要素の**出現順**を筆順として採用（`id="kvg:...-sN"` の N と一致） | MUST |
| FR-2.2 | `kvg:type` 属性から終端種別 (tome/hane/harai/dot/default) を分類 | MUST |
| FR-2.3 | 仮名は `kvg:type` が付与されないため `default` フォールバック | MUST |
| FR-2.4 | スラッシュ記法 `㇔/㇀` は前者採用 | MUST |
| FR-2.5 | バリアントファイル（`*-Kaisho.svg` 等）は第一次リリースで非採用 | SHOULD |
| FR-2.6 | KanjiVG データは**固定 git SHA**で pin | MUST |
| FR-2.7 | CC-BY-SA 3.0 ライセンスを `@tegaki/dataset-cjk-kanjivg` パッケージに隔離 | MUST |
| FR-2.8 | Attribution を README と生成物（glyphData.json のコメント等）に明記 | MUST |

### FR-3. 座標系変換

KanjiVG の 109×109 正規化空間からフォントの `unitsPerEm` 座標系に正しく変換する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-3.1 | KanjiVG 座標 `(kvgX, kvgY)` → フォント座標への線形変換 | MUST |
| FR-3.2 | y 軸反転（SVG y-down → opentype y-up） | MUST |
| FR-3.3 | フォントの `advanceWidth` に合わせたスケーリング | MUST |
| FR-3.4 | 変換後の座標が opentype グリフの bbox と ±10% 以内で一致 | SHOULD |

### FR-4. 線幅の実測

KanjiVG は線幅情報を持たないため、実際のフォントグリフから線幅を取得する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-4.1 | opentype グリフをラスタライズして inverseDT を計算（既存 `computeInverseDistanceTransform()` 再利用） | MUST |
| FR-4.2 | KanjiVG ポイントを bitmap 座標へ投影して `getStrokeWidth()` で線幅取得 | MUST |
| FR-4.3 | 明朝/ゴシック/手書き風のフォントごとに視覚的に差が出る | SHOULD |

### FR-5. Sigma-Lognormal リズム合成

等速描画を廃止し、Plamondon の運動学的モデルで自然な速度プロファイルを合成する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-5.1 | ストローク内の `t` を lognormal CDF で非線形マッピング | MUST |
| FR-5.2 | 画の長さ・曲率・終端種別から σ/μ を算出 | MUST |
| FR-5.3 | 終端種別ごとに異なる速度プロファイル（tome/hane/harai/dot）| MUST |
| FR-5.4 | 画間ポーズを lognormal 分布から可変サンプリング | SHOULD |
| FR-5.5 | `--rhythm constant` / `--rhythm lognormal` フラグで切替可能 | MUST |
| FR-5.6 | GPL コードを参照・複製しない（論文数式のみ使用） | MUST |

### FR-6. 仮名バンドルの事前配布

ひらがな・カタカナを `tegaki/fonts/ja-kana` として pre-built bundle 同梱する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-6.1 | 全 179 字（ひらがな 89 + カタカナ 90）を収録 | MUST |
| FR-6.2 | 既存の `tegaki/fonts/caveat` 等と同じ export パターン | MUST |
| FR-6.3 | バンドルサイズ 300 KB 以下（gzip 前） | SHOULD |
| FR-6.4 | `import kana from 'tegaki/fonts/ja-kana'` が動作 | MUST |

### FR-7. フォールバック

データセット未収録字の処理を定義する。

| ID | 要件 | 優先度 |
|---|---|---|
| FR-7.1 | KanjiVG 未収録字は既存ヒューリスティックパイプラインで処理 | MUST |
| FR-7.2 | フォールバック発生時は警告ログ出力 | SHOULD |
| FR-7.3 | `--strict` フラグでフォールバックを禁止しエラー終了 | MAY |

### FR-8. CLI フラグ

| ID | フラグ | 動作 | 優先度 |
|---|---|---|---|
| FR-8.1 | `--dataset kanjivg` | KanjiVG を参照して CJK 処理 | MUST |
| FR-8.2 | `--rhythm {constant\|lognormal}` | 速度プロファイル選択 | MUST |
| FR-8.3 | `--strict` | フォールバック禁止 | MAY |

---

## 3. 非機能要件

### NFR-1. 性能

| ID | 要件 | 目標値 |
|---|---|---|
| NFR-1.1 | 生成速度（CJK 50 字） | M1 Mac で 3 秒以内 |
| NFR-1.2 | 生成速度の性能退行 | ラテン 50 字の現行比 +5% 以内 |
| NFR-1.3 | 仮名バンドル読込時間 | 100ms 以内（ローカル） |
| NFR-1.4 | rhythm 合成のオーバーヘッド | 従来比 +20% 以内 |

### NFR-2. 互換性

| ID | 要件 |
|---|---|
| NFR-2.1 | ラテン文字（Caveat, Italianno, Tangerine, Parisienne）の出力に影響なし |
| NFR-2.2 | 既存 pre-built bundle（4 フォント）は再生成不要 |
| NFR-2.3 | `TegakiBundle` 型の破壊的変更は避ける（新フィールドは optional） |
| NFR-2.4 | `BUNDLE_VERSION` を増やす場合、`COMPATIBLE_BUNDLE_VERSIONS` に既存版を含めて両互換 |

### NFR-3. 保守性

| ID | 要件 |
|---|---|
| NFR-3.1 | 新規コードは Biome のフォーマット・lint ルールに準拠 |
| NFR-3.2 | `bun typecheck && bun run test && bun check` が全通する |
| NFR-3.3 | 既存コードスタイル準拠（`.ts` 拡張子、Zod v4 import 規則等） |
| NFR-3.4 | 新規ファイルに単体テスト必須（`*.test.ts`、主要代表字でストローク数・順序の回帰検証） |

### NFR-4. ライセンス

| ID | 要件 |
|---|---|
| NFR-4.1 | Tegaki 本体パッケージ（`tegaki`, `tegaki-generator`, `@tegaki/website`）は **MIT を維持** |
| NFR-4.2 | KanjiVG 由来データは `@tegaki/dataset-cjk-kanjivg` パッケージに隔離し **CC-BY-SA 3.0** |
| NFR-4.3 | Sigma-Lognormal 実装は論文数式のクリーンルーム実装、GPL コード非参照 |
| NFR-4.4 | 新規 npm 依存は MIT/BSD/Apache のいずれかに限定（`@xmldom/xmldom` = MIT は OK）|

### NFR-5. 配布サイズ

| ID | 要件 |
|---|---|
| NFR-5.1 | `tegaki/fonts/ja-kana`（仮名バンドル）≤ 300 KB |
| NFR-5.2 | `@tegaki/dataset-cjk-kanjivg`（漢字データ）≤ 5 MB（常用 + 人名用） |
| NFR-5.3 | 本体 `tegaki` パッケージのサイズ増は ≤ 5 KB（rhythm.ts 相当） |

### NFR-6. 文字カバレッジ

| 範囲 | カバー率目標 | 備考 |
|---|---|---|
| 常用漢字 2,136 字 | **100%** | KanjiVG 公式明言「Japanese standards 準拠」 |
| 人名用漢字 863 字 | **95% 以上** | 一部未収録あり、フォールバック可 |
| JIS 第 1 水準 2,965 字 | **99% 以上** | ほぼ全カバー |
| JIS 第 2 水準 3,390 字 | **80% 以上** | 部分収録、フォールバック前提 |
| JIS 第 3/4 水準 | 非対応 | フォールバック |
| ひらがな | **100%**（89 字） | 濁音・半濁音・小書き含む |
| カタカナ | **100%**（90 字） | 濁音・半濁音・小書き含む |

---

## 4. 受入基準（Acceptance Criteria）

### AC-1. Phase 3 完了基準（第一次リリース可能点）

- [ ] `bun start generate --family "Noto Sans JP" --chars 右左田必 --dataset kanjivg` が成功
- [ ] 生成 bundle で「右」が日本筆順 (ノ→一→口) で描画される（目視）
- [ ] 常用 20 字サンプルで筆順誤りが 0 件
- [ ] ラテン処理（Caveat 50 字）の出力がコミット前後で完全一致（snapshot 差分ゼロ）
- [ ] `bun checks` 全通過
- [ ] `packages/dataset-cjk-kanjivg` の ATTRIBUTION.md に CC-BY-SA 3.0 表記

### AC-2. Phase 5 完了基準

- [ ] `--rhythm lognormal` で生成した CJK 20 字の目視確認で、tome/hane/harai の速度差が視認可能
- [ ] 速度プロファイルの歪度が理論値 0.78 ± 0.15（σ=0.25 基準）
- [ ] `--rhythm constant` で Phase 3 と同一出力（後方互換）
- [ ] ベンチマーク: CJK 50 字生成が Phase 3 比 +20% 以内の時間

### AC-3. Phase 6 完了基準（メンテナ自己評価）

外部パネル評価は前提としない。メンテナが [validation-urls.md](./validation-urls.md) の 20 字を自分で見て、以下を満たせば完了とみなす:

- [ ] 評価用 20 字セットで明らかな異常（画抜け・逆方向・筆順誤り）が 0 件
- [ ] 視認上「機械的すぎる」と感じない（リズムが付与されて見える）
- [ ] 気になった字は [fix-overrides.json](../packages/dataset-cjk-kanjivg/fix-overrides.json) または σ/μ 調整で対応済み、未対応分は [japanese-support.md](./japanese-support.md) の既知の限界節に追記

数値化したい場合のメトリクス（[rhythm-metrics.ts](../packages/renderer/src/lib/rhythm-metrics.ts) にある `velocitySNR` / `empiricalSkewness` / `ksDistance` / `summariseMOS`）は任意。合否ラインは固定せず、メンテナの納得感で判断する。

### AC-4. Phase 7 完了基準

- [ ] Starlight ドキュメントに `guides/japanese.mdx` が追加
- [ ] README に日本語サポートの明記
- [ ] `examples/` に日本語手書きデモ（最低 React + Astro）
- [ ] `bun dev` で `/tegaki/generator/?m=text&t=ありがとう&f=Noto+Sans+JP` が動作

---

## 5. 対象外 (Out of Scope)

第一次リリースでは以下を**対象外**とする。将来の拡張候補として記録。

| 項目 | 理由 |
|---|---|
| 縦書き (vertical-rl) | writingMode 対応はレンダラ側の大規模変更が必要 |
| 簡体字・繁体字・韓国語 | AnimCJK 統合は別プロジェクト扱い |
| JIS 第 3/4 水準漢字 | KanjiVG 未収録、需要低 |
| くずし字 | KMNIST は静止画のみ、用途不明 |
| 手書き認識（入力） | Tegaki は生成側で、認識は対象外 |
| インク再生（圧力付きタブレット入力の再現） | データセットライセンスで配布不可 |
| 部首ハイライト | `kvg:element` 属性を活用可能だが UX 設計が必要 |
| リアルタイム生成（ブラウザ内パイプライン） | website の in-browser generator で検討中 |

---

## 6. 前提条件と依存

### 6-1. 前提条件

- KanjiVG の CC-BY-SA 3.0 ライセンス条項を許容できる（share-alike は `@tegaki/dataset-cjk-kanjivg` パッケージに局所化）
- ユーザーが opt-in で CJK 対応データセットを追加インストールする（`bun add @tegaki/dataset-cjk-kanjivg`）
- 評価フェーズで日本人評価者 3–5 名が確保できる

### 6-2. 外部依存

| 依存 | バージョン | ライセンス | 用途 |
|---|---|---|---|
| KanjiVG | `r20250816` 固定 | CC-BY-SA 3.0 | ストロークデータ |
| @xmldom/xmldom | ^0.9 | MIT | Bun/Node での SVG パース |
| opentype.js | 既存依存 | MIT | フォント処理（変更なし） |

### 6-3. 内部依存

- Phase 3 は Phase 1-2 完了後
- Phase 4, 5 は Phase 3 完了後（並列可）
- Phase 6 は Phase 5 完了後
- Phase 7-8 は Phase 6 完了後

---

## 7. リスク一覧

| ID | リスク | 影響 | 対策 |
|---|---|---|---|
| R-1 | KanjiVG の既知誤り字（娩・庫・炭）が常用に含まれる | 筆順が誤る | Phase 6 で目視検証、誤りは `fix-overrides.json` で上書き |
| R-2 | KanjiVG リリース更新で座標が変わる | スナップショットテスト破綻 | git SHA 固定で pin |
| R-3 | σ/μ のデフォルト値が日本字に合わない | リズム不自然 | メンテナ自己評価で気になれば `constants.ts` を再調整 |
| R-4 | Zod schema 変更の破壊的影響 | 既存 CLI 利用者に影響 | `dataset` フィールドを `.optional()` に |
| R-5 | CC-BY-SA 解釈のグレーゾーン | 法的懸念 | パッケージ分離 + ユーザー opt-in で明確化 |
| R-6 | 視覚回帰テスト基盤が未整備 | 退行検出が困難 | Phase 6 で Playwright 導入（+2-3 日） |
| R-7 | `BUNDLE_VERSION` increment で既存バンドル無効化 | 互換性破壊 | rhythm を runtime 計算に寄せて bundle 無変更 |

---

## 8. 未解決事項（判断待ち）

| ID | 判断事項 | デフォルト方針 | 決定者 |
|---|---|---|---|
| Q-1 | KanjiVG の同梱方式（submodule vs fixed tarball） | 固定 tarball + セットアップスクリプト | 実装担当 |
| Q-2 | 常用外の字で未収録時の挙動 | 現行ヒューリスティックにフォールバック、警告ログ | 実装担当 |
| Q-3 | 縦書き対応 | **対象外**（Phase 7 以降の将来拡張） | プロダクトオーナー |
| Q-4 | 他 CJK 言語（簡体字・繁体字・韓国語） | **対象外**（AnimCJK で将来対応可） | プロダクトオーナー |
| Q-5 | Sigma-Lognormal パラメタチューニング UI | `PreviewApp` に slider で debug 露出 | 実装担当 |
| Q-6 | リズム合成の offline pre-compute vs runtime | **runtime 計算**（bundle 無変更で既存バンドル互換維持） | 実装担当 |
| Q-7 | 上流への PR 提案 or 自前リリース | GitHub Discussion で打診してから決定 | プロダクトオーナー |

---

## 9. 成功指標 (KPI)

| 指標 | 目標値 | 計測方法 |
|---|---|---|
| 常用漢字筆順正確性 | 99%+ | メンテナが 20 字目視サンプルで 0 件誤り |
| 自己評価の自然さ | メンテナが「違和感なし」と判断 | [validation-urls.md](./validation-urls.md) を自分で見て確認 |
| 既存ラテン出力への影響 | 完全後方互換 | snapshot 差分ゼロ |
| バンドルサイズ増 | 仮名単体 ≤ 300 KB | `npm pack --dry-run` |
| 生成速度 | CJK 50 字 ≤ 3 秒 | M1 Mac ベンチマーク |
| カバレッジ | 常用 100% / 人名用 95%+ | `kvg-index.json` 照合 |

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|---|---|---|---|
| 0.1 | 2026-04-19 | 初版作成（technical-validation.md の結果を反映） | AI assistant |
| 0.2 | 2026-04-19 | AC-3 と KPI をメンテナ自己評価に修正（外部パネル評価の前提を除去） | AI assistant |

関連ドキュメント:
- [japanese-support.md](./japanese-support.md) — 設計方針
- [japanese-roadmap.md](./japanese-roadmap.md) — 実装ロードマップ
- [technical-validation.md](./technical-validation.md) — 技術検証レポート
