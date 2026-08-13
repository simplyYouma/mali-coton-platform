import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';
import type {
  AlertAcknowledgeInput,
  AlertEntry,
  AlertFilter,
  AlertResolveInput,
} from './alerts.types';

export function fetchAlerts(filter: AlertFilter = {}): Promise<Paginated<AlertEntry>> {
  if (API_MODE === 'live') {
    return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 });
  }
  const params = new URLSearchParams();
  if (filter.severity) params.set('severity', filter.severity);
  if (filter.status) params.set('status', filter.status);
  if (filter.siteId) params.set('siteId', filter.siteId);
  if (filter.category) params.set('category', filter.category);
  const qs = params.toString();
  return http<Paginated<AlertEntry>>(`/alerts${qs ? `?${qs}` : ''}`);
}

export function acknowledgeAlert(id: string, input: AlertAcknowledgeInput): Promise<AlertEntry> {
  return http<AlertEntry>(`/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resolveAlert(id: string, input: AlertResolveInput): Promise<AlertEntry> {
  return http<AlertEntry>(`/alerts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
