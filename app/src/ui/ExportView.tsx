import { useState } from 'react';
import type { CsvExchange } from '../domain/csvExchange';
import type { StoreStatus } from '../domain/types';
import type { DownloadFile } from './composition';

export interface ExportViewProps {
  readonly csv: Pick<CsvExchange, 'exportAll'>;
  readonly storeStatus: StoreStatus;
  /** AppShell が決めた今日（YYYY-MM-DD）。ファイル名に使う（BR3.4）。 */
  readonly today: string;
  /** 保存の知らせを受けるたびに増える番号。知らせを受けたらお知らせの文を消す（BR4.5）。 */
  readonly dataVersion: number;
  readonly download: DownloadFile;
}

interface ExportNotice {
  readonly message: string;
  /** お知らせを出したときの dataVersion。番号が変わったら表示しない。 */
  readonly version: number;
}

/** 「3 書き出し」: すべての明細を CSV に保存する（W6、BR3.5、BR3.6、BR4.6）。 */
export function ExportView({ csv, storeStatus, today, dataVersion, download }: ExportViewProps) {
  const [notice, setNotice] = useState<ExportNotice | null>(null);
  const [crash, setCrash] = useState<{ readonly error: unknown } | null>(null);

  if (crash) {
    // ボタンの処理の予想外の例外は、次の表示で Error Boundary に渡す（NFR 設計 R-03）。
    throw crash.error;
  }

  const unreadable = storeStatus === 'unreadable';
  const visibleNotice = notice && notice.version === dataVersion ? notice : null;

  function exportCsv(): void {
    const result = csv.exportAll(today);
    if (result.ok) {
      setNotice(null);
      download(result.value);
      return;
    }
    if (result.error.code === 'NOT_FOUND') {
      setNotice({ message: result.error.message, version: dataVersion });
      return;
    }
    throw new Error(`CSV の出力で想定していない結果です: ${result.error.code}`);
  }

  function handleExport(): void {
    if (unreadable) {
      return;
    }
    try {
      exportCsv();
    } catch (error) {
      setCrash({ error });
    }
  }

  return (
    <section className="step" aria-labelledby="csv-heading" data-testid="export-section">
      <p className="step-label">3 書き出し</p>
      <h2 id="csv-heading">CSV</h2>
      <div role="status" data-testid="export-status">
        {visibleNotice && (
          <div className="notice warn">
            <strong>{visibleNotice.message}</strong>
          </div>
        )}
      </div>
      <p>すべての明細を CSV ファイルに保存できます。</p>
      <p className="muted">
        CSV には明細だけが含まれ、予算は含まれません。形式:
        UTF-8、見出し「日付,区分,カテゴリ,金額,メモ」、日付は YYYY-MM-DD、金額は半角数字。
      </p>
      {unreadable && (
        <p className="notice warn" id="export-lock-reason" data-testid="export-lock-reason">
          保存データを読み込めないため、CSV に保存できません。データは消していません
        </p>
      )}
      <div className="row-actions">
        <button
          type="button"
          className="primary"
          onClick={handleExport}
          disabled={unreadable}
          aria-describedby={unreadable ? 'export-lock-reason' : undefined}
          data-testid="export-csv-button"
        >
          明細を CSV に保存
        </button>
        {/* 取り込みの置き場所（U4）。U1 では何も表示しない。 */}
      </div>
    </section>
  );
}
