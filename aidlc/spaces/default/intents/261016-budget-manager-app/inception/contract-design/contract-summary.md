# 部品間の約束ごと（コントラクト）

## 前提

- Unit の定義: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`
- Unit の依存関係: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work-dependency.md`
- 部品の一覧: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md`
- 要件: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`
- このステージの回答: `contract-design-questions.md`（Q1〜Q4、まとめの確認済み）

Unit はすべて1つの Web アプリの中で動くので、約束ごとはアプリ内の部品の呼び出し方とデータの形（TypeScript の型）です。外部に公開する API はありません（要件 NFR3）。外部とのやり取りは、利用者が選ぶ CSV ファイルだけです（C8）。

以下の仕様は、言語に依存しない共有スキーマの形で書いています。実装では同じ名前の TypeScript の型にします。データの型、検証の規則、値の範囲は、要件・ストーリー・詳細モックアップで決まったものを写しています。そのため、新しい決定はこの資料で行った Q1〜Q4 だけです。

## 約束ごとの一覧

| # | 提供する Unit | 使う側 | 方式 | 持ち主 |
|---|--------------|--------|------|--------|
| C1 | U1 u1-walking-skeleton（共通の結果の形） | U1〜U6 のすべての部品 | 共有の型（関数の戻り値） | U1 |
| C2 | U1（DataStore と保存データの形） | U1 Ledger・Budget・AppShell、U3、U4、U5 | 共有の型と関数呼び出し | U1（U5 は中身の強化のみ。形は変えない） |
| C3 | U1（Ledger） | U2、U4、U5 | 関数呼び出し | U1（規則の細部は U2 が実装） |
| C4 | U3 u3-budget（Budget） | U3 ReviewView、U1 MonthlySummary | 関数呼び出し | U3 |
| C5 | U1（MonthlySummary） | U1・U2・U3 ReviewView | 関数呼び出し | U1（予算の列は U3 が埋める） |
| C6 | U1（AppShell の状態の入口） | U2〜U5 の画面部品 | 共有の型と購読（イベント） | U1 |
| C7 | U1（CsvExchange の出力）／U4（取り込み） | U1・U4 ExportView | 関数呼び出し | 出力は U1、取り込みは U4 |
| C8 | U1／U4（CSV ファイルの形式） | External: 表計算ソフト・利用者のファイル | ファイル形式 | U1（出力）、U4（取り込み） |
| C9 | U5 u5-storage-resilience（初回のサンプル投入） | U1 AppShell | 関数呼び出し | U5 |

## C1 共通の結果の形（失敗の返し方）

予想できる失敗は、例外ではなく結果の値で返します（Q1）。呼び出し側は必ず `ok` を確かめます。予想していない失敗（プログラムの誤り）だけが例外になります。

```yaml
# shared-schema: Result
Result<T>:
  oneOf:
    - ok: true
      value: T
    - ok: false
      error: AppError
AppError:
  code:
    enum:
      - VALIDATION        # 入力が規則を満たさない。fieldErrors に欄ごとの理由
      - STORAGE_WRITE     # ブラウザに保存できなかった（容量不足・使えない等）
      - STALE_REVISION    # 別のタブが先に保存していた（Q3）
      - STORE_UNREADABLE  # 保存データが壊れている・知らない版（Q2）。保存系の操作は止まっている
      - NOT_FOUND         # 前の月の予算がない等、対象がない
      - FILE_REJECTED     # CSV ファイル全体を取り込めない（C8）
  message: string          # 画面にそのまま出せる日本語の文
  fieldErrors:             # code が VALIDATION のときだけ
    - field: string        # date | kind | category | amount | memo | budget:<カテゴリ名>
      message: string
```

画面の部品は `code` ごとに表示を決めます。失敗の表示は、その画面を持つ Unit が作ります（Q4）。登録は U1・U2、予算保存は U3、取り込みは U4 が担当します。

## C2 保存データの形と DataStore

U1 の時点から、保存データの全項目を持ちます。予算が空でも項目自体は持ちます（作業単位の分割のレビュー R-03）。保存は全体をまとめて1回で行い、通し番号を照合します（Q3）。版番号の扱いは Q2 のとおりです。

