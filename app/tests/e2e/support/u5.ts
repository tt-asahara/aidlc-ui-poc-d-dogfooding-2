import AxeBuilder from '@axe-core/playwright';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { EMPTY_STORE_TEXT, STORAGE_KEY } from './app';

/** U5 のブラウザ操作のテストの共通部品。値はすべて架空。 */

export const TEST_ORIGIN = 'http://127.0.0.1:4174';

/** U5 の全体のお知らせ枠の文言（機能設計 frontend-components.md）。 */
export const NOTICE = {
  corrupt: '保存データを読み込めませんでした。データは消していません。',
  corruptBody: '登録・予算の保存・CSV の取り込みは、いまは使えません。',
  unavailable: 'このブラウザでは保存できません。登録などの操作をしても保存されません',
  otherTab: '別のタブで変更がありました。最新の内容を読み込みました',
} as const;

/** axe の検査で、重大（critical・serious）な違反だけを取り出す（NFR2.2）。 */
export async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => `${violation.id}（${violation.impact}）: ${violation.help}`);
}

/** ページの読み込みのたびに、保存データがなければ空の保存データ（通し番号 0）を置く（サンプルを入れない）。 */
export async function startEmpty(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, value);
      }
    },
    [STORAGE_KEY, EMPTY_STORE_TEXT] as const,
  );
}

/** localStorage へのアクセス自体を失敗させる（ブラウザの設定で保存領域が使えない環境の再現。BR3.1）。 */
export async function denyStorageAccess(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const deny = {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    Object.defineProperty(Window.prototype, 'localStorage', deny);
    Object.defineProperty(window, 'localStorage', deny);
  });
}

export interface ExternalRequests {
  /** ブラウザが送り出そうとした（ネットワークの層まで届いた）外部への通信。 */
  readonly sent: string[];
  /** ページが作ろうとした外部への通信（CSP で止められたものを含む）。 */
  readonly attempted: string[];
}

/**
 * コンテキストの全ページで、配信元と違う先への通信を記録する（NFR3.2）。
 * ネットワークの層まで届いた外部への通信は中断する（テスト自身が外部へ通信しないため）。
 */
export async function recordExternalRequests(context: BrowserContext): Promise<ExternalRequests> {
  const record: ExternalRequests = { sent: [], attempted: [] };
  const isExternal = (url: string) =>
    !url.startsWith(`${TEST_ORIGIN}/`) && !url.startsWith('blob:');
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (!isExternal(url)) {
      await route.continue();
      return;
    }
    record.sent.push(url);
    await route.abort('blockedbyclient');
  });
  context.on('request', (request) => {
    if (isExternal(request.url())) {
      record.attempted.push(request.url());
    }
  });
  return record;
}

/** 保存データの明細の数（読めなければ null）。 */
export async function storedEntryCount(page: Page): Promise<number | null> {
  return page.evaluate((key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
        entries?: unknown[];
      } | null;
      return parsed && Array.isArray(parsed.entries) ? parsed.entries.length : null;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

export async function expectNoBannerNotice(page: Page): Promise<void> {
  await expect(page.getByTestId('notice-alert-region')).toBeEmpty();
  await expect(page.getByTestId('notice-status-region')).toBeEmpty();
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}
