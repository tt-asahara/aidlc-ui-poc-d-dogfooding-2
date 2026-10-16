# ストーリーと Unit の対応

ストーリーは `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`、Unit は `unit-of-work.md` にあります。部品の一覧は `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md` です。

## 対応表

| ストーリー | 内容 | Unit ID | Directory |
|------------|------|---------|-----------|
| US1.1 | 収支を登録する | U1 | u1-walking-skeleton |
| US1.2 | 入力の誤りに気づいて直す | U2 | u2-entry-and-ledger |
| US1.3 | 別の月の日付で登録する | U2 | u2-entry-and-ledger |
| US2.1 | 月の明細を一覧で見る | U2 | u2-entry-and-ledger |
| US3.1 | 月の収支を確認する | U1 | u1-walking-skeleton |
| US3.2 | カテゴリ別に予算と実績を比べる | U3 | u3-budget |
| US4.1 | 月の予算を入力する | U3 | u3-budget |
| US4.2 | 前の月の予算をコピーする | U3 | u3-budget |
| US5.1 | 明細を CSV に保存する | U1 | u1-walking-skeleton |
| US5.2 | 数式のようなメモを安全に出力する | U4 | u4-csv-import |
| US6.1 | CSV を取り込んで明細を追加する | U4 | u4-csv-import |
| US6.2 | 取り込めない行を知る | U4 | u4-csv-import |
| US6.3 | 重複した取り込みを避ける | U4 | u4-csv-import |
| US7.1 | サンプルデータで試し始める | U5 | u5-storage-resilience |
| US7.2 | 開き直してもデータが残る | U1 | u1-walking-skeleton |
| US7.3 | 保存できないときに気づく | U5 | u5-storage-resilience |
| US7.4 | 2つのタブで食い違わない | U5 | u5-storage-resilience |
| US8.1 | キーボードだけで一連の操作を終える | U6 | u6-accessibility |

## 複数の Unit にまたがるもの

| ストーリー | 主な Unit | ほかに関わる Unit | 内容 |
|------------|-----------|-------------------|------|
| US1.1 | U1 | U2 | U1 で登録と基本の知らせを作り、U2 で誤りの表示と二重送信の防止を足す |
| US5.1 | U1 | U4 | U1 で基本の出力を作り、U4 で数式対策と、出力 → 取り込みの往復の確認を足す（ストーリーのレビュー指摘 R-01） |
| US7.3 | U5 | U2, U3, U4 | 保存の失敗の表示を、登録・予算保存・取り込みのそれぞれの画面に出す。U5 が DataStore と状態の伝達を作り、各画面の表示は U5 でまとめて足す |
| US8.1 | U6 | U1〜U5 | 基本のアクセシビリティは各 Unit で作り込み、U6 で通しの確認と仕上げを行う |

## Unit の中での作る順番

| Unit | 順番 |
|------|------|
| U1 | CategoryCatalog → DataStore（読み込み・保存）→ Ledger（1件登録・月ごとの取り出し）→ MonthlySummary（収入・支出・差額）→ CsvExchange（出力）→ 画面部品と AppShell |
| U2 | Ledger の規則の判定 → 並び順 → EntryFormView の誤り表示・二重送信の防止 → 別の月への切り替え → ReviewView の一覧と空の月 |
| U3 | Budget（設定・検証・前月コピー）→ MonthlySummary の予算比較 → ReviewView の予算欄・確認の枠 |
| U4 | CsvExchange の数式対策 → ファイル全体の確認 → 行ごとの検証 → 重複確認 → Ledger の一括追加との連携 → ExportView の確認の枠と結果表示 |
| U5 | DataStore の版・通し番号・照合 → 壊れたデータの検出 → 別タブの検知 → 状態の伝達（AppShell）→ NoticeBannerView → SampleDataSeeder（1回の保存で投入） |
| U6 | 通しのキーボード操作の確認 → axe の検査 → 見つかった点の修正 |

## 漏れの確認

- ストーリー 18件すべてに Unit が割り当てられている。
- 6つの Unit すべてに、1件以上のストーリーがある（U1: 4件、U2: 3件、U3: 3件、U4: 4件、U5: 3件、U6: 1件）。
