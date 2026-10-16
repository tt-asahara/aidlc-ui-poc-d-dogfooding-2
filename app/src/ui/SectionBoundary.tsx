import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface SectionBoundaryProps {
  /** 記録に使う区切りの名前（利用者の入力は含めない）。 */
  readonly label: string;
  readonly testId: string;
  readonly children: ReactNode;
}

interface SectionBoundaryState {
  readonly hasError: boolean;
}

/**
 * 区切りごとの予想外の失敗の受け止め（Error Boundary）。1つの区切りで失敗しても、ほかの区切りは使える。
 * 詳しい内容はブラウザのコンソールにだけ出し、外部には送らない（security-design.md）。
 */
export class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  override state: SectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(`[budget-app] 予期しない失敗（${this.props.label}）`, error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="step" data-testid={this.props.testId}>
        <div className="notice warn" role="alert">
          <strong>問題が起きました。</strong>
          ページを再読み込みしてください。保存済みのデータは消えていません
        </div>
      </div>
    );
  }
}
