import { Skeleton } from '@/components/common';
import { HttpError } from '@/lib/http';
import type { EntreeClassement } from '../api/dashboardStats';
import styles from '../pages/DashboardPage.module.css';

const MAX_LIGNES = 6;

/**
 * Carte de classement — un seul composant pour les six indicateurs Sites
 * (EPI, risques, besoins, formations, appuis, teintures, équipements) et les
 * trois Employés (équipements de protection, besoins, santé/sécurité) : ce
 * sont tous des « N sites/employés sur le total possèdent X », pas six
 * graphiques différents. Tronqué à 5-6 entrées — la liste complète appartient
 * à Analytics, pas au tableau de bord.
 */
export function ClassementCard({
  titre,
  sousTitre,
  donnees,
  total,
  unite,
  isLoading,
  isError,
  erreur,
}: {
  titre: string;
  sousTitre: string;
  donnees: EntreeClassement[] | undefined;
  /** Dénominateur de la part (%) — total de sites ou d'employés du périmètre. */
  total: number;
  unite: string;
  isLoading: boolean;
  isError: boolean;
  erreur?: unknown;
}) {
  const items = [...(donnees ?? [])].sort((a, b) => b.nombre - a.nombre);
  const visibles = items.slice(0, MAX_LIGNES);
  const reste = items.length - visibles.length;
  const max = Math.max(1, ...items.map((i) => i.nombre));

  return (
    <div className={styles.classementCard}>
      <header className={styles.classementHead}>
        <h4 className={styles.classementTitre}>{titre}</h4>
        <p className={styles.classementSousTitre}>{sousTitre}</p>
      </header>

      {isLoading ? (
        <div className={styles.classementSkeleton}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={30} radius={6} />
          ))}
        </div>
      ) : isError ? (
        <p className={styles.classementErreur}>
          {erreur instanceof HttpError ? erreur.message : 'Donnée indisponible.'}
        </p>
      ) : items.length === 0 ? (
        <p className={styles.classementVide}>Aucune donnée pour ce périmètre.</p>
      ) : (
        <>
          <ul className={styles.classementListe}>
            {visibles.map((item) => {
              const part = total > 0 ? (item.nombre / total) * 100 : 0;
              return (
                <li key={item.code} className={styles.classementLigne}>
                  <div className={styles.classementLigneHaut}>
                    <span className={styles.classementLibelle}>{item.libelle}</span>
                    <span className={styles.classementValeur}>
                      {item.nombre.toLocaleString('fr-FR')} {unite}
                      <span className={styles.classementPart}>({part.toFixed(1)} %)</span>
                    </span>
                  </div>
                  <div className={styles.classementTrack}>
                    <div
                      className={styles.classementFill}
                      style={{ width: `${(item.nombre / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {reste > 0 ? (
            <p className={styles.classementFoot}>+ {reste} autre{reste > 1 ? 's' : ''}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
