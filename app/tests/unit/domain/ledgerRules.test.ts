import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger, ENTRY_FIELD_MESSAGES } from '../../../src/domain/ledger';
import type { Result } from '../../../src/domain/result';
import { buildSampleInputs } from '../../../src/domain/sampleDataSeeder';
import type { EntryInput, ValidatedEntry } from '../../../src/domain/types';
import { validateSnapshot } from '../../../src/domain/validateSnapshot';
import { createDataStore } from '../../../src/store/dataStore';
import { makeSnapshot } from '../support/entries';
import { FakeStorage } from '../support/fakeStorage';

// U2 で仕上げた入力の規則（BR1.1〜BR1.4、BR4.1、NFR5.1、NFR5.2）。

const validInput: EntryInput = {
  kind: '支出',
  date: '2026-10-14',
  amount: '1280',
  category: '食費',
  memo: 'スーパー',
};

/** 見える1文字でちょうど count 文字の、絵文字を含むメモ。 */
function emojiMemo(count: number): string {
  const parts = ['👨‍👩‍👧‍👦', '👍🏽', 'あ', 'a'];
  return Array.from({ length: count }, (_, index) => parts[index % parts.length]).join('');
}

function setup() {
  const store = createDataStore({ getStorage: () => new FakeStorage(), now: () => new Date(0) });
  store.load();
  return createLedger({ store });
}

function errorsOf(result: Result<ValidatedEntry>): { field: string; message: string }[] {
  return result.ok ? [] : [...(result.error.fieldErrors ?? [])];
}

