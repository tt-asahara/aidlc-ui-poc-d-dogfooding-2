# 自動の確認の流れ（CI） — U2 登録の検証と明細一覧

U1 の自動の確認の流れ（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md`）をそのまま使います。U2 で変える設定はありません。

## GitHub Actions の流れ

U1 のまま、`.github/workflows/app-ci.yml` を使います。

| 段階 | U2 で増えるテスト |
|------|-------------------|
| 単体テストとカバレッジ | textRules、Ledger.validate の仕上げ、EntryFormView（欄ごとの誤り、送信の鍵、メモ欄の制限、別の月）、LedgerList、ReviewView。行カバレッジ 80% 未満で失敗 |
| ビルドとビルドの出力の検査 | 変更なし |

Playwright のテストは、U1 のまま GitHub Actions では動かしません。

## 手元の確認の流れ

承認済みの確認コマンド `npm --prefix app run verify` を使います。U2 のブラウザ操作のテストは `app/tests/e2e/u2-entry-and-ledger/` に置き、同じコマンドで動きます。

| U2 のブラウザ操作のテスト | 確かめること |
|---------------------------|-------------|
| 入力の誤り | AC1.2.1〜AC1.2.5、axe |
| 別の月の登録 | AC1.3.1、AC1.3.2、axe |
| 明細の一覧 | AC2.1.1、AC2.1.3、AC2.1.4、AC1.1.5、AC1.1.6、axe、NFR1.1・NFR1.2 |
| 二重送信 | AC1.1.4（dblclick） |
| メモ欄 | 絵文字の 100 文字、改行の貼り付け、1 万文字の貼り付け |

日本語入力は、U2 の確認のときに手で確かめます。

## 取り込みと戻し方

U1 のまま（各 Unit の完了でコミットと push、`main` への取り込みは最後に依頼者の承認、戻すときは git revert）。
