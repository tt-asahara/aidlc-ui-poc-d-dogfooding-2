import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import type { StoreSnapshot } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { EntryFormView, SUBMIT_LOCK_MS } from '../../../src/ui/EntryFormView';
import { FakeStorage } from '../support/fakeStorage';

// U2 の登録フォーム（BR1.4〜BR1.7、BR2.1、NFR1.3、NFR2.1、NFR6.2）。
// 時計を進めるテストは fireEvent・act・vi.advanceTimersByTime だけで操作し、waitFor と遅延つきの userEvent は使わない。

const TODAY = '2026-10-16';

function renderForm(selectedMonth = '2026-10') {
  const storage = new FakeStorage();
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  const ledger = createLedger({ store });
  const add = vi.spyOn(ledger, 'add');
  const onSelectMonth = vi.fn();
  const view = render(
    <EntryFormView
      ledger={ledger}
      storeStatus="ready"
      today={TODAY}
      selectedMonth={selectedMonth}
      onSelectMonth={onSelectMonth}
    />,
  );
  return { storage, add, onSelectMonth, ...view };
}

function savedEntries(storage: FakeStorage): StoreSnapshot['entries'] {
  const raw = storage.items.get(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoreSnapshot).entries : [];
}

const dateInput = () => screen.getByLabelText('日付');
const amountInput = () => screen.getByLabelText('金額（円）');
const categorySelect = () => screen.getByLabelText('カテゴリ');
const memoInput = () => screen.getByLabelText('メモ（任意）');
const submitButton = () => screen.getByRole('button', { name: '登録する' });

function fill(values: { date?: string; amount?: string; category?: string; memo?: string }): void {
  if (values.date !== undefined) {
    fireEvent.change(dateInput(), { target: { value: values.date } });
  }
  if (values.amount !== undefined) {
    fireEvent.change(amountInput(), { target: { value: values.amount } });
  }
  if (values.category !== undefined) {
    fireEvent.change(categorySelect(), { target: { value: values.category } });
  }
  if (values.memo !== undefined) {
    fireEvent.change(memoInput(), { target: { value: values.memo } });
  }
}

