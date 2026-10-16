import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import type { ValidatedEntry } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// Ledger.assignIdentities（U5 BR4.5）: 複数件の採番。値はすべて架空。

function validated(memo: string, date = '2026-10-14'): ValidatedEntry {
  return { date, kind: '支出', category: '食費', amount: 1280, memo };
}

function ledgerWithIds(ids: readonly string[]) {
  const storage = new FakeStorage();
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  let index = 0;
  const newId = vi.fn(() => ids[index++] ?? `fallback-${index}`);
  return { ledger: createLedger({ store, newId }), newId, storage, store };
}

describe('Ledger.assignIdentities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('入力の順に addedOrder を 1 から振り、入力の項目はそのまま残す', () => {
    const { ledger } = ledgerWithIds(['a', 'b', 'c']);

    const entries = ledger.assignIdentities(
      [validated('スーパー'), validated('外食'), validated('本')],
      [],
    );

    expect(entries).toEqual([
      { ...validated('スーパー'), entryId: 'a', addedOrder: 1 },
      { ...validated('外食'), entryId: 'b', addedOrder: 2 },
      { ...validated('本'), entryId: 'c', addedOrder: 3 },
    ]);
  });

  it('既存の明細があれば、その最大の addedOrder の続きから振る（並びが飛んでいても最大の続き）', () => {
    const { ledger } = ledgerWithIds(['x', 'y']);
    const existing = [makeEntry({ addedOrder: 7 }), makeEntry({ addedOrder: 3 })];

    const entries = ledger.assignIdentities([validated('日用品'), validated('雑貨')], existing);

    expect(entries.map((entry) => entry.addedOrder)).toEqual([8, 9]);
  });

  it('ID は既存の明細とも入力どうしとも重ならない（重なれば作り直す）', () => {
    const existing = [makeEntry({ entryId: 'dup-1' })];
    const { ledger, newId } = ledgerWithIds(['dup-1', 'new-1', 'new-1', 'new-2']);

    const entries = ledger.assignIdentities([validated('定期券'), validated('バス')], existing);

    expect(entries.map((entry) => entry.entryId)).toEqual(['new-1', 'new-2']);
    expect(newId).toHaveBeenCalledTimes(4);
  });

  it('空の入力には空の配列を返し、ID を作らない', () => {
    const { ledger, newId } = ledgerWithIds(['a']);

    expect(ledger.assignIdentities([], [makeEntry()])).toEqual([]);
    expect(newId).not.toHaveBeenCalled();
  });

  it('U1 の add の結果は変わらない（既存の最大の続きの番号、既存と重ならない ID、1回の保存）', () => {
    const { ledger, storage, store } = ledgerWithIds(['old-1', 'id-new']);
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(makeSnapshot([makeEntry({ entryId: 'old-1', addedOrder: 41 })], 5)),
    );
    store.load();

    const result = ledger.add({
      kind: '支出',
      date: '2026-10-14',
      amount: '1280',
      category: '食費',
      memo: 'スーパー',
    });

    expect(result).toEqual({
      ok: true,
      value: { ...validated('スーパー'), entryId: 'id-new', addedOrder: 42 },
    });
    expect(storage.setItemCalls).toBe(1);
    expect(store.getSnapshot()?.revision).toBe(6);
  });
});
