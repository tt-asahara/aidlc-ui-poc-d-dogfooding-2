import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countGraphemes,
  isRealDate,
  isWithinGraphemes,
  truncateGraphemes,
} from '../../../src/domain/textRules';

// 文字と日付の規則の共有部品（U2 NFR5.1、NFR6.1、performance-design.md）。

/** 結合した家族の絵文字（見える1文字。UTF-16 で 11 単位）。 */
const FAMILY = '👨‍👩‍👧‍👦';
/** 肌の色の違いのある絵文字（見える1文字。UTF-16 で 4 単位）。 */
const THUMBS = '👍🏽';

/** 絵文字を含む、見える1文字でちょうど count 文字の文字列。 */
function emojiText(count: number): string {
  const parts = [FAMILY, THUMBS, 'あ', 'a'];
  return Array.from({ length: count }, (_, index) => parts[index % parts.length]).join('');
}

describe('textRules', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('うるう年を正しく判定する（2026-02-28 は実在、2026-02-29 は実在しない、2024-02-29 は実在）', () => {
    expect(isRealDate('2026-02-28')).toBe(true);
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
  });

  it('0000〜0099 年の日付も、その年として判定する（0050-01-01 は実在）', () => {
    expect(isRealDate('0050-01-01')).toBe(true);
    expect(isRealDate('0000-02-29')).toBe(true);
    expect(isRealDate('0001-02-29')).toBe(false);
  });

  it('YYYY-MM-DD の形でない値は実在しない日付として扱う', () => {
    expect(isRealDate('2026-1-05')).toBe(false);
    expect(isRealDate('2026/10/14')).toBe(false);
    expect(isRealDate(' 2026-10-14')).toBe(false);
    expect(isRealDate('')).toBe(false);
    expect(isRealDate(20261014)).toBe(false);
    expect(isRealDate(null)).toBe(false);
  });

  it('絵文字（結合した家族、肌の色）を見える1文字として数え、100 文字は以内、101 文字は超える', () => {
    const hundred = emojiText(100);
    const hundredOne = emojiText(101);

    expect(hundred.length).toBeGreaterThan(100);
    expect(countGraphemes(hundred)).toBe(100);
    expect(countGraphemes(FAMILY + THUMBS)).toBe(2);
    expect(countGraphemes('')).toBe(0);
    expect(isWithinGraphemes(hundred, 100)).toBe(true);
    expect(isWithinGraphemes(hundredOne, 100)).toBe(false);
  });

  it('長さ（UTF-16 の単位）が 100 以下なら Intl.Segmenter を作らず、初めて必要になったときに1つだけ作る', async () => {
    vi.resetModules();
    const construct = vi.spyOn(Intl, 'Segmenter');
    const rules = await import('../../../src/domain/textRules');

    expect(rules.isWithinGraphemes('あ'.repeat(100), 100)).toBe(true);
    expect(rules.truncateGraphemes('a'.repeat(100), 100)).toBe('a'.repeat(100));
    expect(construct).not.toHaveBeenCalled();

    expect(rules.isWithinGraphemes('あ'.repeat(101), 100)).toBe(false);
    expect(rules.isWithinGraphemes(emojiText(100), 100)).toBe(true);
    expect(construct).toHaveBeenCalledTimes(1);
  });

  it('先頭から見える1文字で N 文字に切り詰め、絵文字を途中で切らない', () => {
    const hundredOne = emojiText(101);

    const truncated = truncateGraphemes(hundredOne, 100);

    expect(truncated).toBe(emojiText(100));
    expect(countGraphemes(truncated)).toBe(100);
    expect(truncateGraphemes(`${FAMILY}${FAMILY}${THUMBS}`, 2)).toBe(`${FAMILY}${FAMILY}`);
    expect(truncateGraphemes('短いメモ', 100)).toBe('短いメモ');
  });

  it('数える上限を渡すと、上限を超えた時点で数えるのをやめる', () => {
    expect(countGraphemes(emojiText(300), 100)).toBe(101);
    expect(countGraphemes(emojiText(50), 100)).toBe(50);
  });

  it('1 万文字でも、上限を超えた時点で止まり、すぐに終わる（大きな貼り付け）', () => {
    const tenThousand = 'あ'.repeat(10_000);

    const started = performance.now();
    const count = countGraphemes(tenThousand, 100);
    const truncated = truncateGraphemes(tenThousand, 100);
    const within = isWithinGraphemes(tenThousand, 100);
    const elapsed = performance.now() - started;

    expect(count).toBe(101);
    expect(truncated).toBe('あ'.repeat(100));
    expect(within).toBe(false);
    expect(elapsed).toBeLessThan(100);
  });
});
