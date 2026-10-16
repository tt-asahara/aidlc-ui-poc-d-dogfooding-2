# 業務の規則 — U5 保存の異常・別タブ対応・サンプル

入力:

- Unit の定義 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`（U5）
- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（FR8、FR9、NFR5）
- ストーリー `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`（US7.1、US7.3、US7.4）
- 約束ごと `aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md`（C2、C3、C6、C9）
- U1 の規則 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/rules.md`（保存の規則の上に積む）
- このステージの回答 `functional-design-questions.md`（Q1〜Q4、まとめの確認済み）

規則の番号は、この Unit の中の番号です（U1 の規則とは別の番号の並び）。

```yaml
rules:
  - id: BR1.1
    statement: 保存データを読み込むときは、約束ごと C2 の形（項目の有無・型・値の範囲）とすべて照らし、1つでも合わなければ「読めない」として扱う
    category: validation
    applies_to: DataStore.load と、別のタブの変更を読み込むとき
    trigger: 保存領域の文字を読んだとき
    logic: IF JSON として読めない、または schemaVersion が 1 でない、または revision が 0 以上の整数でない、または savedAt が文字でない、または entries・budgets が配列でない、または明細・予算の1件でも次の条件を満たさない THEN unreadable。明細 = 日付が YYYY-MM-DD で実在する日付、区分が収入か支出、カテゴリが CategoryCatalog にありその区分に合う、金額が 1〜9,999,999 の整数、メモが文字で前後の空白なし・100 文字以下（見える1文字で数える）・改行なし、addedOrder が正の整数で明細の中で重ならない、entryId が空でない文字で明細の中で重ならない。予算 = month が YYYY-MM、カテゴリが支出カテゴリ、金額が 0〜9,999,999 の整数、budgetKey が「month:カテゴリ」と一致し予算の中で重ならない。検査は CategoryCatalog だけを使う純粋な関数（app/src/domain の下）として置き、Ledger と DataStore には依存しない
    violation: 保存データには書かない。全体のお知らせ枠に BR5.1 の知らせを出す
    source: [FR9.3, NFR4, NFR5]
  - id: BR1.2
    statement: 保存データが読めないときは、登録・予算の保存・取り込みのすべての保存の操作を止め、サンプルも入れ直さない。開き直しても保存データはそのまま残る
    category: policy
    applies_to: DataStore.commit、SampleDataSeeder
    trigger: 状態が unreadable のとき
    logic: IF 状態が unreadable THEN commit は何も書かず STORE_UNREADABLE を返す。seedIfEmpty は呼ばれない（起動の結果が empty でないため）
    violation: 該当なし
    source: [FR9.3]
  - id: BR2.1
    statement: 別のタブがこのアプリの保存データを書き換えたら、最新を読み込んで画面を更新し、そのことを知らせる
    category: policy
    applies_to: DataStore（タブ間の知らせの受け取り）、AppShell
    trigger: ブラウザのタブ間の知らせ（storage イベント）で、localStorage のこのアプリのキーが変わったか、localStorage 全体が消された（key が null）とき
    logic: IF 状態が unreadable THEN 何もしない（開き直すまで unreadable のまま）。そうでなければ、新しい値を BR1.1 で検査する。IF 読める THEN 手元の写しを入れ替え、externalChange を知らせる。IF 読めない THEN unreadable にして unreadable を知らせる。IF キーが消された（値がない、または key が null） THEN 保存データなしとして空の写し（通し番号 0）にし、externalChange を知らせる。storageArea が localStorage でない知らせと、ほかのキーの知らせは無視する
    violation: 該当なし
    source: [FR9.1]
  - id: BR2.2
    statement: 別のタブの変更を読み込んでも、登録フォームに入力中の内容は消さない
    category: policy
    applies_to: EntryFormView
    trigger: externalChange を受け取ったとき
    logic: 入力中の値はそのまま。次に「登録する」を押すと、最新の通し番号で保存する
    violation: 該当なし
    source: [FR9.1]
  - id: BR2.3
    statement: 2つのタブで、保存直前の読み直しと書き込みの間（1 ミリ秒未満）に保存が重なる隙間は、残るリスクとして扱い、仕組みは足さない
    category: policy
    applies_to: DataStore.commit
    trigger: 該当なし（記録）
    logic: 通し番号の照合（U1 の保存の規則）と BR2.1 の検知で防ぐ。保存の呼び出しは同期のまま
    violation: 隙間で上書きが起きた場合、先に保存した側の変更が失われうる（残るリスク）
    source: [FR9.1, NFR5]
  - id: BR3.1
    statement: 起動時に保存領域へのアクセス自体が失敗したら、保存できないことを知らせる。操作は止めず、試しの書き込みもしない
    category: policy
    applies_to: DataStore.load、AppShell、NoticeBannerView
    trigger: 起動時の読み込みで、保存領域の取り出しや読み込みが例外になったとき
    logic: DataStore は「保存データなし」と同じに扱い、保存領域が使えないこと（getAvailability が unavailable）を状態として持つ。操作は止めないが、保存はすべて失敗する（U1 のとおり commit は STORAGE_WRITE を返し、手元の写しも画面も変わらない。登録では「このブラウザに保存できませんでした」が出る）。サンプル投入は試みる（保存に失敗し、何も残らない）。全体のお知らせ枠に BR5.3 の知らせを出す
    violation: 該当なし
    source: [FR9.2]
  - id: BR4.1
    statement: 保存データがまったくないときだけ、今月を含む直近3か月分の架空の明細と予算を、1回の保存で入れる
    category: policy
    applies_to: SampleDataSeeder.seedIfEmpty
    trigger: 起動時の読み込みの結果が empty のとき（AppShell が呼ぶ）
    logic: 3か月 = 今日の月とその前の2か月。明細と予算を組み立て、DataStore.commit({ initialize }) を1回だけ呼ぶ。IF 保存に失敗 THEN 何も残らず、次回の起動でもう一度試す。IF 保存データがすでにある THEN 何もしない
    violation: 該当なし
    source: [FR8.1]
  - id: BR4.2
    statement: サンプルの明細は1か月 15〜20 件。収入は毎月の給与と、ときどきの副収入。支出は8つのカテゴリに散らす。日付はその月の中で、今日より後の日付は使わない
    category: constraint
    applies_to: SampleDataSeeder
    trigger: BR4.1
    logic: 決まった並び（乱数を使わない）で組み立てる。今月は今日の日付までの日だけを使う
    violation: 該当なし
    source: [FR8.1]
  - id: BR4.3
    statement: サンプルの予算は、支出カテゴリ8つのうち6つに設定し、2つは未設定にする。少なくとも1つの月で、1つ以上のカテゴリの実績が予算を超えるようにする
    category: constraint
    applies_to: SampleDataSeeder
    trigger: BR4.1
    logic: 未設定にするのは「娯楽」と「その他支出」。超過させるのは、前の月の「食費」（実績が予算を上回る金額で組み立てる）
    violation: 該当なし
    source: [FR8.2]
  - id: BR4.4
    statement: サンプルのメモは一般的な言葉だけにし、実在の人物・口座・店舗の名前を使わない
    category: constraint
    applies_to: SampleDataSeeder
    trigger: BR4.1
    logic: メモは「スーパー」「電気代」「スマホ代」「定期券」などの一般名詞だけ
    violation: 該当なし
    source: [FR8.3]
  - id: BR4.5
    statement: サンプルの明細も、利用者の登録と同じ規則で確かめ、同じ規則で ID と追加した順の番号を付ける
    category: validation
    applies_to: SampleDataSeeder、Ledger
    trigger: BR4.1
    logic: 各明細を Ledger.validate で確かめる。ID と追加した順の番号は、Ledger が付ける（U1 の採番の規則と同じ。Ledger に複数件をまとめて採番する関数を足す）。1件でも規則に合わなければ、保存せずにプログラムの誤りとして扱う
    violation: 保存しない。テストで検出する
    source: [FR8.1, FR1.2, FR1.5]
  - id: BR5.1
    statement: 保存データが読めないときは、全体のお知らせ枠に「保存データを読み込めませんでした。データは消していません。」と、止めている操作（登録・予算の保存・CSV の取り込み）の説明を出す
    category: policy
    applies_to: NoticeBannerView
    trigger: storeStatus が unreadable になったとき（起動時も、使っている途中も）
    logic: role="alert" で出す。閉じる操作は置かない（状態が続く間は出し続ける）
    violation: 該当なし
    source: [FR9.3]
  - id: BR5.2
    statement: 別のタブの変更を読み込んだら、全体のお知らせ枠に「別のタブで変更がありました。最新の内容を読み込みました」を出す。利用者が「閉じる」を押すか、次に自分で保存するまで出しておく
    category: policy
    applies_to: NoticeBannerView
    trigger: externalChange を受け取ったとき
    logic: role="status" で出す。「閉じる」で消す。committed を受け取ったら消す。時間では消さない
    violation: 該当なし
    source: [FR9.1]
  - id: BR5.3
    statement: 起動時に保存領域が使えなかったら、全体のお知らせ枠に「このブラウザでは保存できません。登録などの操作をしても保存されません」を出す（実際の動き BR3.1 に合わせた文言。レビュー R-01）
    category: policy
    applies_to: NoticeBannerView
    trigger: BR3.1
    logic: role="alert" で出す。閉じる操作は置かない
    violation: 該当なし
    source: [FR9.2]
  - id: BR5.4
    statement: 全体のお知らせ枠に複数の知らせがあるときは、読めない（BR5.1）を最優先にし、次に保存できない（BR5.3）、最後に別のタブの変更（BR5.2）を出す
    category: policy
    applies_to: NoticeBannerView
    trigger: 知らせが重なったとき
    logic: unreadable のときは BR5.1 だけを出す。そうでなく保存領域が使えないときは BR5.3 を出し、BR5.2 も続けて出す
    violation: 該当なし
    source: [FR9.2, FR9.3]
```

