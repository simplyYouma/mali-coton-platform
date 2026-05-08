import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={clsx(
        styles.badge,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        className,
      )}
      {...rest}
    >
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
