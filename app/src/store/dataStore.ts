import { fail, ok, type Result } from '../domain/result';
import {
  SCHEMA_VERSION,
  type LoadOutcome,
  type SnapshotChange,
  type StorageAvailability,
  type StoreEvent,
  type StoreSnapshot,
} from '../domain/types';
import { validateSnapshot } from '../domain/validateSnapshot';

/**
 * 保存領域（localStorage）のキー。DataStore の内部の値で、約束ごとには含めない（契約レビュー R-09）。
 * ほかのキーには触れない。
 */
export const STORAGE_KEY = 'budget-manager-app:store';

/** DataStore が使う保存領域の最小の形（localStorage と同じ）。 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** タブ間の知らせ（storage イベント）を受け取る相手。普段は window。 */
export type StorageEventSource = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export interface DataStoreOptions {
  /** 保存領域を返す。localStorage の取り出し自体が例外になる環境があるため、関数で受け取る。 */
  readonly getStorage: () => StorageLike;
  /** 保存した時刻を決める。テストで固定する。 */
  readonly now?: () => Date;
  /** storage イベントを受け取る相手（U5 W3）。省略すると window（ない環境では受け取らない）。 */
  readonly eventSource?: StorageEventSource;
}

export type DataStoreStatus = 'unloaded' | 'empty' | 'ready' | 'unreadable';

export type StoreListener = (event: StoreEvent) => void;

export interface DataStore {
  /**
   * 起動時に1回呼ぶ。保存データには書き込まない。
   * 受け取り手が付いていなければ、ここでタブ間の知らせ（storage イベント）の受け取りを始める（U5 W1）。
   */
  load(): Result<LoadOutcome>;
  /** 今読み込んでいる内容（読み取り専用）。読み込み前と unreadable のときは null。 */
  getSnapshot(): StoreSnapshot | null;
  getStatus(): DataStoreStatus;
  /** 起動時に保存領域へアクセスできたか（U5 BR3.1）。load の前は available。 */
  getAvailability(): StorageAvailability;
  /** 保存の唯一の入口（security-design.md の手順 1〜6）。 */
  commit(change: SnapshotChange): Result<StoreSnapshot>;
  /** 知らせ（committed・externalChange・unreadable）を受け取る。戻り値で受け取りをやめる。 */
  subscribe(listener: StoreListener): () => void;
  /** タブ間の知らせの受け取りをやめ、画面の受け取り手もすべて外す（テストと画面の片付け用）。 */
  dispose(): void;
}

/** 保存されている文字の解釈の結果。 */
type ParsedStored =
  | { readonly kind: 'corrupt'; readonly reason: string }
  | { readonly kind: 'snapshot'; readonly snapshot: StoreSnapshot };

/** 保存領域から読んだ結果。 */
type StoredRead =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'accessFailed'; readonly error: unknown }
  | ParsedStored;

const UNREADABLE_MESSAGE = '保存データを読み込めませんでした。データは消していません';

function createEmptySnapshot(now: Date): StoreSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    savedAt: now.toISOString(),
    entries: [],
    budgets: [],
  };
}

/**
 * 保存されている文字を、信用しないものとして解釈する（NFR4.3、U5 BR1.1）。
 * JSON として読めたあと、約束ごと C2 の形とすべて照らす（validateSnapshot）。
 */
function parseStored(raw: string): ParsedStored {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', reason: '保存データが JSON として読めません' };
  }
  const checked = validateSnapshot(parsed);
  return 'ok' in checked
    ? { kind: 'snapshot', snapshot: checked.ok }
    : { kind: 'corrupt', reason: checked.reason };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function applyChange(
  current: StoreSnapshot,
  change: SnapshotChange,
  savedAt: string,
): StoreSnapshot {
  const base = change.initialize ?? current;
  let budgets = base.budgets;
  if (change.budgetsToReplace) {
    const { month, budgets: replacement } = change.budgetsToReplace;
    budgets = [...budgets.filter((budget) => budget.month !== month), ...replacement];
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: change.expectedRevision + 1,
    savedAt,
    entries: [...base.entries, ...(change.entriesToAdd ?? [])],
    budgets,
  };
}

function defaultEventSource(): StorageEventSource | null {
  return typeof window === 'undefined' ? null : window;
}

