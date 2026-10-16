# 自動の確認の流れ（CI） — U1 薄い版（アプリ全体で共通）

入力:

- team-practices.md（Way of Working、Code Style、Testing Posture）
- NFR 設計の `performance-design.md`（NFR7.x）と `security-design.md`（NFR3.1、NFR3.2）
- このステージの回答 Q2

配る先がないため、配置の流れ（CD）はありません。ここで決めるのは、GitHub Actions で自動で確かめる流れと、手元で確かめる流れです。

## GitHub Actions の流れ

| 項目 | 内容 |
|------|------|
| 置き場所 | `.github/workflows/app-ci.yml` |
| 動くとき | `feat/budget-manager-app` と `feat/**` のブランチへの push。`main` を取り込み先とする Pull Request |
| 動かさないとき | 変更が `aidlc/`・`.claude/` などアプリの外だけのとき（paths の指定で `app/**` と `.github/workflows/app-ci.yml` の変更があるときだけ動かす） |
| 同時に動くときの扱い | 同じブランチで新しい push があったら、前の実行を取り消す（concurrency の cancel-in-progress） |
| 時間の上限 | 15 分（timeout-minutes） |
| 動く範囲 | `app/` の中（作業ディレクトリを `app` にする） |
| Node.js | `app/.nvmrc`（中身は 24）を node-version-file で読む。版の出どころは `app/.nvmrc` の1つだけにする |
| 部品の取得 | `npm ci`（`app/package-lock.json` の版で取得） |
| 取得結果の再利用（キャッシュ） | setup-node の cache を npm にし、cache-dependency-path を `app/package-lock.json` にする（lock ファイルが直下にないため、指定しないと止まる） |
| 秘密情報 | 使わない。リポジトリの読み取りの権限だけにする（`permissions: contents: read`） |

順番:

1. リポジトリを取得する。
2. `app/.nvmrc` の版で Node.js を用意し、キャッシュを有効にする。
3. `npm ci`
4. 整形の確認（Prettier。直さずに違いがあれば失敗）
5. リンター（ESLint。指摘があれば失敗）
6. 型の検査（tsc）
7. 単体テストとカバレッジ（Vitest。行カバレッジ 80% 未満で失敗）
8. ビルド（Vite）
9. ビルドの出力の検査（下の「ビルドの出力の検査」。NFR3.1・NFR3.2）

どれかが失敗したら、そこで止まります。

| 段階 | 止める条件 | 対応する要件 |
|------|------------|-------------|
| 整形 | Prettier の違いがある | NFR7.4 |
| リンター | ESLint の指摘がある（差し込む書き方の禁止を含む） | NFR7.4、NFR4.1 |
| 型の検査 | 型の誤りがある | NFR7.1 |
| 単体テスト | 失敗がある、または行カバレッジ 80% 未満 | NFR7.2 |
| ビルド | ビルドが失敗する | NFR7.3 の前提 |
| ビルドの出力の検査 | CSP の meta 要素がない、指定が設計と違う、外部か data: の読み込み先がある | NFR3.1、NFR3.2 |

Playwright のテストは GitHub Actions では動かしません（Q2）。

並行して作業する場合は、担当ブランチ（`feat/**`）への push でもこの流れが動きます。そのうえで、`feat/budget-manager-app` に統合したあとの push でも、もう一度動きます（team-practices.md の「統合後にテストを再実行」）。

## ビルドの出力の検査

ビルドのあとに、`app/dist/` を調べる小さな検査のスクリプト（`app/scripts/check-dist.mjs`。Node.js で動かす）を実行します。単体テスト（ビルドの前に動く）には入れません。npm のコマンドは `npm run check:dist` とします。

| 調べること | 合格の条件 | 対応する要件 |
|-----------|-----------|-------------|
| `dist/index.html` の CSP | meta 要素（http-equiv="Content-Security-Policy"）が1つあり、中身が `security-design.md` の指定と同じ | NFR3.1 |
| `dist/index.html` の src と href | すべて同じ配信元の相対の場所。`http://`・`https://`・`//`・`data:` で始まらない | NFR3.2 |
| `dist/` の CSS の url() と @import | 同じ条件 | NFR3.2 |
| `dist/` の JS の動的な読み込み（import()）の行き先 | 同じ条件 | NFR3.2 |

JS の中の文字列全体は調べません（`security-design.md` の NFR3.2 の理由）。

## 手元の確認の流れ

各 Unit の確認では、手元で次のものを順に実行する1つの npm のコマンド（`npm run verify`）を使います（NFR7.5）。

1. 整形の確認
2. リンター
3. 型の検査
4. 単体テストとカバレッジ
5. ビルド
6. ビルドの出力の検査（`npm run check:dist`）
7. Playwright（Chromium・Firefox・WebKit）

このコマンドを確認コマンドの候補として、B1 の最初の確認のときに提案し、依頼者の承認を得て決めます（デリバリー計画 Q8）。

Playwright のブラウザ本体は、初回に `npx playwright install` で取得します（外部の依存。delivery-planning の external-dependency-map.md）。

### 利用とテストのポートの分け方

| 配信 | 起動するもの | ポート | 設定の場所 |
|------|-------------|--------|-----------|
| 依頼者が使う配信 | `npm run serve`（`vite preview --host 127.0.0.1 --port 4173 --strictPort`） | 4173 | `app/package.json` のコマンド |
| テストの配信 | Playwright の webServer が、テストの開始時に `vite preview --host 127.0.0.1 --port 4174 --strictPort` を起動し、終わったら止める | 4174 | `app/playwright.config.ts` |

`vite.config.ts` の preview の設定には、ポートを書きません。ポートは、上の2か所のコマンドで渡します。テストは 4173 を使わないので、依頼者の保存データには触れません。依頼者が 4173 で使っている間も、テストは動かせます。

## 取り込みと戻し方

| 場面 | 流れ |
|------|------|
| 各 Unit の完了 | 手元の確認コマンドが通ったら、作業ブランチにコミットして push する。GitHub Actions の結果も確かめて報告する |
| `main` への取り込み | すべての Unit のあとで、依頼者の明示の承認を得てから、Pull Request を作る。GitHub Actions が通っていることを確かめる（team-practices.md）。強制 push や無断のマージはしない |
| 失敗したとき | 原因を直すコミットを足す。履歴の書き換えはしない |
| 戻し方 | 不具合を入れたコミットを打ち消すコミット（git revert）を足して push する。履歴は書き換えず、強制 push もしない |
