import { useState, useSyncExternalStore } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { appliquerMiseAJour, lireEtatPwa, souscrirePwa } from './pwaRegistration';
import styles from './PwaUpdatePrompt.module.css';

/**
 * Banniere discrete annoncant qu'une nouvelle version est prete.
 *
 * Deliberement non bloquante : l'agent qui saisit une collecte hors ligne
 * termine son formulaire, puis actualise quand cela l'arrange.
 */
export function PwaUpdatePrompt() {
  const { majDisponible } = useSyncExternalStore(souscrirePwa, lireEtatPwa, lireEtatPwa);
  const [masquee, setMasquee] = useState(false);

  if (!majDisponible || masquee) return null;

  return (
    <div className={styles.banner} role="status">
      <RefreshCw size={16} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        Une nouvelle version de PASET Mali est disponible.
      </p>
      <button type="button" className={styles.action} onClick={appliquerMiseAJour}>
        Actualiser
      </button>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setMasquee(true)}
        aria-label="Plus tard"
      >
        <X size={15} />
      </button>
    </div>
  );
}
