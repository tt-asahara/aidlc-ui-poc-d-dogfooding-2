import { expect, test } from '@playwright/test';
import { openApp, openFirstRun, putRawStore, register } from '../support/app';
import { denyStorageAccess, seriousViolations } from '../support/u5';

/** 全体のお知らせ枠の3つの状態で、axe の重大（critical・serious）な違反が0件（U5 NFR2.1、NFR2.2）。 */
test.describe('U5: 全体のお知らせ枠のアクセシビリティ', () => {
  test('読めない（STATE-STORAGE-CORRUPT）', async ({ page }) => {
    await openApp(page);
    await putRawStore(page, JSON.stringify({ schemaVersion: 1, revision: 'x' }));
    await expect(page.getByRole('alert').filter({ hasText: '保存データの問題' })).toBeVisible();

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('別のタブの変更（STATE-OTHER-TAB-CHANGED）', async ({ context }) => {
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    await openApp(tab1);
    await openApp(tab2);
    await register(tab1, { amount: '1280', category: '食費' });
    await expect(tab2.getByRole('status').filter({ hasText: '別のタブの変更' })).toBeVisible();
    await expect(
      tab2.getByRole('button', { name: '別のタブの変更の知らせを閉じる' }),
    ).toBeVisible();

    expect(await seriousViolations(tab2)).toEqual([]);
  });

  test('保存できない（保存領域へのアクセスを失敗させる）', async ({ page }) => {
    await denyStorageAccess(page);
    await openFirstRun(page);
    await expect(page.getByTestId('notice-unavailable')).toBeVisible();

    expect(await seriousViolations(page)).toEqual([]);
  });
});
