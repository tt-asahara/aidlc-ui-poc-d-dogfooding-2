import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { ENTRY_KINDS, isCategoryOfKind, listCategoryNames } from '../domain/categoryCatalog';
import { formatMonthLabel, formatNoticeDate, formatYen } from '../domain/format';
import {
  ENTRY_FIELD_LABELS,
  ENTRY_FIELD_MESSAGES,
  MEMO_MAX_LENGTH,
  type EntryField,
  type Ledger,
} from '../domain/ledger';
import { monthOfDate } from '../domain/month';
import type { AppError } from '../domain/result';
import { isWithinGraphemes, truncateGraphemes } from '../domain/textRules';
import type { Entry, EntryKind, StoreStatus } from '../domain/types';

/** 送信の鍵を保持する時間（BR1.7、AC1.1.4）。この間の2回目の操作は捨てる。 */
export const SUBMIT_LOCK_MS = 300;

export interface EntryFormViewProps {
  readonly ledger: Pick<Ledger, 'add'>;
  readonly storeStatus: StoreStatus;
  /** AppShell が決めた今日（YYYY-MM-DD）。日付の初期値。 */
  readonly today: string;
  /** 表示中の月（YYYY-MM）。渡されないときは、登録した明細の月と比べずに同じ月として扱う。 */
  readonly selectedMonth?: string;
  /** 表示中と別の月の明細を登録したときに、その月への切り替えを AppShell に頼む（BR2.1）。 */
  readonly onSelectMonth?: (month: string) => void;
}

type FormState = 'default' | 'success' | 'invalid' | 'storageError' | 'disabled';

interface Notice {
  readonly title: string;
  readonly body: string;
}

type FieldErrors = Partial<Record<EntryField, string>>;

const FIELD_ORDER: readonly EntryField[] = ['kind', 'date', 'amount', 'category', 'memo'];
const LOCK_TITLE = '保存データを読み込めませんでした。';
const LOCK_BODY = 'データは消していません';
const LINE_BREAK = /[\r\n]/;

/** 欄の下の誤りの文の id（`<欄の id>-error`。NFR2.1）。 */
const ERROR_IDS: Record<EntryField, string> = {
  kind: 'entry-kind-error',
  date: 'entry-date-error',
  amount: 'entry-amount-error',
  category: 'entry-category-error',
  memo: 'entry-memo-error',
};

const KIND_TEST_IDS: Record<EntryKind, string> = {
  支出: 'entry-form-kind-expense',
  収入: 'entry-form-kind-income',
};

function failureNotice(error: AppError): Notice | null {
  switch (error.code) {
    case 'STORAGE_WRITE':
      return {
        title: 'このブラウザに保存できませんでした。',
        body: '入力内容は画面に残っています。空き容量を確かめてから、もう一度「登録する」を押してください',
      };
    case 'STALE_REVISION':
      return {
        title: '別のタブで変更があったため保存できませんでした。',
        body: '最新の内容を読み込みました。もう一度「登録する」を押してください',
      };
    default:
      return null;
  }
}

/** VALIDATION の fieldErrors を、欄の並び（区分・日付・金額・カテゴリ・メモ）の欄ごとの理由にする。 */
function toFieldErrors(error: AppError): FieldErrors {
  const errors: FieldErrors = {};
  for (const fieldError of error.fieldErrors ?? []) {
    const field = FIELD_ORDER.find((name) => name === fieldError.field);
    if (field && errors[field] === undefined) {
      errors[field] = fieldError.message;
    }
  }
  return errors;
}

/**
 * 登録の知らせ（BR2.1）。表示中と同じ月なら「登録しました」、別の月なら「N月の明細として登録しました」。
 * 年が違うときは「YYYY年N月の明細として登録しました」と年を付ける。
 */
