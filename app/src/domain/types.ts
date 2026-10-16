/**
 * 約束ごと C2（保存データ）・C3（Ledger の入力）・C5（MonthSummary）・C6（AppState）の型。
 */

export type EntryKind = '収入' | '支出';

export const SCHEMA_VERSION = 1;

/** 明細。持ち主は Ledger。 */
export interface Entry {
  readonly entryId: string;
  /** YYYY-MM-DD */
  readonly date: string;
  readonly kind: EntryKind;
  readonly category: string;
  /** 1〜9,999,999（円の整数） */
  readonly amount: number;
  /** 前後の空白を除いたもの。改行なし。 */
  readonly memo: string;
  /** 追加した順の通し番号（同じ日付の並び順に使う）。 */
  readonly addedOrder: number;
}

/** 月別予算。持ち主は Budget（U3）。U1 では常に空の配列。 */
export interface MonthlyBudget {
  /** "<YYYY-MM>:<カテゴリ名>" */
  readonly budgetKey: string;
  /** YYYY-MM */
  readonly month: string;
  readonly category: string;
  /** 0〜9,999,999（円） */
  readonly amount: number;
}

/** 保存データ（schemaVersion 1）。 */
export interface StoreSnapshot {
  readonly schemaVersion: 1;
  /** 保存のたびに 1 ずつ増える通し番号。最初は 0。 */
  readonly revision: number;
  /** 保存した時刻（ISO 8601） */
  readonly savedAt: string;
  readonly entries: readonly Entry[];
  readonly budgets: readonly MonthlyBudget[];
}

/** DataStore.commit に渡す変更。 */
export interface SnapshotChange {
  readonly expectedRevision: number;
  readonly entriesToAdd?: readonly Entry[];
  readonly budgetsToReplace?: {
    readonly month: string;
    readonly budgets: readonly MonthlyBudget[];
  };
  /** SampleDataSeeder（U5）専用。状態が empty のときだけ受け付ける。 */
  readonly initialize?: StoreSnapshot;
}

export type LoadOutcome =
  | { readonly status: 'empty' }
  | { readonly status: 'ready'; readonly snapshot: StoreSnapshot }
  | { readonly status: 'unreadable'; readonly reason: string };

/** DataStore の知らせ。committed は U1 で足した（自分の保存が成功した）。 */
export type StoreEvent =
  | { readonly type: 'committed'; readonly snapshot: StoreSnapshot }
  | { readonly type: 'externalChange'; readonly snapshot: StoreSnapshot }
  | { readonly type: 'unreadable'; readonly reason: string };

/** Ledger の入力。画面の文字列も CSV の値も受け取り、validate で整数にする。 */
export interface EntryInput {
  readonly date: string;
  readonly kind: string;
  readonly category: string;
  readonly amount: string | number;
  readonly memo: string;
}

/** validate を通った明細（entryId と addedOrder はまだない）。 */
export type ValidatedEntry = Omit<Entry, 'entryId' | 'addedOrder'>;

export interface CategorySummary {
  readonly category: string;
  readonly actual: number;
  /** null は未設定。U1 では常に null。 */
  readonly budget: number | null;
  /** budget が null なら null。 */
  readonly remaining: number | null;
  /** budget が null なら false。 */
  readonly over: boolean;
}

export interface MonthSummary {
  /** YYYY-MM */
  readonly month: string;
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  /** incomeTotal - expenseTotal（負もありうる） */
  readonly difference: number;
  /** 支出カテゴリ8つを CategoryCatalog の順で。 */
  readonly categories: readonly CategorySummary[];
}

export type StoreStatus = 'ready' | 'unreadable';

/** 画面に伝える状態（C6）。 */
export interface AppState {
  /** YYYY-MM */
  readonly selectedMonth: string;
  readonly storeStatus: StoreStatus;
  readonly lastExternalChangeAt: string | null;
}
