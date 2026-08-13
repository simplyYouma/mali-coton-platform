import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';
import type {
  AuditFilter,
  AuditLogEntry,
  BackendPermission,
  BackendRole,
  ManagedUser,
  PermissionCreateInput,
  PermissionUpdateInput,
  RoleCreateInput,
  RoleUpdateInput,
  ThresholdConfig,
  ThresholdUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from './admin.types';

/* ───── Users adapter ───── */

interface UserBackend {
  '@id'?: string;
  id: number | string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  actif?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userIdentifier?: string | null;
  // backend live : tableau d'IRIs ex. ["/api/roles/1"]
  roles?: string[];
  // alias mock
  fullName?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  assignedSiteIds?: string[];
  lastLoginAt?: string | null;
  phone?: string | null;
}

function toManagedUser(b: UserBackend): ManagedUser {
  const nom = b.nom ?? '';
  const prenom = b.prenom ?? '';
  return {
    id: String(b.id),
    email: b.email ?? '',
    nom,
    prenom,
    fullName: b.fullName ?? ([prenom, nom].filter(Boolean).join(' ') || (b.email ?? String(b.id))),
    role: 'visitor',
    roleIris: b.roles ?? [],
    isActive: b.isActive ?? b.actif ?? true,
    assignedSiteIds: b.assignedSiteIds ?? [],
    locale: 'fr',
    createdAt: b.createdAt ?? new Date().toISOString(),
    lastLoginAt: b.lastLoginAt ?? undefined,
    phone: b.phone ?? undefined,
  };
}

/* ───── Users ───── */

export async function fetchUsers(): Promise<Paginated<ManagedUser>> {
  const raw = await http<unknown>(resourcePath('users'));
  if (API_MODE === 'live') {
    const page = unwrapPaginated<UserBackend>(raw);
    return { ...page, items: page.items.map(toManagedUser) };
  }
  return raw as Paginated<ManagedUser>;
}

export function createUser(input: UserCreateInput): Promise<ManagedUser> {
  return http<ManagedUser>(resourcePath('users'), { method: 'POST', body: input });
}

export function updateUser(id: string, patch: UserUpdateInput): Promise<ManagedUser> {
  return http<ManagedUser>(resourcePath('users', id), { method: 'PATCH', body: patch });
}

export function deleteUser(id: string): Promise<void> {
  return http<void>(resourcePath('users', id), { method: 'DELETE' });
}

/* ───── Roles ───── */

export async function fetchRoles(): Promise<BackendRole[]> {
  const raw = await http<unknown>(resourcePath('roles'));
  if (API_MODE === 'live') {
    const page = unwrapPaginated<BackendRole>(raw);
    return page.items;
  }
  return (raw as { items?: BackendRole[] }).items ?? [];
}

export function createRole(input: RoleCreateInput): Promise<BackendRole> {
  return http<BackendRole>(resourcePath('roles'), { method: 'POST', body: input });
}

export function updateRole(id: string, patch: RoleUpdateInput): Promise<BackendRole> {
  return http<BackendRole>(resourcePath('roles', id), { method: 'PUT', body: patch });
}

export function deleteRole(id: string): Promise<void> {
  return http<void>(resourcePath('roles', id), { method: 'DELETE' });
}

/* ───── Permissions ───── */

export async function fetchPermissions(): Promise<BackendPermission[]> {
  const raw = await http<unknown>(resourcePath('permissions'));
  if (API_MODE === 'live') {
    const page = unwrapPaginated<BackendPermission>(raw);
    return page.items;
  }
  return (raw as { items?: BackendPermission[] }).items ?? [];
}

export function createPermission(input: PermissionCreateInput): Promise<BackendPermission> {
  return http<BackendPermission>(resourcePath('permissions'), { method: 'POST', body: input });
}

export function updatePermission(id: string, patch: PermissionUpdateInput): Promise<BackendPermission> {
  return http<BackendPermission>(resourcePath('permissions', id), { method: 'PUT', body: patch });
}

export function deletePermission(id: string): Promise<void> {
  return http<void>(resourcePath('permissions', id), { method: 'DELETE' });
}

/* ───── Thresholds (norme_rejets) ───── */

export async function fetchThresholds(): Promise<Paginated<ThresholdConfig>> {
  const raw = await http<unknown>(resourcePath('thresholds'));
  if (API_MODE === 'live') return unwrapPaginated<ThresholdConfig>(raw);
  return raw as Paginated<ThresholdConfig>;
}

export function updateThreshold(
  indicatorId: string,
  patch: ThresholdUpdateInput,
): Promise<ThresholdConfig> {
  return http<ThresholdConfig>(resourcePath('thresholds', indicatorId), {
    method: 'PATCH',
    body: patch,
  });
}

/* ───── Indicators (parametre_analyses) ───── */

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

export async function fetchIndicatorsAdmin(): Promise<Paginated<Indicator>> {
  const raw = await http<unknown>(resourcePath('indicators'));
  if (API_MODE === 'live') return unwrapPaginated<Indicator>(raw);
  return raw as Paginated<Indicator>;
}

export function createIndicator(input: IndicatorCreateInput): Promise<Indicator> {
  return http<Indicator>(resourcePath('indicators'), { method: 'POST', body: input });
}

export function updateIndicator(id: string, patch: IndicatorUpdateInput): Promise<Indicator> {
  return http<Indicator>(resourcePath('indicators', id), { method: 'PATCH', body: patch });
}

export function deleteIndicator(id: string): Promise<void> {
  return http<void>(resourcePath('indicators', id), { method: 'DELETE' });
}

/* ───── Audit logs (mock uniquement — pas d'endpoint backend) ───── */

export function fetchAuditLogs(filter: AuditFilter = {}): Promise<Paginated<AuditLogEntry>> {
  if (API_MODE === 'live') {
    return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 });
  }
  const params = new URLSearchParams();
  if (filter.actorId) params.set('actorId', filter.actorId);
  if (filter.action) params.set('action', filter.action);
  if (filter.resourceType) params.set('resourceType', filter.resourceType);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return http<Paginated<AuditLogEntry>>(`/audit-logs${qs ? `?${qs}` : ''}`);
}
