import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { BUDGET_FIELD_PREFIX, type Budget } from '../domain/budget';
import { listCategoryNames } from '../domain/categoryCatalog';
import { formatMonthLabel, formatYen } from '../domain/format';
import type { AppError } from '../domain/result';
import type { CategorySummary, MonthSummary, MonthlyBudget, StoreStatus } from '../domain/types';

export interface BudgetTableProps {
  readonly budget: Pick<Budget, 'saveMonth' | 'previewCopy' | 'copyFromPrevious'>;
  /** 表示中の月（YYYY-MM）。AppShell が持つ（C6）。 */
  readonly month: string;
  /** 表示中の月の集計（C5）。予算は差し込み口を通して Budget.getMonth の値が入っている。 */
  readonly summary: MonthSummary;
  readonly storeStatus: StoreStatus;
  /** 別のタブの変更を受け取るたびに 1 ずつ増える番号（AppState.externalChangeSeq）。 */
  readonly externalChangeSeq: number;
}

/** 画面の文言（rules.md の yaml と frontend-components.md のとおり）。 */
export const BUDGET_TEXT = {
  tableName: '支出カテゴリ別の予算と実績',
  unsavedHint: '「予算を保存」を押すまで、予算は保存されません',
  save: '予算を保存',
  copy: '前の月の予算をコピー',
  unset: '未設定',
  unsetGuideTitle: 'この月の予算はまだ設定されていません',
  unsetGuideBody: '予算欄に金額を入れると、実績との比較と残額が表示されます。',
  confirmHeading: '上書きの確認',
  confirmDirty: '保存していない予算の入力は失われます',
  overwrite: '上書きする',
  cancel: 'やめる',
  noPrevious: '前の月の予算がありません',
  otherTabCancelled: '別のタブで変更があったため、確認を取り消しました。もう一度操作してください',
  otherTabReplaced:
    '別のタブで変更があったため、保存していない予算の入力を最新の内容に置き換えました',
  saveStorageWrite:
    'このブラウザに保存できませんでした。入力内容は画面に残っています。空き容量を確かめてから、もう一度「予算を保存」を押してください',
  saveStale:
    '別のタブで変更があったため保存できませんでした。入力内容は画面に残っています。もう一度「予算を保存」を押してください',
  copyStorageWrite:
    'このブラウザに保存できませんでした。予算は変わっていません。空き容量を確かめてから、もう一度「前の月の予算をコピー」を押してください',
  copyStale:
    '別のタブで変更があったため写せませんでした。予算は変わっていません。もう一度「前の月の予算をコピー」を押してください',
} as const;

/** 「10月」の形（BR5.3、BR3.3 の文）。 */
function monthNumberLabel(month: string): string {
  return `${Number(month.slice(5, 7))}月`;
}

export function savedNoticeText(month: string): string {
  return `${monthNumberLabel(month)}の予算を保存しました`;
}

export function copiedNoticeText(month: string): string {
  return `前の月の予算を${monthNumberLabel(month)}に写しました`;
}

export function confirmText(month: string): string {
  return `${monthNumberLabel(month)}の予算を前の月の内容で上書きします`;
}

const EXPENSE_CATEGORIES = listCategoryNames('支出');

type BudgetInputs = Readonly<Record<string, string>>;

interface Notice {
  /** 成功と取り消しなどの案内は status、失敗とまとめは alert（rules.md BR1.2、BR5.1、BR5.3）。 */
  readonly role: 'status' | 'alert';
  readonly tone: 'ok' | 'warn';
  readonly text: string;
}

interface FormState {
  /** この入力値を作ったときの表示月と externalChangeSeq（作り直しのきっかけの判定に使う。BR4.3）。 */
  readonly month: string;
  readonly seq: number;
  readonly values: BudgetInputs;
  /** 入力値を作ったときの保存済みの予算（別のタブの変更の前に dirty だったかの判定に使う）。 */
  readonly baseline: BudgetInputs;
}

interface ConfirmState {
  /** 開いたときに未保存の入力があったか（添え書きを出す。BR3.3）。 */
  readonly dirty: boolean;
}

type Operation = 'save' | 'copy';

function emptyInputs(): Record<string, string> {
  return Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category, '']));
}

/** 保存済みの予算から欄の値を作る（未設定は空）。 */
function inputsOfBudgets(budgets: readonly MonthlyBudget[]): BudgetInputs {
  const inputs = emptyInputs();
  for (const budget of budgets) {
    inputs[budget.category] = String(budget.amount);
  }
  return inputs;
}

