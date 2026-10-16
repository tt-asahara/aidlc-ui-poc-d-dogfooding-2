/** 月（YYYY-MM）と日付（YYYY-MM-DD）の計算。「今日」は利用しているパソコンの地域の時刻で決める（BR2.1）。 */

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad4(value: number): string {
  return String(value).padStart(4, '0');
}

/** 地域の時刻で、その時点の日付（YYYY-MM-DD）を返す。 */
export function toIsoDate(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('日時が不正です');
  }
  return `${pad4(now.getFullYear())}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 地域の時刻で、その時点を含む月（YYYY-MM）を返す（BR2.1）。 */
export function monthOf(now: Date): string {
  return toIsoDate(now).slice(0, 7);
}

/** 日付（YYYY-MM-DD）の月（YYYY-MM）を返す。 */
export function monthOfDate(date: string): string {
  const month = date.slice(0, 7);
  if (!isValidMonth(month) || date.length !== 10) {
    throw new RangeError(`日付は YYYY-MM-DD の形で渡してください: ${date}`);
  }
  return month;
}

export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

/** 月を delta か月ずらす。年をまたいでも正しい月にする（BR2.2）。 */
export function shiftMonth(month: string, delta: number): string {
  const match = MONTH_PATTERN.exec(month);
  if (!match || !Number.isInteger(delta)) {
    throw new RangeError(`月は YYYY-MM の形、ずらす数は整数で渡してください: ${month}, ${delta}`);
  }
  const monthIndex = Number(match[1]) * 12 + (Number(match[2]) - 1) + delta;
  const year = Math.floor(monthIndex / 12);
  const monthNumber = monthIndex - year * 12 + 1;
  return `${pad4(year)}-${pad2(monthNumber)}`;
}

export function previousMonth(month: string): string {
  return shiftMonth(month, -1);
}

export function nextMonth(month: string): string {
  return shiftMonth(month, 1);
}
