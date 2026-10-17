# 自動の確認の流れ（CI） — U3 月別予算と予算比較

U1 の自動の確認の流れ（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md`）をそのまま使います。U3 で変える設定はありません。

## GitHub Actions の流れ

U1 のまま、`.github/workflows/app-ci.yml` を使います。

| 段階 | U3 で増えるテスト |
|------|-------------------|
| 単体テストとカバレッジ | Budget、BudgetTable（欄の作り直しのきっかけ、1回だけ無視する印、確認の枠、保存の失敗、読めない状態）、composition の差し替え。行カバレッジ 80% 未満で失敗 |
| ビルドとビルドの出力の検査 | 変更なし |

Playwright のテストは、U1 のまま GitHub Actions では動かしません。

## 手元の確認の流れ

承認済みの確認コマンド `npm --prefix app run verify` を使います。U3 のブラウザ操作のテストは `app/tests/e2e/u3-budget/` に置き、同じコマンドで動きます。

| U3 のブラウザ操作のテスト | 確かめること |
|---------------------------|-------------|
| 予算の保存 | AC4.1.1〜AC4.1.3、AC3.2.1、再読み込みで残る（AC7.2.1 の予算の部分）、NFR1.1 |
| 予算比較 | AC3.2.2〜AC3.2.4（U5 のサンプルの前の月で超過と未設定。AC7.1.2） |
| コピー | AC4.2.1〜AC4.2.3（上書きする・やめる・Escape）、NFR1.2 |
| 保存の失敗 | AC7.3.2 の予算の部分 |
| axe | 5つの状態 |

## 取り込みと戻し方

U1 のまま（各 Unit の完了でコミットと push、`main` への取り込みは最後に依頼者の承認、戻すときは git revert）。
