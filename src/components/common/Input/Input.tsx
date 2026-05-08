import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Input.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, prefix, suffix, inputSize = 'md', className, disabled, ...rest },
  ref,
) {
  return (
    <div
      className={clsx(
        styles.wrapper,
        styles[`size-${inputSize}`],
        invalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      {prefix ? (
        <span className={styles.affix} aria-hidden="true">
          {prefix}
        </span>
      ) : null}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={styles.input}
        {...rest}
      />
      {suffix ? (
        <span className={styles.affix} aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </div>
  );
});
