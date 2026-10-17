import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Entry, MonthlyBudget, StoreSnapshot } from '../../../src/domain/types';
import { STORAGE_KEY, TEST_TODAY } from './app';
import { median } from './largeData';

/** U3 のブラウザ操作のテストの共通部品。値はすべて架空。 */

/** 1秒以内（NFR1.1、NFR1.2。Chromium、3回の中央値）。 */
export const LIMIT_MS = 1000;

export function budget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: `${month}:${category}`, month, category, amount };
}

export function snapshotWith(
  entries: readonly Entry[],
  budgets: readonly MonthlyBudget[],
  revision = 1,
): StoreSnapshot {
  return { schemaVersion: 1, revision, savedAt: '2026-10-16T00:00:00.000Z', entries, budgets };
}

/** 架空の支出の明細。addedOrder は保存データの中で重ならない番号を渡す。 */
export function expenseEntry(order: number, date: string, category: string, amount: number): Entry {
  return {
    entryId: `u3-${order}`,
    date,
    kind: '支出',
    category,
    amount,
    memo: '架空',
    addedOrder: order,
  };
}

/**
 * 保存データを置いてから、「今日」を 2026年10月16日に固定して開く（サンプル投入は起きない）。
 * 置くのは保存データがないときだけ（開き直しでは、保存した内容をそのまま使う）。
 */
export async function openWithSnapshot(page: Page, snapshot: StoreSnapshot): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, value);
      }
    },
    [STORAGE_KEY, JSON.stringify(snapshot)] as const,
  );
  await page.clock.setFixedTime(TEST_TODAY);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '予算管理' })).toBeVisible();
}

export function budgetInput(page: Page, category: string): Locator {
  return page.getByRole('textbox', { name: `${category}の予算（円）`, exact: true });
}

export function remainingCell(page: Page, category: string): Locator {
  return page.getByTestId(`budget-remaining-${category}`);
}

export function saveButton(page: Page): Locator {
  return page.getByRole('button', { name: '予算を保存' });
}

export function copyButton(page: Page): Locator {
  return page.getByRole('button', { name: '前の月の予算をコピー' });
}

export function previousMonthButton(page: Page): Locator {
  return page.getByRole('button', { name: '前の月', exact: true });
}

export function confirmGroup(page: Page): Locator {
  return page.getByRole('group', { name: '上書きの確認' });
}

/** 保存データの予算（読めなければ null）。 */
export async function storedBudgets(page: Page): Promise<MonthlyBudget[] | null> {
  return page.evaluate((key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
        budgets?: MonthlyBudget[];
      } | null;
      return parsed && Array.isArray(parsed.budgets) ? parsed.budgets : null;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

/**
 * ボタンを押してから、残額の欄の文字が変わり、次の描画が終わるまでの時間（ミリ秒）を、ページの中で測る。
 */
export async function measureUntilRemainingChanges(
  page: Page,
  buttonTestId: string,
  category: string,
): Promise<number> {
  return page.evaluate(
    async ([testId, remainingTestId]) => {
      const read = () =>
        document.querySelector(`[data-testid="${remainingTestId}"]`)?.textContent ?? '';
      const before = read();
      const started = performance.now();
      (document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
      await new Promise<void>((resolve) => {
        const check = () => (read() !== before ? resolve() : requestAnimationFrame(check));
        check();
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return performance.now() - started;
    },
    [buttonTestId, `budget-remaining-${category}`] as const,
  );
}

/** 3回の計測の中央値を、結果の記録（annotations と標準出力）に残して返す。 */
export function report(name: string, durations: readonly number[]): number {
  const value = median(durations);
  const line = `${name}: ${durations.map((d) => d.toFixed(1)).join(' / ')} ms（中央値 ${value.toFixed(1)} ms）`;
  console.log(`[性能] ${line}`);
  test.info().annotations.push({ type: 'performance', description: line });
  return value;
}
