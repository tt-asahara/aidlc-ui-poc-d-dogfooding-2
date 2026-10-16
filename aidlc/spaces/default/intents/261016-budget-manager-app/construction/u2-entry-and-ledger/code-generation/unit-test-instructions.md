# 単体テストの手順 — U2 登録の検証と明細一覧（u2-entry-and-ledger）

## テストの仕組みと設定

U1 で用意したものをそのまま使います（`app/vitest.config.ts`、`app/playwright.config.ts`）。設定は変えません。

| 項目 | 内容 |
|------|------|
| 単体テスト | Vitest。画面部品は jsdom と Testing Library（React） |
| カバレッジ | `app/src` の行カバレッジ 80% の下限（U1 の設定のまま） |
| ブラウザ操作のテスト | Playwright（Chromium・Firefox・WebKit）。webServer が `127.0.0.1:4174` でビルド済みのページを配信する |
| 置き場所 | 単体テストは `app/tests/unit/`、ブラウザ操作のテストは `app/tests/e2e/u2-entry-and-ledger/` |
| テスト戦略 | Standard |

## U2 のテストの実行（U2 のファイルだけに絞ったコマンド）

すべて `app/` の中で実行します。部品は取得済みです（`cd app && npm ci`）。

U2 の単体テスト:

```bash
cd app && npx vitest run tests/unit/domain/textRules.test.ts tests/unit/domain/ledgerRules.test.ts tests/unit/ui/EntryFormView.u2.test.tsx tests/unit/ui/LedgerList.test.tsx
```

U2 のブラウザ操作のテスト（ビルドしてから）:

```bash
cd app && npm run build && npx playwright test tests/e2e/u2-entry-and-ledger
```

U1・U5 のテストが通り続けていることと、行カバレッジ 80% 以上は、承認済みの確認コマンドで確かめます（`npm --prefix app run verify`。リポジトリ直下から実行）。

## 部品ごとのテストの数と内容

| テストファイル | 件数 | 主な内容 |
|----------------|------|----------|
| `domain/textRules.test.ts` | 8 | 日付の実在（うるう年、0050 年）、絵文字の数え方、長さ 100 以下の近道、切り詰め、1 万文字 |
| `domain/ledgerRules.test.ts` | 9 | 金額・日付・メモの境界、理由の文、fieldErrors の順、サンプル全件、validateSnapshot との一致 |
| `ui/EntryFormView.u2.test.tsx` | 10 | 欄ごとの誤りとまとめ、消える、送信の鍵の境目、メモの切り詰め・変換中・改行の貼り付け、別の月 |
| `ui/LedgerList.test.tsx` | 6 | 並び順、金額、文字のまま、操作なし、案内文、表の構造 |
| U1 の `ui/EntryFormView.test.tsx` | 1 件を置き換え | メモ欄の maxLength の確かめを、値の切り詰めの確かめに置き換える |

合計 約 36 件（単体テスト。置き換えの1件を含む）。

## 目標のカバレッジ

- `app/src` の行カバレッジ 80% 以上（U1 の設定のまま。下限を下げて通すことはしない）。

## 偽物（モック）と時計の使い方

| 対象 | 方法 |
|------|------|
| 時計（送信の鍵） | `vi.useFakeTimers()` を使い、`fireEvent` で操作し、`act(() => vi.advanceTimersByTime(299))` のように進める。`waitFor` と、既定の遅延つきの `userEvent` は使わない。テストの終わりに `vi.useRealTimers()` に戻す |
| 日本語の変換 | `fireEvent.compositionStart`、`fireEvent.change`、`fireEvent.compositionEnd` を順に送る |
| 改行の貼り付け | `fireEvent.paste` に、`clipboardData.getData('text')` が改行を含む文字を返す事象を渡す |
| localStorage | U1 の `tests/unit/support/fakeStorage.ts` を使う |
| 月の切り替え | onSelectMonth を偽の関数にして、呼ばれた月を確かめる |

## テストのデータ

- すべて架空の明細を、テストの中で決まった規則で作る。
- 絵文字の例には、結合した家族の絵文字（👨‍👩‍👧‍👦）と肌の色の違い（👍🏽）を使う。
- 切り詰めの例は「先頭の空白 + 空白を除いて 101 文字」とし、期待は「100 文字に切り詰め、欄の下に『メモは 100 文字までです』」。
