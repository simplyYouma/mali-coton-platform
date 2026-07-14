import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchImportHistory, triggerKoboImport, type KoboImportType } from '../api/koboImport';

const HISTORY_KEY = ['kobo', 'history'] as const;

export function useKoboImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: KoboImportType) => triggerKoboImport(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

export function useImportHistory() {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: fetchImportHistory,
    retry: false,
    staleTime: 30_000,
  });
}
