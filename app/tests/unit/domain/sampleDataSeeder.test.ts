import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import { createMonthlySummary } from '../../../src/domain/monthlySummary';
import { fail } from '../../../src/domain/result';
import { createSampleDataSeeder, SAMPLE_MEMOS } from '../../../src/domain/sampleDataSeeder';
import type { StoreSnapshot } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY, type DataStore } from '../../../src/store/dataStore';
import { FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';

// 初回のサンプル投入（U5 W2、BR4.1〜BR4.5、AC7.1.1〜AC7.1.4、NFR3.1、NFR5.1、NFR5.4）。

const stores: DataStore[] = [];

function setup(storage = new FakeStorage()) {
  const store = createDataStore({
    getStorage: () => storage,
    now: () => new Date('2026-10-16T01:00:00.000Z'),
  });
  stores.push(store);
  store.load();
  const ledger = createLedger({ store });
  const seeder = createSampleDataSeeder({ ledger, store });
  return { storage, store, ledger, seeder };
}

function seeded(today: string): StoreSnapshot {
  const { seeder } = setup();
  const result = seeder.seedIfEmpty(today);
  if (!result.ok) {
    throw new Error(`サンプル投入に失敗しました: ${result.error.code}`);
  }
  return result.value;
}

function countByMonth(snapshot: StoreSnapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of snapshot.entries) {
    const month = entry.date.slice(0, 7);
    counts[month] = (counts[month] ?? 0) + 1;
  }
  return counts;
}

