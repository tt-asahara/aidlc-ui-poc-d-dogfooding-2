# 業務の規則 — U1 薄い版

入力:

- Unit の定義 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`（U1）
- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`
- ストーリー `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`
- 約束ごと `aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md`
- このステージの回答 `functional-design-questions.md`（Q1〜Q4、まとめの確認済み）

U1 で実装する規則だけを載せます。欄ごとの誤り表示、二重送信の防止、メモの文字数の数え方（見える1文字）、日付の存在の確認は U2 で足します。

```yaml
rules:
  - id: BR1.1
    statement: 区分・日付・金額・カテゴリがすべて入力されていなければ登録しない。メモは任意
    category: validation
    applies_to: 登録（Ledger.validate の最小限の判定）
    trigger: 「登録する」を押したとき
    logic: IF 区分・日付・金額・カテゴリのどれかが空 THEN 登録せず VALIDATION を返す
    violation: 登録フォームのお知らせ枠に「入力を確かめてください」と空の欄の名前を出す。入力は残し、最初の誤りの欄へ操作位置を移す
    source: [FR1.1, FR1.3]
  - id: BR1.2
    statement: 金額は前後の空白を除いたあと、半角数字だけからなる 1〜9,999,999 の整数でなければ登録しない
    category: validation
    applies_to: 登録（Ledger.validate の最小限の判定）
    trigger: 「登録する」を押したとき
    logic: IF 金額が半角数字だけでない、または 1 未満、または 9,999,999 を超える THEN 登録せず VALIDATION を返す
    violation: BR1.1 と同じお知らせ枠に、直す欄として「金額」を出す
    source: [FR1.2]
  - id: BR1.3
    statement: カテゴリは、選んだ区分に対応する固定のカテゴリからだけ選べる。区分を切り替えたら、合わないカテゴリの選択を解除する
    category: constraint
    applies_to: 登録フォームのカテゴリ欄（CategoryCatalog）
    trigger: 区分を選ぶ、または切り替えたとき
    logic: IF 区分が収入 THEN 給与・副収入・その他収入だけを選択肢にする。IF 区分が支出 THEN 食費・住居費・水道光熱費・通信費・日用品・交通費・娯楽・その他支出だけを選択肢にする。IF 選択中のカテゴリが新しい区分に合わない THEN 選択を解除する
    violation: 解除したカテゴリ欄は空になり、選び直すまで BR1.1 で登録できない
    source: [FR1.4, FR3.1, FR3.2]
  - id: BR1.4
    statement: メモは前後の空白を除いて保存する。入力欄は 100 文字まで、改行は入力できない。保存したメモは常に文字として扱う
    category: constraint
    applies_to: 登録（Ledger.validate）と、メモを表示するすべての箇所
    trigger: 登録するとき、表示するとき
    logic: 保存する値 = メモの前後の空白を除いたもの。表示では書式として解釈しない
    violation: 該当なし（入力欄で制限する）
    source: [FR1.5, NFR4]
  - id: BR1.5
    statement: 登録に成功したら、追加した明細の日付・カテゴリ・金額を「登録しました」とともにお知らせ枠に出し、読み上げ機能に伝える
    category: policy
    applies_to: EntryFormView
    trigger: Ledger.add が成功したとき
    logic: 知らせ = 「登録しました M月D日 カテゴリ ¥金額」（金額は BR2.6 の形）。区分と日付は残し、金額とメモを空にして金額欄へ操作位置を移す
    violation: 該当なし
    source: [FR1.6]
  - id: BR1.6
    statement: 明細の ID と追加した順の番号は Ledger が付ける。追加した順の番号は、保存されている明細の最大値に 1 を足したもの（明細がなければ 1）
    category: calculation
    applies_to: Ledger.add
    trigger: 登録するとき
    logic: entryId = 重ならない新しい ID。addedOrder = 既存の addedOrder の最大値 + 1
    violation: 該当なし
    source: [FR2.1]
  - id: BR2.1
    statement: 開いたときは、利用しているパソコンの地域の時刻で「今日」を含む月を表示する。「今日」は AppShell が1か所で決める
    category: policy
    applies_to: AppShell（AppState.selectedMonth）
    trigger: 起動したとき
    logic: selectedMonth = 今日の年と月（YYYY-MM）
    violation: 該当なし
    source: [FR4.1]
  - id: BR2.2
    statement: 「前の月」「次の月」で1か月ずつ切り替え、年をまたいでも正しい月にする
    category: calculation
    applies_to: ReviewView の月の切り替え（AppShell.selectMonth）
    trigger: ボタンを押したとき
    logic: IF 前の月 AND 月が1月 THEN 前の年の12月。IF 次の月 AND 月が12月 THEN 次の年の1月。それ以外は月を1つ増減する
    violation: 該当なし
    source: [FR4.1]
  - id: BR2.3
    statement: 選んだ月の収入合計・支出合計・差額（収入合計 − 支出合計）を、円の整数で計算する
    category: calculation
    applies_to: MonthlySummary.summarize
    trigger: 表示する月が決まったとき、保存の知らせを受けたとき
    logic: 収入合計 = その月の区分「収入」の金額の和。支出合計 = その月の区分「支出」の金額の和。差額 = 収入合計 − 支出合計。小数は使わない
    violation: 該当なし
    source: [FR4.2, FR4.7]
  - id: BR2.4
    statement: 差額が負のときは「−」を付けて表示する
    category: policy
    applies_to: ReviewView の集計表示
    trigger: 表示するとき
    logic: IF 差額 < 0 THEN 「−¥」と絶対値を BR2.6 の形で表示する
    violation: 該当なし
    source: [FR4.2]
  - id: BR2.5
    statement: 支出カテゴリ8つの実績を固定の順で出し、その合計は支出合計と必ず一致させる
    category: calculation
    applies_to: MonthlySummary.summarize（categories）
    trigger: BR2.3 と同じ
    logic: カテゴリごとの実績 = その月のそのカテゴリの支出の和。並び順は CategoryCatalog の順。実績が0のカテゴリも出す
    violation: 一致しない場合はプログラムの誤りとしてテストで検出する
    source: [FR4.3, FR4.6]
  - id: BR2.6
    statement: 金額は「¥」と3桁区切りを付けて表示する
    category: policy
    applies_to: 金額を表示するすべての箇所
    trigger: 表示するとき
    logic: 12800 は「¥12,800」。2999999700 は「¥2,999,999,700」
    violation: 該当なし
    source: [FR2.2, FR4.7]
  - id: BR2.7
    statement: 予算が設定されていないカテゴリは、予算を「未設定」、残額を「—」と表示し、超過として扱わない
    category: policy
    applies_to: ReviewView のカテゴリ別の表（U1 では予算の差し込み口が常に「予算なし」を返す）
    trigger: 表示するとき
    logic: IF 予算が null THEN 予算 = 「未設定」、残額 = 「—」、超過 = なし
    violation: 該当なし
    source: [FR4.5]
  - id: BR3.1
    statement: CSV には保存されているすべての明細を、日付の古い順、同じ日付は追加した順に出す
    category: policy
    applies_to: CsvExchange.exportAll（Ledger.listAll）
    trigger: 「明細を CSV に保存」を押したとき
    logic: 行の数 = 明細の件数 + 見出し1行。並び順 = 日付の昇順、同じ日付は addedOrder の昇順
    violation: 該当なし
    source: [FR6.1]
  - id: BR3.2
    statement: CSV の形式は UTF-8（BOM 付き）、改行は CRLF、見出しは「日付,区分,カテゴリ,金額,メモ」。日付は YYYY-MM-DD、金額は区切りなしの整数
    category: constraint
    applies_to: CsvExchange.exportAll
    trigger: BR3.1 と同じ
    logic: 契約設計 C8 の形式どおりに組み立てる
    violation: 該当なし
    source: [FR6.2]
  - id: BR3.3
    statement: カンマ・ダブルクォートを含む値はダブルクォートで囲み、中のダブルクォートは2つ重ねる
    category: constraint
    applies_to: CsvExchange.exportAll
    trigger: BR3.1 と同じ
    logic: IF 値にカンマまたはダブルクォートを含む THEN 値全体をダブルクォートで囲み、中の " を "" にする
    violation: 該当なし
    source: [FR6.3]
  - id: BR3.4
    statement: ファイル名は budget-entries-YYYYMMDD.csv（出力した日。パソコンの地域の時刻）
    category: policy
    applies_to: CsvExchange.exportAll
    trigger: BR3.1 と同じ
    logic: 日付は AppShell が決めた「今日」を使う（BR2.1 と同じ取得元）
    violation: 該当なし
    source: [FR6.5]
  - id: BR3.5
    statement: 明細が0件のときは出力せず、「出力する明細がありません」と知らせる
    category: validation
    applies_to: CsvExchange.exportAll と ExportView
    trigger: 「明細を CSV に保存」を押したとき
    logic: IF 明細が0件 THEN NOT_FOUND を返し、ファイルを作らない
    violation: CSV の区切りのお知らせ枠に「出力する明細がありません」と出す
    source: [FR6.6]
  - id: BR3.6
    statement: CSV の説明に「CSV には明細だけが含まれ、予算は含まれません」と書く
    category: policy
    applies_to: ExportView
    trigger: 常に表示
    logic: 説明文に上の文を含める
    violation: 該当なし
    source: [FR6.1]
  - id: BR4.1
    statement: 保存は DataStore.commit の1回で、明細と予算をまとめた保存データ全体を書く。保存の直前に通し番号を照合する
    category: constraint
    applies_to: DataStore.commit
    trigger: 登録するとき
    logic: 新しい保存データ = 今の保存データ + 追加する明細。保存領域に何もないときの通し番号は 0 とみなす（最初の保存で 1 になる）。IF 保存領域の通し番号 = 期待する通し番号 THEN 通し番号を1増やして全体を書く ELSE 保存せず STALE_REVISION
    violation: BR4.4 を参照
    source: [FR9.1, NFR5]
  - id: BR4.2
    statement: 起動時に保存データを読み、無ければ空の状態で始める。読めない（形が壊れている、知らない新しい版）ときは消さずに、登録を止めて理由を出す
    category: policy
    applies_to: DataStore.load と AppShell
    trigger: 起動したとき
    logic: IF 保存データなし THEN 空（明細0件・予算なし）で始め、サンプル投入の差し込み口を呼ぶ（U1 では何もしない）。IF 読めた THEN その内容を表示する。IF 読めない THEN storeStatus = unreadable にし、保存データには触れない
    violation: unreadable のときは「登録する」を押せない状態にし、登録フォームに「保存データを読み込めませんでした。データは消していません」と出す
    source: [FR9.1, FR9.3]
  - id: BR4.3
    statement: 保存に失敗したら、失敗したこと・入力が画面に残っていること・再試行の方法を出し、成功したかのような表示はしない
    category: policy
    applies_to: EntryFormView
    trigger: commit が STORAGE_WRITE を返したとき
    logic: お知らせ枠に「このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「登録する」を押してください」を alert で出す。入力は残す
    violation: 該当なし
    source: [FR9.2]
  - id: BR4.4
    statement: 別のタブが先に保存していたら保存を断り、最新を読み直して知らせる。入力は残す
    category: policy
    applies_to: DataStore.commit と EntryFormView
    trigger: commit が STALE_REVISION を返したとき
    logic: DataStore は最新を読み直して変更を知らせる。お知らせ枠に「別のタブで変更があったため保存できませんでした。最新の内容を読み込みました。もう一度「登録する」を押してください」を alert で出す
    violation: 該当なし
    source: [FR9.1]
  - id: BR4.5
    statement: 保存の部品は、自分の保存が成功したときにも「保存した」と知らせる。集計と CSV の画面は、この知らせと別のタブの変更の知らせを同じ受け取り方で扱い、表示を更新する
    category: policy
    applies_to: DataStore.subscribe、ReviewView、ExportView
    trigger: commit が成功したとき、最新を読み直したとき
    logic: 知らせを受けた ReviewView は表示中の月の集計を読み直す。ExportView は出していたお知らせの文を消す
    violation: 該当なし
    source: [FR1.1, FR4.2]
  - id: BR4.6
    statement: 保存データが読めないときは、集計と CSV 保存でも「明細がない」と伝えず、読めないことと、データは消していないことを伝える
    category: policy
    applies_to: ReviewView、ExportView
    trigger: storeStatus が unreadable のとき
    logic: IF storeStatus = unreadable THEN 集計は ¥0 を出さず「保存データを読み込めないため、集計を表示できません」と出す。「明細を CSV に保存」は押せない状態にし、「保存データを読み込めないため、CSV に保存できません。データは消していません」と出す
    violation: 該当なし
    source: [FR9.3]
```