function inputsOfSummary(categories: readonly CategorySummary[]): BudgetInputs {
  const inputs = emptyInputs();
  for (const row of categories) {
    inputs[row.category] = row.budget === null ? '' : String(row.budget);
  }
  return inputs;
}

/** 未保存の入力があるか: 欄の値（前後の空白を除く）と保存済みの予算を比べる（BR4.3）。 */
function isDirty(values: BudgetInputs, saved: BudgetInputs): boolean {
  return EXPENSE_CATEGORIES.some(
    (category) => (values[category] ?? '').trim() !== (saved[category] ?? ''),
  );
}

/** VALIDATION の fieldErrors（budget:<カテゴリ名>）を、カテゴリ名ごとの理由にする。 */
function toFieldErrors(error: AppError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const fieldError of error.fieldErrors ?? []) {
    if (fieldError.field.startsWith(BUDGET_FIELD_PREFIX)) {
      errors[fieldError.field.slice(BUDGET_FIELD_PREFIX.length)] = fieldError.message;
    }
  }
  return errors;
}

/** 保存の失敗の文（BR5.1）。 */
function failureText(code: 'STORAGE_WRITE' | 'STALE_REVISION', operation: Operation): string {
  if (operation === 'save') {
    return code === 'STORAGE_WRITE' ? BUDGET_TEXT.saveStorageWrite : BUDGET_TEXT.saveStale;
  }
  return code === 'STORAGE_WRITE' ? BUDGET_TEXT.copyStorageWrite : BUDGET_TEXT.copyStale;
}

/** 文を最初の「。」で見出しと本文に分けて出す（ほかの区切りの知らせと同じ見た目）。 */
function NoticeBox({ notice }: { notice: Notice }): ReactNode {
  const cut = notice.text.indexOf('。');
  const title = cut < 0 ? notice.text : notice.text.slice(0, cut + 1);
  const body = cut < 0 ? '' : notice.text.slice(cut + 1);
  return (
    <div className={`notice ${notice.tone}`} role={notice.role} data-testid="budget-notice">
      <strong>{title}</strong>
      {body}
    </div>
  );
}

function RemainingCell({ row }: { row: CategorySummary }): ReactNode {
  if (row.remaining === null) {
    return <span className="muted">—</span>;
  }
  if (row.over) {
    // 色だけで伝えないよう「超過」の文字を出す（BR2.2、NFR2.1）。
    return <span className="over">超過 {formatYen(-row.remaining)}</span>;
  }
  return <>{formatYen(row.remaining)}</>;
}

/**
 * 予算の表（U3 W1〜W6、BR1.x〜BR5.x）。予算の規則は Budget に任せ、結果を表示するだけにする（NFR4.1）。
 *
 * 欄の入力値は、次のきっかけでだけ保存済みの予算で作り直す（BR4.3）。
 * (1) 表示月の変化、(2) 自分の保存・コピーの成功、(3) 自分の操作の結果でない externalChangeSeq の変化。
 * ほかの部品の保存（dataVersion の変化）では作り直さない。
 * 自分の保存・コピーが STALE_REVISION を返したら、commit を呼ぶ前の描画済みの externalChangeSeq + 1 を
 * 「無視する番号」として覚え、その番号への変化では作り直さずに印を消す（NFR 設計 R-03）。
 */
