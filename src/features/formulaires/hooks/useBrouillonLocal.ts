import { useCallback, useEffect, useRef, useState } from 'react';
import { useOffline } from '@/app/providers/OfflineProvider';
import { HttpError } from '@/lib/http';
import { completerBrouillon, creerBrouillon } from '../api/formulairesNatifs';
import type { ReponsesFormulaire } from '../api/formulairesNatifs.types';

/**
 * Brouillon de saisie : persistance locale d'abord, serveur ensuite.
 *
 * Le terrain est le cas nominal, pas l'exception — la saisie doit survivre à
 * une coupure réseau, à une session expirée et à un rechargement de page. On
 * écrit donc systématiquement en localStorage, et on ne pousse au serveur que
 * de façon opportuniste (débounce ~2 s). Le `clientSubmissionId` identifie le
 * brouillon de façon stable côté client comme côté serveur.
 *
 * Clé de stockage cloisonnée par utilisateur ET par brouillon
 * (`paset.brouillon.{userId}.{clientSubmissionId}`) : les appareils de terrain
 * sont partagés entre agents, et un même agent peut avoir plusieurs brouillons
 * en cours du même modèle. Une clé unique par modèle (l'ancien format) faisait
 * écraser silencieusement le brouillon d'un agent par celui d'un autre, ou un
 * brouillon par un autre du même modèle.
 */

const PREFIXE = 'paset.brouillon.';
const DELAI_AUTOSAVE = 2000;

export type EtatSauvegarde = 'idle' | 'enregistrement' | 'enregistre' | 'local' | 'erreur';

export interface BrouillonLocal {
  clientSubmissionId: string;
  formulaireCode: string;
  /** Id serveur, présent une fois le POST initial passé. */
  soumissionId?: number;
  reponses: ReponsesFormulaire;
  latitude?: number;
  longitude?: number;
  majLe: string;
  /** Vrai tant que des modifications n'ont pas été poussées au serveur. */
  enAttenteSync: boolean;
  /** Compteur de révision serveur, s'il est connu (voir `SoumissionNative.revision`). */
  revision?: number | null;
}

function cle(userId: string, clientSubmissionId: string): string {
  return `${PREFIXE}${userId}.${clientSubmissionId}`;
}

function nouvelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function lireBrouillonLocal(userId: string, clientSubmissionId: string): BrouillonLocal | null {
  try {
    const brut = localStorage.getItem(cle(userId, clientSubmissionId));
    return brut ? (JSON.parse(brut) as BrouillonLocal) : null;
  } catch {
    return null;
  }
}

export function effacerBrouillonLocal(userId: string, clientSubmissionId: string): void {
  try {
    localStorage.removeItem(cle(userId, clientSubmissionId));
  } catch {
    /* quota ou mode privé : sans effet sur la suite */
  }
}

/** Tous les brouillons locaux d'un utilisateur restant à pousser — utilisé à la reprise réseau. */
export function brouillonsEnAttente(userId: string): BrouillonLocal[] {
  const out: BrouillonLocal[] = [];
  const prefixeUtilisateur = `${PREFIXE}${userId}.`;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith(prefixeUtilisateur)) continue;
      const brut = localStorage.getItem(k);
      if (!brut) continue;
      const b = JSON.parse(brut) as BrouillonLocal;
      if (b.enAttenteSync) out.push(b);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * Migre une fois les clés de l'ancien format (`paset.brouillon.{code}`, une
 * seule par modèle, sans auteur) vers le nouveau (`paset.brouillon.{userId}.
 * {clientSubmissionId}`).
 *
 * L'ancien format ne portait aucune information d'auteur : impossible de
 * savoir avec certitude à qui appartenait un brouillon écrit avant cette
 * mise à jour. Il est attribué à l'utilisateur qui déclenche la migration
 * (le premier à se connecter après le déploiement) — limite acceptée : sur un
 * appareil déjà partagé avant la mise à jour, un brouillon commencé par un
 * autre agent resterait, une fois, attribué à celui qui migre.
 */
