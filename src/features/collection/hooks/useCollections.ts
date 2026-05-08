import { useQuery } from '@tanstack/react-query';
import { fetchCollection, fetchCollections, fetchIndicators, type CollectionsQuery } from '../api/collections';

export function useCollections(query: CollectionsQuery = {}) {
  return useQuery({
    queryKey: ['collections', query],
    queryFn: () => fetchCollections(query),
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: ['collections', id],
    queryFn: () => fetchCollection(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useIndicators() {
  return useQuery({
    queryKey: ['indicators'],
    queryFn: fetchIndicators,
    staleTime: 5 * 60 * 1000,
  });
}
