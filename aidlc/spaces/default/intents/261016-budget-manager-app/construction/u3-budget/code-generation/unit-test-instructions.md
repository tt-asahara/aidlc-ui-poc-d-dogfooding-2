# 単体テストの手順 — U3 月別予算と予算比較（u3-budget）

## テストの仕組みと設定

U1 で用意したものをそのまま使います（`app/vitest.config.ts`、`app/playwright.config.ts`）。設定は変えません。

| 項目 | 内容 |
|------|------|
| 単体テスト | Vitest。画面部品は jsdom と Testing Library（React） |
| カバレッジ | `app/src` の行カバレッジ 80% の下限（U1 の設定のまま） |
| ブラウザ操作のテスト | Playwright（Chromium・Firefox・WebKit）。webServer が `127.0.0.1:4174` でビルド済みのページを配信する |
| 置き場所 | 単体テストは `app/tests/unit/`、ブラウザ操作のテストは `app/tests/e2e/u3-budget/` |
| テスト戦略 | Standard |

## U3 のテストの実行（U3 のファイルだけに絞ったコマンド）

リポジトリ直下から実行します（U2 で、`npm --prefix app run test:unit -- <ファイル>` の形が app の Vitest の設定を読むことを確かめ済み）。

U3 の単体テスト:

```bash
npm --prefix app run test:unit -- tests/unit/domain/budget.test.ts tests/unit/ui/BudgetTable.test.tsx tests/unit/ui/AppShell.u3.test.tsx
```

U3 のブラウザ操作のテスト（ビルドしてから）:

```bash
npm --prefix app run build && npm --prefix app run e2e -- tests/e2e/u3-budget
```

U1・U5・U2 のテストが通り続けていることと、行カバレッジ 80% 以上は、承認済みの確認コマンドで確かめます（`npm --prefix app run verify`）。

## 部品ごとのテストの数と内容

| テストファイル | 件数 | 主な内容 |
|----------------|------|----------|
| `domain/budget.test.ts` | 12 | 保存と境界、未設定、1つの誤りで保存しない、支出カテゴリだけ、明細とほかの月が変わらない、validateSnapshot、コピー元なし、上書きの判断、まるごと置き換え、年またぎ、保存の失敗 |
| `ui/BudgetTable.test.tsx` | 14 | 表示（予算・超過・未設定・収入なし）、保存、誤り、確認の枠、dirty の確認、コピー元なし、失敗で入力が残る、コピーの失敗、別のタブ、ほかの部品の保存、月の切り替え、読めない状態 |
| `ui/AppShell.u3.test.tsx` | 4 | 本物の DataStore での STALE_REVISION と無視の印、次の別タブの変更、番号の増え方、予算の差し込み口 |

合計 約 30 件（単体テスト）。

## 目標のカバレッジ

- `app/src` の行カバレッジ 80% 以上（U1 の設定のまま。下限を下げて通すことはしない）。

## 偽物（モック）の使い方

| 対象 | 方法 |
|------|------|
| localStorage | U1 の `tests/unit/support/fakeStorage.ts`。STORAGE_WRITE は setItem が投げる偽物、別のタブの先行は偽の保存領域の revision を直接書き換えて再現する |
| 別のタブの変更（BudgetTable の単体テスト） | externalChangeSeq の props を直接進める |
| 別のタブの変更（AppShell.u3 のテスト） | 偽の保存領域を書き換えてから予算を保存し、本物の DataStore に STALE_REVISION と externalChange を出させる |
| Budget（BudgetTable の単体テスト） | 読めない状態のテストでは、保存の関数が呼ばれないことを確かめるため、偽の Budget を渡す |

## テストのデータ

- すべて架空の明細と予算を、テストの中で決まった規則で作る。
- ブラウザ操作の性能の計測は `app/tests/e2e/support/largeData.ts` の 3,000 件、超過と未設定は U5 のサンプルの保存データ（前の月は今日から計算）を使う。
