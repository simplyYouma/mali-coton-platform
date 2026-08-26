import { Skeleton } from '../Skeleton/Skeleton';
import styles from './SkeletonBlocs.module.css';

/**
 * Squelettes reprenant la forme du contenu attendu.
 *
 * Un bloc gris unique ne renseigne sur rien et fait sauter toute la page quand
 * les données arrivent : le gabarit change d'un coup. Reproduire la structure
 * — colonnes, lignes, cartes — réserve la place définitive et rend l'arrivée
 * des données presque invisible.
 */

export interface SkeletonTableauProps {
  /** Nombre de colonnes de l'en-tête. */
  colonnes?: number;
  lignes?: number;
  /** Hauteur d'une ligne, à aligner sur celle du tableau réel. */
  hauteurLigne?: number;
}

export function SkeletonTableau({
  colonnes = 4,
  lignes = 6,
  hauteurLigne = 44,
}: SkeletonTableauProps) {
  return (
    <div className={styles.tableau} aria-hidden="true">
      <div className={styles.tableauTete}>
        {Array.from({ length: colonnes }).map((_, i) => (
          <Skeleton key={i} height={10} width={i === 0 ? '55%' : '38%'} />
        ))}
      </div>
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className={styles.tableauLigne} style={{ height: hauteurLigne }}>
          {Array.from({ length: colonnes }).map((__, j) => (
            <Skeleton key={j} height={12} width={j === 0 ? '70%' : '45%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface SkeletonGrilleCardsProps {
  cards?: number;
  /** Reproduit la bande de stats interne des cards qui en portent une. */
  avecStats?: boolean;
  hauteurCard?: number;
}

export function SkeletonGrilleCards({
  cards = 3,
  avecStats = true,
  hauteurCard = 240,
}: SkeletonGrilleCardsProps) {
  return (
    <div className={styles.grille} aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={styles.card} style={{ minHeight: hauteurCard }}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={11} width="85%" />
          {avecStats ? (
            <div className={styles.cardStats}>
              {[0, 1, 2].map((j) => (
                <div key={j} className={styles.cardStat}>
                  <Skeleton height={8} width="70%" />
                  <Skeleton height={18} width="40%" />
                </div>
              ))}
            </div>
          ) : null}
          <Skeleton height={40} radius={10} />
        </div>
      ))}
    </div>
  );
}

export interface SkeletonBandeStatsProps {
  colonnes?: number;
}

/** Reprend la forme de `StatsBande` : une surface, colonnes séparées d'un filet. */
export function SkeletonBandeStats({ colonnes = 3 }: SkeletonBandeStatsProps) {
  return (
    <div className={styles.bande} aria-hidden="true">
      {Array.from({ length: colonnes }).map((_, i) => (
        <div key={i} className={styles.bandeCell}>
          <Skeleton height={8} width={70} />
          <Skeleton height={22} width={44} />
        </div>
      ))}
    </div>
  );
}

export interface SkeletonListeProps {
  lignes?: number;
  hauteurLigne?: number;
}

/** Lignes de liste autonomes (cartes empilées), pour les écrans sans tableau. */
export function SkeletonListe({ lignes = 5, hauteurLigne = 86 }: SkeletonListeProps) {
  return (
    <div className={styles.liste} aria-hidden="true">
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className={styles.listeLigne} style={{ minHeight: hauteurLigne }}>
          <div className={styles.listeCorps}>
            <Skeleton height={13} width="34%" />
            <Skeleton height={10} width="22%" />
            <Skeleton height={6} width="55%" radius={999} />
          </div>
          <Skeleton height={32} width={104} radius={8} />
        </div>
      ))}
    </div>
  );
}

export interface SkeletonSplitProps {
  lignes?: number;
}

/**
 * Boîte de réception : liste étroite à gauche, panneau de lecture à droite.
 * Forme partagée par les écrans Alertes et Recommandations.
 */
export function SkeletonSplit({ lignes = 6 }: SkeletonSplitProps) {
  return (
    <div className={styles.split} aria-hidden="true">
      <div className={styles.splitListe}>
        <div className={styles.splitListeTete}>
          <Skeleton height={11} width="45%" />
        </div>
        {Array.from({ length: lignes }).map((_, i) => (
          <div key={i} className={styles.splitLigne}>
            <Skeleton height={12} width="72%" />
            <Skeleton height={9} width="48%" />
          </div>
        ))}
      </div>
      <div className={styles.splitPanneau}>
        <div className={styles.splitPanneauTete}>
          <Skeleton height={18} width="42%" />
          <Skeleton height={10} width="28%" />
        </div>
        <div className={styles.splitPanneauCorps}>
          <Skeleton height={12} width="92%" />
          <Skeleton height={12} width="86%" />
          <Skeleton height={12} width="64%" />
          <Skeleton height={72} radius={10} />
        </div>
      </div>
    </div>
  );
}
