import { createBudget, type Budget } from '../domain/budget';
import { createCsvExchange, type CsvExchange, type CsvFile } from '../domain/csvExchange';
import { createLedger, type Ledger } from '../domain/ledger';
import {
  createMonthlySummary,
  type BudgetSource,
  type MonthlySummary,
} from '../domain/monthlySummary';
import { fail, ok, type Result } from '../domain/result';
import { createSampleDataSeeder } from '../domain/sampleDataSeeder';
import type { StoreSnapshot } from '../domain/types';
import { createDataStore, type DataStore, type StorageLike } from '../store/dataStore';

/**
 * 初回のサンプル投入の差し込み口（C9 と同じ形）。
 * U1 は何もしない実装を使い、U5 が SampleDataSeeder.seedIfEmpty に差し替える。
 */
export interface SampleSeeder {
  seedIfEmpty(today: string): Result<StoreSnapshot>;
}

/** CSV をブラウザのダウンロードで保存する関数。テストで差し替える。 */
export type DownloadFile = (file: CsvFile) => void;

/** 画面が使う部品の組み合わせ。あとの Unit は、この組み立ての1か所で差し込み口を差し替える。 */
export interface AppServices {
  readonly store: DataStore;
  readonly ledger: Ledger;
  readonly summary: MonthlySummary;
  /** 月別予算（C4、U3）。予算の差し込み口（BudgetSource）にも、この getMonth を使う。 */
  readonly budget: Budget;
  readonly csv: CsvExchange;
  readonly seeder: SampleSeeder;
  readonly download: DownloadFile;
  /** 「今日」を決める時刻。AppShell が1か所で使う（BR2.1、BR3.4）。 */
  readonly now: () => Date;
  /** タブ間の知らせの受け取りと、DataStore の受け取り手をすべて外す（U5。テストと画面の片付け用）。 */
  readonly dispose: () => void;
}

export interface AppServicesOptions {
  readonly getStorage?: () => StorageLike;
  readonly now?: () => Date;
  readonly download?: DownloadFile;
  /** 予算の差し込み口の差し替え（テスト用）。省略すると Budget.getMonth（U3）。 */
  readonly budgetSource?: BudgetSource;
  readonly createSeeder?: (store: DataStore, ledger: Ledger) => SampleSeeder;
}

/**
 * U1 の予算の取り出し: いつも空の一覧を返す（すべて「未設定」になる）。
 * U3 で組み立ての既定を Budget.getMonth に差し替えた。予算なしで確かめたいテストのために残す。
 */
export function createEmptyBudgetSource(): BudgetSource {
  return { getMonth: () => [] };
}

/**
 * U1 のサンプル投入: 何も保存せず、DataStore の今の内容をそのまま ok で返す。
 * ブラウザの組み立て（createBrowserAppServices）は U5 で SampleDataSeeder に差し替えた。
 * createAppServices の既定はこのままにし、U1 のテストがサンプルなしの組み立てで動くようにする。
 */
export function createNoopSampleSeeder(store: Pick<DataStore, 'getSnapshot'>): SampleSeeder {
  return {
    seedIfEmpty() {
      const snapshot = store.getSnapshot();
      return snapshot
        ? ok(snapshot)
        : fail('STORE_UNREADABLE', '保存データを読み込めませんでした。データは消していません');
    },
  };
}

/**
 * 手元で作ったデータ（Blob）の一時的な URL でダウンロードする。通信は発生しない（security-design.md）。
 */
export function downloadFile(file: CsvFile): void {
  const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // ブラウザがダウンロードを始めてから一時的な URL を片付ける。
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function createAppServices(options: AppServicesOptions = {}): AppServices {
  const now = options.now ?? (() => new Date());
  const store = createDataStore({
    getStorage: options.getStorage ?? (() => window.localStorage),
    now,
  });
  const ledger = createLedger({ store });
  const budget = createBudget({ store });
  // 予算の差し込み口を Budget.getMonth に差し替える（U3。組み立ての1か所。U1 の Q1）。
  // createBrowserAppServices もこの関数を通るため、両方の組み立てで本物の予算になる。
  const summary = createMonthlySummary({
    ledger,
    budgetSource: options.budgetSource ?? { getMonth: (month) => budget.getMonth(month) },
  });
  const csv = createCsvExchange({ ledger });
  const seeder = options.createSeeder
    ? options.createSeeder(store, ledger)
    : createNoopSampleSeeder(store);
  return {
    store,
    ledger,
    summary,
    budget,
    csv,
    seeder,
    download: options.download ?? downloadFile,
    now,
    dispose: () => store.dispose(),
  };
}

/** U5 のサンプル投入の差し込み口: SampleDataSeeder（C9、BR4.1〜BR4.5）。 */
export function createSampleSeeder(store: DataStore, ledger: Ledger): SampleSeeder {
  return createSampleDataSeeder({ store, ledger });
}

/**
 * ブラウザで使う組み立て（main.tsx から呼ぶ）。サンプル投入の差し込み口を SampleDataSeeder に差し替える。
 * 保存領域は window.localStorage（省略時）。テストは createAppServices に偽物を渡して組み立てる。
 */
export function createBrowserAppServices(options: AppServicesOptions = {}): AppServices {
  return createAppServices({ createSeeder: createSampleSeeder, ...options });
}
