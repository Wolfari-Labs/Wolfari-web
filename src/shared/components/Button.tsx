import type { ComponentProps, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'plain' | 'ghost' | 'destructive';
  size?: 'default' | 'compact' | 'icon';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  icon,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${styles.button} ${styles[variant]} ${styles[size] ?? ''} ${className}`}
    >
      {loading && (
        <span className={styles.loadingIndicator} aria-hidden="true">
          <span className={styles.spinner} />
        </span>
      )}
      <span className={styles.contents} data-loading={loading || undefined}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{children}</span>
      </span>
    </button>
  );
}
