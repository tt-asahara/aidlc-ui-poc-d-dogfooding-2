import { describe, expect, it } from 'vitest';
import type { Entry, MonthlyBudget, StoreSnapshot } from '../../../src/domain/types';
import { validateSnapshot } from '../../../src/domain/validateSnapshot';
import { makeEntry, makeLargeEntries, makeSnapshot } from '../support/entries';

// 保存データの検査（U5 BR1.1、NFR1.3、NFR1.4、NFR4.1、NFR4.2）。
// 壊れた例は、正しい保存データの1か所だけを壊して作る。値はすべて架空。

function budget(month: string, category: string, amount: number): MonthlyBudget {
  return { budgetKey: `${month}:${category}`, month, category, amount };
}

function validSnapshot(): StoreSnapshot {
  return {
    ...makeSnapshot([
      makeEntry({ date: '2026-10-01', kind: '収入', category: '給与', amount: 280000, memo: '' }),
      makeEntry({ date: '2024-02-29', amount: 9_999_999, memo: 'スーパー' }),
    ]),
    budgets: [budget('2026-10', '食費', 40000), budget('2026-10', '娯楽', 0)],
  };
}

/** 正しい保存データの1か所だけを変えた値（JSON に直した形）を作る。 */
function withEntry(overrides: Record<string, unknown>): unknown {
  const snapshot = validSnapshot();
  return { ...snapshot, entries: [snapshot.entries[0], { ...snapshot.entries[1], ...overrides }] };
}

function withBudget(overrides: Record<string, unknown>): unknown {
  const snapshot = validSnapshot();
  return { ...snapshot, budgets: [snapshot.budgets[0], { ...snapshot.budgets[1], ...overrides }] };
}

function reasonOf(value: unknown): string {
  const result = validateSnapshot(value);
  if (!('reason' in result)) {
    throw new Error('読めない、になるはずの値が通りました');
  }
  return result.reason;
}

