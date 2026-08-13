/**
 * Enregistrement du service worker de l'application installable.
 *
 * Deux points de vigilance guident ce fichier :
 *
 * 1. Un seul service worker peut controler une page a la fois. MSW pose le
 *    sien sur la meme portee pour intercepter les requetes de demonstration :
 *    en mode mock, la PWA reste donc volontairement desactivee, sinon les deux
 *    se remplaceraient l'un l'autre a chaque rechargement.
 *
 * 2. La mise a jour est proposee, jamais imposee. Un agent en train de saisir
 *    une collecte sur le terrain ne doit pas voir sa page se recharger sous
 *    ses doigts et perdre son formulaire.
 */

import { registerSW } from 'virtual:pwa-register';
import { USE_MSW } from '@/lib/apiConfig';

export interface EtatPwa {
  /** Une nouvelle version est installee et attend un rechargement. */
  majDisponible: boolean;
  /** La coque applicative est en cache : l'application se lance hors ligne. */
  pretHorsLigne: boolean;
}

let etat: EtatPwa = { majDisponible: false, pretHorsLigne: false };
let appliquerMaj: ((rechargerPage?: boolean) => Promise<void>) | null = null;

const ecouteurs = new Set<() => void>();

function publier(suivant: EtatPwa): void {
  etat = suivant;
  ecouteurs.forEach((notifier) => notifier());
}

export function enregistrerPwa(): void {
  if (USE_MSW) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  appliquerMaj = registerSW({
    immediate: true,
    onNeedRefresh() {
      publier({ ...etat, majDisponible: true });
    },
    onOfflineReady() {
      publier({ ...etat, pretHorsLigne: true });
    },
    onRegisterError(erreur) {
      console.error('[pwa] enregistrement du service worker impossible', erreur);
    },
  });
}

export function souscrirePwa(notifier: () => void): () => void {
  ecouteurs.add(notifier);
  return () => {
    ecouteurs.delete(notifier);
  };
}

/** Reference stable : requise par useSyncExternalStore. */
export function lireEtatPwa(): EtatPwa {
  return etat;
}

/** Active la version en attente et recharge la page. */
export function appliquerMiseAJour(): void {
  void appliquerMaj?.(true);
}
