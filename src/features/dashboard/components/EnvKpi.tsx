import type { ReactNode } from 'react';
import styles from '../pages/DashboardPage.module.css';

/**
 * Tuile KPI partagée par les trois onglets du tableau de bord — Environnement
 * l'utilisait seul jusqu'ici ; Sites et Employés reprennent exactement le même
 * gabarit visuel (icône teintée, valeur, sous-titre, barre optionnelle) pour
 * qu'aucune tuile ne se distingue des autres.
 */
export function EnvKpi({
  icon,
  label,
  value,
  sub,
  tone,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  progress?: number;
}) {
  return (
    <div className={styles.envKpi} data-tone={tone}>
      <header className={styles.envKpiTop}>
        <span className={styles.envKpiIcon} data-tone={tone}>{icon}</span>
        <span className={styles.envKpiLabel}>{label}</span>
      </header>
      <span className={styles.envKpiValue}>{value}</span>
      <span className={styles.envKpiSub}>{sub}</span>
      {progress !== undefined ? (
        <div className={styles.envKpiTrack}>
          <div
            className={styles.envKpiBar}
            data-tone={tone}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
