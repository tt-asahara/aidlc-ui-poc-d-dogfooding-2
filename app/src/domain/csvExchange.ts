import type { Ledger } from './ledger';
import { fail, ok, type Result } from './result';
import type { Entry } from './types';

/** C8 の見出し。 */
export const CSV_HEADER = ['日付', '区分', 'カテゴリ', '金額', 'メモ'] as const;
const CRLF = '\r\n';
const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface CsvFile {
  readonly fileName: string;
  /** UTF-8（BOM 付き）のバイト列。 */
  readonly content: Uint8Array<ArrayBuffer>;
}

export interface CsvExchangeOptions {
  readonly ledger: Pick<Ledger, 'listAll'>;
}

export interface CsvExchange {
  /**
   * すべての明細を CSV にする（BR3.1〜BR3.5）。today（YYYY-MM-DD）は AppShell が決めた「今日」。
   * 明細が0件なら NOT_FOUND。
   */
  exportAll(today: string): Result<CsvFile>;
}

/** カンマ・ダブルクォート（と念のため改行）を含む値はダブルクォートで囲み、中の " を "" にする（BR3.3）。 */
export function quoteCsvValue(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function toRow(entry: Entry): string {
  return [entry.date, entry.kind, entry.category, String(entry.amount), entry.memo]
    .map(quoteCsvValue)
    .join(',');
}

export function createCsvExchange(options: CsvExchangeOptions): CsvExchange {
  function exportAll(today: string): Result<CsvFile> {
    if (!ISO_DATE.test(today)) {
      throw new RangeError(`今日の日付は YYYY-MM-DD の形で渡してください: ${today}`);
    }
    const entries = options.ledger.listAll();
    if (entries.length === 0) {
      return fail('NOT_FOUND', '出力する明細がありません');
    }
    const lines: string[] = [CSV_HEADER.join(',')];
    for (const entry of entries) {
      lines.push(toRow(entry));
    }
    const body = new TextEncoder().encode(lines.join(CRLF) + CRLF);
    const content = new Uint8Array(UTF8_BOM.length + body.length);
    content.set(UTF8_BOM, 0);
    content.set(body, UTF8_BOM.length);
    return ok({ fileName: `budget-entries-${today.replaceAll('-', '')}.csv`, content });
  }

  return { exportAll };
}
