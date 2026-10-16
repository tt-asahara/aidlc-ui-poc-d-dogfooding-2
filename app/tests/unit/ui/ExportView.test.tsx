import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createCsvExchange, type CsvFile } from '../../../src/domain/csvExchange';
import { createLedger } from '../../../src/domain/ledger';
import type { Entry, StoreStatus } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { downloadFile } from '../../../src/ui/composition';
import { ExportView } from '../../../src/ui/ExportView';
import { FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

function renderExport(entries: readonly Entry[], storeStatus: StoreStatus = 'ready') {
  const storage = new FakeStorage();
  if (entries.length > 0) {
    storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot(entries)));
  }
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  const csv = createCsvExchange({ ledger: createLedger({ store }) });
  const download = vi.fn<(file: CsvFile) => void>();
  const props = { csv, storeStatus, today: '2026-10-16', download };
  const view = render(<ExportView {...props} dataVersion={0} />);
  return { ...view, props, download, user: userEvent.setup() };
}

const exportButton = () => screen.getByRole('button', { name: '明細を CSV に保存' });

describe('ExportView', () => {
  it('説明文に「CSV には明細だけが含まれ、予算は含まれません」と書く（AC5.1.5）', () => {
    renderExport([]);

    expect(screen.getByRole('heading', { level: 2, name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByText(/CSV には明細だけが含まれ、予算は含まれません。/)).toBeVisible();
  });

  it('明細が0件なら「出力する明細がありません」と知らせ、ファイルを作らない（AC5.1.4）', async () => {
    const { download, user } = renderExport([]);

    await user.click(exportButton());

    expect(screen.getByRole('status')).toHaveTextContent('出力する明細がありません');
    expect(download).not.toHaveBeenCalled();
  });

  it('明細があれば今日の日付のファイル名でダウンロードを1回呼ぶ（AC5.1.1）', async () => {
    const { download, user } = renderExport([makeEntry(), makeEntry({ date: '2026-09-01' })]);

    await user.click(exportButton());

    expect(download).toHaveBeenCalledTimes(1);
    const file = download.mock.calls[0]![0];
    expect(file.fileName).toBe('budget-entries-20261016.csv');
    expect([...file.content.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('保存データが読めないときは押せない状態にし、理由を出す（BR4.6）', () => {
    renderExport([makeEntry()], 'unreadable');

    expect(exportButton()).toBeDisabled();
    expect(
      screen.getByText(
        '保存データを読み込めないため、CSV に保存できません。データは消していません',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/出力する明細がありません/)).not.toBeInTheDocument();
  });

  it('保存の知らせ（committed）を受けると、出していたお知らせの文を消す（BR4.5）', async () => {
    const { user, rerender, props } = renderExport([]);
    await user.click(exportButton());
    expect(screen.getByRole('status')).toHaveTextContent('出力する明細がありません');

    rerender(<ExportView {...props} dataVersion={1} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('ダウンロードは Blob の一時的な URL を使い、通信をしない（downloadFile）', () => {
    vi.useFakeTimers();
    try {
      const createObjectURL = vi.fn(() => 'blob:local-test');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        expect(this.href).toBe('blob:local-test');
        expect(this.download).toBe('budget-entries-20261016.csv');
      });

      downloadFile({ fileName: 'budget-entries-20261016.csv', content: new Uint8Array([0xef]) });

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(click).toHaveBeenCalledTimes(1);
      expect(document.querySelector('a[download]')).toBeNull();
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-test');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
