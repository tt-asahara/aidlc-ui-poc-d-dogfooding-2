# 監視の設計 — U3 月別予算と予算比較

U1 の監視の設計をそのまま使います。外部へは送りません。U3 で足す確かめたい値は、テストで確かめて、Unit の確認のときに報告します。

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| 予算の保存から表の更新までの時間 | Playwright（Chromium、3回の中央値） | 1 秒以内 | NFR1.1（U3） |
| コピーから表の更新までの時間 | Playwright（Chromium） | 1 秒以内 | NFR1.2（U3） |
| 5つの状態の axe の重大な違反 | Playwright と axe | 0 件 | NFR2.3（U3） |
| 予算の保存で変わった明細・ほかの月の予算 | Vitest | 0 件 | NFR5.1（U3） |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| GitHub Actions の失敗 | U1 のまま | 高 | GitHub の通知と作業の報告 |
| 手元のテストの失敗 | 確認コマンドが失敗 | 高（その Unit の完了を止める） | 作業の報告 |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| 予算の保存・コピーのあとの表の更新時間 | 1 秒以内 | 各 Unit の確認のとき |
| 保存の失敗で失われた予算の入力 | 0 件 | 各 Unit の確認のとき |

## Logs & Tracing

U1 のまま（予想外の失敗だけをコンソールに出す。利用者の入力した値は出さない）。
