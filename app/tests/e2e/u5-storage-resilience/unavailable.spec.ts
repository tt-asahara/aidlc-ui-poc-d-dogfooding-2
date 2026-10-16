import { expect, test } from '@playwright/test';
import { openFirstRun, register, totals } from '../support/app';
import { denyStorageAccess, NOTICE } from '../support/u5';

/** 保存領域が使えない環境（U5 BR3.1、BR5.3）。localStorage へのアクセス自体を失敗させて開く。 */
test.describe('U5: 保存領域が使えない環境', () => {
  test('全体のお知らせ枠で保存できないことを知らせ、操作は止めず、登録は保存できないと伝える（BR3.1、BR5.3）', async ({
    page,
  }) => {
    await denyStorageAccess(page);
    await openFirstRun(page);

    const notice = page.getByTestId('notice-unavailable');
    await expect(notice).toHaveAttribute('role', 'alert');
    await expect(notice).toContainText(NOTICE.unavailable);
    await expect(page.getByTestId('notice-corrupt')).toHaveCount(0);
    // サンプル投入は試みるが保存できず、空のまま続く。
    await expect(totals(page).expense).toHaveText('¥0');
    await expect(page.getByRole('button', { name: '登録する' })).toBeEnabled();

    await register(page, { amount: '1280', category: '食費', memo: 'スーパー' });

    await expect(page.getByTestId('entry-form-alert')).toContainText(
      'このブラウザに保存できませんでした',
    );
    await expect(page.getByLabel('金額（円）')).toHaveValue('1280');
    await expect(totals(page).expense).toHaveText('¥0');
    await expect(notice).toBeVisible();
  });
});
