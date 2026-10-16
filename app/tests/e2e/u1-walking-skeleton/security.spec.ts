import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openApp, register } from '../support/app';

const TEST_ORIGIN = 'http://127.0.0.1:4174';
const policy = JSON.parse(
  readFileSync(new URL('../../../csp-policy.json', import.meta.url), 'utf8'),
) as { directives: string[] };

interface ExternalRequests {
  /** ブラウザが送り出そうとした（ネットワークの層まで届いた）外部への通信。 */
  readonly sent: string[];
  /** ページが作ろうとした外部への通信（CSP で止められたものを含む）。 */
  readonly attempted: string[];
}

/**
 * ページの配信元と違う先への通信を記録する。万一 CSP をすり抜けても外へ出ないよう、
 * ネットワークの層まで届いた通信は中断する（テスト自身が外部へ通信しないため）。
 */
async function recordExternalRequests(page: Page): Promise<ExternalRequests> {
  const record: ExternalRequests = { sent: [], attempted: [] };
  const isExternal = (url: string) =>
    !url.startsWith(`${TEST_ORIGIN}/`) && !url.startsWith('blob:');
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!isExternal(url)) {
      await route.continue();
      return;
    }
    record.sent.push(url);
    await route.abort('blockedbyclient');
  });
  page.on('request', (request) => {
    if (isExternal(request.url())) {
      record.attempted.push(request.url());
    }
  });
  return record;
}

test.describe('U1 薄い版: 外部への通信をしない', () => {
  test('登録 → 集計 → CSV 出力の間、ページの配信元と違う先への通信が0件（NFR3.3）', async ({
    page,
  }) => {
    const external = await recordExternalRequests(page);
    await openApp(page);

    await register(page, { amount: '1280', category: '食費', memo: 'スーパー' });
    await expect(page.getByTestId('review-expense')).toHaveText('¥1,280');
    await page.getByRole('button', { name: '前の月' }).click();
    await page.getByRole('button', { name: '次の月' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '明細を CSV に保存' }).click();
    await downloadPromise;
    await page.reload();
    await expect(page.getByTestId('review-expense')).toHaveText('¥1,280');

    expect(external.attempted).toEqual([]);
    expect(external.sent).toEqual([]);
  });

  test('ビルドしたページの CSP が設計どおりで、外部の画像と通信をブラウザが止める（NFR3.1）', async ({
    page,
  }) => {
    const external = await recordExternalRequests(page);
    await openApp(page);

    const content = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(content).toBe(policy.directives.join('; '));

    const violations = await page.evaluate(async () => {
      const seen: string[] = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        seen.push(event.effectiveDirective || event.violatedDirective);
      });
      const image = document.createElement('img');
      image.alt = '';
      image.src = 'https://tracker.example.invalid/pixel.png';
      document.body.append(image);
      const fetchResult = await fetch('https://api.example.invalid/collect').then(
        () => 'sent',
        () => 'blocked',
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      image.remove();
      return { seen, fetchResult };
    });

    expect(violations.fetchResult).toBe('blocked');
    expect(violations.seen).toEqual(expect.arrayContaining(['img-src', 'connect-src']));
    // CSP が止めたため、ネットワークの層まで届いた外部への通信はない。
    expect(external.sent).toEqual([]);
  });
});
