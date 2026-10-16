import type { StorageLike } from '../../../src/store/dataStore';

/** テストごとに作り直す偽の保存領域（Map を使う）。 */
export class FakeStorage implements StorageLike {
  readonly items = new Map<string, string>();
  setItemCalls = 0;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setItemCalls += 1;
    this.items.set(key, value);
  }
}

/** 書き込みが容量不足で失敗する偽の保存領域。 */
export class QuotaExceededStorage extends FakeStorage {
  override setItem(): void {
    this.setItemCalls += 1;
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }
}

/** 保存領域へのアクセス自体が失敗する偽物（ブラウザの設定で使えないときなど）。 */
export class AccessDeniedStorage implements StorageLike {
  getItem(): string | null {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  setItem(): void {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }
}
