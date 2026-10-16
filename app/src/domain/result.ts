/**
 * C1 共通の結果の形。予想できる失敗は例外ではなく結果の値で返す。
 * 予想していない失敗（プログラムの誤り）だけが例外になる。
 */

export type AppErrorCode =
  | 'VALIDATION'
  | 'STORAGE_WRITE'
  | 'STALE_REVISION'
  | 'STORE_UNREADABLE'
  | 'NOT_FOUND'
  | 'FILE_REJECTED';

/** VALIDATION のときの欄ごとの理由。field は date | kind | category | amount | memo | budget:<カテゴリ名>。 */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface AppError {
  readonly code: AppErrorCode;
  /** 画面にそのまま出せる日本語の文。 */
  readonly message: string;
  /** code が VALIDATION のときだけ持つ。 */
  readonly fieldErrors?: readonly FieldError[];
}

export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  code: AppErrorCode,
  message: string,
  fieldErrors?: readonly FieldError[],
): Result<T> {
  const error: AppError = fieldErrors ? { code, message, fieldErrors } : { code, message };
  return { ok: false, error };
}
