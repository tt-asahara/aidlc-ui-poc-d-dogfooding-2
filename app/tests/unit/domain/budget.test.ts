import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUDGET_MESSAGES, createBudget, type BudgetValues } from '../../../src/domain/budget';
import type { MonthlyBudget, StoreSnapshot } from '../../../src/domain/types';
import { validateSnapshot } from '../../../src/domain/validateSnapshot';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// 予算の部品（C4、U3 BR1.1〜BR1.3、BR3.1〜BR3.4、NFR5.1、NFR5.3）。
// 本物の DataStore と偽の保存領域で確かめる。値はすべて架空。

function budget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: `${month}:${category}`, month, category, amount };
}

function setup(budgets: readonly MonthlyBudget[] = [], storage = new FakeStorage()) {
  const snapshot: StoreSnapshot = {
    ...makeSnapshot([
      makeEntry({ date: '2026-10-05', amount: 9570 }),
      makeEntry({ date: '2026-09-05', amount: 1200 }),
    ]),
    budgets,
  };
  storage.items.set(STORAGE_KEY, JSON.stringify(snapshot));
  const store = createDataStore({
    getStorage: () => storage,
    now: () => new Date(0),
    eventSource: { addEventListener: () => undefined, removeEventListener: () => undefined },
  });
  store.load();
  return { store, storage, budget: createBudget({ store }) };
}

function stored(storage: FakeStorage): StoreSnapshot {
  return JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null') as StoreSnapshot;
}

const SEPTEMBER_AND_NOVEMBER = [budget('2026-09', '食費', 30000), budget('2026-11', '食費', 50000)];

