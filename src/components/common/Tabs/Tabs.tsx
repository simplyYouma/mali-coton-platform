import { type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Tabs.module.css';

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  variant?: 'underline' | 'pill';
  'aria-label'?: string;
}

export function Tabs<T extends string = string>({
  value,
  onChange,
  items,
  variant = 'underline',
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx(styles.tabs, styles[`v-${variant}`])}>
      {items.map((it) => {
        const isActive = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={it.disabled || undefined}
            disabled={it.disabled}
            onClick={() => !it.disabled && onChange(it.value)}
            className={clsx(styles.tab, isActive && styles.active)}
          >
            <span>{it.label}</span>
            {it.badge ? <span className={styles.badge}>{it.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
