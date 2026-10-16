import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEY, snapshotOf } from '../support/app';
import { currentMonth, makeLargeEntries, median } from '../support/largeData';

/**
 * 性能（NFR1.1〜NFR1.3）。時間の判定は Chromium だけで行い、3回測った中央値で判定する（performance-design.md）。
 * 保存データは 3,000 件・1か月 100 件の架空の明細を、開く前に保存領域へ入れておく。
 */
const LIMIT_MS = 1000;

declare global {
  interface Window {
    __u1ReadyAt?: number;
  }
}

async function seedLargeStore(page: Page): Promise<void> {
  const snapshot = snapshotOf(makeLargeEntries(currentMonth()), 3000);
  await page.goto('/');
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    STORAGE_KEY,
    JSON.stringify(snapshot),
  ] as const);
}

function report(name: string, durations: readonly number[]): number {
  const value = median(durations);
  const line = `${name}: ${durations.map((d) => d.toFixed(1)).join(' / ')} ms（中央値 ${value.toFixed(1)} ms）`;
  console.log(`[性能] ${line}`);
  test.info().annotations.push({ type: 'performance', description: line });
  return value;
}

test.describe('U1 薄い版: 性能（3,000 件・1か月 100 件）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');
  test.describe.configure({ mode: 'serial' });

  test('起動から登録フォームと集計が操作できるまで 1 秒以内（NFR1.3）', async ({ page }) => {
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const ready =
          document.querySelector('[data-testid="review-expense"]') &&
          document.querySelector('[data-testid="entry-form-submit"]:not([disabled])');
        if (ready && window.__u1ReadyAt === undefined) {
          window.__u1ReadyAt = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    });
    await seedLargeStore(page);

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await page.reload();
      await page.waitForFunction(() => window.__u1ReadyAt !== undefined);
      durations.push(await page.evaluate(() => window.__u1ReadyAt as number));
      await expect(page.getByTestId('review-expense')).not.toHaveText('¥0');
    }

    expect(report('NFR1.3 起動', durations)).toBeLessThan(LIMIT_MS);
  });

  test('「登録する」を押してから集計が変わるまで 1 秒以内（NFR1.1）', async ({ page }) => {
    await seedLargeStore(page);
    await page.reload();
    await expect(page.getByTestId('review-expense')).not.toHaveText('¥0');

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await page.getByLabel('金額（円）').fill(String(1000 + run));
      await page.getByLabel('カテゴリ').selectOption('日用品');
      durations.push(
        await page.evaluate(async () => {
          const expenseText = () =>
            document.querySelector('[data-testid="review-expense"]')?.textContent ?? '';
          const before = expenseText();
          const started = performance.now();
          (
            document.querySelector('[data-testid="entry-form-submit"]') as HTMLButtonElement
          ).click();
          await new Promise<void>((resolve) => {
            const check = () =>
              expenseText() !== before ? resolve() : requestAnimationFrame(check);
            check();
          });
          await new Promise((resolve) => requestAnimationFrame(resolve));
          return performance.now() - started;
        }),
      );
      await expect(page.getByTestId('entry-form-status')).toContainText('登録しました');
    }

    expect(report('NFR1.1 登録 → 集計', durations)).toBeLessThan(LIMIT_MS);
  });

  test('「前の月」「次の月」を押してから集計が変わるまで 1 秒以内（NFR1.2）', async ({ page }) => {
    await seedLargeStore(page);
    await page.reload();
    await expect(page.getByTestId('review-expense')).not.toHaveText('¥0');

    const durations: number[] = [];
    for (const testId of ['review-prev-month', 'review-next-month', 'review-prev-month']) {
      durations.push(
        await page.evaluate(async (buttonTestId) => {
          const read = (id: string) =>
            document.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';
          const beforeLabel = read('review-month-label');
          const beforeExpense = read('review-expense');
          const started = performance.now();
          (document.querySelector(`[data-testid="${buttonTestId}"]`) as HTMLButtonElement).click();
          await new Promise<void>((resolve) => {
            const check = () =>
              read('review-month-label') !== beforeLabel && read('review-expense') !== beforeExpense
                ? resolve()
                : requestAnimationFrame(check);
            check();
          });
          await new Promise((resolve) => requestAnimationFrame(resolve));
          return performance.now() - started;
        }, testId),
      );
    }

    expect(report('NFR1.2 月の切り替え', durations)).toBeLessThan(LIMIT_MS);
  });
});
