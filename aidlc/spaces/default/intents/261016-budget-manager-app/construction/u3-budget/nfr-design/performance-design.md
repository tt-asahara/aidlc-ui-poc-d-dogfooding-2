# 性能・利用環境・使いやすさ・保守性の設計 — U3 月別予算と予算比較

入力:

- U3 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/nfr-requirements/performance-requirements.md`（NFR1.1、NFR1.2、NFR2.1〜NFR2.3、NFR6.1、NFR7.1、NFR7.2）
- U1・U5・U2 の NFR 設計（共通の設計）
- このステージの回答 `nfr-design-questions.md`（質問なし、まとめの確認済み）

## 性能の設計

| ID | 設計 |
|----|------|
| NFR1.1 | Budget.saveMonth は、8つの欄を検証してから、budgetsToReplace の commit を1回だけ呼ぶ。集計は U1 のとおり保存の知らせ（committed）で読み直し、予算の差し込み口（Budget.getMonth）は表示中の月の予算だけを保存データから取り出す。確かめ方: Playwright で 3,000 件の保存データから、予算を保存して残額の表示が変わるまでを Chromium で3回測り、中央値で判定する |
| NFR1.2 | copyFromPrevious も commit を1回だけ呼ぶ。確かめ方: Playwright で、予算のない月で「前の月の予算をコピー」から表示が変わるまでを Chromium で測る |

## 別のタブの変更の伝え方（機能設計レビュー R-06・R-07）

| 項目 | 設計 |
|------|------|
| 番号 | AppShell は AppState に externalChangeSeq（externalChange を受け取るたびに1ずつ増える整数）を足す。lastExternalChangeAt はそのまま残す（U5 の知らせ枠が使う） |
| 受け渡し | AppShell → ReviewView → BudgetTable に externalChangeSeq を渡す |
| 作り直し | BudgetTable は externalChangeSeq の変化で、BR4.2・BR4.3 の作り直しを判断する |
| 1回だけ無視する印 | 自分の保存・コピーが STALE_REVISION を返したら、そのときの externalChangeSeq + 1 を「無視する番号」として覚える。番号がそれと一致する変化では作り直さず、印を消す。それより大きい番号に変わったら、印を消して作り直す |

時刻ではなく番号を使うため、時計を固定したテストや、同じミリ秒に届いた2つの知らせでも、1回ずつ確実に扱えます。

## 利用環境の設計（NFR6）

| ID | 設計 |
|----|------|
| NFR6.1 | 確認の枠の Escape は、枠（role="group"）の keydown で受ける。Playwright で、Chromium・Firefox・WebKit の3つで、保存・コピー・確認の枠（上書きする・やめる・Escape）を確かめる |

## 使いやすさとアクセシビリティの設計（NFR2）

| ID | 設計 |
|----|------|
| NFR2.1 | 予算欄の label は「<カテゴリ名>の予算（円）」。誤りの文に `budget-<カテゴリ名>-error` の id を付け、aria-describedby と aria-invalid で結ぶ。超過は「超過 ¥N」の文字。Testing Library で、名前・結び付き・文字を確かめる |
| NFR2.2 | 確認の枠を開いたら「上書きする」に focus。「やめる」と Escape で閉じ、コピーのボタンに focus を戻す。コピーの失敗でも、枠を閉じてコピーのボタンに focus |
| NFR2.3 | Playwright と axe で、5つの状態（予算の入力の誤り、コピーの確認、コピー元なし、超過、未設定）を検査する。超過と未設定は、U5 のサンプルの前の月（食費の超過、娯楽とその他支出の未設定）で確かめる |

## 保守性とテストの設計（NFR7）

| ID | 設計 |
|----|------|
| NFR7.1 | U3 のテストを足したあと、承認済みの確認コマンドで、行カバレッジ 80% 以上を確かめる |
| NFR7.2 | U1 の ReviewView の「予算は未設定」の表示のテストは、予算のない月で通り続けるようにする。U1 の AppShell のテストは、予算の差し込み口を差し替えても動くよう、組み立ての既定（createAppServices）に Budget を入れる。U1・U5・U2 のテストの期待を変える場合は、理由をコードのまとめに書く |

### 欄の作り直しのテスト（NFR 要件レビュー R-01）

単体テストで、次の3つを確かめます。どれも externalChangeSeq を直接進めて確かめ、時計には頼りません。

1. 自分の保存が STALE_REVISION を返した直後の番号の変化では、入力が残る。その次の番号の変化（本物の別タブの変更）では、欄が作り直され、知らせが出る。
2. 明細の登録など、ほかの部品の保存（dataVersion の変化）では、未保存の予算の入力が残る。
3. 月を切り替えると、入力を捨てて、その月の保存済みの予算を表示する。