/** フォームの送信（「登録する」のクリックと Enter のどちらも、この事象になる）。 */
function submitForm(): void {
  fireEvent.submit(screen.getByTestId('entry-form'));
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('EntryFormView（U2）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('誤りのまとめを alert で出し、欄の下に理由を出して aria で結び、最初の誤りの欄へ移る（AC1.2.1、BR1.5、NFR2.1）', () => {
    const { storage } = renderForm();
    fill({ date: '', amount: '1,28o' });

    fireEvent.click(submitButton());

    expect(screen.getByRole('alert')).toHaveTextContent(
      '入力を確かめてください: 日付、金額、カテゴリ',
    );
    expect(dateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(dateInput()).toHaveAccessibleDescription('日付を入力してください');
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
    expect(amountInput()).toHaveAccessibleDescription(
      '金額は 1〜9,999,999 の整数で入力してください。例: 1280',
    );
    expect(categorySelect()).toHaveAccessibleDescription('カテゴリを選んでください');
    expect(memoInput()).not.toHaveAttribute('aria-invalid');
    expect(amountInput()).toHaveValue('1,28o');
    expect(dateInput()).toHaveFocus();
    expect(savedEntries(storage)).toEqual([]);
  });

  it('誤りを直して登録すると、まとめと欄ごとの誤りの表示がすべて消える（AC1.2.5、BR1.6）', () => {
    const { storage } = renderForm();
    fill({ amount: '0', category: '食費' });
    fireEvent.click(submitButton());
    expect(
      screen.getByText('金額は 1〜9,999,999 の整数で入力してください。例: 1280'),
    ).toBeVisible();
    advance(SUBMIT_LOCK_MS);

    fill({ amount: '1280' });
    fireEvent.click(submitButton());

    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toHaveTextContent('登録しました 10月16日 食費 ¥1,280');
    expect(screen.queryByTestId('entry-amount-error')).not.toBeInTheDocument();
    expect(amountInput()).not.toHaveAttribute('aria-invalid');
    expect(amountInput()).toHaveAccessibleDescription('1〜9,999,999 の整数');
    expect(savedEntries(storage)).toHaveLength(1);
  });

  it('送信の鍵の境目: 1回目から 299 ミリ秒の操作は捨て、300 ミリ秒たてば受け付ける（AC1.1.4、BR1.7、NFR1.3）', () => {
    const { storage, add } = renderForm();
    fill({ amount: '1280', category: '食費' });
    submitForm();
    expect(savedEntries(storage)).toHaveLength(1);
    expect(submitButton()).toBeDisabled();

    advance(SUBMIT_LOCK_MS - 1);
    fill({ amount: '500' });
    submitForm();
    expect(add).toHaveBeenCalledTimes(1);
    expect(savedEntries(storage)).toHaveLength(1);
    expect(submitButton()).toBeDisabled();

    advance(1);
    expect(submitButton()).toBeEnabled();
    submitForm();
    expect(add).toHaveBeenCalledTimes(2);
    expect(savedEntries(storage)).toHaveLength(2);
  });

  it('鍵がある間の2回目の操作では表示が変わらず、成功の知らせが残る。外れたときにタイマーは残らない（AC1.1.4、BR1.7）', () => {
    const { add, unmount } = renderForm();
    fill({ amount: '1280', category: '食費' });
    fireEvent.click(submitButton());
    const statusText = screen.getByRole('status').textContent;

    // 成功のあとは金額が空。鍵がなければ VALIDATION で誤りの表示に置き換わるところ。
    submitForm();
    fireEvent.click(submitButton());

    expect(add).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(statusText ?? '');
    expect(screen.getByRole('status')).toHaveTextContent('登録しました');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(amountInput()).not.toHaveAttribute('aria-invalid');

    // アンマウントで鍵を外す予約を取り消す。そのあと時計を進めても、外れた部品の状態は更新しない。
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const timersBefore = vi.getTimerCount();
    unmount();
    expect(vi.getTimerCount()).toBeLessThan(timersBefore);
    advance(SUBMIT_LOCK_MS);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('メモは前後の空白を除いた値で数え、101 文字は 100 文字に切り詰めて「メモは 100 文字までです」と出す（BR1.4、R-05）', () => {
    renderForm();
    const leadingSpaces = `  ${'あ'.repeat(101)}`;

    fill({ memo: leadingSpaces });

    expect(memoInput()).toHaveValue('あ'.repeat(100));
    expect(memoInput()).toHaveAccessibleDescription('メモは 100 文字までです');
    expect(memoInput()).not.toHaveAttribute('maxLength');

    // 次の正しい入力で 100 文字以下になったら、欄の下の文を消す。末尾の空白は残す。
    fill({ memo: `${'あ'.repeat(99)} ` });
    expect(memoInput()).toHaveValue(`${'あ'.repeat(99)} `);
    expect(screen.queryByText('メモは 100 文字までです')).not.toBeInTheDocument();
    expect(memoInput()).toHaveAccessibleDescription('100 文字まで');
  });

  it('日本語の変換中は切り詰めず、変換の確定で切り詰める（NFR6.2、W4）', () => {
    renderForm();
    const composing = 'か'.repeat(105);

    fireEvent.compositionStart(memoInput());
    fireEvent.change(memoInput(), { target: { value: composing } });
    expect(memoInput()).toHaveValue(composing);
    expect(screen.queryByText('メモは 100 文字までです')).not.toBeInTheDocument();

    fireEvent.compositionEnd(memoInput());
    expect(memoInput()).toHaveValue('か'.repeat(100));
    expect(screen.getByText('メモは 100 文字までです')).toBeVisible();
  });

  it('改行を含む貼り付けは取り消して「メモに改行は使えません」と出し、改行のない貼り付けは止めない（AC1.2.4、BR1.4）', () => {
    renderForm();
    fill({ memo: 'スーパー' });
    const pasteOf = (text: string) => ({
      clipboardData: { getData: (type: string) => (type === 'text' ? text : '') },
    });

    const allowedWithBreak = fireEvent.paste(memoInput(), pasteOf('1行目\r\n2行目'));

    expect(allowedWithBreak).toBe(false);
    expect(memoInput()).toHaveValue('スーパー');
    expect(memoInput()).toHaveAccessibleDescription('メモに改行は使えません');
    expect(fireEvent.paste(memoInput(), pasteOf('まとめ買い'))).toBe(true);
  });

  it('表示中と同じ年の別の月で登録すると、その月へ切り替えを頼み「9月の明細として登録しました」と知らせる（AC1.3.1、BR2.1）', () => {
    const { onSelectMonth } = renderForm('2026-10');
    fill({ date: '2026-09-28', amount: '1650', category: '日用品', memo: '洗剤' });

    fireEvent.click(submitButton());

    expect(onSelectMonth).toHaveBeenCalledExactlyOnceWith('2026-09');
    expect(screen.getByRole('status')).toHaveTextContent(
      '9月の明細として登録しました 9月28日 日用品 ¥1,650',
    );
  });

  it('表示中と年の違う月で登録すると、年を付けて「2025年12月の明細として登録しました」と知らせる（BR2.1）', () => {
    const { onSelectMonth } = renderForm('2026-10');
    fill({ date: '2025-12-31', amount: '3000', category: '交通費' });

    fireEvent.click(submitButton());

    expect(onSelectMonth).toHaveBeenCalledExactlyOnceWith('2025-12');
    expect(screen.getByRole('status')).toHaveTextContent(
      '2025年12月の明細として登録しました 12月31日 交通費 ¥3,000',
    );
  });

  it('表示中と同じ月の日付で登録すると、表示月は変えずに「登録しました」と知らせる（AC1.3.2、BR2.1）', () => {
    const { onSelectMonth } = renderForm('2026-10');
    fill({ date: '2026-10-05', amount: '980', category: '交通費' });

    fireEvent.click(submitButton());

    expect(onSelectMonth).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('登録しました 10月5日 交通費 ¥980');
    expect(screen.getByRole('status')).not.toHaveTextContent('の明細として');
  });
});