export function migrerBrouillonsHerites(userId: string): void {
  try {
    const anciennesClefs: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIXE)) continue;
      const reste = k.slice(PREFIXE.length);
      // Nouveau format : `{userId}.{clientSubmissionId}` contient toujours un
      // point. Ancien format : `{formulaireCode}` n'en contient jamais.
      if (reste.includes('.')) continue;
      anciennesClefs.push(k);
    }
    for (const k of anciennesClefs) {
      const brut = localStorage.getItem(k);
      localStorage.removeItem(k);
      if (!brut) continue;
      const b = JSON.parse(brut) as BrouillonLocal;
      if (!b.clientSubmissionId) continue;
      const nouvelleClef = cle(userId, b.clientSubmissionId);
      // Un brouillon déjà migré (double montage du hook) ne doit pas être écrasé.
      if (localStorage.getItem(nouvelleClef)) continue;
      localStorage.setItem(nouvelleClef, brut);
    }
  } catch {
    /* localStorage indisponible : rien à migrer, la saisie repartira propre */
  }
}

interface DonneesHydratation {
  soumissionId?: number;
  reponses: ReponsesFormulaire;
  latitude?: number | null;
  longitude?: number | null;
  majLe: string;
  revision?: number | null;
}

interface Options {
  formulaireCode: string;
  /** Cloisonne le stockage local — obligatoire, jamais de brouillon anonyme. */
  userId: string;
  /**
   * Identité fixée par l'appelant (reprise depuis l'URL). Absente pour un
   * nouveau brouillon : un identifiant est alors généré une fois pour toutes.
   */
  clientSubmissionId?: string;
}

