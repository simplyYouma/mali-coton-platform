/**
 * Enregistrement du service worker et invitation a installer l'application.
 *
 * Trois points de vigilance guident ce fichier :
 *
 * 1. Un seul service worker peut controler une page a la fois. MSW pose le
 *    sien sur la meme portee pour intercepter les requetes de demonstration :
 *    en mode mock, la PWA reste donc volontairement desactivee, sinon les deux
 *    se remplaceraient l'un l'autre a chaque rechargement.
 *
 * 2. La mise a jour est proposee, jamais imposee. Un agent en train de saisir
 *    une collecte sur le terrain ne doit pas voir sa page se recharger sous
 *    ses doigts et perdre son formulaire.
 *
 * 3. L'installation ne peut pas etre declenchee par un lien ni au chargement :
 *    les navigateurs l'interdisent pour empecher qu'un site s'installe a
 *    l'insu de son visiteur. Tout ce qu'on peut faire, c'est capturer
 *    l'invitation du navigateur et la rejouer sur un geste de l'utilisateur.
 */

import { registerSW } from 'virtual:pwa-register';
import { USE_MSW } from '@/lib/apiConfig';

export interface EtatPwa {
  /** Une nouvelle version est installee et attend un rechargement. */
  majDisponible: boolean;
  /** La coque applicative est en cache : l'application se lance hors ligne. */
  pretHorsLigne: boolean;
  /** Le navigateur juge l'application installable et nous a confie son invitation. */
  installable: boolean;
  /** L'application tourne deja comme application installee. */
  installee: boolean;
}

let etat: EtatPwa = {
  majDisponible: false,
  pretHorsLigne: false,
  installable: false,
  installee: false,
};
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

/* ═══════════════════════════════════════════════════════════
   INSTALLATION
═══════════════════════════════════════════════════════════ */

/** `beforeinstallprompt` est propre a Chromium : absent des types du DOM. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * L'invitation du navigateur, mise de cote jusqu'au geste de l'utilisateur.
 * Elle ne se rejoue pas : une fois consommee, il faut attendre que le
 * navigateur en emette une nouvelle.
 */
let invitation: EvenementInstallation | null = null;

/**
 * Vrai lorsque la page tourne deja comme application installee.
 *
 * `display-mode: standalone` couvre Android et le bureau ; iOS expose a la
 * place un indicateur maison sur `navigator`.
 */
function estDejaInstallee(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Safari iOS n'emet jamais `beforeinstallprompt` : l'ajout a l'ecran d'accueil
 * s'y fait a la main, depuis le menu de partage. Sans cette detection, l'agent
 * sur iPad ne verrait jamais rien — ni bouton, ni explication.
 *
 * Les autres navigateurs iOS (Chrome, Firefox, Edge) ne savent pas installer
 * du tout : la consigne les renvoie vers Safari.
 */
export function estIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const tactile = navigator.maxTouchPoints > 1;
  /* iPadOS 13+ se declare « MacIntel » : le nombre de points tactiles est le
   * seul moyen fiable de le distinguer d'un vrai Mac. */
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && tactile);
}

/** Met en place l'ecoute des evenements d'installation du navigateur. */
export function surveillerInstallation(): void {
  if (typeof window === 'undefined') return;

  publier({ ...etat, installee: estDejaInstallee() });

  window.addEventListener('beforeinstallprompt', ((evenement: Event) => {
    /* Sans ce refus, Chrome affiche sa propre barre d'installation en bas de
     * l'ecran, hors de notre charte et impossible a replacer. */
    evenement.preventDefault();
    invitation = evenement as EvenementInstallation;
    publier({ ...etat, installable: true });
  }) as EventListener);

  window.addEventListener('appinstalled', () => {
    invitation = null;
    publier({ ...etat, installable: false, installee: true });
  });
}

export type ResultatInstallation = 'acceptee' | 'refusee' | 'indisponible';

/**
 * Rejoue l'invitation du navigateur. A n'appeler que depuis un gestionnaire
 * d'evenement declenche par l'utilisateur : hors de ce cadre, le navigateur
 * ignore l'appel.
 */
export async function lancerInstallation(): Promise<ResultatInstallation> {
  const enCours = invitation;
  if (!enCours) return 'indisponible';

  /* L'invitation est consommee des le premier appel, qu'elle aboutisse ou
   * non : on la retire avant d'attendre la reponse pour qu'un double clic ne
   * la rejoue pas. */
  invitation = null;
  publier({ ...etat, installable: false });

  await enCours.prompt();
  const { outcome } = await enCours.userChoice;
  return outcome === 'accepted' ? 'acceptee' : 'refusee';
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
