import { useCallback, useEffect, useRef, useState } from 'react';
import { useOffline } from '@/app/providers/OfflineProvider';
import { completerBrouillon, creerBrouillon } from '../api/formulairesNatifs';
import type { ReponsesFormulaire } from '../api/formulairesNatifs.types';

/**
 * Brouillon de saisie : persistance locale d'abord, serveur ensuite.
 *
 * Le terrain est le cas nominal, pas l'exception — la saisie doit survivre à
 * une coupure réseau, à une session expirée et à un rechargement de page. On
 * écrit donc systématiquement en localStorage, et on ne pousse au serveur que
 * de façon opportuniste (débounce ~2 s). Le `clientSubmissionId` est généré
 * côté client pour que la reprise en ligne puisse réconcilier sans doublon.
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
}

function cle(formulaireCode: string): string {
  return `${PREFIXE}${formulaireCode}`;
}

function nouvelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function lireBrouillonLocal(formulaireCode: string): BrouillonLocal | null {
  try {
    const brut = localStorage.getItem(cle(formulaireCode));
    return brut ? (JSON.parse(brut) as BrouillonLocal) : null;
  } catch {
    return null;
  }
}

export function effacerBrouillonLocal(formulaireCode: string): void {
  try {
    localStorage.removeItem(cle(formulaireCode));
  } catch {
    /* quota ou mode privé : sans effet sur la suite */
  }
}

/** Tous les brouillons locaux restant à pousser — utilisé à la reprise réseau. */
export function brouillonsEnAttente(): BrouillonLocal[] {
  const out: BrouillonLocal[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIXE)) continue;
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

interface Options {
  formulaireCode: string;
  /** Reprise d'un brouillon serveur existant. */
  soumissionInitiale?: { id: number; clientSubmissionId: string };
}

export function useBrouillonLocal({ formulaireCode, soumissionInitiale }: Options) {
  const { isOnline } = useOffline();

  const [etat, setEtat] = useState<EtatSauvegarde>('idle');
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<Date | null>(null);

  /* Refs plutôt qu'état : ces valeurs sont lues par le minuteur d'auto-save et
   * ne doivent pas le relancer à chaque frappe. */
  const idRef = useRef<string>(soumissionInitiale?.clientSubmissionId ?? nouvelId());
  const soumissionIdRef = useRef<number | undefined>(soumissionInitiale?.id);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVolRef = useRef(false);
  const enAttenteRef = useRef<BrouillonLocal | null>(null);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  // Reprise : réhydrate l'identité depuis le brouillon local s'il en existe un.
  useEffect(() => {
    const local = lireBrouillonLocal(formulaireCode);
    if (local && !soumissionInitiale) {
      idRef.current = local.clientSubmissionId;
      soumissionIdRef.current = local.soumissionId;
      if (local.majLe) setDerniereSauvegarde(new Date(local.majLe));
      setEtat(local.enAttenteSync ? 'local' : 'enregistre');
    }
  }, [formulaireCode, soumissionInitiale]);

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
      };
      try {
        localStorage.setItem(cle(formulaireCode), JSON.stringify(snapshot));
      } catch {
        /* quota dépassé : la saisie en mémoire reste utilisable */
      }
      return snapshot;
    },
    [formulaireCode],
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
      } catch {
        /* Échec réseau ou serveur : la copie locale fait foi et reste marquée
         * en attente, la reprise en ligne la repoussera. */
        setEtat('local');
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
      const snapshot = ecrireLocal(reponses, true, coords);
      setDerniereSauvegarde(new Date());
      if (!isOnlineRef.current) {
        setEtat('local');
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void pousser(snapshot), DELAI_AUTOSAVE);
    },
    [ecrireLocal, pousser],
  );

  /** Vide le débounce et pousse tout de suite — avant une finalisation. */
  const forcerSync = useCallback(
    async (reponses: ReponsesFormulaire, coords?: { lat?: number; lng?: number }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const snapshot = ecrireLocal(reponses, true, coords);
      await pousser(snapshot);
      return soumissionIdRef.current;
    },
    [ecrireLocal, pousser],
  );

  // Retour du réseau : on repousse ce qui restait en local.
  useEffect(() => {
    if (!isOnline) return;
    const local = lireBrouillonLocal(formulaireCode);
    if (local?.enAttenteSync) void pousser(local);
  }, [isOnline, formulaireCode, pousser]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const terminer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    effacerBrouillonLocal(formulaireCode);
  }, [formulaireCode]);

  return {
    etat,
    derniereSauvegarde,
    enregistrer,
    forcerSync,
    terminer,
    clientSubmissionId: idRef.current,
    soumissionId: soumissionIdRef.current,
    isOnline,
  };
}
