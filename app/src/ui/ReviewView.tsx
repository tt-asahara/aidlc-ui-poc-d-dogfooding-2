import { useMemo } from 'react';
import { formatMonthLabel, formatYen } from '../domain/format';
import { nextMonth, previousMonth } from '../domain/month';
import type { MonthlySummary } from '../domain/monthlySummary';
import type { StoreStatus } from '../domain/types';

export interface ReviewViewProps {
  readonly summary: Pick<MonthlySummary, 'summarize'>;
  /** 表示中の月（YYYY-MM）。 */
  readonly month: string;
  readonly storeStatus: StoreStatus;
  /** 保存の知らせ（committed・externalChange）を受けるたびに増える番号。集計を読み直す合図。 */
  readonly dataVersion: number;
  readonly onSelectMonth: (month: string) => void;
}

/** 「2 確認」: 月の切り替えと月次集計（W5、BR2.x、BR4.6）。計算は MonthlySummary に任せる。 */
export function ReviewView({
  summary,
  month,
  storeStatus,
  dataVersion,
  onSelectMonth,
}: ReviewViewProps) {
  const unreadable = storeStatus === 'unreadable';
  // 表示中の月と保存データが変わったときだけ計算し直す（performance-design.md）。
  const result = useMemo(() => {
    // dataVersion は保存の知らせ（committed・externalChange）ごとに読み直すための合図。
    void dataVersion;
    return unreadable ? null : summary.summarize(month);
  }, [summary, month, unreadable, dataVersion]);

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
                    {row.budget === null ? (
                      <span className="muted">未設定</span>
                    ) : (
                      formatYen(row.budget)
                    )}
                  </td>
                  <td className="num">{formatYen(row.actual)}</td>
                  <td className="num">
                    {row.remaining === null ? (
                      <span className="muted">—</span>
                    ) : (
                      formatYen(row.remaining)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 明細の一覧の置き場所（U2）、予算の保存とコピーの置き場所（U3）。U1 では何も表示しない。 */}
        </>
      )}
    </section>
  );
}
