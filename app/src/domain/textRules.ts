/**
 * 文字と日付の規則の共有部品（U2 NFR5.1、performance-design.md「規則の共有の設計」）。
 *
 * Ledger.validate（登録と CSV の取り込み）、validateSnapshot（保存データの検査）、登録フォームのメモ欄が、
 * 同じ関数で日付の実在と見える1文字（書記素）の数を判定する。どの部品にも依存しない、最も下の部品。
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD の形で、暦の上に実在する日付か（2026-02-30 などは偽）。0000〜0099 年も正しく判定する。 */
export function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Date.UTC は 0〜99 年を 1900 年代として扱うため、年・月・日をまとめて直接設定する
  // （1900 年はうるう年でないため、先に 1900 年代で作ると 0000-02-29 を誤って偽にする）。
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

let segmenter: Intl.Segmenter | null = null;

/** Intl.Segmenter は初めて必要になったときに1つだけ作る（NFR 設計レビュー R-01）。 */
function graphemeSegmenter(): Intl.Segmenter {
  segmenter ??= new Intl.Segmenter('ja', { granularity: 'grapheme' });
  return segmenter;
}

/**
 * 見える1文字（書記素）の数を数える。stopAfter を渡すと、その数を超えた時点で数えるのをやめ、
 * stopAfter + 1 を返す（1 万文字の貼り付けでも全体を数えない）。
 */
export function countGraphemes(text: string, stopAfter = Number.POSITIVE_INFINITY): number {
  if (text === '') {
    return 0;
  }
  const segments = graphemeSegmenter().segment(text)[Symbol.iterator]();
  let count = 0;
  while (!segments.next().done) {
    count += 1;
    if (count > stopAfter) {
      break;
    }
  }
  return count;
}

/**
 * 見える1文字で max 文字以内か。長さ（UTF-16 の単位）が max 以下なら、書記素の数も max 以下なので
 * Segmenter を使わずに真を返す。
 */
export function isWithinGraphemes(text: string, max: number): boolean {
  if (text.length <= max) {
    return true;
  }
  return countGraphemes(text, max) <= max;
}

/** 先頭から見える1文字で max 文字までを返す。max 文字以内ならそのまま返す。 */
export function truncateGraphemes(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  let count = 0;
  let end = 0;
  for (const { index, segment } of graphemeSegmenter().segment(text)) {
    if (count === max) {
      break;
    }
    count += 1;
    end = index + segment.length;
  }
  return text.slice(0, end);
}
