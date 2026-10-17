import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../support/app';
import { makeLargeEntries } from '../support/largeData';
import {
  budget,
  budgetInput,
  confirmGroup,
  copyButton,
  LIMIT_MS,
  measureUntilRemainingChanges,
  openWithSnapshot,
  report,
  snapshotWith,
  storedBudgets,
} from '../support/u3';

/**
 * 前の月の予算のコピー（U3 AC4.2.1〜AC4.2.3、BR3.3、NFR1.2、NFR2.2、NFR6.1）。
 * 「今日」は 2026年10月16日に固定。値はすべて架空。
 */
const SEPTEMBER = [budget('2026-09', '食費', 40000), budget('2026-09', '住居費', 82000)];

test.describe('U3: 前の月の予算のコピー', () => {
  test('10月に予算がなければ、9月の食費と住居費をすぐ写す（AC4.2.1）', async ({ page }) => {
    await openWithSnapshot(page, snapshotWith([], SEPTEMBER));

    await copyButton(page).click();

    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算を10月に写しました');
    await expect(budgetInput(page, '食費')).toHaveValue('40000');
    await expect(budgetInput(page, '住居費')).toHaveValue('82000');
    await expect(budgetInput(page, '娯楽')).toHaveValue('');
    expect((await storedBudgets(page))?.filter((b) => b.month === '2026-10')).toEqual([
      budget('2026-10', '食費', 40000),
      budget('2026-10', '住居費', 82000),
    ]);
  });

  test('10月に予算があれば確認を出し、「やめる」と Escape では何も変えず、「上書きする」で写す（AC4.2.2、NFR2.2）', async ({
    page,
  }) => {
    await openWithSnapshot(page, snapshotWith([], [...SEPTEMBER, budget('2026-10', '娯楽', 5000)]));
    const before = await storedBudgets(page);

    await copyButton(page).click();
    await expect(confirmGroup(page)).toContainText('10月の予算を前の月の内容で上書きします');
    await expect(page.getByRole('button', { name: '上書きする' })).toBeFocused();
    await page.getByRole('button', { name: 'やめる' }).click();
    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(copyButton(page)).toBeFocused();
    expect(await storedBudgets(page)).toEqual(before);

    await copyButton(page).click();
    await expect(page.getByRole('button', { name: '上書きする' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(copyButton(page)).toBeFocused();
    await expect(budgetInput(page, '娯楽')).toHaveValue('5000');
    expect(await storedBudgets(page)).toEqual(before);

    await copyButton(page).click();
    await page.getByRole('button', { name: '上書きする' }).click();
    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算を10月に写しました');
    await expect(budgetInput(page, '食費')).toHaveValue('40000');
    await expect(budgetInput(page, '娯楽')).toHaveValue('');
    expect((await storedBudgets(page))?.filter((b) => b.month === '2026-10')).toEqual([
      budget('2026-10', '食費', 40000),
      budget('2026-10', '住居費', 82000),
    ]);
  });

  test('9月に予算が1つもなければ「前の月の予算がありません」と出て、10月の予算は変わらない（AC4.2.3）', async ({
    page,
  }) => {
    await openWithSnapshot(page, snapshotWith([], [budget('2026-10', '食費', 30000)]));
    const before = await storedBudgets(page);

    await copyButton(page).click();

    await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算がありません');
    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(budgetInput(page, '食費')).toHaveValue('30000');
    expect(await storedBudgets(page)).toEqual(before);
  });
});

test.describe('U3: 前の月の予算のコピーの性能（3,000 件・1か月 100 件）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');

  test('「前の月の予算をコピー」（確認なし）から表が写した値に変わるまで 1 秒以内（NFR1.2。3回の中央値）', async ({
    page,
  }) => {
    const initial = JSON.stringify(snapshotWith(makeLargeEntries('2026-10'), SEPTEMBER, 3000));
    await openWithSnapshot(page, JSON.parse(initial));

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      // 毎回、10月に予算がない（確認が出ない）保存データに戻してから測る。
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
        STORAGE_KEY,
        initial,
      ] as const);
      await page.reload();
      await expect(page.getByTestId('review-expense')).not.toHaveText('¥0');
      await expect(budgetInput(page, '食費')).toHaveValue('');

      durations.push(await measureUntilRemainingChanges(page, 'budget-copy', '食費'));
      await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算を10月に写しました');
      await expect(budgetInput(page, '食費')).toHaveValue('40000');
    }

    expect(report('NFR1.2 予算のコピー → 表', durations)).toBeLessThan(LIMIT_MS);
  });
});
