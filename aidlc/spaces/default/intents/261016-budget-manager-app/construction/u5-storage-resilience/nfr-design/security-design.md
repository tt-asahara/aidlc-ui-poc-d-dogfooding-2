# 安全と信頼性の設計 — U5 保存の異常・別タブ対応・サンプル

入力:

- U5 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/nfr-requirements/security-requirements.md`（NFR3.1、NFR3.2、NFR4.1、NFR4.2、NFR5.1〜NFR5.4）
- U5 の機能設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/`（BR1.1〜BR5.4、W1〜W6）
- U1 の NFR 設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-design/security-design.md`（CSP、保存の手順 1〜6、Error Boundary。そのまま使う）

## 架空のデータだけ・外部へ送らない（NFR3）

| ID | 設計 |
|----|------|
| NFR3.1 | サンプルのメモは、コードの中の固定の一覧（一般名詞だけ）から選ぶ。単体テストで、すべてのメモが一覧の中にあることを確かめる |
| NFR3.2 | 別のタブの変更の受け取りは、ブラウザの storage イベントだけを使う。CSP の connect-src 'none' はそのまま。Playwright の通信の記録で、2つのページの操作の間に外部への通信が 0 件であることを確かめる |

## 保存データを信用しない（NFR4）

| ID | 設計 |
|----|------|
| NFR4.1 | 検査の関数 `validateSnapshot`（`app/src/domain/` の下の純粋な関数。CategoryCatalog だけを使う）で、BR1.1 の項目をすべて確かめる。DataStore は、読み込み・保存直前の読み直し・別のタブの変更のすべてで、この関数を通してから使う。単体テストで、項目ごとに壊れた例（型の誤り、範囲外、重複、存在しない日付、区分とカテゴリの不一致、budgetKey の不一致）を与え、どれも「読めない」になることを確かめる |
| NFR4.2 | 検査の関数が返す理由の文は、項目の名前と位置（何件目か）だけで、値を含めない。DataStore は理由の文だけをコンソールに出す。画面には決まった文（BR5.1）だけを出す |

大きさの上限は、ブラウザの保存領域の上限（約 5 MB）に任せます（`performance-design.md` の「保存データの大きさの上限」）。

## 信頼性（NFR5）

| ID | 設計 |
|----|------|
| NFR5.1 | サンプルは `commit({ expectedRevision: 0, initialize })` の1回で保存する。U1 の保存の手順 5 のとおり、書き込みに失敗すると保存領域は何も変わらない |
| NFR5.2 | 読めない状態では、保存の操作（commit）は手順 1 で止まる。別のタブの変更の知らせもすべて無視する（W3 の手順 2）。そのため、どの経路でも保存領域に書かない |
| NFR5.3 | 同時保存の隙間（1 ミリ秒未満）は、機能設計 BR2.3 のとおり残るリスクとして記録する。そのほかの重なりは、保存直前の通し番号の照合と、storage イベントの検知で防ぐ |
| NFR5.4 | 2つのタブを同時に初めて開いた場合、後から投入するタブは、通し番号の照合（保存領域の通し番号が 0 でない）で断られ、先のタブのデータを採用する。単体テストで、先に1回投入した保存領域に、もう一度投入すると断られ、明細の数が1回分のままであることを確かめる。保存直前の読み直しと書き込みの間（1 ミリ秒未満）に2つの投入が重なる場合は、NFR5.3 の残るリスクに含まれる（NFR 要件レビュー R-01） |

## storage イベントの受け取りの設計

| 項目 | 設計 |
|------|------|
| 始める | DataStore.load の1回目の呼び出しの中で、window に 'storage' の受け取り手を1つだけ付ける。2回目以降の load では付けない |
| やめる | DataStore.dispose で受け取り手を外し、画面の受け取り手もすべて外す。テストでは毎回 dispose する |
| 受け取る条件 | event.storageArea が localStorage と同じもので、event.key がこのアプリのキーか null のとき。状態が unreadable なら何もしない |
| 手元の写しの入れ替え | event.newValue を検査の関数に通してから入れ替える。null（キーの削除、または localStorage 全体の消去）は、空の写し（通し番号 0）にする |
| 画面の二重の受け取り | React の開発時に、画面の受け取りの開始と停止が2回走ることがある。AppShell の購読は、停止の関数で必ず外し、二重に知らせを受けないようにする |

## 監視について

U1 と同じく、外部へ送る監視は置きません。理由の文だけを開発者用の記録（console.warn）に出し、保存データの値は出しません。
