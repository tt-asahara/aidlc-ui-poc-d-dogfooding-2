import { createCsvExchange, type CsvExchange, type CsvFile } from '../domain/csvExchange';
import { createLedger, type Ledger } from '../domain/ledger';
import {
  createMonthlySummary,
  type BudgetSource,
  type MonthlySummary,
} from '../domain/monthlySummary';
import { fail, ok, type Result } from '../domain/result';
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
  readonly csv: CsvExchange;
  readonly seeder: SampleSeeder;
  readonly download: DownloadFile;
  /** 「今日」を決める時刻。AppShell が1か所で使う（BR2.1、BR3.4）。 */
  readonly now: () => Date;
}

export interface AppServicesOptions {
  readonly getStorage?: () => StorageLike;
  readonly now?: () => Date;
  readonly download?: DownloadFile;
  readonly budgetSource?: BudgetSource;
  readonly createSeeder?: (store: DataStore, ledger: Ledger) => SampleSeeder;
}

/** U1 の予算の取り出し: いつも空の一覧を返す（すべて「未設定」になる）。U3 が差し替える。 */
export function createEmptyBudgetSource(): BudgetSource {
  return { getMonth: () => [] };
}

/** U1 のサンプル投入: 何も保存せず、DataStore の今の内容をそのまま ok で返す。U5 が差し替える。 */
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
  const summary = createMonthlySummary({
    ledger,
    budgetSource: options.budgetSource ?? createEmptyBudgetSource(),
  });
  const csv = createCsvExchange({ ledger });
  const seeder = options.createSeeder
    ? options.createSeeder(store, ledger)
    : createNoopSampleSeeder(store);
  return { store, ledger, summary, csv, seeder, download: options.download ?? downloadFile, now };
}
