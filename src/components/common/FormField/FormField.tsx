import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './FormField.module.css';

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalLabel?: string;
  children: ReactElement;
}

export function FormField({
  label,
  hint,
  error,
  required = false,
  optionalLabel,
  className,
  children,
  ...rest
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId =
    isValidElement<{ id?: string }>(children) && children.props.id ? children.props.id : generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const childWithProps = isValidElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>(children)
    ? cloneElement(children, {
        id: fieldId,
        'aria-describedby':
          [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children;

  return (
    <div className={clsx(styles.field, className)} {...rest}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
          {!required && optionalLabel ? (
            <span className={styles.optional}>{optionalLabel}</span>
          ) : null}
        </label>
      ) : null}
      {childWithProps}
      {hint && !error ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
