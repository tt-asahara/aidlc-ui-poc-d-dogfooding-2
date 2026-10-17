## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-17T01:34:53Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | app/src/ui/BudgetTable.tsx > 予算欄のセル（`<input placeholder="未設定">` と `<span className="muted budget-unset">未設定</span>`） | 予算が未設定のカテゴリでは、入力欄のプレースホルダーと隣の span の両方が「未設定」と表示される。画面上は同じ文言が二重に出て、読み上げでも重なりやすい。BR2.3 は「予算欄を空（プレースホルダー「未設定」）」と定めており、span は仕様にない。 | どちらかを外すか、span を aria-hidden にする。外す場合は、U1 の e2e が span の「未設定」を参照していないか確かめる。 | New |
| R-02 | Minor | app/src/ui/BudgetTable.tsx > 「無視する番号」（`ignoreSeq`）の設定箇所 | STALE_REVISION を受けたときに `seqAtCall + 1` を無視する番号として覚える。DataStore の commit は STALE_REVISION の前に必ず externalChange を出す（dataStore.ts の手順 4）ので、いまは正しく動く。ただし、この前提は dataStore.ts の実装に暗黙に依存している。DataStore 側が将来 externalChange を出さずに STALE_REVISION を返すと、印が残り、次の本物の別タブの変更が1回無視される。コード上にその前提を書いた記述が見当たらない。 | 「STALE_REVISION は必ず externalChange を伴う」という前提を、`BudgetTable.tsx` のコメントか単体テストに明記する。 | New |
| R-03 | Minor | `.claude/tools/aidlc-sensor-ui-poc-evidence.ts`、`.claude/tools/data/plugin-compose-ui-poc.json`、`.claude/tools/data/plugin-owned-ui-poc.json`、`.claude/tools/ui-poc-c-routing.cjs`、`.claude/tools/ui-poc/c-stage-routing.json`（`git status` の変更） | source-manifest.json の 27 のパスに含まれていない `.claude/tools` 配下の 5 ファイルに、未コミットの変更がある。U3 の成果物とは無関係に見える。このユニットのコミットに混ざると、U3 の変更範囲が不明確になる。 | U3 のコミットに含めないこと。含めるなら、source-manifest.json に載せて理由を説明する。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm --prefix app run lint` | PASS（`--max-warnings 0`） | 警告もエラーもない。 |
| `npm --prefix app run typecheck` | PASS | 型エラーなし。 |
| `npm --prefix app run test:unit` | PASS（24 ファイル、201 テスト） | すべて成功。 |
| `vitest --coverage`（単体） | 全体の行 98.13%。budget.ts は行 100%。BudgetTable.tsx は行 96.57%（未到達は 217、256、301-304 行目）。AppShell.tsx は行 97.91%。ReviewView.tsx は行 100% | 80% の下限を十分に超える。budget.ts は行 100%。未到達の 301-304 行目は `handleConfirmKeyDown` の分岐とみられるが、確認していない（Escape の動きは e2e の copy.spec.ts にある）。 |
| source-manifest.json の writes 27 件の存在確認 | すべて存在（MISSING なし） | 申告どおり。 |
| `git diff -- app/csp-policy.json app/index.html app/vite.config.ts app/package.json` | 差分なし | CSP、ビルド設定、依存を変えていない。 |
| `git diff -- app/tests/e2e` | 変更は `getByLabel('カテゴリ', { exact: true })` と `getByRole('button', { name: '前の月', exact: true })` への置き換えだけ。期待値や目標値の変更はなし。`const previous` に切り出しただけの箇所も同じ操作 | 弱めた形跡はない。U3 が加えた「前の月の予算をコピー」と予算の表の名前に当たらないようにするための必要な変更で、申告どおり。 |
| 実装の読み合わせ（BR1.1〜BR5.3） | 下に要約 | 重大な欠陥は見つからなかった。 |

実装の読み合わせの要約（根拠は `app/src/domain/budget.ts` と `app/src/ui/BudgetTable.tsx` の読み）:

- BR1.1/BR1.2: `parseAmount` は前後の空白を除き、空は未設定、半角数字以外と 0〜9,999,999 の範囲外は誤りとする。誤りが 1 つでもあれば `commit` を呼ばない。保存は `replaceMonth` の `budgetsToReplace` を 1 回だけ呼び、DataStore の `applyChange` はその月以外の予算を残し、明細も変えない。
- BR1.3: 行は `listCategoryNames('支出')` だけで作る。収入は `MonthlySummary` のカテゴリ行に入らない。
- BR3.x: 前の月は `previousMonth` で決まる。予算がなければ NOT_FOUND でデータは変わらない。確認の枠は「保存済みの予算あり、または dirty」で出る。「やめる」と Escape は操作位置をコピーのボタンへ戻す。コピーは呼んだ時点の予算で月をまるごと置き換える。
- BR4.3/BR5.1: `externalChangeSeq` は AppShell が externalChange のたびに 1 ずつ増やす。「1回だけ無視する印」は ref ではなく state（`ignoreSeq`）で、STALE_REVISION のときだけ `seqAtCall + 1` を立てる。DataStore は STALE_REVISION の前に externalChange を同期で出すので、同じバッチで番号が進み、描画で印が下りる。入力は残り、`role="alert"` の失敗の知らせが出て、成功の表示は出ない。STORAGE_WRITE でも同様。
- BR5.2: `storeStatus === 'unreadable'` では BudgetTable が null を返す。
- アクセシビリティ: 誤りのある欄に `aria-invalid` と `aria-describedby` が付く。成功は `aria-live="polite"` の領域、失敗は `aria-live="assertive"` の領域に分かれる。確認の枠は `role="group"` と `aria-labelledby` を持つ。
- テストの質: `budget.test.ts`（expect 52 件）、`BudgetTable.test.tsx`（14 ケース、expect 102 件）、`AppShell.u3.test.tsx`（expect 18 件）は実際の値を確かめている。常に通る形は見当たらない。Playwright の再実行は行っていない（申告は 166 件成功、20 件スキップ）。

### Summary

指摘は Minor が 3 件で、Critical と Major はない。lint、typecheck、単体テスト 201 件は成功し、行カバレッジも十分で、CSP などのビルド設定に差分はなかった。既存の e2e の変更は `exact: true` の追加などに限られ、期待値を弱めていない。BR1.1〜BR5.3 と STALE_REVISION の扱いは実装と合っている。以上から READY とする。
