import { useEffect, useState } from 'react';
import { Spinner } from '../Spinner/Spinner';
import styles from './PageLoader.module.css';

/** Sous ce délai, la réponse est perçue comme immédiate : ne rien afficher. */
const DELAI_APPARITION = 200;
/** Au-delà, l'attente devient inconfortable : rassurer plutôt que laisser tourner. */
const DELAI_PATIENCE = 5000;

export interface PageLoaderProps {
  /** Ce qu'on attend, en clair (« Chargement des sites… »). */
  label?: string;
  /** Retire la hauteur minimale quand le chargeur occupe déjà une zone dimensionnée. */
  compact?: boolean;
}

/**
 * Chargeur de page.
 *
 * Deux temporisations, pour deux inconforts opposés : un chargeur qui
 * apparaît puis disparaît en 80 ms produit un clignotement plus gênant que
 * l'attente elle-même, et un chargeur qui tourne sans rien dire au bout de
 * cinq secondes laisse croire à un blocage — le contexte terrain, souvent en
 * connexion lente, rend les deux fréquents.
 */
export function PageLoader({ label, compact = false }: PageLoaderProps) {
  const [visible, setVisible] = useState(false);
  const [lent, setLent] = useState(false);

  useEffect(() => {
    const apparition = setTimeout(() => setVisible(true), DELAI_APPARITION);
    const patience = setTimeout(() => setLent(true), DELAI_PATIENCE);
    return () => {
      clearTimeout(apparition);
      clearTimeout(patience);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.wrap} data-compact={compact ? 'true' : undefined}>
      <Spinner size={40} label={label ?? 'Chargement en cours'} />
      {label ? <p className={styles.label}>{label}</p> : null}
      {lent ? (
        <p className={styles.patience}>
          Cela prend plus de temps que prévu… La connexion est peut-être lente.
        </p>
      ) : null}
    </div>
  );
}
