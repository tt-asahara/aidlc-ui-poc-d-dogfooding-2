import { expect, test } from '@playwright/test';
import { openFirstRun, readRawStore, totals } from '../support/app';
import { expectNoBannerNotice, median, storedEntryCount } from '../support/u5';

/**
 * 初回のサンプル（U5 AC7.1.1、AC7.1.3、NFR1.2、NFR8.1）。
 * 「今日」は 2026年10月16日に固定。サンプルは 2026年8月〜10月の3か月分（54 件）。
 */
test.describe('U5: 初回のサンプル', () => {
  test('初めて開くと3か月分のサンプルが入って今月の集計が出て、開き直しても増えない（AC7.1.1、AC7.1.3、NFR8.1）', async ({
    page,
  }) => {
    await openFirstRun(page);
    const { income, expense, difference } = totals(page);

    await expect(page.getByTestId('review-month-label')).toHaveText('2026年10月');
    await expect(income).toHaveText('¥280,000');
    await expect(expense).toHaveText('¥156,780');
    await expect(difference).toHaveText('¥123,220');
    await expectNoBannerNotice(page);
    expect(await storedEntryCount(page)).toBe(54);

    await page.getByRole('button', { name: '前の月' }).click();
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年9月');
    await expect(income).toHaveText('¥312,000');
    await expect(expense).toHaveText('¥169,480');
    await page.getByRole('button', { name: '前の月' }).click();
    await expect(expense).toHaveText('¥156,780');

    const savedBefore = await readRawStore(page);
    await page.reload();
    await expect(expense).toHaveText('¥156,780');
    expect(await storedEntryCount(page)).toBe(54);
    expect(await readRawStore(page)).toBe(savedBefore);
  });
});

declare global {
  interface Window {
    __u5SampleReadyAt?: number;
  }
}

test.describe('U5: 初回のサンプルの性能', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');

  test('空の保存領域から開いて、サンプルの入った集計が出るまで 1 秒以内（NFR1.2。3回の中央値）', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const expense = document.querySelector('[data-testid="review-expense"]');
        if (expense && expense.textContent !== '¥0' && window.__u5SampleReadyAt === undefined) {
          window.__u5SampleReadyAt = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true, characterData: true });
    });
    await page.goto('/');

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await page.waitForFunction(() => window.__u5SampleReadyAt !== undefined);
      durations.push(await page.evaluate(() => window.__u5SampleReadyAt as number));
      expect(await storedEntryCount(page)).toBe(54);
    }

    const value = median(durations);
    const line = `NFR1.2 初回のサンプル: ${durations.map((d) => d.toFixed(1)).join(' / ')} ms（中央値 ${value.toFixed(1)} ms）`;
    console.log(`[性能] ${line}`);
    test.info().annotations.push({ type: 'performance', description: line });
    expect(value).toBeLessThan(1000);
  });
});
