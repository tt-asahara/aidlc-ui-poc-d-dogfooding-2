import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openApp, readRawStore, register, totals } from '../support/app';

test.describe('U1 薄い版: 登録 → 集計 → CSV 出力 → 再読み込み', () => {
  test('収支を登録すると集計に反映され、CSV に保存でき、開き直しても残る（AC1.1.1、AC3.1.1、AC5.1.1、AC5.1.2、AC7.2.1）', async ({
    page,
  }) => {
    await openApp(page);
    const { income, expense, difference } = totals(page);
    await expect(page.getByTestId('review-month-label')).toHaveText('2026年10月');
    await expect(expense).toHaveText('¥0');

    await register(page, {
      date: '2026-10-14',
      amount: '1280',
      category: '食費',
      memo: 'スーパー',
    });

    await expect(page.getByRole('status').first()).toHaveText('登録しました 10月14日 食費 ¥1,280');
    await expect(page.getByLabel('金額（円）')).toBeFocused();
    await expect(page.getByLabel('金額（円）')).toHaveValue('');
    await expect(expense).toHaveText('¥1,280');

    await register(page, {
      kind: '収入',
      date: '2026-10-01',
      amount: '280000',
      category: '給与',
      memo: 'ランチ, "特売"',
    });
    await expect(income).toHaveText('¥280,000');
    await expect(difference).toHaveText('¥278,720');

    await expect(page.getByText('CSV には明細だけが含まれ、予算は含まれません。')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '明細を CSV に保存' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('budget-entries-20261016.csv');
    const bytes = await readFile(await download.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.subarray(3).toString('utf8')).toBe(
      '日付,区分,カテゴリ,金額,メモ\r\n' +
        '2026-10-01,収入,給与,280000,"ランチ, ""特売"""\r\n' +
        '2026-10-14,支出,食費,1280,スーパー\r\n',
    );

    const savedBefore = await readRawStore(page);
    await page.reload();
    await expect(income).toHaveText('¥280,000');
    await expect(expense).toHaveText('¥1,280');
    await expect(difference).toHaveText('¥278,720');
    expect(await readRawStore(page)).toBe(savedBefore);
  });

  test('区分を切り替えると選択肢が変わり、合わないカテゴリの選択が外れる（AC1.1.2、AC1.1.3）', async ({
    page,
  }) => {
    await openApp(page);
    const category = page.getByLabel('カテゴリ');
    await category.selectOption('食費');

    await page.getByRole('radio', { name: '収入' }).check();

    await expect(category).toHaveValue('');
    await expect(category.locator('option')).toHaveText([
      '選んでください',
      '給与',
      '副収入',
      'その他収入',
    ]);
    await page.getByRole('radio', { name: '支出' }).check();
    await expect(category.locator('option')).toHaveCount(9);
  });

  test('開いた日の月を表示し、「前の月」「次の月」で年をまたいで切り替える（AC3.1.3、AC3.1.4）', async ({
    page,
  }) => {
    await openApp(page);
    const label = page.getByTestId('review-month-label');
    await expect(label).toHaveText('2026年10月');
    await expect(label).toHaveAttribute('aria-live', 'polite');

    for (let step = 0; step < 9; step += 1) {
      await page.getByRole('button', { name: '前の月' }).click();
    }
    await expect(label).toHaveText('2026年1月');
    await page.getByRole('button', { name: '前の月' }).click();
    await expect(label).toHaveText('2025年12月');
    await page.getByRole('button', { name: '次の月' }).click();
    await expect(label).toHaveText('2026年1月');
  });

  test('明細が0件のとき CSV は作られず「出力する明細がありません」と出る（AC5.1.4）', async ({
    page,
  }) => {
    await openApp(page);
    let downloaded = false;
    page.on('download', () => {
      downloaded = true;
    });

    await page.getByRole('button', { name: '明細を CSV に保存' }).click();

    await expect(page.getByTestId('export-status')).toHaveText('出力する明細がありません');
    await page.waitForTimeout(300);
    expect(downloaded).toBe(false);
  });

  test('「1 登録」「2 確認」「3 書き出し」の見出しが上から順に並ぶ（NFR8.1）', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('.step-label')).toHaveText(['1 登録', '2 確認', '3 書き出し']);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      '収支を登録',
      '月次集計',
      'CSV',
    ]);
    await expect(page.locator('h1, h2')).toHaveText(['予算管理', '収支を登録', '月次集計', 'CSV']);
  });
});
