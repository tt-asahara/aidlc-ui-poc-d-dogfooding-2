import { describe, expect, it } from 'vitest';
import { createCsvExchange } from '../../../src/domain/csvExchange';
import type { Entry } from '../../../src/domain/types';
import { makeEntry, makeLargeEntries } from '../support/entries';

function exchangeOf(entries: readonly Entry[]) {
  // listAll の並び（古い順）は Ledger の責任。ここでは Ledger と同じ並びで渡す。
  const sorted = [...entries].sort((a, b) =>
    a.date === b.date ? a.addedOrder - b.addedOrder : a.date < b.date ? -1 : 1,
  );
  return createCsvExchange({ ledger: { listAll: () => sorted } });
}

function decode(content: Uint8Array): string {
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(content);
}

describe('CsvExchange.exportAll', () => {
  it('明細が0件なら NOT_FOUND を返し、ファイルを作らない（AC5.1.4）', () => {
    const result = exchangeOf([]).exportAll('2026-10-16');

    expect(result).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: '出力する明細がありません' },
    });
  });

  it('UTF-8 の BOM で始まり、改行は CRLF（AC5.1.2）', () => {
    const result = exchangeOf([makeEntry()]).exportAll('2026-10-16');

    const content = result.ok ? result.value.content : new Uint8Array();
    expect([...content.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = decode(content);
    expect(text.split('\r\n')).toHaveLength(3); // 見出し、1行、最後の改行のあとの空
    expect(text.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('見出しは「日付,区分,カテゴリ,金額,メモ」、日付は YYYY-MM-DD、金額は区切りなしの整数（AC5.1.2）', () => {
    const result = exchangeOf([
      makeEntry({ date: '2026-10-14', category: '食費', amount: 1280, memo: 'スーパー' }),
    ]).exportAll('2026-10-16');

    const lines = decode(result.ok ? result.value.content : new Uint8Array()).split('\r\n');
    expect(lines[0]).toBe('﻿日付,区分,カテゴリ,金額,メモ');
    expect(lines[1]).toBe('2026-10-14,支出,食費,1280,スーパー');
  });

  it('すべての明細を日付の古い順、同じ日付は追加した順に出す（AC5.1.1、BR3.1）', () => {
    const entries = [
      makeEntry({ date: '2026-10-14', addedOrder: 3, memo: 'c' }),
      makeEntry({ date: '2026-09-01', addedOrder: 9, memo: 'a' }),
      makeEntry({ date: '2026-10-14', addedOrder: 2, memo: 'b' }),
      ...Array.from({ length: 7 }, (_, index) =>
        makeEntry({ date: '2026-10-20', addedOrder: 10 + index, memo: `x${index}` }),
      ),
    ];

    const result = exchangeOf(entries).exportAll('2026-10-16');

    const text = decode(result.ok ? result.value.content : new Uint8Array());
    const memos = text
      .split('\r\n')
      .slice(1, -1)
      .map((line) => line.split(',')[4]);
    expect(memos).toEqual(['a', 'b', 'c', 'x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6']);
  });

  it('カンマとダブルクォートを含む値は囲み、中の " を "" にする（BR3.3）', () => {
    const result = exchangeOf([
      makeEntry({ date: '2026-10-01', memo: 'ランチ, 2人分', addedOrder: 1 }),
      makeEntry({ date: '2026-10-02', memo: '"特売"', addedOrder: 2 }),
      makeEntry({ date: '2026-10-03', memo: '改行なし', addedOrder: 3 }),
    ]).exportAll('2026-10-16');

    const lines = decode(result.ok ? result.value.content : new Uint8Array()).split('\r\n');
    expect(lines[1]).toBe('2026-10-01,支出,食費,1280,"ランチ, 2人分"');
    expect(lines[2]).toBe('2026-10-02,支出,食費,1280,"""特売"""');
    expect(lines[3]).toBe('2026-10-03,支出,食費,1280,改行なし');
  });

  it('ファイル名は出力した日の budget-entries-YYYYMMDD.csv（BR3.4）', () => {
    const result = exchangeOf([makeEntry()]).exportAll('2026-10-16');

    expect(result.ok && result.value.fileName).toBe('budget-entries-20261016.csv');
    expect(() => exchangeOf([makeEntry()]).exportAll('2026/10/16')).toThrow(RangeError);
  });

  it('<b> を含むメモは書き換えずにそのまま文字として出す（NFR4.2）', () => {
    const result = exchangeOf([makeEntry({ memo: '<b>太字</b>' })]).exportAll('2026-10-16');

    const lines = decode(result.ok ? result.value.content : new Uint8Array()).split('\r\n');
    expect(lines[1]).toBe('2026-10-14,支出,食費,1280,<b>太字</b>');
  });

  it('3,000 件の CSV を 1 秒以内に組み立てる（NFR1.4、3回の中央値）', () => {
    const exchange = exchangeOf(makeLargeEntries('2026-10'));
    const durations: number[] = [];

    for (let run = 0; run < 3; run += 1) {
      const started = performance.now();
      const result = exchange.exportAll('2026-10-16');
      durations.push(performance.now() - started);
      expect(result.ok && decode(result.value.content).split('\r\n')).toHaveLength(3002);
    }

    const median = [...durations].sort((a, b) => a - b)[1]!;
    console.info(`[NFR1.4] exportAll 3,000 件の中央値: ${median.toFixed(2)} ms`);
    expect(median).toBeLessThan(1000);
  });
});
