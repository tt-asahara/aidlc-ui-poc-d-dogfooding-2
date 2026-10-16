import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// テストどうしで画面を共有しない。
afterEach(() => {
  cleanup();
});
