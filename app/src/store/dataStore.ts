import { fail, ok, type Result } from '../domain/result';
import {
  SCHEMA_VERSION,
  type LoadOutcome,
  type SnapshotChange,
  type StoreEvent,
  type StoreSnapshot,
} from '../domain/types';

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

export interface DataStoreOptions {
  /** 保存領域を返す。localStorage の取り出し自体が例外になる環境があるため、関数で受け取る。 */
  readonly getStorage: () => StorageLike;
  /** 保存した時刻を決める。テストで固定する。 */
  readonly now?: () => Date;
}

export type DataStoreStatus = 'unloaded' | 'empty' | 'ready' | 'unreadable';

export type StoreListener = (event: StoreEvent) => void;

export interface DataStore {
  /** 起動時に1回呼ぶ。保存データには書き込まない。 */
  load(): Result<LoadOutcome>;
  /** 今読み込んでいる内容（読み取り専用）。読み込み前と unreadable のときは null。 */
  getSnapshot(): StoreSnapshot | null;
  getStatus(): DataStoreStatus;
  /** 保存の唯一の入口（security-design.md の手順 1〜6）。 */
  commit(change: SnapshotChange): Result<StoreSnapshot>;
  /** 知らせ（committed・externalChange・unreadable）を受け取る。戻り値で受け取りをやめる。 */
  subscribe(listener: StoreListener): () => void;
}

/** 保存領域から読んだ文字の解釈の結果。 */
type StoredRead =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'accessFailed'; readonly error: unknown }
  | { readonly kind: 'corrupt'; readonly reason: string }
  | { readonly kind: 'snapshot'; readonly snapshot: StoreSnapshot };

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
 * 保存されている文字を、信用しないものとして解釈する（NFR4.3）。
 * U1 の「読めない」の判定は最小限: JSON として読めない、または schemaVersion が 1 でない。
 * 項目の欠けや型の誤りの検出は U5 で足す。
 */
function parseStored(raw: string): StoredRead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', reason: '保存データが JSON として読めません' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { kind: 'corrupt', reason: '保存データの形が違います' };
  }
  const version = (parsed as { schemaVersion?: unknown }).schemaVersion;
  if (version !== SCHEMA_VERSION) {
    return { kind: 'corrupt', reason: `保存データの版（${String(version)}）を読めません` };
  }
  return { kind: 'snapshot', snapshot: parsed as StoreSnapshot };
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

export function createDataStore(options: DataStoreOptions): DataStore {
  const now = options.now ?? (() => new Date());
  const listeners = new Set<StoreListener>();
  let status: DataStoreStatus = 'unloaded';
  let current: StoreSnapshot | null = null;

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
    status = 'unreadable';
    current = null;
    emit({ type: 'unreadable', reason });
  }

  function load(): Result<LoadOutcome> {
    const stored = readStored();
    switch (stored.kind) {
      case 'accessFailed':
        // 保存領域へのアクセス自体の失敗は「保存データなし」と同じに扱う（NFR 設計 R-06）。
        // 保存するときに STORAGE_WRITE として利用者に伝わる。
        console.warn('[budget-app] 保存領域にアクセスできませんでした', errorName(stored.error));
        status = 'empty';
        current = createEmptySnapshot(now());
        return ok({ status: 'empty' });
      case 'nothing':
        status = 'empty';
        current = createEmptySnapshot(now());
        return ok({ status: 'empty' });
      case 'corrupt':
        // 保存データには触れない（BR4.2、NFR5.3）。
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
      status = 'empty';
      current = createEmptySnapshot(now());
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

    // 手順 3: 保存領域の通し番号を読み直す。
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

  return {
    load,
    commit,
    getSnapshot: () => current,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
