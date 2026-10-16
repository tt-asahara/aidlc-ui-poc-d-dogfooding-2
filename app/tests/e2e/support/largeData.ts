import type { Entry } from '../../../src/domain/types';

const CATEGORIES = [
  { kind: '収入', name: '給与' },
  { kind: '収入', name: '副収入' },
  { kind: '支出', name: '食費' },
  { kind: '支出', name: '住居費' },
  { kind: '支出', name: '水道光熱費' },
  { kind: '支出', name: '通信費' },
  { kind: '支出', name: '日用品' },
  { kind: '支出', name: '交通費' },
  { kind: '支出', name: '娯楽' },
  { kind: '支出', name: 'その他支出' },
] as const;

/**
 * 性能のテスト用の架空の明細（NFR1、仮定 A8）。
 * lastMonth（YYYY-MM）を含む直近 30 か月に、1か月 100 件ずつ合計 3,000 件を決まった規則で作る。
 * 実在の人物・口座・店舗の名前は使わない（NFR3.4）。
 */
export function makeLargeEntries(lastMonth: string, total = 3000, perMonth = 100): Entry[] {
  const [yearText, monthText] = lastMonth.split('-');
  let monthIndex = Number(yearText) * 12 + Number(monthText) - 1;
  const entries: Entry[] = [];
  for (let index = 0; index < total; index += 1) {
    if (index > 0 && index % perMonth === 0) {
      monthIndex -= 1;
    }
    const year = Math.floor(monthIndex / 12);
    const month = String((monthIndex % 12) + 1).padStart(2, '0');
    const day = String((index % 28) + 1).padStart(2, '0');
    const category = CATEGORIES[index % CATEGORIES.length]!;
    entries.push({
      entryId: `perf-${index}`,
      date: `${year}-${month}-${day}`,
      kind: category.kind,
      category: category.name,
      amount: ((index * 37) % 99_999) + 1,
      memo: `性能テスト明細 ${index}`,
      addedOrder: index + 1,
    });
  }
  return entries;
}

/** 今の地域の時刻の月（YYYY-MM）。 */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}