export function createDataStore(options: DataStoreOptions): DataStore {
  const now = options.now ?? (() => new Date());
  const eventSource = options.eventSource ?? defaultEventSource();
  const listeners = new Set<StoreListener>();
  let status: DataStoreStatus = 'unloaded';
  let availability: StorageAvailability = 'available';
  let current: StoreSnapshot | null = null;
  let listening = false;

  function emit(event: StoreEvent): void {
    for (const listener of [...listeners]) {
      listener(event);
    }
  }

  function readStored(): StoredRead {
    let raw: string | null;
    try {
      raw = options.getStorage().getItem(STORAGE_KEY);
    } catch (error) {
      return { kind: 'accessFailed', error };
    }
    return raw === null ? { kind: 'nothing' } : parseStored(raw);
  }

  function becomeUnreadable(reason: string): void {
    // 理由の文は項目の名前と位置だけで、保存データの値を含まない（NFR4.2）。
    console.warn('[budget-app] 保存データを読み込めませんでした', reason);
    status = 'unreadable';
    current = null;
    emit({ type: 'unreadable', reason });
  }

  function becomeEmpty(): void {
    status = 'empty';
    current = createEmptySnapshot(now());
  }

  /** 知らせが、このアプリの保存領域とキーについてのものか（U5 W3 手順 2）。 */
  function concernsThisStore(event: StorageEvent): boolean {
    if (event.key !== null && event.key !== STORAGE_KEY) {
      return false;
    }
    return event.storageArea !== null && event.storageArea === options.getStorage();
  }

  /** 別のタブの変更を受け取る（U5 W3、BR2.1）。例外は状態を変えずに理由だけを記録する（R-02）。 */
  function handleStorageEvent(event: Event): void {
    try {
      const storageEvent = event as StorageEvent;
      if (status === 'unreadable' || status === 'unloaded' || !concernsThisStore(storageEvent)) {
        return;
      }
      if (storageEvent.key === null || storageEvent.newValue === null) {
        // キーが消された、または localStorage 全体が消された: 保存データなし（通し番号 0）。
        becomeEmpty();
        emit({ type: 'externalChange', snapshot: current as StoreSnapshot });
        return;
      }
      const parsed = parseStored(storageEvent.newValue);
      if (parsed.kind === 'corrupt') {
        becomeUnreadable(parsed.reason);
        return;
      }
      status = 'ready';
      current = parsed.snapshot;
      emit({ type: 'externalChange', snapshot: parsed.snapshot });
    } catch (error) {
      console.warn('[budget-app] 別のタブの変更を扱えませんでした', errorName(error));
    }
  }

  function startListening(): void {
    if (listening || !eventSource) {
      return;
    }
    eventSource.addEventListener('storage', handleStorageEvent);
    listening = true;
  }

  function load(): Result<LoadOutcome> {
    startListening();
    const stored = readStored();
    availability = stored.kind === 'accessFailed' ? 'unavailable' : 'available';
    switch (stored.kind) {
      case 'accessFailed':
        // 保存領域へのアクセス自体の失敗は「保存データなし」と同じに扱い、使えないことを記録する（BR3.1）。
        // 保存するときに STORAGE_WRITE として利用者に伝わる。
        console.warn('[budget-app] 保存領域にアクセスできませんでした', errorName(stored.error));
        becomeEmpty();
        return ok({ status: 'empty' });
      case 'nothing':
        becomeEmpty();
        return ok({ status: 'empty' });
      case 'corrupt':
        // 保存データには触れない（BR4.2、NFR5.3、U5 BR1.2）。
        becomeUnreadable(stored.reason);
        return ok({ status: 'unreadable', reason: stored.reason });
      case 'snapshot':
        status = 'ready';
        current = stored.snapshot;
        return ok({ status: 'ready', snapshot: stored.snapshot });
    }
  }

  function adoptLatest(stored: StoredRead): void {
    if (stored.kind === 'snapshot') {
      status = 'ready';
      current = stored.snapshot;
    } else {
      becomeEmpty();
    }
  }

  function commit(change: SnapshotChange): Result<StoreSnapshot> {
    // 手順 1: unreadable なら何もしない。
    if (status === 'unreadable') {
      return fail('STORE_UNREADABLE', UNREADABLE_MESSAGE);
    }
    if (status === 'unloaded' || current === null) {
      throw new Error('DataStore.load() を先に呼んでください');
    }
    if (change.initialize && status !== 'empty') {
      return fail('STALE_REVISION', 'すでに保存データがあるため、初期データは入れませんでした');
    }

    // 手順 2: 新しい保存データを手元で組み立てる（手元の写しはまだ変えない）。
    const next = applyChange(current, change, now().toISOString());

    // 手順 3: 保存領域の通し番号を読み直す（U5: validateSnapshot で検査する）。
    const stored = readStored();
    if (stored.kind === 'corrupt') {
      becomeUnreadable(stored.reason);
      return fail('STORE_UNREADABLE', UNREADABLE_MESSAGE);
    }
    if (stored.kind !== 'accessFailed') {
      // アクセス自体の失敗は「何もない」として手順 5 へ進む（照合はしない）。
      const storedRevision = stored.kind === 'snapshot' ? stored.snapshot.revision : 0;
      // 手順 4: 通し番号の照合（BR4.1、BR4.4）。
      if (storedRevision !== change.expectedRevision) {
        adoptLatest(stored);
        emit({ type: 'externalChange', snapshot: current as StoreSnapshot });
        return fail(
          'STALE_REVISION',
          '別のタブで変更があったため保存できませんでした。最新の内容を読み込みました',
        );
      }
    }

    // 手順 5: 保存データ全体を1回で書く（NFR5.1）。失敗したら手元の写しを変えない（NFR5.2）。
    try {
      options.getStorage().setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[budget-app] 保存領域に書き込めませんでした', errorName(error));
      return fail('STORAGE_WRITE', 'このブラウザに保存できませんでした');
    }

    // 手順 6: 手元の写しを新しくして知らせる（BR4.5）。
    status = 'ready';
    current = next;
    emit({ type: 'committed', snapshot: next });
    return ok(next);
  }

  function dispose(): void {
    if (listening && eventSource) {
      eventSource.removeEventListener('storage', handleStorageEvent);
    }
    listening = false;
    listeners.clear();
  }

  return {
    load,
    commit,
    dispose,
    getSnapshot: () => current,
    getStatus: () => status,
    getAvailability: () => availability,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
