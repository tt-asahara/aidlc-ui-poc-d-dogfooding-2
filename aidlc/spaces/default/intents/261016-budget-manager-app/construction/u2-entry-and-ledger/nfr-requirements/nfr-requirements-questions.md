# NFR 要件（U2 登録の検証と明細一覧）— 質問

U2 で増える処理（入力の規則の仕上げ、欄ごとの誤りの表示、二重送信の防止、明細の一覧）は、U1・U5 の NFR 要件で決めた技術と目標の中に収まります。決まっている技術と目標は次のとおりです（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/`、`construction/u5-storage-resilience/nfr-requirements/`）。

- React・Vite・TypeScript
- CSP と外部通信なし
- 行カバレッジ 80%
- 1 秒以内の画面の更新
- 3種類のブラウザ
- axe

U2 で新しく決める必要のある点はありません。そのため、質問はありません。

## Consolidated Summary Confirmation

- 技術と共通の目標: U1・U5 の NFR 要件をそのまま使う。npm の部品は足さない
- 性能: 明細 3,000 件・1か月 100 件で、一覧を含む「2 確認」の表示が、登録・月の切り替えのあと 1 秒以内に更新される（NFR1。U1 の目標に一覧の表示を含める）
- 二重送信: 300 ミリ秒以内の2回目の操作で明細が増えない（AC1.1.4）
- アクセシビリティ: 欄ごとの誤りは aria-invalid と aria-describedby で欄と結び、まとめは読み上げ機能に伝える。入力の誤りの状態と、一覧のある状態・空の月の状態で、axe の重大な違反が 0 件（NFR2）
- 安全: メモは一覧でも文字のまま表示する（NFR4）。入力の規則は画面と CSV の取り込みで同じもの（Ledger.validate）を使う
- 利用環境: 絵文字を含むメモの数え方と、日本語の変換中の入力が、3種類のブラウザで正しく動く（NFR6）

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
