import { CATEGORIES } from '../../../src/domain/categoryCatalog';
import type { Entry, StoreSnapshot } from '../../../src/domain/types';

// すべて架空の明細。決まった規則で作り、実在の人物・口座・店舗の名前を使わない（NFR3.4）。

let sequence = 0;

export function makeEntry(overrides: Partial<Entry> = {}): Entry {
  sequence += 1;
  return {
    entryId: `test-entry-${sequence}`,
    date: '2026-10-14',
    kind: '支出',
    category: '食費',
    amount: 1280,
    memo: '架空の明細',
    addedOrder: sequence,
    ...overrides,
  };
}

export function makeSnapshot(entries: readonly Entry[], revision = 1): StoreSnapshot {
  return {
    schemaVersion: 1,
    revision,
    savedAt: '2026-10-14T00:00:00.000Z',
    entries,
    budgets: [],
  };
}

/**
 * 性能のテスト用: 3,000 件（1か月 100 件 × 30 か月）の架空の明細を作る。
 * lastMonth の月を含む、それより前の 30 か月分。
 */
export function makeLargeEntries(lastMonth = '2026-10', total = 3000, perMonth = 100): Entry[] {
  const [yearText, monthText] = lastMonth.split('-');
  let monthIndex = Number(yearText) * 12 + Number(monthText) - 1;
  const categories = CATEGORIES;
  const entries: Entry[] = [];
  for (let index = 0; index < total; index += 1) {
    if (index > 0 && index % perMonth === 0) {
      monthIndex -= 1;
    }
    const year = Math.floor(monthIndex / 12);
    const month = String((monthIndex % 12) + 1).padStart(2, '0');
    const day = String((index % 28) + 1).padStart(2, '0');
    const category = categories[index % categories.length]!;
    entries.push({
      entryId: `large-${index}`,
      date: `${year}-${month}-${day}`,
      kind: category.kind,
      category: category.name,
      amount: ((index * 37) % 9_999_999) + 1,
      memo: `テスト明細 ${index}`,
      addedOrder: index + 1,
    });
  }
  return entries;
}
