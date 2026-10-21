import type { ComponentProps, ReactNode } from 'react';
import { Field, useField, type FieldProps } from './Field';
import styles from './Field.module.css';

export interface InputProps extends ComponentProps<'input'>, FieldProps {
  leadingIcon?: ReactNode;
}
export function Input({
  label,
  hint,
  error,
  leadingIcon,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const field = useField({ id, hint, error, describedBy });
  return (
    <Field {...field} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
      <div className={`${styles.inputRow} ${error ? styles.invalid : ''}`}>
        {leadingIcon && (
          <span className={styles.icon} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          {...props}
          id={field.id}
          aria-describedby={field.describedBy}
          aria-invalid={error ? true : props['aria-invalid']}
          className={`${styles.input} ${className}`}
        />
      </div>
    </Field>
  );
}
