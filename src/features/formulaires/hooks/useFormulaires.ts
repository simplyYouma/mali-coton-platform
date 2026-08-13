import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFormulaire,
  fetchFormulaires,
  fetchSoumission,
  fetchSoumissions,
  submitFormulaire,
  createFormulaire,
  updateFormulaire,
  deleteFormulaire,
  fetchChamps,
  fetchChamp,
  createChamp,
  updateChamp,
  deleteChamp,
  type FormulairesQuery,
  type SoumissionsQuery,
  type SoumissionInput,
  type SoumissionReponseInput,
} from '../api/formulaires';
import type { FormulaireInput, ChampInput, ChampUpdateInput } from '../api/formulaires.types';

/* ── Formulaires — lecture ── */

export function useFormulaires(query: FormulairesQuery = {}) {
  return useQuery({
    queryKey: ['formulaires', query],
    queryFn: () => fetchFormulaires(query),
  });
}

export function useFormulaire(id: string | undefined) {
  return useQuery({
    queryKey: ['formulaires', id],
    queryFn: () => fetchFormulaire(id ?? ''),
    enabled: Boolean(id),
  });
}

/* ── Formulaires — mutations ── */

export function useCreateFormulaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FormulaireInput) => createFormulaire(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulaires'] }),
  });
}

export function useUpdateFormulaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FormulaireInput> }) =>
      updateFormulaire(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['formulaires'] });
      qc.invalidateQueries({ queryKey: ['formulaires', id] });
    },
  });
}

export function useDeleteFormulaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFormulaire(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulaires'] }),
  });
}

/* ── Champs — lecture ── */

export function useChamps(formulaireId: string | undefined) {
  return useQuery({
    queryKey: ['champs', formulaireId],
    queryFn: () => fetchChamps(formulaireId ?? ''),
    enabled: Boolean(formulaireId),
  });
}

export function useChamp(id: string | undefined) {
  return useQuery({
    queryKey: ['champs', 'item', id],
    queryFn: () => fetchChamp(id ?? ''),
    enabled: Boolean(id),
  });
}

/* ── Champs — mutations ── */

export function useCreateChamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChampInput) => createChamp(input),
    onSuccess: (_data, input) => {
      const fid = input.formulaire.split('/').pop();
      qc.invalidateQueries({ queryKey: ['champs', fid] });
      qc.invalidateQueries({ queryKey: ['formulaires'] });
    },
  });
}

export function useUpdateChamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChampUpdateInput }) =>
      updateChamp(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['champs'] });
      qc.invalidateQueries({ queryKey: ['formulaires'] });
    },
  });
}

export function useDeleteChamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChamp(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['champs'] });
      qc.invalidateQueries({ queryKey: ['formulaires'] });
    },
  });
}

/* ── Soumissions ── */

export function useSoumissions(query: SoumissionsQuery = {}) {
  return useQuery({
    queryKey: ['soumissions', query],
    queryFn: () => fetchSoumissions(query),
  });
}

export function useSoumission(id: string | undefined) {
  return useQuery({
    queryKey: ['soumissions', id],
    queryFn: () => fetchSoumission(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useSubmitFormulaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      reponses,
    }: {
      input: SoumissionInput;
      reponses: SoumissionReponseInput[];
    }) => submitFormulaire(input, reponses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soumissions'] });
      qc.invalidateQueries({ queryKey: ['formulaires'] });
    },
  });
}
