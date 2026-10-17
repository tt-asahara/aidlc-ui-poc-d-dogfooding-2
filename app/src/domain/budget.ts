import type { DataStore } from '../store/dataStore';
import { listCategoryNames } from './categoryCatalog';
import { isValidMonth, previousMonth } from './month';
import { fail, ok, type FieldError, type Result } from './result';
import type { MonthlyBudget } from './types';

/**
 * 月別予算（約束ごと C4、U3 BR1.1〜BR1.3、BR3.1〜BR3.4）。
 *
 * 予算の規則はこの部品の1か所に置き、画面（BudgetTable）は結果を表示するだけにする（NFR4.1）。
 * 保存は DataStore.commit の budgetsToReplace を1回だけ呼び、その月の予算だけを置き換える（NFR5.1）。
 */

export const BUDGET_MIN = 0;
export const BUDGET_MAX = 9_999_999;

/** 画面にそのまま出す文（rules.md の BR1.1、BR3.2）。 */
export const BUDGET_MESSAGES = {
  invalidAmount: '予算は 0〜9,999,999 の整数で入力してください',
  noPreviousBudgets: '前の月の予算がありません',
} as const;

/** fieldErrors の field の接頭辞。field は「budget:<カテゴリ名>」。 */
export const BUDGET_FIELD_PREFIX = 'budget:';

/** 半角数字だけ（前後の空白を除いたあとに確かめる）。 */
const HALF_WIDTH_DIGITS = /^[0-9]+$/;

export type BudgetStore = Pick<DataStore, 'getSnapshot' | 'commit'>;

export interface BudgetOptions {
  readonly store: BudgetStore;
}

/** 「前の月の予算をコピー」の下見の結果（C4 previewCopy）。 */
export interface BudgetCopyPreview {
  /** 前の月の予算（設定のあるカテゴリだけ）。 */
  readonly source: readonly MonthlyBudget[];
  /** 表示中の月にすでに予算が1つ以上あるか（BR3.3 の確認の判断に使う）。 */
  readonly targetHasBudgets: boolean;
}

/** 予算欄の値（支出カテゴリ名 → 欄の文字）。ほかの名前は読まない。 */
export type BudgetValues = Readonly<Record<string, string | undefined>>;

export interface Budget {
  /** その月の予算（設定のあるカテゴリだけ、CategoryCatalog の順）。MonthlySummary の差し込み口にもなる。 */
  getMonth(month: string): readonly MonthlyBudget[];
  /** 8つの欄をまとめて検証し、誤りがなければその月の予算だけを置き換える（BR1.1、BR1.2）。 */
  saveMonth(month: string, values: BudgetValues): Result<readonly MonthlyBudget[]>;
  /** 前の月の予算と、表示中の月に予算があるかを返す。前の月に予算がなければ NOT_FOUND（BR3.1、BR3.2）。 */
  previewCopy(month: string): Result<BudgetCopyPreview>;
  /** 呼んだ時点の前の月の予算で、表示中の月の予算をまるごと置き換える（BR3.4）。 */
  copyFromPrevious(month: string): Result<readonly MonthlyBudget[]>;
}

/** 「<YYYY-MM>:<カテゴリ名>」。 */
export function budgetKeyOf(month: string, category: string): string {
  return `${month}:${category}`;
}

/** fieldErrors の field（「budget:<カテゴリ名>」）。 */
export function budgetFieldOf(category: string): string {
  return `${BUDGET_FIELD_PREFIX}${category}`;
}

function assertMonth(month: string): void {
  if (!isValidMonth(month)) {
    // 月は AppShell が決めて渡す。形の誤りはプログラムの誤りとして例外にする。
    throw new RangeError(`月は YYYY-MM の形で渡してください: ${month}`);
  }
}

function makeBudget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: budgetKeyOf(month, category), month, category, amount };
}

/** 欄の文字を予算の金額にする。空は null（未設定）、規則に合わなければ undefined（BR1.1）。 */
function parseAmount(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  if (!HALF_WIDTH_DIGITS.test(trimmed)) {
    return undefined;
  }
  const amount = Number(trimmed);
  return amount >= BUDGET_MIN && amount <= BUDGET_MAX ? amount : undefined;
}

/** 支出カテゴリの名前だけを、自分の持つ値として読む（欠けていれば空）。 */
function readValue(values: BudgetValues, category: string): string {
  const value = Object.prototype.hasOwnProperty.call(values, category)
    ? values[category]
    : undefined;
  return typeof value === 'string' ? value : '';
}

export function createBudget(options: BudgetOptions): Budget {
  const { store } = options;

  function getMonth(month: string): readonly MonthlyBudget[] {
    const snapshot = store.getSnapshot();
    if (snapshot === null) {
      return [];
    }
    const byCategory = new Map<string, MonthlyBudget>();
    for (const budget of snapshot.budgets) {
      if (budget.month === month) {
        byCategory.set(budget.category, budget);
      }
    }
    // 支出カテゴリの固定の順にそろえる（BR1.3）。
    return listCategoryNames('支出').flatMap((category) => {
      const budget = byCategory.get(category);
      return budget ? [budget] : [];
    });
  }

  /** commit を1回だけ呼ぶ。expectedRevision は呼ぶ直前の保存データから取り出す（NFR5.1）。 */
  function replaceMonth(
    month: string,
    budgets: readonly MonthlyBudget[],
  ): Result<readonly MonthlyBudget[]> {
    const expectedRevision = store.getSnapshot()?.revision ?? 0;
    const committed = store.commit({ expectedRevision, budgetsToReplace: { month, budgets } });
    return committed.ok ? ok(budgets) : committed;
  }

  function saveMonth(month: string, values: BudgetValues): Result<readonly MonthlyBudget[]> {
    assertMonth(month);
    const budgets: MonthlyBudget[] = [];
    const fieldErrors: FieldError[] = [];
    for (const category of listCategoryNames('支出')) {
      const amount = parseAmount(readValue(values, category));
      if (amount === undefined) {
        fieldErrors.push({
          field: budgetFieldOf(category),
          message: BUDGET_MESSAGES.invalidAmount,
        });
      } else if (amount !== null) {
        budgets.push(makeBudget(month, category, amount));
      }
    }
    if (fieldErrors.length > 0) {
      // 1つでも誤りがあれば何も保存しない（BR1.2）。
      const names = fieldErrors.map((error) => error.field.slice(BUDGET_FIELD_PREFIX.length));
      return fail('VALIDATION', `予算を確かめてください: ${names.join('、')}`, fieldErrors);
    }
    return replaceMonth(month, budgets);
  }

  function previewCopy(month: string): Result<BudgetCopyPreview> {
    assertMonth(month);
    const source = getMonth(previousMonth(month));
    if (source.length === 0) {
      return fail('NOT_FOUND', BUDGET_MESSAGES.noPreviousBudgets);
    }
    return ok({ source, targetHasBudgets: getMonth(month).length > 0 });
  }

  function copyFromPrevious(month: string): Result<readonly MonthlyBudget[]> {
    assertMonth(month);
    // 呼んだ時点の保存データから写す（previewCopy のあとに変わっていても、今の内容を使う）。
    const source = getMonth(previousMonth(month));
    if (source.length === 0) {
      return fail('NOT_FOUND', BUDGET_MESSAGES.noPreviousBudgets);
    }
    // month と budgetKey を表示中の月に付け替え、表示中の月をまるごと置き換える（BR3.4）。
    const copied = source.map((budget) => makeBudget(month, budget.category, budget.amount));
    return replaceMonth(month, copied);
  }

  return { getMonth, saveMonth, previewCopy, copyFromPrevious };
}
