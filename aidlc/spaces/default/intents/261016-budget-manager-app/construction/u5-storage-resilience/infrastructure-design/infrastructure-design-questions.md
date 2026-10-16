# インフラ設計（U5 保存の異常・別タブ対応・サンプル）— 質問

U5 で増えるのは、ブラウザの中の仕組み（タブ間の知らせ、保存データの検査、サンプル投入）だけです。配る先、起動の方法、ポート、自動の確認の流れは、U1 のインフラ設計（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/`）で決めたものをそのまま使います。

U5 で新しく決める必要のある点はありません。そのため、質問はありません。

## Consolidated Summary Confirmation

- 配る先・起動・ポート: U1 のまま（`npm run build` と `npm run serve` で `http://127.0.0.1:4173/`。テストは 4174）
- 自動の確認の流れ: U1 の GitHub Actions と、承認済みの確認コマンド（`npm --prefix app run verify`）をそのまま使う。U5 のテストは同じコマンドで動く
- 保存領域: U1 と同じ localStorage の1つのキー。容量の目安（3,000 件で約 400 KB）と、ブラウザの上限（約 5 MB）を上限とみなすことを記録する
- 別のタブの変更の確かめ方: Playwright で同じブラウザの中に2つのページを開く。テスト用の配信（4174）の中で動くので、依頼者の保存データ（4173）には触れない
- 監視: U1 のまま（外部へ送らない）

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
