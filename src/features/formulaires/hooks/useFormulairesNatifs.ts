import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ajouterChamp,
  completerBrouillon,
  creerBrouillon,
  fetchBrouillons,
  fetchFormulairePublie,
  fetchOptionsReference,
  finaliserSoumission,
  modifierChamp,
  normaliserEndpoint,
  supprimerChamp,
  uploaderFichierChamp,
  type AjouterChampInput,
} from '../api/formulairesNatifs';
import {
  CODES_FORMULAIRES,
  type ChampNatif,
  type CompleterBrouillonInput,
  type CreerBrouillonInput,
  type OptionsSource,
} from '../api/formulairesNatifs.types';

/** Les listes de référence bougent peu : on évite de les refetcher en pleine saisie. */
const STALE_REFERENCES = 30 * 60 * 1000;
const STALE_SCHEMA = 10 * 60 * 1000;

/* ── Schémas ── */

export function useFormulairePublie(code: string | undefined) {
  return useQuery({
    queryKey: ['formulaire-publie', code],
    queryFn: () => fetchFormulairePublie(code!),
    enabled: Boolean(code),
    staleTime: STALE_SCHEMA,
  });
}

/** Catalogue : les 3 schémas publiés, chargés en parallèle et mis en cache par code. */
export function useFormulairesPublies() {
  const resultats = useQueries({
    queries: CODES_FORMULAIRES.map((code) => ({
      queryKey: ['formulaire-publie', code],
      queryFn: () => fetchFormulairePublie(code),
      staleTime: STALE_SCHEMA,
    })),
  });
  return {
    formulaires: resultats.flatMap((r) => (r.data ? [r.data] : [])),
    isLoading: resultats.some((r) => r.isLoading),
    isError: resultats.every((r) => r.isError),
  };
}

/* ── Brouillons ── */

export function useBrouillons() {
  return useQuery({
    queryKey: ['soumissions', 'brouillons'],
    queryFn: fetchBrouillons,
    staleTime: 60 * 1000,
  });
}

export function useCreerBrouillon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreerBrouillonInput) => creerBrouillon(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soumissions', 'brouillons'] }),
  });
}

export function useCompleterBrouillon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleterBrouillonInput }) =>
      completerBrouillon(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soumissions', 'brouillons'] }),
  });
}

export function useFinaliserSoumission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => finaliserSoumission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soumissions'] }),
  });
}

export function useUploaderFichier() {
  return useMutation({
    mutationFn: ({
      soumissionId,
      champCode,
      fichier,
    }: {
      soumissionId: number | string;
      champCode: string;
      fichier: File;
    }) => uploaderFichierChamp(soumissionId, champCode, fichier),
  });
}

/* ── Listes de référence ── */

/**
 * Options d'un champ à liste dynamique.
 *
 * La clé de cache porte l'endpoint et non le champ : plusieurs champs visent
 * la même ressource (`sites-collecte` est référencé par FICHE_SITE comme par
 * FICHE_EMPLOYE) et doivent partager une seule requête.
 */
export function useOptionsReference(source: OptionsSource | null | undefined) {
  return useQuery({
    queryKey: ['reference-options', source ? normaliserEndpoint(source.endpoint) : null],
    queryFn: () => fetchOptionsReference(source!),
    enabled: Boolean(source),
    staleTime: STALE_REFERENCES,
    retry: false,
  });
}

/* ── Constructeur ── */

export function useAjouterChamp(formulaireCode: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formulaireId, input }: { formulaireId: number; input: AjouterChampInput }) =>
      ajouterChamp(formulaireId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulaire-publie', formulaireCode] }),
  });
}

export function useModifierChamp(formulaireCode: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ champId, patch }: { champId: number; patch: Partial<Omit<ChampNatif, 'id'>> }) =>
      modifierChamp(champId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulaire-publie', formulaireCode] }),
  });
}

export function useSupprimerChamp(formulaireCode: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (champId: number) => supprimerChamp(champId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulaire-publie', formulaireCode] }),
  });
}
