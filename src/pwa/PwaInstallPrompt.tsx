import { useCallback, useState, useSyncExternalStore } from 'react';
import { Download, Share, X } from 'lucide-react';
import {
  estIos,
  lancerInstallation,
  lireEtatPwa,
  souscrirePwa,
} from './pwaRegistration';
import styles from './PwaBanner.module.css';

/**
 * Invitation a installer PASET sur l'appareil.
 *
 * Sans elle, l'installation ne passe que par l'icone discrete de la barre
 * d'adresse — que personne ne trouve s'il ne la cherche pas. Les navigateurs
 * interdisant toute installation automatique, une invitation visible est le
 * seul levier dont dispose l'application.
 *
 * Proposee une fois, jamais deux : un refus est memorise. Mieux vaut un agent
 * qui n'installe pas qu'un agent qui reprend la meme banniere a chaque visite.
 */

const CLE_REFUS = 'paset.installation.refusee';

/* Le stockage local peut etre indisponible (navigation privee, restrictions
 * d'entreprise) : son absence ne doit jamais empecher l'affichage. */
function refusMemorise(): boolean {
  try {
    return localStorage.getItem(CLE_REFUS) === '1';
  } catch {
    return false;
  }
}

function memoriserRefus(): void {
  try {
    localStorage.setItem(CLE_REFUS, '1');
  } catch {
    /* Sans stockage, la banniere reapparaitra a la prochaine visite. */
  }
}

export function PwaInstallPrompt() {
  const { installable, installee, majDisponible } = useSyncExternalStore(
    souscrirePwa,
    lireEtatPwa,
    lireEtatPwa,
  );
  const [refusee, setRefusee] = useState(refusMemorise);
  const [enCours, setEnCours] = useState(false);

  const ecarter = useCallback(() => {
    memoriserRefus();
    setRefusee(true);
  }, []);

  const installer = useCallback(async () => {
    setEnCours(true);
    const resultat = await lancerInstallation();
    setEnCours(false);
    /* Un refus dans la fenetre du navigateur vaut refus tout court : on ne
     * represente pas l'invitation. */
    if (resultat !== 'acceptee') ecarter();
  }, [ecarter]);

  const ios = estIos();

  /* Une mise a jour en attente passe devant : les deux bannieres occupent la
   * meme place, et actualiser prime sur installer. */
  if (installee || majDisponible || refusee) return null;
  if (!installable && !ios) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Installer l'application">
      {ios ? (
        <>
          <Share size={16} className={styles.icon} aria-hidden="true" />
          <p className={styles.text}>
            Installez PASET Mali sur votre écran d&apos;accueil.
            <span className={styles.hint}>
              Dans Safari : bouton Partager, puis « Sur l&apos;écran d&apos;accueil ».
            </span>
          </p>
        </>
      ) : (
        <>
          <Download size={16} className={styles.icon} aria-hidden="true" />
          <p className={styles.text}>
            Installez PASET Mali pour l&apos;ouvrir en plein écran, même sans connexion.
          </p>
          <button
            type="button"
            className={styles.action}
            onClick={() => void installer()}
            disabled={enCours}
          >
            {enCours ? 'Installation…' : 'Installer'}
          </button>
        </>
      )}
      <button
        type="button"
        className={styles.dismiss}
        onClick={ecarter}
        aria-label="Ne plus proposer l'installation"
      >
        <X size={15} />
      </button>
    </div>
  );
}
