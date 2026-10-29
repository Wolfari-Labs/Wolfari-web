import type { ComponentProps, ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Ui.module.css';

export function Checkbox({
  children,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { children: ReactNode }) {
  return (
    <label className={styles.checkbox}>
      <span className={styles.checkboxControl}>
        <input {...props} type="checkbox" />
        <span aria-hidden="true">
          <Icon name="check" size={14} />
        </span>
      </span>
      <span>{children}</span>
    </label>
  );
}
