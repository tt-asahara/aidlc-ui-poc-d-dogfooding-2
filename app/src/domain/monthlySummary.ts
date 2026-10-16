import { listCategoryNames } from './categoryCatalog';
import type { Ledger } from './ledger';
import type { CategorySummary, MonthSummary, MonthlyBudget } from './types';

/**
 * 予算の取り出しの差し込み口（C4 の getMonth と同じ形）。
 * U1 は空の一覧を返す実装を使い、U3 が Budget.getMonth に差し替える。
 */
export interface BudgetSource {
  getMonth(month: string): readonly MonthlyBudget[];
}

export interface MonthlySummaryOptions {
  readonly ledger: Pick<Ledger, 'listByMonth'>;
  readonly budgetSource: BudgetSource;
}

export interface MonthlySummary {
  /** 選んだ月の収入合計・支出合計・差額と、支出カテゴリ別の実績（BR2.3、BR2.5、BR2.7）。 */
  summarize(month: string): MonthSummary;
}

export function createMonthlySummary(options: MonthlySummaryOptions): MonthlySummary {
  function summarize(month: string): MonthSummary {
    let incomeTotal = 0;
    let expenseTotal = 0;
    const actualByCategory = new Map<string, number>();
    for (const entry of options.ledger.listByMonth(month)) {
      if (entry.kind === '収入') {
        incomeTotal += entry.amount;
      } else {
        expenseTotal += entry.amount;
        actualByCategory.set(
          entry.category,
          (actualByCategory.get(entry.category) ?? 0) + entry.amount,
        );
      }
    }

    const budgetByCategory = new Map<string, number>();
    for (const budget of options.budgetSource.getMonth(month)) {
      budgetByCategory.set(budget.category, budget.amount);
    }

    const categories: CategorySummary[] = listCategoryNames('支出').map((category) => {
      const actual = actualByCategory.get(category) ?? 0;
      const budget = budgetByCategory.get(category) ?? null;
      const remaining = budget === null ? null : budget - actual;
      return { category, actual, budget, remaining, over: remaining !== null && remaining < 0 };
    });

    return {
      month,
      incomeTotal,
      expenseTotal,
      difference: incomeTotal - expenseTotal,
      categories,
    };
  }

  return { summarize };
}
