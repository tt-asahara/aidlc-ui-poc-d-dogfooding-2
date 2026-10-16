# 監視の設計 — U1 薄い版

このアプリは外部へ送信しません（NFR3）。そのため、動いている間の値を集める仕組み、通知の仕組み、記録を集める仕組みは置きません（NFR 設計の security-design.md「監視について」）。確かめたい性質は、テストで確かめて、各 Unit の確認のときに報告します。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| 登録から集計の更新までの時間 | Playwright（Chromium、3,000 件、3回の中央値） | 1 秒以内 | NFR1.1 |
| 月の切り替えから集計の更新までの時間 | Playwright（Chromium） | 1 秒以内 | NFR1.2 |
| 起動から操作できるまでの時間 | Playwright（Chromium） | 1 秒以内 | NFR1.3 |
| CSV の組み立ての時間 | Vitest | 1 秒以内 | NFR1.4 |
| 集計の計算の時間 | Vitest | 100 ミリ秒以内 | NFR1.5 |
| 行カバレッジ | Vitest のカバレッジ計測 | 80% 以上 | NFR7.2 |
| 外部への通信の件数 | Playwright の通信の記録 | 0 件 | NFR3.3 |
| axe の重大な違反 | Playwright と axe | 0 件 | NFR2.2 |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| GitHub Actions の失敗 | 作業ブランチへの push か Pull Request で、整形・リンター・型の検査・単体テスト・ビルドのどれかが失敗 | 高（main への取り込みを止める） | GitHub の通知（依頼者のアカウント）と、作業の報告 |
| 手元のテストの失敗 | 確認コマンドか Playwright が失敗 | 高（その Unit の完了を止める） | 作業の報告（失敗の内容をそのまま示す） |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| 登録・月の切り替えのあとの画面の更新時間 | 1 秒以内 | 各 Unit の確認のとき（テストの実行ごと） |
| 外部への通信 | 0 件 | 各 Unit の確認のとき |
| 保存に失敗したときに入力が残る割合 | 100%（テストの全件） | 各 Unit の確認のとき |

1人が手元で使うアプリのため、稼働率の目標は置きません。

## Logs & Tracing

| 項目 | 設計 |
|------|------|
| アプリの記録 | 予想外の失敗だけを、ブラウザのコンソール（console.error）に出す。利用者が入力した文字は含めない（security-design.md） |
| 記録の集約・追跡 | 置かない（外部へ送らない） |
| テストの記録 | Playwright の結果（`app/test-results/`、`app/playwright-report/`）は手元に残し、コミットしない（`.gitignore`） |
| ダッシュボード | 置かない。各 Unit の確認の報告に、上の Metrics の値をまとめる |
