# コードのまとめ — U1 薄い版（u1-walking-skeleton）

## 結果の要点

- `npm run verify` は、終了コード 0 で最後まで通りました（開発担当の実行結果）。実行した順番は次のとおりです。
  1. format:check
  2. lint
  3. typecheck
  4. coverage
  5. build
  6. check:dist
  7. e2e
- 単体テスト 89 件（11 ファイル）がすべて成功しました。行カバレッジは 95.02%（401/422）です。
- Playwright のテスト 54 件が成功しました。スキップの 6 件は、性能のテストの Firefox・WebKit 分です。時間の判定は Chromium だけで行う設計どおりです。
- 目標値（カバレッジの下限、時間、CSP、外部通信 0 件、axe）は1つも下げていません。

## 作ったファイル・変えたファイル

| 場所 | 中身 |
|------|------|
| `.gitignore` | `app/dist/`、`app/test-results/`、`app/playwright-report/`、`app/coverage/` を追記 |
| `.github/workflows/app-ci.yml` | GitHub Actions。手順は次のとおり。<br>・npm ci<br>・format:check<br>・lint<br>・typecheck<br>・coverage<br>・build<br>・check:dist |
| `app/` の設定 | package.json、package-lock.json、.nvmrc（24）、.prettierrc、.prettierignore、eslint.config.js、tsconfig.json、tsconfig.app.json、tsconfig.node.json、vite.config.ts、vitest.config.ts、playwright.config.ts、csp-policy.json、index.html、public/favicon.svg、README.md、scripts/check-dist.mjs |
| `app/src/domain/` | result.ts、types.ts、categoryCatalog.ts、format.ts、month.ts、ledger.ts、monthlySummary.ts、csvExchange.ts |
| `app/src/store/` | dataStore.ts |
| `app/src/ui/` | AppShell.tsx、EntryFormView.tsx、ReviewView.tsx、ExportView.tsx、SectionBoundary.tsx、composition.ts、main.tsx、styles/app.css |
| `app/src/vite-env.d.ts` | Vite の型の宣言 |
| `app/tests/unit/` | setup.ts、support/（偽の保存領域、明細を作る関数）、11 のテストファイル |
| `app/tests/e2e/` | support/（画面操作の補助、3,000 件のデータ）、u1-walking-skeleton/（flow・storage-failures・security・accessibility・performance） |

## 主な実装の判断

- **CSP の正本:** `app/csp-policy.json` に1か所で持ちます。`vite.config.ts`（ビルドのときだけ meta 要素を足す）と `scripts/check-dist.mjs`（ビルド後の検査）の両方が読みます。
- **実行時の部品:** react と react-dom の2つだけです。`npm audit` の結果は脆弱性 0 件です。
- **DataStore:** NFR 設計の commit の手順 1〜6 のとおりです。「保存領域へのアクセス失敗」は保存データなしとして扱い、STORE_UNREADABLE は保存されている文字が壊れているときだけにしました（NFR 設計レビュー R-06 を反映）。
- **差し込み口:** 予算は空の一覧、サンプル投入は何もしない実装を `composition.ts` に置き、組み立ての1か所で差し替えられるようにしました（機能設計 Q1）。
- **保存の知らせ:** `committed` を足し、集計と CSV の画面は、ほかの知らせと同じ受け取り方で表示を更新します（機能設計 Q2）。
- **エラーの受け止め:** 区切りごとの Error Boundary と、最も外側の Error Boundary を置きました。ボタンの処理の予想外の例外は try/catch で捕まえて渡します。
- **ESLint の版:** 9 系に固定しました。10 系は eslint-plugin-react と組み合わせて入れられないためです。

## テストのまとめ

| テストファイル | 件数 |
|----------------|------|
| domain/categoryCatalog.test.ts | 6 |
| domain/format.test.ts | 7 |
| domain/month.test.ts | 6 |
| store/dataStore.test.ts | 11 |
| domain/ledger.test.ts | 15 |
| domain/monthlySummary.test.ts | 8 |
| domain/csvExchange.test.ts | 8 |
| ui/EntryFormView.test.tsx | 10 |
| ui/ReviewView.test.tsx | 6 |
| ui/ExportView.test.tsx | 6 |
| ui/AppShell.test.tsx | 6 |
| 合計 | 89 |

カバレッジ: 行 95.02%、文 94.1%、分岐 86.63%、関数 94.06%。計測から外したのは `src/ui/main.tsx` だけです（理由は設定に記載）。

測った時間（Chromium、3,000 件、3回の中央値）:

| ID | 内容 | 結果 | 目標 |
|----|------|------|------|
| NFR1.1 | 登録 → 集計の更新 | 23.1〜28.8 ms | 1 秒以内 |
| NFR1.2 | 月の切り替え | 27.6〜31.0 ms | 1 秒以内 |
| NFR1.3 | 起動から操作できるまで（2回目以降の読み込み） | 12.7〜30.2 ms | 1 秒以内 |
| NFR1.4 | CSV の組み立て | 1.66 ms | 1 秒以内 |
| NFR1.5 | 集計の計算 | 0.09 ms | 100 ms 以内 |

ほかの確認結果:

- 外部への通信は 0 件でした。CSP は設計の文字列と一致し、外部の画像と通信をブラウザが止めることも確かめました。
- axe の重大な違反は、5つの状態・3種類のブラウザで 0 件でした。
- 画面幅は、1280px で2列、800px で1列でした。200% 相当でも横のスクロールなしに登録できました。

## 計画との違い

1. **単体テストの件数:** 計画の要約は「約 55 件（9 部品）」と書いていますが、これは数え違いです。承認済みのテストの手順書は 11 ファイル・約 71 件で、実際は 89 件になりました。
2. **キーボードだけの操作のテスト（NFR2.3）:** macOS では、カテゴリの選択欄で矢印キーを押すと OS の一覧が開き、自動操作ではその中を操作できません。この1手だけを `selectOption` で選び、テストに注記しました。この1手（Space で開き、矢印で選び、Enter）は、人の手での確認が必要です。WebKit では Tab の代わりに Option+Tab を使いました（Safari の既定の設定のため）。
3. **NFR3.1（ビルドの設定が meta 要素を足すこと）:** 単体テストではなく、`check:dist` と Playwright で確かめました。単体テストのファイルが 11 個に決まっているためです。
4. **画面の文言の小さな違い:**
   - 0件の CSV の知らせは「出力する明細がありません」だけにしました。見本の続きの文は、取り込み（U4）に触れているためです。
   - 集計の表の説明から「（予算は欄に直接入力して保存）」を外しました。予算の入力は U3 で作るためです。
   - カテゴリの選択欄の先頭に「選んでください」を置きました。
5. **防ぎとして足した判定:** 日付が YYYY-MM-DD の形であること（存在する日付かどうかの確認は U2）と、メモに改行がないことです。
6. **計画の一覧になかったファイル:** `csp-policy.json`、`src/vite-env.d.ts`、`public/favicon.svg`、`.prettierignore`、テストの補助ファイルです。
7. **GitHub Actions:** push 前のため、まだ動いていません。最初の push で動きます。

## 残っていること

- 確認コマンドの承認（U1 の確認のとき。候補は `npm run verify`）
- GitHub Actions の最初の実行結果の確認
- macOS でのカテゴリ選択のキーボード操作の手での確認
