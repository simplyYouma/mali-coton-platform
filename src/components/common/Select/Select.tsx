import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  /* Position du menu (portal vers body, position fixed) :
   * - calcul a partir du rect du wrapper
   * - recalcule sur open + sur scroll/resize tant qu'ouvert
   * Evite le clipping quand le Select est dans un Modal avec overflow:auto. */
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const compute = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    compute();
    const onScroll = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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
      ref={wrapperRef}
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
      {open && menuStyle && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              className={styles.menu}
              style={{
                position: 'fixed',
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
            >
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
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
