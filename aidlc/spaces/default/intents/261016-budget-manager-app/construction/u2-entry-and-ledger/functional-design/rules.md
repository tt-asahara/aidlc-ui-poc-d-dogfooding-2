# 業務の規則 — U2 登録の検証と明細一覧

入力:

- Unit の定義 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`（U2）
- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（FR1、FR2）とストーリーの「要件との差分」
- ストーリー `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`（US1.1 の AC1.1.4〜AC1.1.6、US1.2、US1.3、US2.1）
- 約束ごと `aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md`（C1、C3）
- 詳細モックアップ `inception/refined-mockups/interaction-spec.md`（登録フォーム、明細の一覧）
- このステージの回答 `functional-design-questions.md`（Q1・Q2、まとめの確認済み）

規則の番号は、この Unit の中の番号です。

```yaml
rules:
  - id: BR1.1
    statement: 金額は、前後の空白を除いたあと、半角数字だけからなる 1〜9,999,999 の整数でなければ登録しない
    category: validation
    applies_to: Ledger.validate（画面と CSV の取り込みの両方が使う）
    trigger: 「登録する」を押したとき
    logic: IF 空、または半角数字以外を含む（全角数字・カンマ・小数点・符号・英字）、または 1 未満、または 9,999,999 を超える THEN VALIDATION（field amount）
    violation: 金額欄の下に「金額は 1〜9,999,999 の整数で入力してください。例: 1280」（空のときも同じ文。U1 の「金額を入力してください」はこの文にそろえる）。入力は残す
    source: [FR1.2]
  - id: BR1.2
    statement: 日付は空欄でなく、YYYY-MM-DD の形で、実在する日付でなければ登録しない。範囲の制限はない
    category: validation
    applies_to: Ledger.validate
    trigger: 「登録する」を押したとき
    logic: IF 空 THEN VALIDATION「日付を入力してください」。IF 形が違う、または実在しない日付（2026-02-30 など） THEN VALIDATION「存在する日付を入力してください。例: 2026-10-14」。実在の判定は、U5 の保存データの検査（validateSnapshot の isRealDate）と同じ関数を共有の場所（app/src/domain の下）に置いて両方から使う
    violation: 日付欄の下に理由。入力は残す
    source: [FR1.3]
  - id: BR1.3
    statement: 区分は収入か支出のどちらか、カテゴリは選んだ区分に合う固定のカテゴリでなければ登録しない
    category: validation
    applies_to: Ledger.validate
    trigger: 「登録する」を押したとき
    logic: IF 区分が空 THEN VALIDATION「区分を選んでください」。IF カテゴリが空 THEN VALIDATION「カテゴリを選んでください」。IF カテゴリが区分に合わない THEN VALIDATION「カテゴリを選び直してください」
    violation: その欄の下に理由。入力は残す
    source: [FR1.4, FR3.1]
  - id: BR1.4
    statement: メモは任意。前後の空白を除いたあと、見える1文字を1文字として 100 文字まで。改行は使えない
    category: validation
    applies_to: Ledger.validate と、登録フォームのメモ欄
    trigger: 入力するとき、「登録する」を押したとき
    logic: 入力欄は1行の input（type=text）のまま、maxLength は使わない。入力のたびに、前後の空白を除いた値を見える1文字で数え（検証と同じ数え方）、100 文字を超えたら先頭から 100 文字（見える1文字）に切り詰めて、欄の下に「メモは 100 文字までです」を出す。日本語の変換中（composition の間）は切り詰めず、変換の確定（compositionend）で同じ判定をする。貼り付け（paste）の文字に改行（CR または LF）が含まれていたら、貼り付けを取り消して、欄の下に「メモに改行は使えません」を出す。Enter は登録の操作。Ledger.validate も同じ数え方で、100 文字を超えるか改行を含めば VALIDATION（field memo）。数える関数は U5 の保存データの検査と共有する
    violation: メモ欄の下に「メモは 100 文字までです」、または「メモに改行は使えません」
    source: [FR1.5]
  - id: BR1.5
    statement: 誤りがあるときは、登録フォームのお知らせ枠にまとめを出し、欄の下にそれぞれの直し方を出す。操作位置は最初の誤りの欄へ移す
    category: policy
    applies_to: EntryFormView
    trigger: Ledger.add が VALIDATION を返したとき
    logic: まとめ =「入力を確かめてください: 」に続けて誤りのある欄の名前（区分・日付・金額・カテゴリ・メモの順）。各欄に aria-invalid と、欄の下の文への aria-describedby を付ける。最初の誤りの欄（同じ順で最初のもの）へ操作位置を移す
    violation: 該当なし
    source: [FR1.2, FR1.3, NFR2]
  - id: BR1.6
    statement: 誤りを直して登録に成功したら、まとめと欄ごとの誤りの表示をすべて消す
    category: policy
    applies_to: EntryFormView
    trigger: 登録が成功したとき
    logic: 成功の知らせだけを出し、aria-invalid と欄の下の文を消す
    violation: 該当なし
    source: [FR1.2]
  - id: BR1.7
    statement: 登録の処理中は「登録する」を押せなくし、素早い2回目の操作で明細が増えないようにする
    category: constraint
    applies_to: EntryFormView
    trigger: 「登録する」を押したとき、または Enter
    logic: 登録の操作を受けたら、画面の状態とは別の同期の鍵（React の ref）を立て、その時刻から 300 ミリ秒の間は鍵を保持する。鍵がある間の操作（クリックと Enter）は、検証も保存も行わず、誤りの表示や知らせも変えずに捨てる。保存は同期で終わるが、鍵は 300 ミリ秒たってから外す。その間「登録する」は disabled で表示する
    violation: 該当なし
    source: [FR1.7]
  - id: BR2.1
    statement: 表示中と別の月の日付で登録したら、表示をその月に切り替え、月を付けて知らせる。同じ月なら表示月は変えない
    category: policy
    applies_to: EntryFormView、AppShell.selectMonth
    trigger: 登録が成功したとき
    logic: IF 登録した明細の月 ≠ 表示中の月 THEN selectMonth(明細の月) と、知らせ「N月の明細として登録しました M月D日 カテゴリ ¥金額」。明細の年が表示中の月の年と違うときは「YYYY年N月の明細として登録しました …」と年を付ける。ELSE 知らせ「登録しました M月D日 カテゴリ ¥金額」
    violation: 該当なし
    source: [FR1.1]
  - id: BR3.1
    statement: 明細の一覧は、表示中の月の明細を、日付の新しい順、同じ日付は後から追加したもの（addedOrder の大きいもの）が上に並べる
    category: policy
    applies_to: Ledger.listByMonth と ReviewView の一覧
    trigger: 表示する月が決まったとき、保存の知らせを受けたとき
    logic: 日付の降順、同じ日付は addedOrder の降順
    violation: 該当なし
    source: [FR2.1]
  - id: BR3.2
    statement: 一覧の各行に、日付（MM/DD）・区分・カテゴリ・金額・メモを出す。金額は支出に「−」、収入に「+」を付け、¥ と3桁区切りで右揃え
    category: policy
    applies_to: ReviewView の一覧
    trigger: 表示するとき
    logic: 12800 の支出は「−¥12,800」。収入は「+¥280,000」
    violation: 該当なし
    source: [FR2.2]
  - id: BR3.3
    statement: メモは常に文字として表示し、長いメモは折り返して全部を表示する
    category: policy
    applies_to: ReviewView の一覧
    trigger: 表示するとき
    logic: HTML として差し込まない。表の幅は変えず、メモの列の中で折り返す
    violation: 該当なし
    source: [FR1.5, NFR4]
  - id: BR3.4
    statement: 一覧には修正・削除の操作を置かない
    category: constraint
    applies_to: ReviewView の一覧
    trigger: 表示するとき
    logic: 行に操作のボタンやリンクを置かない
    violation: 該当なし
    source: [FR1.8]
  - id: BR3.5
    statement: 表示中の月に明細がないときは、表の代わりに案内文を出す
    category: policy
    applies_to: ReviewView の一覧
    trigger: 表示中の月の明細が0件のとき
    logic: 「この月の明細はまだありません。上のフォームから登録するか、CSV を取り込むと、ここに表示されます。」を出し、空の表は出さない
    violation: 該当なし
    source: [FR2.3]
  - id: BR4.1
    statement: U5 のサンプルの明細は、すべて U2 で仕上げた規則（BR1.1〜BR1.4）を通る
    category: validation
    applies_to: SampleDataSeeder（U5）と Ledger.validate
    trigger: テスト
    logic: サンプルの全件を Ledger.validate に通し、1件も VALIDATION にならない
    violation: テストの失敗として扱う
    source: [FR8.1]
