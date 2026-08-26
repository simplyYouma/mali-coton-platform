import styles from './StatsBande.module.css';

export interface StatBande {
  label: string;
  valeur: string | number;
}

interface StatsBandeProps {
  stats: StatBande[];
  /** `compact` réduit l'échelle pour tenir dans une carte plutôt qu'en pleine page. */
  taille?: 'normal' | 'compact';
  'aria-label'?: string;
}

/**
 * Bande de statistiques : une seule surface, colonnes séparées par un filet,
 * intitulé en petites capitales au-dessus du chiffre.
 *
 * Partagée entre la page Structure (pleine largeur) et les cartes du catalogue
 * (étroites) — mêmes bordures internes, seule l'échelle change.
 */
export function StatsBande({ stats, taille = 'normal', ...aria }: StatsBandeProps) {
  return (
    <dl className={styles.bande} data-taille={taille} aria-label={aria['aria-label']}>
      {stats.map((s) => (
        <div key={s.label} className={styles.cellule}>
          <dt className={styles.label}>{s.label}</dt>
          <dd className={styles.valeur}>{s.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
