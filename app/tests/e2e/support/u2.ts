import { expect, test, type Locator, type Page } from '@playwright/test';
import { STORAGE_KEY, snapshotOf, TEST_TODAY } from './app';
import { makeLargeEntries, median } from './largeData';

/** U2 のブラウザ操作のテストの共通部品。値はすべて架空。 */

/** 結合した家族の絵文字・肌の色の違いのある絵文字・かな・英字を順に並べた、見える1文字で count 文字の文字列。 */
export function emojiText(count: number): string {
  const parts = ['👨‍👩‍👧‍👦', '👍🏽', 'あ', 'a'];
  return Array.from({ length: count }, (_, index) => parts[index % parts.length]).join('');
}

export function ledgerRows(page: Page): Locator {
  return page.getByTestId('ledger-row');
}

export function submitButton(page: Page): Locator {
  return page.getByRole('button', { name: '登録する' });
}

/**
 * 性能のテスト用: 3,000 件・1か月 100 件（2026年10月を含む直近 30 か月）の保存データを置き、
 * 「今日」を 2026年10月16日に固定して開く。
 */
export async function openWithLargeStore(page: Page): Promise<void> {
  const snapshot = snapshotOf(makeLargeEntries('2026-10'), 3000);
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
  await expect(ledgerRows(page)).toHaveCount(100);
}

/** 3回の計測の中央値を、結果の記録（annotations と標準出力）に残して返す。 */
export function reportDurations(name: string, durations: readonly number[]): number {
  const value = median(durations);
  const line = `${name}: ${durations.map((d) => d.toFixed(1)).join(' / ')} ms（中央値 ${value.toFixed(1)} ms）`;
  console.log(`[性能] ${line}`);
  test.info().annotations.push({ type: 'performance', description: line });
  return value;
}
