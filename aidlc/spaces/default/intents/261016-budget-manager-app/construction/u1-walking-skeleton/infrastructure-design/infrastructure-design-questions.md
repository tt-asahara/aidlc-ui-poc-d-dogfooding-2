# インフラ設計（U1 薄い版）— 質問

このアプリは、依頼者のパソコンのブラウザだけで動かします。公開する先、サーバー、クラウドは使いません（team-practices.md の Deployment）。ここでは、次の2つを決めます。

- アプリをどう起動して開くか
- GitHub Actions で何を自動で確かめるか

どの質問も A がおすすめです。

すでに決まっていること:

- 配信の仕組みは Vite の preview を使う。アドレスは `127.0.0.1`、ポートは固定し、使われていたら別のポートに切り替えずに止める（NFR 設計）。
- ブラウザ操作のテストは、依頼者が使うポートとは別の固定のポートで動かす（NFR 設計）。
- `main` に取り込む前に、GitHub Actions で Prettier と ESLint を通す（team-practices.md）。

---

## Q1. 依頼者がアプリを使うときは、どう起動しますか？

A. `app/` で `npm run build` を1回実行してから、`npm run serve` で手元の配信を起動し、ブラウザで `http://127.0.0.1:4173/` を開く。テストは別のポート 4174 で動かす（おすすめ。依頼者が使うのは CSP 入りのビルドしたページで、テストと保存データが混ざらない）
B. 開発用の起動（`npm run dev`）をそのまま使う（変更がすぐ反映されるが、CSP が入らず、ポートも開発用になる）
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Q2. GitHub Actions で、何を自動で確かめますか？

決まっているのは、`main` に取り込む前に Prettier と ESLint を通すことだけです。作業ブランチへの push のたびに動かすかどうかと、何を含めるかを決めます。

A. 作業ブランチ `feat/budget-manager-app` への push と、`main` への取り込みの依頼（Pull Request）のたびに、Prettier・ESLint・型の検査・単体テスト（カバレッジ 80% の判定を含む）・ビルドを動かす。ブラウザ操作のテスト（Playwright）は手元で動かし、各 Unit の確認のときに結果を報告する（おすすめ。速く終わり、ブラウザの取得も不要）
B. A に加えて、Playwright のテストも GitHub Actions で動かす（3種類のブラウザの取得が毎回必要で、時間がかかる）
C. 決まっているとおり、`main` への取り込みの依頼のときに Prettier と ESLint だけを動かす
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- 起動（Q1）: 依頼者は `app/` で `npm run build` を実行してから `npm run serve` を起動し、`http://127.0.0.1:4173/` を開く。ポート 4173 は固定で、使われていたら別のポートに切り替えずに止める。ブラウザ操作のテストは、別の固定のポート 4174 で、ビルドしたページを開いて動かす
- 配る先: なし。サーバー・クラウド・公開はしない。データは依頼者のブラウザの localStorage だけに置く
- 戻し方: アプリの不具合は、作業ブランチの前のコミットに戻してビルドし直す。保存データの控えは、CSV の出力で取る（明細だけ。予算は含まれない）
- GitHub Actions（Q2）: 作業ブランチ `feat/budget-manager-app` への push と、Pull Request のたびに、Prettier・ESLint・型の検査・単体テスト（行カバレッジ 80% の判定を含む）・ビルドを動かす。Playwright は手元で動かし、各 Unit の確認のときに結果を報告する。秘密情報は使わない
- 監視: 外部への送信をしないため、監視の仕組みは置かない。確かめたい性質はテストで確かめる

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
