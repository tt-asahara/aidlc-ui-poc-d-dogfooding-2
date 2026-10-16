<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-16T11:53:47Z — 4機能はすべて依頼文で「必要」とされているため、Must/Should の振り分けは聞かず、各機能の作り込みの深さを質問した; 依頼文で決まっていることを聞き直さないため。

## Deviations
- 2026-10-16T11:53:47Z — 実現可能性評価と制約一覧は今回の進め方の範囲外のため参照していない; 範囲定義書にその旨を明記した。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-10-16T11:53:47Z — 優先度付けは WSJF/RICE ではなく MoSCoW を採用した; 依頼者1人の固定範囲の試作で、全機能が Must のため、並び順は価値優先で決めれば十分。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-10-16T11:53:47Z — 削除不可かつ CSV 取り込みが追加のみのため、再取り込みで明細が重複する; 要件分析で重複の扱い、未登録カテゴリの扱い、予算未設定時の表示を決める。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
