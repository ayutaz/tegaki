# チケット一覧

[japanese-roadmap.md](../japanese-roadmap.md) の 8 マイルストーン（Phase 1–8）をチケットに落とし込んだもの。各チケットはマイルストーンと相互にリンクされており、依存関係と進捗を追跡できる。

| 関連ドキュメント | 役割 |
|---|---|
| [japanese-support.md](../japanese-support.md) | 設計方針 |
| [japanese-roadmap.md](../japanese-roadmap.md) | 実装ロードマップ（マイルストーン定義元） |
| [technical-validation.md](../technical-validation.md) | 技術検証 |
| [requirements.md](../requirements.md) | 要件定義 |

---

## マイルストーン × チケット一覧

| Phase | マイルストーン | チケット | ステータス | 依存 |
|---|---|---|---|---|
| 1 | データセットパッケージ雛形 | [phase-1-dataset-package.md](./phase-1-dataset-package.md) | 👀 レビュー中 | — |
| 2 | KanjiVG ローダー | [phase-2-kanjivg-loader.md](./phase-2-kanjivg-loader.md) | 👀 レビュー中 | Phase 1 |
| 3 | パイプライン統合 | [phase-3-pipeline-integration.md](./phase-3-pipeline-integration.md) | 👀 レビュー中 | Phase 2 |
| 4 | 仮名バンドル | [phase-4-kana-bundle.md](./phase-4-kana-bundle.md) | 👀 レビュー中 | Phase 3 |
| 5 | Sigma-Lognormal リズム | [phase-5-rhythm-synthesis.md](./phase-5-rhythm-synthesis.md) | 👀 レビュー中 | Phase 3 |
| 6 | 検証・チューニング | [phase-6-validation.md](./phase-6-validation.md) | 👀 レビュー中 | Phase 5 |
| 7 | ドキュメント・サンプル | [phase-7-docs-samples.md](./phase-7-docs-samples.md) | 👀 レビュー中 | Phase 6 |
| 8 | リリース判断 | [phase-8-release.md](./phase-8-release.md) | 📝 未着手 | Phase 7 |

### ステータス凡例

- 📝 未着手
- 🚧 実装中
- 👀 レビュー中
- ✅ 完了
- ❌ ブロック中

---

## 依存グラフ

```
Phase 1 → Phase 2 → Phase 3 ──┬─→ Phase 4
                              │
                              └─→ Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Phase 3 完了時点で**第一次リリース候補**（筆順は正しい状態）。Phase 5 完了で**リズムの自然さが付加された第二次リリース候補**。

---

## チケットテンプレート

各チケットは以下の 11 セクションで構成:

1. **メタ情報** — Phase、依存、関連ドキュメント、想定期間
2. **目的とゴール** — 何を解決するか、成功状態の定義
3. **実装内容の詳細** — 変更ファイル、コード差分、設計
4. **エージェントチーム構成** — 役割と人数、各担当の成果物
5. **提供範囲（Deliverables）** — このチケットで納品するもの一覧
6. **テスト項目** — 受入基準を満たすためのテストケース
7. **Unit テスト** — 個別関数・モジュール単位
8. **e2e テスト** — パイプライン通しの動作確認
9. **懸念事項とリスク** — 既知の問題と対策
10. **レビュー項目** — PR レビュー時のチェックリスト
11. **一から作り直す場合の設計思想** — 経験を前提にゼロから設計するとしたら
12. **後続タスクへの申し送り** — 次のフェーズに伝えるべき情報

---

## 進捗の更新ルール

- 各チケットが状態遷移したら本 README の「ステータス」列を更新
- PR マージ時にステータスを ✅ に
- 新たな懸念が発覚したらチケットの §9 に追記して本 README の対象行に注記
