/** 負の数に付ける記号（U+2212 MINUS SIGN）。BR2.4。 */
export const MINUS_SIGN = '−';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 金額を「¥」と3桁区切りで表す（BR2.6）。負の数は「−¥」と絶対値（BR2.4）。
 * 金額は円の整数だけを扱う。
 */
export function formatYen(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`金額は円の整数で渡してください: ${String(amount)}`);
  }
  const sign = amount < 0 ? MINUS_SIGN : '';
  return `${sign}¥${groupThousands(String(Math.abs(amount)))}`;
}

/** 「2026-10」を「2026年10月」にする。 */
export function formatMonthLabel(month: string): string {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new RangeError(`月は YYYY-MM の形で渡してください: ${month}`);
  }
  return `${match[1]}年${Number(match[2])}月`;
}

/** 「2026-10-14」を登録の知らせ用の「10月14日」にする（BR1.5）。 */
export function formatNoticeDate(date: string): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new RangeError(`日付は YYYY-MM-DD の形で渡してください: ${date}`);
  }
  return `${Number(match[2])}月${Number(match[3])}日`;
}
