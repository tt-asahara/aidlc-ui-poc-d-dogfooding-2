import { expect, test } from '@playwright/test';
import { openApp, register, totals } from '../support/app';
import { ledgerRows } from '../support/u2';
import { seriousViolations } from '../support/u5';

test.describe('U2: 別の月の日付での登録（AC1.3.1、AC1.3.2、BR2.1）', () => {
  test('2026年10月の表示で 2026-09-28 を登録すると、表示が9月に切り替わり、一覧と集計に反映して知らせる（AC1.3.1）', async ({
    page,
  }) => {
    await openApp(page);
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年10月');

    await register(page, { date: '2026-09-28', amount: '1650', category: '日用品', memo: '洗剤' });

    await expect(page.getByTestId('review-month-label')).toHaveText('2026年9月');
    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '9月の明細として登録しました 9月28日 日用品 ¥1,650',
    );
    await expect(totals(page).expense).toHaveText('¥1,650');
    await expect(ledgerRows(page)).toHaveCount(1);
    await expect(ledgerRows(page).first()).toContainText('09/28');
    await expect(page.getByRole('table', { name: '2026年9月の明細（新しい順）' })).toBeVisible();

    // 別の月の登録（STATE-OTHER-MONTH）で axe の重大な違反が0件（NFR2.2）。
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('2026年10月の表示で 2026-10-05 を登録すると、表示月は10月のまま変わらない（AC1.3.2）', async ({
    page,
  }) => {
    await openApp(page);

    await register(page, { date: '2026-10-05', amount: '980', category: '交通費' });

    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '登録しました 10月5日 交通費 ¥980',
    );
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年10月');
    await expect(ledgerRows(page)).toHaveCount(1);
  });

  test('年の違う月で登録すると、年を付けて知らせ、その月を表示する（BR2.1）', async ({ page }) => {
    await openApp(page);

    await register(page, { date: '2025-12-31', amount: '3000', category: '交通費' });

    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '2025年12月の明細として登録しました 12月31日 交通費 ¥3,000',
    );
    await expect(page.getByTestId('review-month-label')).toHaveText('2025年12月');
    await expect(ledgerRows(page)).toHaveCount(1);
  });
});
