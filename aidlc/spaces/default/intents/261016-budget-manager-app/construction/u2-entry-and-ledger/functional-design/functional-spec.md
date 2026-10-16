# 機能の仕様 — U2 登録の検証と明細一覧（u2-entry-and-ledger）

## 入力と前提

- Unit の定義: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md`（U2。U5 に依存する）
- ストーリー: US1.2（AC1.2.1〜AC1.2.5）、US1.3（AC1.3.1、AC1.3.2）、US2.1（AC2.1.1〜AC2.1.4）。U1 から持ち越した AC1.1.4〜AC1.1.6
- 約束ごと: `aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md`（C1 の VALIDATION と fieldErrors、C3 の Ledger）
- 実装済みの部品: `app/src/domain/ledger.ts`、`app/src/ui/EntryFormView.tsx`、`app/src/ui/ReviewView.tsx`、`app/src/ui/AppShell.tsx`（U1・U5）
- 画面の証跡: `inception/refined-mockups/ui-poc-refined-contract.md`（SCREEN-REGISTER の STATE-VALIDATION-ERROR・STATE-OTHER-MONTH、SCREEN-LEDGER の STATE-POPULATED・STATE-EMPTY）、`interaction-spec.md`（登録フォーム、明細の一覧）、`assets/refined-mockup.html`
- このステージの回答: `functional-design-questions.md`（Q1・Q2、まとめの確認済み）
- 規則: `rules.md`（BR1.1〜BR4.1。この資料の規則の一覧はそこから写したもの）

この資料は、U2 の動きの手順と状態の移り変わりの正本です。

## U2 で足すこと

| 内容 | 部品 | U1・U5 からの変化 |
|------|------|-------------------|
| 規則の仕上げ（BR1.1〜BR1.4） | Ledger.validate | U1 の最小限の判定に、日付の実在、メモの見える1文字の数え方、詳しい理由の文を足す。呼び出しの形（C3）と返す形（C1）は変えない |
| 欄ごとの誤りの表示（BR1.5、BR1.6） | EntryFormView | U1 のまとめの表示は残し、欄の下の表示を足す |
| 二重送信の防止（BR1.7） | EntryFormView | 処理中の状態を足す |
| 別の月への切り替え（BR2.1） | EntryFormView、AppShell | 登録の成功のあとで、明細の月を AppShell に伝える |
| 明細の一覧（BR3.1〜BR3.5） | ReviewView（一覧の部分を新しい部品 LedgerList に分ける） | U1 の置き場所に作る |

メモの数え方（見える1文字。Intl.Segmenter）と日付の実在の判定は、U5 の保存データの検査（validateSnapshot）と同じものにそろえます。どちらも `app/src/domain` の下の1か所に置き、Ledger.validate、validateSnapshot、登録フォームのメモ欄から使います。

## 手順（ワークフロー）

### W1 登録（誤りあり）

1. 利用者が「登録する」を押す（または Enter）。
2. EntryFormView は、同期の鍵（ref）が立っていれば、この操作を何もせずに捨てる（検証も保存もせず、表示も変えない）。立っていなければ鍵を立て、300 ミリ秒後に外す予約をし、「登録する」を disabled で表示する（BR1.7）。
3. Ledger.add が Ledger.validate を呼ぶ。誤りがあれば VALIDATION と fieldErrors（欄ごとの理由）を返す（BR1.1〜BR1.4）。
4. EntryFormView は次のようにする（BR1.5）。
   - お知らせ枠に、まとめ（「入力を確かめてください: 日付、金額」）を alert で出す。
   - 誤りのある各欄の下に理由を出し、aria-invalid と aria-describedby を付ける。
   - 最初の誤りの欄へ操作位置を移す。入力は残す。
5. 鍵は、手順 2 の予約どおり 300 ミリ秒後に外れる（処理の終わりでは外さない）。

### W2 登録（成功）

1. W1 の手順 1〜3 と同じ。誤りがなければ、Ledger が保存する（U1 のまま）。
2. EntryFormView は、まとめと欄ごとの誤りの表示をすべて消す（BR1.6）。
3. 登録した明細の月が表示中の月と違えば、AppShell.selectMonth(明細の月) を呼び、知らせを「N月の明細として登録しました M月D日 カテゴリ ¥金額」にする。明細の年が表示中の年と違うときは「YYYY年N月の明細として…」と年を付ける。同じ月なら「登録しました M月D日 カテゴリ ¥金額」（BR2.1）。
4. 区分と日付を残し、金額とメモを空にして、金額欄へ操作位置を移す（U1 のまま）。
5. 鍵は 300 ミリ秒後に外れる。それまでの2回目の操作は捨てられるため、空の金額で検証されて成功の知らせが誤りに置き換わることはない（AC1.1.4）。
6. ReviewView は、保存の知らせ（committed）と表示月の変化で、集計と一覧を読み直す。

### W3 登録（保存の失敗）

U1 のまま（STORAGE_WRITE、STALE_REVISION、STORE_UNREADABLE の表示）。処理中は、結果が出たら解く。

### W4 メモの入力

メモ欄は1行の input（type=text）のままにし、maxLength は外します（maxLength は見える1文字ではなく UTF-16 の単位で数えるため、絵文字を含むと 100 文字より前で止まる）。

1. 利用者がメモ欄に入力する。
2. 日本語の変換中（compositionstart から compositionend まで）は、値をそのまま受け取り、数えない。
3. 変換中でない入力（change）と、変換の確定（compositionend）のたびに、前後の空白を除いた値を見える1文字で数える（Ledger.validate と同じ関数）。100 文字を超えていたら、値を先頭から見える1文字で 100 文字に切り詰め、欄の下に「メモは 100 文字までです」を出す（BR1.4）。
4. Enter は登録の操作になる（1行の input のため、改行は打てない）。
5. 貼り付け（paste）のとき、貼り付ける文字に CR か LF が含まれていれば、貼り付けを取り消し（preventDefault）、欄の下に「メモに改行は使えません」を出す。値は変えない。
6. 次の正しい入力で 100 文字以下になったら、欄の下の文を消す。

### W5 明細の一覧の表示

1. ReviewView は、表示中の月を Ledger.listByMonth(月) に渡し、明細を受け取る（BR3.1）。
2. 明細があれば、表（caption「2026年10月の明細（新しい順）」）に行を出す（BR3.2〜BR3.4）。
3. 明細がなければ、表の代わりに案内文を出す（BR3.5）。
4. 保存の知らせ（committed、externalChange）と、表示月の変化で読み直す。保存データが読めない（unreadable）ときは、U1 の集計と同じく、一覧の代わりに理由を出す。

## 状態の移り変わり（登録フォーム）

```mermaid
stateDiagram-v2
  [*] --> default
  default --> submitting: 「登録する」または Enter
  submitting --> submitting: 鍵がある間（300 ミリ秒）の2回目の操作（捨てる）
  submitting --> success: 保存の成功（同じ月）
  submitting --> otherMonth: 保存の成功（別の月）
  submitting --> invalid: VALIDATION
  submitting --> storageError: STORAGE_WRITE または STALE_REVISION
  submitting --> disabled: STORE_UNREADABLE
  invalid --> submitting: 直して「登録する」
  success --> submitting: 「登録する」
  otherMonth --> submitting: 「登録する」
  storageError --> submitting: 「登録する」
  default --> disabled: storeStatus が unreadable
