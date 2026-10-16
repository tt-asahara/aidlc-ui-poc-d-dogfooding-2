import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreEvent } from '../../../src/domain/types';
import {
  createDataStore,
  STORAGE_KEY,
  type DataStore,
  type StorageLike,
} from '../../../src/store/dataStore';
import { AccessDeniedStorage, FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// DataStore の U5 の追加（BR1.1、BR2.1、BR3.1、W3、W5、dispose）。値はすべて架空。

const fixedNow = () => new Date('2026-10-16T01:00:00.000Z');

/** 読み取りだけが失敗し、書き込みは成功する偽の保存領域（機能設計レビュー R-07）。 */
class ReadDeniedStorage extends FakeStorage {
  override getItem(): string | null {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  }
}

/** 別のタブの保存の知らせ。storageArea に偽の保存領域を入れるため、Event に項目を足して作る。 */
function storageEvent(init: {
  key: string | null;
  newValue: string | null;
  storageArea: unknown;
}): Event {
  return Object.assign(new Event('storage'), init);
}

const stores: DataStore[] = [];

function storeOn(storage: StorageLike, getStorage: () => StorageLike = () => storage) {
  const store = createDataStore({ getStorage, now: fixedNow });
  stores.push(store);
  const events: StoreEvent[] = [];
  store.subscribe((event) => events.push(event));
  return { store, events };
}

describe('DataStore（U5）', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const store of stores.splice(0)) {
      store.dispose();
    }
  });

  it('JSON として読めても形の壊れた保存データは unreadable にし、保存領域を変えない（BR1.1、BR1.2）', () => {
    const storage = new FakeStorage();
    const broken = JSON.stringify(
      makeSnapshot([makeEntry({ amount: '1280' as unknown as number })]),
    );
    storage.items.set(STORAGE_KEY, broken);
    const { store, events } = storeOn(storage);

    const result = store.load();
    const committed = store.commit({ expectedRevision: 1, entriesToAdd: [makeEntry()] });

    expect(result).toEqual({
      ok: true,
      value: { status: 'unreadable', reason: '明細の 1 件目の amount が正しくありません' },
    });
    expect(events).toEqual([
      { type: 'unreadable', reason: '明細の 1 件目の amount が正しくありません' },
    ]);
    expect(!committed.ok && committed.error.code).toBe('STORE_UNREADABLE');
    expect(storage.items.get(STORAGE_KEY)).toBe(broken);
    expect(storage.setItemCalls).toBe(0);
    expect(store.getAvailability()).toBe('available');
  });

  it('保存領域へのアクセスの失敗は unavailable として記録し、commit は STORAGE_WRITE になる（BR3.1）', () => {
    const { store, events } = storeOn(new AccessDeniedStorage());
    expect(store.getAvailability()).toBe('available');

    expect(store.load()).toEqual({ ok: true, value: { status: 'empty' } });
    const result = store.commit({
      expectedRevision: 0,
      initialize: makeSnapshot([makeEntry()], 0),
    });

    expect(store.getAvailability()).toBe('unavailable');
    expect(store.getStatus()).toBe('empty');
    expect(!result.ok && result.error.code).toBe('STORAGE_WRITE');
    expect(store.getSnapshot()?.entries).toEqual([]);
    expect(events).toEqual([]);

    // 保存領域の取り出し自体（window.localStorage の参照）が例外になる環境も同じに扱う。
    const throwing = storeOn(new FakeStorage(), () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    expect(throwing.store.load()).toEqual({ ok: true, value: { status: 'empty' } });
    expect(throwing.store.getAvailability()).toBe('unavailable');
  });

  it('読み取りだけが失敗し書き込みは成功する環境では、commit は照合なしで書き込みに成功する（R-07 の記録）', () => {
    const storage = new ReadDeniedStorage();
    const { store, events } = storeOn(storage);
    store.load();

    const entry = makeEntry();
    const result = store.commit({ expectedRevision: 0, entriesToAdd: [entry] });

    // 記録: 起動時の読み取りが失敗したため可用性は unavailable のまま（起動時に決めて変えない）。
    // 保存直前の読み直しも失敗するため、通し番号の照合は行わずに手順 5 へ進み、書き込みは成功する。
    expect(store.getAvailability()).toBe('unavailable');
    expect(result.ok).toBe(true);
    expect(storage.setItemCalls).toBe(1);
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null')).toMatchObject({
      revision: 1,
      entries: [entry],
    });
    expect(store.getStatus()).toBe('ready');
    expect(events.map((event) => event.type)).toEqual(['committed']);
  });

  it('別のタブの読める保存データの知らせで手元の写しを入れ替え、externalChange を出す（BR2.1）', () => {
    const storage = new FakeStorage();
    const { store, events } = storeOn(storage);
    store.load();
    const otherTab = makeSnapshot([makeEntry({ memo: '別のタブの明細' })], 1);

    window.dispatchEvent(
      storageEvent({ key: STORAGE_KEY, newValue: JSON.stringify(otherTab), storageArea: storage }),
    );

    expect(store.getStatus()).toBe('ready');
    expect(store.getSnapshot()).toEqual(otherTab);
    expect(events).toEqual([{ type: 'externalChange', snapshot: otherTab }]);
    expect(storage.setItemCalls).toBe(0);
  });

  it('別のタブの読めない値の知らせで unreadable になり、unreadable を出す（W5）', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot([makeEntry()], 2)));
    const { store, events } = storeOn(storage);
    store.load();

    window.dispatchEvent(
      storageEvent({ key: STORAGE_KEY, newValue: '{"schemaVersion":1}', storageArea: storage }),
    );

    expect(store.getStatus()).toBe('unreadable');
    expect(store.getSnapshot()).toBeNull();
    expect(events).toEqual([
      { type: 'unreadable', reason: '保存データの revision が正しくありません' },
    ]);
    expect(warn).toHaveBeenCalledWith(
      '[budget-app] 保存データを読み込めませんでした',
      '保存データの revision が正しくありません',
    );
  });

  it('キーの削除と localStorage 全体の消去（key が null）では、空の写し（通し番号 0）にして externalChange を出す', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot([makeEntry()], 5)));
    const { store, events } = storeOn(storage);
    store.load();

    // 別のタブがキーを消した。
    storage.items.delete(STORAGE_KEY);
    window.dispatchEvent(storageEvent({ key: STORAGE_KEY, newValue: null, storageArea: storage }));
    expect(store.getStatus()).toBe('empty');
    expect(store.getSnapshot()).toMatchObject({ revision: 0, entries: [], budgets: [] });

    // 空の写しから保存でき（通し番号 0 で照合が合う）、そのあと別のタブが localStorage 全体を消した。
    expect(store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] }).ok).toBe(true);
    storage.items.clear();
    window.dispatchEvent(storageEvent({ key: null, newValue: null, storageArea: storage }));

    expect(store.getStatus()).toBe('empty');
    expect(store.getSnapshot()).toMatchObject({ revision: 0, entries: [] });
    expect(events.map((event) => event.type)).toEqual([
      'externalChange',
      'committed',
      'externalChange',
    ]);
  });

  it('unreadable の間は、読める値の知らせが来ても無視して unreadable のまま（W3 手順 2）', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, 'not json');
    const { store, events } = storeOn(storage);
    store.load();

    window.dispatchEvent(
      storageEvent({
        key: STORAGE_KEY,
        newValue: JSON.stringify(makeSnapshot([makeEntry()], 3)),
        storageArea: storage,
      }),
    );
    window.dispatchEvent(storageEvent({ key: null, newValue: null, storageArea: storage }));

    expect(store.getStatus()).toBe('unreadable');
    expect(store.getSnapshot()).toBeNull();
    expect(events.map((event) => event.type)).toEqual(['unreadable']);
    expect(storage.items.get(STORAGE_KEY)).toBe('not json');
  });

  it('ほかのキー・ほかの保存領域（sessionStorage）の知らせは無視し、受け取りの中の例外は状態を変えずに記録する', () => {
    const storage = new FakeStorage();
    let failLookup = false;
    const { store, events } = storeOn(storage, () => {
      if (failLookup) {
        throw new Error('予想外の失敗（テスト）');
      }
      return storage;
    });
    store.load();
    const valid = JSON.stringify(makeSnapshot([makeEntry()], 1));

    window.dispatchEvent(storageEvent({ key: 'other-app', newValue: valid, storageArea: storage }));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: valid,
        storageArea: window.sessionStorage,
      }),
    );
    window.dispatchEvent(storageEvent({ key: STORAGE_KEY, newValue: valid, storageArea: null }));
    failLookup = true;
    window.dispatchEvent(storageEvent({ key: STORAGE_KEY, newValue: valid, storageArea: storage }));

    expect(store.getStatus()).toBe('empty');
    expect(store.getSnapshot()?.revision).toBe(0);
    expect(events).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[budget-app] 別のタブの変更を扱えませんでした', 'Error');
  });

  it('受け取りは load で1回だけ始め、dispose のあとは知らせも画面の受け取り手も外れる', () => {
    const storage = new FakeStorage();
    const eventSource = new EventTarget();
    const addListener = vi.spyOn(eventSource, 'addEventListener');
    const store = createDataStore({ getStorage: () => storage, now: fixedNow, eventSource });
    const events: StoreEvent[] = [];
    store.subscribe((event) => events.push(event));
    store.load();
    store.load();
    const valid = JSON.stringify(makeSnapshot([makeEntry()], 1));

    expect(addListener).toHaveBeenCalledTimes(1);
    store.dispose();
    eventSource.dispatchEvent(
      storageEvent({ key: STORAGE_KEY, newValue: valid, storageArea: storage }),
    );
    store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] });

    expect(events).toEqual([]);
    expect(store.getSnapshot()?.revision).toBe(1);

    // dispose のあとにもう一度 load すると、受け取りを付け直す（付いていないときだけ付ける）。
    store.load();
    expect(addListener).toHaveBeenCalledTimes(2);
    store.dispose();
  });
});
