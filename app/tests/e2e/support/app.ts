import { expect, type Locator, type Page } from '@playwright/test';
import { STORAGE_KEY } from '../../../src/store/dataStore';
import type { Entry, StoreSnapshot } from '../../../src/domain/types';

export { STORAGE_KEY };

/** テストの「今日」（地域の時刻）。AC3.1.4 の例と同じ 2026年10月16日。 */
export const TEST_TODAY = new Date('2026-10-16T10:00:00');

/** 「今日」を固定してからアプリを開く。時計の進み（タイマー）は止めない。 */
export async function openApp(page: Page): Promise<void> {
  await page.clock.setFixedTime(TEST_TODAY);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '予算管理' })).toBeVisible();
}

/** 保存領域に文字をそのまま置いてから開き直す。 */
export async function putRawStore(page: Page, raw: string): Promise<void> {
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    STORAGE_KEY,
    raw,
  ] as const);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '予算管理' })).toBeVisible();
}

export async function readRawStore(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

export function snapshotOf(entries: readonly Entry[], revision = 1): StoreSnapshot {
  return {
    schemaVersion: 1,
    revision,
    savedAt: '2026-10-16T00:00:00.000Z',
    entries,
    budgets: [],
  };
}

export interface EntryFormInput {
  kind?: '支出' | '収入';
  date?: string;
  amount: string;
  category: string;
  memo?: string;
}

/** 登録フォームに入力して「登録する」を押す（マウスとキーボードの通常の操作）。 */
export async function register(page: Page, input: EntryFormInput): Promise<void> {
  if (input.kind) {
    await page.getByRole('radio', { name: input.kind }).check();
  }
  if (input.date) {
    await page.getByLabel('日付').fill(input.date);
  }
  await page.getByLabel('金額（円）').fill(input.amount);
  await page.getByLabel('カテゴリ').selectOption(input.category);
  await page.getByLabel('メモ（任意）').fill(input.memo ?? '');
  await page.getByRole('button', { name: '登録する' }).click();
}

export function totals(page: Page): { income: Locator; expense: Locator; difference: Locator } {
  return {
    income: page.getByTestId('review-income'),
    expense: page.getByTestId('review-expense'),
    difference: page.getByTestId('review-difference'),
  };
}
