import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import type { Entry } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { LedgerList } from '../../../src/ui/LedgerList';
import { makeEntry, makeSnapshot } from '../support/entries';
import { FakeStorage } from '../support/fakeStorage';

// 明細の一覧（U2 W5、BR3.1〜BR3.5、AC1.1.5、AC1.1.6、AC2.1.1、AC2.1.3、AC2.1.4、NFR2.3、NFR4.1）。

/** 保存データから Ledger.listByMonth で取り出した、表示中の月の明細（画面と同じ取り出し方）。 */
function listOf(entries: readonly Entry[], month = '2026-10'): Entry[] {
  const storage = new FakeStorage();
  storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot(entries)));
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  return createLedger({ store }).listByMonth(month);
}

function renderList(entries: readonly Entry[], month = '2026-10') {
  return render(<LedgerList entries={listOf(entries, month)} month={month} storeStatus="ready" />);
}

const rowTexts = () =>
  screen.getAllByTestId('ledger-row').map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  );

describe('LedgerList', () => {
  it('日付の新しい順に並べ、同じ日付は後から追加したものを上にする（AC2.1.1、BR3.1）', () => {
    renderList([
      makeEntry({ date: '2026-10-01', memo: '1日', addedOrder: 1 }),
      makeEntry({ date: '2026-10-05', memo: '5日の先', addedOrder: 2 }),
      makeEntry({ date: '2026-10-05', memo: '5日の後', addedOrder: 3 }),
      makeEntry({ date: '2026-09-30', memo: '前の月', addedOrder: 4 }),
    ]);

    expect(screen.getAllByRole('rowheader').map((th) => th.textContent)).toEqual([
      '10/05',
      '10/05',
      '10/01',
    ]);
    expect(rowTexts().map((cells) => cells[3])).toEqual(['5日の後', '5日の先', '1日']);
  });

  it('金額は支出に「−」、収入に「+」を付け、¥ と3桁区切りで右揃えにする（AC2.1.3、BR3.2）', () => {
    renderList([
      makeEntry({ date: '2026-10-12', category: '娯楽', amount: 12800, memo: '観劇' }),
      makeEntry({ date: '2026-10-01', kind: '収入', category: '給与', amount: 280000, memo: '' }),
    ]);

    expect(rowTexts()).toEqual([
      ['支出', '娯楽', '−¥12,800', '観劇'],
      ['収入', '給与', '+¥280,000', ''],
    ]);
    const amountCell = within(screen.getAllByTestId('ledger-row')[0]!).getByText('−¥12,800');
    expect(amountCell).toHaveClass('num');
  });

  it('メモの「<b>太字</b>」は書式にならず、文字のまま表示する（AC1.1.5、BR3.3、NFR4.1）', () => {
    const { container } = renderList([makeEntry({ date: '2026-10-14', memo: '<b>太字</b>' })]);

    expect(screen.getByText('<b>太字</b>')).toBeVisible();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>太字</b>')).toHaveClass('memo');
  });

  it('行に修正・削除のボタンやリンクなどの操作を置かない（AC1.1.6、BR3.4）', () => {
    renderList([
      makeEntry({ date: '2026-10-14', memo: '架空の明細' }),
      makeEntry({ date: '2026-10-13', kind: '収入', category: '副収入', amount: 5000 }),
    ]);

    const table = screen.getByTestId('ledger-table');
    expect(within(table).queryAllByRole('button')).toEqual([]);
    expect(within(table).queryAllByRole('link')).toEqual([]);
    expect(within(table).queryAllByRole('textbox')).toEqual([]);
    expect(table.querySelectorAll('input, select, a, button, [tabindex]')).toHaveLength(0);
  });

  it('明細のない月は空の表を出さず、案内文を出す。保存データが読めないときは理由を出す（AC2.1.4、BR3.5）', () => {
    const { unmount } = renderList([makeEntry({ date: '2026-09-28' })], '2026-10');

    expect(screen.getByTestId('ledger-empty')).toHaveTextContent(
      'この月の明細はまだありません。上のフォームから登録するか、CSV を取り込むと、ここに表示されます。',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    unmount();

    render(<LedgerList entries={[]} month="2026-10" storeStatus="unreadable" />);
    expect(screen.getByTestId('ledger-unreadable')).toHaveTextContent(
      '保存データを読み込めないため、明細を表示できません',
    );
    expect(screen.queryByTestId('ledger-empty')).not.toBeInTheDocument();
  });

  it('表は caption「2026年10月の明細（新しい順）」、列見出し th scope=col、日付の行見出し th scope=row を持つ（NFR2.3）', () => {
    renderList([makeEntry({ date: '2026-10-14' })]);

    const table = screen.getByRole('table', { name: '2026年10月の明細（新しい順）' });
    const columnHeaders = within(table).getAllByRole('columnheader');
    expect(columnHeaders.map((th) => th.textContent)).toEqual([
      '日付',
      '区分',
      'カテゴリ',
      '金額',
      'メモ',
    ]);
    for (const th of columnHeaders) {
      expect(th).toHaveAttribute('scope', 'col');
    }
    expect(within(table).getByRole('rowheader', { name: '10/14' })).toHaveAttribute('scope', 'row');
    expect(screen.getByRole('heading', { level: 3, name: '2026年10月の明細' })).toBeVisible();
  });
});
