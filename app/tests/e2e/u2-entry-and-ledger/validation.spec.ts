import { expect, test } from '@playwright/test';
import { openApp, register } from '../support/app';
import { ledgerRows, submitButton } from '../support/u2';
import { seriousViolations } from '../support/u5';

const AMOUNT_ERROR = '金額は 1〜9,999,999 の整数で入力してください。例: 1280';

test.describe('U2: 入力の誤りの表示（AC1.2.1〜AC1.2.5）', () => {
  test('金額「0」「-500」「12.5」「10000000」「1,28o」は登録せず、金額欄の下に理由を出し、入力を残す（AC1.2.1）', async ({
    page,
  }) => {
    await openApp(page);

    for (const amount of ['0', '-500', '12.5', '10000000', '1,28o']) {
      await register(page, { amount, category: '食費' });

      await expect(page.getByTestId('entry-form-alert')).toHaveText('入力を確かめてください: 金額');
      await expect(page.getByTestId('entry-amount-error')).toHaveText(AMOUNT_ERROR);
      await expect(page.getByLabel('金額（円）')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('金額（円）')).toHaveValue(amount);
      await expect(page.getByLabel('金額（円）')).toBeFocused();
    }
    await expect(page.getByTestId('ledger-empty')).toBeVisible();
  });

  test('金額「9999999」と「1」は登録できる（AC1.2.2）', async ({ page }) => {
    await openApp(page);

    await register(page, { amount: '9999999', category: '住居費' });
    await expect(ledgerRows(page)).toHaveCount(1);
    await register(page, { amount: '1', category: '日用品' });

    await expect(ledgerRows(page)).toHaveCount(2);
    await expect(page.getByTestId('ledger-table')).toContainText('−¥9,999,999');
    await expect(page.getByTestId('ledger-table')).toContainText('−¥1');
  });

  test('日付が空なら日付欄の下に理由を出し、2000-01-01 と 2030-12-31 は登録できる（AC1.2.3）', async ({
    page,
  }) => {
    // 「2026-02-30」のように存在しない日付は、ブラウザの日付の欄に入力できない。
    // その判定は Ledger.validate の単体テスト（ledgerRules.test.ts）で確かめる。
    await openApp(page);

    await page.getByLabel('日付').fill('');
    await page.getByLabel('金額（円）').fill('1280');
    await page.getByLabel('カテゴリ').selectOption('食費');
    await submitButton(page).click();
    await expect(page.getByTestId('entry-form-alert')).toHaveText('入力を確かめてください: 日付');
    await expect(page.getByTestId('entry-date-error')).toHaveText('日付を入力してください');
    await expect(page.getByLabel('日付')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('日付')).toBeFocused();

    await register(page, { date: '2000-01-01', amount: '1280', category: '食費' });
    await expect(page.getByTestId('review-month-label')).toHaveText('2000年1月');
    await expect(ledgerRows(page)).toHaveCount(1);
    await register(page, { date: '2030-12-31', amount: '1280', category: '食費' });
    await expect(page.getByTestId('review-month-label')).toHaveText('2030年12月');
    await expect(ledgerRows(page)).toHaveCount(1);
  });

  test('誤りの欄を直して登録すると、誤りの表示が消えて登録される（AC1.2.5）', async ({ page }) => {
    await openApp(page);
    await register(page, { amount: '1,28o', category: '食費' });
    await expect(page.getByTestId('entry-amount-error')).toBeVisible();

    await page.getByLabel('金額（円）').fill('1280');
    await submitButton(page).click();

    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '登録しました 10月16日 食費 ¥1,280',
    );
    await expect(page.getByTestId('entry-form-alert')).toBeEmpty();
    await expect(page.getByTestId('entry-amount-error')).toHaveCount(0);
    await expect(page.getByLabel('金額（円）')).not.toHaveAttribute('aria-invalid');
    await expect(ledgerRows(page)).toHaveCount(1);
  });

  test('入力の誤り（STATE-VALIDATION-ERROR）で axe の重大な違反が0件（NFR2.2）', async ({
    page,
  }) => {
    await openApp(page);
    await page.getByLabel('日付').fill('');
    await page.getByLabel('金額（円）').fill('1,28o');
    await submitButton(page).click();
    await expect(page.getByTestId('entry-form-alert')).toHaveText(
      '入力を確かめてください: 日付、金額、カテゴリ',
    );
    await expect(page.getByTestId('entry-category-error')).toHaveText('カテゴリを選んでください');

    expect(await seriousViolations(page)).toEqual([]);
  });
});
