# NFR 設計（U2 登録の検証と明細一覧）— 質問

U2 の NFR 要件（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-requirements/`）の目標を、どう実現するかを決めます。共通の設計は、U1・U5 の NFR 設計をそのまま使います。

NFR 要件のレビューで持ち越した軽微な3点は、次のとおり設計の中で決めます。依頼者に判断していただく点はないため、質問はありません。

## Consolidated Summary Confirmation

- 共通の設計: U1・U5 の NFR 設計（CSP、Error Boundary、時間の判定は Chromium だけ、保存の手順、保存データの検査）をそのまま使う
- 規則の共有: 日付の実在の判定と、見える1文字の数え方を `app/src/domain` の1か所（例: `textRules.ts`）にまとめ、Ledger.validate・validateSnapshot・登録フォームのメモ欄から使う。Intl.Segmenter は1つだけ作って使い回す
- 二重送信の防止の確かめ方（レビュー R-03）: 300 ミリ秒の境目（299 ミリ秒では捨て、300 ミリ秒をすぎたら受け付ける）は、時計を進める単体テストで確かめる。Playwright では、素早い2回のクリックで明細が1件だけ増え、成功の知らせが残ることだけを確かめる
- 大きな貼り付けの反応時間（レビュー R-02）: 1 万文字のメモを貼り付けても、切り詰めと表示の更新が 1 秒以内に終わる（Chromium で計測）。見える1文字の数え方は、100 文字目に達したら数えるのをやめる
- 日本語入力の手での確認（レビュー R-01）: 手順を決め、U2 の確認のときに依頼者に試していただき、結果を U2 のコードのまとめに記録する。手順は、日本語入力で変換中に 100 文字を超えて入力し、確定で 100 文字に切り詰められ、変換中の文字が壊れないことを確かめる
- 一覧の表示: 1か月約 100 件をそのまま表に出す（ページ分けなし）。行の key は entryId

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
