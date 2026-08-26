import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  /** Texte lu par les lecteurs d'écran ; un défaut est fourni. */
  label?: string;
  /**
   * À activer quand un texte visible voisin annonce déjà le chargement :
   * le spinner devient décoratif et n'est pas annoncé une seconde fois.
   */
  decoratif?: boolean;
  className?: string;
}

export function Spinner({ size = 16, label = 'Chargement en cours', decoratif = false, className }: SpinnerProps) {
  /* `role="status"` est posé systématiquement — sans lui, un spinner seul
   * n'est signalé à personne. Le cas décoratif reste explicite, pour les
   * situations où un libellé visible dit déjà la même chose. */
  return (
    <span
      role={decoratif ? undefined : 'status'}
      aria-hidden={decoratif ? true : undefined}
      className={className ? `${styles.spinner} ${className}` : styles.spinner}
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
      {decoratif ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}
