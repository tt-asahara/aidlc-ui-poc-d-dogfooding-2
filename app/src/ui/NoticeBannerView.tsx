import type { StoreStatus } from '../domain/types';

export interface NoticeBannerViewProps {
  readonly storeStatus: StoreStatus;
  readonly storageAvailable: boolean;
  /** 別のタブの変更の知らせ（BR5.2）を出すか。持ち主は AppShell。 */
  readonly otherTabNotice: boolean;
  /** 「閉じる」の処理（W6）。操作位置の移動も AppShell が行う。 */
  readonly onDismissOtherTab: () => void;
}

/** 文言は機能設計（frontend-components.md、rules.md BR5.1〜BR5.3）のとおり。 */
export const NOTICE_TEXT = {
  problemLabel: '保存データの問題',
  otherTabLabel: '別のタブの変更',
  corruptTitle: '保存データを読み込めませんでした。データは消していません。',
  corruptBody: '登録・予算の保存・CSV の取り込みは、いまは使えません。',
  unavailableTitle: 'このブラウザでは保存できません。登録などの操作をしても保存されません',
  otherTabTitle: '別のタブで変更がありました。最新の内容を読み込みました',
  otherTabClose: '閉じる',
  otherTabCloseName: '別のタブの変更の知らせを閉じる',
} as const;

/** BR5.4 の優先順で、alert の領域に出す知らせを決める（読めない > 保存できない）。 */
function alertNoticeOf(storeStatus: StoreStatus, storageAvailable: boolean) {
  if (storeStatus === 'unreadable') {
    return (
      <div className="notice warn app-notice" role="alert" data-testid="notice-corrupt">
        <span className="notice-label">{NOTICE_TEXT.problemLabel}</span>
        <strong>{NOTICE_TEXT.corruptTitle}</strong>
        {NOTICE_TEXT.corruptBody}
      </div>
    );
  }
  if (!storageAvailable) {
    return (
      <div className="notice warn app-notice" role="alert" data-testid="notice-unavailable">
        <span className="notice-label">{NOTICE_TEXT.problemLabel}</span>
        <strong>{NOTICE_TEXT.unavailableTitle}</strong>
      </div>
    );
  }
  return null;
}

/**
 * 全体のお知らせ枠（U5 BR5.1〜BR5.4、W6）。自分では状態を持たず、AppShell から受け取ったとおりに出す。
 *
 * 読み上げ機能が変化に気づくよう、知らせを入れる2つの領域（assertive と polite）をページを開いたときから
 * 空のまま置き、中身だけを入れ替える（NFR2.1）。役割（alert・status）は中に入れる知らせの要素に付ける
 * （詳細モックアップの枠と同じ形。空の alert・status の要素を常に置くと、ほかの区切りの知らせと見分けにくくなるため）。
 */
export function NoticeBannerView({
  storeStatus,
  storageAvailable,
  otherTabNotice,
  onDismissOtherTab,
}: NoticeBannerViewProps) {
  // 読めない間は、読めない知らせだけを出す（BR5.4）。
  const showOtherTab = otherTabNotice && storeStatus !== 'unreadable';
  return (
    <div className="banner" data-testid="notice-banner">
      <div aria-live="assertive" data-testid="notice-alert-region">
        {alertNoticeOf(storeStatus, storageAvailable)}
      </div>
      <div aria-live="polite" data-testid="notice-status-region">
        {showOtherTab ? (
          <div className="notice ok app-notice" role="status" data-testid="notice-other-tab">
            <span className="notice-label">{NOTICE_TEXT.otherTabLabel}</span>
            <div className="notice-row">
              <strong>{NOTICE_TEXT.otherTabTitle}</strong>
              <button
                type="button"
                className="notice-close"
                aria-label={NOTICE_TEXT.otherTabCloseName}
                onClick={onDismissOtherTab}
                data-testid="notice-other-tab-close"
              >
                {NOTICE_TEXT.otherTabClose}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
