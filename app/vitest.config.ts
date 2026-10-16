import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // main.tsx はブラウザで画面を起動する（#root を探して描画する）だけのファイルで、
        // 単体テストの対象にならない。起動の流れはブラウザ操作のテスト（Playwright）で確かめる（NFR7.2）。
        'src/ui/main.tsx',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      // 行カバレッジ 80% を下限とする。下回ればコマンドが失敗する。下限を下げて通すことはしない（NFR7.2）。
      thresholds: {
        lines: 80,
      },
    },
  },
});
