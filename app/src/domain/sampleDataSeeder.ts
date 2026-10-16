import type { DataStore } from '../store/dataStore';
import type { Ledger } from './ledger';
import { shiftMonth } from './month';
import { fail, type Result } from './result';
import {
  SCHEMA_VERSION,
  type EntryInput,
  type EntryKind,
  type MonthlyBudget,
  type StoreSnapshot,
  type ValidatedEntry,
} from './types';

/**
 * 初回のサンプル投入（約束ごと C9、U5 W2、BR4.1〜BR4.5）。
 *
 * 今日の月とその前の2か月に、決まった並び（乱数なし）で架空の明細と予算を組み立て、
 * Ledger.validate で確かめ、Ledger.assignIdentities で採番し、DataStore.commit を1回だけ呼ぶ（全部か無か）。
 * 保存データがすでにあれば commit が断り、何も変わらない（NFR5.4）。
 */

/** サンプルのメモに使う一般名詞の一覧（BR4.4、NFR3.1）。実在の人物・口座・店舗の名前は使わない。 */
export const SAMPLE_MEMOS = [
  '給与',
  '副業',
  '家賃',
  '定期券',
  'スーパー',
  'ドラッグストア',
  '電気代',
  '外食',
  '映画',
  'スマホ代',
  'インターネット',
  '日用品',
  '水道代',
  '本',
  '雑貨',
] as const;

type SampleMemo = (typeof SAMPLE_MEMOS)[number];

interface SampleLine {
  readonly day: number;
  readonly kind: EntryKind;
  readonly category: string;
  readonly amount: number;
  readonly memo: SampleMemo;
}

const expense = (day: number, category: string, amount: number, memo: SampleMemo): SampleLine => ({
  day,
  kind: '支出',
  category,
  amount,
  memo,
});

const income = (day: number, category: string, amount: number, memo: SampleMemo): SampleLine => ({
  day,
  kind: '収入',
  category,
  amount,
  memo,
});

/** 毎月の明細（給与1件 + 支出 16 件。支出は8つのカテゴリに散らす）。日は 28 日以下にする。 */
const MONTHLY_LINES: readonly SampleLine[] = [
  expense(1, '住居費', 85_000, '家賃'),
  expense(2, '交通費', 9_800, '定期券'),
  expense(3, '食費', 6_800, 'スーパー'),
  expense(6, '日用品', 2_400, 'ドラッグストア'),
  expense(9, '食費', 7_200, 'スーパー'),
  expense(10, '水道光熱費', 8_200, '電気代'),
  expense(13, '食費', 3_200, '外食'),
  expense(14, '娯楽', 1_900, '映画'),
  expense(15, '通信費', 4_980, 'スマホ代'),
  expense(15, '通信費', 5_200, 'インターネット'),
  expense(17, '食費', 8_100, 'スーパー'),
  expense(19, '日用品', 1_800, '日用品'),
  expense(20, '水道光熱費', 3_600, '水道代'),
  expense(21, '娯楽', 1_500, '本'),
  expense(24, '食費', 5_900, 'スーパー'),
  income(25, '給与', 280_000, '給与'),
  expense(26, 'その他支出', 1_200, '雑貨'),
];

/**
 * 前の月（M-1）だけに足す明細。副収入1件と食費2件で、食費の実績を 43,900 円にし、
 * 予算 40,000 円を超えさせる（BR4.3）。M-1 は合計 20 件になる。
 */
const PREVIOUS_MONTH_EXTRA_LINES: readonly SampleLine[] = [
  income(18, '副収入', 32_000, '副業'),
  expense(27, '食費', 9_500, 'スーパー'),
  expense(28, '食費', 3_200, '外食'),
];

/** 6つの支出カテゴリの予算（3か月とも同じ）。娯楽・その他支出は未設定（BR4.3）。 */
const MONTHLY_BUDGETS: readonly { readonly category: string; readonly amount: number }[] = [
  { category: '食費', amount: 40_000 },
  { category: '住居費', amount: 85_000 },
  { category: '水道光熱費', amount: 15_000 },
  { category: '通信費', amount: 11_000 },
  { category: '日用品', amount: 6_000 },
  { category: '交通費', amount: 12_000 },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface SampleDataSeederOptions {
  readonly ledger: Pick<Ledger, 'validate' | 'assignIdentities'>;
  readonly store: Pick<DataStore, 'commit'>;
}

export interface SampleDataSeeder {
  /** 今日（YYYY-MM-DD）を含む直近3か月分を1回の保存で入れる。保存データがあれば何もしない。 */
  seedIfEmpty(today: string): Result<StoreSnapshot>;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 1か月分の明細の入力。maxDay より後の日は maxDay に寄せる（今月の未来の日付を作らない。BR4.2）。 */
function monthInputs(month: string, lines: readonly SampleLine[], maxDay: number): EntryInput[] {
  return [...lines]
    .sort((a, b) => a.day - b.day)
    .map((line) => ({
      date: `${month}-${pad2(Math.min(line.day, maxDay))}`,
      kind: line.kind,
      category: line.category,
      amount: line.amount,
      memo: line.memo,
    }));
}

/** 3か月分の明細の入力を、古い月から決まった並びで組み立てる（BR4.1、BR4.2）。 */
export function buildSampleInputs(today: string): EntryInput[] {
  if (!ISO_DATE.test(today)) {
    throw new RangeError(`今日は YYYY-MM-DD の形で渡してください: ${today}`);
  }
  const month = today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));
  return [
    ...monthInputs(shiftMonth(month, -2), MONTHLY_LINES, 31),
    ...monthInputs(shiftMonth(month, -1), [...MONTHLY_LINES, ...PREVIOUS_MONTH_EXTRA_LINES], 31),
    ...monthInputs(month, MONTHLY_LINES, todayDay),
  ];
}

/** 3か月分の予算を、C2 の MonthlyBudget の形で組み立てる。budgetKey は「月:カテゴリ」。 */
export function buildSampleBudgets(today: string): MonthlyBudget[] {
  const month = today.slice(0, 7);
  return [-2, -1, 0].flatMap((delta) => {
    const target = shiftMonth(month, delta);
    return MONTHLY_BUDGETS.map(({ category, amount }) => ({
      budgetKey: `${target}:${category}`,
      month: target,
      category,
      amount,
    }));
  });
}

export function createSampleDataSeeder(options: SampleDataSeederOptions): SampleDataSeeder {
  function seedIfEmpty(today: string): Result<StoreSnapshot> {
    const validated: ValidatedEntry[] = [];
    for (const input of buildSampleInputs(today)) {
      const checked = options.ledger.validate(input);
      if (!checked.ok) {
        // サンプルが利用者の登録と同じ規則に合わないのはプログラムの誤り。保存しない（BR4.5）。
        console.error('[budget-app] サンプルの明細が規則に合いません', checked.error.code);
        return fail(checked.error.code, checked.error.message, checked.error.fieldErrors);
      }
      validated.push(checked.value);
    }
    const snapshot: StoreSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      savedAt: `${today}T00:00:00.000Z`,
      entries: options.ledger.assignIdentities(validated, []),
      budgets: buildSampleBudgets(today),
    };
    return options.store.commit({ expectedRevision: 0, initialize: snapshot });
  }

  return { seedIfEmpty };
}
