import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, disabled, ...rest },
  ref,
) {
  return (
    <label className={clsx(styles.wrapper, disabled && styles.disabled, className)}>
      <span className={styles.boxWrapper}>
        <input ref={ref} type="checkbox" disabled={disabled} className={styles.input} {...rest} />
        <span className={styles.box} aria-hidden="true">
          <Check className={styles.check} size={14} strokeWidth={3} />
        </span>
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
});
