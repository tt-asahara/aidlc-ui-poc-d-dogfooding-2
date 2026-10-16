# 監視の設計 — U2 登録の検証と明細一覧

U1 の監視の設計をそのまま使います。外部へは送りません。U2 で足す確かめたい値は、テストと手での確認で確かめて、Unit の確認のときに報告します。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| 登録から一覧の更新までの時間 | Playwright（Chromium、3回の中央値） | 1 秒以内 | NFR1.1（U2） |
| 月の切り替えから一覧の更新までの時間 | Playwright（Chromium） | 1 秒以内 | NFR1.2（U2） |
| 素早い2回のクリックで増える明細の数 | Playwright と Vitest（時計を進める） | 1 件 | NFR1.3（U2） |
| 1 万文字の貼り付けから切り詰めまでの時間 | Playwright（Chromium） | 1 秒以内 | NFR 設計の大きな貼り付け |
| 4つの状態の axe の重大な違反 | Playwright と axe | 0 件 | NFR2.2（U2） |
| 日本語入力の手での確認 | 依頼者の確認 | 変換中に壊れず、確定で 100 文字 | NFR6.2（U2） |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| GitHub Actions の失敗 | U1 のまま | 高 | GitHub の通知と作業の報告 |
| 手元のテストの失敗 | 確認コマンドが失敗 | 高（その Unit の完了を止める） | 作業の報告 |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| 登録・月の切り替えのあとの一覧の更新時間 | 1 秒以内 | 各 Unit の確認のとき |
| 二重送信で増えた余分な明細 | 0 件 | 各 Unit の確認のとき |

## Logs & Tracing

U1 のまま（予想外の失敗だけをコンソールに出す。利用者の入力した文字は出さない）。日本語入力の手での確認の結果は、U2 のコードのまとめ（code-summary.md）に記録します。
