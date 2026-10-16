# 論理的な部品の構成 — U1 薄い版

性能・安全の設計（`performance-design.md`、`security-design.md`）が、どの部品に当たるかをまとめます。部品の定義は `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md`、使う技術は `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/tech-stack-decisions.md` にあります。

このアプリは、1つのページの中で動く部品の集まりです。サーバー、データベース、ほかのサービスはありません。外部の仕組みとして使うのは、ブラウザの保存領域（localStorage）とダウンロードだけです。

## 部品の一覧と、失敗が及ぶ範囲

| 層 | 部品 | 置き場所（予定） | 外部の仕組み | 失敗したときに及ぶ範囲 | 当てはまる設計 |
|----|------|-----------------|-------------|------------------------|---------------|
| 計算と規則 | CategoryCatalog、Ledger、MonthlySummary、CsvExchange | `app/src/domain/` | なし | 呼んだ画面の区切りだけ。結果の値で失敗を返す | NFR1.4〜NFR1.6、NFR4.2 |
| 保存 | DataStore | `app/src/store/` | localStorage | 保存の操作すべて。失敗しても手元の写しと保存領域は前のまま | NFR1.1、NFR4.3、NFR5.1〜NFR5.4 |
| 組み立て | AppShell（今日、表示中の月、差し込み口の差し替え） | `app/src/ui/` | なし | 画面全体 | NFR1.3、NFR8.1 |
| 画面 | EntryFormView、ReviewView、ExportView | `app/src/ui/` | ダウンロード（ExportView） | その区切りだけ。Error Boundary で受け止める | NFR1.1、NFR1.2、NFR2.1〜NFR2.3、NFR4.1、NFR6.2、NFR6.3 |
| ページ | `index.html`、CSS | `app/` | なし | 画面全体 | NFR3.1、NFR3.2、NFR6.2、NFR6.3 |
| 確かめ | Vitest・Playwright・axe・ESLint・Prettier・型の検査 | `app/tests/` と設定のファイル | なし（開発のときだけ） | なし（アプリには含めない） | NFR1.x の計測、NFR2.2、NFR3.3、NFR6.1、NFR7.1〜NFR7.5 |

## 失敗の範囲を区切る方法

| 区切り | 方法 |
|--------|------|
| 計算と画面 | 計算と規則の部品は React を知らない。画面は計算を持たない（ADR-004）。計算の誤りは単体テストで見つける |
| 保存と画面 | 画面は DataStore を直接書き換えず、Ledger を通して commit する。保存の結果は値で受け取る（C1） |
| 画面の区切りどうし | 3つの区切りをそれぞれ Error Boundary で囲み、1つの失敗がほかに及ばないようにする |
| 保存データ | 保存領域のキーは1つだけ（DataStore の内部の値）。ほかのキーには触れない |

## 共有するもの

| 共有するもの | 持ち主 | 使う側 | 注意 |
|-------------|--------|--------|------|
| 保存データ（localStorage の1つのキー） | DataStore | 同じブラウザの、このアプリのすべてのタブ | 書き込みは commit だけ。2つのタブの隙間は U5 |
| 今日の日付 | AppShell | 集計の初期の月、CSV のファイル名 | 1か所で決める（BR2.1、BR3.4） |
| 保存の知らせ（committed・externalChange・unreadable） | DataStore → AppShell | ReviewView、ExportView | どの知らせも同じ受け取り方（BR4.5） |
| 差し込み口（予算の取り出し、サンプル投入） | AppShell の組み立て | MonthlySummary、起動の処理 | U3・U5 が組み立ての1か所で差し替える |

## インフラ設計へ渡すこと

- 配る先の環境はありません。依頼者のパソコンでビルドし、手元の配信の仕組みで開いて使います（team-practices.md の Deployment）。
- localStorage は、ページの配信元（プロトコル・ホスト・ポート）ごとに分かれます。そのため、手元の配信の仕組み（Vite の preview）は次のように固定します。どちらもインフラ設計で決めます。
  - アドレス: `127.0.0.1`（そのパソコンの中からだけ開ける）
  - ポート: 1つの番号に固定し、strictPort を有効にする。ポートが使われているときは別のポートに切り替えずに止め、保存データが見えなくなるのを防ぐ。
- ファイルを直接開く方法（file://）は、ブラウザによって保存領域の扱いが違うため使いません。
- ブラウザ操作のテストは、依頼者が使うポートとは別の固定のポートで動かします。テストが依頼者の保存データに触れないようにするためです。
