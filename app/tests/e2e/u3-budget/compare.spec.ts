import { expect, test, type Page } from '@playwright/test';
import { formatMonthLabel } from '../../../src/domain/format';
import { monthOf, shiftMonth } from '../../../src/domain/month';
import { openFirstRun, TEST_TODAY } from '../support/app';
import { budgetInput, previousMonthButton, remainingCell } from '../support/u3';

/**
 * 予算比較（U3 AC3.2.2〜AC3.2.4、U5 から持ち越した AC7.1.2）。
 * U5 の sample.spec.ts と同じく、初回のサンプルの保存データから始める。
 * 前の月は、テストの「今日」（TEST_TODAY）から計算する（インフラ設計レビュー R-02）。
 */
const THIS_MONTH = monthOf(TEST_TODAY);
const PREVIOUS_MONTH = shiftMonth(THIS_MONTH, -1);

async function color(page: Page, testId: string, selector: string): Promise<string> {
  return page
    .getByTestId(testId)
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).color);
}

test.describe('U3: 予算比較（サンプルの保存データ）', () => {
  test('前の月の食費は「超過 ¥3,900」を文字と色で出し、娯楽とその他支出は未設定（AC3.2.2、AC3.2.3、AC7.1.2）', async ({
    page,
  }) => {
    await openFirstRun(page);
    await previousMonthButton(page).click();
    await expect(page.getByTestId('review-month-label')).toHaveText(
      formatMonthLabel(PREVIOUS_MONTH),
    );

    await expect(budgetInput(page, '食費')).toHaveValue('40000');
    await expect(remainingCell(page, '食費')).toHaveText('超過 ¥3,900');
    const overColor = await color(page, 'budget-remaining-食費', '.over');
    const normalColor = await page
      .getByTestId('budget-remaining-住居費')
      .evaluate((element) => getComputedStyle(element).color);
    expect(overColor).not.toBe(normalColor);

    for (const category of ['娯楽', 'その他支出']) {
      await expect(budgetInput(page, category)).toHaveValue('');
      await expect(budgetInput(page, category)).toHaveAttribute('placeholder', '未設定');
      await expect(remainingCell(page, category)).toHaveText('—');
    }
    const table = page.getByTestId('review-category-table');
    await expect(table.getByRole('row').filter({ hasText: '娯楽' })).toContainText('未設定');
    await expect(table.getByRole('row').filter({ hasText: '娯楽' })).not.toContainText('超過');
  });

  test('収入カテゴリは予算比較の表に出ず、収入は合計にだけ含まれる（AC3.2.4）', async ({
    page,
  }) => {
    await openFirstRun(page);
    const table = page.getByTestId('review-category-table');

    await expect(table.getByRole('rowheader')).toHaveText([
      '食費',
      '住居費',
      '水道光熱費',
      '通信費',
      '日用品',
      '交通費',
      '娯楽',
      'その他支出',
    ]);
    await expect(table).not.toContainText('給与');
    await expect(page.getByRole('textbox', { name: '給与の予算（円）' })).toHaveCount(0);
    await expect(page.getByTestId('review-income')).toHaveText('¥280,000');
  });
});
