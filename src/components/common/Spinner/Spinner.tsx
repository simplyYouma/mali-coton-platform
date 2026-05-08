import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 16, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className={styles.spinner}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
        <path
          d="M21 12a9 9 0 0 1-9 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
