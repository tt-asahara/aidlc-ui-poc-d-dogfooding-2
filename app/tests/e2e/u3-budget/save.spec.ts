import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../support/app';
import { makeLargeEntries } from '../support/largeData';
import { recordExternalRequests } from '../support/u5';
import {
  budget,
  budgetInput,
  copyButton,
  expenseEntry,
  LIMIT_MS,
  measureUntilRemainingChanges,
  openWithSnapshot,
  remainingCell,
  report,
  saveButton,
  snapshotWith,
  storedBudgets,
} from '../support/u3';

/**
 * 予算の入力と保存（U3 AC4.1.1〜AC4.1.3、AC3.2.1、AC7.2.1 の予算の部分、NFR1.1、NFR3.1、NFR6.1）。
 * 「今日」は 2026年10月16日に固定。値はすべて架空。
 */
const OCTOBER_FOOD = [
  expenseEntry(1, '2026-10-05', '食費', 6420),
  expenseEntry(2, '2026-10-11', '食費', 3150),
];

test.describe('U3: 予算の保存', () => {
  test('食費に 40000 を入れて保存すると ¥40,000 になり残額が変わり、9月・11月は変わらない（AC4.1.1、AC3.2.1）', async ({
    page,
  }) => {
    await openWithSnapshot(
      page,
      snapshotWith(OCTOBER_FOOD, [
        budget('2026-09', '食費', 30000),
        budget('2026-11', '食費', 50000),
      ]),
    );
    await expect(remainingCell(page, '食費')).toHaveText('—');

    await budgetInput(page, '食費').fill('40000');
    await saveButton(page).click();

    await expect(page.getByTestId('budget-notice')).toHaveText('10月の予算を保存しました');
    await expect(page.getByTestId('budget-notice')).toHaveAttribute('role', 'status');
    await expect(remainingCell(page, '食費')).toHaveText('¥30,430');
    await expect(page.getByTestId('review-category-table')).toContainText('¥9,570');
    expect(await storedBudgets(page)).toEqual([
      budget('2026-09', '食費', 30000),
      budget('2026-11', '食費', 50000),
      budget('2026-10', '食費', 40000),
    ]);
  });

  test('-1・1.5・10000000 は保存されず、欄の下に理由が出て値が残り、0 は保存できる（AC4.1.2）', async ({
    page,
  }) => {
    await openWithSnapshot(page, snapshotWith(OCTOBER_FOOD, []));
    const food = budgetInput(page, '食費');

    for (const value of ['-1', '1.5', '10000000']) {
      await food.fill(value);
      await saveButton(page).click();
      await expect(page.getByTestId('budget-食費-error')).toHaveText(
        '予算は 0〜9,999,999 の整数で入力してください',
      );
      await expect(food).toHaveAttribute('aria-invalid', 'true');
      await expect(food).toHaveAttribute('aria-describedby', 'budget-食費-error');
      await expect(food).toHaveValue(value);
      await expect(food).toBeFocused();
      await expect(page.getByTestId('budget-notice')).toHaveText('予算を確かめてください: 食費');
      await expect(page.getByTestId('budget-notice')).toHaveAttribute('role', 'alert');
      expect(await storedBudgets(page)).toEqual([]);
    }

    await food.fill('0');
    await saveButton(page).click();
    await expect(page.getByTestId('budget-notice')).toHaveText('10月の予算を保存しました');
    await expect(food).not.toHaveAttribute('aria-invalid');
    await expect(remainingCell(page, '食費')).toHaveText('超過 ¥9,570');
    expect(await storedBudgets(page)).toEqual([budget('2026-10', '食費', 0)]);
  });

  test('予算欄を空にして保存すると「未設定」に戻り、開き直しても保存した予算が残る（AC4.1.3、AC7.2.1）', async ({
    page,
  }) => {
    await openWithSnapshot(page, snapshotWith(OCTOBER_FOOD, []));
    await budgetInput(page, '食費').fill('40000');
    await budgetInput(page, '交通費').fill('8000');
    await saveButton(page).click();
    await expect(remainingCell(page, '食費')).toHaveText('¥30,430');

    await page.reload();
    await expect(budgetInput(page, '食費')).toHaveValue('40000');
    await expect(budgetInput(page, '交通費')).toHaveValue('8000');
    await expect(remainingCell(page, '食費')).toHaveText('¥30,430');

    await budgetInput(page, '食費').fill('');
    await saveButton(page).click();
    await expect(page.getByTestId('budget-notice')).toHaveText('10月の予算を保存しました');
    await expect(budgetInput(page, '食費')).toHaveValue('');
    await expect(budgetInput(page, '食費')).toHaveAttribute('placeholder', '未設定');
    await expect(remainingCell(page, '食費')).toHaveText('—');
    expect(await storedBudgets(page)).toEqual([budget('2026-10', '交通費', 8000)]);
  });

  test('予算の保存とコピーで外部への通信は 0 件（NFR3.1）', async ({ page, context }) => {
    const external = await recordExternalRequests(context);
    await openWithSnapshot(page, snapshotWith(OCTOBER_FOOD, [budget('2026-09', '食費', 30000)]));

    await budgetInput(page, '食費').fill('40000');
    await saveButton(page).click();
    await expect(page.getByTestId('budget-notice')).toHaveText('10月の予算を保存しました');
    await page.getByRole('button', { name: '次の月' }).click();
    await copyButton(page).click();
    await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算を11月に写しました');

    expect(external.sent).toEqual([]);
    expect(external.attempted).toEqual([]);
  });
});

test.describe('U3: 予算の保存の性能（3,000 件・1か月 100 件）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');

  test('「予算を保存」を押してから残額が変わるまで 1 秒以内（NFR1.1。3回の中央値）', async ({
    page,
  }) => {
    const snapshot = snapshotWith(makeLargeEntries('2026-10'), [], 3000);
    await openWithSnapshot(page, snapshot);
    await expect(page.getByTestId('review-expense')).not.toHaveText('¥0');
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '{}').entries.length,
        STORAGE_KEY,
      ),
    ).toBe(3000);

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await budgetInput(page, '食費').fill(String(100_000 + run * 1000));
      durations.push(await measureUntilRemainingChanges(page, 'budget-save', '食費'));
      await expect(page.getByTestId('budget-notice')).toHaveText('10月の予算を保存しました');
    }

    expect(report('NFR1.1 予算の保存 → 残額', durations)).toBeLessThan(LIMIT_MS);
  });
});
