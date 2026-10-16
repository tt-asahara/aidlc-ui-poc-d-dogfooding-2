<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-16T14:30:00Z — 受け入れ条件の ID は UI 契約の JSON 形式（AC-[A-Z0-9-]+）に合わせて AC1.1.1 を AC-1-1-1 と表記した; 本文の表では元の ID を併記し、ストーリーとの対応を保った。

## Deviations
- 2026-10-16T14:30:00Z — 明細一覧をラフ案A の「2 確認」の中に移した; 月の切り替えで集計と一覧が同時に変わる方が、表示月の食い違い（要件分析レビュー R-01）を起こしにくいため。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-10-16T14:30:00Z — 見本の確認にヘッドレスの Chrome を使い、DOM の文言とスクリーンショットで確かめた; ブラウザの自動操作の拡張が使えなかったため。キーボード操作と axe は実装後のテストへ回した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
