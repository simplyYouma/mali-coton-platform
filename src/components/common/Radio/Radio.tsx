import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Radio.module.css';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, disabled, ...rest },
  ref,
) {
  return (
    <label className={clsx(styles.wrapper, disabled && styles.disabled, className)}>
      <span className={styles.dotWrapper}>
        <input ref={ref} type="radio" disabled={disabled} className={styles.input} {...rest} />
        <span className={styles.dot} aria-hidden="true" />
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
});
