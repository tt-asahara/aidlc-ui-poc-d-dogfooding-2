# 安全と信頼性の設計 — U2 登録の検証と明細一覧

入力:

- U2 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-requirements/security-requirements.md`（NFR3.1、NFR4.1、NFR4.2、NFR5.1〜NFR5.3）
- U1・U5 の NFR 設計（CSP、保存の手順、保存データの検査。そのまま使う）

## 外部への通信をしない（NFR3）

| ID | 設計 |
|----|------|
| NFR3.1 | U2 は外部の資源を読み込まない。U1 の CSP（`app/csp-policy.json`）と check:dist、外部通信 0 件のテストを変えずに通す |

## 文字の扱いと規則（NFR4）

| ID | 設計 |
|----|------|
| NFR4.1 | 一覧のメモは、React の通常の表示（文字として差し込まれる）だけで出す。ESLint の react/no-danger（U1 で有効）で、HTML として差し込む書き方を防ぐ。Testing Library で `<b>太字</b>` が文字のまま出ることを確かめる |
| NFR4.2 | 入力の規則は Ledger.validate の1か所に置く。EntryFormView は Ledger.add の結果（C1 の VALIDATION と fieldErrors）を表示するだけで、独自に検証しない。メモ欄の入力時の切り詰めは、表示を助けるためのもので、最終の判定は Ledger.validate が行う |

## 信頼性（NFR5）

| ID | 設計 |
|----|------|
| NFR5.1 | 日付の実在の判定と見える1文字の数え方を `app/src/domain/textRules.ts` にまとめ、Ledger.validate と validateSnapshot の両方から使う（`performance-design.md` の「規則の共有の設計」）。単体テストで、境界の値（100 文字ちょうどの絵文字のメモ、2026-02-28 と 2026-02-29、2024-02-29）が両方で同じ結果になることを確かめる |
| NFR5.2 | U5 のサンプルの全件を Ledger.validate に通し、VALIDATION が 0 件であることを単体テストで確かめる（契約レビュー R-11） |
| NFR5.3 | 二重送信の防止は、保存の前（検証の前）に鍵を確かめる。鍵がある間の操作は Ledger.add を呼ばないため、同じ明細が2件保存されない |

## メモの切り詰めの対象（機能設計レビュー R-05）

入力時の切り詰めは、前後の空白を除いた値に対して行います。

- 先頭の空白は、切り詰めの結果に残しません。
- 末尾の空白は、利用者が続けて入力できるよう、100 文字に達していない間は値に残します。保存時は Ledger.validate が除きます。
- 先頭に空白のある 101 文字の貼り付けは、空白を除いた 100 文字になります。

単体テストで、先頭に空白のある 101 文字の例を確かめます。
