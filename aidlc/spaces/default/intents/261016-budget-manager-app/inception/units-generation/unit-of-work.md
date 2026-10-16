# 作業単位（Unit）の定義

入力: 部品の一覧 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md`、設計判断 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/decisions.md`、要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`、ストーリー `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`、このステージの回答 `units-generation-questions.md`（Q1・Q2、分割の計画は承認済み）。

## 一覧

| Unit ID | Directory | 名前 | 種類 | 規模 | 配り方 |
|---------|-----------|------|------|------|--------|
| U1 | u1-walking-skeleton | 薄い版（登録 → 月次集計 → CSV 出力、保存） | ui | M | 1つの Web アプリに含める |
| U2 | u2-entry-and-ledger | 登録の検証と明細一覧 | ui | M | 1つの Web アプリに含める |
| U3 | u3-budget | 月別予算と予算比較 | ui | M | 1つの Web アプリに含める |
| U4 | u4-csv-import | CSV の数式対策と取り込み | ui | L | 1つの Web アプリに含める |
| U5 | u5-storage-resilience | 初回のサンプルデータと保存の異常・別タブ対応 | ui | L | 1つの Web アプリに含める |
| U6 | u6-accessibility | アクセシビリティの仕上げ | ui | S | 1つの Web アプリに含める |

アプリは依頼者のパソコンで動かす1つの Web アプリで、Unit ごとに別々に配ることはしません（`team-practices.md` の Deployment）。種類はすべて ui（画面を持つ部分）です。

## U1 薄い版（u1-walking-skeleton）

- **説明**: 端から端まで最小限につながって動く版です。収支を1件登録し、月次集計（収入・支出・差額）に反映し、明細を CSV ファイルに保存できます。ブラウザを開き直しても登録が残ります。
- **含む部品**（`components.md`）: AppShell、EntryFormView（基本の入力欄）、ReviewView（月の切り替えと収入・支出・差額）、ExportView（CSV 保存）、Ledger（1件の登録と月ごとの取り出し）、MonthlySummary（収入・支出・差額）、CsvExchange（出力）、CategoryCatalog、DataStore（読み込み・保存。全体をまとめて保存）。
- **受け持つこと**: アプリの土台（画面の組み立て、起動、表示中の月）、部品どうしのつながり、最初の保存と読み込み、CSV の基本の出力。
- **境目**: 誤りの細かな表示、予算、CSV の取り込み、サンプルデータ、保存の異常・別タブ対応は含めない（それぞれ U2〜U5）。
- **注意点**: 次の Unit が積み上げる土台なので、部品の境目（ADR-001〜006）を最初から守る。DataStore は「全体をまとめて保存」の形で作り、後の U5 が版・照合・異常検出を足せるようにする。この Unit だけで、ブラウザ上で最初から最後まで動くこと。

## U2 登録の検証と明細一覧（u2-entry-and-ledger）

- **説明**: 入力の誤りを欄ごとに示し、別の月の日付で登録したら表示をその月に切り替えます。月の明細を新しい順に一覧で表示します。
- **含む部品**: EntryFormView（誤り表示・二重送信の防止・別の月への切り替え依頼）、Ledger（明細の規則の判定、並び順）、ReviewView（明細一覧と空の月の案内）、AppShell（表示月の切り替え）。
- **受け持つこと**: 金額・日付・カテゴリ・メモの規則（要件 FR1、ストーリーの差分、詳細モックアップ Q3）、一覧の並び順と表示。
- **注意点**: Ledger の「保存を伴わない規則の判定」は U4 の取り込みでも使うので、画面から独立した形で作る（ドメイン設計レビュー R-04）。

## U3 月別予算と予算比較（u3-budget）

- **説明**: 月次集計の表に支出カテゴリごとの予算を入力して保存し、前の月の予算を写せます。集計に予算・実績・残額・超過・未設定を表示します。
- **含む部品**: Budget、MonthlySummary（予算比較）、ReviewView（予算欄・保存・コピーと上書き確認）。
- **受け持つこと**: 予算の規則（0〜9,999,999、空欄は未設定、1か月分まとめて検証）、前月コピー、超過と未設定の表示。
- **注意点**: 「前の月」は、表示中の月を持つ AppShell から受け取る（ドメイン設計レビュー R-05）。

## U4 CSV の数式対策と取り込み（u4-csv-import）

- **説明**: 数式のように見えるメモを安全に出力し、CSV ファイルを取り込んで明細に追加します。ファイル全体の確認、行ごとの検証、重複の確認、結果の表示を行います。
- **含む部品**: CsvExchange（数式対策、取り込みの検証と重複確認）、ExportView（取り込み操作・重複の確認・結果の表示）、Ledger（一括追加・一致の判定）。
- **受け持つこと**: 要件 FR6.4・FR7 とストーリーの差分、詳細モックアップ Q2・Q3 の規則。取り込みは全部か無か。
- **注意点**: 取り込みファイルは信用しない入力として扱う（ADR-003）。重複確認の途中状態（検証済みの行）は CsvExchange が持ち、取り込みをやめたら捨てる。

## U5 初回のサンプルデータと保存の異常・別タブ対応（u5-storage-resilience）

- **説明**: 初めて開いたときに直近3か月分の架空データを入れます。保存に失敗したとき、保存データが壊れているとき、別のタブで変更があったときに知らせ、データを守ります。
- **含む部品**: DataStore（版と通し番号、書き込み時の照合、壊れたデータの検出と書き込み停止、別タブの検知）、SampleDataSeeder、NoticeBannerView、AppShell（各画面への状態の伝達）、各画面部品（保存系の操作を止める）。
- **受け持つこと**: 要件 FR8・FR9、ストーリー US7.1・US7.3・US7.4。
- **注意点**: ドメイン設計レビューの指摘を、この Unit で解消する。
  - R-01: 古いタブからの書き込みは、通し番号の照合で断る。
  - R-02: 状態を画面部品に伝える。
  - R-03: サンプルは明細と予算を1回の保存で入れる。

## U6 アクセシビリティの仕上げ（u6-accessibility）

- **説明**: すべての画面がそろったあとで、キーボードだけの操作、本文へ移動、読み上げ、axe の検査を通しで確かめ、直します。
- **含む部品**: AppShell、EntryFormView、ReviewView、ExportView、NoticeBannerView。
- **受け持つこと**: ストーリー US8.1、要件 NFR2・NFR8、`accessibility-checklist.md` の確認項目。
- **注意点**: 各 Unit でも基本のアクセシビリティ（見出し、ラベル、操作位置の枠線）は作り込む。この Unit は通しでの確認と仕上げを受け持つ。