```

<!-- Text fallback: default から登録の操作で submitting。処理中の2回目は無視。成功は同じ月なら success、別の月なら otherMonth、入力の誤りは invalid、保存の失敗は storageError、読めない保存データは disabled。どの状態からも登録の操作で submitting に戻る。 -->

## 規則の一覧（`rules.md` から写したもの）

| ID | 内容 |
|----|------|
| BR1.1〜BR1.4 | 金額・日付・区分とカテゴリ・メモの規則 |
| BR1.5 | 誤りのまとめと欄ごとの直し方、最初の誤りの欄へ |
| BR1.6 | 直して登録したら誤りの表示を消す |
| BR1.7 | 処理中は押せない（二重送信の防止） |
| BR2.1 | 別の月なら表示を切り替えて月を付けて知らせる |
| BR3.1〜BR3.5 | 一覧の並び、列、メモ、操作なし、空の月 |
| BR4.1 | サンプルの全件が U2 の規則を通る |

## 画面の証跡との対応（詳細モックアップの UI 契約）

| 画面 | 状態 | 受け入れ条件 | U2 での扱い |
|------|------|--------------|-------------|
| SCREEN-REGISTER | STATE-VALIDATION-ERROR | AC1.2.1 | 実装する（BR1.5） |
| SCREEN-REGISTER | STATE-OTHER-MONTH | AC1.3.1 | 実装する（BR2.1） |
| SCREEN-LEDGER | STATE-POPULATED | AC2.1.1 | 実装する（BR3.1〜BR3.4） |
| SCREEN-LEDGER | STATE-EMPTY | AC2.1.4 | 実装する（BR3.5） |

## 受け入れ条件の確かめ方（U2 の分）

| 受け入れ条件 | 確かめ方 |
|--------------|----------|
| AC1.1.4 | 画面部品の単体テストとブラウザ操作のテストで、「登録する」を素早く2回押しても明細が1件だけ増え、成功の知らせが残り、誤りの表示が出ないことを確かめる |
| AC1.1.5 | 一覧で `<b>太字</b>` が文字のまま表示されることを確かめる |
| AC1.1.6 | 一覧の行に操作のボタンやリンクがないことを確かめる |
| AC1.2.1〜AC1.2.3 | Ledger.validate の単体テスト（境界の値、存在しない日付）と、画面の欄ごとの表示のテスト |
| AC1.2.4 | 絵文字を含むメモで 100 文字を超えて入力できないことと、改行が入らないことを確かめる |
| AC1.2.5 | 誤りを直して登録すると、誤りの表示が消えることを確かめる |
| AC1.3.1、AC1.3.2 | 別の月と同じ月の日付で登録し、表示月と知らせを確かめる |
| AC2.1.1、AC2.1.3、AC2.1.4 | 一覧の並び順、金額の表示、空の月の案内を確かめる |

ほかの Unit で確かめる受け入れ条件: AC2.1.2（CSV の取り込みの行の順）は U4。