export function BudgetTable({
  budget,
  month,
  summary,
  storeStatus,
  externalChangeSeq,
}: BudgetTableProps) {
  const saved = useMemo(() => inputsOfSummary(summary.categories), [summary]);
  const [form, setForm] = useState<FormState>(() => ({
    month,
    seq: externalChangeSeq,
    values: saved,
    baseline: saved,
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [ignoreSeq, setIgnoreSeq] = useState<number | null>(null);
  // 別のタブの変更で確認の枠を閉じたときに、コピーのボタンへ操作位置を戻す合図。
  const [restoreCopyFocus, setRestoreCopyFocus] = useState(0);
  const [crash, setCrash] = useState<{ readonly error: unknown } | null>(null);

  const copyRef = useRef<HTMLButtonElement>(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  // 確認の枠が開いたら「上書きする」へ操作位置を移す（BR3.3、NFR2.2）。
  const focusOnMount = useCallback((element: HTMLButtonElement | null) => {
    element?.focus();
  }, []);

  useEffect(() => {
    // 枠の中にあった操作位置が失われたときだけ、コピーのボタンへ戻す。
    const active = document.activeElement;
    if (restoreCopyFocus > 0 && (active === null || active === document.body)) {
      copyRef.current?.focus();
    }
  }, [restoreCopyFocus]);

  if (crash) {
    // ボタンの処理の予想外の例外は、次の表示で Error Boundary（「2 確認」）に渡す。
    throw crash.error;
  }

  // 作り直しのきっかけ（BR4.3）。描画の中で状態を合わせる（表示月と番号の変化を見逃さない）。
  if (form.month !== month) {
    // (1) 表示月の変化: 入力と確認の枠と誤りを捨てる（BR4.1、W4）。
    setForm({ month, seq: externalChangeSeq, values: saved, baseline: saved });
    setFieldErrors({});
    setNotice(null);
    setConfirm(null);
    setIgnoreSeq(null);
  } else if (form.seq !== externalChangeSeq) {
    if (ignoreSeq === externalChangeSeq) {
      // 自分の STALE_REVISION の結果の知らせ: 入力を残し、印を消す（BR5.1）。
      setForm({ ...form, seq: externalChangeSeq, baseline: saved });
    } else {
      // (3) 別のタブの変更（BR4.2、W5）。
      if (confirm !== null) {
        setNotice({ role: 'status', tone: 'warn', text: BUDGET_TEXT.otherTabCancelled });
        setRestoreCopyFocus((count) => count + 1);
      } else if (isDirty(form.values, form.baseline)) {
        setNotice({ role: 'status', tone: 'warn', text: BUDGET_TEXT.otherTabReplaced });
      }
      setForm({ month, seq: externalChangeSeq, values: saved, baseline: saved });
      setFieldErrors({});
      setConfirm(null);
    }
    setIgnoreSeq(null);
  }

  if (storeStatus === 'unreadable') {
    // 保存データが読めないときは、表・欄・ボタンを出さない（BR5.2）。理由は ReviewView が出す。
    return null;
  }

  function run(action: () => void): void {
    try {
      action();
    } catch (error) {
      setCrash({ error });
    }
  }

  /** (2) 自分の保存・コピーの成功: 保存した値で欄を作り直す（BR4.3、BR5.3）。 */
  function adoptSaved(budgets: readonly MonthlyBudget[], text: string): void {
    const inputs = inputsOfBudgets(budgets);
    setForm((current) => ({ ...current, values: inputs, baseline: inputs }));
    setFieldErrors({});
    setNotice({ role: 'status', tone: 'ok', text });
  }

  function showValidation(error: AppError): void {
    const errors = toFieldErrors(error);
    setFieldErrors(errors);
    setNotice({ role: 'alert', tone: 'warn', text: error.message });
    const first = EXPENSE_CATEGORIES.find((category) => errors[category] !== undefined);
    if (first !== undefined) {
      inputRefs.current.get(first)?.focus();
    }
  }

  function showFailure(error: AppError, operation: Operation, seqAtCall: number): void {
    switch (error.code) {
      case 'VALIDATION':
        showValidation(error);
        return;
      case 'NOT_FOUND':
        // 前の月に予算がない（BR3.2）。データは変わらない。
        setNotice({ role: 'status', tone: 'warn', text: BUDGET_TEXT.noPrevious });
        return;
      case 'STORAGE_WRITE':
      case 'STALE_REVISION':
        // 入力は残す。成功の表示は出さない（BR5.1、NFR5.2）。
        setFieldErrors({});
        setNotice({ role: 'alert', tone: 'warn', text: failureText(error.code, operation) });
        if (error.code === 'STALE_REVISION') {
          setIgnoreSeq(seqAtCall + 1);
        }
        if (operation === 'copy') {
          copyRef.current?.focus();
        }
        return;
      case 'STORE_UNREADABLE':
        // storeStatus が unreadable になり、表の代わりに理由が出る（BR5.2）。
        setNotice(null);
        return;
      default:
        throw new Error(`予算の操作で想定していない結果です: ${error.code}`);
    }
  }

  function save(): void {
    const seqAtCall = externalChangeSeq;
    setConfirm(null);
    const result = budget.saveMonth(month, form.values);
    if (result.ok) {
      adoptSaved(result.value, savedNoticeText(month));
      return;
    }
    showFailure(result.error, 'save', seqAtCall);
  }

  function copyNow(): void {
    const seqAtCall = externalChangeSeq;
    const wasConfirming = confirm !== null;
    setConfirm(null);
    const result = budget.copyFromPrevious(month);
    if (result.ok) {
      adoptSaved(result.value, copiedNoticeText(month));
      if (wasConfirming) {
        copyRef.current?.focus();
      }
      return;
    }
    showFailure(result.error, 'copy', seqAtCall);
  }

  function startCopy(): void {
    const preview = budget.previewCopy(month);
    if (!preview.ok) {
      setConfirm(null);
      showFailure(preview.error, 'copy', externalChangeSeq);
      return;
    }
    const dirty = isDirty(form.values, saved);
    if (preview.value.targetHasBudgets || dirty) {
      // 上書きの確認（BR3.3）。画面中央のダイアログは使わず、ボタンの下に枠を出す。
      setNotice(null);
      setConfirm({ dirty });
      return;
    }
    copyNow();
  }

  function cancelConfirm(): void {
    setConfirm(null);
    copyRef.current?.focus();
  }

  function handleConfirmKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelConfirm();
    }
  }

  function changeValue(category: string, value: string): void {
    setForm((current) => ({ ...current, values: { ...current.values, [category]: value } }));
  }

  const hasSavedBudgets = summary.categories.some((row) => row.budget !== null);

  return (
    <div className="budget" data-testid="budget-table">
      {!hasSavedBudgets && (
        <div className="notice warn" data-testid="budget-unset-guide">
          <strong>{BUDGET_TEXT.unsetGuideTitle}</strong>
          {BUDGET_TEXT.unsetGuideBody}
        </div>
      )}
      <p className="hint budget-hint" data-testid="budget-unsaved-hint">
        {BUDGET_TEXT.unsavedHint}
      </p>
      <div aria-live="polite" data-testid="budget-status-region">
        {notice?.role === 'status' && <NoticeBox notice={notice} />}
      </div>
      <div aria-live="assertive" data-testid="budget-alert-region">
        {notice?.role === 'alert' && <NoticeBox notice={notice} />}
      </div>
      <table aria-label={BUDGET_TEXT.tableName} data-testid="review-category-table">
        <caption>
          {formatMonthLabel(month)}の{BUDGET_TEXT.tableName}
        </caption>
        <thead>
          <tr>
            <th scope="col">カテゴリ</th>
            <th scope="col" className="num">
              予算（円）
            </th>
            <th scope="col" className="num">
              実績
            </th>
            <th scope="col" className="num">
              残額
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.categories.map((row) => {
            const error = fieldErrors[row.category];
            const errorId = `budget-${row.category}-error`;
            return (
              <tr key={row.category}>
                <th scope="row">{row.category}</th>
                <td className="num budget-cell">
                  <input
                    ref={(element) => {
                      if (element) {
                        inputRefs.current.set(row.category, element);
                      } else {
                        inputRefs.current.delete(row.category);
                      }
                    }}
                    className="budget-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`${row.category}の予算（円）`}
                    placeholder={BUDGET_TEXT.unset}
                    value={form.values[row.category] ?? ''}
                    onChange={(event) => changeValue(row.category, event.target.value)}
                    aria-invalid={error !== undefined ? true : undefined}
                    aria-describedby={error !== undefined ? errorId : undefined}
                    data-testid={`budget-input-${row.category}`}
                  />
                  {row.budget === null && (
                    <span className="muted budget-unset">{BUDGET_TEXT.unset}</span>
                  )}
                  {error !== undefined && (
                    <p className="field-error" id={errorId} data-testid={errorId}>
                      {error}
                    </p>
                  )}
                </td>
                <td className="num">{formatYen(row.actual)}</td>
                <td className="num" data-testid={`budget-remaining-${row.category}`}>
                  <RemainingCell row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row-actions">
        <button
          type="button"
          className="primary"
          onClick={() => run(save)}
          data-testid="budget-save"
        >
          {BUDGET_TEXT.save}
        </button>
        <button
          type="button"
          ref={copyRef}
          onClick={() => run(startCopy)}
          data-testid="budget-copy"
        >
          {BUDGET_TEXT.copy}
        </button>
      </div>
      {confirm !== null && (
        <div
          className="confirm"
          role="group"
          aria-labelledby="budget-copy-confirm-heading"
          onKeyDown={handleConfirmKeyDown}
          data-testid="budget-copy-confirm"
        >
          <h3 id="budget-copy-confirm-heading">{BUDGET_TEXT.confirmHeading}</h3>
          <p>{confirmText(month)}</p>
          {confirm.dirty && (
            <p className="muted" data-testid="budget-copy-confirm-dirty">
              {BUDGET_TEXT.confirmDirty}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="primary"
              ref={focusOnMount}
              onClick={() => run(copyNow)}
              data-testid="budget-copy-overwrite"
            >
              {BUDGET_TEXT.overwrite}
            </button>
            <button type="button" onClick={cancelConfirm} data-testid="budget-copy-cancel">
              {BUDGET_TEXT.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
