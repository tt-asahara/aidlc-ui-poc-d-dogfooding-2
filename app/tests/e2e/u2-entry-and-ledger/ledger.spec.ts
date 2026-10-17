import { expect, test } from '@playwright/test';
import { openApp, register } from '../support/app';
import { ledgerRows, openWithLargeStore, reportDurations, submitButton } from '../support/u2';
import { seriousViolations } from '../support/u5';

/** 性能の上限（NFR1.1、NFR1.2）。Chromium で3回測った中央値で判定する。 */
const LIMIT_MS = 1000;

test.describe('U2: 明細の一覧（AC2.1.1、AC2.1.3、AC2.1.4、AC1.1.5、AC1.1.6）', () => {
  test('日付の新しい順に並び、同じ日付は後から登録したものが上。金額は符号と ¥ を付けて右揃え（AC2.1.1、AC2.1.3）', async ({
    page,
  }) => {
    await openApp(page);

    await register(page, { kind: '収入', date: '2026-10-01', amount: '280000', category: '給与' });
    await expect(ledgerRows(page)).toHaveCount(1);
    await register(page, {
      kind: '支出',
      date: '2026-10-05',
      amount: '12800',
      category: '娯楽',
      memo: '先',
    });
    await expect(ledgerRows(page)).toHaveCount(2);
    await register(page, { date: '2026-10-05', amount: '3150', category: '食費', memo: '後' });
    await expect(ledgerRows(page)).toHaveCount(3);

    await expect(page.getByTestId('ledger-table').getByRole('rowheader')).toHaveText([
      '10/05',
      '10/05',
      '10/01',
    ]);
    await expect(ledgerRows(page).nth(0)).toContainText('後');
    await expect(ledgerRows(page).nth(1)).toContainText('先');
    const expenseCell = ledgerRows(page).nth(1).getByRole('cell', { name: '−¥12,800' });
    await expect(expenseCell).toBeVisible();
    await expect(expenseCell).toHaveCSS('text-align', 'right');
    await expect(ledgerRows(page).nth(2).getByRole('cell', { name: '+¥280,000' })).toBeVisible();

    // 一覧のある月（STATE-POPULATED）で axe の重大な違反が0件（NFR2.2）。
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('メモの「<b>太字</b>」は文字のまま表示し、行に修正・削除の操作を置かない（AC1.1.5、AC1.1.6）', async ({
    page,
  }) => {
    await openApp(page);

    await register(page, { amount: '500', category: '娯楽', memo: '<b>太字</b>' });

    const table = page.getByTestId('ledger-table');
    await expect(table.getByRole('cell', { name: '<b>太字</b>' })).toBeVisible();
    await expect(table.locator('b')).toHaveCount(0);
    await expect(table.locator('button, a, input, select, [tabindex]')).toHaveCount(0);
  });

  test('明細のない月は空の表ではなく案内文を出す（AC2.1.4）', async ({ page }) => {
    await openApp(page);

    await expect(page.getByTestId('ledger-empty')).toHaveText(
      'この月の明細はまだありません。上のフォームから登録するか、CSV を取り込むと、ここに表示されます。',
    );
    await expect(page.getByTestId('ledger-table')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 3, name: '2026年10月の明細' })).toBeVisible();

    // 空の月（STATE-EMPTY）で axe の重大な違反が0件（NFR2.2）。
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('U2: 一覧の性能（3,000 件・1か月 100 件）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');
  test.describe.configure({ mode: 'serial' });

  test('「登録する」を押してから一覧の行数が増えるまで 1 秒以内（NFR1.1）', async ({ page }) => {
    await openWithLargeStore(page);

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await page.getByLabel('金額（円）').fill(String(1000 + run));
      // U3 の予算の表の名前と区別するため、名前の完全一致で選ぶ（計測の内容は変えない）。
      await page.getByLabel('カテゴリ', { exact: true }).selectOption('日用品');
      // 二重送信の防止（BR1.7）の 300 ミリ秒が過ぎ、押せる状態になってから測る。
      await expect(submitButton(page)).toBeEnabled();
      durations.push(
        await page.evaluate(async () => {
          const rowCount = () => document.querySelectorAll('[data-testid="ledger-row"]').length;
          const before = rowCount();
          const started = performance.now();
          (
            document.querySelector('[data-testid="entry-form-submit"]') as HTMLButtonElement
          ).click();
          await new Promise<void>((resolve) => {
            const check = () => (rowCount() > before ? resolve() : requestAnimationFrame(check));
            check();
          });
          await new Promise((resolve) => requestAnimationFrame(resolve));
          return performance.now() - started;
        }),
      );
      await expect(ledgerRows(page)).toHaveCount(101 + run);
    }

    expect(reportDurations('U2 NFR1.1 登録 → 一覧', durations)).toBeLessThan(LIMIT_MS);
  });

  test('「前の月」「次の月」を押してから一覧が新しい月に変わるまで 1 秒以内（NFR1.2）', async ({
    page,
  }) => {
    await openWithLargeStore(page);

    const durations: number[] = [];
    for (const testId of ['review-prev-month', 'review-next-month', 'review-prev-month']) {
      durations.push(
        await page.evaluate(async (buttonTestId) => {
          const caption = () =>
            document.querySelector('[data-testid="ledger-table"] caption')?.textContent ?? '';
          const before = caption();
          const started = performance.now();
          (document.querySelector(`[data-testid="${buttonTestId}"]`) as HTMLButtonElement).click();
          await new Promise<void>((resolve) => {
            const check = () =>
              caption() !== before && caption() !== '' ? resolve() : requestAnimationFrame(check);
            check();
          });
          await new Promise((resolve) => requestAnimationFrame(resolve));
          return performance.now() - started;
        }, testId),
      );
      await expect(ledgerRows(page)).toHaveCount(100);
    }

    expect(reportDurations('U2 NFR1.2 月の切り替え → 一覧', durations)).toBeLessThan(LIMIT_MS);
  });
});