describe('Ledger.validate の規則（U2）', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it.each(['0', '-500', '12.5', '10000000', '1,28o', ''])(
    '金額「%s」は登録せず、金額欄の理由はいつも同じ文（AC1.2.1、BR1.1）',
    (amount) => {
      const result = setup().validate({ ...validInput, amount });

      expect(errorsOf(result)).toEqual([
        { field: 'amount', message: '金額は 1〜9,999,999 の整数で入力してください。例: 1280' },
      ]);
    },
  );

  it('金額 1 と 9999999 は登録できる（AC1.2.2）', () => {
    const ledger = setup();

    expect(ledger.validate({ ...validInput, amount: '1' })).toMatchObject({
      ok: true,
      value: { amount: 1 },
    });
    expect(ledger.validate({ ...validInput, amount: 9_999_999 })).toMatchObject({
      ok: true,
      value: { amount: 9_999_999 },
    });
  });

  it('日付が空なら「日付を入力してください」、2026-02-30 なら「存在する日付を…」（AC1.2.3、BR1.2）', () => {
    const ledger = setup();

    expect(errorsOf(ledger.validate({ ...validInput, date: '' }))).toEqual([
      { field: 'date', message: '日付を入力してください' },
    ]);
    expect(errorsOf(ledger.validate({ ...validInput, date: '2026-02-30' }))).toEqual([
      { field: 'date', message: '存在する日付を入力してください。例: 2026-10-14' },
    ]);
    expect(errorsOf(ledger.validate({ ...validInput, date: '2026/10/14' }))).toEqual([
      { field: 'date', message: ENTRY_FIELD_MESSAGES.dateNotReal },
    ]);
  });

  it('日付の範囲は制限しない（2000-01-01 と 2030-12-31 は登録できる。AC1.2.3）', () => {
    const ledger = setup();

    expect(ledger.validate({ ...validInput, date: '2000-01-01' }).ok).toBe(true);
    expect(ledger.validate({ ...validInput, date: '2030-12-31' }).ok).toBe(true);
    expect(ledger.validate({ ...validInput, date: '2024-02-29' }).ok).toBe(true);
  });

  it('メモは見える1文字で数え、絵文字を含む 100 文字は通り、101 文字は「メモは 100 文字までです」（AC1.2.4）', () => {
    const ledger = setup();

    expect(ledger.validate({ ...validInput, memo: emojiMemo(100) })).toMatchObject({
      ok: true,
      value: { memo: emojiMemo(100) },
    });
    expect(ledger.validate({ ...validInput, memo: `  ${emojiMemo(100)}  ` }).ok).toBe(true);
    expect(errorsOf(ledger.validate({ ...validInput, memo: emojiMemo(101) }))).toEqual([
      { field: 'memo', message: 'メモは 100 文字までです' },
    ]);
  });

  it('改行を含むメモは「メモに改行は使えません」（AC1.2.4、BR1.4）', () => {
    const ledger = setup();

    expect(errorsOf(ledger.validate({ ...validInput, memo: '1行目\n2行目' }))).toEqual([
      { field: 'memo', message: 'メモに改行は使えません' },
    ]);
    expect(errorsOf(ledger.validate({ ...validInput, memo: '1行目\r2行目' }))).toEqual([
      { field: 'memo', message: 'メモに改行は使えません' },
    ]);
  });

  it('fieldErrors は区分・日付・金額・カテゴリ・メモの順で、区分に合わないカテゴリは「選び直して」（BR1.3、BR1.5）', () => {
    const ledger = setup();

    const all = ledger.validate({
      kind: '',
      date: '2026-02-30',
      amount: '',
      category: '',
      memo: 'あ\nい',
    });
    const mismatch = ledger.validate({ ...validInput, kind: '収入', category: '食費' });

    expect(errorsOf(all)).toEqual([
      { field: 'kind', message: '区分を選んでください' },
      { field: 'date', message: '存在する日付を入力してください。例: 2026-10-14' },
      { field: 'amount', message: '金額は 1〜9,999,999 の整数で入力してください。例: 1280' },
      { field: 'category', message: 'カテゴリを選んでください' },
      { field: 'memo', message: 'メモに改行は使えません' },
    ]);
    expect(!all.ok && all.error).toMatchObject({
      code: 'VALIDATION',
      message: '入力を確かめてください',
    });
    expect(errorsOf(mismatch)).toEqual([
      { field: 'category', message: 'カテゴリを選び直してください' },
    ]);
  });

  it('U5 のサンプルの明細は、3つの「今日」のどれでも全件が U2 の規則を通る（BR4.1、NFR5.2）', () => {
    const ledger = setup();

    for (const today of ['2026-10-16', '2026-03-01', '2024-02-29']) {
      const inputs = buildSampleInputs(today);
      const failures = inputs.filter((input) => !ledger.validate(input).ok);

      expect(inputs.length).toBeGreaterThan(0);
      expect(failures).toEqual([]);
    }
  });

  it('Ledger.validate を通った境界の明細は、保存データの検査（validateSnapshot）も通る（NFR5.1）', () => {
    const ledger = setup();
    const boundaryInputs: EntryInput[] = [
      { ...validInput, amount: '1', memo: emojiMemo(100) },
      { ...validInput, amount: '9999999', memo: `  ${emojiMemo(100)}  ` },
      { ...validInput, date: '2026-02-28', memo: '' },
      { ...validInput, date: '2024-02-29', kind: '収入', category: '給与' },
      { ...validInput, date: '0050-01-01' },
    ];

    const validated = boundaryInputs.map((input) => ledger.validate(input));
    const entries = ledger.assignIdentities(
      validated.map((result) => {
        if (!result.ok) {
          throw new Error(`境界の明細が通りませんでした: ${JSON.stringify(result.error)}`);
        }
        return result.value;
      }),
      [],
    );

    expect(validateSnapshot(makeSnapshot(entries))).toEqual({ ok: makeSnapshot(entries) });
    // 逆に、Ledger.validate で落ちる値は、保存データの検査でも落ちる（判定がそろっている）。
    const rejected = [
      ...entries.slice(1),
      { ...entries[0]!, date: '2026-02-29' },
      { ...entries[0]!, entryId: 'x-1', addedOrder: 99, memo: emojiMemo(101) },
    ];
    expect(ledger.validate({ ...validInput, date: '2026-02-29' }).ok).toBe(false);
    expect(validateSnapshot(makeSnapshot(rejected))).toHaveProperty('reason');
  });
});