```

## 規則の一覧

| ID | 内容 | 種類 | 出典 |
|----|------|------|------|
| BR1.1 | 金額は 1〜9,999,999 の半角の整数 | validation | FR1.2 |
| BR1.2 | 日付は空でなく、実在する日付 | validation | FR1.3 |
| BR1.3 | 区分と、区分に合うカテゴリ | validation | FR1.4, FR3.1 |
| BR1.4 | メモは見える1文字で 100 文字まで、改行なし | validation | FR1.5 |
| BR1.5 | 誤りのまとめと欄ごとの直し方、最初の誤りの欄へ | policy | FR1.2, FR1.3, NFR2 |
| BR1.6 | 直して登録したら誤りの表示を消す | policy | FR1.2 |
| BR1.7 | 処理中は押せない（二重送信の防止） | constraint | FR1.7 |
| BR2.1 | 別の月なら表示を切り替えて月を付けて知らせる | policy | FR1.1 |
| BR3.1 | 一覧は新しい順、同じ日付は後から追加したものが上 | policy | FR2.1 |
| BR3.2 | 一覧の列と金額の表示 | policy | FR2.2 |
| BR3.3 | メモは文字のまま、折り返して全部表示 | policy | FR1.5, NFR4 |
| BR3.4 | 修正・削除の操作を置かない | constraint | FR1.8 |
| BR3.5 | 明細のない月は案内文 | policy | FR2.3 |
| BR4.1 | サンプルの全件が U2 の規則を通る | validation | FR8.1 |
