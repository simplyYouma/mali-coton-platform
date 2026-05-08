import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import styles from './Select.module.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner…',
  disabled = false,
  invalid = false,
  id,
  size = 'md',
  fullWidth = false,
  ...aria
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div
      ref={ref}
      className={clsx(
        styles.wrapper,
        styles[`size-${size}`],
        invalid && styles.invalid,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
      )}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label={aria['aria-label']}
        aria-describedby={aria['aria-describedby']}
        onClick={() => setOpen((v) => !v)}
        className={styles.trigger}
      >
        <span className={clsx(styles.value, !selected && styles.placeholder)}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>
      {open ? (
        <ul role="listbox" className={styles.menu}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                tabIndex={opt.disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (opt.disabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={clsx(
                  styles.option,
                  isSelected && styles.optionSelected,
                  opt.disabled && styles.optionDisabled,
                )}
              >
                <span className={styles.optionLabel}>{opt.label}</span>
                {isSelected ? <Check size={14} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
