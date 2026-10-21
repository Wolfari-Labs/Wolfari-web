import type { ComponentProps } from 'react';
import styles from './NavigationButton.module.css';

export interface NavigationButtonProps extends ComponentProps<'button'> {
  selected: boolean;
}
export function NavigationButton({
  selected,
  type = 'button',
  className = '',
  ...props
}: NavigationButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={`${styles.item} ${className}`}
    />
  );
}
