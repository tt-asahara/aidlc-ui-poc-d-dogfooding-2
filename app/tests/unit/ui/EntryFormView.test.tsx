import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLedger } from '../../../src/domain/ledger';
import type { StoreSnapshot, StoreStatus } from '../../../src/domain/types';
import { createDataStore, STORAGE_KEY } from '../../../src/store/dataStore';
import { EntryFormView } from '../../../src/ui/EntryFormView';
import { FakeStorage, QuotaExceededStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

const TODAY = '2026-10-16';

function renderForm(storage = new FakeStorage(), storeStatus: StoreStatus = 'ready') {
  const store = createDataStore({ getStorage: () => storage, now: () => new Date(0) });
  store.load();
  const ledger = createLedger({ store });
  const user = userEvent.setup();
  render(<EntryFormView ledger={ledger} storeStatus={storeStatus} today={TODAY} />);
  return { storage, store, user };
}

function savedSnapshot(storage: FakeStorage): StoreSnapshot | null {
  const raw = storage.items.get(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoreSnapshot) : null;
}

const amountInput = () => screen.getByLabelText('金額（円）');
const categorySelect = () => screen.getByLabelText('カテゴリ');
const memoInput = () => screen.getByLabelText('メモ（任意）');
const submitButton = () => screen.getByRole('button', { name: '登録する' });

describe('EntryFormView', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('初期表示は区分「支出」、日付は今日、ほかは空で、各欄に見える見出しがある', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 2, name: '収支を登録' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '区分' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '支出' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '収入' })).not.toBeChecked();
    expect(screen.getByLabelText('日付')).toHaveValue(TODAY);
    expect(amountInput()).toHaveValue('');
    expect(categorySelect()).toHaveValue('');
    expect(memoInput()).toHaveValue('');
    expect(memoInput()).toHaveAttribute('maxLength', '100');
    expect(submitButton()).toBeEnabled();
  });

  it('カテゴリの選択肢は区分に合うものだけ（AC1.1.2）', async () => {
    const { user } = renderForm();
    const optionNames = () =>
      screen
        .getAllByRole('option')
        .map((option) => option.textContent)
        .slice(1);

    expect(optionNames()).toEqual([
      '食費',
      '住居費',
      '水道光熱費',
      '通信費',
      '日用品',
      '交通費',
      '娯楽',
      'その他支出',
    ]);
    await user.click(screen.getByRole('radio', { name: '収入' }));
    expect(optionNames()).toEqual(['給与', '副収入', 'その他収入']);
  });

  it('区分を切り替えると合わないカテゴリの選択を解除する（AC1.1.3）', async () => {
    const { user } = renderForm();
    await user.selectOptions(categorySelect(), '食費');

    await user.click(screen.getByRole('radio', { name: '収入' }));

    expect(categorySelect()).toHaveValue('');
  });

  it('登録に成功すると role=status で知らせ、金額とメモを空にして金額欄へ移る（AC1.1.1、BR1.5）', async () => {
    const { storage, user } = renderForm();
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-10-14' } });
    await user.type(amountInput(), '1280');
    await user.selectOptions(categorySelect(), '食費');
    await user.type(memoInput(), 'スーパー');

    await user.click(submitButton());

    expect(screen.getByRole('status')).toHaveTextContent('登録しました 10月14日 食費 ¥1,280');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(amountInput()).toHaveValue('');
    expect(memoInput()).toHaveValue('');
    expect(screen.getByRole('radio', { name: '支出' })).toBeChecked();
    expect(screen.getByLabelText('日付')).toHaveValue('2026-10-14');
    expect(amountInput()).toHaveFocus();
    expect(savedSnapshot(storage)?.entries).toHaveLength(1);
  });

  it('入力に誤りがあれば直す欄の名前をまとめて alert で出し、入力を残して最初の誤りの欄へ移る（W3）', async () => {
    const { storage, user } = renderForm();
    await user.type(amountInput(), '1,28o');

    await user.click(submitButton());

    expect(screen.getByRole('alert')).toHaveTextContent('入力を確かめてください: 金額、カテゴリ');
    expect(amountInput()).toHaveValue('1,28o');
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
    expect(amountInput()).toHaveFocus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(savedSnapshot(storage)).toBeNull();
  });

  it('保存に失敗したら失敗と再試行の方法を alert で出し、入力を残す。「登録しました」は出さない（AC7.3.1）', async () => {
    const { user } = renderForm(new QuotaExceededStorage());
    await user.type(amountInput(), '1280');
    await user.selectOptions(categorySelect(), '食費');
    await user.type(memoInput(), 'スーパー');

    await user.click(submitButton());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「登録する」を押してください',
    );
    expect(screen.queryByText(/登録しました/)).not.toBeInTheDocument();
    expect(amountInput()).toHaveValue('1280');
    expect(categorySelect()).toHaveValue('食費');
    expect(memoInput()).toHaveValue('スーパー');
  });

  it('別のタブが先に保存していたら BR4.4 の文言を出し、入力を残す', async () => {
    const { storage, user } = renderForm();
    storage.items.set(STORAGE_KEY, JSON.stringify(makeSnapshot([makeEntry()], 5)));
    await user.type(amountInput(), '980');
    await user.selectOptions(categorySelect(), '交通費');

    await user.click(submitButton());

    expect(screen.getByRole('alert')).toHaveTextContent(
      '別のタブで変更があったため保存できませんでした。最新の内容を読み込みました。もう一度「登録する」を押してください',
    );
    expect(amountInput()).toHaveValue('980');
    expect(savedSnapshot(storage)?.revision).toBe(5);
  });

  it('保存データが読めないときは「登録する」を押せず、理由を出す（BR4.2）', () => {
    renderForm(new FakeStorage(), 'unreadable');

    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '保存データを読み込めませんでした。データは消していません',
    );
    expect(submitButton()).toHaveAccessibleDescription(
      '保存データを読み込めませんでした。データは消していません',
    );
  });

  it('保存の直前に保存データが壊れていたら押せない状態にして理由を出す（STORE_UNREADABLE の防ぎ）', async () => {
    const { storage, user } = renderForm();
    storage.items.set(STORAGE_KEY, '{broken');
    await user.type(amountInput(), '1280');
    await user.selectOptions(categorySelect(), '食費');

    await user.click(submitButton());

    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('保存データを読み込めませんでした');
    expect(storage.items.get(STORAGE_KEY)).toBe('{broken');
  });

  it('メモの「<b>太字</b>」は書式にならず、文字のまま扱う（AC1.1.5、NFR4.1）', async () => {
    const { storage, user } = renderForm();
    await user.type(amountInput(), '500');
    await user.selectOptions(categorySelect(), '娯楽');
    await user.type(memoInput(), '<b>太字</b>');

    await user.click(submitButton());

    expect(document.querySelector('b')).toBeNull();
    expect(savedSnapshot(storage)?.entries[0]?.memo).toBe('<b>太字</b>');
  });
});
