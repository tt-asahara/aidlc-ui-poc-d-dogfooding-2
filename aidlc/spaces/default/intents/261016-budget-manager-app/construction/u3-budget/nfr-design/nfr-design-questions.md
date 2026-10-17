# NFR 設計（U3 月別予算と予算比較）— 質問

U3 の NFR 要件（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/nfr-requirements/`）の目標を、どう実現するかを決めます。共通の設計は、U1・U5・U2 の NFR 設計をそのまま使います。

機能設計のレビュー（R-06・R-07）と NFR 要件のレビュー（R-01・R-02）で持ち越した軽微な点は、次のとおり設計の中で決めます。依頼者に判断していただく点はないため、質問はありません。

## Consolidated Summary Confirmation

- 共通の設計: U1・U5・U2 の NFR 設計をそのまま使う
- 別のタブの変更の伝え方（機能設計レビュー R-06・R-07）: AppShell は externalChange ごとに1ずつ増える番号（externalChangeSeq）を AppState に持ち、ReviewView を通して BudgetTable に渡す。BudgetTable の「1回だけ無視する」印は、時刻ではなくこの番号の変化で下ろす。時計を固定したテストや同じミリ秒の知らせでも、確実に1回ずつ扱える
- テストの基準（NFR 要件レビュー R-01）: 次の3つを単体テストで確かめる。
  - 自分の保存の STALE_REVISION の直後の知らせでは入力が残り、その次の本物の別タブの変更では欄が作り直される（番号を進めて確かめる）
  - 明細の登録など、ほかの部品の保存（committed）では、未保存の予算の入力が残る
  - 月の切り替えでは入力を捨てる
- 読めない状態（NFR 要件レビュー R-02）: storeStatus が unreadable のとき、予算欄・「予算を保存」・「前の月の予算をコピー」が表示されず、Budget の commit が呼ばれないことを単体テストで確かめる
- 予算の保存の範囲: Budget は budgetsToReplace の1回の commit で、その月の予算だけを置き換える。保存後の保存データが U5 の validateSnapshot を通ることを単体テストで確かめる

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
