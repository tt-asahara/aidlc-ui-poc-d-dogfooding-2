import { expect, test } from '@playwright/test';
import { openApp, putRawStore, readRawStore, snapshotOf } from '../support/app';
import { NOTICE, storedEntryCount } from '../support/u5';

/**
 * 壊れた保存データ（U5 AC7.3.3、AC7.3.4、BR1.1、BR1.2、BR5.1）。
 * JSON としては読めるが、約束ごと C2 の形に合わない保存データ（項目の型の誤りなど）を置いて開く。
 */
const validEntry = {
  entryId: 'corrupt-e1',
  date: '2026-10-14',
  kind: '支出' as const,
  category: '食費',
  amount: 1280,
  memo: 'スーパー',
  addedOrder: 1,
};

const brokenCases = [
  {
    name: '金額が文字（項目の型の誤り）',
    raw: JSON.stringify(snapshotOf([{ ...validEntry, amount: '1280' as unknown as number }])),
  },
  {
    name: '予算の項目がない',
    raw: JSON.stringify({ schemaVersion: 1, revision: 1, savedAt: 'x', entries: [validEntry] }),
  },
  {
    name: '存在しない日付',
    raw: JSON.stringify(snapshotOf([{ ...validEntry, date: '2026-02-30' }])),
  },
];

test.describe('U5: 壊れた保存データ', () => {
  for (const { name, raw } of brokenCases) {
    test(`${name}: 全体のお知らせ枠に理由が出て、保存の操作が止まり、開き直しても書き換わらない（AC7.3.3、AC7.3.4）`, async ({
      page,
    }) => {
      await openApp(page);
      await putRawStore(page, raw);

      const notice = page.getByTestId('notice-corrupt');
      await expect(notice).toHaveAttribute('role', 'alert');
      await expect(notice).toContainText(NOTICE.corrupt);
      await expect(notice).toContainText(NOTICE.corruptBody);
      await expect(page.getByRole('button', { name: '登録する' })).toBeDisabled();
      await expect(page.getByTestId('review-unreadable')).toBeVisible();
      await expect(page.getByRole('button', { name: '明細を CSV に保存' })).toBeDisabled();
      await expect(page.getByTestId('notice-other-tab')).toHaveCount(0);

      // サンプルは入れ直さず、保存データにも書かない（BR1.2）。
      expect(await readRawStore(page)).toBe(raw);
      await page.reload();
      await expect(page.getByTestId('notice-corrupt')).toBeVisible();
      await expect(page.getByRole('button', { name: '登録する' })).toBeDisabled();
      expect(await readRawStore(page)).toBe(raw);
      expect(await storedEntryCount(page)).not.toBe(54);
    });
  }
});
