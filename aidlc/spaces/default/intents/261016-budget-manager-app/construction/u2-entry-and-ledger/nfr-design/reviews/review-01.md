## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T23:03:34Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-design/performance-design.md > 規則の共有の設計 | 「Intl.Segmenter はこのファイルで1つだけ作る」とあるが、作る時機が書かれていない。現在の validateSnapshot（`app/src/domain/validateSnapshot.ts` の createMemoLengthCheck）は、長さが 100 以下なら Segmenter を作らず、必要になってから作る（U5 NFR 設計レビュー R-01 の対応）。textRules の読み込み時に作る形で実装すると、その対応が戻り、Segmenter のない環境ではアプリ全体の読み込みが失敗する。 | textRules では Segmenter を初めて必要になったときに作る（遅延生成）と明記し、長さが 100 以下のときは作らない近道を countGraphemes 側に残すと書く。 | New |
| R-02 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-design/performance-design.md > NFR1.3 | 時計を進める単体テストの書き方が決まっていない。Vitest の偽の時計と Testing Library の waitFor・userEvent の既定の待ちを併用すると、止まったり不安定になったりすることがよく知られている。 | テストでは fireEvent と act と vi.advanceTimersByTime を使い、waitFor と既定の遅延つきの userEvent は使わない、と書く。タイマーはアンマウントで解除する。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-design/performance-design.md > 保守性とテストの設計（NFR7.2） | U1 のテストを変更なしで通すと書いているのは誤りのまとめと金額の文だけである。`app/tests/unit/ui/EntryFormView.test.tsx` の 48 行目は、メモ欄の maxLength が '100' であることを確かめており、機能設計（W4、BR1.4）で maxLength を外すと失敗する。この変更が NFR7.2 の扱いに入っていない。 | NFR7.2 に、maxLength を確かめる U1 のテストを、新しい制限の確かめ（欄の値の切り詰め）に置き換えることと、理由をコードのまとめに書くことを加える。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/nfr-design/security-design.md > メモの切り詰めの対象 | 「先頭に空白のある 101 文字の貼り付け」の 101 が、空白を含む数か含まない数かが分からない。空白を含む 101 なら、空白を除くと 100 文字で切り詰めは起きない。テストの期待値を実装者が取り違えるおそれがある。 | テストの例を、空白を除いて 101 文字（空白 + 101 文字）と明記し、期待値（100 文字に切り詰め、「メモは 100 文字までです」が出る）を書く。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability sensor（依頼文の報告） | PASS | NFR1.1〜NFR7.2 の 16 件がすべて対応づけられている |
| 依存の向きの確認（手による、logical-components.md） | 循環なし | textRules は他に依存しない最下層。Ledger は DataStore を型だけで使う（ledger.ts の import type）ため、DataStore → validateSnapshot → textRules とも循環しない |
| 既存コードとの突き合わせ | 問題あり（軽微） | isRealDate は validateSnapshot の内部関数で、他に使う所も、Segmenter を使うテストもないため、移動で U5 のテストは壊れない。ただし R-01 と R-03 の点が残る |

### Summary

textRules への共有、ref の鍵と 300 ミリ秒、変換中の判定、Chromium だけの時間の判定は、いずれも一般的なブラウザの動きと合っており、循環も U5 の動きの破壊も見つかりませんでした。Critical と Major はなく、実装時に取り違えやすい軽微な点（Segmenter の作る時機、偽の時計のテストの書き方、maxLength のテストの置き換え、切り詰めの例の曖昧さ）が 4 件あります。
