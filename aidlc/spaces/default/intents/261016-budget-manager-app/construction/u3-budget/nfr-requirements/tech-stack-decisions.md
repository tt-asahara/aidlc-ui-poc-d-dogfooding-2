# 使う技術の決定 — U3 月別予算と予算比較

U1・U5・U2 の決定をそのまま使います（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/tech-stack-decisions.md` ほか）。U3 で新しく足す部品（npm のパッケージ）はありません。

| 分類 | 使うもの | 理由 |
|------|---------|------|
| 予算の部品 | TypeScript の Budget（`app/src/domain/budget.ts`） | 約束ごと C4 のとおり。部品を足さずに済む |
| 確認の枠 | ページの中の要素（role="group"）と Escape の keydown | 詳細モックアップ Q1 で、画面中央のダイアログを使わないと決めたため |
| 予算欄 | input（inputmode="numeric"） | 数字のキーボードを出しつつ、全角数字などの誤りは Budget の検証で伝える |

## 検討して選ばなかったもの

| 選ばなかったもの | 理由 |
|-----------------|------|
| ブラウザの dialog 要素（モーダル） | 画面中央のダイアログを使わない決定（詳細モックアップ Q1） |
| input type="number" | 小数や指数の入力を受け付け、空と誤りの区別がつきにくい |
