# 業務の規則 — U3 月別予算と予算比較

入力:

- Unit の定義 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`（U3）
- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（FR4.3〜FR4.5、FR5、FR9.2）
- ストーリー `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`（US3.2、US4.1、US4.2、US7.3 の AC7.3.2 の予算の部分）
- 約束ごと `aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md`（C1、C2、C4、C5、C6）
- 詳細モックアップ `inception/refined-mockups/interaction-spec.md`（月次集計の表と予算入力）
- このステージの回答 `functional-design-questions.md`（Q1・Q2、まとめの確認済み）

規則の番号は、この Unit の中の番号です。

```yaml
rules:
  - id: BR1.1
    statement: 予算は月ごと・支出カテゴリごとに、0〜9,999,999 の整数で設定する。空欄は未設定を意味する
    category: validation
    applies_to: Budget.saveMonth
    trigger: 「予算を保存」を押したとき
    logic: 各欄の値の前後の空白を除く。IF 空 THEN 未設定（その月のそのカテゴリの予算を持たない）。IF 半角数字だけでない、または 0 未満、または 9,999,999 を超える THEN VALIDATION（field budget:<カテゴリ名>）
    violation: その欄の下に「予算は 0〜9,999,999 の整数で入力してください」。入力は残す
    source: [FR5.2]
  - id: BR1.2
    statement: 「予算を保存」は、その月の8つの欄をまとめて検証し、1つでも誤りがあれば何も保存しない。保存はその月の予算だけを置き換え、ほかの月は変えない
    category: constraint
    applies_to: Budget.saveMonth、DataStore.commit（budgetsToReplace）
    trigger: 「予算を保存」を押したとき
    logic: IF 誤りが1つ以上 THEN 保存しない。ELSE commit({ budgetsToReplace: { month, budgets } }) を1回だけ呼ぶ。budgetKey は「月:カテゴリ名」
    violation: 誤りのある欄の下に理由。予算の区切りのお知らせ枠に「予算を確かめてください: 食費、娯楽」のように誤りのある欄のカテゴリ名をまとめて出し、最初の誤りの欄へ操作位置を移す
    source: [FR5.1, FR5.2]
  - id: BR1.3
    statement: 予算は支出カテゴリにだけ設定する。収入カテゴリは予算比較の表に出さない
    category: constraint
    applies_to: ReviewView の予算の表、Budget
    trigger: 表示するとき、保存するとき
    logic: 表の行は CategoryCatalog の支出カテゴリ8つ（固定の順）。収入カテゴリの予算は受け付けない
    violation: 該当なし
    source: [FR4.3]
  - id: BR2.1
    statement: 予算のあるカテゴリは、予算・実績・残額（予算 − 実績）を表示する
    category: calculation
    applies_to: MonthlySummary（予算の差し込み口を Budget.getMonth にする）、ReviewView
    trigger: 表示するとき、保存の知らせを受けたとき
    logic: 残額 = 予算 − 実績。金額は ¥ と3桁区切り
    violation: 該当なし
    source: [FR4.3]
  - id: BR2.2
    statement: 実績が予算を超えたカテゴリは、残額の欄に「超過 ¥N」を文字と色で表示する
    category: policy
    applies_to: ReviewView
    trigger: 表示するとき
    logic: IF 実績 > 予算 THEN 残額の欄に「超過 ¥(実績 − 予算)」と、超過の色の見た目。実績 = 予算なら残額 ¥0 で超過ではない
    violation: 該当なし
    source: [FR4.4, NFR2]
  - id: BR2.3
    statement: 予算が未設定のカテゴリは、予算欄を空（プレースホルダー「未設定」）、残額を「—」とし、超過として扱わない
    category: policy
    applies_to: ReviewView
    trigger: 表示するとき
    logic: IF 予算なし THEN 予算欄は空でプレースホルダー「未設定」、残額は「—」、超過なし
    violation: 該当なし
    source: [FR4.5]
  - id: BR3.1
    statement: 「前の月の予算をコピー」は、表示中の月の1か月前の予算を、表示中の月へ写す
    category: calculation
    applies_to: Budget.previewCopy、Budget.copyFromPrevious
    trigger: 「前の月の予算をコピー」を押したとき
    logic: 前の月 = 表示中の月の1か月前（1月の前は前の年の12月）。表示中の月は AppShell から受け取る
    violation: 該当なし
    source: [FR5.3]
  - id: BR3.2
    statement: 前の月に予算が1つもないときは、理由を表示して何もしない
    category: validation
    applies_to: Budget.previewCopy、ReviewView
    trigger: 「前の月の予算をコピー」を押したとき
    logic: IF 前の月の予算が0件 THEN NOT_FOUND
    violation: 予算の区切りのお知らせ枠に「前の月の予算がありません」。データは変わらない
    source: [FR5.4]
  - id: BR3.3
    statement: 表示中の月にすでに予算が1つ以上あるときは、上書きしてよいかを確認する。確認の枠は「上書きする」「やめる」を持ち、Escape でも閉じる
    category: policy
    applies_to: ReviewView
    trigger: 「前の月の予算をコピー」を押し、前の月に予算があるとき
    logic: IF 表示中の月に保存済みの予算がある、または未保存の入力がある（BR4.3 の dirty） THEN ボタンの下に確認の枠「10月の予算を前の月の内容で上書きします」を出し、最初の選択肢へ操作位置を移す。未保存の入力があるときは「保存していない予算の入力は失われます」を枠に添える。「やめる」か Escape（操作位置が確認の枠の中にあるとき）なら何も変えず、操作位置をコピーのボタンへ戻す。ELSE すぐ写す
    violation: 該当なし
    source: [FR5.3]
  - id: BR3.4
    statement: 上書きでは、表示中の月の予算を、前の月の内容でまるごと置き換える。前の月で未設定のカテゴリは、表示中の月でも未設定になる
    category: calculation
    applies_to: Budget.copyFromPrevious
    trigger: 「上書きする」を押したとき、または表示中の月に予算がなくすぐ写すとき
    logic: commit({ budgetsToReplace: { month: 表示中の月, budgets: 前の月の予算の写し（month と budgetKey を表示中の月に付け替える） } }) を1回だけ呼ぶ
    violation: 該当なし
    source: [FR5.3]
  - id: BR4.1
    statement: 予算欄に入力したまま保存せずに月を切り替えたら、確認せずに入力を捨て、切り替えた月の予算を表示する。予算欄の上に、保存するまで保存されないことを書いておく
    category: policy
    applies_to: ReviewView
    trigger: 月を切り替えたとき
    logic: 入力中の値を捨て、新しい月の保存済みの予算で欄を作り直す。予算欄の上に「「予算を保存」を押すまで、予算は保存されません」を常に表示する
    violation: 該当なし
    source: [FR5.1]
  - id: BR4.2
    statement: 別のタブで変更があったら、開いている確認の枠を閉じて知らせる。予算欄は最新の予算で作り直す
    category: policy
    applies_to: ReviewView
    trigger: externalChange を受け取ったとき
    logic: 自分の保存・コピーの STALE_REVISION の結果として届いた externalChange（BR4.3 の「1回だけ無視する」印があるもの）は、この規則の対象外（BR5.1 が扱う）。それ以外の externalChange で、IF 確認の枠が開いている THEN 閉じ、予算の区切りのお知らせ枠に「別のタブで変更があったため、確認を取り消しました。もう一度操作してください」。ELSE IF 未保存の入力がある THEN 予算の区切りのお知らせ枠に「別のタブで変更があったため、保存していない予算の入力を最新の内容に置き換えました」。予算欄は、表示中の月の最新の予算で作り直す
    violation: 該当なし
    source: [FR9.1]
  - id: BR4.3
    statement: 予算欄の入力値は、決まったきっかけでだけ保存済みの予算で作り直す。ほかの部品の保存（明細の登録など）では作り直さず、未保存の入力を保つ
    category: policy
    applies_to: BudgetTable
    trigger: 表示月の変更、自分の予算の保存・コピーの成功、自分の操作の結果でない externalChange
    logic: 作り直すきっかけは次の3つだけ。(1) 表示月が変わった（BR4.1）。(2) 自分の予算の保存またはコピーが成功した。(3) 自分の保存・コピーの STALE_REVISION の結果でない externalChange を受け取った（BR4.2）。committed（明細の登録など、ほかの部品の保存）では作り直さない。未保存の入力の有無（dirty）は、欄の値と保存済みの予算を比べて決める。自分の保存・コピーが STALE_REVISION を返したら「次の lastExternalChangeAt の変化を1回だけ無視する」印を立て、その変化では作り直さずに印を下ろす（AppShell を通して知らせが描画のあとに届くため）
    violation: 該当なし
    source: [FR5.1, FR9.1]
  - id: BR5.1
    statement: 予算の保存とコピーの保存に失敗したら、予算の区切りのお知らせ枠に失敗と再試行の方法を出し、成功の表示はしない。入力は残す
    category: policy
    applies_to: ReviewView
    trigger: commit が STORAGE_WRITE または STALE_REVISION を返したとき
    logic: 予算の保存の失敗では、STORAGE_WRITE は「このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「予算を保存」を押してください」。STALE_REVISION は「別のタブで変更があったため保存できませんでした。入力内容は画面に残っています。もう一度「予算を保存」を押してください」。コピーの失敗では、STORAGE_WRITE は「このブラウザに保存できませんでした。予算は変わっていません。空き容量を確かめてから、もう一度「前の月の予算をコピー」を押してください」、STALE_REVISION は「別のタブで変更があったため写せませんでした。予算は変わっていません。もう一度「前の月の予算をコピー」を押してください」。どれも role="alert"。STALE_REVISION のとき DataStore は最新を読み込んで externalChange を出すが、自分の処理中に届くため、欄は作り直さず入力を残す（BR4.3）。予算の区切りには、この失敗の知らせだけを出す（BR4.2 の取り消しの知らせは出さない）。コピーの失敗では確認の枠を閉じ、操作位置をコピーのボタンへ移す。commit が STORE_UNREADABLE を返したら、storeStatus が unreadable になり、BR5.2 の表示に変わる
    violation: 該当なし
    source: [FR9.2]
  - id: BR5.2
    statement: 保存データが読めないときは、予算欄、「予算を保存」、「前の月の予算をコピー」を操作できない状態にし、理由を出す
    category: policy
    applies_to: ReviewView
    trigger: storeStatus が unreadable のとき
    logic: U1 の集計の停止と同じく、予算の表の代わりに理由を出す（U1 の「保存データを読み込めないため、集計を表示できません」の表示の中に含める）
    violation: 該当なし
    source: [FR9.3]
  - id: BR5.3
    statement: 予算の保存に成功したら、予算の区切りのお知らせ枠に「10月の予算を保存しました」を出す。コピーに成功したら「前の月の予算を10月に写しました」を出す
    category: policy
    applies_to: ReviewView
    trigger: 保存またはコピーの成功のとき
    logic: role="status" で出す。誤りの表示は消す
    violation: 該当なし
    source: [FR5.1, FR5.3]