function successNoticeOf(entry: Entry, selectedMonth: string | undefined): Notice {
  const body = ` ${formatNoticeDate(entry.date)} ${entry.category} ${formatYen(entry.amount)}`;
  const entryMonth = monthOfDate(entry.date);
  if (selectedMonth === undefined || entryMonth === selectedMonth) {
    return { title: '登録しました', body };
  }
  const sameYear = entryMonth.slice(0, 4) === selectedMonth.slice(0, 4);
  const label = sameYear ? `${Number(entryMonth.slice(5, 7))}月` : formatMonthLabel(entryMonth);
  return { title: `${label}の明細として登録しました`, body };
}

function NoticeBox({ tone, notice }: { tone: 'ok' | 'warn'; notice: Notice }): ReactNode {
  return (
    <div className={`notice ${tone}`}>
      <strong>{notice.title}</strong>
      {notice.body}
    </div>
  );
}

/** 欄の下の誤りの文（BR1.5）。色だけで伝えないよう、文を出す。 */
function FieldErrorText({ id, message }: { id: string; message: string | undefined }): ReactNode {
  if (message === undefined) {
    return null;
  }
  return (
    <p className="field-error" id={id} data-testid={id}>
      {message}
    </p>
  );
}

/**
 * 「1 登録」: 収支の明細を1件登録する（U1 W2〜W4、U2 W1〜W4）。
 * 入力の規則は Ledger.validate の1か所に任せ、結果（C1 の VALIDATION と fieldErrors）を表示するだけにする（NFR4.2）。
 * メモ欄の入力時の切り詰めは表示を助けるためのもので、最終の判定は Ledger.validate が行う。
 */
