import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSite,
  deleteSite,
  fetchSite,
  fetchSiteDetail,
  fetchSites,
  updateSite,
  type SiteInput,
  type SitesQuery,
} from '../api/sites';
import { fetchSitePhotos } from '../api/sitePhotos';
import { fetchSiteEmployes } from '../api/siteEmployes';

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

export function useSiteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['siteDetail', id],
    queryFn: () => fetchSiteDetail(id ?? ''),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useSiteEmployes(id: string | undefined) {
  return useQuery({
    queryKey: ['siteEmployes', id],
    queryFn: () => fetchSiteEmployes(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useSitePhotos(collecteSiteId: number | null | undefined) {
  return useQuery({
    queryKey: ['sitePhotos', collecteSiteId],
    queryFn: () => fetchSitePhotos(collecteSiteId!),
    enabled: collecteSiteId != null && collecteSiteId > 0,
    staleTime: 60_000,
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
