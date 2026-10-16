import { isCategoryOfKind, isEntryKind } from './categoryCatalog';
import { fail, ok, type FieldError, type Result } from './result';
import { isRealDate, isWithinGraphemes } from './textRules';
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

/** 欄の下に出す理由の文（U2 BR1.1〜BR1.4、frontend-components.md の表）。 */
export const ENTRY_FIELD_MESSAGES = {
  kindMissing: '区分を選んでください',
  dateMissing: '日付を入力してください',
  dateNotReal: '存在する日付を入力してください。例: 2026-10-14',
  amountInvalid: '金額は 1〜9,999,999 の整数で入力してください。例: 1280',
  categoryMissing: 'カテゴリを選んでください',
  categoryMismatch: 'カテゴリを選び直してください',
  memoTooLong: 'メモは 100 文字までです',
  memoLineBreak: 'メモに改行は使えません',
} as const;

const DIGITS_ONLY = /^[0-9]+$/;
const LINE_BREAK = /[\r\n]/;

/** Ledger が使う DataStore の部分（読み取りと保存の入口だけ）。 */
export type LedgerStore = Pick<DataStore, 'getSnapshot' | 'commit'>;

export interface LedgerOptions {
  readonly store: LedgerStore;
  /** 新しい ID を作る。テストで固定する。 */
  readonly newId?: () => string;
}

export interface Ledger {
  /** 保存しない規則の判定（U2 で仕上げた BR1.1〜BR1.4）。 */
  validate(input: EntryInput): Result<ValidatedEntry>;
  /** 1件の登録。ID と追加した順の番号を付けて DataStore.commit を1回呼ぶ。 */
  add(input: EntryInput): Result<Entry>;
  /**
   * 複数件の採番（U5 BR4.5）。入力の順に、既存の最大の addedOrder の続きから番号を振り、
   * ID は既存とも入力どうしとも重ならないものを付ける。保存はしない。
   */
  assignIdentities(validated: readonly ValidatedEntry[], existing: readonly Entry[]): Entry[];
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

/**
 * 金額（BR1.1）。前後の空白を除いたあと、半角数字だけからなる 1〜9,999,999 の整数。
 * 空のときも同じ文にそろえる（U1 の「金額を入力してください」から変えた。AC1.2.1）。
 */
function validateAmount(raw: string | number): { amount?: number; error?: string } {
  const text = toText(raw).trim();
  if (!DIGITS_ONLY.test(text)) {
    return { error: ENTRY_FIELD_MESSAGES.amountInvalid };
  }
  const amount = Number(text);
  if (amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return { error: ENTRY_FIELD_MESSAGES.amountInvalid };
  }
  return { amount };
}

/** 日付（BR1.2）。空でなく、YYYY-MM-DD の形で実在する日付。範囲の制限はない。 */
function validateDate(raw: string): { date: string; error?: string } {
  const date = toText(raw).trim();
  if (date === '') {
    return { date, error: ENTRY_FIELD_MESSAGES.dateMissing };
  }
  if (!isRealDate(date)) {
    return { date, error: ENTRY_FIELD_MESSAGES.dateNotReal };
  }
  return { date };
}

/**
 * メモ（BR1.4）。任意。前後の空白を除いたあと、見える1文字で 100 文字まで、改行なし。
 * 数え方は保存データの検査（validateSnapshot）と同じ textRules の関数を使う（NFR5.1）。
 */
function validateMemo(raw: string): { memo: string; error?: string } {
  const memo = toText(raw).trim();
  if (LINE_BREAK.test(memo)) {
    return { memo, error: ENTRY_FIELD_MESSAGES.memoLineBreak };
  }
  if (!isWithinGraphemes(memo, MEMO_MAX_LENGTH)) {
    return { memo, error: ENTRY_FIELD_MESSAGES.memoTooLong };
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

  /**
   * 入力の規則の1か所（U2 BR1.1〜BR1.4、NFR4.2）。画面と CSV の取り込みの両方が使う。
   * fieldErrors は区分・日付・金額・カテゴリ・メモの順に並べる（BR1.5 のまとめと最初の誤りの欄に使う）。
   */
  function validate(input: EntryInput): Result<ValidatedEntry> {
    const errors: FieldError[] = [];
    const kindText = toText(input.kind).trim();
    const kind: EntryKind | null = isEntryKind(kindText) ? kindText : null;
    if (!kind) {
      errors.push({ field: 'kind', message: ENTRY_FIELD_MESSAGES.kindMissing });
    }

    const dateCheck = validateDate(input.date);
    if (dateCheck.error) {
      errors.push({ field: 'date', message: dateCheck.error });
    }

    const amountCheck = validateAmount(input.amount);
    if (amountCheck.error) {
      errors.push({ field: 'amount', message: amountCheck.error });
    }

    const category = toText(input.category).trim();
    if (category === '') {
      errors.push({ field: 'category', message: ENTRY_FIELD_MESSAGES.categoryMissing });
    } else if (kind && !isCategoryOfKind(category, kind)) {
      errors.push({ field: 'category', message: ENTRY_FIELD_MESSAGES.categoryMismatch });
    }

    const memoCheck = validateMemo(input.memo);
    if (memoCheck.error) {
      errors.push({ field: 'memo', message: memoCheck.error });
    }

    if (errors.length > 0 || !kind || amountCheck.amount === undefined) {
      return fail('VALIDATION', '入力を確かめてください', errors);
    }
    return ok({
      date: dateCheck.date,
      kind,
      category,
      amount: amountCheck.amount,
      memo: memoCheck.memo,
    });
  }

  function assignIdentities(
    validated: readonly ValidatedEntry[],
    existing: readonly Entry[],
  ): Entry[] {
    const usedIds = new Set(existing.map((entry) => entry.entryId));
    let addedOrder = existing.reduce((max, entry) => Math.max(max, entry.addedOrder), 0);
    return validated.map((value) => {
      let entryId = newId();
      while (usedIds.has(entryId)) {
        entryId = newId();
      }
      usedIds.add(entryId);
      addedOrder += 1;
      return { ...value, entryId, addedOrder };
    });
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
    const [entry] = assignIdentities([validated.value], snapshot.entries) as [Entry];
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

  return { validate, add, assignIdentities, listByMonth, listAll };
}
