import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIndicator,
  createUser,
  deleteIndicator,
  deleteUser,
  fetchAuditLogs,
  fetchIndicatorsAdmin,
  fetchThresholds,
  fetchUsers,
  updateIndicator,
  updateThreshold,
  updateUser,
  type IndicatorCreateInput,
  type IndicatorUpdateInput,
} from '../api/admin';
import type {
  AuditFilter,
  ThresholdUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from '../api/admin.types';

const USERS_KEY = ['admin', 'users'] as const;
const THRESHOLDS_KEY = ['admin', 'thresholds'] as const;
const AUDIT_KEY = ['admin', 'audit'] as const;
const INDICATORS_KEY = ['admin', 'indicators'] as const;

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers });
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

export function useAuditLogs(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: [...AUDIT_KEY, filter],
    queryFn: () => fetchAuditLogs(filter),
  });
}
