import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { PERM } from '@/features/auth/lib/permissions';
import {
  ajouterChamp,
  completerBrouillon,
  creerBrouillon,
  fetchBrouillon,
  fetchBrouillons,
  fetchBrouillonsSelonPortee,
  fetchBrouillonsTous,
  fetchFormulairePublie,
  fetchOptionsReference,
  finaliserSoumission,
  modifierChamp,
  normaliserEndpoint,
  supprimerChamp,
  uploaderFichierChamp,
  type AjouterChampInput,
  type BrouillonsTousParams,
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

export function useBrouillons(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['soumissions', 'brouillons'],
    queryFn: fetchBrouillons,
    staleTime: 60 * 1000,
    enabled: options.enabled ?? true,
  });
}

/**
 * Un brouillon précis, par son identifiant client.
 *
 * La reprise d'une saisie ne doit jamais se fier à la liste — potentiellement
 * paginée ou tronquée — pour retrouver LE bon brouillon parmi plusieurs du
 * même modèle : elle relit sa fiche directement.
 */
export function useBrouillon(clientSubmissionId: string | undefined) {
  return useQuery({
    queryKey: ['soumissions', 'brouillons', clientSubmissionId],
    queryFn: () => fetchBrouillon(clientSubmissionId!),
    enabled: Boolean(clientSubmissionId),
    staleTime: 0,
    /* Un 404 est un cas légitime — un brouillon jamais synchronisé n'existe
     * pas côté serveur, et doit se reprendre avec la seule copie locale.
     * Le retenter retarderait cette reprise sans raison. */
    retry: false,
  });
}

/**
 * Brouillons dans la portée que l'appelant a le droit de voir.
 *
 * Le choix d'endpoint (`/brouillons` propre, ou `/brouillons/tous` paginé)
 * vit dans `fetchBrouillonsSelonPortee` — ce hook ne fait qu'évaluer la
 * permission (seul un hook le peut) et la lui passer. Jamais l'inverse : un
 * composant qui appellerait `/tous` puis filtrerait laisserait les données
 * des autres agents transiter jusqu'au navigateur.
 */
export function useBrouillonsPortee(params: BrouillonsTousParams = {}) {
  const { peut } = useAutorisations();
  const peutVoirTout = peut(PERM.soumissionValidate);
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'soumissions',
      'brouillons',
      'portee',
      peutVoirTout,
      params.page ?? 1,
      params.limite ?? null,
      params.formulaireCode ?? null,
    ],
    queryFn: () => fetchBrouillonsSelonPortee(peutVoirTout, params),
    staleTime: 60 * 1000,
  });
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    peutVoirTout,
    isLoading,
    isError,
  };
}

/**
 * Total de brouillons par modèle — pour les badges (« Mes brouillons (N) »,
 * compteur par carte de `ModelesFormulairePage`).
 *
 * En vue « tous », une requête `limite=1` par modèle ne lit que `total` :
 * jamais un parcours de pages entier pour un simple chiffre.
 */
export function useComptesBrouillonsServeur() {
  const { peut } = useAutorisations();
  const peutVoirTout = peut(PERM.soumissionValidate);

  const resultats = useQueries({
    queries: CODES_FORMULAIRES.map((code) => ({
      queryKey: ['soumissions', 'brouillons', 'tous', 'compte', code],
      queryFn: () => fetchBrouillonsTous({ formulaireCode: code, page: 1, limite: 1 }).then((r) => r.total),
      enabled: peutVoirTout,
      staleTime: 60 * 1000,
    })),
  });

  return {
    peutVoirTout,
    isLoading: peutVoirTout && resultats.some((r) => r.isLoading),
    comptesParCode: peutVoirTout
      ? new Map(CODES_FORMULAIRES.map((code, i) => [code, resultats[i]?.data ?? 0]))
      : null,
  };
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
