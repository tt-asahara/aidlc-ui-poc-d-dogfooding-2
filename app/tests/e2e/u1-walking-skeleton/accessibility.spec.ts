import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openApp, putRawStore, register } from '../support/app';

/** axe の検査で、重大（critical・serious）な違反だけを取り出す（NFR2.2）。 */
async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => `${violation.id}（${violation.impact}）: ${violation.help}`);
}

/**
 * 次の要素へ移るキー。WebKit（Safari）は既定の設定では Tab がリンクとボタンに止まらず、
 * キーボードの利用者は Option+Tab を使うため、それに合わせる。
 */
function tabKeyOf(browserName: string): string {
  return browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
}

/** Tab キーだけで、目的の要素に操作位置が来るまで進める（最大 limit 回）。 */
async function tabUntil(page: Page, tabKey: string, target: Locator, limit = 12): Promise<void> {
  for (let count = 0; count < limit; count += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press(tabKey);
  }
  await expect(target).toBeFocused();
}

test.describe('U1 薄い版: アクセシビリティ', () => {
  test('5つの状態で axe の重大な違反が0件（NFR2.2）', async ({ page }) => {
    await openApp(page);
    expect(await seriousViolations(page), '初期').toEqual([]);

    await register(page, { amount: '1280', category: '食費', memo: 'スーパー' });
    await expect(page.getByTestId('entry-form-status')).toContainText('登録しました');
    expect(await seriousViolations(page), '登録成功').toEqual([]);

    await page.getByLabel('金額（円）').fill('1,28o');
    await page.getByRole('button', { name: '登録する' }).click();
    await expect(page.getByTestId('entry-form-alert')).toContainText('入力を確かめてください');
    expect(await seriousViolations(page), '入力の誤り').toEqual([]);

    await putRawStore(page, 'not json');
    await expect(page.getByTestId('review-unreadable')).toBeVisible();
    expect(await seriousViolations(page), '保存データが読めない').toEqual([]);
  });

  test('保存失敗の状態で axe の重大な違反が0件（NFR2.2）', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
    });
    await openApp(page);
    await register(page, { amount: '1280', category: '食費' });
    await expect(page.getByTestId('entry-form-alert')).toContainText('保存できませんでした');

    expect(await seriousViolations(page), '保存失敗').toEqual([]);
  });

  test('キーボードだけで、登録 → 月の切り替え → CSV 出力ができる（NFR2.3、AC8.1.1、AC8.1.2）', async ({
    page,
    browserName,
  }) => {
    const tabKey = tabKeyOf(browserName);
    await openApp(page);

    await page.keyboard.press(tabKey);
    await expect(page.getByRole('link', { name: '本文へ移動' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: '収支を登録' })).toBeFocused();

    // 区分は矢印キーで選ぶ（支出 → 収入 → 支出）。
    await tabUntil(page, tabKey, page.getByRole('radio', { name: '支出' }));
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '収入' })).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: '支出' })).toBeChecked();

    const amount = page.getByLabel('金額（円）');
    await tabUntil(page, tabKey, amount);
    await page.keyboard.type('1280');

    // U3 の予算の表の名前と区別するため、名前の完全一致で選ぶ（確かめる内容は変えない）。
    const category = page.getByLabel('カテゴリ', { exact: true });
    await tabUntil(page, tabKey, category);
    await page.keyboard.press('ArrowDown');
    if (process.platform === 'darwin') {
      // macOS では、閉じた <select> で矢印キーを押すと OS の選択肢の一覧が開き、
      // 自動操作ではその一覧の中を操作できない（3つのブラウザとも同じ）。人は Space・矢印・Enter で選べる。
      // この1手だけを selectOption で選び、ほかの操作はキーボードだけで行う。
      test.info().annotations.push({
        type: 'limitation',
        description:
          'macOS: カテゴリの <select> の選択だけ selectOption で代えた（OS の一覧は自動操作できない）',
      });
      await page.keyboard.press('Escape');
      await category.selectOption('食費');
    }
    await expect(category).toHaveValue('食費');
    await expect(category).toBeFocused();

    await tabUntil(page, tabKey, page.getByLabel('メモ（任意）'));
    await page.keyboard.type('keyboard');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '登録しました 10月16日 食費 ¥1,280',
    );
    await expect(page.getByTestId('review-expense')).toHaveText('¥1,280');

    // U3 で「前の月の予算をコピー」が加わったため、名前の完全一致で選ぶ（確かめる内容は変えない）。
    await tabUntil(page, tabKey, page.getByRole('button', { name: '前の月', exact: true }), 20);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年9月');
    await page.keyboard.press(tabKey);
    await expect(page.getByRole('button', { name: '次の月' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年10月');

    await tabUntil(page, tabKey, page.getByRole('button', { name: '明細を CSV に保存' }), 20);
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    expect((await downloadPromise).suggestedFilename()).toBe('budget-entries-20261016.csv');
  });

  test('操作位置に 3px の枠線が見える（NFR2.1）', async ({ page, browserName }) => {
    const tabKey = tabKeyOf(browserName);
    await openApp(page);
    await page.keyboard.press(tabKey);
    await page.keyboard.press('Enter');
    await tabUntil(page, tabKey, page.getByLabel('金額（円）'));

    const outline = await page
      .getByLabel('金額（円）')
      .evaluate((element) => getComputedStyle(element).outlineWidth);
    expect(outline).toBe('3px');
  });
});

test.describe('U1 薄い版: 画面幅と拡大', () => {
  test('幅 1280px では日付と金額、収入・支出・差額が横に並ぶ（NFR6.2）', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page);

    const date = await page.getByLabel('日付').boundingBox();
    const amount = await page.getByLabel('金額（円）').boundingBox();
    expect(date && amount && Math.abs(date.y - amount.y)).toBeLessThan(2);
    expect(date && amount && amount.x > date.x).toBe(true);
    const income = await page.getByTestId('review-income').boundingBox();
    const difference = await page.getByTestId('review-difference').boundingBox();
    expect(income && difference && Math.abs(income.y - difference.y)).toBeLessThan(2);
  });

  test('幅 800px では2列の部分が1列になり、横にはみ出さない（NFR6.2）', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await openApp(page);

    const date = await page.getByLabel('日付').boundingBox();
    const amount = await page.getByLabel('金額（円）').boundingBox();
    expect(date && amount && amount.y > date.y + date.height).toBe(true);
    const income = await page.getByTestId('review-income').boundingBox();
    const expense = await page.getByTestId('review-expense').boundingBox();
    expect(income && expense && expense.y > income.y).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('U1 薄い版: 200% 相当の拡大', () => {
  test.use({ viewport: { width: 640, height: 800 }, deviceScaleFactor: 2 });

  test('200% 相当の表示で、横方向のスクロールなしに登録できる（NFR6.3）', async ({ page }) => {
    await openApp(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await register(page, { amount: '980', category: '交通費', memo: '架空の移動' });
    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '登録しました 10月16日 交通費 ¥980',
    );
    await expect(page.getByTestId('review-expense')).toHaveText('¥980');
  });
});
