import type { EntryKind } from './types';

/** 固定のカテゴリ（FR3.1）。displayOrder は区分の中での並び順。 */
export interface Category {
  readonly name: string;
  readonly kind: EntryKind;
  readonly displayOrder: number;
}

/** 登録フォームで選ぶ区分の並び順（初期値は支出）。 */
export const ENTRY_KINDS: readonly EntryKind[] = ['支出', '収入'];

const INCOME_NAMES = ['給与', '副収入', 'その他収入'] as const;
const EXPENSE_NAMES = [
  '食費',
  '住居費',
  '水道光熱費',
  '通信費',
  '日用品',
  '交通費',
  '娯楽',
  'その他支出',
] as const;

export const CATEGORIES: readonly Category[] = Object.freeze([
  ...INCOME_NAMES.map((name, index) => ({ name, kind: '収入' as const, displayOrder: index + 1 })),
  ...EXPENSE_NAMES.map((name, index) => ({ name, kind: '支出' as const, displayOrder: index + 1 })),
]);

export function isEntryKind(value: string): value is EntryKind {
  return value === '収入' || value === '支出';
}

/** 区分に合うカテゴリを、固定の並び順で返す（BR1.3）。 */
export function listCategoriesByKind(kind: EntryKind): readonly Category[] {
  return CATEGORIES.filter((category) => category.kind === kind).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

/** 区分に合うカテゴリ名を、固定の並び順で返す。 */
export function listCategoryNames(kind: EntryKind): readonly string[] {
  return listCategoriesByKind(kind).map((category) => category.name);
}

/** カテゴリが区分に合うか（存在しないカテゴリは false）。 */
export function isCategoryOfKind(categoryName: string, kind: EntryKind): boolean {
  return CATEGORIES.some((category) => category.name === categoryName && category.kind === kind);
}

/** カテゴリ名からカテゴリを探す。存在しなければ undefined。 */
export function findCategory(categoryName: string): Category | undefined {
  return CATEGORIES.find((category) => category.name === categoryName);
}
