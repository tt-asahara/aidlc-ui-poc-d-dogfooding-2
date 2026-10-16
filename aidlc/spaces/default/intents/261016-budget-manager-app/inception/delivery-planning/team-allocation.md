# 担当の割り当て

Bolt とは、作業の一部を設計から実装・テストまで1回通し、ブラウザで動くものができたところで区切る単位です（計画は `bolt-plan.md`）。

## 体制

- チーム編成の工程は省略しました（1人で依頼する進め方）。担当チームは1つです。
- すべての Bolt は、この会話の中で AI（開発担当 aidlc-developer-agent を中心に、工程ごとの担当）が進めます（Q7）。
- 各工程の承認と、各 Bolt の完了の確認は、依頼者が行います。
- 複数のチームで同時に進めないため、チームをまたぐ計画表（Program Board）は作りません。

## Bolt と担当

| Bolt | Unit | 担当 | 承認する人 |
|------|------|------|------------|
| B1 | U1 u1-walking-skeleton | AI（この会話） | 依頼者（walking skeleton の確認を含む） |
| B2 | U5 u5-storage-resilience | AI（この会話） | 依頼者 |
| B3 | U2 u2-entry-and-ledger | AI（この会話） | 依頼者 |
| B4 | U3 u3-budget | AI（この会話） | 依頼者 |
| B5 | U4 u4-csv-import | AI（この会話） | 依頼者 |
| B6 | U6 u6-accessibility | AI（この会話） | 依頼者 |

## 工程ごとの担当（各 Bolt 共通）

| 工程 | 主な担当 |
|------|----------|
| 機能設計 | アーキテクト（aidlc-architect-agent） |
| NFR 要件・NFR 設計 | アーキテクト（品質・セキュリティの観点を含む） |
| インフラ設計 | AWS 基盤担当（aidlc-aws-platform-agent）。配置先を持たないので、手元で動かすための構成の確認にとどまる |
| コード生成 | 開発担当（aidlc-developer-agent） |
| ビルドとテスト | 品質担当（aidlc-quality-agent） |

## 並行作業について

Bolt は1つずつ順に進めます（Q4）。そのため、担当ごとのブランチと worktree は使いません。あとで並行に切り替える場合は、team-practices.md の決まりに従います。

- `feat/budget-manager-app` から担当ブランチと worktree を作る。
- 作業を `feat/budget-manager-app` へ戻す。
- 統合したあとに、テストを再実行する。
