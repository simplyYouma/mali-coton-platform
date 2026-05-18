import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLab, fetchLabs, type LabCreateInput } from '../api/labs';
import { cacheLabs, listAllCachedLabs } from '../lib/offlineDb';

/**
 * Hook référentiel labos — online puis cache offline (CDC §3.3 :
 * la sélection labo doit rester possible en cas de coupure réseau).
 */
export function useLabs() {
  return useQuery({
    queryKey: ['labs'],
    queryFn: async () => {
      try {
        const page = await fetchLabs();
        await cacheLabs(page.items);
        return page.items;
      } catch (err) {
        const cached = await listAllCachedLabs();
        if (cached.length > 0) return cached;
        throw err;
      }
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useCreateLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LabCreateInput) => createLab(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labs'] }),
  });
}
