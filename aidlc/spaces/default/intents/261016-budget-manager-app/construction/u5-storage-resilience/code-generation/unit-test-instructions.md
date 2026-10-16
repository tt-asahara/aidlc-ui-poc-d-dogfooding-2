# 単体テストの手順 — U5 保存の異常・別タブ対応・サンプル（u5-storage-resilience）

## テストの仕組みと設定

U1 で用意したものをそのまま使います（`app/vitest.config.ts`、`app/playwright.config.ts`）。設定は変えません。

| 項目 | 内容 |
|------|------|
| 単体テスト | Vitest。画面部品は jsdom と Testing Library（React） |
| カバレッジ | `app/src` の行カバレッジ 80% の下限（U1 の設定のまま） |
| ブラウザ操作のテスト | Playwright（Chromium・Firefox・WebKit）。webServer が `127.0.0.1:4174` でビルド済みのページを配信する |
| 置き場所 | 単体テストは `app/tests/unit/`、ブラウザ操作のテストは `app/tests/e2e/u5-storage-resilience/` |
| テスト戦略 | Standard（部品ごとに 5〜8 件程度。境目の結合を確かめる） |

## U5 のテストの実行（U5 のファイルだけに絞ったコマンド）

すべて `app/` の中で実行します。部品は U1 で取得済みです（`cd app && npm ci`）。

U5 の単体テスト:

```bash
cd app && npx vitest run tests/unit/domain/validateSnapshot.test.ts tests/unit/domain/ledgerIdentities.test.ts tests/unit/store/dataStore.u5.test.ts tests/unit/domain/sampleDataSeeder.test.ts tests/unit/ui/NoticeBannerView.test.tsx tests/unit/ui/AppShell.u5.test.tsx
```

U5 のブラウザ操作のテスト（ビルドしてから）:

```bash
cd app && npm run build && npx playwright test tests/e2e/u5-storage-resilience
```

U1 のテストが通り続けていることと、行カバレッジ 80% 以上は、承認済みの確認コマンドで確かめます（`npm --prefix app run verify`。リポジトリ直下から実行）。

## 部品ごとのテストの数と内容

| テストファイル | 件数 | 主な内容 |
|----------------|------|----------|
| `domain/validateSnapshot.test.ts` | 8 | 正しい形、型・範囲・実在しない日付・区分とカテゴリ・重なり・budgetKey、理由の文に値なし、3,000 件の時間 |
| `domain/ledgerIdentities.test.ts` | 5 | 入力の順の番号、既存の続き、重ならない ID、空、U1 の add と同じ結果 |
| `store/dataStore.u5.test.ts` | 9 | 壊れた形、アクセス失敗と unavailable、読み取りだけの失敗、storage イベントの4つの場合、unreadable 中の無視、ほかのキー、dispose |
| `domain/sampleDataSeeder.test.ts` | 7 | 3か月・1回の保存、件数、未来日なし、予算と超過、メモの一覧、2回目は断られる、書き込みの失敗 |
| `ui/NoticeBannerView.test.tsx` | 6 | 何もない、読めない、保存できない、別のタブ、優先順、閉じる |
| `ui/AppShell.u5.test.tsx` | 6 | 初回のサンプル、投入後の読み直し、unavailable、別のタブの知らせ、committed で消える、閉じたあとの操作位置 |

合計 約 41 件（単体テスト）。部品の境目（AppShell → SampleDataSeeder → Ledger → DataStore）の結合は、AppShell のテストで本物の部品と偽の localStorage を使って確かめます。

## 目標のカバレッジ

- `app/src` の行カバレッジ 80% 以上（U1 の設定のまま。下限を下げて通すことはしない）。

## 偽物（モック）の使い方

| 対象 | 方法 |
|------|------|
| localStorage | U1 の `tests/unit/support/fakeStorage.ts` を使う。アクセスの失敗は getItem・setItem が SecurityError を投げる偽物、読み取りだけの失敗は getItem だけが投げる偽物で再現する |
| storage イベント | jsdom で `new StorageEvent('storage', { key, newValue, storageArea })` を window に送る。storageArea には DataStore に渡した偽の保存領域を使い、ほかの保存領域の例も用意する |
| 今日の日付 | seedIfEmpty と AppShell に渡す「今日」を固定する。月の1日・月末・1月（年またぎ）の例を用意する |
| 2つのタブ（ブラウザ操作） | Playwright の同じコンテキストで2つのページを開く |

## テストのデータ

- すべて架空の明細を、テストの中で決まった規則で作る（実在の名前を使わない）。
- 壊れた保存データの例は、項目ごとに1か所だけを壊した保存データを作る。
- テストごとに保存領域を空にし、DataStore を dispose する。
