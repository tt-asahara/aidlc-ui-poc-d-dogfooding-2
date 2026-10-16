import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  ENTRY_KINDS,
  findCategory,
  isCategoryOfKind,
  isEntryKind,
  listCategoryNames,
} from '../../../src/domain/categoryCatalog';

describe('CategoryCatalog', () => {
  it('収入は3つ、支出は8つの固定カテゴリを持つ（FR3.1）', () => {
    expect(CATEGORIES.filter((c) => c.kind === '収入')).toHaveLength(3);
    expect(CATEGORIES.filter((c) => c.kind === '支出')).toHaveLength(8);
    expect(CATEGORIES).toHaveLength(11);
  });

  it('区分ごとのカテゴリを決まった並び順で返す（AC1.1.2）', () => {
    expect(listCategoryNames('収入')).toEqual(['給与', '副収入', 'その他収入']);
    expect(listCategoryNames('支出')).toEqual([
      '食費',
      '住居費',
      '水道光熱費',
      '通信費',
      '日用品',
      '交通費',
      '娯楽',
      'その他支出',
    ]);
  });

  it('区分に合うカテゴリは一致と判定する（BR1.3）', () => {
    expect(isCategoryOfKind('食費', '支出')).toBe(true);
    expect(isCategoryOfKind('給与', '収入')).toBe(true);
  });

  it('区分に合わないカテゴリは不一致と判定する（BR1.3）', () => {
    expect(isCategoryOfKind('食費', '収入')).toBe(false);
    expect(isCategoryOfKind('給与', '支出')).toBe(false);
  });

  it('存在しないカテゴリはどの区分とも一致せず、探しても見つからない', () => {
    expect(isCategoryOfKind('ペット', '支出')).toBe(false);
    expect(isCategoryOfKind('', '収入')).toBe(false);
    expect(findCategory('ペット')).toBeUndefined();
    expect(findCategory('娯楽')).toEqual({ name: '娯楽', kind: '支出', displayOrder: 7 });
  });

  it('区分は「支出」「収入」の2つだけで、初期値の支出が先に並ぶ', () => {
    expect(ENTRY_KINDS).toEqual(['支出', '収入']);
    expect(isEntryKind('支出')).toBe(true);
    expect(isEntryKind('収入')).toBe(true);
    expect(isEntryKind('expense')).toBe(false);
  });
});
