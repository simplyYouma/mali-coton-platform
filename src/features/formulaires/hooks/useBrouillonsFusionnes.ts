import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { brouillonsEnAttente, type BrouillonLocal } from './useBrouillonLocal';
import { useBrouillons, useBrouillonsPortee, useComptesBrouillonsServeur } from './useFormulairesNatifs';
import type { ReponsesFormulaire, SoumissionNative } from '../api/formulairesNatifs.types';

/** Brouillon présenté à l'utilisateur, quelle que soit son origine. */
export interface BrouillonFusionne {
  clientSubmissionId: string;
  formulaireCode: string;
  /** Absent tant que le brouillon n'a pas atteint le serveur. */
  soumissionId?: number;
  reponses: ReponsesFormulaire;
  majLe: string;
  /** `local` = pas encore synchronisé (saisi hors ligne, ou envoi en échec). */
  origine: 'serveur' | 'local';
  /** Auteur — `null` pour un brouillon purement local, jamais monté au serveur. */
  createdById: number | null;
}

function depuisServeur(s: SoumissionNative): BrouillonFusionne {
  return {
    clientSubmissionId: s.clientSubmissionId,
    formulaireCode: s.formulaireCode,
    soumissionId: s.id,
    reponses: s.reponses ?? {},
    majLe: s.updatedAt || s.createdAt || '',
    origine: 'serveur',
    createdById: s.createdById,
  };
}

function depuisLocal(b: BrouillonLocal): BrouillonFusionne {
  return {
    clientSubmissionId: b.clientSubmissionId,
    formulaireCode: b.formulaireCode,
    soumissionId: b.soumissionId,
    reponses: b.reponses ?? {},
    majLe: b.majLe,
    origine: 'local',
    createdById: null,
  };
}

function plusRecent(a: BrouillonFusionne, b: BrouillonFusionne): BrouillonFusionne {
  const ta = Date.parse(a.majLe) || 0;
  const tb = Date.parse(b.majLe) || 0;
  return tb > ta ? b : a;
}

/** Fusionne une liste serveur et les brouillons locaux en attente d'un utilisateur, dédupliqués par `clientSubmissionId`. */
function fusionner(serveur: SoumissionNative[], locaux: BrouillonLocal[]): BrouillonFusionne[] {
  const parId = new Map<string, BrouillonFusionne>();
  for (const s of serveur) {
    if (!s.clientSubmissionId) continue;
    parId.set(s.clientSubmissionId, depuisServeur(s));
  }
  for (const l of locaux) {
    const candidat = depuisLocal(l);
    const existant = parId.get(l.clientSubmissionId);
    parId.set(l.clientSubmissionId, existant ? plusRecent(existant, candidat) : candidat);
  }
  return [...parId.values()].sort((a, b) => (Date.parse(b.majLe) || 0) - (Date.parse(a.majLe) || 0));
}

/**
 * Total de brouillons par modèle — pour « Mes brouillons (N) » et le
 * compteur par carte de `ModelesFormulairePage`.
 *
 * Le cloisonnement par auteur est porté par l'API (`GET /soumissions/brouillons`
 * pour un agent, `GET /soumissions/brouillons/tous` pour qui détient
 * `soumission.validate`) — jamais par un filtrage côté client sur `createdById`,
 * qui laisserait les données des autres agents transiter jusqu'au navigateur
 * avant d'être coupées. Voir `fetchBrouillonsSelonPortee`.
 *
 * En vue « tous », les totaux viennent de requêtes serveur légères
 * (`limite=1` par modèle, voir `useComptesBrouillonsServeur`) : les
 * brouillons locaux en attente d'un superviseur n'y sont pas fusionnés — un
 * chiffre à la seconde près n'en vaut pas le coût d'un chargement complet
 * juste pour un badge. La liste réelle (`useBrouillonsListe`), elle, fait
 * cette fusion.
 */
export function useComptesBrouillons() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { peutVoirTout, isLoading: chargementServeur, comptesParCode: comptesServeur } =
    useComptesBrouillonsServeur();
  // Vue « tous » : le compte par modèle vient des requêtes légères ci-dessus,
  // `/soumissions/brouillons` (portée propre) est inutile pour ce badge.
  const proprePortee = useBrouillons({ enabled: !peutVoirTout });

  const itemsPropres = useMemo(() => {
    if (peutVoirTout || !userId) return [];
    return fusionner(proprePortee.data ?? [], brouillonsEnAttente(userId));
  }, [peutVoirTout, userId, proprePortee.data]);

  const compteParCode = useMemo(() => {
    if (peutVoirTout) return comptesServeur ?? new Map<string, number>();
    const map = new Map<string, number>();
    itemsPropres.forEach((b) => map.set(b.formulaireCode, (map.get(b.formulaireCode) ?? 0) + 1));
    return map;
  }, [peutVoirTout, comptesServeur, itemsPropres]);

  const total = useMemo(
    () => [...compteParCode.values()].reduce((s, n) => s + n, 0),
    [compteParCode],
  );

  return {
    compteParCode,
    total,
    peutVoirTout,
    isLoading: peutVoirTout ? chargementServeur : proprePortee.isLoading,
    isError: peutVoirTout ? false : proprePortee.isError,
  };
}

export interface BrouillonsListeParams {
  page?: number;
  limite?: number;
  formulaireCode?: string;
}

/**
 * Liste affichable des brouillons (page `BrouillonsPage`).
 *
 * Vue agent : `/soumissions/brouillons` (déjà cloisonnée par l'API) fusionnée
 * avec les brouillons locaux non encore synchronisés de cet utilisateur —
 * liste courte, pas de pagination réelle.
 *
 * Vue « tous » (`soumission.validate`) : `/soumissions/brouillons/tous`,
 * paginée et filtrable par modèle côté serveur, fusionnée avec les *seuls*
 * brouillons locaux du superviseur lui-même — ceux restés sur l'appareil
 * d'un autre agent ne sont pas les siens à fusionner ici. Cette fusion peut
 * ajouter jusqu'à quelques lignes à la page affichée : approximation
 * acceptée, un brouillon local en attente est un cas rare et transitoire.
 */
export function useBrouillonsListe(params: BrouillonsListeParams = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const portee = useBrouillonsPortee(params);

  const items = useMemo(() => {
    if (!userId) return portee.items.map(depuisServeur);
    if (!portee.peutVoirTout) {
      return fusionner(portee.items, brouillonsEnAttente(userId));
    }
    const locauxPropres = brouillonsEnAttente(userId).filter(
      (l) => !params.formulaireCode || l.formulaireCode === params.formulaireCode,
    );
    return fusionner(portee.items, locauxPropres);
  }, [portee.items, portee.peutVoirTout, userId, params.formulaireCode]);

  return {
    items,
    total: portee.peutVoirTout ? portee.total : items.length,
    peutVoirTout: portee.peutVoirTout,
    isLoading: portee.isLoading,
    isError: portee.isError,
  };
}
