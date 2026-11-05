import styles from '../pages/DashboardPage.module.css';

export interface DonutSegment {
  valeur: number;
  couleur: string;
  label: string;
}

/**
 * Donut générique — l'Environnement l'utilisait pour conforme/à
 * surveiller/critique ; le genre (Employés) est le seul autre indicateur du
 * tableau de bord à mériter ce traitement (deux valeurs). Au-delà de deux ou
 * trois segments, préférer des barres horizontales — voir `RepartitionBarres`.
 */
export function DonutChart({
  segments,
  total,
  centreValeur,
  centreLabel,
}: {
  segments: DonutSegment[];
  total: number;
  centreValeur: string;
  centreLabel: string;
}) {
  const SIZE = 190;
  const C = SIZE / 2;
  const R = 68;
  const SW = 26;
  const circ = 2 * Math.PI * R;
  const segs = segments.filter((s) => s.valeur > 0 && total > 0);
  let cum = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className={styles.donutSvg}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-border)" strokeWidth={SW} />
      {segs.map((seg, i) => {
        const dash = (seg.valeur / total) * circ;
        const offset = circ * 0.25 - cum;
        cum += dash;
        return (
          <circle
            key={i}
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={seg.couleur}
            strokeWidth={SW}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
          />
        );
      })}
      <text x={C} y={C - 6} textAnchor="middle" className={styles.donutBig}>{centreValeur}</text>
      <text x={C} y={C + 13} textAnchor="middle" className={styles.donutSub}>{centreLabel}</text>
    </svg>
  );
}
