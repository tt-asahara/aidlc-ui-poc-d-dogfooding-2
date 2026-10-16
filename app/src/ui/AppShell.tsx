import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { monthOf, toIsoDate } from '../domain/month';
import type { AppState, StoreStatus } from '../domain/types';
import type { AppServices } from './composition';
import { EntryFormView } from './EntryFormView';
import { ExportView } from './ExportView';
import { ReviewView } from './ReviewView';
import { SectionBoundary } from './SectionBoundary';

export interface AppShellProps {
  readonly services: AppServices;
}

interface Boot {
  /** 今日（YYYY-MM-DD）。AppShell が1か所で決める（BR2.1、BR3.4）。 */
  readonly today: string;
  readonly initialMonth: string;
  readonly storeStatus: StoreStatus;
}

/** W1 起動: 今日を決め、保存データを読み、保存データがなければサンプル投入の差し込み口を呼ぶ。 */
function bootstrap(services: AppServices): Boot {
  const now = services.now();
  const today = toIsoDate(now);
  const loaded = services.store.load();
  let storeStatus: StoreStatus = 'ready';
  if (!loaded.ok || loaded.value.status === 'unreadable') {
    storeStatus = 'unreadable';
  } else if (loaded.value.status === 'empty') {
    const seeded = services.seeder.seedIfEmpty(today);
    if (!seeded.ok) {
      // 空のまま ready で続ける。失敗の知らせは U5 の全体のお知らせ枠が出す（C9）。
      console.warn('[budget-app] 初回のサンプル投入ができませんでした', seeded.error.code);
    }
    // ok のときは DataStore の今の内容をそのまま使う（画面は最初の表示で読み直す）。
  }
  return { today, initialMonth: monthOf(now), storeStatus };
}

function AppShellContent({ services }: AppShellProps) {
  const [boot] = useState(() => bootstrap(services));
  const [appState, setAppState] = useState<AppState>(() => ({
    selectedMonth: boot.initialMonth,
    storeStatus: boot.storeStatus,
    lastExternalChangeAt: null,
  }));
  const [dataVersion, setDataVersion] = useState(0);

  // DataStore の知らせを AppState に写し、画面部品へ伝える（BR4.5）。
  useEffect(
    () =>
      services.store.subscribe((event) => {
        if (event.type === 'unreadable') {
          setAppState((state) => ({ ...state, storeStatus: 'unreadable' }));
          return;
        }
        if (event.type === 'externalChange') {
          const changedAt = services.now().toISOString();
          setAppState((state) => ({ ...state, lastExternalChangeAt: changedAt }));
        }
        setDataVersion((version) => version + 1);
      }),
    [services],
  );

  const selectMonth = useCallback((month: string) => {
    setAppState((state) => ({ ...state, selectedMonth: month }));
  }, []);

  function skipToMain(event: MouseEvent<HTMLAnchorElement>): void {
    const heading = document.getElementById('register-heading');
    if (heading) {
      event.preventDefault();
      heading.focus();
    }
  }

  return (
    <>
      <a className="skip" href="#register-heading" onClick={skipToMain} data-testid="skip-link">
        本文へ移動
      </a>
      <header className="app">
        <h1>予算管理</h1>
        <p>架空データで試す家計簿</p>
      </header>
      {/* 全体のお知らせ枠の置き場所（U5 の NoticeBannerView）。U1 では何も表示しない。 */}
      <main id="main">
        <SectionBoundary label="1 登録" testId="register-section-error">
          <EntryFormView
            ledger={services.ledger}
            storeStatus={appState.storeStatus}
            today={boot.today}
          />
        </SectionBoundary>
        <SectionBoundary label="2 確認" testId="review-section-error">
          <ReviewView
            summary={services.summary}
            month={appState.selectedMonth}
            storeStatus={appState.storeStatus}
            dataVersion={dataVersion}
            onSelectMonth={selectMonth}
          />
        </SectionBoundary>
        <SectionBoundary label="3 書き出し" testId="export-section-error">
          <ExportView
            csv={services.csv}
            storeStatus={appState.storeStatus}
            today={boot.today}
            dataVersion={dataVersion}
            download={services.download}
          />
        </SectionBoundary>
      </main>
    </>
  );
}

/** アプリ全体。最も外側の Error Boundary で囲み、起動や組み立ての失敗でも画面を真っ白にしない。 */
export function AppShell({ services }: AppShellProps) {
  return (
    <SectionBoundary label="アプリ全体" testId="app-error">
      <AppShellContent services={services} />
    </SectionBoundary>
  );
}
