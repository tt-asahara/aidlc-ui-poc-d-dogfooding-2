import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '../../../src/domain/result';
import { STORAGE_KEY } from '../../../src/store/dataStore';
import { AppShell } from '../../../src/ui/AppShell';
import { createAppServices, type AppServicesOptions } from '../../../src/ui/composition';
import { FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

/** 2026年10月16日 10:00（地域の時刻）を「今日」に固定する。 */
const fixedNow = () => new Date(2026, 9, 16, 10, 0);

function renderApp(storage = new FakeStorage(), options: AppServicesOptions = {}) {
  const services = createAppServices({
    getStorage: () => storage,
    now: fixedNow,
    download: vi.fn(),
    ...options,
  });
  render(<AppShell services={services} />);
  return { services, storage, user: userEvent.setup() };
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('起動すると今日を含む月を表示し、「1 登録」「2 確認」「3 書き出し」を順に並べる（AC3.1.4、NFR8.1）', async () => {
    const { user } = renderApp();

    expect(screen.getByRole('heading', { level: 1, name: '予算管理' })).toBeInTheDocument();
    expect(screen.getByTestId('review-month-label')).toHaveTextContent('2026年10月');
    expect(screen.getByLabelText('日付')).toHaveValue('2026-10-16');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '収支を登録',
      '月次集計',
      'CSV',
    ]);
    expect([...document.querySelectorAll('.step-label')].map((p) => p.textContent)).toEqual([
      '1 登録',
      '2 確認',
      '3 書き出し',
    ]);

    await user.click(screen.getByRole('link', { name: '本文へ移動' }));
    expect(screen.getByRole('heading', { level: 2, name: '収支を登録' })).toHaveFocus();
  });

  it('保存データの読み込み結果ごとに、empty・ready・unreadable を画面に伝える（W1、BR4.2）', () => {
    const readyStorage = new FakeStorage();
    readyStorage.items.set(
      STORAGE_KEY,
      JSON.stringify(makeSnapshot([makeEntry({ date: '2026-10-02', amount: 4980 })])),
    );
    const ready = renderApp(readyStorage);
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥4,980');
    expect(ready.services.store.getStatus()).toBe('ready');
    cleanup();

    const empty = renderApp(new FakeStorage());
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥0');
    expect(empty.services.store.getStatus()).toBe('empty');
    cleanup();

    const corrupt = new FakeStorage();
    corrupt.items.set(STORAGE_KEY, '{broken');
    renderApp(corrupt);
    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
    expect(screen.getByText('保存データを読み込めないため、集計を表示できません')).toBeVisible();
    expect(screen.getByRole('button', { name: '明細を CSV に保存' })).toBeDisabled();
    expect(screen.queryByText(/明細がありません/)).not.toBeInTheDocument();
    expect(corrupt.items.get(STORAGE_KEY)).toBe('{broken');
  });

  it('サンプル投入の差し込み口が ok なら、その保存データを表示する（U5 の差し替えの形）', () => {
    const seedIfEmpty = vi.fn();
    renderApp(new FakeStorage(), {
      createSeeder: (store) => ({
        seedIfEmpty: seedIfEmpty.mockImplementation(() => {
          const committed = store.commit({
            expectedRevision: 0,
            entriesToAdd: [makeEntry({ date: '2026-10-03', category: '日用品', amount: 1650 })],
          });
          return committed.ok ? ok(committed.value) : committed;
        }),
      }),
    });

    expect(seedIfEmpty).toHaveBeenCalledWith('2026-10-16');
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥1,650');
  });

  it('サンプル投入の差し込み口が失敗しても、空のまま ready で続ける（U1 は知らせを出さない）', () => {
    renderApp(new FakeStorage(), {
      createSeeder: () => ({
        seedIfEmpty: () => fail('STORAGE_WRITE', 'このブラウザに保存できませんでした'),
      }),
    });

    expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled();
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥0');
    expect(screen.getByTestId('entry-form-alert')).toBeEmptyDOMElement();
  });

  it('登録の予想外の失敗は「1 登録」の区切りだけで受け止め、ほかの区切りは使える（NFR 設計 R-03）', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { services, user } = renderApp();
    vi.spyOn(services.ledger, 'add').mockImplementation(() => {
      throw new Error('予想外の失敗（テスト）');
    });

    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(screen.getByTestId('register-section-error')).toHaveTextContent(
      '問題が起きました。ページを再読み込みしてください。保存済みのデータは消えていません',
    );
    expect(screen.queryByRole('button', { name: '登録する' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '月次集計' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '明細を CSV に保存' })).toBeEnabled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('登録の成功（committed）と別のタブの先行（externalChange）で集計が更新される（W2、W4）', async () => {
    const { storage, user } = renderApp();
    await user.type(screen.getByLabelText('金額（円）'), '1280');
    await user.selectOptions(screen.getByLabelText('カテゴリ'), '食費');
    await user.click(screen.getByRole('button', { name: '登録する' }));
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥1,280');

    storage.items.set(
      STORAGE_KEY,
      JSON.stringify(makeSnapshot([makeEntry({ date: '2026-10-01', amount: 7000 })], 9)),
    );
    await user.type(screen.getByLabelText('金額（円）'), '500');
    // U2 の二重送信の防止（BR1.7）で、登録のあと 300 ミリ秒は「登録する」が押せない。押せるようになってから押す。
    await waitFor(() => expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(screen.getByRole('alert')).toHaveTextContent('別のタブで変更があったため');
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥7,000');
  });
});
