import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSite,
  deleteSite,
  fetchSite,
  fetchSites,
  updateSite,
  type SiteInput,
  type SitesQuery,
} from '../api/sites';

export function useSites(query: SitesQuery = {}) {
  return useQuery({
    queryKey: ['sites', query],
    queryFn: () => fetchSites(query),
  });
}

export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: ['sites', id],
    queryFn: () => fetchSite(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteInput) => createSite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SiteInput> }) =>
      updateSite(id, patch),
    onSuccess: (site) => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.setQueryData(['sites', site.id], site);
    },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}
