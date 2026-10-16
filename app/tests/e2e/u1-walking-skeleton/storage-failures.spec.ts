import { expect, test } from '@playwright/test';
import { openApp, putRawStore, readRawStore, register, totals } from '../support/app';

test.describe('U1 薄い版: 保存できないとき・保存データが読めないとき', () => {
  test('保存に失敗したら失敗と再試行の方法が出て、入力が残り、「登録しました」は出ない（AC7.3.1）', async ({
    page,
  }) => {
    // ブラウザの保存領域への書き込みを容量不足で失敗させる。
    await page.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
    });
    await openApp(page);

    await register(page, {
      date: '2026-10-14',
      amount: '1280',
      category: '食費',
      memo: 'スーパー',
    });

    await expect(page.getByTestId('entry-form-alert')).toHaveText(
      'このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「登録する」を押してください',
    );
    await expect(page.getByTestId('entry-form-alert')).toHaveAttribute('role', 'alert');
    await expect(page.getByText(/登録しました/)).toHaveCount(0);
    await expect(page.getByLabel('金額（円）')).toHaveValue('1280');
    await expect(page.getByLabel('カテゴリ')).toHaveValue('食費');
    await expect(page.getByLabel('メモ（任意）')).toHaveValue('スーパー');
    await expect(totals(page).expense).toHaveText('¥0');
    expect(await readRawStore(page)).toBeNull();
  });

  test('保存データが壊れていると、登録・集計・CSV 保存が止まって理由が出て、中身は変わらない（AC7.3.3 の U1 分、AC7.3.4）', async ({
    page,
  }) => {
    await openApp(page);
    const broken = '{"schemaVersion":1,"entries":[';
    await putRawStore(page, broken);

    const submit = page.getByRole('button', { name: '登録する' });
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId('entry-form-alert')).toHaveText(
      '保存データを読み込めませんでした。データは消していません',
    );
    await expect(page.getByTestId('review-unreadable')).toHaveText(
      '保存データを読み込めないため、集計を表示できません',
    );
    await expect(page.getByTestId('review-income')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '明細を CSV に保存' })).toBeDisabled();
    await expect(page.getByTestId('export-lock-reason')).toHaveText(
      '保存データを読み込めないため、CSV に保存できません。データは消していません',
    );
    await expect(page.getByText(/明細がありません/)).toHaveCount(0);

    // 入力しても保存されず、開き直しても壊れた保存データはそのまま残る。
    await page.getByLabel('金額（円）').fill('1280');
    await page.getByLabel('カテゴリ').selectOption('食費');
    await submit.click({ force: true });
    expect(await readRawStore(page)).toBe(broken);
    await page.reload();
    await expect(page.getByRole('button', { name: '登録する' })).toBeDisabled();
    expect(await readRawStore(page)).toBe(broken);
  });

  test('知らない新しい版（schemaVersion 2）の保存データも読まずに止める（BR4.2）', async ({
    page,
  }) => {
    await openApp(page);
    const future = JSON.stringify({ schemaVersion: 2, revision: 3, entries: [], budgets: [] });
    await putRawStore(page, future);

    await expect(page.getByRole('button', { name: '登録する' })).toBeDisabled();
    await expect(page.getByTestId('review-unreadable')).toBeVisible();
    expect(await readRawStore(page)).toBe(future);
  });
});
