import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, disabled, ...rest },
  ref,
) {
  return (
    <label className={clsx(styles.wrapper, disabled && styles.disabled, className)}>
      <span className={styles.trackWrapper}>
        <input ref={ref} type="checkbox" role="switch" disabled={disabled} className={styles.input} {...rest} />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
});
