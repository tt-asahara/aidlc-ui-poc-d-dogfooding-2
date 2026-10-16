import { describe, expect, it } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import { createMonthlySummary, type BudgetSource } from '../../../src/domain/monthlySummary';
import type { Entry } from '../../../src/domain/types';
import { makeEntry, makeLargeEntries, makeSnapshot } from '../support/entries';

const emptyBudgets: BudgetSource = { getMonth: () => [] };

function summaryOf(entries: readonly Entry[], budgetSource: BudgetSource = emptyBudgets) {
  const snapshot = makeSnapshot(entries);
  const ledger = createLedger({
    store: {
      getSnapshot: () => snapshot,
      commit: () => {
        throw new Error('集計のテストでは保存しない');
      },
    },
  });
  return createMonthlySummary({ ledger, budgetSource });
}

/** 詳細モックアップの10月の明細（架空）。収入 ¥280,000、支出 ¥119,220。 */
function octoberEntries(): Entry[] {
  return [
    makeEntry({ date: '2026-10-01', kind: '収入', category: '給与', amount: 280000 }),
    makeEntry({ date: '2026-10-02', category: '住居費', amount: 82000 }),
    makeEntry({ date: '2026-10-05', category: '食費', amount: 6420 }),
    makeEntry({ date: '2026-10-08', category: '通信費', amount: 4980 }),
    makeEntry({ date: '2026-10-11', category: '食費', amount: 3150 }),
    makeEntry({ date: '2026-10-12', category: '娯楽', amount: 12800 }),
    makeEntry({ date: '2026-10-14', category: '水道光熱費', amount: 9870 }),
    makeEntry({ date: '2026-09-30', category: '食費', amount: 50000 }),
  ];
}

describe('MonthlySummary', () => {
  it('収入・支出・差額を計算する（AC3.1.1: 差額 ¥160,780）', () => {
    const result = summaryOf(octoberEntries()).summarize('2026-10');

    expect(result).toMatchObject({
      month: '2026-10',
      incomeTotal: 280000,
      expenseTotal: 119220,
      difference: 160780,
    });
  });

  it('支出が収入より多い月は差額が負になる（AC3.1.2）', () => {
    const entries = [
      makeEntry({ date: '2026-10-01', kind: '収入', category: '副収入', amount: 50000 }),
      makeEntry({ date: '2026-10-02', category: '住居費', amount: 82000 }),
    ];

    expect(summaryOf(entries).summarize('2026-10').difference).toBe(-32000);
  });

  it('支出カテゴリ別の実績の合計は支出合計と一致する（AC3.1.5）', () => {
    const result = summaryOf(octoberEntries()).summarize('2026-10');

    const sum = result.categories.reduce((total, category) => total + category.actual, 0);
    expect(sum).toBe(result.expenseTotal);
    expect(result.categories.find((c) => c.category === '食費')?.actual).toBe(9570);
  });

  it('支出カテゴリ8つを固定の順で出し、実績0のカテゴリも出す（BR2.5）', () => {
    const result = summaryOf([]).summarize('2026-10');

    expect(result.categories.map((c) => c.category)).toEqual([
      '食費',
      '住居費',
      '水道光熱費',
      '通信費',
      '日用品',
      '交通費',
      '娯楽',
      'その他支出',
    ]);
    expect(result.categories.every((c) => c.actual === 0)).toBe(true);
    expect(result).toMatchObject({ incomeTotal: 0, expenseTotal: 0, difference: 0 });
  });

  it('9,999,999 円の支出 300 件でも誤差なく ¥2,999,999,700 になる（AC3.1.6）', () => {
    const entries = Array.from({ length: 300 }, () =>
      makeEntry({ date: '2026-10-20', category: 'その他支出', amount: 9_999_999 }),
    );

    const result = summaryOf(entries).summarize('2026-10');

    expect(result.expenseTotal).toBe(2_999_999_700);
    expect(result.difference).toBe(-2_999_999_700);
  });

  it('予算の差し込み口が予算なしを返すと、予算と残額は null、超過なし（BR2.7）', () => {
    const result = summaryOf(octoberEntries()).summarize('2026-10');

    for (const category of result.categories) {
      expect(category).toMatchObject({ budget: null, remaining: null, over: false });
    }
  });

  it('予算の差し込み口から予算を受け取ると残額と超過を計算する（U3 の差し替えの形）', () => {
    const budgetSource: BudgetSource = {
      getMonth: (month) => [
        { budgetKey: `${month}:食費`, month, category: '食費', amount: 5000 },
        { budgetKey: `${month}:娯楽`, month, category: '娯楽', amount: 20000 },
      ],
    };

    const result = summaryOf(octoberEntries(), budgetSource).summarize('2026-10');

    expect(result.categories.find((c) => c.category === '食費')).toMatchObject({
      budget: 5000,
      remaining: -4570,
      over: true,
    });
    expect(result.categories.find((c) => c.category === '娯楽')).toMatchObject({
      remaining: 7200,
      over: false,
    });
  });

  it('3,000 件から1か月分の集計を 100 ミリ秒以内に計算する（NFR1.5、3回の中央値）', () => {
    const summary = summaryOf(makeLargeEntries('2026-10'));
    const durations: number[] = [];

    for (let run = 0; run < 3; run += 1) {
      const started = performance.now();
      const result = summary.summarize('2026-10');
      durations.push(performance.now() - started);
      expect(result.categories).toHaveLength(8);
    }

    const median = [...durations].sort((a, b) => a - b)[1]!;
    console.info(`[NFR1.5] summarize 3,000 件の中央値: ${median.toFixed(2)} ms`);
    expect(median).toBeLessThan(100);
  });
});
