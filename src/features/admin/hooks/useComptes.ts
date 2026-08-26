import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  creerCompte,
  creerRole,
  fetchComptes,
  fetchPermissionsAdmin,
  fetchRolesAdmin,
  modifierCompte,
  modifierRole,
  supprimerCompte,
  supprimerRole,
  type CompteInput,
  type RoleInput,
} from '../api/comptes';

const CLE_COMPTES = ['admin', 'comptes'];
const CLE_ROLES = ['admin', 'roles'];
const CLE_PERMISSIONS = ['admin', 'permissions'];

export function useComptes() {
  return useQuery({ queryKey: CLE_COMPTES, queryFn: fetchComptes });
}

export function useRolesAdmin() {
  return useQuery({ queryKey: CLE_ROLES, queryFn: fetchRolesAdmin });
}

/** Catalogue des permissions — stable, mis en cache longuement. */
export function usePermissionsAdmin() {
  return useQuery({
    queryKey: CLE_PERMISSIONS,
    queryFn: fetchPermissionsAdmin,
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreerCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompteInput) => creerCompte(input),
    /* La réponse de création n'est pas fiable (rôles vides) : on repart du
     * serveur plutôt que d'injecter le résultat dans le cache. */
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_COMPTES }),
  });
}

export function useModifierCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CompteInput> }) =>
      modifierCompte(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_COMPTES }),
  });
}

export function useSupprimerCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supprimerCompte(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_COMPTES }),
  });
}

export function useCreerRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) => creerRole(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_ROLES }),
  });
}

export function useModifierRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RoleInput> }) =>
      modifierRole(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_ROLES }),
  });
}

export function useSupprimerRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supprimerRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE_ROLES }),
  });
}
