import type { ComponentProps } from 'react';
import { Field, useField, type FieldProps } from './Field';
import styles from './Field.module.css';

export interface TextareaProps extends ComponentProps<'textarea'>, FieldProps {}

export function Textarea({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: TextareaProps) {
  const field = useField({ id, hint, error, describedBy });
  return (
    <Field {...field} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
      <textarea
        {...props}
        id={field.id}
        aria-describedby={field.describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={`${styles.textarea} ${error ? styles.invalid : ''} ${className}`}
      />
    </Field>
  );
}
