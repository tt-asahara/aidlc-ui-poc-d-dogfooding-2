import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type StorageLike } from '../../../src/store/dataStore';
import { AppShell } from '../../../src/ui/AppShell';
import {
  createAppServices,
  createBrowserAppServices,
  type AppServices,
  type AppServicesOptions,
} from '../../../src/ui/composition';
import { AccessDeniedStorage, FakeStorage } from '../support/fakeStorage';
import { makeEntry, makeSnapshot } from '../support/entries';

// AppShell の U5 の追加（W1 手順 4〜7、W3〜W6、BR3.1、BR5.1〜BR5.4）。
// 部品の境目（AppShell → SampleDataSeeder → Ledger → DataStore）は、本物の部品と偽の保存領域で確かめる。

/** 2026年10月16日 10:00（地域の時刻）を「今日」に固定する。 */
const fixedNow = () => new Date(2026, 9, 16, 10, 0);

const created: AppServices[] = [];

function renderApp(services: AppServices) {
  created.push(services);
  render(<AppShell services={services} />);
  return { services, user: userEvent.setup() };
}

function browserServices(options: AppServicesOptions = {}): AppServices {
  return createBrowserAppServices({ now: fixedNow, download: vi.fn(), ...options });
}

function otherTabSaves(storage: StorageLike, value: string | null): void {
  act(() => {
    window.dispatchEvent(
      Object.assign(new Event('storage'), {
        key: STORAGE_KEY,
        newValue: value,
        storageArea: storage,
      }),
    );
  });
}

