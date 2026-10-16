import { formatMonthLabel, formatYen } from '../domain/format';
import type { Entry, StoreStatus } from '../domain/types';

export interface LedgerListProps {
  /** 表示中の月の明細（Ledger.listByMonth の結果。日付の新しい順、同じ日付は後から追加したものが上）。 */
  readonly entries: readonly Entry[];
  /** 表示中の月（YYYY-MM）。 */
  readonly month: string;
  readonly storeStatus: StoreStatus;
}

/** 一覧が空のときの案内文（BR3.5、AC2.1.4）。 */
export const LEDGER_EMPTY_TEXT =
  'この月の明細はまだありません。上のフォームから登録するか、CSV を取り込むと、ここに表示されます。';

/** 保存データが読めないときの理由（U1 の集計と同じく、一覧の代わりに出す。W5 手順 4）。 */
export const LEDGER_UNREADABLE_TEXT = '保存データを読み込めないため、明細を表示できません';

/** 「10/05」の形の日付（MM/DD。BR3.2）。 */
function formatListDate(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`;
}

/** 支出は「−¥12,800」、収入は「+¥280,000」（BR3.2、AC2.1.3）。 */
function formatSignedAmount(entry: Entry): string {
  return `${entry.kind === '支出' ? '−' : '+'}${formatYen(entry.amount)}`;
}

/**
 * 明細の一覧（U2 W5、BR3.1〜BR3.5）。表示だけを行い、修正・削除の操作は置かない（BR3.4、AC1.1.6）。
 * メモは React の通常の表示（文字として差し込む）だけで出し、HTML として解釈しない（BR3.3、NFR4.1）。
 */
export function LedgerList({ entries, month, storeStatus }: LedgerListProps) {
  const monthLabel = formatMonthLabel(month);
  return (
    <div className="ledger" data-testid="ledger">
      <h3 id="ledger-heading">{monthLabel}の明細</h3>
      {storeStatus === 'unreadable' ? (
        <p className="notice warn" data-testid="ledger-unreadable">
          {LEDGER_UNREADABLE_TEXT}
        </p>
      ) : entries.length === 0 ? (
        <p className="muted" data-testid="ledger-empty">
          {LEDGER_EMPTY_TEXT}
        </p>
      ) : (
        <table className="ledger-table" data-testid="ledger-table">
          <caption>{monthLabel}の明細（新しい順）</caption>
          <thead>
            <tr>
              <th scope="col">日付</th>
              <th scope="col">区分</th>
              <th scope="col">カテゴリ</th>
              <th scope="col" className="num">
                金額
              </th>
              <th scope="col">メモ</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.entryId} data-testid="ledger-row">
                <th scope="row" className="ledger-date">
                  {formatListDate(entry.date)}
                </th>
                <td>{entry.kind}</td>
                <td>{entry.category}</td>
                <td className="num">{formatSignedAmount(entry)}</td>
                <td className="memo">{entry.memo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
