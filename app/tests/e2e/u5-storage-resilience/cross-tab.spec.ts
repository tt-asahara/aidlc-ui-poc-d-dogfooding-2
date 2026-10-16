import { expect, test, type Page } from '@playwright/test';
import { openApp, readRawStore, register, totals } from '../support/app';
import {
  median,
  NOTICE,
  recordExternalRequests,
  startEmpty,
  storedEntryCount,
} from '../support/u5';

/**
 * 2つのタブ（U5 AC7.4.1、AC7.4.2、NFR1.1、NFR3.2、NFR6.1）。
 * 同じブラウザのコンテキストで同じページを2つ開く。storage イベントは、もう片方のページの保存で届く。
 */
test.describe('U5: 2つのタブ', () => {
  test('タブ1の登録がタブ2に知らせとともに反映され、タブ2の登録でもタブ1の明細が残る。外部への通信は0件（AC7.4.1、AC7.4.2、NFR3.2）', async ({
    context,
  }) => {
    const external = await recordExternalRequests(context);
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    await openApp(tab1);
    await openApp(tab2);

    // タブ2で入力中の値は、別のタブの変更を読み込んでも消えない（BR2.2）。
    await tab2.getByLabel('メモ（任意）').fill('入力中');
    await register(tab1, { amount: '1280', category: '食費', memo: 'スーパー' });
    await expect(tab1.getByTestId('entry-form-status')).toContainText('登録しました');

    const notice = tab2.getByTestId('notice-other-tab');
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).toContainText(NOTICE.otherTab);
    await expect(totals(tab2).expense).toHaveText('¥1,280');
    await expect(tab2.getByTestId('review-category-table')).toContainText('¥1,280');
    await expect(tab2.getByLabel('メモ（任意）')).toHaveValue('入力中');
    await expect(tab1.getByTestId('notice-other-tab')).toHaveCount(0);

    await register(tab2, { amount: '500', category: '交通費', memo: '定期券' });
    await expect(tab2.getByTestId('entry-form-status')).toContainText('登録しました');
    await expect(totals(tab2).expense).toHaveText('¥1,780');
    // 自分の保存で、別のタブの知らせは消える（W4）。
    await expect(notice).toHaveCount(0);
    await expect(totals(tab1).expense).toHaveText('¥1,780');
    await expect(tab1.getByTestId('notice-other-tab')).toContainText(NOTICE.otherTab);
    expect(await storedEntryCount(tab1)).toBe(2);
    const saved = JSON.parse((await readRawStore(tab1)) ?? 'null') as {
      entries: { memo: string }[];
    };
    expect(saved.entries.map((entry) => entry.memo)).toEqual(['スーパー', '定期券']);

    // 「閉じる」で消え、操作位置は「1 登録」の見出しへ移る（W6）。
    await tab1.getByRole('button', { name: '別のタブの変更の知らせを閉じる' }).click();
    await expect(tab1.getByTestId('notice-other-tab')).toHaveCount(0);
    await expect(tab1.getByRole('heading', { level: 2, name: '収支を登録' })).toBeFocused();

    expect(external.attempted).toEqual([]);
    expect(external.sent).toEqual([]);
  });
});

declare global {
  interface Window {
    __u5ChangedAt?: number;
  }
}

/** タブ2の支出の合計が変わった時刻（絶対時刻のミリ秒）を記録する見張りを置く。 */
async function watchExpense(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__u5ChangedAt = undefined;
    const target = document.querySelector('[data-testid="review-expense"]');
    const before = target?.textContent ?? '';
    const observer = new MutationObserver(() => {
      const now = document.querySelector('[data-testid="review-expense"]')?.textContent ?? '';
      if (now !== before) {
        window.__u5ChangedAt = performance.timeOrigin + performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

test.describe('U5: 2つのタブの性能', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');

  test('タブ1で保存してから、タブ2の集計が変わるまで 1 秒以内（NFR1.1。3回の中央値）', async ({
    context,
  }) => {
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    for (const tab of [tab1, tab2]) {
      await startEmpty(tab);
      await tab.goto('/');
      await expect(totals(tab).expense).toHaveText('¥0');
    }

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await tab1.getByLabel('金額（円）').fill(String(1000 + run));
      await tab1.getByLabel('カテゴリ').selectOption('日用品');
      // U2 の二重送信の防止（BR1.7）で、登録のあと 300 ミリ秒は押せない。押せるようになってから測る（計測の内容は変えない）。
      await expect(tab1.getByRole('button', { name: '登録する' })).toBeEnabled();
      await watchExpense(tab2);
      const savedAt = await tab1.evaluate(() => {
        const started = performance.timeOrigin + performance.now();
        (document.querySelector('[data-testid="entry-form-submit"]') as HTMLButtonElement).click();
        return started;
      });
      await tab2.waitForFunction(() => window.__u5ChangedAt !== undefined);
      const changedAt = await tab2.evaluate(() => window.__u5ChangedAt as number);
      durations.push(changedAt - savedAt);
      await expect(tab1.getByTestId('entry-form-status')).toContainText('登録しました');
    }

    const value = median(durations);
    const line = `NFR1.1 別のタブの変更の反映: ${durations.map((d) => d.toFixed(1)).join(' / ')} ms（中央値 ${value.toFixed(1)} ms）`;
    console.log(`[性能] ${line}`);
    test.info().annotations.push({ type: 'performance', description: line });
    expect(value).toBeLessThan(1000);
  });
});