describe('SampleDataSeeder', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const store of stores.splice(0)) {
      store.dispose();
    }
  });

  it('空の保存領域に、今日の月と前の2か月の明細と予算を1回の保存で入れる（AC7.1.1、BR4.1）', () => {
    const { seeder, storage, store } = setup();

    const result = seeder.seedIfEmpty('2026-10-16');

    expect(result.ok).toBe(true);
    expect(storage.setItemCalls).toBe(1);
    const saved = JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null') as StoreSnapshot;
    expect(saved.revision).toBe(1);
    expect(Object.keys(countByMonth(saved))).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(saved.budgets).toHaveLength(18);
    expect(saved.entries.map((entry) => entry.addedOrder)).toEqual(
      saved.entries.map((_, index) => index + 1),
    );
    expect(new Set(saved.entries.map((entry) => entry.entryId)).size).toBe(saved.entries.length);
    expect(store.getStatus()).toBe('ready');
    expect(store.getSnapshot()).toEqual(saved);
  });

  it('明細は1か月 15〜20 件で、給与は毎月、副収入は前の月、支出は8つのカテゴリに散る（BR4.2）', () => {
    const snapshot = seeded('2026-10-16');

    expect(countByMonth(snapshot)).toEqual({ '2026-08': 17, '2026-09': 20, '2026-10': 17 });
    for (const month of ['2026-08', '2026-09', '2026-10']) {
      const entries = snapshot.entries.filter((entry) => entry.date.startsWith(month));
      expect(entries.filter((entry) => entry.category === '給与')).toHaveLength(1);
      expect(new Set(entries.filter((e) => e.kind === '支出').map((e) => e.category)).size).toBe(8);
    }
    expect(
      snapshot.entries.filter((entry) => entry.category === '副収入').map((e) => e.date),
    ).toEqual(['2026-09-18']);
  });

  it('今日より後の日付を使わない（月の1日・月末・年をまたぐ今日）', () => {
    const cases = [
      { today: '2026-10-01', months: ['2026-08', '2026-09', '2026-10'] },
      { today: '2026-10-31', months: ['2026-08', '2026-09', '2026-10'] },
      { today: '2027-01-15', months: ['2026-11', '2026-12', '2027-01'] },
      { today: '2026-02-28', months: ['2025-12', '2026-01', '2026-02'] },
    ];
    for (const { today, months } of cases) {
      const snapshot = seeded(today);
      const counts = countByMonth(snapshot);

      expect(Object.keys(counts), today).toEqual(months);
      expect(
        snapshot.entries.every((entry) => entry.date <= today),
        today,
      ).toBe(true);
      for (const count of Object.values(counts)) {
        expect(count, today).toBeGreaterThanOrEqual(15);
        expect(count, today).toBeLessThanOrEqual(20);
      }
    }
    expect(() => seeded('2026/10/16')).toThrow(RangeError);
  });

  it('予算は3か月とも6つの支出カテゴリに設定し、娯楽・その他支出は未設定、前の月の食費が超過する（AC7.1.2、BR4.3）', () => {
    const { seeder, ledger } = setup();
    const result = seeder.seedIfEmpty('2026-10-16');
    if (!result.ok) {
      throw new Error('サンプル投入に失敗しました');
    }
    const budgets = result.value.budgets;
    const summary = createMonthlySummary({
      ledger,
      budgetSource: { getMonth: (month) => budgets.filter((budget) => budget.month === month) },
    });

    for (const month of ['2026-08', '2026-09', '2026-10']) {
      expect(budgets.filter((budget) => budget.month === month).map((b) => b.category)).toEqual([
        '食費',
        '住居費',
        '水道光熱費',
        '通信費',
        '日用品',
        '交通費',
      ]);
      const categories = summary.summarize(month).categories;
      expect(categories.filter((c) => c.budget === null).map((c) => c.category)).toEqual([
        '娯楽',
        'その他支出',
      ]);
    }
    const food = summary.summarize('2026-09').categories.find((c) => c.category === '食費');
    expect(food).toMatchObject({ actual: 43_900, budget: 40_000, over: true });
    expect(summary.summarize('2026-08').categories.some((c) => c.over)).toBe(false);
  });

  it('すべてのメモが一般名詞の一覧の中にある（AC7.1.4、BR4.4、NFR3.1）', () => {
    const snapshot = seeded('2026-10-16');
    const allowed = new Set<string>(SAMPLE_MEMOS);

    expect(snapshot.entries.length).toBeGreaterThan(0);
    expect(snapshot.entries.filter((entry) => !allowed.has(entry.memo))).toEqual([]);
  });

  it('保存データがあれば断られて何も変わらない（2つのタブの同時の初回でも二重にならない。NFR5.4）', () => {
    const storage = new FakeStorage();
    const firstTab = setup(storage);
    const secondTab = setup(storage); // 先のタブの投入より前に、空として読み込んだタブ。

    expect(firstTab.seeder.seedIfEmpty('2026-10-16').ok).toBe(true);
    const afterFirst = storage.items.get(STORAGE_KEY);
    const again = firstTab.seeder.seedIfEmpty('2026-10-16');
    const late = secondTab.seeder.seedIfEmpty('2026-10-16');

    expect(!again.ok && again.error.code).toBe('STALE_REVISION');
    expect(!late.ok && late.error.code).toBe('STALE_REVISION');
    expect(storage.setItemCalls).toBe(1);
    expect(storage.items.get(STORAGE_KEY)).toBe(afterFirst);
    expect(secondTab.store.getSnapshot()?.entries).toHaveLength(54);
  });

  it('書き込みに失敗したら何も残らない。規則に合わない明細があれば保存しない（NFR5.1、BR4.5）', () => {
    const quota = setup(new QuotaExceededStorage());
    const failed = quota.seeder.seedIfEmpty('2026-10-16');

    expect(!failed.ok && failed.error.code).toBe('STORAGE_WRITE');
    expect(quota.storage.items.size).toBe(0);
    expect(quota.store.getStatus()).toBe('empty');
    expect(quota.store.getSnapshot()?.entries).toEqual([]);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const commit = vi.fn();
    const broken = createSampleDataSeeder({
      ledger: {
        validate: () =>
          fail('VALIDATION', '入力を確かめてください', [{ field: 'memo', message: 'x' }]),
        assignIdentities: vi.fn(),
      },
      store: { commit },
    });
    const invalid = broken.seedIfEmpty('2026-10-16');

    expect(!invalid.ok && invalid.error.code).toBe('VALIDATION');
    expect(commit).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
