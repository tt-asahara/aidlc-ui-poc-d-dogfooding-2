import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonthlyBudget, StoreSnapshot } from '../../../src/domain/types';
import { STORAGE_KEY } from '../../../src/store/dataStore';
import { AppShell } from '../../../src/ui/AppShell';
import { BUDGET_TEXT } from '../../../src/ui/BudgetTable';
import {
  createAppServices,
  createBrowserAppServices,
  type AppServices,
} from '../../../src/ui/composition';
import { FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// AppShell の U3 の追加（externalChangeSeq、予算の差し込み口、NFR 設計レビュー R-02・R-03）。
// 部品の境目（Budget → DataStore → AppShell → ReviewView → BudgetTable）を、本物の部品と偽の保存領域で確かめる。
// 「今日」は固定する（時計を固定しても、別のタブの変更は番号で1回ずつ扱われることを確かめる）。値はすべて架空。

/** 2026年10月16日 10:00（地域の時刻）を「今日」に固定する。 */
const fixedNow = () => new Date(2026, 9, 16, 10, 0);

const created: AppServices[] = [];

function budget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: `${month}:${category}`, month, category, amount };
}

function snapshotWith(budgets: readonly MonthlyBudget[], revision: number): StoreSnapshot {
  return {
    ...makeSnapshot([makeEntry({ date: '2026-10-05', category: '食費', amount: 9570 })], revision),
    budgets,
  };
}

function renderApp(storage: FakeStorage, services?: AppServices) {
  const app =
    services ?? createAppServices({ getStorage: () => storage, now: fixedNow, download: vi.fn() });
  created.push(app);
  render(<AppShell services={app} />);
  return { services: app, user: userEvent.setup() };
}

/** 別のタブが保存した（storage イベント）。 */
function otherTabSaves(storage: FakeStorage, next: StoreSnapshot): void {
  const raw = JSON.stringify(next);
  storage.items.set(STORAGE_KEY, raw);
  act(() => {
    window.dispatchEvent(
      Object.assign(new Event('storage'), {
        key: STORAGE_KEY,
        newValue: raw,
        storageArea: storage,
      }),
    );
  });
}

const foodInput = () => screen.getByRole('textbox', { name: '食費の予算（円）' });
const budgetAlert = () => screen.getByTestId('budget-alert-region');
const budgetStatus = () => screen.getByTestId('budget-status-region');

/** 別のタブが先に書いた（このタブにはまだ知らせが届いていない）状態で、予算を保存して STALE_REVISION にする。 */
async function saveAfterOtherTabWroteFirst(storage: FakeStorage) {
  const { user } = renderApp(storage);
  storage.items.set(
    STORAGE_KEY,
    JSON.stringify(snapshotWith([budget('2026-10', '食費', 35000)], 5)),
  );
  await user.clear(foodInput());
  await user.type(foodInput(), '41000');
  await user.click(screen.getByRole('button', { name: '予算を保存' }));
  return user;
}

describe('AppShell（U3）', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    for (const services of created.splice(0)) {
      services.dispose();
    }
    window.localStorage.clear();
  });

  it('別のタブが先に書いたあと予算を保存すると STALE_REVISION になり、その直後の番号の変化では入力が残る（BR5.1、R-03）', async () => {
    const storage = new FakeStorage();
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(snapshotWith([budget('2026-10', '食費', 30000)], 1)),
    );

    await saveAfterOtherTabWroteFirst(storage);

    expect(budgetAlert()).toHaveTextContent(BUDGET_TEXT.saveStale);
    expect(foodInput()).toHaveValue('41000');
    expect(budgetStatus()).toBeEmptyDOMElement();
    // DataStore は最新を読み込み、集計（実績）は最新のまま。全体のお知らせ枠には U5 の知らせが出る。
    expect(screen.getByTestId('notice-other-tab')).toBeVisible();
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null')).toMatchObject({ revision: 5 });
  });

  it('STALE_REVISION のあとの本物の別タブの変更では、欄を最新の予算で作り直して知らせる（BR4.2、R-03）', async () => {
    const storage = new FakeStorage();
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(snapshotWith([budget('2026-10', '食費', 30000)], 1)),
    );
    const user = await saveAfterOtherTabWroteFirst(storage);

    otherTabSaves(storage, snapshotWith([budget('2026-10', '食費', 50000)], 6));

    expect(foodInput()).toHaveValue('50000');
    expect(budgetStatus()).toHaveTextContent(BUDGET_TEXT.otherTabReplaced);
    // 作り直したあとは、保存すれば最新の通し番号で保存できる。
    await user.clear(foodInput());
    await user.type(foodInput(), '42000');
    await user.click(screen.getByRole('button', { name: '予算を保存' }));
    expect(budgetStatus()).toHaveTextContent('10月の予算を保存しました');
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null')).toMatchObject({
      revision: 7,
      budgets: [budget('2026-10', '食費', 42000)],
    });
  });

  it('時計が止まっていても、別のタブの知らせごとに番号が1増え、そのたびに欄を作り直す（R-02、BR4.3）', async () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify(snapshotWith([], 1)));
    const { user } = renderApp(storage);

    for (const [revision, amount] of [
      [2, 11000],
      [3, 12000],
      [4, 13000],
    ] as const) {
      await user.clear(foodInput());
      await user.type(foodInput(), '999');
      otherTabSaves(storage, snapshotWith([budget('2026-10', '食費', amount)], revision));

      // 時刻（lastExternalChangeAt）は毎回同じだが、番号が変わるため、毎回作り直して知らせる。
      expect(foodInput()).toHaveValue(String(amount));
      expect(budgetStatus()).toHaveTextContent(BUDGET_TEXT.otherTabReplaced);
    }
  });

  it('予算の差し込み口は本物の Budget.getMonth で、両方の組み立てで予算・残額・超過が埋まる（NFR7.2）', () => {
    const storage = new FakeStorage();
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(snapshotWith([budget('2026-10', '食費', 40000)], 1)),
    );
    const { services } = renderApp(storage);

    expect(services.summary.summarize('2026-10').categories[0]).toMatchObject({
      category: '食費',
      budget: 40000,
      remaining: 30430,
    });
    expect(services.budget.getMonth('2026-10')).toEqual([budget('2026-10', '食費', 40000)]);
    const table = screen.getByRole('table', { name: '支出カテゴリ別の予算と実績' });
    const food = within(table)
      .getByRole('rowheader', { name: '食費' })
      .closest('tr') as HTMLElement;
    expect(foodInput()).toHaveValue('40000');
    expect(food).toHaveTextContent('¥30,430');
    cleanup();

    // ブラウザの組み立て（サンプル入り）: 前の月（9月）の食費が超過、娯楽は未設定（AC7.1.2）。
    const browser = createBrowserAppServices({ now: fixedNow, download: vi.fn() });
    renderApp(storage, browser);
    const september = browser.summary.summarize('2026-09').categories;
    expect(september.find((row) => row.category === '食費')).toMatchObject({
      budget: 40000,
      actual: 43900,
      over: true,
    });
    expect(september.find((row) => row.category === '娯楽')).toMatchObject({ budget: null });
    expect(browser.budget.getMonth('2026-10')).toHaveLength(6);
  });
});
