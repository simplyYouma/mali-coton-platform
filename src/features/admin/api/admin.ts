import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import type {
  AuditFilter,
  AuditLogEntry,
  ManagedUser,
  ThresholdConfig,
  ThresholdUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from './admin.types';

/* ───── Users ───── */

export function fetchUsers(): Promise<Paginated<ManagedUser>> {
  return http<Paginated<ManagedUser>>('/users');
}

export function createUser(input: UserCreateInput): Promise<ManagedUser> {
  return http<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(input) });
}

export function updateUser(id: string, patch: UserUpdateInput): Promise<ManagedUser> {
  return http<ManagedUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteUser(id: string): Promise<void> {
  return http<void>(`/users/${id}`, { method: 'DELETE' });
}

/* ───── Thresholds ───── */

export function fetchThresholds(): Promise<Paginated<ThresholdConfig>> {
  return http<Paginated<ThresholdConfig>>('/thresholds');
}

export function updateThreshold(
  indicatorId: string,
  patch: ThresholdUpdateInput,
): Promise<ThresholdConfig> {
  return http<ThresholdConfig>(`/thresholds/${indicatorId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/* ───── Indicators (questionnaire) ───── */

import type { Indicator, IndicatorDomain } from '@/features/collection/api/collection.types';

export interface IndicatorCreateInput {
  domain: IndicatorDomain;
  label: string;
  unit: string;
  method?: string;
  source?: string;
  labOnly?: boolean;
  minOk?: number;
  maxOk?: number;
}

export type IndicatorUpdateInput = Partial<IndicatorCreateInput> & {
  isActive?: boolean;
};

export function fetchIndicatorsAdmin(): Promise<Paginated<Indicator>> {
  return http<Paginated<Indicator>>('/indicators');
}

export function createIndicator(input: IndicatorCreateInput): Promise<Indicator> {
  return http<Indicator>('/indicators', { method: 'POST', body: input });
}

export function updateIndicator(id: string, patch: IndicatorUpdateInput): Promise<Indicator> {
  return http<Indicator>(`/indicators/${id}`, { method: 'PATCH', body: patch });
}

export function deleteIndicator(id: string): Promise<void> {
  return http<void>(`/indicators/${id}`, { method: 'DELETE' });
}

/* ───── Audit logs ───── */

export function fetchAuditLogs(filter: AuditFilter = {}): Promise<Paginated<AuditLogEntry>> {
  const params = new URLSearchParams();
  if (filter.actorId) params.set('actorId', filter.actorId);
  if (filter.action) params.set('action', filter.action);
  if (filter.resourceType) params.set('resourceType', filter.resourceType);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return http<Paginated<AuditLogEntry>>(`/audit-logs${qs ? `?${qs}` : ''}`);
}
