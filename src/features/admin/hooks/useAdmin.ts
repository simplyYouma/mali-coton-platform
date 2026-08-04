import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchParametreAnalyses, fetchParametreUnites } from '../api/referentiels';
import {
  createIndicator,
  createPermission,
  createRole,
  createUser,
  deleteIndicator,
  deletePermission,
  deleteRole,
  deleteUser,
  fetchAuditLogs,
  fetchIndicatorsAdmin,
  fetchPermissions,
  fetchRoles,
  fetchThresholds,
  fetchUsers,
  updateIndicator,
  updatePermission,
  updateRole,
  updateThreshold,
  updateUser,
  type IndicatorCreateInput,
  type IndicatorUpdateInput,
} from '../api/admin';
import type {
  AuditFilter,
  PermissionCreateInput,
  PermissionUpdateInput,
  RoleCreateInput,
  RoleUpdateInput,
  ThresholdUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from '../api/admin.types';

const USERS_KEY = ['admin', 'users'] as const;
const ROLES_KEY = ['admin', 'roles'] as const;
const PERMISSIONS_KEY = ['admin', 'permissions'] as const;
const THRESHOLDS_KEY = ['admin', 'thresholds'] as const;
const AUDIT_KEY = ['admin', 'audit'] as const;
const INDICATORS_KEY = ['admin', 'indicators'] as const;

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers });
}

export function useRoles() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: fetchRoles });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleCreateInput) => createRole(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoleUpdateInput }) => updateRole(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function usePermissions() {
  return useQuery({ queryKey: PERMISSIONS_KEY, queryFn: fetchPermissions });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PermissionCreateInput) => createPermission(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PermissionUpdateInput }) =>
      updatePermission(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
  });
}

export function useDeletePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePermission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserUpdateInput }) =>
      updateUser(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useThresholds() {
  return useQuery({ queryKey: THRESHOLDS_KEY, queryFn: fetchThresholds });
}

export function useUpdateThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      indicatorId,
      patch,
    }: {
      indicatorId: string;
      patch: ThresholdUpdateInput;
    }) => updateThreshold(indicatorId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: THRESHOLDS_KEY }),
  });
}

export function useIndicatorsAdmin() {
  return useQuery({ queryKey: INDICATORS_KEY, queryFn: fetchIndicatorsAdmin });
}

export function useCreateIndicator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IndicatorCreateInput) => createIndicator(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: INDICATORS_KEY }),
  });
}

export function useUpdateIndicator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IndicatorUpdateInput }) =>
      updateIndicator(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: INDICATORS_KEY }),
  });
}

export function useDeleteIndicator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIndicator(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INDICATORS_KEY }),
  });
}

export function useParametreUnites() {
  return useQuery({
    queryKey: ['referentiels', 'unites'],
    queryFn: fetchParametreUnites,
    staleTime: 5 * 60_000,
  });
}

export function useParametreAnalyses() {
  return useQuery({
    queryKey: ['referentiels', 'analyses'],
    queryFn: fetchParametreAnalyses,
    staleTime: 5 * 60_000,
  });
}

export function useAuditLogs(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: [...AUDIT_KEY, filter],
    queryFn: () => fetchAuditLogs(filter),
  });
}
