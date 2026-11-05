import { Skeleton } from '@/components/common';
import { HttpError } from '@/lib/http';
import type { EntreeEvolution } from '../api/dashboardStats';
import styles from '../pages/DashboardPage.module.css';

const MOIS_COURT: Record<string, string> = {
  '01': 'jan', '02': 'fév', '03': 'mar', '04': 'avr', '05': 'mai', '06': 'juin',
  '07': 'juil', '08': 'août', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'déc',
};

function libellePeriode(periode: string): string {
  const [annee, mois] = periode.split('-');
  if (!annee || !mois) return periode;
  return `${MOIS_COURT[mois] ?? mois} ${annee.slice(2)}`;
}

/**
 * Évolution mensuelle — visites (Sites) ou collectes (Employés). Une seule
 * série temporelle par onglet, en barres plutôt qu'en courbe : les volumes
 * mensuels n'ont pas besoin d'interpolation pour se lire.
 */
export function EvolutionChart({
  titre,
  sousTitre,
  donnees,
  isLoading,
  isError,
  erreur,
}: {
  titre: string;
  sousTitre: string;
  donnees: EntreeEvolution[] | undefined;
  isLoading: boolean;
  isError: boolean;
  erreur?: unknown;
}) {
  const items = donnees ?? [];
  const max = Math.max(1, ...items.map((i) => i.nombre));

  return (
    <div className={`${styles.envCard} ${styles.evolutionCard}`}>
      <header className={styles.envTableHead}>
        <div>
          <h3 className={styles.envSubTitle}>{titre}</h3>
          <p className={styles.classementSousTitre}>{sousTitre}</p>
        </div>
      </header>

      <div className={styles.evolutionCorps}>
        {isLoading ? (
          <Skeleton height={160} radius={8} />
        ) : isError ? (
          <p className={styles.classementErreur}>
            {erreur instanceof HttpError ? erreur.message : 'Donnée indisponible.'}
          </p>
        ) : items.length === 0 ? (
          <p className={styles.classementVide}>Aucune donnée pour cette période.</p>
        ) : (
          <div className={styles.evolutionBarres} role="img" aria-label={`Évolution mensuelle : ${items.map((i) => `${libellePeriode(i.periode)} ${i.nombre}`).join(', ')}`}>
            {items.map((item) => (
              <div key={item.periode} className={styles.evolutionColonne}>
                <span className={styles.evolutionValeur}>{item.nombre}</span>
                <div className={styles.evolutionBarreTrack}>
                  <div
                    className={styles.evolutionBarre}
                    style={{ height: `${(item.nombre / max) * 100}%` }}
                  />
                </div>
                <span className={styles.evolutionMois}>{libellePeriode(item.periode)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
