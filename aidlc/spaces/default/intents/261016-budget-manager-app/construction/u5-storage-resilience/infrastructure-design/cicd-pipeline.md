# 自動の確認の流れ（CI） — U5 保存の異常・別タブ対応・サンプル

U1 の自動の確認の流れ（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md`）をそのまま使います。U5 で変える設定はありません。

## GitHub Actions の流れ

U1 のまま、`.github/workflows/app-ci.yml` を使います。

| 段階 | U5 で増えるテスト |
|------|-------------------|
| 単体テストとカバレッジ | 保存データの検査（validateSnapshot）、DataStore の storage イベントと dispose、SampleDataSeeder、Ledger.assignIdentities、NoticeBannerView、AppShell の起動の状態の読み直し。行カバレッジ 80% 未満で失敗 |
| ビルドとビルドの出力の検査 | 変更なし |

Playwright のテストは、U1 のまま GitHub Actions では動かしません。

## 手元の確認の流れ

承認済みの確認コマンド `npm --prefix app run verify` を使います。U5 のブラウザ操作のテストは `app/tests/e2e/u5-storage-resilience/` に置き、同じコマンドで動きます。

| U5 のブラウザ操作のテスト | 確かめること |
|---------------------------|-------------|
| 初回のサンプル | AC7.1.1、AC7.1.3、NFR1.2 |
| 壊れた保存データ | AC7.3.3、AC7.3.4（項目の型の誤りを含む）、全体のお知らせ枠 |
| 保存できない環境 | BR5.3 の知らせ |
| 2つのページ | AC7.4.1、AC7.4.2、NFR1.1、外部通信 0 件 |
| axe | 全体のお知らせ枠の3つの状態 |

## 取り込みと戻し方

U1 のまま（各 Unit の完了でコミットと push、`main` への取り込みは最後に依頼者の承認、戻すときは git revert）。
