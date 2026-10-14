import styles from './Skeleton.module.css';

export function Skeleton({ className = '' }: { className?: string | undefined }) {
  return <div className={`${styles.skeleton} ${className}`} aria-hidden="true" />;
}
