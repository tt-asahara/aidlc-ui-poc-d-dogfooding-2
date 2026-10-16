# 監視の設計 — U5 保存の異常・別タブ対応・サンプル

U1 の監視の設計（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/monitoring-design.md`）をそのまま使います。外部へは送りません。U5 で足す確かめたい値は、テストで確かめて Unit の確認のときに報告します。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| 別のタブの変更から集計の更新までの時間 | Playwright（Chromium、2ページ、3回の中央値） | 1 秒以内 | NFR1.1（U5） |
| 初回のサンプル表示までの時間 | Playwright（Chromium） | 1 秒以内 | NFR1.2（U5） |
| 3,000 件の保存データの検査の時間 | Vitest | 100 ミリ秒以内 | NFR1.3（U5） |
| 3,000 件の保存データの大きさ | Vitest | 1 MB 未満 | NFR1.4（U5） |
| 全体のお知らせ枠の3つの状態の axe の重大な違反 | Playwright と axe | 0 件 | NFR2.2（U5） |
| 2ページの操作の間の外部への通信 | Playwright の通信の記録 | 0 件 | NFR3.2（U5） |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| GitHub Actions の失敗 | U1 のまま | 高 | GitHub の通知と作業の報告 |
| 手元のテストの失敗 | 確認コマンドが失敗 | 高（その Unit の完了を止める） | 作業の報告 |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| 別のタブの変更のあとの画面の更新時間 | 1 秒以内 | 各 Unit の確認のとき |
| 壊れた保存データを書き換えた件数 | 0 件 | 各 Unit の確認のとき |

## Logs & Tracing

| 項目 | 設計 |
|------|------|
| アプリの記録 | 保存データが読めない理由（項目の名前と位置だけ。値は含めない）と、保存領域へのアクセスの失敗を console.warn に出す |
| 記録の集約・追跡 | 置かない |
| ダッシュボード | 置かない。各 Unit の確認の報告に、上の Metrics の値をまとめる |