describe('AppShell（U5）', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    for (const services of created.splice(0)) {
      services.dispose();
    }
    window.localStorage.clear();
  });

  it('初めて開くと、ブラウザの組み立てがサンプルを入れ、今月の集計が出る（AC7.1.1、NFR8.1）', () => {
    renderApp(browserServices());

    expect(screen.getByTestId('review-month-label')).toHaveTextContent('2026年10月');
    expect(screen.getByTestId('review-income')).toHaveTextContent('¥280,000');
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥156,780');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(saved).toMatchObject({ revision: 1 });
    expect(saved.entries).toHaveLength(54);
    expect(screen.getByTestId('notice-alert-region')).toBeEmptyDOMElement();
    expect(screen.getByTestId('notice-status-region')).toBeEmptyDOMElement();
  });

  it('投入の失敗のあとは DataStore を読み直して状態をそろえる（STORE_UNREADABLE は読めない、STALE_REVISION は別のタブの内容）', () => {
    // 保存直前の読み直しで、壊れた保存データを見つけた。
    const corrupt = new FakeStorage();
    renderApp(
      browserServices({
        getStorage: () => corrupt,
        createSeeder: (store) => ({
          seedIfEmpty: () => {
            corrupt.items.set(STORAGE_KEY, '{broken');
            return store.commit({ expectedRevision: 0, initialize: makeSnapshot([], 0) });
          },
        }),
      }),
    );
    expect(screen.getByTestId('notice-corrupt')).toBeVisible();
    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
    expect(corrupt.items.get(STORAGE_KEY)).toBe('{broken');
    cleanup();

    // 別のタブが先にサンプルを入れていた。そのタブの内容を使い、別のタブの知らせは出さない（起動中の知らせは使わない）。
    const shared = new FakeStorage();
    renderApp(
      browserServices({
        getStorage: () => shared,
        createSeeder: (store) => ({
          seedIfEmpty: () => {
            shared.items.set(
              STORAGE_KEY,
              JSON.stringify(makeSnapshot([makeEntry({ date: '2026-10-05', amount: 3333 })], 1)),
            );
            return store.commit({ expectedRevision: 0, initialize: makeSnapshot([], 0) });
          },
        }),
      }),
    );
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥3,333');
    expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled();
    expect(screen.queryByTestId('notice-other-tab')).not.toBeInTheDocument();
  });

  it('保存領域が使えないときは知らせを出し、操作は止めず、登録は保存できないと伝える（BR3.1、BR5.3）', async () => {
    const { user } = renderApp(browserServices({ getStorage: () => new AccessDeniedStorage() }));

    expect(screen.getByTestId('notice-unavailable')).toHaveTextContent(
      'このブラウザでは保存できません。登録などの操作をしても保存されません',
    );
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥0');
    await user.type(screen.getByLabelText('金額（円）'), '1280');
    await user.selectOptions(screen.getByLabelText('カテゴリ'), '食費');
    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(screen.getByTestId('entry-form-alert')).toHaveTextContent(
      'このブラウザに保存できませんでした',
    );
    expect(screen.getByTestId('notice-unavailable')).toBeVisible();
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥0');
  });

  it('別のタブの変更で知らせが出て集計が変わり、入力中の値は消えず、「閉じる」で消える（W3、W6、BR2.2、BR5.2）', async () => {
    const storage = new FakeStorage();
    const { user } = renderApp(
      createAppServices({ getStorage: () => storage, now: fixedNow, download: vi.fn() }),
    );
    await user.type(screen.getByLabelText('金額（円）'), '777');

    otherTabSaves(
      storage,
      JSON.stringify(makeSnapshot([makeEntry({ date: '2026-10-02', amount: 4980 })], 1)),
    );

    expect(screen.getByTestId('notice-other-tab')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('notice-other-tab')).toHaveTextContent(
      '別のタブで変更がありました。最新の内容を読み込みました',
    );
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥4,980');
    expect(screen.getByLabelText('金額（円）')).toHaveValue('777');

    await user.click(screen.getByRole('button', { name: '別のタブの変更の知らせを閉じる' }));
    expect(screen.queryByTestId('notice-other-tab')).not.toBeInTheDocument();
  });

  it('自分の保存（committed）で別のタブの知らせが消え、読めない値の知らせでは読めない知らせだけになる（W4、W5、BR5.4）', async () => {
    const storage = new FakeStorage();
    const { user } = renderApp(
      createAppServices({ getStorage: () => storage, now: fixedNow, download: vi.fn() }),
    );
    const otherTab = makeSnapshot([makeEntry({ date: '2026-10-02', amount: 4980 })], 1);
    storage.items.set(STORAGE_KEY, JSON.stringify(otherTab));
    otherTabSaves(storage, JSON.stringify(otherTab));
    expect(screen.getByTestId('notice-other-tab')).toBeVisible();

    await user.type(screen.getByLabelText('金額（円）'), '1000');
    await user.selectOptions(screen.getByLabelText('カテゴリ'), '食費');
    await user.click(screen.getByRole('button', { name: '登録する' }));
    expect(screen.getByTestId('entry-form-status')).toHaveTextContent('登録しました');
    expect(screen.getByTestId('review-expense')).toHaveTextContent('¥5,980');
    expect(screen.queryByTestId('notice-other-tab')).not.toBeInTheDocument();

    otherTabSaves(storage, JSON.stringify(otherTab));
    expect(screen.getByTestId('notice-other-tab')).toBeVisible();
    otherTabSaves(storage, '{"schemaVersion":1,"entries":"x"}');

    expect(screen.getByTestId('notice-corrupt')).toBeVisible();
    expect(screen.queryByTestId('notice-other-tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
  });

  it('「閉じる」のあとは操作位置が「1 登録」の見出しへ移る（W6、NFR2.1）', async () => {
    const storage = new FakeStorage();
    const { user } = renderApp(
      createAppServices({ getStorage: () => storage, now: fixedNow, download: vi.fn() }),
    );
    otherTabSaves(storage, JSON.stringify(makeSnapshot([makeEntry()], 1)));

    const close = screen.getByTestId('notice-other-tab-close');
    close.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('heading', { level: 2, name: '収支を登録' })).toHaveFocus();
    expect(screen.queryByTestId('notice-other-tab')).not.toBeInTheDocument();
  });
});
