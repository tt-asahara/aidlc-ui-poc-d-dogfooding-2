import { useMemo } from 'react';
import type { Budget } from '../domain/budget';
import { formatMonthLabel, formatYen } from '../domain/format';
import type { Ledger } from '../domain/ledger';
import { nextMonth, previousMonth } from '../domain/month';
import type { MonthlySummary } from '../domain/monthlySummary';
import type { MonthSummary, StoreStatus } from '../domain/types';
import { BudgetTable } from './BudgetTable';
import { LedgerList } from './LedgerList';

export interface ReviewViewProps {
  readonly summary: Pick<MonthlySummary, 'summarize'>;
  /** 明細の一覧の取り出し（U2 W5、BR3.1）。AppShell が services.ledger を渡す。 */
  readonly ledger: Pick<Ledger, 'listByMonth'>;
  /** 表示中の月（YYYY-MM）。 */
  readonly month: string;
  readonly storeStatus: StoreStatus;
  /** 保存の知らせ（committed・externalChange）を受けるたびに増える番号。集計を読み直す合図。 */
  readonly dataVersion: number;
  readonly onSelectMonth: (month: string) => void;
  /**
   * 月別予算（U3）。渡されたときは、支出カテゴリ別の表を予算の入力ができる BudgetTable に置き換える。
   * 省略したときは U1 の表示（予算は表示だけ）のまま。AppShell は必ず渡す（NFR 設計レビュー R-01）。
   */
  readonly budget?: Pick<Budget, 'saveMonth' | 'previewCopy' | 'copyFromPrevious'>;
  /** 別のタブの変更の番号（AppState.externalChangeSeq）。省略時は 0。 */
  readonly externalChangeSeq?: number;
}

/** U1 の支出カテゴリ別の表（予算は表示だけ）。budget を渡さないときに使う。 */
function CategoryTable({ result }: { result: MonthSummary }) {
  return (
    <table data-testid="review-category-table">
      <caption>支出カテゴリ別の予算と実績</caption>
      <thead>
        <tr>
          <th scope="col">カテゴリ</th>
          <th scope="col" className="num">
            予算（円）
          </th>
          <th scope="col" className="num">
            実績
          </th>
          <th scope="col" className="num">
            残額
          </th>
        </tr>
      </thead>
      <tbody>
        {result.categories.map((row) => (
          <tr key={row.category}>
            <th scope="row">{row.category}</th>
            <td className="num">
              {row.budget === null ? <span className="muted">未設定</span> : formatYen(row.budget)}
            </td>
            <td className="num">{formatYen(row.actual)}</td>
            <td className="num">
              {row.remaining === null ? <span className="muted">—</span> : formatYen(row.remaining)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 「2 確認」: 月の切り替えと月次集計（U1 W5、BR2.x、BR4.6）と、明細の一覧（U2 W5、BR3.1〜BR3.5）。
 * 計算は MonthlySummary に、明細の取り出しは Ledger に任せる。
 */
export function ReviewView({
  summary,
  ledger,
  month,
  storeStatus,
  dataVersion,
  onSelectMonth,
  budget,
  externalChangeSeq = 0,
}: ReviewViewProps) {
  const unreadable = storeStatus === 'unreadable';
  // 表示中の月と保存データが変わったときだけ計算し直す（performance-design.md）。
  const result = useMemo(() => {
    // dataVersion は保存の知らせ（committed・externalChange）ごとに読み直すための合図。
    void dataVersion;
    return unreadable ? null : summary.summarize(month);
  }, [summary, month, unreadable, dataVersion]);
  // 一覧も、集計と同じ合図（保存の知らせと表示月の変化）で、表示中の月の明細だけを読み直す（U2 NFR1.1、NFR1.2）。
  const entries = useMemo(() => {
    void dataVersion;
    return unreadable ? [] : ledger.listByMonth(month);
  }, [ledger, month, unreadable, dataVersion]);

  return (
    <section className="step" aria-labelledby="summary-heading" data-testid="review-section">
      <p className="step-label">2 確認</p>
      <h2 id="summary-heading">月次集計</h2>
      <div className="month-nav">
        <button
          type="button"
          onClick={() => onSelectMonth(previousMonth(month))}
          data-testid="review-prev-month"
        >
          <span aria-hidden="true">‹ </span>前の月
        </button>
        <strong aria-live="polite" data-testid="review-month-label">
          {formatMonthLabel(month)}
        </strong>
        <button
          type="button"
          onClick={() => onSelectMonth(nextMonth(month))}
          data-testid="review-next-month"
        >
          次の月<span aria-hidden="true"> ›</span>
        </button>
      </div>
      {result === null ? (
        <p className="notice warn" data-testid="review-unreadable">
          保存データを読み込めないため、集計を表示できません
        </p>
      ) : (
        <>
          <div className="totals">
            <div>
              <div className="label">収入</div>
              <div className="value num" data-testid="review-income">
                {formatYen(result.incomeTotal)}
              </div>
            </div>
            <div>
              <div className="label">支出</div>
              <div className="value num" data-testid="review-expense">
                {formatYen(result.expenseTotal)}
              </div>
            </div>
            <div>
              <div className="label">差額</div>
              <div className="value num" data-testid="review-difference">
                {formatYen(result.difference)}
              </div>
            </div>
          </div>
          {budget ? (
            // 予算の入力・保存・コピー（U3）。保存データが読めないときは、ここに来ない（BR5.2）。
            <BudgetTable
              budget={budget}
              month={month}
              summary={result}
              storeStatus={storeStatus}
              externalChangeSeq={externalChangeSeq}
            />
          ) : (
            <CategoryTable result={result} />
          )}
        </>
      )}
      <LedgerList entries={entries} month={month} storeStatus={storeStatus} />
    </section>
  );
}
