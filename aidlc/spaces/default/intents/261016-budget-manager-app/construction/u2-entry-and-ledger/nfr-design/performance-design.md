# 性能・利用環境・使いやすさ・保守性の設計 — U2 登録の検証と明細一覧

入力:

- U2 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-requirements/performance-requirements.md`（NFR1.1〜NFR1.3、NFR2.1〜NFR2.3、NFR6.1、NFR6.2、NFR7.1、NFR7.2）
- U1・U5 の NFR 設計（共通の設計。時間の判定は Chromium だけ、3回の中央値）
- このステージの回答 `nfr-design-questions.md`（質問なし、まとめの確認済み）

## 性能の設計

| ID | 設計 |
|----|------|
| NFR1.1 | 一覧は、表示中の月の明細だけを Ledger.listByMonth で取り出して表に出す（1か月約 100 件。ページ分けなし）。行の key は entryId にして、更新のたびに表全体を作り直さない。集計と一覧は、同じ保存の知らせ（committed・externalChange）と表示月の変化で読み直す。確かめ方: Playwright で 3,000 件・1か月 100 件の保存データから、登録して一覧の行数が増えるまでを Chromium で3回測り、中央値で判定する |
| NFR1.2 | 月の切り替えでは、新しい月の明細だけを取り出す。確かめ方: Playwright で、月の切り替えから一覧の caption の変化までを Chromium で測る |
| NFR1.3 | 二重送信の防止は、ref の鍵と setTimeout(300 ミリ秒) で作る。確かめ方は次の2つに分ける（NFR 要件レビュー R-03）。<br>・境目: Vitest の時計を進めるテストで、鍵を立ててから 299 ミリ秒の操作は捨て、300 ミリ秒をすぎた操作は受け付けることを確かめる<br>・ブラウザ: Playwright で、素早い2回のクリック（dblclick）で明細が1件だけ増え、成功の知らせが残り、誤りの表示が出ないことを確かめる。時間の境目は見ない |

### 大きな貼り付け（NFR 要件レビュー R-02）

- メモ欄に 1 万文字の文字列を貼り付けても、切り詰めと表示の更新が 1 秒以内に終わることを目標にします（Chromium で計測）。
- 見える1文字の数え方は、Intl.Segmenter の結果を先頭から数え、100 文字目に達したら数えるのをやめます（全体を数えない）。
- 入力のたびの判定は、前後の空白を除いた値の長さ（UTF-16 の単位）が 100 以下ならば、Segmenter を使わずに通します（見える1文字の数は、UTF-16 の単位の数を超えないため）。
- 確かめ方: Playwright で 1 万文字を貼り付け、欄の値が 100 文字になるまでを Chromium で測ります。

## 規則の共有の設計

| 関数 | 置き場所 | 使う側 |
|------|----------|--------|
| 日付の実在の判定（isRealDate） | `app/src/domain/textRules.ts`（新規。U5 の validateSnapshot から移す） | Ledger.validate、validateSnapshot |
| 見える1文字の数え方と、先頭から N 文字への切り詰め（countGraphemes、truncateGraphemes） | 同上。Intl.Segmenter はこのファイルで1つだけ作る | Ledger.validate、validateSnapshot、EntryFormView のメモ欄 |

U5 の validateSnapshot の動きは変えません。関数の置き場所を移すだけです。U5 の単体テストが変更なしで通ることを確かめます。

## 利用環境の設計（NFR6）

| ID | 設計 |
|----|------|
| NFR6.1 | 絵文字（結合した家族の絵文字、肌の色の違いなど）を含む 100 文字のメモと、101 文字目の入力を、Playwright で Chromium・Firefox・WebKit の3つで確かめる。Intl.Segmenter は3つのブラウザの最新版で使える |
| NFR6.2 | 変換中かどうかを ref に持つ。compositionstart で立て、compositionend で下ろしてから判定する。単体テストで compositionstart・change・compositionend の事象を送り、変換中は切り詰めず、確定で切り詰めることを確かめる |

### 日本語入力の手での確認（NFR 要件レビュー R-01）

自動の操作では、実際の日本語の変換を再現できません。そのため、U2 の確認（Unit の承認）のときに、依頼者に次の手順を試していただきます。結果は U2 のコードのまとめ（code-summary.md）に記録します。

1. `npm --prefix app run build` と `npm --prefix app run serve` で開く。
2. メモ欄で日本語入力を使い、変換中のまま 100 文字を超える文字を入力する。
3. 変換中に文字が消えたり壊れたりしないことを確かめる。
4. 確定すると 100 文字に切り詰められ、欄の下に「メモは 100 文字までです」が出ることを確かめる。

## 使いやすさとアクセシビリティの設計（NFR2）

| ID | 設計 |
|----|------|
| NFR2.1 | 欄ごとの誤りの文に `<欄の id>-error` の id を付け、欄に aria-describedby と aria-invalid="true" を付ける。誤りがなくなったら両方を外す。Testing Library で、役割と名前、aria の結び付きを確かめる |
| NFR2.2 | Playwright と axe で、4つの状態を検査する。<br>・入力の誤り<br>・別の月の登録<br>・一覧のある月<br>・空の月 |
| NFR2.3 | 一覧の表は、caption（「2026年10月の明細（新しい順）」）、th scope="col" の列見出し、th scope="row" の日付の行見出しを持つ |

## 保守性とテストの設計（NFR7）

| ID | 設計 |
|----|------|
| NFR7.1 | U2 のテストを足したあと、承認済みの確認コマンドで、行カバレッジ 80% 以上を確かめる |
| NFR7.2 | U1 の「入力を確かめてください」のまとめのテストは、まとめを残すため（機能設計 Q1）、変更なしで通る。U1 の金額が空のときの文の期待は、AC1.2.1 の文にそろえる必要があるため、変える場合は理由をコードのまとめに書く |