```

## 規則の一覧

| ID | 内容 | 種類 | 出典 |
|----|------|------|------|
| BR1.1 | 予算は 0〜9,999,999 の整数、空欄は未設定 | validation | FR5.2 |
| BR1.2 | 1か月分をまとめて検証し、その月だけを置き換えて保存 | constraint | FR5.1, FR5.2 |
| BR1.3 | 予算は支出カテゴリだけ | constraint | FR4.3 |
| BR2.1 | 予算・実績・残額 | calculation | FR4.3 |
| BR2.2 | 超過は文字と色 | policy | FR4.4, NFR2 |
| BR2.3 | 未設定は「未設定」と「—」、超過なし | policy | FR4.5 |
| BR3.1 | コピーは表示中の月の1か月前から | calculation | FR5.3 |
| BR3.2 | 前の月に予算がなければ知らせて何もしない | validation | FR5.4 |
| BR3.3 | 表示中の月に予算があれば上書きの確認 | policy | FR5.3 |
| BR3.4 | 上書きはまるごと置き換え | calculation | FR5.3 |
| BR4.1 | 未保存の入力は月の切り替えで捨てる | policy | FR5.1 |
| BR4.2 | 別のタブの変更で確認の枠を閉じ、未保存の入力の置き換えを知らせる | policy | FR9.1 |
| BR4.3 | 欄の作り直しは決まったきっかけだけ（ほかの部品の保存では作り直さない） | policy | FR5.1, FR9.1 |
| BR5.1 | 保存の失敗の表示 | policy | FR9.2 |
| BR5.2 | 読めないときは予算の操作を止める | policy | FR9.3 |
| BR5.3 | 保存とコピーの成功の知らせ | policy | FR5.1, FR5.3 |
