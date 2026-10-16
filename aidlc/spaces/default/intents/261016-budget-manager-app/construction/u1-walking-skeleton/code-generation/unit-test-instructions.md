# 単体テストの手順 — U1 薄い版（u1-walking-skeleton）

## テストの仕組みと設定

| 項目 | 内容 |
|------|------|
| 単体テスト | Vitest（`app/vitest.config.ts`）。画面部品は jsdom と Testing Library（React） |
| カバレッジ | Vitest のカバレッジ計測（v8）。`app/src` の行カバレッジ 80% を下限として設定する。`src/ui/main.tsx`（ブラウザで画面を起動するだけのファイル）だけを計測から外す |
| ブラウザ操作のテスト | Playwright（`app/playwright.config.ts`）。Chromium・Firefox・WebKit。webServer がビルド済みのページを `127.0.0.1:4174` で配信する |
| 置き場所 | 単体テストは `app/tests/unit/`、ブラウザ操作のテストは `app/tests/e2e/u1-walking-skeleton/` |
| テスト戦略 | Standard（部品ごとに 5〜8 件。主要な境目の結合を確かめる） |

## U1 のテストの実行（U1 のファイルだけに絞ったコマンド）

すべて `app/` の中で実行します。

最初のテストを動かす前に、部品を取得します。

```bash
cd app && npm ci
```

U1 の単体テスト（U1 で作るテストファイルだけを指定）:

```bash
cd app && npx vitest run tests/unit/domain/categoryCatalog.test.ts tests/unit/domain/format.test.ts tests/unit/domain/month.test.ts tests/unit/store/dataStore.test.ts tests/unit/domain/ledger.test.ts tests/unit/domain/monthlySummary.test.ts tests/unit/domain/csvExchange.test.ts tests/unit/ui/EntryFormView.test.tsx tests/unit/ui/ReviewView.test.tsx tests/unit/ui/ExportView.test.tsx tests/unit/ui/AppShell.test.tsx
```

U1 の単体テストとカバレッジ（行カバレッジ 80% の下限つき）:

```bash
cd app && npx vitest run --coverage tests/unit/domain/categoryCatalog.test.ts tests/unit/domain/format.test.ts tests/unit/domain/month.test.ts tests/unit/store/dataStore.test.ts tests/unit/domain/ledger.test.ts tests/unit/domain/monthlySummary.test.ts tests/unit/domain/csvExchange.test.ts tests/unit/ui/EntryFormView.test.tsx tests/unit/ui/ReviewView.test.tsx tests/unit/ui/ExportView.test.tsx tests/unit/ui/AppShell.test.tsx
```

U1 のブラウザ操作のテスト（ビルドしてから）:

```bash
cd app && npm run build && npx playwright test tests/e2e/u1-walking-skeleton
```

Playwright のブラウザ本体は、初回だけ `cd app && npx playwright install` で取得します。

Step 2 で最初のテスト（`tests/unit/domain/categoryCatalog.test.ts` の1件）を置いた時点で、上の単体テストのコマンドからそのファイルだけを指定して動くことを確かめます。

## 部品ごとのテストの数と内容

| テストファイル | 件数 | 主な内容 |
|----------------|------|----------|
| `domain/categoryCatalog.test.ts` | 5 | 一覧・並び順・区分の一致 |
| `domain/format.test.ts` | 6 | 金額・負の差額・月名・知らせの日付 |
| `domain/month.test.ts` | 5 | 今日の月・前後の月・年またぎ |
| `store/dataStore.test.ts` | 8 | empty・ready・unreadable・アクセス失敗・commit・STALE_REVISION・STORAGE_WRITE・STORE_UNREADABLE |
| `domain/ledger.test.ts` | 8 | 規則（BR1.1〜BR1.4）・採番・並び順・保存失敗 |
| `domain/monthlySummary.test.ts` | 7 | 集計・負の差額・合計の一致・最大値・未設定・性能 |
| `domain/csvExchange.test.ts` | 8 | 0件・BOM・CRLF・見出し・並び順・囲み・ファイル名・性能 |
| `ui/EntryFormView.test.tsx` | 8 | 表示・選択肢・成功・誤り・保存失敗・別タブ・無効・文字のまま |
| `ui/ReviewView.test.tsx` | 6 | 集計・負・月の切り替え・未設定・知らせで再表示・読めない |
| `ui/ExportView.test.tsx` | 5 | 説明・0件・ダウンロード・無効・知らせ |
| `ui/AppShell.test.tsx` | 5 | 起動の月・3つの読み込み結果・差し込み口・Error Boundary |

合計 約 71 件（単体テスト）。部品の境目（画面 → Ledger → DataStore）の結合は、画面部品のテストで本物の Ledger・DataStore と偽の localStorage を使って確かめます。

## 目標のカバレッジ

- `app/src` の行カバレッジ 80% 以上（NFR7.2、team-practices.md）。下限を下げて通すことはしない。

## 偽物（モック）の使い方

| 対象 | 方法 |
|------|------|
| localStorage | テストごとに作り直す偽の保存領域（Map を使う）を渡す。書き込みの失敗は、setItem が QuotaExceededError を投げる偽物で再現する。アクセス自体の失敗は、getItem が SecurityError を投げる偽物で再現する |
| 今日の日付 | AppShell と exportAll に渡す「今日」をテストで固定する（vi.useFakeTimers は使わず、引数で渡す） |
| ダウンロード | ExportView のテストでは、ダウンロードを行う関数を差し替えて、呼ばれた内容とファイル名を確かめる |
| 別のタブの書き込み | DataStore のテストで、偽の保存領域の通し番号を直接書き換えて再現する |

## テストのデータ

- すべて架空の明細を、テストの中で決まった規則で作る（実在の人物・口座・店舗の名前を使わない。NFR3.4）。
- 性能のテストでは、3,000 件・1か月 100 件の明細を作る関数を `tests/unit/support/` と `tests/e2e/support/` に置く。
- テストどうしで保存データを共有しない。各テストの前に保存領域を空にする。