```yaml
# shared-schema: StoreSnapshot (schemaVersion 1)
StoreSnapshot:
  schemaVersion: 1          # 整数。今の版は 1
  revision: integer         # 保存のたびに 1 ずつ増える通し番号。最初は 0
  savedAt: string           # 保存した時刻（ISO 8601）
  entries: Entry[]          # 明細（持ち主は Ledger）
  budgets: MonthlyBudget[]  # 月別予算（持ち主は Budget）。U1 では空の配列
Entry:
  entryId: string           # アプリが付ける一意の ID
  date: string              # YYYY-MM-DD
  kind: { enum: [収入, 支出] }
  category: string          # CategoryCatalog のカテゴリ名
  amount: integer           # 1〜9,999,999（円）
  memo: string              # 前後の空白を除いたもの。0〜100文字（見える1文字で数える）。改行なし
  addedOrder: integer       # 追加した順の通し番号（同じ日付の並び順に使う）
MonthlyBudget:
  budgetKey: string         # "<YYYY-MM>:<カテゴリ名>"
  month: string             # YYYY-MM
  category: string          # 支出カテゴリ名
  amount: integer           # 0〜9,999,999（円）。未設定は項目なし
```

```yaml
# shared-schema: DataStore API
DataStore:
  load():                       # 起動時に1回
    returns: Result<LoadOutcome>
  LoadOutcome:
    oneOf:
      - status: empty           # 保存データがまったくない（初回）
      - status: ready
        snapshot: StoreSnapshot
      - status: unreadable      # 壊れている・知らない新しい版。データは消さない
        reason: string
  getSnapshot():                # 今読み込んでいる内容（読み取り専用の写し）
    returns: StoreSnapshot | null
  commit(change: SnapshotChange):   # 保存の唯一の入口
    behaviour: >
      今の snapshot に change を当てた新しい snapshot を作り、保存直前に保存領域の revision を読み直して
      expectedRevision と比べる。違えば保存せず STALE_REVISION を返し、最新を読み込み直して購読者に知らせる。
      同じなら revision を 1 増やして全体を1回で書く。書き込みに失敗したら STORAGE_WRITE を返し、
      読み込んでいる内容は変えない。状態が unreadable なら何もせず STORE_UNREADABLE を返す。
    returns: Result<StoreSnapshot>
  SnapshotChange:
    expectedRevision: integer
    entriesToAdd: Entry[]           # Ledger が組み立てる（既存の明細は消さない）
    budgetsToReplace:               # Budget が組み立てる（指定した月の予算を丸ごと置き換える）
      month: string
      budgets: MonthlyBudget[]
    initialize: StoreSnapshot       # SampleDataSeeder 専用。状態が empty のときだけ受け付ける
  subscribe(listener):              # 状態の変化を知らせる
    events:
      - type: externalChange        # 別のタブが保存した。最新を読み込み済み
      - type: unreadable            # 保存データが読めなくなった
```

- スナップショットの組み立ては DataStore が受け持ちます。そのため、明細の保存が予算を消したり、予算の保存が明細を消したりすることはありません（ドメイン設計レビュー R-01）。
- 古い版を今の形へ直す処理は、読み込み時に DataStore が行います（Q2）。版 1 しかないうちは、この処理は空です。
- U5 は、版の検査、壊れたデータの検出、別タブの検知（購読）、通し番号の照合を強化します。ただし、この型と関数の形は変えません。U1 では照合と全体保存の基本だけを作ります。

## C3 Ledger

```yaml
# shared-schema: Ledger API
Ledger:
  validate(input: EntryInput):      # 保存しない規則の判定。画面と CSV の両方が使う（ドメイン設計レビュー R-04）
    returns: Result<Entry without entryId/addedOrder>
  add(input: EntryInput):           # 1件の登録
    returns: Result<Entry>
  addMany(inputs: EntryInput[]):    # 取り込み用。全件を validate 済みであること。1回の commit で全部か無か
    returns: Result<Entry[]>
  listByMonth(month: string):       # 日付の新しい順、同じ日付は addedOrder の大きい順
    returns: Entry[]
  listAll():                        # 日付の古い順（CSV 出力用）
    returns: Entry[]
  findSame(candidates: EntryInput[]):   # 日付・区分・カテゴリ・金額・メモがすべて一致する既存の明細の数を、候補ごとに返す
    returns: integer[]
EntryInput:
  date: string
  kind: string
  category: string
  amount: string | integer          # 画面の文字列も CSV の値も受け取り、validate で整数にする
  memo: string
```

