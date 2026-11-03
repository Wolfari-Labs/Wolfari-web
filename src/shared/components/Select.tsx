import type { ComponentProps } from 'react';
import { Field, useField, type FieldProps } from './Field';
import styles from './Field.module.css';
import { Icon } from './Icon';

export type SelectProps = ComponentProps<'select'> & FieldProps & { labelHidden?: boolean };
export function Select({
  label,
  labelHidden = false,
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
    <Field
      {...field}
      label={label}
      labelHidden={labelHidden}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      <div className={styles.selectWrap}>
        <select
          {...props}
          id={field.id}
          aria-describedby={field.describedBy}
          aria-invalid={error ? true : props['aria-invalid']}
          className={`${styles.select} ${error ? styles.invalid : ''} ${className}`}
        >
          {children}
        </select>
        {!props.multiple && (!props.size || props.size === 1) && (
          <Icon name="chevron" size={18} className={styles.selectChevron ?? ''} />
        )}
      </div>
    </Field>
  );
}
