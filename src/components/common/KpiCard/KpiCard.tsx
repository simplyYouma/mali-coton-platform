import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: number;
  deltaSuffix?: string;
  inverseDelta?: boolean;
  hint?: ReactNode;
  icon?: ReactNode;
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaSuffix = '%',
  inverseDelta = false,
  hint,
  icon,
}: KpiCardProps) {
  const trend = delta === undefined ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const isPositive = inverseDelta ? trend === 'down' : trend === 'up';
  const isNegative = inverseDelta ? trend === 'up' : trend === 'down';

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <p className={styles.label}>{label}</p>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
      </header>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      <footer className={styles.footer}>
        {delta !== undefined ? (
          <span
            className={clsx(
              styles.delta,
              isPositive && styles.deltaPositive,
              isNegative && styles.deltaNegative,
              !isPositive && !isNegative && styles.deltaFlat,
            )}
          >
            {trend === 'up' ? <TrendingUp size={12} /> : null}
            {trend === 'down' ? <TrendingDown size={12} /> : null}
            {trend === 'flat' ? <Minus size={12} /> : null}
            <span>
              {delta > 0 ? '+' : ''}
              {delta}
              {deltaSuffix}
            </span>
          </span>
        ) : null}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </footer>
    </article>
  );
}
