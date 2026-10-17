import { expect, test } from '@playwright/test';
import { openApp, readRawStore, register } from '../support/app';
import { emojiText, ledgerRows, reportDurations, submitButton } from '../support/u2';
import type { StoreSnapshot } from '../../../src/domain/types';

/** 大きな貼り付けの上限（performance-design.md「大きな貼り付け」）。Chromium で3回測った中央値で判定する。 */
const PASTE_LIMIT_MS = 1000;

declare global {
  interface Window {
    __u2PasteDuration?: number;
  }
}

async function savedMemos(page: Parameters<typeof readRawStore>[0]): Promise<string[]> {
  const raw = await readRawStore(page);
  return raw ? (JSON.parse(raw) as StoreSnapshot).entries.map((entry) => entry.memo) : [];
}

test.describe('U2: 二重送信の防止（AC1.1.4、BR1.7）', () => {
  test('「登録する」を素早く2回押しても明細は1件だけ増え、成功の知らせが残り、誤りの表示が出ない', async ({
    page,
  }) => {
    await openApp(page);
    await page.getByLabel('金額（円）').fill('1280');
    // U3 の予算の表の名前と区別するため、名前の完全一致で選ぶ（確かめる内容は変えない）。
    await page.getByLabel('カテゴリ', { exact: true }).selectOption('食費');

    await submitButton(page).dblclick();

    await expect(ledgerRows(page)).toHaveCount(1);
    await expect(page.getByTestId('entry-form-status')).toHaveText(
      '登録しました 10月16日 食費 ¥1,280',
    );
    await expect(page.getByTestId('entry-form-alert')).toBeEmpty();
    await expect(page.getByTestId('entry-amount-error')).toHaveCount(0);
    // 300 ミリ秒が過ぎると、また押せるようになる。
    await expect(submitButton(page)).toBeEnabled();
    expect(await savedMemos(page)).toHaveLength(1);
  });
});

test.describe('U2: メモの制限（AC1.2.4、NFR6.1）', () => {
  test('絵文字を含む見える1文字で 100 文字は入り、101 文字目は入らずに「メモは 100 文字までです」と出る', async ({
    page,
  }) => {
    await openApp(page);
    const memo = page.getByLabel('メモ（任意）');

    await memo.fill(emojiText(100));
    await expect(memo).toHaveValue(emojiText(100));
    await expect(page.getByTestId('entry-memo-error')).toHaveCount(0);

    await memo.press('End');
    await page.keyboard.type('a');
    await expect(memo).toHaveValue(emojiText(100));
    await expect(page.getByTestId('entry-memo-error')).toHaveText('メモは 100 文字までです');

    await memo.fill(emojiText(101));
    await expect(memo).toHaveValue(emojiText(100));

    await register(page, { amount: '700', category: '娯楽', memo: emojiText(100) });
    await expect(ledgerRows(page)).toHaveCount(1);
    expect(await savedMemos(page)).toEqual([emojiText(100)]);
  });

  test('改行を含む貼り付けは取り消され、値は変わらず「メモに改行は使えません」と出る', async ({
    page,
  }) => {
    await openApp(page);
    const memo = page.getByLabel('メモ（任意）');
    await memo.fill('スーパー');
    // 改行を含む文字を、テスト用の一時的な textarea から実際にコピーする（作った事象ではブラウザによって中身を読めないため）。
    await page.evaluate(() => {
      const source = document.createElement('textarea');
      source.id = 'u2-paste-source';
      source.value = '1行目\n2行目';
      document.body.append(source);
    });
    const source = page.locator('#u2-paste-source');
    await source.focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('ControlOrMeta+C');
    await source.evaluate((element) => element.remove());
    const canceled = memo.evaluate(
      (input) =>
        new Promise<boolean>((resolve) => {
          input.addEventListener(
            'paste',
            (event) => setTimeout(() => resolve(event.defaultPrevented)),
            {
              once: true,
            },
          );
        }),
    );

    await memo.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('ControlOrMeta+V');

    expect(await canceled).toBe(true);
    await expect(memo).toHaveValue('スーパー');
    await expect(page.getByTestId('entry-memo-error')).toHaveText('メモに改行は使えません');
    await expect(memo).toHaveAccessibleDescription('メモに改行は使えません');
  });
});

test.describe('U2: 大きな貼り付けの性能（performance-design.md）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '時間の判定は Chromium だけで行う');

  test('メモ欄に 1 万文字を貼り付けてから、値が 100 文字に切り詰められるまで 1 秒以内', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    const memo = page.getByLabel('メモ（任意）');
    const tenThousand = 'あ'.repeat(10_000);

    const durations: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      await memo.fill('');
      await page.evaluate((text) => navigator.clipboard.writeText(text), tenThousand);
      await memo.evaluate((input: HTMLInputElement) => {
        window.__u2PasteDuration = undefined;
        input.addEventListener(
          'paste',
          () => {
            const started = performance.now();
            const check = () => {
              if (input.value.length === 100) {
                window.__u2PasteDuration = performance.now() - started;
              } else {
                requestAnimationFrame(check);
              }
            };
            requestAnimationFrame(check);
          },
          { once: true, capture: true },
        );
      });
      await memo.focus();
      await page.keyboard.press('ControlOrMeta+V');
      await page.waitForFunction(() => window.__u2PasteDuration !== undefined);
      durations.push(await page.evaluate(() => window.__u2PasteDuration as number));
      await expect(memo).toHaveValue('あ'.repeat(100));
      await expect(page.getByTestId('entry-memo-error')).toHaveText('メモは 100 文字までです');
    }

    expect(reportDurations('U2 1 万文字の貼り付け → 切り詰め', durations)).toBeLessThan(
      PASTE_LIMIT_MS,
    );
  });
});
