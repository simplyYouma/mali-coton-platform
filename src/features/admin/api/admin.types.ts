import type { AuditLogEntry } from '@/mocks/fixtures/auditLogs';
import type { Locale, UserRole } from '@/types/common';

export interface BackendRole {
  '@id'?: string;
  id: number | string;
  code: string;
  libelle: string;
  description?: string;
  permissions?: string[]; // IRIs
}

export interface BackendPermission {
  '@id'?: string;
  id: number | string;
  code: string;
  libelle: string;
  description?: string;
}

export interface RoleCreateInput {
  code: string;
  libelle: string;
  description?: string;
  permissions?: string[]; // IRIs
}

export type RoleUpdateInput = Partial<RoleCreateInput>;

export interface PermissionCreateInput {
  code: string;
  libelle: string;
  description?: string;
}

export type PermissionUpdateInput = Partial<PermissionCreateInput>;

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  nom: string;
  prenom: string;
  role: UserRole;
  roleIris: string[];
  assignedSiteIds: string[];
  locale: Locale;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  koboUsername?: string;
  labId?: string;
}

export interface UserCreateInput {
  nom: string;
  prenom: string;
  email: string;
  actif?: boolean;
  roles?: string[];
}

export type UserUpdateInput = Partial<UserCreateInput> & { actif?: boolean };

/**
 * Seuil configurable par l'admin — CDC §5.2 Module 4 + §8.6 (source normative).
 * Chaque seuil pointe vers un indicatorId du référentiel CDC §4.
 */
export interface ThresholdConfig {
  indicatorId: string;
  indicatorLabel: string;
  domain: 'water' | 'soil' | 'air' | 'waste' | 'health' | 'socio';
  unit: string;
  minOk: number | null;
  maxOk: number | null;
  source: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ThresholdUpdateInput {
  minOk?: number | null;
  maxOk?: number | null;
  source?: string;
}

export type AuditFilter = {
  actorId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
};

export type { AuditLogEntry };
