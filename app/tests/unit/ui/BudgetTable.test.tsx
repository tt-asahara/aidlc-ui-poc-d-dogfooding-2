import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useMemo, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBudget, type Budget } from '../../../src/domain/budget';
import { createLedger, type Ledger } from '../../../src/domain/ledger';
import { createMonthlySummary, type MonthlySummary } from '../../../src/domain/monthlySummary';
import type {
  Entry,
  MonthSummary,
  MonthlyBudget,
  StoreSnapshot,
  StoreStatus,
} from '../../../src/domain/types';
import {
  createDataStore,
  STORAGE_KEY,
  type DataStore,
  type StorageEventSource,
} from '../../../src/store/dataStore';
import { BUDGET_TEXT, BudgetTable } from '../../../src/ui/BudgetTable';
import { FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// 予算の表（U3 W1〜W6、BR1.x〜BR5.x、NFR2.1、NFR2.2、NFR5.2）。
// 本物の Budget・MonthlySummary・DataStore と偽の保存領域で組み立てる。
// 別のタブの変更の番号（externalChangeSeq）は、AppShell の代わりにテストが props で直接進める。値はすべて架空。

function budget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: `${month}:${category}`, month, category, amount };
}

interface Services {
  readonly store: DataStore;
  readonly ledger: Ledger;
  readonly budget: Budget;
  readonly summary: MonthlySummary;
}

interface HarnessProps {
  readonly services: Services;
  readonly month: string;
  readonly seq: number;
  readonly storeStatus?: StoreStatus;
}

/** ReviewView と同じく、保存の知らせ（committed・externalChange）ごとに集計を読み直して渡す。 */
function Harness({ services, month, seq, storeStatus = 'ready' }: HarnessProps) {
  const [version, setVersion] = useState(0);
  useEffect(() => services.store.subscribe(() => setVersion((current) => current + 1)), [services]);
  const summary: MonthSummary = useMemo(() => {
    void version;
    return services.summary.summarize(month);
  }, [services, month, version]);
  return (
    <BudgetTable
      budget={services.budget}
      month={month}
      summary={summary}
      storeStatus={storeStatus}
      externalChangeSeq={seq}
    />
  );
}

interface SetupOptions {
  readonly budgets?: readonly MonthlyBudget[];
  readonly entries?: readonly Entry[];
  readonly storage?: FakeStorage;
}

function setup(options: SetupOptions = {}) {
  const storage = options.storage ?? new FakeStorage();
  const snapshot: StoreSnapshot = {
    ...makeSnapshot(options.entries ?? []),
    budgets: options.budgets ?? [],
  };
  storage.items.set(STORAGE_KEY, JSON.stringify(snapshot));
  const storageListeners: ((event: Event) => void)[] = [];
  const eventSource = {
    addEventListener: (_type: string, listener: (event: Event) => void) => {
      storageListeners.push(listener);
    },
    removeEventListener: () => undefined,
  } as unknown as StorageEventSource;
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0), eventSource });
  store.load();
  const ledger = createLedger({ store });
  const budgetPart = createBudget({ store });
  const services: Services = {
    store,
    ledger,
    budget: budgetPart,
    summary: createMonthlySummary({ ledger, budgetSource: budgetPart }),
  };
  let current: HarnessProps = { services, month: '2026-10', seq: 0 };
  const view = render(<Harness {...current} />);

  return {
    storage,
    services,
    user: userEvent.setup(),
    /** AppShell の代わりに、表示月や番号を変えて描き直す。 */
    update(next: Partial<HarnessProps>) {
      current = { ...current, ...next };
      view.rerender(<Harness {...current} />);
    },
    /** 別のタブが保存した（storage イベント）。DataStore が最新を読み込んで externalChange を出す。 */
    otherTabSaves(next: StoreSnapshot) {
      const raw = JSON.stringify(next);
      storage.items.set(STORAGE_KEY, raw);
      act(() => {
        for (const listener of storageListeners) {
          listener({ key: STORAGE_KEY, newValue: raw, storageArea: storage } as unknown as Event);
        }
      });
    },
  };
}

