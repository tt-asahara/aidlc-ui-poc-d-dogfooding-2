# 構成の仕様 — U1 薄い版（アプリ全体で共通）

入力:

- NFR 設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/`（performance-design.md、security-design.md、logical-components.md）
- 使う技術 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/tech-stack-decisions.md`
- 開発の進め方 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/practices-discovery/team-practices.md`（Deployment）
- このステージの回答 `infrastructure-design-questions.md`（Q1・Q2、まとめの確認済み）

このアプリは、依頼者のパソコンのブラウザだけで動く1つのページです。サーバー、クラウド、データベース、公開先はありません（team-practices.md の Deployment）。そのため、この資料の「構成」は、依頼者のパソコンでの起動のしかたと、開発の道具の配置です。

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| 動かす場所（compute model） | 依頼者のパソコンのブラウザ。ビルドしたファイルを Vite の preview で手元から配信する | サーバーを持たない（team-practices.md）。ファイルを直接開く方法（file://）は、ブラウザによって保存領域の扱いが違うため使わない（logical-components.md） |
| ネットワーク | `127.0.0.1` だけで待ち受ける。外への通信はしない（connect-src 'none'） | そのパソコンの中からだけ開ける。NFR3.1・NFR3.3 |
| 依頼者が使うアドレス | `http://127.0.0.1:4173/`（ポート固定、strictPort） | localStorage は配信元ごとに分かれるため、毎回同じアドレスで開く必要がある（NFR7.3、Q1） |
| テストで使うアドレス | `http://127.0.0.1:4174/`（ポート固定、strictPort） | テストが依頼者の保存データに触れないよう、配信元を分ける（Q1） |
| データの置き場所（storage strategy） | ブラウザの localStorage の1つのキー | ドメイン設計の決定。NFR5.1 |
| 環境 | 開発（`npm run dev`、CSP なし）と、利用（`npm run build` と `npm run serve`、CSP あり）の2つ。ステージングと本番はない | team-practices.md の Deployment。CSP は利用のページだけに入れる（security-design.md） |
| 構成の記述（IaC） | なし。起動の設定は `app/vite.config.ts` と `app/package.json` のコマンドに書く | 用意するクラウドの資源がない |
| 大きさの目安（sizing） | 保存データは約 3,000 件で 300〜400 KB。localStorage の一般的な容量（約 5 MB）に収まる | performance-design.md |

## 起動の手順（依頼者向け）

1. 初回だけ、`app/` で `npm ci` を実行して部品を取得する（package-lock.json の版で取得する）。
2. `app/` で `npm run build` を実行する。
3. `app/` で `npm run serve` を実行する。
4. ブラウザで `http://127.0.0.1:4173/` を開く。
5. 終えるときは、`npm run serve` を止める（Ctrl+C）。保存データはブラウザに残る。

ポート 4173 が使われていると、`npm run serve` は別のポートに切り替えずに止まります。そのときは、4173 を使っているほかのプログラムを止めてから、もう一度起動します。

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| ブラウザの localStorage | database | キー1つに保存データ全体を JSON で保存。通し番号で照合（NFR5.1〜NFR5.4） | 配信元（`http://127.0.0.1:4173`）ごとに分かれる。ブラウザのデータを消すと消えるため、控えは CSV で取る |
| Vite の preview | 手元の配信（load-balancer・cdn の代わり） | host `127.0.0.1`、strictPort。ポートは起動のコマンドで渡す。利用は `npm run serve` で 4173、テストは Playwright の webServer で 4174（`cicd-pipeline.md` の「利用とテストのポートの分け方」） | 開発と確認のための配信の仕組み。公開には使わない |
| ブラウザのダウンロード | ファイルの書き出し | CSV を手元で作った一時的な URL（Blob）で保存する | 通信は発生しない（security-design.md） |

キャッシュ、キュー、検索、DNS、外部の配信網（CDN）は使いません。

## 戻し方とデータの控え

| 場面 | 戻し方 |
|------|--------|
| アプリの不具合 | 不具合を入れたコミットを打ち消すコミット（git revert）を作業ブランチに足して push し、`npm run build` からやり直す（`cicd-pipeline.md` の戻し方）。履歴の書き換えと強制 push はしない。保存データはブラウザに残り、版（schemaVersion 1）が同じなら読める |
| 保存データの控え | 「明細を CSV に保存」で、明細の控えを取る。予算は CSV に含まれない（AC5.1.5）。CSV からの戻し（取り込み）は U4 で作る |
| 保存データが壊れた | アプリは消さずに止まる（BR4.2）。ブラウザの開発者の道具で中身を確かめる。直し方は U5 で決める |
