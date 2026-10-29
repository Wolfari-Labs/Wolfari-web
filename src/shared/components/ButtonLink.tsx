import { Link, type LinkProps } from 'react-router';
import type { ReactNode } from 'react';
import type { ButtonProps } from './Button';
import styles from './Button.module.css';
export function ButtonLink({
  variant = 'primary',
  className = '',
  icon,
  children,
  ...props
}: LinkProps & { variant?: ButtonProps['variant']; icon?: ReactNode }) {
  return (
    <Link {...props} className={`${styles.button} ${styles[variant]} ${className}`}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </Link>
  );
}