export function EntryFormView({
  ledger,
  storeStatus,
  today,
  selectedMonth,
  onSelectMonth,
}: EntryFormViewProps) {
  const [kind, setKind] = useState<EntryKind>('支出');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [memo, setMemo] = useState('');
  const [formState, setFormState] = useState<FormState>('default');
  const [successNotice, setSuccessNotice] = useState<Notice | null>(null);
  const [errorNotice, setErrorNotice] = useState<Notice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [memoNotice, setMemoNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [crash, setCrash] = useState<{ readonly error: unknown } | null>(null);

  const kindRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const memoRef = useRef<HTMLInputElement>(null);
  const fieldRefs = {
    kind: kindRef,
    date: dateRef,
    amount: amountRef,
    category: categoryRef,
    memo: memoRef,
  };
  // 送信の鍵（BR1.7）。画面の状態とは別の同期の印にして、同じ描画の間の2回目の操作も確実に捨てる。
  const submitLockRef = useRef(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 日本語の変換中か（NFR6.2）。変換中はメモの文字数で切り詰めない。
  const composingRef = useRef(false);

  // 部品が外れるときに、送信の鍵を外す予約を取り消す（NFR 設計レビュー R-02）。
  useEffect(
    () => () => {
      if (submitTimerRef.current !== null) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      submitLockRef.current = false;
    },
    [],
  );

  if (crash) {
    // ボタンの処理の予想外の例外は、次の表示で Error Boundary に渡す（NFR 設計 R-03）。
    throw crash.error;
  }

  const locked = storeStatus === 'unreadable' || formState === 'disabled';

  function changeKind(next: EntryKind): void {
    setKind(next);
    if (category !== '' && !isCategoryOfKind(category, next)) {
      setCategory(''); // 区分に合わない選択を解除する（BR1.3、AC1.1.3）
    }
  }

  /** 鍵が立っていなければ立てて、300 ミリ秒後に外す予約をする。立っていれば偽を返す（BR1.7）。 */
  function acquireSubmitLock(): boolean {
    if (submitLockRef.current) {
      return false;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    submitTimerRef.current = setTimeout(() => {
      submitLockRef.current = false;
      submitTimerRef.current = null;
      setSubmitting(false);
    }, SUBMIT_LOCK_MS);
    return true;
  }

  function showValidation(error: AppError): void {
    const errors = toFieldErrors(error);
    const invalid = FIELD_ORDER.filter((field) => errors[field] !== undefined);
    setFieldErrors(errors);
    setFormState('invalid');
    setErrorNotice({
      title: `入力を確かめてください: ${invalid.map((field) => ENTRY_FIELD_LABELS[field]).join('、')}`,
      body: '',
    });
    const first = invalid[0];
    if (first) {
      fieldRefs[first].current?.focus();
    }
  }

  function showFailure(error: AppError): void {
    setSuccessNotice(null);
    if (error.code === 'VALIDATION') {
      showValidation(error);
      return;
    }
    setFieldErrors({});
    if (error.code === 'STORE_UNREADABLE') {
      setErrorNotice(null);
      setFormState('disabled');
      return;
    }
    const notice = failureNotice(error);
    if (!notice) {
      throw new Error(`登録で想定していない結果です: ${error.code}`);
    }
    setFormState('storageError');
    setErrorNotice(notice);
  }

  function submit(): void {
    const result = ledger.add({ kind, date, amount, category, memo });
    if (!result.ok) {
      showFailure(result.error);
      return;
    }
    const entry = result.value;
    // まとめと欄ごとの誤りの表示をすべて消し、成功の知らせだけを出す（BR1.6）。
    setErrorNotice(null);
    setFieldErrors({});
    setMemoNotice(null);
    setFormState('success');
    setSuccessNotice(successNoticeOf(entry, selectedMonth));
    const entryMonth = monthOfDate(entry.date);
    if (selectedMonth !== undefined && entryMonth !== selectedMonth) {
      onSelectMonth?.(entryMonth); // 別の月なら表示をその月に切り替える（BR2.1）
    }
    // 区分と日付を残し、金額とメモを空にして金額欄へ移る（U1 BR1.5）。
    setAmount('');
    setMemo('');
    amountRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (locked) {
      return;
    }
    // 鍵がある間の操作は、検証も保存もせず、表示も変えずに捨てる（BR1.7、NFR5.3）。
    if (!acquireSubmitLock()) {
      return;
    }
    try {
      submit();
    } catch (error) {
      setCrash({ error });
    }
  }

  /**
   * メモ欄の制限（BR1.4、W4）。前後の空白を除いた値を見える1文字で数え、100 文字を超えたら
   * 先頭から 100 文字に切り詰めて知らせる。100 文字以内なら値をそのまま受け取る（末尾の空白も残す）。
   */
  function applyMemoLimit(raw: string): void {
    const trimmed = raw.trim();
    if (isWithinGraphemes(trimmed, MEMO_MAX_LENGTH)) {
      setMemo(raw);
      setMemoNotice(null);
      return;
    }
    setMemo(truncateGraphemes(trimmed, MEMO_MAX_LENGTH));
    setMemoNotice(ENTRY_FIELD_MESSAGES.memoTooLong);
  }

  function changeMemo(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    const nativeComposing =
      'isComposing' in event.nativeEvent && event.nativeEvent.isComposing === true;
    if (composingRef.current || nativeComposing) {
      setMemo(value); // 変換中は数えずにそのまま受け取る（NFR6.2）
      return;
    }
    applyMemoLimit(value);
  }

  function startMemoComposition(): void {
    composingRef.current = true;
  }

  function endMemoComposition(event: CompositionEvent<HTMLInputElement>): void {
    composingRef.current = false;
    applyMemoLimit(event.currentTarget.value); // 変換の確定で同じ判定をする
  }

  function pasteMemo(event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData('text');
    if (LINE_BREAK.test(pasted)) {
      // 改行を含む貼り付けは取り消し、値は変えない（BR1.4）。
      event.preventDefault();
      setMemoNotice(ENTRY_FIELD_MESSAGES.memoLineBreak);
    }
  }

  const invalid = (field: EntryField) => (fieldErrors[field] !== undefined ? true : undefined);
  const describedBy = (field: EntryField, hintId?: string) =>
    fieldErrors[field] !== undefined ? ERROR_IDS[field] : hintId;
  const memoMessage = fieldErrors.memo ?? memoNotice ?? undefined;

  return (
    <section className="step" aria-labelledby="register-heading" data-testid="register-section">
      <p className="step-label">1 登録</p>
      <h2 id="register-heading" tabIndex={-1}>
        収支を登録
      </h2>
      <div role="status" data-testid="entry-form-status">
        {successNotice && <NoticeBox tone="ok" notice={successNotice} />}
      </div>
      <div role="alert" data-testid="entry-form-alert">
        {locked ? (
          <div className="notice warn" id="entry-form-lock-reason">
            <strong>{LOCK_TITLE}</strong>
            {LOCK_BODY}
          </div>
        ) : (
          errorNotice && <NoticeBox tone="warn" notice={errorNotice} />
        )}
      </div>
      <form onSubmit={handleSubmit} noValidate data-testid="entry-form">
        <fieldset aria-describedby={describedBy('kind')}>
          <legend>区分</legend>
          <div className="seg">
            {ENTRY_KINDS.map((option, index) => (
              <label key={option}>
                <input
                  ref={index === 0 ? kindRef : undefined}
                  type="radio"
                  name="kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => changeKind(option)}
                  aria-invalid={invalid('kind')}
                  data-testid={KIND_TEST_IDS[option]}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <FieldErrorText id={ERROR_IDS.kind} message={fieldErrors.kind} />
        </fieldset>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="entry-date">日付</label>
            <input
              ref={dateRef}
              id="entry-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={invalid('date')}
              aria-describedby={describedBy('date')}
              data-testid="entry-form-date"
            />
            <FieldErrorText id={ERROR_IDS.date} message={fieldErrors.date} />
          </div>
          <div className="field">
            <label htmlFor="entry-amount">金額（円）</label>
            <input
              ref={amountRef}
              id="entry-amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="例: 1280"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={invalid('amount')}
              aria-describedby={describedBy('amount', 'entry-amount-hint')}
              data-testid="entry-form-amount"
            />
            {fieldErrors.amount === undefined ? (
              <p className="hint" id="entry-amount-hint">
                1〜9,999,999 の整数
              </p>
            ) : (
              <FieldErrorText id={ERROR_IDS.amount} message={fieldErrors.amount} />
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="entry-category">カテゴリ</label>
          <select
            ref={categoryRef}
            id="entry-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-invalid={invalid('category')}
            aria-describedby={describedBy('category')}
            data-testid="entry-form-category"
          >
            <option value="">選んでください</option>
            {listCategoryNames(kind).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <FieldErrorText id={ERROR_IDS.category} message={fieldErrors.category} />
        </div>
        <div className="field">
          <label htmlFor="entry-memo">メモ（任意）</label>
          <input
            ref={memoRef}
            id="entry-memo"
            type="text"
            autoComplete="off"
            placeholder="例: スーパー"
            value={memo}
            onChange={changeMemo}
            onCompositionStart={startMemoComposition}
            onCompositionEnd={endMemoComposition}
            onPaste={pasteMemo}
            aria-invalid={invalid('memo')}
            aria-describedby={memoMessage === undefined ? 'entry-memo-hint' : ERROR_IDS.memo}
            data-testid="entry-form-memo"
          />
          {/* 入力中の切り詰めと改行の知らせも読み上げで伝わるよう、置き場所を常に置く。 */}
          <div aria-live="polite">
            {memoMessage === undefined ? (
              <p className="hint" id="entry-memo-hint">
                100 文字まで
              </p>
            ) : (
              <FieldErrorText id={ERROR_IDS.memo} message={memoMessage} />
            )}
          </div>
        </div>
        <button
          className="primary"
          type="submit"
          disabled={locked || submitting}
          aria-describedby={locked ? 'entry-form-lock-reason' : undefined}
          data-testid="entry-form-submit"
        >
          登録する
        </button>
      </form>
    </section>
  );
}
