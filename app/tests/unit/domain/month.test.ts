import { describe, expect, it } from 'vitest';
import {
  isValidMonth,
  monthOf,
  monthOfDate,
  nextMonth,
  previousMonth,
  shiftMonth,
  toIsoDate,
} from '../../../src/domain/month';

describe('month', () => {
  it('今日を含む月と今日の日付を地域の時刻で返す（AC3.1.4）', () => {
    const today = new Date(2026, 9, 16, 9, 30); // 2026年10月16日（地域の時刻）
    expect(monthOf(today)).toBe('2026-10');
    expect(toIsoDate(today)).toBe('2026-10-16');
  });

  it('2026-01 の前の月は 2025-12（AC3.1.3）', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
  });

  it('2025-12 の次の月は 2026-01（AC3.1.3）', () => {
    expect(nextMonth('2025-12')).toBe('2026-01');
  });

  it('年の途中の月は1つずつ増減する', () => {
    expect(previousMonth('2026-10')).toBe('2026-09');
    expect(nextMonth('2026-10')).toBe('2026-11');
    expect(shiftMonth('2026-10', -13)).toBe('2025-09');
    expect(monthOfDate('2026-10-14')).toBe('2026-10');
  });

  it('月の終わりと始まりでも、その日を含む月を返す', () => {
    expect(monthOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01');
    expect(monthOf(new Date(2025, 11, 31, 23, 59))).toBe('2025-12');
  });

  it('不正な入力は受け付けない', () => {
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(() => shiftMonth('2026-13', 1)).toThrow(RangeError);
    expect(() => shiftMonth('2026-10', 0.5)).toThrow(RangeError);
    expect(() => monthOfDate('2026/10/14')).toThrow(RangeError);
    expect(() => toIsoDate(new Date('not a date'))).toThrow(RangeError);
  });
});
