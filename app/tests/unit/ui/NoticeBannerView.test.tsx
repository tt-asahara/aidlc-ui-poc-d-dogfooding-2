import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoticeBannerView, type NoticeBannerViewProps } from '../../../src/ui/NoticeBannerView';

// 全体のお知らせ枠（U5 BR5.1〜BR5.4、W6、NFR2.1）。

function renderBanner(overrides: Partial<NoticeBannerViewProps> = {}) {
  const onDismissOtherTab = vi.fn();
  render(
    <NoticeBannerView
      storeStatus="ready"
      storageAvailable
      otherTabNotice={false}
      onDismissOtherTab={onDismissOtherTab}
      {...overrides}
    />,
  );
  return { onDismissOtherTab };
}

describe('NoticeBannerView', () => {
  it('知らせがないときは、空の2つの知らせの領域だけを置く（役割を持つ要素もボタンもない）', () => {
    renderBanner();

    expect(screen.getByTestId('notice-alert-region')).toBeEmptyDOMElement();
    expect(screen.getByTestId('notice-alert-region')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByTestId('notice-status-region')).toBeEmptyDOMElement();
    expect(screen.getByTestId('notice-status-region')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('読めないときは alert で理由と止めている操作を出し、閉じる操作は置かない（BR5.1）', () => {
    renderBanner({ storeStatus: 'unreadable' });

    const notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('data-testid', 'notice-corrupt');
    expect(notice).toHaveTextContent(
      '保存データの問題保存データを読み込めませんでした。データは消していません。登録・予算の保存・CSV の取り込みは、いまは使えません。',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('保存領域が使えないときは alert で、実際の動きに合わせた文言を出す（BR5.3、レビュー R-01）', () => {
    renderBanner({ storageAvailable: false });

    const notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('data-testid', 'notice-unavailable');
    expect(notice).toHaveTextContent(
      'このブラウザでは保存できません。登録などの操作をしても保存されません',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('別のタブの変更は status で出し、「閉じる」ボタンを付ける（BR5.2）', () => {
    renderBanner({ otherTabNotice: true });

    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('data-testid', 'notice-other-tab');
    expect(notice).toHaveTextContent('別のタブの変更');
    expect(notice).toHaveTextContent('別のタブで変更がありました。最新の内容を読み込みました');
    expect(screen.getByTestId('notice-other-tab-close')).toHaveTextContent('閉じる');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('重なったときは 読めない > 保存できない > 別のタブ の優先順で出す（BR5.4）', () => {
    const cases: {
      props: Partial<NoticeBannerViewProps>;
      expected: string[];
    }[] = [
      {
        props: { storeStatus: 'unreadable', storageAvailable: false, otherTabNotice: true },
        expected: ['notice-corrupt'],
      },
      { props: { storeStatus: 'unreadable', otherTabNotice: true }, expected: ['notice-corrupt'] },
      {
        props: { storageAvailable: false, otherTabNotice: true },
        expected: ['notice-unavailable', 'notice-other-tab'],
      },
      { props: { storageAvailable: false }, expected: ['notice-unavailable'] },
    ];
    for (const { props, expected } of cases) {
      const { unmount } = render(
        <NoticeBannerView
          storeStatus="ready"
          storageAvailable
          otherTabNotice={false}
          onDismissOtherTab={vi.fn()}
          {...props}
        />,
      );
      const shown = [...document.querySelectorAll('[data-testid^="notice-"][role]')].map((el) =>
        el.getAttribute('data-testid'),
      );
      expect(shown, JSON.stringify(props)).toEqual(expected);
      unmount();
    }
  });

  it('「閉じる」の名前は「別のタブの変更の知らせを閉じる」で、押すと閉じる処理を1回呼ぶ（W6、NFR2.1）', async () => {
    const { onDismissOtherTab } = renderBanner({ otherTabNotice: true });
    const user = userEvent.setup();

    const close = screen.getByRole('button', { name: '別のタブの変更の知らせを閉じる' });
    close.focus();
    await user.keyboard('{Enter}');

    expect(onDismissOtherTab).toHaveBeenCalledTimes(1);
  });
});