export function useBrouillonLocal({ formulaireCode, userId, clientSubmissionId }: Options) {
  const { isOnline } = useOffline();

  const [etat, setEtat] = useState<EtatSauvegarde>('idle');
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<Date | null>(null);
  /* Un nouveau brouillon n'a rien à hydrater : prêt tout de suite. Une reprise
   * attend un appel explicite à `hydrater()` — voir la garde dans `enregistrer`
   * et `forcerSync` : sans elle, l'auto-save écrirait `{}` par-dessus les
   * réponses déjà enregistrées avant que la requête de reprise n'ait répondu. */
  const [pret, setPret] = useState(clientSubmissionId === undefined);

  const idRef = useRef<string>(clientSubmissionId ?? nouvelId());
  const soumissionIdRef = useRef<number | undefined>(undefined);
  const revisionRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVolRef = useRef(false);
  const enAttenteRef = useRef<BrouillonLocal | null>(null);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  useEffect(() => {
    migrerBrouillonsHerites(userId);
  }, [userId]);

  const ecrireLocal = useCallback(
    (reponses: ReponsesFormulaire, enAttenteSync: boolean, coords?: { lat?: number; lng?: number }) => {
      const snapshot: BrouillonLocal = {
        clientSubmissionId: idRef.current,
        formulaireCode,
        soumissionId: soumissionIdRef.current,
        reponses,
        latitude: coords?.lat,
        longitude: coords?.lng,
        majLe: new Date().toISOString(),
        enAttenteSync,
        revision: revisionRef.current,
      };
      try {
        localStorage.setItem(cle(userId, idRef.current), JSON.stringify(snapshot));
      } catch {
        /* quota dépassé : la saisie en mémoire reste utilisable */
      }
      return snapshot;
    },
    [formulaireCode, userId],
  );

  /**
   * Amorce l'identité du brouillon depuis la source qui a gagné l'arbitrage
   * serveur/local (fait par l'appelant, qui seul connaît les deux dates).
   * Écrit tout de suite en local pour que `pousser` sache s'il doit POSTer ou
   * PUTer, puis lève la garde qui protégeait `enregistrer`/`forcerSync`.
   */
  const hydrater = useCallback(
    (donnees: DonneesHydratation) => {
      soumissionIdRef.current = donnees.soumissionId;
      revisionRef.current = donnees.revision ?? null;
      ecrireLocal(donnees.reponses, false, {
        lat: donnees.latitude ?? undefined,
        lng: donnees.longitude ?? undefined,
      });
      setDerniereSauvegarde(new Date(donnees.majLe || Date.now()));
      setEtat('enregistre');
      setPret(true);
    },
    [ecrireLocal],
  );

  /** Pousse au serveur : POST au premier envoi, PUT ensuite. */
  const pousser = useCallback(
    async (snapshot: BrouillonLocal) => {
      if (enVolRef.current) {
        // Une requête est déjà en vol : on garde la dernière version pour après.
        enAttenteRef.current = snapshot;
        return;
      }
      enVolRef.current = true;
      setEtat('enregistrement');
      try {
        if (soumissionIdRef.current === undefined) {
          const cree = await creerBrouillon({
            formulaireCode,
            latitude: snapshot.latitude,
            longitude: snapshot.longitude,
            reponses: snapshot.reponses,
          });
          soumissionIdRef.current = cree.id;
          if (cree.clientSubmissionId) idRef.current = cree.clientSubmissionId;
        } else {
          await completerBrouillon(idRef.current, { reponses: snapshot.reponses });
        }
        ecrireLocal(snapshot.reponses, false, {
          lat: snapshot.latitude,
          lng: snapshot.longitude,
        });
        setDerniereSauvegarde(new Date());
        setEtat('enregistre');
      } catch (err) {
        /* Un 401/403 est définitif — le présenter comme « en attente, sera
         * renvoyé au retour du réseau » mentirait, la resynchronisation
         * échouerait indéfiniment de la même façon (ex. un superviseur qui
         * modifie le brouillon d'un agent si l'API ne l'autorise pas). Seule
         * une panne réseau ou serveur générique justifie l'état « local ». */
        if (err instanceof HttpError && (err.status === 401 || err.status === 403)) {
          setEtat('erreur');
        } else {
          setEtat('local');
        }
      } finally {
        enVolRef.current = false;
        const suivant = enAttenteRef.current;
        enAttenteRef.current = null;
        if (suivant) void pousser(suivant);
      }
    },
    [ecrireLocal, formulaireCode],
  );

  /** Enregistre localement puis programme la synchronisation serveur. */
  const enregistrer = useCallback(
    (reponses: ReponsesFormulaire, coords?: { lat?: number; lng?: number }) => {
      // Jamais avant hydratation : ce serait écraser un brouillon existant par `{}`.
      if (!pret) return;
      const snapshot = ecrireLocal(reponses, true, coords);
      setDerniereSauvegarde(new Date());
      if (!isOnlineRef.current) {
        setEtat('local');
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void pousser(snapshot), DELAI_AUTOSAVE);
    },
    [pret, ecrireLocal, pousser],
  );

  /** Vide le débounce et pousse tout de suite — avant une finalisation. */
  const forcerSync = useCallback(
    async (reponses: ReponsesFormulaire, coords?: { lat?: number; lng?: number }) => {
      if (!pret) return undefined;
      if (timerRef.current) clearTimeout(timerRef.current);
      const snapshot = ecrireLocal(reponses, true, coords);
      await pousser(snapshot);
      return soumissionIdRef.current;
    },
    [pret, ecrireLocal, pousser],
  );

  // Retour du réseau : on repousse ce qui restait en local pour ce brouillon précis.
  useEffect(() => {
    if (!isOnline || !pret) return;
    const local = lireBrouillonLocal(userId, idRef.current);
    if (local?.enAttenteSync) void pousser(local);
  }, [isOnline, pret, userId, pousser]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const terminer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    effacerBrouillonLocal(userId, idRef.current);
  }, [userId]);

  return {
    etat,
    derniereSauvegarde,
    pret,
    enregistrer,
    forcerSync,
    hydrater,
    terminer,
    clientSubmissionId: idRef.current,
    soumissionId: soumissionIdRef.current,
    isOnline,
  };
}
