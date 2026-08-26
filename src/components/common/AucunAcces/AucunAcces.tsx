import { ShieldOff } from 'lucide-react';
import styles from './AucunAcces.module.css';

export interface AucunAccesProps {
  /** Vrai quand les droits n'ont pas pu être lus, plutôt qu'absents. */
  profilIndisponible?: boolean;
}

/**
 * Écran affiché à un compte authentifié dont aucune page n'est ouverte.
 *
 * Rediriger serait impossible — il n'existe pas de page d'accueil à viser — et
 * un menu vide sans explication laisse croire à une panne.
 */
export function AucunAcces({ profilIndisponible = false }: AucunAccesProps) {
  return (
    <div className={styles.refus} role="alert">
      <span className={styles.icone} aria-hidden="true">
        <ShieldOff size={26} />
      </span>
      <h1 className={styles.titre}>
        {profilIndisponible ? 'Droits indisponibles' : 'Aucun accès ne vous est ouvert'}
      </h1>
      <p className={styles.texte}>
        {profilIndisponible
          ? 'Vos droits n’ont pas pu être vérifiés. Reconnectez-vous, puis réessayez.'
          : 'Votre compte n’a encore reçu aucune permission. Contactez votre administrateur pour qu’il vous attribue un rôle.'}
      </p>
    </div>
  );
}
