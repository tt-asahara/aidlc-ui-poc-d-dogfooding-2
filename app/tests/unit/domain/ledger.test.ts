import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import type { EntryInput } from '../../../src/domain/types';
import { FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

const validInput: EntryInput = {
  kind: '支出',
  date: '2026-10-14',
  amount: '1280',
  category: '食費',
  memo: 'スーパー',
};

function setup(storage = new FakeStorage()) {
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  let id = 0;
  const ledger = createLedger({ store, newId: () => `id-${++id}` });
  return { storage, store, ledger };
}

function fieldsOf(result: ReturnType<ReturnType<typeof createLedger>['validate']>): string[] {
  return result.ok ? [] : (result.error.fieldErrors ?? []).map((error) => error.field);
}

describe('Ledger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('正しい入力を登録し、保存データに1件増える（AC1.1.1）', () => {
    const { ledger, store } = setup();

    const result = ledger.add(validInput);

    expect(result).toEqual({
      ok: true,
      value: {
        entryId: 'id-1',
        date: '2026-10-14',
        kind: '支出',
        category: '食費',
        amount: 1280,
        memo: 'スーパー',
        addedOrder: 1,
      },
    });
    expect(store.getSnapshot()?.entries).toHaveLength(1);
    expect(store.getSnapshot()?.revision).toBe(1);
  });

  it('必須の4項目が空なら VALIDATION を返し、欄ごとの理由を持つ（BR1.1）', () => {
    const { ledger, store } = setup();

    const result = ledger.add({ kind: '', date: '', amount: '', category: '', memo: '' });

    expect(!result.ok && result.error.code).toBe('VALIDATION');
    expect(fieldsOf(result)).toEqual(['kind', 'date', 'amount', 'category']);
    expect(store.getSnapshot()?.entries).toHaveLength(0);
  });

  it.each(['0', '-500', '12.5', '10000000', '1,28o', '１２８０'])(
    '金額「%s」は登録しない（BR1.2）',
    (amount) => {
      const { ledger } = setup();

      const result = ledger.validate({ ...validInput, amount });

      expect(fieldsOf(result)).toEqual(['amount']);
    },
  );

  it('金額は前後の空白を除き、1 と 9,999,999 ちょうどは登録できる（BR1.2）', () => {
    const { ledger } = setup();

    expect(ledger.validate({ ...validInput, amount: ' 1 ' })).toMatchObject({
      ok: true,
      value: { amount: 1 },
    });
    expect(ledger.validate({ ...validInput, amount: '9999999' })).toMatchObject({
      ok: true,
      value: { amount: 9_999_999 },
    });
  });

  it('区分に合わないカテゴリと存在しないカテゴリは登録しない（BR1.3）', () => {
    const { ledger } = setup();

    expect(fieldsOf(ledger.validate({ ...validInput, kind: '収入', category: '食費' }))).toEqual([
      'category',
    ]);
    expect(fieldsOf(ledger.validate({ ...validInput, category: 'ペット' }))).toEqual(['category']);
  });

  it('メモは前後の空白を除いて保存し、100 文字を超えるメモは登録しない（BR1.4）', () => {
    const { ledger } = setup();

    expect(ledger.validate({ ...validInput, memo: '  観劇  ' })).toMatchObject({
      ok: true,
      value: { memo: '観劇' },
    });
    expect(ledger.validate({ ...validInput, memo: 'あ'.repeat(100) }).ok).toBe(true);
    expect(fieldsOf(ledger.validate({ ...validInput, memo: 'あ'.repeat(101) }))).toEqual(['memo']);
  });

  it('ID は重ならず、追加した順の番号は既存の最大値 + 1 にする（BR1.6）', () => {
    const storage = new FakeStorage();
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(makeSnapshot([makeEntry({ entryId: 'id-1', addedOrder: 41 })], 7)),
    );
    const { ledger } = setup(storage);

    const result = ledger.add(validInput);

    expect(result.ok && result.value.entryId).toBe('id-2');
    expect(result.ok && result.value.addedOrder).toBe(42);
  });

  it('月ごとの一覧は日付の新しい順、同じ日付は後から追加したものが先（C3）', () => {
    const { ledger } = setup();
    ledger.add({ ...validInput, date: '2026-10-05', memo: 'a' });
    ledger.add({ ...validInput, date: '2026-10-14', memo: 'b' });
    ledger.add({ ...validInput, date: '2026-10-05', memo: 'c' });
    ledger.add({ ...validInput, date: '2026-09-30', memo: 'd' });

    expect(ledger.listByMonth('2026-10').map((entry) => entry.memo)).toEqual(['b', 'c', 'a']);
    expect(ledger.listAll().map((entry) => entry.memo)).toEqual(['d', 'a', 'c', 'b']);
  });

  it('保存に失敗したら保存の結果（STORAGE_WRITE）をそのまま返す（AC7.3.1）', () => {
    const { ledger, store } = setup(new QuotaExceededStorage());

    const result = ledger.add(validInput);

    expect(!result.ok && result.error.code).toBe('STORAGE_WRITE');
    expect(store.getSnapshot()?.entries).toHaveLength(0);
  });

  it('保存データが読めないときは STORE_UNREADABLE を返し、一覧は空にする', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, '{broken');
    const { ledger } = setup(storage);

    const result = ledger.add(validInput);

    expect(!result.ok && result.error.code).toBe('STORE_UNREADABLE');
    expect(ledger.listAll()).toEqual([]);
  });
});
