import { defineConfig, devices } from '@playwright/test';

/**
 * ブラウザ操作のテスト。ビルド済みのページ（CSP 入り）を Vite の preview で 127.0.0.1:4174 から配信する。
 * 依頼者が使う 4173 とは配信元を分け、依頼者の保存データに触れない（インフラ設計 cicd-pipeline.md）。
 * 先に `npm run build` を実行しておくこと（`npm run verify` は build のあとに e2e を動かす）。
 */
const TEST_ORIGIN = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: TEST_ORIGIN,
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4174 --strictPort',
    url: `${TEST_ORIGIN}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
