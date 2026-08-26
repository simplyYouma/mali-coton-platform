import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import styles from './RouteProgress.module.css';

/** En dessous, la transition est imperceptible : afficher la barre la ferait clignoter. */
const DELAI_APPARITION = 150;
/** Laisse la barre terminer sa course plutôt que de la couper net. */
const DELAI_SORTIE = 250;

/**
 * Fine barre de progression en haut de fenêtre pendant une transition.
 *
 * Les routes ne sont pas découpées en chargements différés : le composant
 * arrive donc immédiatement, et c'est la récupération des données qui fait
 * patienter. La barre suit `useIsFetching` en plus du changement d'URL, sans
 * quoi elle disparaîtrait avant que l'écran ait quoi que ce soit à montrer.
 */
export function RouteProgress() {
  const location = useLocation();
  const enVol = useIsFetching();
  const [etat, setEtat] = useState<'masque' | 'actif' | 'sortie'>('masque');
  const apparition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nettoyer = () => {
      if (apparition.current) clearTimeout(apparition.current);
      if (sortie.current) clearTimeout(sortie.current);
    };

    if (enVol > 0) {
      nettoyer();
      apparition.current = setTimeout(() => setEtat('actif'), DELAI_APPARITION);
      return nettoyer;
    }

    // Plus rien en vol : on termine la course avant de retirer la barre.
    nettoyer();
    setEtat((precedent) => (precedent === 'actif' ? 'sortie' : 'masque'));
    sortie.current = setTimeout(() => setEtat('masque'), DELAI_SORTIE);
    return nettoyer;
  }, [enVol, location.pathname]);

  if (etat === 'masque') return null;

  return (
    <div className={styles.piste} aria-hidden="true">
      <div className={styles.barre} data-etat={etat} />
    </div>
  );
}
