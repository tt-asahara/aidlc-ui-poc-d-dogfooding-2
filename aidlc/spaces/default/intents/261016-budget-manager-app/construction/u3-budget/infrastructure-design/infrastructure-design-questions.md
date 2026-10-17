# インフラ設計（U3 月別予算と予算比較）— 質問

U3 で増えるのは、予算の部品と画面だけです。配る先、起動の方法、ポート、保存領域、自動の確認の流れは、U1 のインフラ設計（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/`）で決めたものをそのまま使います。

U3 で新しく決める必要のある点はありません。そのため、質問はありません。

## Consolidated Summary Confirmation

- 配る先・起動・ポート・保存領域: U1 のまま（`http://127.0.0.1:4173/`、テストは 4174、localStorage の1つのキー。予算も同じ保存データに入る）
- 自動の確認の流れ: U1 の GitHub Actions と、承認済みの確認コマンド（`npm --prefix app run verify`）をそのまま使う。U3 のブラウザ操作のテストは `app/tests/e2e/u3-budget/` に置き、同じコマンドで動く
- 監視: U1 のまま（外部へ送らない）。予算の保存とコピーの時間、5つの状態の axe を、U3 の確認のときに報告する

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
