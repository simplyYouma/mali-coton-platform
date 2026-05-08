import { forwardRef, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={clsx(styles.textarea, invalid && styles.invalid, className)}
      {...rest}
    />
  );
});
