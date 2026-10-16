import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import { createMonthlySummary } from '../../../src/domain/monthlySummary';
import type { Entry, StoreStatus } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { ReviewView } from '../../../src/ui/ReviewView';
import { FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

function setup(entries: readonly Entry[] = []) {
  const storage = new FakeStorage();
  storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot(entries)));
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  const ledger = createLedger({ store });
  const summary = createMonthlySummary({ ledger, budgetSource: { getMonth: () => [] } });
  return { store, ledger, summary };
}

function renderReview(
  options: {
    entries?: readonly Entry[];
    month?: string;
    storeStatus?: StoreStatus;
    onSelectMonth?: (month: string) => void;
  } = {},
) {
  const services = setup(options.entries);
  const props = {
    summary: services.summary,
    // U2 で ReviewView が明細の一覧のために ledger を受け取るようになった（確かめる内容は変えない）。
    ledger: services.ledger,
    month: options.month ?? '2026-10',
    storeStatus: options.storeStatus ?? ('ready' as StoreStatus),
    onSelectMonth: options.onSelectMonth ?? (() => undefined),
  };
  const view = render(<ReviewView {...props} dataVersion={0} />);
  return { ...services, ...view, props };
}

const october = (): Entry[] => [
  makeEntry({ date: '2026-10-01', kind: '収入', category: '給与', amount: 280000 }),
  makeEntry({ date: '2026-10-02', category: '住居費', amount: 82000 }),
  makeEntry({ date: '2026-10-05', category: '食費', amount: 6420 }),
  makeEntry({ date: '2026-10-08', category: '通信費', amount: 4980 }),
  makeEntry({ date: '2026-10-11', category: '食費', amount: 3150 }),
  makeEntry({ date: '2026-10-12', category: '娯楽', amount: 12800 }),
  makeEntry({ date: '2026-10-14', category: '水道光熱費', amount: 9870 }),
];

describe('ReviewView', () => {
  it('表示中の月の収入・支出・差額と、支出カテゴリ別の表を出す（AC3.1.1）', () => {
    renderReview({ entries: october() });

    expect(screen.getByRole('heading', { level: 2, name: '月次集計' })).toBeInTheDocument();
    expect(screen.getByTestId('review-month-label')).toHaveTextContent('2026年10月');
    expect(screen.getByTestId('review-month-label')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('review-income')).toHaveTextContent('¥280,000');
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥119,220');
    expect(screen.getByTestId('review-difference')).toHaveTextContent('¥160,780');
    const table = screen.getByRole('table', { name: '支出カテゴリ別の予算と実績' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['カテゴリ', '予算（円）', '実績', '残額']);
    expect(within(table).getByRole('rowheader', { name: '食費' }).closest('tr')).toHaveTextContent(
      '¥9,570',
    );
    expect(within(table).getAllByRole('rowheader')).toHaveLength(8);
  });

  it('差額が負なら「−」を付けて表示する（AC3.1.2）', () => {
    renderReview({
      entries: [
        makeEntry({ date: '2026-10-01', kind: '収入', category: '副収入', amount: 50000 }),
        makeEntry({ date: '2026-10-02', category: '住居費', amount: 82000 }),
      ],
    });

    expect(screen.getByTestId('review-difference')).toHaveTextContent('−¥32,000');
  });

  it('「前の月」「次の月」で年をまたいで月を切り替える（AC3.1.3）', async () => {
    const onSelectMonth = vi.fn();
    renderReview({ month: '2026-01', onSelectMonth });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '前の月' }));
    await user.click(screen.getByRole('button', { name: '次の月' }));

    expect(onSelectMonth.mock.calls).toEqual([['2025-12'], ['2026-02']]);
  });

  it('予算が設定されていないカテゴリは予算「未設定」、残額「—」と表示する（BR2.7）', () => {
    renderReview({ entries: october() });

    // U2 で明細の一覧の表が加わったため、カテゴリ別の表を名前で選ぶ（確かめる内容は変えない）。
    const table = screen.getByRole('table', { name: '支出カテゴリ別の予算と実績' });
    const rows = within(table).getAllByRole('row').slice(1);
    for (const row of rows) {
      const cells = within(row).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('未設定');
      expect(cells[2]).toHaveTextContent('—');
      expect(row).not.toHaveTextContent('超過');
    }
  });

  it('保存の知らせ（committed）を受けると、表示中の月の集計を読み直す（BR4.5）', () => {
    const { ledger, rerender, props } = renderReview({ entries: october() });

    const added = ledger.add({
      kind: '支出',
      date: '2026-10-15',
      amount: '1000',
      category: '日用品',
      memo: '',
    });
    expect(added.ok).toBe(true);
    rerender(<ReviewView {...props} dataVersion={1} />);

    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥120,220');
    expect(screen.getByTestId('review-difference')).toHaveTextContent('¥159,780');
  });

  it('保存データが読めないときは ¥0 の集計を出さず、理由を出す（BR4.6）', () => {
    renderReview({ entries: october(), storeStatus: 'unreadable' });

    expect(screen.getByText('保存データを読み込めないため、集計を表示できません')).toBeVisible();
    expect(screen.queryByTestId('review-income')).not.toBeInTheDocument();
    expect(screen.queryByText('¥0')).not.toBeInTheDocument();
    expect(screen.queryByText(/明細がありません/)).not.toBeInTheDocument();
  });
});
