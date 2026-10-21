import type { ComponentProps } from 'react';
import { Field, useField, type FieldProps } from './Field';
import styles from './Field.module.css';

export type SelectProps = ComponentProps<'select'> & FieldProps;
export function Select({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  'aria-describedby': describedBy,
  ...props
}: SelectProps) {
  const field = useField({ id, hint, error, describedBy });
  return (
    <Field {...field} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
      <select
        {...props}
        id={field.id}
        aria-describedby={field.describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={`${styles.select} ${error ? styles.invalid : ''} ${className}`}
      >
        {children}
      </select>
    </Field>
  );
}