describe('validateSnapshot', () => {
  it('約束ごと C2 に合う保存データはそのまま通す（見える1文字で 100 文字のメモを含む）', () => {
    const snapshot = validSnapshot();
    // 絵文字1文字は UTF-16 で2つ分。length は 200 だが、見える文字は 100。
    const longMemo = '🍙'.repeat(100);
    const value = { ...snapshot, entries: [...snapshot.entries, makeEntry({ memo: longMemo })] };

    const result = validateSnapshot(JSON.parse(JSON.stringify(value)));

    expect(result).toEqual({ ok: value });
    expect(validateSnapshot(makeSnapshot([], 0))).toEqual({ ok: makeSnapshot([], 0) });
  });

  it('全体の形と型の誤りは読めない（schemaVersion・revision・savedAt・entries・budgets・明細の型）', () => {
    const snapshot = validSnapshot();
    expect(reasonOf(null)).toBe('保存データの形が違います');
    expect(reasonOf([snapshot])).toBe('保存データの形が違います');
    expect(reasonOf({ ...snapshot, schemaVersion: 2 })).toBe(
      '保存データの版（schemaVersion）を読めません',
    );
    expect(reasonOf({ ...snapshot, revision: '1' })).toBe(
      '保存データの revision が正しくありません',
    );
    expect(reasonOf({ ...snapshot, revision: -1 })).toBe(
      '保存データの revision が正しくありません',
    );
    expect(reasonOf({ ...snapshot, savedAt: 0 })).toBe('保存データの savedAt が正しくありません');
    expect(reasonOf({ ...snapshot, entries: {} })).toBe(
      '保存データの entries が配列ではありません',
    );
    expect(reasonOf({ ...snapshot, budgets: null })).toBe(
      '保存データの budgets が配列ではありません',
    );
    expect(reasonOf({ ...snapshot, entries: [snapshot.entries[0], 'x'] })).toBe(
      '明細の 2 件目の 形 が正しくありません',
    );
    expect(reasonOf(withEntry({ amount: '1280' }))).toBe(
      '明細の 2 件目の amount が正しくありません',
    );
    expect(reasonOf(withEntry({ memo: 12 }))).toBe('明細の 2 件目の memo が正しくありません');
    expect(reasonOf({ ...snapshot, budgets: [7] })).toBe('予算の 1 件目の 形 が正しくありません');
  });

  it('金額の範囲外と整数でない金額は読めない（明細 1〜9,999,999、予算 0〜9,999,999）', () => {
    expect(reasonOf(withEntry({ amount: 0 }))).toContain('amount');
    expect(reasonOf(withEntry({ amount: 10_000_000 }))).toContain('amount');
    expect(reasonOf(withEntry({ amount: 1.5 }))).toContain('amount');
    expect(reasonOf(withBudget({ amount: -1 }))).toBe('予算の 2 件目の amount が正しくありません');
    expect(reasonOf(withBudget({ amount: 10_000_000 }))).toContain('amount');
  });

  it('形の違う日付と、暦にない日付（2026-02-30 など）は読めない', () => {
    for (const date of [
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '2026-10-00',
      '2026/10/01',
      20261001,
    ]) {
      expect(reasonOf(withEntry({ date })), String(date)).toBe(
        '明細の 2 件目の date が正しくありません',
      );
    }
  });

  it('区分とカテゴリが合わない明細、知らない区分、支出でない予算のカテゴリは読めない', () => {
    expect(reasonOf(withEntry({ kind: '収入', category: '食費' }))).toContain('category');
    expect(reasonOf(withEntry({ category: '存在しないカテゴリ' }))).toContain('category');
    expect(reasonOf(withEntry({ kind: '振替' }))).toContain('kind');
    expect(reasonOf(withBudget({ category: '給与', budgetKey: '2026-10:給与' }))).toContain(
      'category',
    );
    expect(reasonOf(withBudget({ month: '2026-13', budgetKey: '2026-13:娯楽' }))).toContain(
      'month',
    );
  });

  it('entryId と addedOrder の重なり・空の entryId・正でない addedOrder は読めない', () => {
    const snapshot = validSnapshot();
    const [first, second] = snapshot.entries as [Entry, Entry];
    const withSecond = (overrides: Partial<Entry>) => ({
      ...snapshot,
      entries: [first, { ...second, ...overrides }],
    });
    expect(reasonOf(withSecond({ entryId: first.entryId }))).toBe(
      '明細の 2 件目の entryId（重複） が正しくありません',
    );
    expect(reasonOf(withSecond({ addedOrder: first.addedOrder }))).toBe(
      '明細の 2 件目の addedOrder（重複） が正しくありません',
    );
    expect(reasonOf(withEntry({ entryId: '' }))).toContain('entryId');
    expect(reasonOf(withEntry({ addedOrder: 0 }))).toContain('addedOrder');
  });

  it('budgetKey が「month:カテゴリ」と合わない予算と、重なる予算は読めない', () => {
    expect(reasonOf(withBudget({ budgetKey: '2026-09:娯楽' }))).toBe(
      '予算の 2 件目の budgetKey が正しくありません',
    );
    const snapshot = validSnapshot();
    const duplicated = { ...snapshot, budgets: [snapshot.budgets[0], snapshot.budgets[0]] };
    expect(reasonOf(duplicated)).toBe('予算の 2 件目の budgetKey（重複） が正しくありません');
  });

  it('理由の文は項目の名前と位置だけで、保存データの値を含めない（NFR4.2）', () => {
    const secretMemo = '架空の秘密のメモ\n二行目';
    const reasons = [
      reasonOf(withEntry({ memo: secretMemo })),
      reasonOf(withEntry({ memo: ' 前に空白' })),
      reasonOf(withEntry({ memo: 'あ'.repeat(101) })),
      reasonOf(withEntry({ amount: 12_345_678 })),
      reasonOf(withEntry({ date: '1999-99-99' })),
      reasonOf(withBudget({ budgetKey: '架空の鍵' })),
      reasonOf({ ...validSnapshot(), schemaVersion: 'v-架空' }),
    ];

    expect(reasons.slice(0, 3)).toEqual([
      '明細の 2 件目の memo が正しくありません',
      '明細の 2 件目の memo が正しくありません',
      '明細の 2 件目の memo が正しくありません',
    ]);
    for (const reason of reasons) {
      for (const value of [
        '架空の秘密',
        '前に空白',
        'ああ',
        '12345678',
        '1999',
        '架空の鍵',
        'v-架空',
      ]) {
        expect(reason).not.toContain(value);
      }
    }
  });

  it('3,000 件の保存データの検査が 100 ミリ秒以内で、文字にした大きさが 1 MB 未満（NFR1.3、NFR1.4）', () => {
    const snapshot = makeSnapshot(makeLargeEntries('2026-10'), 3000);
    const text = JSON.stringify(snapshot);
    const parsed: unknown = JSON.parse(text);
    validateSnapshot(parsed); // 1回目は関数の準備の時間を含むため、測る前に1回動かす。

    const started = performance.now();
    const result = validateSnapshot(parsed);
    const elapsed = performance.now() - started;
    const bytes = new TextEncoder().encode(text).length;
    console.info(
      `[NFR1.3] 3,000 件の検査: ${elapsed.toFixed(2)} ms / [NFR1.4] 大きさ: ${bytes} バイト`,
    );

    expect('ok' in result).toBe(true);
    expect(elapsed).toBeLessThan(100);
    expect(bytes).toBeLessThan(1024 * 1024);
  });

  it('5 MB 近くの保存データの検査時間を1回測って記録する（合否の判定には使わない。NFR 設計の大きさの上限）', () => {
    const snapshot = makeSnapshot(makeLargeEntries('2026-10', 38_000, 1000), 38_000);
    const text = JSON.stringify(snapshot);

    const started = performance.now();
    const result = validateSnapshot(JSON.parse(text));
    const elapsed = performance.now() - started;
    console.info(
      `[記録] ${(text.length / 1_000_000).toFixed(2)} 百万文字の保存データの読み込みと検査: ${elapsed.toFixed(1)} ms`,
    );

    expect('ok' in result).toBe(true);
  });
});