describe('Budget', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('食費 40000 を保存すると、その月の食費が ¥40,000 になり、ほかの月は変わらない（AC4.1.1、BR1.2）', () => {
    const { budget: target, storage, store } = setup(SEPTEMBER_AND_NOVEMBER);
    const commit = vi.spyOn(store, 'commit');

    const result = target.saveMonth('2026-10', { 食費: '40000' });

    expect(result).toEqual({ ok: true, value: [budget('2026-10', '食費', 40000)] });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith({
      expectedRevision: 1,
      budgetsToReplace: { month: '2026-10', budgets: [budget('2026-10', '食費', 40000)] },
    });
    expect(target.getMonth('2026-10')).toEqual([budget('2026-10', '食費', 40000)]);
    expect(target.getMonth('2026-09')).toEqual([budget('2026-09', '食費', 30000)]);
    expect(target.getMonth('2026-11')).toEqual([budget('2026-11', '食費', 50000)]);
    expect(stored(storage).revision).toBe(2);
  });

  it('-1・1.5・10000000・全角数字は誤り、0 と 9999999 と前後の空白は保存できる（AC4.1.2、BR1.1）', () => {
    const { budget: target } = setup();

    for (const bad of ['-1', '1.5', '10000000', '４００００', '1,000', '1e3', '+5']) {
      const result = target.saveMonth('2026-10', { 食費: bad });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toEqual({
        code: 'VALIDATION',
        message: '予算を確かめてください: 食費',
        fieldErrors: [{ field: 'budget:食費', message: BUDGET_MESSAGES.invalidAmount }],
      });
    }
    expect(BUDGET_MESSAGES.invalidAmount).toBe('予算は 0〜9,999,999 の整数で入力してください');

    const saved = target.saveMonth('2026-10', { 食費: '0', 住居費: ' 9999999 ' });
    expect(saved.ok && saved.value).toEqual([
      budget('2026-10', '食費', 0),
      budget('2026-10', '住居費', 9999999),
    ]);
  });

  it('空欄と空白だけの欄は未設定として保存し、その月の予算から外す（AC4.1.3、BR1.1）', () => {
    const { budget: target } = setup([
      budget('2026-10', '食費', 40000),
      budget('2026-10', '娯楽', 5000),
    ]);

    const result = target.saveMonth('2026-10', { 食費: '', 娯楽: '   ', 交通費: '8000' });

    expect(result.ok).toBe(true);
    expect(target.getMonth('2026-10')).toEqual([budget('2026-10', '交通費', 8000)]);
  });

  it('1つでも誤りがあれば何も保存せず、誤りの欄をカテゴリの順にまとめる（BR1.2）', () => {
    const { budget: target, storage, store } = setup([budget('2026-10', '食費', 40000)]);
    const before = storage.items.get(STORAGE_KEY);
    const commit = vi.spyOn(store, 'commit');

    const result = target.saveMonth('2026-10', {
      食費: '45000',
      娯楽: 'abc',
      住居費: '-5',
      通信費: '6000',
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.message).toBe('予算を確かめてください: 住居費、娯楽');
    expect(!result.ok && result.error.fieldErrors?.map((error) => error.field)).toEqual([
      'budget:住居費',
      'budget:娯楽',
    ]);
    expect(commit).not.toHaveBeenCalled();
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('支出カテゴリ以外の名前（収入カテゴリ・知らない名前・継承した名前）は読まない（BR1.3）', () => {
    const { budget: target } = setup();
    const inherited = Object.create({ 食費: '999' }) as Record<string, string>;
    inherited['日用品'] = '3000';
    const values: BudgetValues = { ...inherited, 給与: '100', 架空: 'x', 交通費: '8000' };

    expect(target.saveMonth('2026-10', values).ok).toBe(true);
    const fromPrototype = target.saveMonth('2026-11', inherited);

    expect(target.getMonth('2026-10')).toEqual([
      budget('2026-10', '日用品', 3000),
      budget('2026-10', '交通費', 8000),
    ]);
    expect(fromPrototype.ok && fromPrototype.value).toEqual([budget('2026-11', '日用品', 3000)]);
  });

  it('保存の前後で明細の数と内容が変わらず、保存データは validateSnapshot を通る（NFR5.1、NFR5.3）', () => {
    const { budget: target, storage } = setup(SEPTEMBER_AND_NOVEMBER);
    const entriesBefore = stored(storage).entries;

    target.saveMonth('2026-10', { 食費: '40000', 住居費: '82000', その他支出: '0' });
    target.copyFromPrevious('2026-12');

    const after = stored(storage);
    expect(after.entries).toEqual(entriesBefore);
    expect(after.entries).toHaveLength(2);
    expect(validateSnapshot(after)).toEqual({ ok: after });
    expect(after.budgets.filter((b) => b.month === '2026-12')).toEqual([
      budget('2026-12', '食費', 50000),
    ]);
  });

  it('前の月に予算がなければ previewCopy も copyFromPrevious も NOT_FOUND で、何も変えない（AC4.2.3、BR3.2）', () => {
    const { budget: target, store, storage } = setup([budget('2026-10', '食費', 40000)]);
    const commit = vi.spyOn(store, 'commit');
    const before = storage.items.get(STORAGE_KEY);

    expect(target.previewCopy('2026-11').ok).toBe(true);
    const preview = target.previewCopy('2026-10');
    const copy = target.copyFromPrevious('2026-10');

    for (const result of [preview, copy]) {
      expect(!result.ok && result.error).toEqual({
        code: 'NOT_FOUND',
        message: '前の月の予算がありません',
      });
    }
    expect(commit).not.toHaveBeenCalled();
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('previewCopy は前の月の予算と、表示中の月に予算があるか（targetHasBudgets）を返す（BR3.1、BR3.3）', () => {
    const { budget: target } = setup([
      budget('2026-09', '食費', 40000),
      budget('2026-09', '住居費', 82000),
      budget('2026-10', '娯楽', 0),
    ]);

    // 10月には娯楽 ¥0 の予算がある（0 も「予算あり」）。11月には予算がない。
    expect(target.previewCopy('2026-10')).toEqual({
      ok: true,
      value: {
        source: [budget('2026-09', '食費', 40000), budget('2026-09', '住居費', 82000)],
        targetHasBudgets: true,
      },
    });
    expect(target.previewCopy('2026-11')).toEqual({
      ok: true,
      value: { source: [budget('2026-10', '娯楽', 0)], targetHasBudgets: false },
    });
  });

  it('コピーは表示中の月をまるごと置き換え、前の月で未設定のカテゴリは未設定になる（AC4.2.1、BR3.4）', () => {
    const { budget: target, store } = setup([
      budget('2026-09', '食費', 40000),
      budget('2026-09', '住居費', 82000),
      budget('2026-10', '食費', 10000),
      budget('2026-10', '娯楽', 5000),
    ]);
    const commit = vi.spyOn(store, 'commit');

    const result = target.copyFromPrevious('2026-10');

    const expected = [budget('2026-10', '食費', 40000), budget('2026-10', '住居費', 82000)];
    expect(result).toEqual({ ok: true, value: expected });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith({
      expectedRevision: 1,
      budgetsToReplace: { month: '2026-10', budgets: expected },
    });
    expect(target.getMonth('2026-10')).toEqual(expected);
    expect(target.getMonth('2026-09')).toHaveLength(2);
  });

  it('1月の前の月は前の年の12月（BR3.1）', () => {
    const { budget: target } = setup([budget('2025-12', '交通費', 8000)]);

    const preview = target.previewCopy('2026-01');
    const copy = target.copyFromPrevious('2026-01');

    expect(preview.ok && preview.value.source).toEqual([budget('2025-12', '交通費', 8000)]);
    expect(copy.ok && copy.value).toEqual([budget('2026-01', '交通費', 8000)]);
  });

  it('保存の失敗（STORAGE_WRITE・STALE_REVISION・STORE_UNREADABLE）は結果の値で返し、予算を変えない（BR5.1）', () => {
    const quota = new QuotaExceededStorage();
    const failing = setup([budget('2026-09', '食費', 40000)], quota);
    const write = failing.budget.saveMonth('2026-10', { 食費: '1000' });
    const copyWrite = failing.budget.copyFromPrevious('2026-10');
    expect(!write.ok && write.error.code).toBe('STORAGE_WRITE');
    expect(!copyWrite.ok && copyWrite.error.code).toBe('STORAGE_WRITE');
    expect(failing.budget.getMonth('2026-10')).toEqual([]);

    const shared = setup([budget('2026-09', '食費', 40000)]);
    // 別のタブが先に保存した（保存領域の通し番号が進んだ）。
    shared.storage.items.set(
      STORAGE_KEY,
      JSON.stringify({ ...makeSnapshot([], 5), budgets: [budget('2026-09', '食費', 41000)] }),
    );
    const stale = shared.budget.saveMonth('2026-10', { 食費: '1000' });
    expect(!stale.ok && stale.error.code).toBe('STALE_REVISION');
    expect(shared.budget.getMonth('2026-10')).toEqual([]);
    // DataStore が最新を読み込んだので、次のコピーは最新の前の月の予算で写せる。
    expect(shared.budget.copyFromPrevious('2026-10')).toEqual({
      ok: true,
      value: [budget('2026-10', '食費', 41000)],
    });

    const corrupt = setup([budget('2026-09', '食費', 40000)]);
    corrupt.storage.items.set(STORAGE_KEY, '{broken');
    const unreadable = corrupt.budget.copyFromPrevious('2026-10');
    expect(!unreadable.ok && unreadable.error.code).toBe('STORE_UNREADABLE');
    expect(corrupt.budget.getMonth('2026-10')).toEqual([]);
    expect(corrupt.budget.previewCopy('2026-10').ok).toBe(false);
  });

  it('getMonth は表示中の月の予算だけをカテゴリの順で返し、月の形の誤りは例外にする', () => {
    const { budget: target } = setup([
      budget('2026-10', 'その他支出', 100),
      budget('2026-10', '食費', 40000),
      budget('2026-09', '住居費', 82000),
    ]);

    expect(target.getMonth('2026-10').map((b) => b.category)).toEqual(['食費', 'その他支出']);
    expect(target.getMonth('2027-01')).toEqual([]);
    expect(() => target.saveMonth('2026-13', {})).toThrow(RangeError);
    expect(() => target.previewCopy('202610')).toThrow(RangeError);
    expect(() => target.copyFromPrevious('')).toThrow(RangeError);
  });
});
