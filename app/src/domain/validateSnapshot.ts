import { isCategoryOfKind, isEntryKind } from './categoryCatalog';
import { SCHEMA_VERSION, type StoreSnapshot } from './types';

/**
 * 保存データの検査（U5 BR1.1、NFR4.1）。保存領域から読んだ値を信用せず、約束ごと C2 の形とすべて照らす。
 *
 * - CategoryCatalog だけを使う純粋な関数。Ledger と DataStore には依存しない（機能設計レビュー R-04）。
 * - 理由の文は項目の名前と位置（何件目か）だけで、保存データの値を含めない（NFR4.2）。
 * - 明細と予算を1回ずつたどり、重なりは Set で確かめる（NFR1.3）。
 */
export type SnapshotValidation = { readonly ok: StoreSnapshot } | { readonly reason: string };

const AMOUNT_MIN = 1;
const AMOUNT_MAX = 9_999_999;
const BUDGET_MIN = 0;
const MEMO_MAX_GRAPHEMES = 100;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const LINE_BREAK = /[\r\n]/;

type Fields = Record<string, unknown>;

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntegerIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** YYYY-MM-DD の形で、暦の上に実在する日付か（2026-02-30 などは偽）。 */
function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * メモの文字数を、見える1文字（書記素）で数える。Intl.Segmenter は検査1回につき1つだけ作る。
 * memo.length（UTF-16 の数）が 100 以下なら、書記素の数も 100 以下なので Segmenter を使わない（NFR 設計レビュー R-01）。
 */
function createMemoLengthCheck(): (memo: string) => boolean {
  let segmenter: Intl.Segmenter | null = null;
  return (memo) => {
    if (memo.length <= MEMO_MAX_GRAPHEMES) {
      return true;
    }
    segmenter ??= new Intl.Segmenter('ja', { granularity: 'grapheme' });
    const segments = segmenter.segment(memo)[Symbol.iterator]();
    let count = 0;
    while (!segments.next().done) {
      count += 1;
      if (count > MEMO_MAX_GRAPHEMES) {
        return false;
      }
    }
    return true;
  };
}

function isValidMemo(value: unknown, withinLength: (memo: string) => boolean): boolean {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    !LINE_BREAK.test(value) &&
    withinLength(value)
  );
}

interface EntryCheckState {
  readonly entryIds: Set<string>;
  readonly addedOrders: Set<number>;
  readonly withinLength: (memo: string) => boolean;
}

/** 明細1件を確かめ、合わない項目の名前を返す（合えば null）。 */
function checkEntry(value: unknown, state: EntryCheckState): string | null {
  if (!isRecord(value)) {
    return '形';
  }
  const { entryId, date, kind, category, amount, memo, addedOrder } = value;
  if (typeof entryId !== 'string' || entryId === '') {
    return 'entryId';
  }
  if (state.entryIds.has(entryId)) {
    return 'entryId（重複）';
  }
  if (!isRealDate(date)) {
    return 'date';
  }
  if (typeof kind !== 'string' || !isEntryKind(kind)) {
    return 'kind';
  }
  if (typeof category !== 'string' || !isCategoryOfKind(category, kind)) {
    return 'category';
  }
  if (!isIntegerIn(amount, AMOUNT_MIN, AMOUNT_MAX)) {
    return 'amount';
  }
  if (!isValidMemo(memo, state.withinLength)) {
    return 'memo';
  }
  if (!isIntegerIn(addedOrder, 1, Number.MAX_SAFE_INTEGER)) {
    return 'addedOrder';
  }
  if (state.addedOrders.has(addedOrder)) {
    return 'addedOrder（重複）';
  }
  state.entryIds.add(entryId);
  state.addedOrders.add(addedOrder);
  return null;
}

/** 予算1件を確かめ、合わない項目の名前を返す（合えば null）。 */
function checkBudget(value: unknown, budgetKeys: Set<string>): string | null {
  if (!isRecord(value)) {
    return '形';
  }
  const { budgetKey, month, category, amount } = value;
  if (typeof month !== 'string' || !MONTH_PATTERN.test(month)) {
    return 'month';
  }
  if (typeof category !== 'string' || !isCategoryOfKind(category, '支出')) {
    return 'category';
  }
  if (!isIntegerIn(amount, BUDGET_MIN, AMOUNT_MAX)) {
    return 'amount';
  }
  if (budgetKey !== `${month}:${category}`) {
    return 'budgetKey';
  }
  if (budgetKeys.has(budgetKey)) {
    return 'budgetKey（重複）';
  }
  budgetKeys.add(budgetKey);
  return null;
}

function checkTopLevel(value: Fields): string | null {
  if (value.schemaVersion !== SCHEMA_VERSION) {
    return '保存データの版（schemaVersion）を読めません';
  }
  if (!isIntegerIn(value.revision, 0, Number.MAX_SAFE_INTEGER)) {
    return '保存データの revision が正しくありません';
  }
  if (typeof value.savedAt !== 'string') {
    return '保存データの savedAt が正しくありません';
  }
  if (!Array.isArray(value.entries)) {
    return '保存データの entries が配列ではありません';
  }
  if (!Array.isArray(value.budgets)) {
    return '保存データの budgets が配列ではありません';
  }
  return null;
}

export function validateSnapshot(value: unknown): SnapshotValidation {
  if (!isRecord(value)) {
    return { reason: '保存データの形が違います' };
  }
  const topLevelProblem = checkTopLevel(value);
  if (topLevelProblem) {
    return { reason: topLevelProblem };
  }

  const entries = value.entries as readonly unknown[];
  const entryState: EntryCheckState = {
    entryIds: new Set(),
    addedOrders: new Set(),
    withinLength: createMemoLengthCheck(),
  };
  for (let index = 0; index < entries.length; index += 1) {
    const field = checkEntry(entries[index], entryState);
    if (field) {
      return { reason: `明細の ${index + 1} 件目の ${field} が正しくありません` };
    }
  }

  const budgets = value.budgets as readonly unknown[];
  const budgetKeys = new Set<string>();
  for (let index = 0; index < budgets.length; index += 1) {
    const field = checkBudget(budgets[index], budgetKeys);
    if (field) {
      return { reason: `予算の ${index + 1} 件目の ${field} が正しくありません` };
    }
  }

  return { ok: value as unknown as StoreSnapshot };
}