const input = (category: string) =>
  screen.getByRole('textbox', { name: `${category}の予算（円）` }) as HTMLInputElement;
const table = () => screen.getByRole('table', { name: '支出カテゴリ別の予算と実績' });
const rowOf = (category: string) =>
  within(table()).getByRole('rowheader', { name: category }).closest('tr') as HTMLElement;
const saveButton = () => screen.getByRole('button', { name: '予算を保存' });
const copyButton = () => screen.getByRole('button', { name: '前の月の予算をコピー' });

function storedBudgets(storage: FakeStorage): readonly MonthlyBudget[] {
  return (JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null') as StoreSnapshot).budgets;
}

const OCTOBER_FOOD = [
  makeEntry({ date: '2026-10-05', category: '食費', amount: 6420 }),
  makeEntry({ date: '2026-10-11', category: '食費', amount: 3150 }),
  makeEntry({ date: '2026-10-12', category: '娯楽', amount: 12800 }),
  makeEntry({ date: '2026-10-01', kind: '収入', category: '給与', amount: 280000 }),
];

const SEPTEMBER_BUDGETS = [budget('2026-09', '食費', 40000), budget('2026-09', '住居費', 82000)];

describe('BudgetTable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('予算・実績・残額を出し、表の名前・見出し・予算欄の名前と注意書きを持つ（AC3.2.1、NFR2.1、BR4.1）', () => {
    setup({ entries: OCTOBER_FOOD, budgets: [budget('2026-10', '食費', 40000)] });

    expect(table()).toHaveAttribute('data-testid', 'review-category-table');
    expect(within(table()).getByText('2026年10月の支出カテゴリ別の予算と実績')).toBeInTheDocument();
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['カテゴリ', '予算（円）', '実績', '残額']);
    expect(input('食費')).toHaveValue('40000');
    expect(input('食費')).toHaveAttribute('inputmode', 'numeric');
    expect(rowOf('食費')).toHaveTextContent('¥9,570');
    expect(within(rowOf('食費')).getByTestId('budget-remaining-食費')).toHaveTextContent('¥30,430');
    expect(screen.getByText(BUDGET_TEXT.unsavedHint)).toBeVisible();
    expect(BUDGET_TEXT.unsavedHint).toBe('「予算を保存」を押すまで、予算は保存されません');
    expect(screen.queryByTestId('budget-unset-guide')).not.toBeInTheDocument();
  });

  it('実績が予算を超えたら残額に「超過 ¥3,900」を文字と超過の色で出し、同額なら ¥0（AC3.2.2、BR2.2）', () => {
    setup({
      entries: [
        makeEntry({ date: '2026-10-05', category: '食費', amount: 43900 }),
        makeEntry({ date: '2026-10-06', category: '通信費', amount: 6000 }),
      ],
      budgets: [budget('2026-10', '食費', 40000), budget('2026-10', '通信費', 6000)],
    });

    const over = within(rowOf('食費')).getByText('超過 ¥3,900');
    expect(over).toHaveClass('over');
    expect(within(rowOf('通信費')).getByTestId('budget-remaining-通信費')).toHaveTextContent(
      /^¥0$/,
    );
    expect(rowOf('通信費')).not.toHaveTextContent('超過');
  });

  it('未設定のカテゴリは予算欄が空で「未設定」、残額「—」、超過にならず、収入カテゴリの行はない（AC3.2.3、AC3.2.4、BR2.3、BR1.3）', () => {
    setup({ entries: OCTOBER_FOOD });

    expect(input('娯楽')).toHaveValue('');
    expect(input('娯楽')).toHaveAttribute('placeholder', '未設定');
    expect(within(rowOf('娯楽')).getByText('未設定')).toBeVisible();
    expect(rowOf('娯楽')).toHaveTextContent('¥12,800');
    expect(within(rowOf('娯楽')).getByTestId('budget-remaining-娯楽')).toHaveTextContent('—');
    expect(rowOf('娯楽')).not.toHaveTextContent('超過');
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(8);
    expect(within(table()).queryByRole('rowheader', { name: '給与' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '給与の予算（円）' })).not.toBeInTheDocument();
    expect(screen.getByTestId('budget-unset-guide')).toHaveTextContent(
      'この月の予算はまだ設定されていません',
    );
  });

  it('「予算を保存」で保存し、「10月の予算を保存しました」を status で出して残額が変わる（AC4.1.1、BR5.3）', async () => {
    const { user, storage } = setup({ entries: OCTOBER_FOOD });

    await user.type(input('食費'), '40000');
    await user.click(saveButton());

    expect(screen.getByRole('status')).toHaveTextContent('10月の予算を保存しました');
    expect(screen.getByTestId('budget-alert-region')).toBeEmptyDOMElement();
    expect(within(rowOf('食費')).getByTestId('budget-remaining-食費')).toHaveTextContent('¥30,430');
    expect(input('食費')).toHaveValue('40000');
    expect(storedBudgets(storage)).toEqual([budget('2026-10', '食費', 40000)]);
  });

  it('誤りの欄に理由・aria-invalid・aria-describedby を付け、まとめを alert で出し、最初の誤りの欄へ移る（AC4.1.2、BR1.2）', async () => {
    const { user, storage } = setup({ budgets: [budget('2026-10', '食費', 40000)] });
    const before = storage.items.get(STORAGE_KEY);

    await user.clear(input('食費'));
    await user.type(input('食費'), '-1');
    await user.type(input('娯楽'), '1.5');
    await user.click(saveButton());

    expect(screen.getByRole('alert')).toHaveTextContent('予算を確かめてください: 食費、娯楽');
    for (const category of ['食費', '娯楽']) {
      expect(input(category)).toHaveAttribute('aria-invalid', 'true');
      expect(input(category)).toHaveAttribute('aria-describedby', `budget-${category}-error`);
      expect(screen.getByTestId(`budget-${category}-error`)).toHaveTextContent(
        '予算は 0〜9,999,999 の整数で入力してください',
      );
    }
    expect(input('住居費')).not.toHaveAttribute('aria-invalid');
    expect(input('食費')).toHaveFocus();
    expect(input('食費')).toHaveValue('-1');
    expect(input('娯楽')).toHaveValue('1.5');
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('今月に予算があれば確認の枠を出し、「やめる」と Escape では何も変えずにコピーのボタンへ戻り、「上書きする」で写す（AC4.2.2、BR3.3、NFR2.2）', async () => {
    const { user, storage } = setup({
      budgets: [...SEPTEMBER_BUDGETS, budget('2026-10', '娯楽', 5000)],
    });

    await user.click(copyButton());
    const group = screen.getByRole('group', { name: '上書きの確認' });
    expect(group).toHaveTextContent('10月の予算を前の月の内容で上書きします');
    expect(within(group).getByRole('button', { name: '上書きする' })).toHaveFocus();
    expect(screen.queryByTestId('budget-copy-confirm-dirty')).not.toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'やめる' }));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(copyButton()).toHaveFocus();

    await user.click(copyButton());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(copyButton()).toHaveFocus();
    expect(input('娯楽')).toHaveValue('5000');

    await user.click(copyButton());
    await user.click(screen.getByRole('button', { name: '上書きする' }));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('前の月の予算を10月に写しました');
    expect(input('食費')).toHaveValue('40000');
    expect(input('住居費')).toHaveValue('82000');
    expect(input('娯楽')).toHaveValue('');
    expect(copyButton()).toHaveFocus();
    expect(storedBudgets(storage).filter((b) => b.month === '2026-10')).toEqual([
      budget('2026-10', '食費', 40000),
      budget('2026-10', '住居費', 82000),
    ]);
  });

  it('今月に予算がなければすぐ写し、未保存の入力があれば確認の枠に「保存していない予算の入力は失われます」を添える（AC4.2.1、BR3.3）', async () => {
    const immediate = setup({ budgets: SEPTEMBER_BUDGETS });
    await immediate.user.click(copyButton());
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('前の月の予算を10月に写しました');
    expect(input('食費')).toHaveValue('40000');
    expect(input('住居費')).toHaveValue('82000');
    cleanup();

    const { user } = setup({ budgets: SEPTEMBER_BUDGETS });
    await user.type(input('交通費'), '8000');
    await user.click(copyButton());
    expect(screen.getByRole('group', { name: '上書きの確認' })).toHaveTextContent(
      '保存していない予算の入力は失われます',
    );
    await user.click(screen.getByRole('button', { name: '上書きする' }));
    expect(input('交通費')).toHaveValue('');
    expect(input('食費')).toHaveValue('40000');
  });

  it('前の月に予算がなければ「前の月の予算がありません」を出し、何も変えない（AC4.2.3、BR3.2）', async () => {
    const { user, storage } = setup({ budgets: [budget('2026-10', '食費', 40000)] });
    const before = storage.items.get(STORAGE_KEY);

    await user.click(copyButton());

    expect(screen.getByRole('status')).toHaveTextContent('前の月の予算がありません');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(input('食費')).toHaveValue('40000');
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('保存の失敗（STORAGE_WRITE・STALE_REVISION）では入力を残し、成功を出さず、STALE の直後の番号の変化では作り直さない（BR5.1、NFR5.2）', async () => {
    const quota = setup({ storage: new QuotaExceededStorage() });
    await quota.user.type(input('食費'), '40000');
    await quota.user.click(saveButton());
    expect(screen.getByRole('alert')).toHaveTextContent(BUDGET_TEXT.saveStorageWrite);
    expect(BUDGET_TEXT.saveStorageWrite).toBe(
      'このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「予算を保存」を押してください',
    );
    expect(screen.getByTestId('budget-status-region')).toBeEmptyDOMElement();
    expect(input('食費')).toHaveValue('40000');
    cleanup();

    const { user, storage, update } = setup({ budgets: [budget('2026-10', '食費', 30000)] });
    // 別のタブが先に保存していた（保存領域の通し番号が進んでいる）。
    const latest = { ...makeSnapshot([], 4), budgets: [budget('2026-10', '食費', 35000)] };
    storage.items.set(STORAGE_KEY, JSON.stringify(latest));
    await user.clear(input('食費'));
    await user.type(input('食費'), '41000');
    await user.click(saveButton());
    expect(screen.getByRole('alert')).toHaveTextContent(
      '別のタブで変更があったため保存できませんでした。入力内容は画面に残っています。もう一度「予算を保存」を押してください',
    );
    // AppShell が STALE_REVISION の externalChange を番号 1 として伝える: 入力は残り、置き換えの知らせは出ない。
    update({ seq: 1 });
    expect(input('食費')).toHaveValue('41000');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(BUDGET_TEXT.otherTabReplaced)).not.toBeInTheDocument();
    // その次の番号の変化（本物の別タブの変更）では、最新の予算で作り直して知らせる。
    update({ seq: 2 });
    expect(input('食費')).toHaveValue('35000');
    expect(screen.getByRole('status')).toHaveTextContent(BUDGET_TEXT.otherTabReplaced);
  });

  it('コピーの失敗では確認の枠を閉じ、失敗を alert で出してコピーのボタンへ戻り、予算は変わらない（BR5.1、NFR2.2）', async () => {
    const { user, storage } = setup({
      storage: new QuotaExceededStorage(),
      budgets: [...SEPTEMBER_BUDGETS, budget('2026-10', '食費', 10000)],
    });
    const before = storage.items.get(STORAGE_KEY);

    await user.click(copyButton());
    await user.click(screen.getByRole('button', { name: '上書きする' }));

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'このブラウザに保存できませんでした。予算は変わっていません。空き容量を確かめてから、もう一度「前の月の予算をコピー」を押してください',
    );
    expect(copyButton()).toHaveFocus();
    expect(input('食費')).toHaveValue('10000');
    expect(screen.getByTestId('budget-status-region')).toBeEmptyDOMElement();
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('別のタブの変更で、確認の枠は閉じて取り消しを知らせ、未保存の入力は最新に置き換えて知らせる（BR4.2、W5）', async () => {
    const { user, update, otherTabSaves } = setup({
      budgets: [...SEPTEMBER_BUDGETS, budget('2026-10', '食費', 10000)],
    });

    await user.click(copyButton());
    otherTabSaves({ ...makeSnapshot([], 2), budgets: [budget('2026-10', '食費', 20000)] });
    update({ seq: 1 });
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      '別のタブで変更があったため、確認を取り消しました。もう一度操作してください',
    );
    expect(copyButton()).toHaveFocus();
    expect(input('食費')).toHaveValue('20000');

    await user.clear(input('食費'));
    await user.type(input('食費'), '777');
    otherTabSaves({ ...makeSnapshot([], 3), budgets: [budget('2026-10', '食費', 25000)] });
    update({ seq: 2 });
    expect(screen.getByRole('status')).toHaveTextContent(
      '別のタブで変更があったため、保存していない予算の入力を最新の内容に置き換えました',
    );
    expect(input('食費')).toHaveValue('25000');
  });

  it('明細の登録などほかの部品の保存（dataVersion の変化）では、未保存の予算の入力を残す（BR4.3）', async () => {
    const { user, services } = setup({ entries: OCTOBER_FOOD });

    await user.type(input('食費'), '12345');
    act(() => {
      const added = services.ledger.add({
        kind: '支出',
        date: '2026-10-15',
        amount: '1000',
        category: '食費',
        memo: '',
      });
      expect(added.ok).toBe(true);
    });

    expect(rowOf('食費')).toHaveTextContent('¥10,570');
    expect(input('食費')).toHaveValue('12345');
    expect(screen.getByTestId('budget-status-region')).toBeEmptyDOMElement();
  });

  it('月を切り替えると、入力・誤り・確認の枠を捨てて、その月の保存済みの予算を出す（BR4.1、W4）', async () => {
    const { user, update } = setup({
      budgets: [...SEPTEMBER_BUDGETS, budget('2026-10', '食費', 10000)],
    });

    await user.clear(input('食費'));
    await user.type(input('食費'), 'abc');
    await user.click(saveButton());
    expect(input('食費')).toHaveAttribute('aria-invalid', 'true');
    await user.click(copyButton());
    expect(screen.getByRole('group')).toBeInTheDocument();

    update({ month: '2026-09' });

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input('食費')).toHaveValue('40000');
    expect(input('食費')).not.toHaveAttribute('aria-invalid');
    expect(within(table()).getByText('2026年9月の支出カテゴリ別の予算と実績')).toBeInTheDocument();
  });

  it('保存データが読めないときは予算欄とボタンを出さず、保存・コピーも呼ばれない（BR5.2）', () => {
    const fake = {
      saveMonth: vi.fn(),
      previewCopy: vi.fn(),
      copyFromPrevious: vi.fn(),
    };
    const summary: MonthSummary = {
      month: '2026-10',
      incomeTotal: 0,
      expenseTotal: 0,
      difference: 0,
      categories: [],
    };
    render(
      <BudgetTable
        budget={fake}
        month="2026-10"
        summary={summary}
        storeStatus="unreadable"
        externalChangeSeq={0}
      />,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(fake.saveMonth).not.toHaveBeenCalled();
    expect(fake.previewCopy).not.toHaveBeenCalled();
    expect(fake.copyFromPrevious).not.toHaveBeenCalled();
  });
});
