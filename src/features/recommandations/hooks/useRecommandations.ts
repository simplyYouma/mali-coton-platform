import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecommandation,
  deleteRecommandation,
  fetchRecommandation,
  fetchRecommandations,
  updateRecommandation,
  type RecommandationsQuery,
} from '../api/recommandations';
import type {
  RecommandationCreateInput,
  RecommandationUpdateInput,
} from '../api/recommandations.types';

const KEY = ['recommandations'] as const;

export function useRecommandations(query: RecommandationsQuery = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => fetchRecommandations(query),
  });
}

export function useRecommandation(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'item', id],
    queryFn: () => fetchRecommandation(id!),
    enabled: Boolean(id),
  });
}

export function useCreateRecommandation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecommandationCreateInput) => createRecommandation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateRecommandation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecommandationUpdateInput }) =>
      updateRecommandation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRecommandation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecommandation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