U1 では `validate` の最小限の判定（必須項目、金額が整数）を作り、U2 で規則をすべて実装します。呼び出しの形は変えません。

## C4 Budget

```yaml
# shared-schema: Budget API
Budget:
  getMonth(month: string):
    returns: MonthlyBudget[]          # 設定のあるカテゴリだけ
  saveMonth(month: string, values: { <支出カテゴリ名>: string }):
    behaviour: 空欄は未設定。1つでも規則違反なら何も保存せず VALIDATION（fieldErrors に budget:<カテゴリ名>）
    returns: Result<MonthlyBudget[]>
  previewCopy(month: string):         # 前の月 = 表示中の月の1か月前（C6 から受け取った month をもとに Budget が計算）
    returns: Result<{ source: MonthlyBudget[], targetHasBudgets: boolean }>   # 前の月に予算がなければ NOT_FOUND
  copyFromPrevious(month: string):    # 呼ぶ前に、targetHasBudgets が true なら利用者の確認を取る
    returns: Result<MonthlyBudget[]>
```

「前の月」は、表示中の月をもとに Budget が計算します（作業単位の分割のレビュー R-05）。表示中の月そのものは AppShell が持ちます（C6）。

## C5 MonthlySummary

```yaml
# shared-schema: MonthlySummary API
MonthlySummary:
  summarize(month: string):
    returns: MonthSummary
MonthSummary:
  month: string
  incomeTotal: integer
  expenseTotal: integer
  difference: integer               # incomeTotal - expenseTotal（負もありうる）
  categories:                       # 支出カテゴリ8つを CategoryCatalog の順で
    - category: string
      actual: integer
      budget: integer | null        # null は未設定。U1 では常に null
      remaining: integer | null     # budget が null なら null
      over: boolean                 # budget が null なら false
```

カテゴリ別の `actual` の合計は、必ず `expenseTotal` と一致します（AC3.1.5）。

## C6 画面に伝える状態（AppShell）

```yaml
# shared-schema: AppState
AppState:
  selectedMonth: string             # YYYY-MM。開いた日を含む月で始まる。「今日」は AppShell が1か所で決める
  storeStatus: { enum: [ready, unreadable] }
  lastExternalChangeAt: string | null
AppShell:
  getState(): AppState
  selectMonth(month: string): void  # 登録した明細の月への切り替えにも使う（US1.3）
  subscribe(listener): void         # AppState が変わったら知らせる
```

- 画面部品（EntryFormView、ReviewView、ExportView、NoticeBannerView）は、AppShell の購読で状態を受け取ります（ドメイン設計レビュー R-02）。
- `storeStatus` が `unreadable` のときは、登録・予算保存・取り込みを押せない状態にし、理由を表示します。
- 別のタブで変更があったら、画面は最新を表示し直します。確認待ちの途中状態（予算の上書き確認、取り込みの重複確認）は捨て、そのことを知らせます。
- 「今日」は AppShell が1か所で決めて、SampleDataSeeder にも渡します（ドメイン設計レビュー R-03）。

## C7 CsvExchange

```yaml
# shared-schema: CsvExchange API
CsvExchange:
  exportAll():                      # U1
    returns: Result<{ fileName: string, content: Uint8Array }>   # 0件なら NOT_FOUND
  prepareImport(file: { name: string, bytes: Uint8Array }):   # U4
    behaviour: ファイル全体の確認 → 行ごとの validate → findSame で重複を数える。まだ保存しない
    returns: Result<ImportPreview>  # ファイル全体を断るときは FILE_REJECTED
  commitImport(preview: ImportPreview, choice: { enum: [skipDuplicates, addAll] }):   # U4
    returns: Result<ImportReport>
ImportPreview:
  importId: string
  validRows: EntryInput[]
  rejectedRows: [{ line: integer, reason: string }]
  duplicateCount: integer
ImportReport:
  importId: string
  addedCount: integer
  rejectedRows: [{ line: integer, reason: string }]
  duplicateCount: integer           # 重複として除いた件数（addAll なら 0）
```

