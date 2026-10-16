# インフラ設計（U2 登録の検証と明細一覧）— 質問

U2 で増えるのは、画面と規則の部品だけです。配る先、起動の方法、ポート、保存領域、自動の確認の流れは、U1 のインフラ設計（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/`）で決めたものをそのまま使います。

U2 で新しく決める必要のある点はありません。そのため、質問はありません。

## Consolidated Summary Confirmation

- 配る先・起動・ポート・保存領域: U1 のまま（`http://127.0.0.1:4173/`、テストは 4174、localStorage の1つのキー）
- 自動の確認の流れ: U1 の GitHub Actions と、承認済みの確認コマンド（`npm --prefix app run verify`）をそのまま使う。U2 のブラウザ操作のテストは `app/tests/e2e/u2-entry-and-ledger/` に置き、同じコマンドで動く
- 手での確認: 日本語入力の確認は、U2 の確認のときに依頼者の手で行い、結果を記録する（U2 の NFR 設計）
- 監視: U1 のまま（外部へ送らない）

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