## 規則の一覧

| ID | 内容 | 種類 | 出典 |
|----|------|------|------|
| BR1.1 | 必須の4項目が空なら登録しない | validation | FR1.1, FR1.3 |
| BR1.2 | 金額は 1〜9,999,999 の半角の整数 | validation | FR1.2 |
| BR1.3 | 区分に合うカテゴリだけ。切り替えたら合わない選択を解除 | constraint | FR1.4, FR3.1, FR3.2 |
| BR1.4 | メモは前後の空白を除き、文字として扱う | constraint | FR1.5, NFR4 |
| BR1.5 | 登録成功の知らせ（日付・カテゴリ・金額） | policy | FR1.6 |
| BR1.6 | 明細の ID と追加した順の番号は Ledger が付ける | calculation | FR2.1 |
| BR2.1 | 開いたときは今日を含む月 | policy | FR4.1 |
| BR2.2 | 前後の月への切り替え（年またぎ） | calculation | FR4.1 |
| BR2.3 | 収入合計・支出合計・差額を整数で計算 | calculation | FR4.2, FR4.7 |
| BR2.4 | 差額が負なら「−」 | policy | FR4.2 |
| BR2.5 | 支出カテゴリ8つの実績。合計は支出合計と一致 | calculation | FR4.3, FR4.6 |
| BR2.6 | 金額は ¥ と3桁区切り | policy | FR2.2, FR4.7 |
| BR2.7 | 予算なしは「未設定」「—」、超過なし | policy | FR4.5 |
| BR3.1 | CSV は全明細を古い順 | policy | FR6.1 |
| BR3.2 | CSV の形式（BOM・CRLF・見出し） | constraint | FR6.2 |
| BR3.3 | カンマ・ダブルクォートを含む値の囲み | constraint | FR6.3 |
| BR3.4 | ファイル名に出力した日 | policy | FR6.5 |
| BR3.5 | 0件なら出力しない | validation | FR6.6 |
| BR3.6 | CSV の説明に「予算は含まれません」 | policy | FR6.1 |
| BR4.1 | 保存は全体を1回で、通し番号を照合 | constraint | FR9.1, NFR5 |
| BR4.2 | 起動時の読み込み。読めなければ消さずに登録を止める | policy | FR9.1, FR9.3 |
| BR4.3 | 保存失敗の表示（入力は残す） | policy | FR9.2 |
| BR4.4 | 別のタブが先に保存していたら断る | policy | FR9.1 |
| BR4.5 | 自分の保存も知らせ、画面を更新する | policy | FR1.1, FR4.2 |
| BR4.6 | 読めないときは集計と CSV でも「明細がない」と伝えない | policy | FR9.3 |
