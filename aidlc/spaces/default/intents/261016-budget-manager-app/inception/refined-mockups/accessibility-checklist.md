# アクセシビリティの確認表（WCAG 2.1 AA 相当）

目標と確かめ方は依頼者が確定しています（ラフモックアップ Q5、このステージの Q4）。要件は NFR2（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`）、ストーリーは US8.1（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`）です。

## 確かめ方

| 方法 | 合格基準 | 時期 |
|------|----------|------|
| 自動検査（axe） | 次の状態で重大（critical・serious）な違反が 0 件: register-default、register-validation-error、csv-duplicate-confirm、csv-import-partial-error、app-storage-corrupt | 実装後のテスト（Playwright から実行） |
| キーボードだけの操作 | 「登録 → 月次集計を確認 → CSV に出力」と、予算の保存・CSV の取り込みを、マウスを使わずに完了できる | 実装後のテスト |
| 初めての利用 | 依頼者が手順書なしで「登録 → 月次集計を確認 → CSV に出力」を 5 分以内に完了 | 実装後に依頼者が確認 |

## 確認項目

| # | 項目 | 基準 | 見本での対応 | 状況 |
|---|------|------|--------------|------|
| 1 | 文字のコントラスト | 本文 4.5:1 以上。大きい文字（24px 以上、太字 18.6667px 以上）は 3:1 以上 | ink／paper 約 15:1、ink-2／paper 約 8.8:1、paper／accent（ボタン）約 8.1:1、warn／paper 約 7.1:1、warn／warn-soft 約 6.2:1（OKLCH の明度からの概算） | 実装後に計測で確認 |
| 2 | 部品のコントラスト | 入力欄の枠・操作位置の枠線は 3:1 以上 | 枠は ink-2（約 8.8:1）、操作位置は accent（約 7:1） | 実装後に計測で確認 |
| 3 | 色だけに頼らない | 超過・誤り・選択中を文字や形でも示す | 「超過 ¥N」の文字、誤りの説明文と太い枠、選択中の区分に下線と太字 | 見本で対応済み |
| 4 | キーボード操作 | すべての操作が Tab・Enter・Space・矢印・Escape で行える | 標準の button・input・select・radio を使用。確認の枠は Escape で閉じる | 実装後に確認 |
| 5 | 操作位置が見える | 3px 以上の枠線 | :focus-visible で 3px の accent 枠 | 見本で対応済み |
| 6 | 本文へ移動 | 最初に Tab で選ばれ、登録フォームの見出しへ移る | 「本文へ移動」のリンク先は登録フォームの見出し（ラフ案C の不一致を解消） | 見本で対応済み |
| 7 | 見出しの階層 | h1 → h2 → h3 の順 | h1「予算管理」、h2 は各ステップ、h3 は明細の見出し | 見本で対応済み |
| 8 | 区画（ランドマーク） | header・main がある | header、main | 見本で対応済み |
| 9 | 入力欄の見出し | 見える見出しと結び付ける | label と for、予算欄は aria-label | 見本で対応済み |
| 10 | 誤りの伝え方 | 文字で理由と直し方を示し、欄と結び付ける | aria-invalid、aria-describedby | 見本で対応済み |
| 11 | お知らせの読み上げ | 成功・失敗を読み上げる | 成功は aria-live="polite"・role="status"、失敗は role="alert" | 見本で対応済み |
| 12 | 拡大 | 200% 拡大で操作できる | rem 指定、768px 以上で1列に切り替え | 実装後に確認 |
| 13 | 言語 | ページの言語を宣言 | lang="ja" | 見本で対応済み |
| 14 | 動き | 「視差効果を減らす」の設定で動きを止める | prefers-reduced-motion で無効化 | 見本で対応済み |
| 15 | 押せる大きさ | 44×44px 以上 | ボタン・入力欄の高さ 44px 以上 | 見本で対応済み |
| 16 | 表 | 見出しセルと説明 | caption、th scope | 見本で対応済み |

## 大きい文字の基準の補正

参照したデザイン手法の資料では、大きい文字を「18px 以上、または 14px の太字」と書いています。WCAG の定義は 18pt（24px）以上、または 14pt（18.6667px）の太字です。この確認表は WCAG の値を使います（`wcag-correction-report.json`）。参照資料そのものは書き換えていません。
