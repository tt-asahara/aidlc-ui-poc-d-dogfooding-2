import { describe, expect, it } from 'vitest';
import { formatMonthLabel, formatNoticeDate, formatYen } from '../../../src/domain/format';

describe('format', () => {
  it('金額に ¥ と3桁区切りを付ける（BR2.6）', () => {
    expect(formatYen(12800)).toBe('¥12,800');
    expect(formatYen(1280)).toBe('¥1,280');
    expect(formatYen(999)).toBe('¥999');
  });

  it('最大の合計 2,999,999,700 円も誤差なく表す（AC3.1.6）', () => {
    expect(formatYen(2_999_999_700)).toBe('¥2,999,999,700');
  });

  it('負の差額は「−¥」と絶対値で表す（BR2.4）', () => {
    expect(formatYen(-69220)).toBe('−¥69,220');
    expect(formatYen(-1)).toBe('−¥1');
  });

  it('0 は符号なしの ¥0 にする', () => {
    expect(formatYen(0)).toBe('¥0');
  });

  it('整数でない金額は受け付けない', () => {
    expect(() => formatYen(12.5)).toThrow(RangeError);
    expect(() => formatYen(Number.NaN)).toThrow(RangeError);
  });

  it('月名を「2026年10月」の形にする', () => {
    expect(formatMonthLabel('2026-10')).toBe('2026年10月');
    expect(formatMonthLabel('2026-01')).toBe('2026年1月');
    expect(() => formatMonthLabel('2026/10')).toThrow(RangeError);
  });

  it('登録の知らせの日付を「10月14日」の形にする（BR1.5）', () => {
    expect(formatNoticeDate('2026-10-14')).toBe('10月14日');
    expect(formatNoticeDate('2026-09-01')).toBe('9月1日');
    expect(() => formatNoticeDate('20261014')).toThrow(RangeError);
  });
});
