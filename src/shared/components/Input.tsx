import { useState, type ComponentProps, type ReactNode } from 'react';
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
  type,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const field = useField({ id, hint, error, describedBy });
  const revealable = type === 'password';
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
          type={revealable && passwordVisible ? 'text' : type}
          aria-describedby={field.describedBy}
          aria-invalid={error ? true : props['aria-invalid']}
          className={`${styles.input} ${className}`}
        />
        {revealable && (
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={`${passwordVisible ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi-VN')}`}
            aria-pressed={passwordVisible}
            disabled={props.disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? 'Ẩn' : 'Hiện'}
          </button>
        )}
      </div>
    </Field>
  );
}
