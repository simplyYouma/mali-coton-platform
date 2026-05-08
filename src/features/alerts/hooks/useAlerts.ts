import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acknowledgeAlert, fetchAlerts, resolveAlert } from '../api/alerts';
import type {
  AlertAcknowledgeInput,
  AlertFilter,
  AlertResolveInput,
} from '../api/alerts.types';

const ALERTS_KEY = ['alerts'] as const;

export function useAlerts(filter: AlertFilter = {}) {
  return useQuery({
    queryKey: [...ALERTS_KEY, filter],
    queryFn: () => fetchAlerts(filter),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AlertAcknowledgeInput }) =>
      acknowledgeAlert(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AlertResolveInput }) =>
      resolveAlert(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}
