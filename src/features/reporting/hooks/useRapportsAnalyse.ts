import { useQuery } from '@tanstack/react-query';
import { fetchRapportAnalyseDetail, fetchRapportsAnalyse } from '../api/rapportsAnalyse';

export function useRapportsAnalyse() {
  return useQuery({
    queryKey: ['rapports-analyse'],
    queryFn: fetchRapportsAnalyse,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRapportAnalyseDetail(id: string | null) {
  return useQuery({
    queryKey: ['rapports-analyse', id],
    queryFn: () => fetchRapportAnalyseDetail(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
