import type { AuditLogEntry } from '@/mocks/fixtures/auditLogs';
import type { Locale, UserRole } from '@/types/common';

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedSiteIds: string[];
  locale: Locale;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  koboUsername?: string;
}

export interface UserCreateInput {
  email: string;
  fullName: string;
  role: UserRole;
  assignedSiteIds: string[];
  locale: Locale;
  phone?: string;
  koboUsername?: string;
}

export interface UserUpdateInput extends Partial<UserCreateInput> {
  isActive?: boolean;
}

/**
 * Seuil configurable par l'admin — CDC §5.2 Module 4 + §8.6 (source normative).
 * Chaque seuil pointe vers un indicatorId du référentiel CDC §4.
 */
export interface ThresholdConfig {
  indicatorId: string;
  indicatorLabel: string;
  domain: 'water' | 'soil' | 'air' | 'waste' | 'health' | 'socio';
  unit: string;
  /** Borne basse de conformité (null = pas de plancher). */
  minOk: number | null;
  /** Borne haute de conformité (null = pas de plafond). */
  maxOk: number | null;
  /** Source normative affichée à l'utilisateur (CDC §8.6). */
  source: string;
  /** Dernière modification — pour le journal d'audit. */
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
