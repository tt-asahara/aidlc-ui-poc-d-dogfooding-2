import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ENTRY_KINDS, isCategoryOfKind, listCategoryNames } from '../domain/categoryCatalog';
import { formatNoticeDate, formatYen } from '../domain/format';
import {
  ENTRY_FIELD_LABELS,
  MEMO_MAX_LENGTH,
  type EntryField,
  type Ledger,
} from '../domain/ledger';
import type { AppError } from '../domain/result';
import type { EntryKind, StoreStatus } from '../domain/types';

export interface EntryFormViewProps {
  readonly ledger: Pick<Ledger, 'add'>;
  readonly storeStatus: StoreStatus;
  /** AppShell が決めた今日（YYYY-MM-DD）。日付の初期値。 */
  readonly today: string;
}

type FormState = 'default' | 'success' | 'invalid' | 'storageError' | 'disabled';

interface Notice {
  readonly title: string;
  readonly body: string;
}

const FIELD_ORDER: readonly EntryField[] = ['kind', 'date', 'amount', 'category', 'memo'];
const LOCK_TITLE = '保存データを読み込めませんでした。';
const LOCK_BODY = 'データは消していません';

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

function NoticeBox({ tone, notice }: { tone: 'ok' | 'warn'; notice: Notice }): ReactNode {
  return (
    <div className={`notice ${tone}`}>
      <strong>{notice.title}</strong>
      {notice.body}
    </div>
  );
}

/** 「1 登録」: 収入・支出の明細を1件登録する（W2〜W4）。計算も保存もせず、Ledger に任せる。 */
export function EntryFormView({ ledger, storeStatus, today }: EntryFormViewProps) {
  const [kind, setKind] = useState<EntryKind>('支出');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [memo, setMemo] = useState('');
  const [formState, setFormState] = useState<FormState>('default');
  const [successNotice, setSuccessNotice] = useState<Notice | null>(null);
  const [errorNotice, setErrorNotice] = useState<Notice | null>(null);
  const [invalidFields, setInvalidFields] = useState<ReadonlySet<EntryField>>(new Set());
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

  function showFailure(error: AppError): void {
    setSuccessNotice(null);
    if (error.code === 'VALIDATION') {
      const fields = new Set(error.fieldErrors?.map((fieldError) => fieldError.field));
      const invalid = FIELD_ORDER.filter((field) => fields.has(field));
      setInvalidFields(new Set(invalid));
      setFormState('invalid');
      setErrorNotice({
        title: `入力を確かめてください: ${invalid.map((field) => ENTRY_FIELD_LABELS[field]).join('、')}`,
        body: '',
      });
      const first = invalid[0];
      if (first) {
        fieldRefs[first].current?.focus();
      }
      return;
    }
    if (error.code === 'STORE_UNREADABLE') {
      setErrorNotice(null);
      setFormState('disabled');
      return;
    }
    const notice = failureNotice(error);
    if (!notice) {
      throw new Error(`登録で想定していない結果です: ${error.code}`);
    }
    setInvalidFields(new Set());
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
    setErrorNotice(null);
    setInvalidFields(new Set());
    setFormState('success');
    setSuccessNotice({
      title: '登録しました',
      body: ` ${formatNoticeDate(entry.date)} ${entry.category} ${formatYen(entry.amount)}`,
    });
    // 区分と日付を残し、金額とメモを空にして金額欄へ移る（BR1.5）。
    setAmount('');
    setMemo('');
    amountRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (locked) {
      return;
    }
    try {
      submit();
    } catch (error) {
      setCrash({ error });
    }
  }

  const invalid = (field: EntryField) => (invalidFields.has(field) ? true : undefined);

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
        <fieldset>
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
                  data-testid={KIND_TEST_IDS[option]}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
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
              data-testid="entry-form-date"
            />
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
              aria-describedby="entry-amount-hint"
              data-testid="entry-form-amount"
            />
            <p className="hint" id="entry-amount-hint">
              1〜9,999,999 の整数
            </p>
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
            data-testid="entry-form-category"
          >
            <option value="">選んでください</option>
            {listCategoryNames(kind).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="entry-memo">メモ（任意）</label>
          <input
            ref={memoRef}
            id="entry-memo"
            type="text"
            maxLength={MEMO_MAX_LENGTH}
            autoComplete="off"
            placeholder="例: スーパー"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            aria-invalid={invalid('memo')}
            aria-describedby="entry-memo-hint"
            data-testid="entry-form-memo"
          />
          <p className="hint" id="entry-memo-hint">
            100 文字まで
          </p>
        </div>
        <button
          className="primary"
          type="submit"
          disabled={locked}
          aria-describedby={locked ? 'entry-form-lock-reason' : undefined}
          data-testid="entry-form-submit"
        >
          登録する
        </button>
      </form>
    </section>
  );
}
