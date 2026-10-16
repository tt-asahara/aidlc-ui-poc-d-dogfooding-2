# 使う技術の決定 — U1 薄い版（アプリ全体で共通）

入力:

- このステージの回答 `nfr-requirements-questions.md`（Q1〜Q4、まとめの確認済み）
- 開発の進め方 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/practices-discovery/team-practices.md`
- 部品の一覧と設計判断 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md`、`decisions.md`（ADR-001〜006）

U1 で決めた技術は、U2〜U6 でもそのまま使います。版は、取得した時点の最新の安定版を使い、package-lock.json で固定します。

## 決定の一覧

| 分類 | 採用するもの | 理由 | 出典 |
|------|-------------|------|------|
| 言語 | TypeScript（型の検査は strict） | 依頼文の指定。部品の約束ごと（C1〜C9）を型で表せる | 依頼文、NFR7 |
| 画面 | React | 部品の分け方（ADR-004）とそのまま対応する。状態の変化に合わせた再表示を自分で書かずに済む。文字を標準で文字として表示する（NFR4.1） | Q1 |
| 開発の起動とビルド | Vite | React と TypeScript をすぐ使える。ビルドの出力は手元のファイルだけで、外部の配信を使わない（NFR3） | Q1 |
| 単体テスト | Vitest、Testing Library（React 用） | team-practices.md の指定。Vite と同じ設定で動く | team-practices.md、Q1 |
| カバレッジ | Vitest のカバレッジ計測（v8） | 行カバレッジ 80% の判定（NFR7.2） | team-practices.md |
| ブラウザ操作のテスト | Playwright（Chromium・Firefox・WebKit）、axe（Playwright 用） | team-practices.md の指定。3種類の描画の仕組みで NFR6.1 を、axe で NFR2.2 を確かめる | team-practices.md、NFR2、NFR6 |
| 整形・リンター | Prettier、ESLint（TypeScript 用と React 用の規則） | team-practices.md の指定。差し込む書き方の禁止（NFR4.1）も規則で確かめる | team-practices.md |
| データの保存 | ブラウザの保存領域（Web Storage の localStorage） | ドメイン設計の決定。同じパソコン・同じブラウザで残る。別のタブの変更を知らせる仕組み（storage イベント）がある | components.md の外部の仕組み |
| 実行環境 | Node.js 24、npm | このパソコンに入っている。package-lock.json をコミットして版を固定する | Q4 |
| 置き場所 | リポジトリ直下の `app/` | AI-DLC の記録や設定と分ける | Q2 |

アプリが動くときに読み込む部品は、React（と画面に表示するための React DOM）だけです。そのほかの部品は、開発とテストのときにだけ使います（NFR4.4）。

## 検討して選ばなかったもの

| 分類 | 選ばなかったもの | 理由 |
|------|-----------------|------|
| 画面 | 部品集を使わず、画面を直接組み立てる | 依存は減るが、状態の更新と再表示を自分で書く量が増え、試作の速さとテストのしやすさで劣る（Q1 の B） |
| 画面 | Vue、Svelte | 機能は足りるが、資料と例の量、テストの道具のそろい方で React を優先した（Q1 の C） |
| データの保存 | IndexedDB | 大量のデータに向くが、想定は約 3,000 件で localStorage で足りる。書き込みの「全部か無か」と別タブの検知が、localStorage の方が単純に作れる |
| 部品の管理 | pnpm、yarn | 機能は足りるが、このパソコンに入っている npm で足りる（Q4） |

## ファイルの置き方（`app/` の中）

| 場所 | 中身 |
|------|------|
| `app/package.json`、`app/package-lock.json` | 部品と npm のコマンド |
| `app/src/domain/` | 画面から独立した部品（CategoryCatalog、Ledger、MonthlySummary、CsvExchange） |
| `app/src/store/` | DataStore |
| `app/src/ui/` | 画面部品（AppShell、EntryFormView、ReviewView、ExportView） |
| `app/tests/unit/`（または各部品の隣） | Vitest の単体テスト |
| `app/tests/e2e/` | Playwright のブラウザ操作のテスト |

細かい置き方は Code Generation の計画で決めます。

`.gitignore` には、次のものを足してコミットしないようにします。

- `app/dist/`（ビルドの出力）
- Playwright の結果（`app/test-results/`、`app/playwright-report/`）

## 確認コマンドについて

各 Unit の動作を確かめるコマンドは、B1 の最初の確認のときに提案して決めます（デリバリー計画 Q8）。中身は、次のものをまとめて実行する npm のコマンドを想定しています。

- 型の検査
- Prettier
- ESLint
- Vitest（カバレッジ 80% の判定を含む）
- ビルド
- Playwright
