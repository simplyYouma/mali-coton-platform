import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchConformiteGlobale, fetchConformiteSite } from '../api/conformite';

export function useConformiteGlobale() {
  return useQuery({
    queryKey: ['conformite-globale'],
    queryFn: fetchConformiteGlobale,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConformiteSite(siteId: string | undefined) {
  return useQuery({
    queryKey: ['conformite-site', siteId],
    queryFn: () => fetchConformiteSite(siteId!),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Détail de conformité pour plusieurs sites en parallèle — partage le cache
 * avec `useConformiteSite` (même queryKey). Utilisé pour agréger les
 * paramètres hors norme à l'échelle de la plateforme sur le dashboard.
 */
export function useConformiteDetails(siteIds: string[]) {
  return useQueries({
    queries: siteIds.map((id) => ({
      queryKey: ['conformite-site', id],
      queryFn: () => fetchConformiteSite(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
}