取り込みの確認待ちの途中状態（`ImportPreview`）は、CsvExchange が返して ExportView が持ちます。利用者が「取り込みをやめる」を選んだら捨てます（作業単位の分割のレビュー R-04 に関連）。

## C8 CSV ファイルの形式

```yaml
# shared-schema: CSV file (budget-entries)
encoding: UTF-8                     # 出力は BOM 付き。取り込みは BOM の有無どちらも可
lineEnding: CRLF                    # 取り込みは CRLF・LF どちらも可
header: [日付, 区分, カテゴリ, 金額, メモ]
fileName: budget-entries-YYYYMMDD.csv
columns:
  日付: YYYY-MM-DD
  区分: { enum: [収入, 支出] }
  カテゴリ: CategoryCatalog のカテゴリ名
  金額: 半角数字のみ、区切りなし、1〜9999999
  メモ: 0〜100文字、改行なし
quoting: カンマ・ダブルクォートを含む値はダブルクォートで囲み、中の " は "" にする
formulaGuard: 先頭が = + - @ ' タブ 改行のメモは、出力時に先頭へ ' を1つ付け、取り込み時に先頭の ' を1つ外す
limits: { maxBytes: 5MB, maxDataRows: 10000 }
trimming: 取り込み時、すべての値の前後の空白を除く（メモも含む）
emptyLines: 無視し、件数に数えない
fileRejectedWhen: [見出しが違う, UTF-8 として読めない, 閉じていない引用符, データ行なし, 上限超え]
rowRejectedWhen: [列数が5でない, 日付・区分・カテゴリ・金額・メモが規則違反, 区分とカテゴリが合わない]
```

## C9 初回のサンプル投入

```yaml
# shared-schema: SampleDataSeeder API
SampleDataSeeder:
  seedIfEmpty(today: string):       # AppShell が load() の結果 empty のときだけ呼ぶ
    behaviour: >
      今日を含む直近3か月分の架空の明細と予算を組み立て、明細は Ledger.validate で確かめ、
      DataStore.commit({ initialize: snapshot }) の1回で保存する（全部か無か）。
      状態が empty でなければ何もしない。保存に失敗したら何も残らず、次回の起動でもう一度試す。
    returns: Result<StoreSnapshot>
```

サンプルは明細と予算を1回の保存で入れます（ドメイン設計レビュー R-03）。U5 は Budget（U3）の関数を使いません。予算は C2 の `MonthlyBudget` の形で直接組み立てます。そのため、作業単位の分割のレビュー R-01（U5 が U3・U4 に依存する）はこの形で解消でき、U5 の依存先は U1 のままで済みます。

## 約束ごとの変え方

- 各約束ごとの持ち主は、上の一覧の「持ち主」です。形を変えるときは、持ち主の Unit の作業として、使う側の Unit の担当と合意します（並行作業の場合は、ブランチを `feat/budget-manager-app` へ戻す前に確認します）。
- 項目を足すだけの変更は互換とみなします。使う側は、知らない項目を無視します。
- 項目の削除・名前変更・意味の変更は、互換のない変更です。この資料を直し、依頼者の承認を得てから行います。
- 保存データ（C2）の形を変えるときは `schemaVersion` を上げ、古い版を読み込み時に直す処理を足します（Q2）。
- CSV の形式（C8）を変えるときは、出力したファイルを取り込み直せることを必ずテストで確かめます。

## 未解決の点

| 約束ごと | 質問 | 止めるもの |
|----------|------|------------|
| C2 | ブラウザの保存領域が使えない環境（プライベートブラウズ等）で、起動時にどう知らせるか | U5（機能設計で決める） |
| C2 | 保存領域の容量が足りないとき、どの程度の明細数で起きるかの目安 | U5（NFR 要件で確かめる） |
| C6 | 確認待ちの途中状態を捨てたことの知らせの文言 | U3・U4（機能設計で決める） |
