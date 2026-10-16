# NFR 要件（U1 薄い版）— 質問

U1 の性能・安全などの要件と、使う技術を決めます。数値の目標の多くは要件（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md` の NFR1〜NFR8）で決まっています。ここでは、まだ決まっていない「使う技術」と「外部通信を防ぐ方法」を確認します。どの質問も A がおすすめです。

すでに決まっていること:

- 言語は TypeScript。単体テストは Vitest、ブラウザ操作のテストは Playwright。行カバレッジは 80% 以上。整形は Prettier、リンターは ESLint（team-practices.md、NFR7）。
- 依頼者のパソコンのブラウザだけで動かし、データはブラウザの保存領域（Web Storage）に置く（ドメイン設計）。
- 性能: 明細 3,000 件・1か月 100 件で、登録・月の切り替えのあとの画面更新は 1 秒以内（NFR1）。
- 対応ブラウザ: パソコンの最新版の Chrome・Edge・Firefox・Safari（NFR6）。
- このパソコンには Node.js 24 と npm 11 が入っている。

---

## Q1. 画面はどの作り方で作りますか？

A. React（画面部品の仕組みとして広く使われている部品集）と Vite（開発用の起動とビルドの道具）を使う。画面部品ごとに分けて作り、テストの道具（Testing Library）もそろっている（おすすめ。部品の分け方（ADR-004）とそのまま対応し、資料や例が多い）
B. 画面の部品集を使わず、TypeScript でブラウザの画面を直接組み立てる（Vite は使う）。使う部品が少なくなる代わりに、状態の更新を自分で書く量が増える
C. 別の部品集（Vue、Svelte など）を使う
D. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Q2. アプリのファイルは、リポジトリのどこに置きますか？

A. リポジトリ直下に `app/` フォルダを作り、アプリのコード・テスト・設定（package.json など）をまとめて置く。AI-DLC の記録（`aidlc/`）や設定（`.claude/`）と混ざらない（おすすめ）
B. リポジトリ直下に直接置く
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Q3. 外部への通信がないこと（NFR3）を、どう守りますか？

A. ページに「読み込んでよいのは自分のファイルだけ」という指定（Content-Security-Policy）を入れて、ブラウザに外部への通信を止めさせる。あわせて、ブラウザ操作のテストで外部への通信が1件もないことを確かめる（おすすめ。うっかり外部のフォントや部品を読み込んでも、ブラウザが止める）
B. ブラウザ操作のテストで確かめるだけにする
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Q4. アプリを動かすときに使う部品（npm のパッケージ）の取り扱いはどうしますか？

A. npm を使い、取得した版を記録するファイル（package-lock.json）をコミットする。Node.js の版は 24 に合わせて記録する。部品は、開発とテストに必要なものだけにする（おすすめ。同じ版で誰でも作り直せる）
B. 版の記録ファイルはコミットしない
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- 画面の作り方（Q1）: React と Vite を使う。画面部品（AppShell・EntryFormView・ReviewView・ExportView）を React の部品として作り、計算と保存は画面から独立した TypeScript の部品（Ledger・MonthlySummary・CsvExchange・DataStore・CategoryCatalog）に置く。画面部品のテストには Testing Library を使う
- 置き場所（Q2）: リポジトリ直下の `app/` に、アプリのコード・テスト・設定をまとめる。ビルドの出力（`app/dist/`）と Playwright の結果は `.gitignore` に足してコミットしない
- 外部通信の防ぎ（Q3）: ページに Content-Security-Policy を入れて、自分のファイル以外の読み込みと通信を止める。Playwright のテストで、外部への通信が0件であることを確かめる（NFR3）
- 部品の版（Q4）: npm を使い、package-lock.json をコミットする。Node.js の版は 24 として記録する。部品は開発とテストに必要なものだけにし、アプリが動くときに読み込む部品は React だけにする
- 性能（NFR1、要件で決定済み）: 明細 3,000 件・1か月 100 件で、登録・月の切り替えのあとの画面更新は 1 秒以内。U1 では集計と CSV 出力の計算時間を単体テストで測る
- 安全（NFR3・NFR4、要件で決定済み）: 外部送信なし。メモなど利用者の文字は常に文字として表示する（React の通常の表示を使い、HTML として差し込む書き方は使わない）。秘密情報は扱わない
- 品質（NFR7、決定済み）: Vitest と Playwright、行カバレッジ 80% 以上、Prettier と ESLint の指摘なし

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
