import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataStore, STORAGE_KEY, type StorageLike } from '../../../src/store/dataStore';
import type { StoreEvent } from '../../../src/domain/types';
import { AccessDeniedStorage, FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

const fixedNow = () => new Date('2026-10-16T01:00:00.000Z');

function storeOn(storage: StorageLike) {
  const store = createDataStore({ getStorage: () => storage, now: fixedNow });
  const events: StoreEvent[] = [];
  store.subscribe((event) => events.push(event));
  return { store, events };
}

describe('DataStore', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('保存データがなければ empty になり、通し番号 0 の空の保存データを書かずに持つ（BR4.2）', () => {
    const storage = new FakeStorage();
    const { store } = storeOn(storage);

    const result = store.load();

    expect(result).toEqual({ ok: true, value: { status: 'empty' } });
    expect(store.getStatus()).toBe('empty');
    expect(store.getSnapshot()).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      entries: [],
      budgets: [],
    });
    expect(storage.setItemCalls).toBe(0);
  });

  it('保存データが読めれば ready になり、その内容を使う', () => {
    const storage = new FakeStorage();
    const snapshot = makeSnapshot([makeEntry()], 3);
    storage.items.set(STORAGE_KEY, JSON.stringify(snapshot));
    const { store } = storeOn(storage);

    const result = store.load();

    expect(result).toEqual({ ok: true, value: { status: 'ready', snapshot } });
    expect(store.getSnapshot()).toEqual(snapshot);
  });

  it('JSON として読めない保存データは unreadable にし、中身を変えない（NFR4.3、NFR5.3）', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, '{"schemaVersion":1,');
    const { store, events } = storeOn(storage);

    const result = store.load();

    expect(result.ok && result.value.status).toBe('unreadable');
    expect(store.getSnapshot()).toBeNull();
    expect(events).toEqual([{ type: 'unreadable', reason: '保存データが JSON として読めません' }]);
    expect(storage.items.get(STORAGE_KEY)).toBe('{"schemaVersion":1,');
    expect(storage.setItemCalls).toBe(0);
  });

  it('schemaVersion が 2 の保存データは unreadable にする', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify({ ...makeSnapshot([]), schemaVersion: 2 }));
    const { store } = storeOn(storage);

    const result = store.load();

    expect(result.ok && result.value.status).toBe('unreadable');
    expect(store.getStatus()).toBe('unreadable');
  });

  it('保存領域へのアクセス自体の失敗は empty と同じに扱い、保存は STORAGE_WRITE になる（R-06）', () => {
    const { store } = storeOn(new AccessDeniedStorage());

    expect(store.load()).toEqual({ ok: true, value: { status: 'empty' } });
    const result = store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('STORAGE_WRITE');
    expect(store.getSnapshot()?.entries).toEqual([]);
  });

  it('commit が成功すると通し番号 1 の全体を1回で書き、committed を知らせる（BR4.1、BR4.5）', () => {
    const storage = new FakeStorage();
    const { store, events } = storeOn(storage);
    store.load();
    const entry = makeEntry();

    const result = store.commit({ expectedRevision: 0, entriesToAdd: [entry] });

    expect(result.ok).toBe(true);
    const saved = JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null');
    expect(saved).toEqual({
      schemaVersion: 1,
      revision: 1,
      savedAt: '2026-10-16T01:00:00.000Z',
      entries: [entry],
      budgets: [],
    });
    expect(storage.setItemCalls).toBe(1);
    expect(store.getSnapshot()).toEqual(saved);
    expect(events).toEqual([{ type: 'committed', snapshot: saved }]);
  });

  it('別のタブが先に保存していたら STALE_REVISION を返し、最新を読み込んで externalChange を知らせる（BR4.4）', () => {
    const storage = new FakeStorage();
    const { store, events } = storeOn(storage);
    store.load();
    const otherTabSnapshot = makeSnapshot([makeEntry({ memo: '別のタブの明細' })], 1);
    storage.items.set(STORAGE_KEY, JSON.stringify(otherTabSnapshot));

    const result = store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] });

    expect(!result.ok && result.error.code).toBe('STALE_REVISION');
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null')).toEqual(otherTabSnapshot);
    expect(store.getSnapshot()).toEqual(otherTabSnapshot);
    expect(events).toEqual([{ type: 'externalChange', snapshot: otherTabSnapshot }]);
    expect(storage.setItemCalls).toBe(0);
  });

  it('書き込みが容量不足で失敗したら STORAGE_WRITE を返し、手元も保存領域も変えない（NFR5.2）', () => {
    const storage = new QuotaExceededStorage();
    const before = makeSnapshot([makeEntry()], 4);
    storage.items.set(STORAGE_KEY, JSON.stringify(before));
    const { store, events } = storeOn(storage);
    store.load();

    const result = store.commit({ expectedRevision: 4, entriesToAdd: [makeEntry()] });

    expect(!result.ok && result.error.code).toBe('STORAGE_WRITE');
    expect(store.getSnapshot()).toEqual(before);
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? 'null')).toEqual(before);
    expect(events).toEqual([]);
  });

  it('unreadable のときの commit は何もせず STORE_UNREADABLE を返す（BR4.2）', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, 'not json');
    const { store } = storeOn(storage);
    store.load();

    const result = store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] });

    expect(!result.ok && result.error.code).toBe('STORE_UNREADABLE');
    expect(storage.items.get(STORAGE_KEY)).toBe('not json');
    expect(storage.setItemCalls).toBe(0);
  });

  it('保存の直前に保存データが壊れていたら書かずに STORE_UNREADABLE を返し、unreadable を知らせる', () => {
    const storage = new FakeStorage();
    const { store, events } = storeOn(storage);
    store.load();
    storage.items.set(STORAGE_KEY, '{broken');

    const result = store.commit({ expectedRevision: 0, entriesToAdd: [makeEntry()] });

    expect(!result.ok && result.error.code).toBe('STORE_UNREADABLE');
    expect(store.getStatus()).toBe('unreadable');
    expect(events.map((event) => event.type)).toEqual(['unreadable']);
    expect(storage.items.get(STORAGE_KEY)).toBe('{broken');
  });

  it('読み込み前の commit はプログラムの誤りとして例外にする', () => {
    const { store } = storeOn(new FakeStorage());

    expect(() => store.commit({ expectedRevision: 0 })).toThrow('load()');
  });
});
