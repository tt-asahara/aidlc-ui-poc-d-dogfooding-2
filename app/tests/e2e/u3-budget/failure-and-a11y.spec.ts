import { expect, test, type Page } from '@playwright/test';
import { openFirstRun, STORAGE_KEY, TEST_TODAY } from '../support/app';
import { seriousViolations } from '../support/u5';
import {
  budget,
  budgetInput,
  confirmGroup,
  copyButton,
  expenseEntry,
  openWithSnapshot,
  previousMonthButton,
  remainingCell,
  saveButton,
  snapshotWith,
} from '../support/u3';

/**
 * 保存できないとき（U3 AC7.3.2 の予算の部分、BR5.1）と、5つの状態の axe（NFR2.3）。
 * 「今日」は 2026年10月16日に固定。値はすべて架空。
 */

/** 保存データを置いたあとで、保存領域への書き込みを容量不足で失敗させてから開く。 */
async function openWithFailingWrites(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
      Storage.prototype.setItem = function () {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
    },
    [STORAGE_KEY, raw] as const,
  );
  await page.clock.setFixedTime(TEST_TODAY);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '予算管理' })).toBeVisible();
}

test.describe('U3: 予算を保存できないとき', () => {
  test('予算の保存とコピーに失敗すると、失敗と再試行の方法が出て、成功の表示は出ず、予算は変わらない（AC7.3.2）', async ({
    page,
  }) => {
    const raw = JSON.stringify(
      snapshotWith(
        [expenseEntry(1, '2026-10-05', '食費', 9570)],
        [budget('2026-09', '食費', 40000), budget('2026-10', '食費', 30000)],
      ),
    );
    await openWithFailingWrites(page, raw);

    await budgetInput(page, '食費').fill('45000');
    await saveButton(page).click();
    const notice = page.getByTestId('budget-notice');
    await expect(notice).toHaveText(
      'このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「予算を保存」を押してください',
    );
    await expect(notice).toHaveAttribute('role', 'alert');
    await expect(page.getByText(/予算を保存しました/)).toHaveCount(0);
    await expect(budgetInput(page, '食費')).toHaveValue('45000');
    await expect(remainingCell(page, '食費')).toHaveText('¥20,430');

    await copyButton(page).click();
    await page.getByRole('button', { name: '上書きする' }).click();
    await expect(notice).toHaveText(
      'このブラウザに保存できませんでした。予算は変わっていません。空き容量を確かめてから、もう一度「前の月の予算をコピー」を押してください',
    );
    await expect(confirmGroup(page)).toHaveCount(0);
    await expect(copyButton(page)).toBeFocused();
    await expect(page.getByText(/写しました/)).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
  });
});

test.describe('U3: アクセシビリティ（5つの状態）', () => {
  test('予算の入力の誤り・コピーの確認・コピー元なしで axe の重大な違反が0件（NFR2.3）', async ({
    page,
  }) => {
    await openWithSnapshot(page, snapshotWith([], [budget('2026-10', '食費', 30000)]));

    await budgetInput(page, '食費').fill('-500');
    await saveButton(page).click();
    await expect(page.getByTestId('budget-食費-error')).toBeVisible();
    expect(await seriousViolations(page), '予算の入力の誤り').toEqual([]);

    await copyButton(page).click();
    await expect(page.getByTestId('budget-notice')).toHaveText('前の月の予算がありません');
    expect(await seriousViolations(page), 'コピー元なし').toEqual([]);

    await page.getByRole('button', { name: '次の月' }).click();
    await budgetInput(page, '食費').fill('100');
    await saveButton(page).click();
    await copyButton(page).click();
    await expect(confirmGroup(page)).toBeVisible();
    await expect(page.getByTestId('budget-copy-confirm-dirty')).toHaveCount(0);
    expect(await seriousViolations(page), 'コピーの確認').toEqual([]);
  });

  test('超過と未設定の状態で axe の重大な違反が0件（NFR2.3。サンプルの前の月と予算のない月）', async ({
    page,
  }) => {
    await openFirstRun(page);
    await previousMonthButton(page).click();
    await expect(remainingCell(page, '食費')).toHaveText('超過 ¥3,900');
    await expect(remainingCell(page, '娯楽')).toHaveText('—');
    expect(await seriousViolations(page), '超過（前の月）').toEqual([]);

    await page.getByRole('button', { name: '次の月' }).click();
    await page.getByRole('button', { name: '次の月' }).click();
    await expect(page.getByTestId('budget-unset-guide')).toBeVisible();
    await expect(remainingCell(page, '食費')).toHaveText('—');
    expect(await seriousViolations(page), '未設定（予算のない月）').toEqual([]);
  });
});
