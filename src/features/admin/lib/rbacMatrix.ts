import type { UserRole } from '@/types/common';

/**
 * Matrice RBAC par défaut — alignée sur les entrées de la sidebar (AppLayout).
 * L'administrateur peut ajuster chaque cellule depuis la page « Rôles & permissions ».
 */
export type PermissionLevel = 'none' | 'read' | 'write';

export type ModuleGroup = 'operationnel' | 'analyse' | 'admin';

export interface ModuleSpec {
  id: string;
  label: string;
  group: ModuleGroup;
}

/** Liste calquée sur la sidebar (cf. src/app/layouts/AppLayout.tsx). */
export const MODULES: ModuleSpec[] = [
  { id: 'dashboard', label: 'Tableau de bord', group: 'operationnel' },
  { id: 'sites', label: 'Sites', group: 'operationnel' },
  { id: 'collections', label: 'Collectes', group: 'operationnel' },
  { id: 'validation', label: 'Validation', group: 'operationnel' },
  { id: 'lab_samples', label: 'Échantillons labo', group: 'operationnel' },
  { id: 'alerts', label: 'Alertes', group: 'operationnel' },
  { id: 'recommandations', label: 'Recommandations', group: 'operationnel' },
  { id: 'agents', label: 'Agents', group: 'operationnel' },
  { id: 'cartography', label: 'Cartographie', group: 'analyse' },
  { id: 'analytics', label: 'Analytics', group: 'analyse' },
  { id: 'reports', label: 'Rapports', group: 'analyse' },
  { id: 'users', label: 'Utilisateurs', group: 'admin' },
  { id: 'roles', label: 'Rôles & permissions', group: 'admin' },
  { id: 'indicators', label: 'Indicateurs', group: 'admin' },
  { id: 'refdata', label: 'Référentiels', group: 'admin' },
  { id: 'audit', label: 'Journal d\'audit', group: 'admin' },
];

/** Rôles connectables uniquement — agents terrain et labos ne se connectent pas à l'app. */
export type LoginableRole = Extract<UserRole, 'admin' | 'superviseur' | 'visitor'>;

export const ROLES: Array<{ id: LoginableRole; label: string }> = [
  { id: 'admin', label: 'Administrateur' },
  { id: 'superviseur', label: 'Superviseur' },
  { id: 'visitor', label: 'Observateur' },
];

export const GROUP_LABEL: Record<ModuleGroup, string> = {
  operationnel: 'Opérationnel',
  analyse: 'Analyse & restitution',
  admin: 'Administration',
};

/** Matrice par défaut (socle CDC) — alignée sur les rôles de la sidebar. */
export const DEFAULT_MATRIX: Record<LoginableRole, Record<string, PermissionLevel>> = {
  admin: {
    dashboard: 'write',
    sites: 'write',
    collections: 'write',
    validation: 'write',
    lab_samples: 'write',
    alerts: 'write',
    recommandations: 'write',
    agents: 'write',
    cartography: 'write',
    analytics: 'write',
    reports: 'write',
    users: 'write',
    roles: 'write',
    indicators: 'write',
    refdata: 'write',
    audit: 'read',
  },
  superviseur: {
    dashboard: 'read',
    sites: 'write',
    collections: 'write',
    validation: 'write',
    lab_samples: 'write',
    alerts: 'write',
    recommandations: 'write',
    agents: 'write',
    cartography: 'read',
    analytics: 'read',
    reports: 'write',
    users: 'none',
    roles: 'none',
    indicators: 'read',
    refdata: 'read',
    audit: 'read',
  },
  visitor: {
    dashboard: 'read',
    sites: 'read',
    collections: 'none',
    validation: 'none',
    lab_samples: 'none',
    alerts: 'read',
    recommandations: 'read',
    agents: 'none',
    cartography: 'read',
    analytics: 'read',
    reports: 'read',
    users: 'none',
    roles: 'none',
    indicators: 'none',
    refdata: 'none',
    audit: 'none',
  },
};

const STORAGE_KEY = 'mali-coton.rbac.matrix.v2';

export function loadMatrix(): typeof DEFAULT_MATRIX {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_MATRIX);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : structuredClone(DEFAULT_MATRIX);
  } catch {
    return structuredClone(DEFAULT_MATRIX);
  }
}

export function saveMatrix(matrix: typeof DEFAULT_MATRIX): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
}

export function resetMatrix(): typeof DEFAULT_MATRIX {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_MATRIX);
}
