import { isCategoryOfKind, isEntryKind } from './categoryCatalog';
import { fail, ok, type FieldError, type Result } from './result';
import type { Entry, EntryInput, EntryKind, StoreSnapshot, ValidatedEntry } from './types';
import type { DataStore } from '../store/dataStore';

export const AMOUNT_MIN = 1;
export const AMOUNT_MAX = 9_999_999;
export const MEMO_MAX_LENGTH = 100;

/** 欄の名前（誤りのまとめ表示に使う）。並びは登録フォームの並び。 */
export const ENTRY_FIELD_LABELS = {
  kind: '区分',
  date: '日付',
  amount: '金額',
  category: 'カテゴリ',
  memo: 'メモ',
} as const;

export type EntryField = keyof typeof ENTRY_FIELD_LABELS;

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const DIGITS_ONLY = /^[0-9]+$/;

/** Ledger が使う DataStore の部分（読み取りと保存の入口だけ）。 */
export type LedgerStore = Pick<DataStore, 'getSnapshot' | 'commit'>;

export interface LedgerOptions {
  readonly store: LedgerStore;
  /** 新しい ID を作る。テストで固定する。 */
  readonly newId?: () => string;
}

export interface Ledger {
  /** 保存しない規則の判定（U1 の最小限: BR1.1〜BR1.4）。 */
  validate(input: EntryInput): Result<ValidatedEntry>;
  /** 1件の登録。ID と追加した順の番号を付けて DataStore.commit を1回呼ぶ。 */
  add(input: EntryInput): Result<Entry>;
  /** その月の明細。日付の新しい順、同じ日付は addedOrder の大きい順。 */
  listByMonth(month: string): Entry[];
  /** すべての明細。日付の古い順、同じ日付は addedOrder の小さい順（CSV 出力用）。 */
  listAll(): Entry[];
}

let fallbackIdSequence = 0;

function defaultNewId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  fallbackIdSequence += 1;
  return `e-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`;
}

function toText(value: unknown): string {
  return typeof value === 'string'
    ? value
    : value === undefined || value === null
      ? ''
      : String(value);
}

function validateAmount(raw: string | number): { amount?: number; error?: string } {
  const text = toText(raw).trim();
  if (text === '') {
    return { error: '金額を入力してください' };
  }
  if (!DIGITS_ONLY.test(text)) {
    return { error: '金額は 1〜9,999,999 の整数で入力してください。例: 1280' };
  }
  const amount = Number(text);
  if (amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return { error: '金額は 1〜9,999,999 の整数で入力してください。例: 1280' };
  }
  return { amount };
}

function validateMemo(raw: string): { memo: string; error?: string } {
  const memo = toText(raw).trim();
  if (/[\r\n]/.test(memo)) {
    return { memo, error: 'メモに改行は使えません' };
  }
  if (memo.length > MEMO_MAX_LENGTH) {
    return { memo, error: 'メモは 100 文字までです' };
  }
  return { memo };
}

function compareDescending(a: Entry, b: Entry): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  return b.addedOrder - a.addedOrder;
}

function compareAscending(a: Entry, b: Entry): number {
  return -compareDescending(a, b);
}

function entriesOf(snapshot: StoreSnapshot | null): readonly Entry[] {
  return snapshot ? snapshot.entries : [];
}

export function createLedger(options: LedgerOptions): Ledger {
  const newId = options.newId ?? defaultNewId;

  function validate(input: EntryInput): Result<ValidatedEntry> {
    const errors: FieldError[] = [];
    const kindText = toText(input.kind).trim();
    const kind: EntryKind | null = isEntryKind(kindText) ? kindText : null;
    if (!kind) {
      errors.push({ field: 'kind', message: '区分を選んでください' });
    }

    const date = toText(input.date).trim();
    if (date === '') {
      errors.push({ field: 'date', message: '日付を入力してください' });
    } else if (!DATE_FORMAT.test(date)) {
      errors.push({ field: 'date', message: '日付は YYYY-MM-DD の形で入力してください' });
    }

    const amountCheck = validateAmount(input.amount);
    if (amountCheck.error) {
      errors.push({ field: 'amount', message: amountCheck.error });
    }

    const category = toText(input.category).trim();
    if (category === '') {
      errors.push({ field: 'category', message: 'カテゴリを選んでください' });
    } else if (kind && !isCategoryOfKind(category, kind)) {
      errors.push({ field: 'category', message: '区分に合うカテゴリを選んでください' });
    }

    const memoCheck = validateMemo(input.memo);
    if (memoCheck.error) {
      errors.push({ field: 'memo', message: memoCheck.error });
    }

    if (errors.length > 0 || !kind || amountCheck.amount === undefined) {
      return fail('VALIDATION', '入力を確かめてください', errors);
    }
    return ok({ date, kind, category, amount: amountCheck.amount, memo: memoCheck.memo });
  }

  function createUniqueId(existing: readonly Entry[]): string {
    const usedIds = new Set(existing.map((entry) => entry.entryId));
    let id = newId();
    while (usedIds.has(id)) {
      id = newId();
    }
    return id;
  }

  function add(input: EntryInput): Result<Entry> {
    const validated = validate(input);
    if (!validated.ok) {
      return validated;
    }
    const snapshot = options.store.getSnapshot();
    if (!snapshot) {
      return fail('STORE_UNREADABLE', '保存データを読み込めませんでした。データは消していません');
    }
    const maxAddedOrder = snapshot.entries.reduce(
      (max, entry) => Math.max(max, entry.addedOrder),
      0,
    );
    const entry: Entry = {
      ...validated.value,
      entryId: createUniqueId(snapshot.entries),
      addedOrder: maxAddedOrder + 1,
    };
    const committed = options.store.commit({
      expectedRevision: snapshot.revision,
      entriesToAdd: [entry],
    });
    return committed.ok ? ok(entry) : committed;
  }

  function listByMonth(month: string): Entry[] {
    const prefix = `${month}-`;
    return entriesOf(options.store.getSnapshot())
      .filter((entry) => entry.date.startsWith(prefix))
      .sort(compareDescending);
  }

  function listAll(): Entry[] {
    return [...entriesOf(options.store.getSnapshot())].sort(compareAscending);
  }

  return { validate, add, listByMonth, listAll };
}
