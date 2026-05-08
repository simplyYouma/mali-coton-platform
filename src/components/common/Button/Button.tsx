import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from '../Spinner/Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={clsx(
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true">
          <Spinner size={size === 'sm' ? 14 : 16} />
        </span>
      ) : iconLeft ? (
        <span className={styles.icon} aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {!loading && iconRight ? (
        <span className={styles.icon} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
});
