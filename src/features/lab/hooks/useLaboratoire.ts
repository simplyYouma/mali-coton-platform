import { useQuery } from '@tanstack/react-query';
import {
  fetchEchantillons,
  fetchLaboratoires,
  fetchPrelevements,
  fetchResultatsAnalyse,
  type EchantillonsQuery,
  type PrelevementsQuery,
  type ResultatsQuery,
} from '../api/laboratoire';

export function usePrelevements(query: PrelevementsQuery = {}) {
  return useQuery({
    queryKey: ['prelevements', query],
    queryFn: () => fetchPrelevements(query),
    staleTime: 60_000,
  });
}

export function useEchantillons(query: EchantillonsQuery = {}) {
  return useQuery({
    queryKey: ['echantillons', query],
    queryFn: () => fetchEchantillons(query),
    staleTime: 60_000,
  });
}

export function useLaboratoires() {
  return useQuery({
    queryKey: ['laboratoires'],
    queryFn: fetchLaboratoires,
    staleTime: 300_000,
  });
}

export function useResultatsAnalyse(query: ResultatsQuery = {}) {
  return useQuery({
    queryKey: ['resultatsAnalyse', query],
    queryFn: () => fetchResultatsAnalyse(query),
    staleTime: 60_000,
  });
}