## 規則の一覧

| ID | 内容 | 種類 | 出典 |
|----|------|------|------|
| BR1.1 | 読み込み時に C2 の形とすべて照らす | validation | FR9.3, NFR4, NFR5 |
| BR1.2 | 読めないときは保存の操作を止め、サンプルも入れ直さない | policy | FR9.3 |
| BR2.1 | 別のタブの変更を検知して最新を読み込む | policy | FR9.1 |
| BR2.2 | 別のタブの変更でも入力中の内容は消さない | policy | FR9.1 |
| BR2.3 | 1 ミリ秒未満の同時保存の隙間は残るリスク | policy | FR9.1, NFR5 |
| BR3.1 | 保存領域が使えないことを起動時に知らせる | policy | FR9.2 |
| BR4.1 | 保存データがないときだけ、3か月分を1回で入れる | policy | FR8.1 |
| BR4.2 | 明細は1か月 15〜20 件、未来の日付なし | constraint | FR8.1 |
| BR4.3 | 予算は6つ設定・2つ未設定、超過を1つ以上 | constraint | FR8.2 |
| BR4.4 | メモは一般的な言葉だけ | constraint | FR8.3 |
| BR4.5 | サンプルも同じ規則で確かめ、同じ規則で採番 | validation | FR8.1, FR1.2, FR1.5 |
| BR5.1 | 読めないときの全体の知らせ | policy | FR9.3 |
| BR5.2 | 別のタブの変更の知らせ（閉じるか次の保存まで） | policy | FR9.1 |
| BR5.3 | 保存できない環境の知らせ | policy | FR9.2 |
| BR5.4 | 知らせが重なったときの優先順 | policy | FR9.2, FR9.3 |
