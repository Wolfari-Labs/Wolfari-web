import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';
export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  ...props
}: LinkProps & { variant?: 'primary' | 'outline' | 'plain' }) {
  return (
    <Link {...props} className={`${styles.button} ${styles[variant]} ${className}`}>
      <span>{children}</span>
    </Link>
  );
}
