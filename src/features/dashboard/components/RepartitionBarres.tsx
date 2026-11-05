import { Skeleton } from '@/components/common';
import { HttpError } from '@/lib/http';
import type { EntreeRepartition } from '../api/dashboardStats';
import styles from '../pages/DashboardPage.module.css';

const NON_RENSEIGNE = 'Non renseigné';

/**
 * Répartition en barres horizontales — région, type de site, contrat,
 * niveau d'instruction : des catégories sans hiérarchie de gravité, donc une
 * seule teinte d'accent (jamais un camembert arc-en-ciel). Triée par volume,
 * sauf « Non renseigné » qui reste toujours en dernier, atténué — un défaut
 * de saisie n'est pas une catégorie comme les autres.
 */
export function RepartitionBarres({
  titre,
  sousTitre,
  donnees,
  unite,
  isLoading,
  isError,
  erreur,
}: {
  titre: string;
  sousTitre: string;
  donnees: EntreeRepartition[] | undefined;
  unite: string;
  isLoading: boolean;
  isError: boolean;
  erreur?: unknown;
}) {
  const items = [...(donnees ?? [])].sort((a, b) => {
    if (a.libelle === NON_RENSEIGNE) return 1;
    if (b.libelle === NON_RENSEIGNE) return -1;
    return b.nombre - a.nombre;
  });
  const total = items.reduce((s, i) => s + i.nombre, 0);
  const max = Math.max(1, ...items.map((i) => i.nombre));

  return (
    <div className={styles.envCard}>
      <div className={styles.envComposanteCol}>
        <h3 className={styles.envSubTitle}>{titre}</h3>
        <p className={styles.classementSousTitre}>{sousTitre}</p>

        {isLoading ? (
          <div className={styles.classementSkeleton}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={26} radius={6} />
            ))}
          </div>
        ) : isError ? (
          <p className={styles.classementErreur}>
            {erreur instanceof HttpError ? erreur.message : 'Donnée indisponible.'}
          </p>
        ) : items.length === 0 ? (
          <p className={styles.classementVide}>Aucune donnée pour ce périmètre.</p>
        ) : (
          <ul className={styles.repartitionListe}>
            {items.map((item) => {
              const part = total > 0 ? (item.nombre / total) * 100 : 0;
              const nonRenseigne = item.libelle === NON_RENSEIGNE;
              return (
                <li
                  key={item.libelle}
                  className={styles.repartitionLigne}
                  data-attenue={nonRenseigne ? 'true' : undefined}
                >
                  <span className={styles.repartitionLibelle}>{item.libelle}</span>
                  <div className={styles.repartitionTrack}>
                    <div
                      className={styles.repartitionFill}
                      data-attenue={nonRenseigne ? 'true' : undefined}
                      style={{ width: `${(item.nombre / max) * 100}%` }}
                    />
                  </div>
                  <span className={styles.repartitionValeur}>
                    {item.nombre.toLocaleString('fr-FR')} {unite}
                    <span className={styles.classementPart}>({part.toFixed(1)} %)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
