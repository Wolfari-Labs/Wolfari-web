import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

export function useField({
  id,
  hint,
  error,
  describedBy,
}: {
  id?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  describedBy?: string | undefined;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return {
    id: fieldId,
    hintId,
    errorId,
    describedBy: [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

export function Field({
  label,
  hint,
  error,
  id,
  hintId,
  errorId,
  children,
}: FieldProps & {
  id: string;
  hintId: string | undefined;
  errorId: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
