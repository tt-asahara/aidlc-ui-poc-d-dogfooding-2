# コードのまとめ — U5 保存の異常・別タブ対応・サンプル（u5-storage-resilience）

## 結果の要点

- 承認済みの確認コマンド `npm --prefix app run verify` は、リポジトリ直下から実行して終了コード 0 で通りました（開発担当の実行結果）。
- 単体テストは 17 ファイル・132 件がすべて成功しました（U1 の 89 件、U5 の 43 件）。
- 行カバレッジは 97.55% です（下限 80%）。命令 97.03%、分岐 93.62%、関数 96.87%。
- Playwright は 83 件が成功し、失敗は 0 件でした。10 件は、時間の計測のうち Chromium 以外の分で、対象外です（設計どおり）。
- 目標値は1つも下げていません。npm の部品は足していません（実行時の依存は react と react-dom のまま）。style 属性も使っていません。

## 作ったファイル・変えたファイル

| 場所 | 中身 |
|------|------|
| `app/src/domain/validateSnapshot.ts`（新規） | 保存データの検査（BR1.1）。CategoryCatalog だけに依存する |
| `app/src/domain/sampleDataSeeder.ts`（新規） | 初回のサンプルの組み立てと投入（BR4.1〜BR4.5） |
| `app/src/ui/NoticeBannerView.tsx`（新規） | 全体のお知らせ枠（BR5.1〜BR5.4） |
| `app/src/domain/ledger.ts` | assignIdentities を足し、add もこれを使う形にした（動きは同じ） |
| `app/src/domain/types.ts` | AppState.storageAvailable、StorageAvailability を足した |
| `app/src/store/dataStore.ts` | 次のものを足した。<br>・validateSnapshot による検査<br>・getAvailability<br>・storage イベントの受け取り<br>・dispose<br>・テスト用の eventSource オプション（省略時は window） |
| `app/src/ui/AppShell.tsx` | 投入後の状態の読み直し、購読開始後の再確認、別のタブの知らせ、NoticeBannerView の配置 |
| `app/src/ui/composition.ts`、`app/src/ui/main.tsx` | createBrowserAppServices（サンプル投入あり）を足し、main.tsx から使う。createAppServices の既定は何もしない差し込み口のまま |
| `app/src/ui/styles/app.css` | 全体のお知らせ枠の見た目 |
| `app/README.md` | 初回のサンプル、全体のお知らせ枠、別のタブの動きを3段落追加 |
| `app/tests/unit/` | validateSnapshot（10）、ledgerIdentities（5）、dataStore.u5（9）、sampleDataSeeder（7）、NoticeBannerView（6）、AppShell.u5（6） |
| `app/tests/e2e/u5-storage-resilience/` | sample・corrupt・unavailable・cross-tab・accessibility |
| `app/tests/e2e/support/u5.ts`（新規）、`app/tests/e2e/support/app.ts`（変更） | テストの補助 |

## 測った値

| ID | 内容 | 結果 | 目標 |
|----|------|------|------|
| NFR1.1 | 別のタブの保存から、もう片方の集計の更新まで（Chromium、3回の中央値） | 2.1 ms | 1 秒以内 |
| NFR1.2 | 空の保存領域から、サンプル入りの集計の表示まで（Chromium、3回の中央値） | 20.7 ms | 1 秒以内 |
| NFR1.3 | 3,000 件の検査 | 2.02 ms | 100 ms 以内 |
| NFR1.4 | 3,000 件の保存データの大きさ | 440,219 バイト | 1 MB 未満 |
| 参考 | 約 496 万文字の保存データの読み込みと検査 | 38.2 ms | 合否には使わない |

ほかの確認結果:

- 2つのページの操作の間の外部への通信は 0 件でした。
- 全体のお知らせ枠の3つの状態で、axe の重大な違反は 0 件でした。
- CSP は U1 のまま変えておらず、check:dist も合格しました。

## U1 のテストで変えたところ

- **`app/tests/e2e/support/app.ts` の `openApp` だけを変えました。** 保存データがなければ、空の保存データ（通し番号 0）を置いてから開くようにしています。
  - 理由: 初回にサンプルが入るようになったためです。U1 のブラウザ操作のテストは、空から始まることを前提にしています。
  - 容量不足のテストでは、何も置かずに開きます。
  - U1 のテストの期待は、1つも変えていません。
- U1 の単体テストとブラウザ操作のテストの本体は、変更なしで通っています。

## 機能設計レビュー R-07 の確かめた結果（読み取りだけが失敗する環境）

読み取り（getItem）だけが失敗し、書き込みは成功する環境では、次のように動きます。

- 起動時に、保存領域は「使えない」と記録されます。
- 保存直前の読み直しも失敗するため、通し番号の照合をしないまま書き込みに進みます。
- 書き込みは成功し、committed が出ます。

この環境では、全体のお知らせ枠に「このブラウザでは保存できません」が出たまま、実際には保存されます。設計どおり（可用性は起動時に決めて変えない）の動きですが、文言と実際が食い違う残る点として記録します。読み取りだけが失敗するブラウザの設定は、一般的にはありません。

## 計画との違い・判断したところ

1. **知らせの枠の作り:** 空の領域は、`aria-live`（assertive と polite）の2つの要素として最初から置きました。`role="alert"` と `role="status"` は、中に入れる知らせの要素に付けています。役割付きの空の要素を常に置くと、U1 のテストの結果が変わるためです。詳細モックアップも、知らせの要素に役割を付ける形です。
2. **サンプル投入の差し替え先:** `createBrowserAppServices()`（main.tsx が使う）で、SampleDataSeeder に差し替えました。テスト用の `createAppServices()` の既定は、何もしない差し込み口のままです（計画の条件）。
3. **「保存できない」の知らせの見出し:** 「保存データの問題」を使いました。
4. **購読開始後の状態の再確認（W1 の手順 7）:** 直後の microtask で行いました（ESLint の規則のため）。
5. **サンプルの中身:**
   - 件数: 今月 17 件、前月 20 件、前々月 17 件で、合計 54 件です。
   - 予算超過: 前月の食費の実績 43,900 円が、予算 40,000 円を超えます。
   - 今月の日付: 今日より後の日にあたる明細は、今日の日付に寄せます。
6. **単体テストの件数:** 計画の約 41 件に対し、43 件になりました。大きさの計測と、5 MB 近くの記録の2件を足したためです。
7. **テスト用の差し込み口:** DataStore に `eventSource` オプションを足しました。

## 残っていること

- U5 の確認（承認済みの確認コマンド）と、あなたの承認
