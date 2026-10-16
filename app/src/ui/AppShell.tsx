import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { monthOf, toIsoDate } from '../domain/month';
import type { AppState, StoreSnapshot, StoreStatus } from '../domain/types';
import type { AppServices } from './composition';
import { EntryFormView } from './EntryFormView';
import { ExportView } from './ExportView';
import { NoticeBannerView } from './NoticeBannerView';
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
  readonly storageAvailable: boolean;
  /** 起動の終わりに DataStore が持っていた内容（購読の開始後の再確認に使う）。 */
  readonly snapshot: StoreSnapshot | null;
}

const REGISTER_HEADING_ID = 'register-heading';

function storeStatusOf(services: AppServices): StoreStatus {
  return services.store.getStatus() === 'unreadable' ? 'unreadable' : 'ready';
}

/**
 * W1 起動: 今日を決め、保存データを読み、保存データがなければサンプル投入を呼ぶ（U5 W1 手順 4）。
 * 投入の成否にかかわらず、投入のあとに DataStore の状態と可用性を読み直してそろえる（U5 W1 手順 5）。
 */
function bootstrap(services: AppServices): Boot {
  const now = services.now();
  const today = toIsoDate(now);
  const loaded = services.store.load();
  if (loaded.ok && loaded.value.status === 'empty') {
    const seeded = services.seeder.seedIfEmpty(today);
    if (!seeded.ok) {
      // 空のまま（または別のタブの内容で）続ける。理由の種類だけを開発者用の記録に出す。
      console.warn('[budget-app] 初回のサンプル投入ができませんでした', seeded.error.code);
    }
  }
  return {
    today,
    initialMonth: monthOf(now),
    storeStatus: loaded.ok ? storeStatusOf(services) : 'unreadable',
    storageAvailable: services.store.getAvailability() === 'available',
    snapshot: services.store.getSnapshot(),
  };
}

function focusRegisterHeading(): boolean {
  const heading = document.getElementById(REGISTER_HEADING_ID);
  heading?.focus();
  return heading !== null;
}

function AppShellContent({ services }: AppShellProps) {
  const [boot] = useState(() => bootstrap(services));
  const [appState, setAppState] = useState<AppState>(() => ({
    selectedMonth: boot.initialMonth,
    storeStatus: boot.storeStatus,
    lastExternalChangeAt: null,
    storageAvailable: boot.storageAvailable,
  }));
  const [dataVersion, setDataVersion] = useState(0);
  // 別のタブの変更の知らせ（BR5.2）。externalChange で出し、「閉じる」か committed で消す。
  const [otherTabNotice, setOtherTabNotice] = useState(false);

  // DataStore の知らせを AppState に写し、画面部品へ伝える（BR4.5、U5 W3〜W5）。
  useEffect(() => {
    const unsubscribe = services.store.subscribe((event) => {
      if (event.type === 'unreadable') {
        setAppState((state) => ({ ...state, storeStatus: 'unreadable' }));
        return;
      }
      if (event.type === 'externalChange') {
        const changedAt = services.now().toISOString();
        setAppState((state) => ({ ...state, lastExternalChangeAt: changedAt }));
        setOtherTabNotice(true);
      } else {
        setOtherTabNotice(false);
      }
      setDataVersion((version) => version + 1);
    });
    // 起動から購読の開始までの間に変わった状態に合わせる（U5 W1 手順 7）。
    // 描画を重ねないよう、効果の本体ではなく直後の小さな処理（microtask）で読み直す。
    let active = true;
    queueMicrotask(() => {
      if (!active) {
        return;
      }
      if (storeStatusOf(services) === 'unreadable') {
        setAppState((state) => ({ ...state, storeStatus: 'unreadable' }));
      } else if (services.store.getSnapshot() !== boot.snapshot) {
        setDataVersion((version) => version + 1);
      }
    });
    // 停止の関数で必ず外し、二重に知らせを受けないようにする（security-design.md）。
    return () => {
      active = false;
      unsubscribe();
    };
  }, [services, boot]);

  const selectMonth = useCallback((month: string) => {
    setAppState((state) => ({ ...state, selectedMonth: month }));
  }, []);

  const dismissOtherTab = useCallback(() => {
    setOtherTabNotice(false);
    // 閉じたボタンは消えるため、操作位置を本文の先頭（「1 登録」の見出し）へ移す（W6）。
    focusRegisterHeading();
  }, []);

  function skipToMain(event: MouseEvent<HTMLAnchorElement>): void {
    if (focusRegisterHeading()) {
      event.preventDefault();
    }
  }

  return (
    <>
      <a
        className="skip"
        href={`#${REGISTER_HEADING_ID}`}
        onClick={skipToMain}
        data-testid="skip-link"
      >
        本文へ移動
      </a>
      <header className="app">
        <h1>予算管理</h1>
        <p>架空データで試す家計簿</p>
      </header>
      <SectionBoundary label="全体のお知らせ枠" testId="notice-banner-error">
        <NoticeBannerView
          storeStatus={appState.storeStatus}
          storageAvailable={appState.storageAvailable}
          otherTabNotice={otherTabNotice}
          onDismissOtherTab={dismissOtherTab}
        />
      </SectionBoundary>
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
