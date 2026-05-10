import type { UserRole } from '@/types/common';

/**
 * Matrice RBAC par défaut — socle minimal de référence.
 * L'administrateur peut ajuster chaque cellule depuis la page « Rôles & permissions ».
 */
export type PermissionLevel = 'none' | 'read' | 'write';

export interface ModuleSpec {
  id: string;
  label: string;
  group: 'admin' | 'sites' | 'collecte' | 'lab' | 'analytics';
}

export const MODULES: ModuleSpec[] = [
  { id: 'users', label: 'Utilisateurs', group: 'admin' },
  { id: 'roles', label: 'Rôles & permissions', group: 'admin' },
  { id: 'system', label: 'Paramètres système', group: 'admin' },
  { id: 'thresholds', label: 'Seuils & normes', group: 'admin' },
  { id: 'audit', label: 'Journal d\'audit', group: 'admin' },
  { id: 'sites', label: 'Sites', group: 'sites' },
  { id: 'collections', label: 'Collectes', group: 'collecte' },
  { id: 'samples', label: 'Échantillons', group: 'lab' },
  { id: 'lab_analysis', label: 'Analyses labo', group: 'lab' },
  { id: 'lab_results', label: 'Saisie résultats', group: 'lab' },
  { id: 'validation', label: 'Validation résultats', group: 'collecte' },
  { id: 'dashboards', label: 'Tableaux de bord', group: 'analytics' },
  { id: 'reports', label: 'Rapports', group: 'analytics' },
  { id: 'exports', label: 'Export données', group: 'analytics' },
  { id: 'mapping', label: 'Cartographie', group: 'analytics' },
  { id: 'alerts', label: 'Alertes', group: 'analytics' },
];

export const ROLES: Array<{ id: UserRole; label: string }> = [
  { id: 'admin', label: 'Administrateur' },
  { id: 'superviseur', label: 'Superviseur' },
  { id: 'agent', label: 'Agent terrain' },
  { id: 'lab', label: 'Agent laboratoire' },
  { id: 'visitor', label: 'Observateur' },
];

export const GROUP_LABEL: Record<ModuleSpec['group'], string> = {
  admin: 'Administration',
  sites: 'Sites',
  collecte: 'Collectes',
  lab: 'Laboratoire',
  analytics: 'Analyse & restitution',
};

/** Matrice par défaut (socle CDC). */
export const DEFAULT_MATRIX: Record<UserRole, Record<string, PermissionLevel>> = {
  admin: {
    users: 'write', roles: 'write', system: 'write', thresholds: 'write', audit: 'read',
    sites: 'write', collections: 'write', samples: 'write', lab_analysis: 'write',
    lab_results: 'write', validation: 'write', dashboards: 'read', reports: 'write',
    exports: 'write', mapping: 'read', alerts: 'write',
  },
  superviseur: {
    users: 'none', roles: 'none', system: 'none', thresholds: 'read', audit: 'read',
    sites: 'write', collections: 'write', samples: 'write', lab_analysis: 'write',
    lab_results: 'write', validation: 'write', dashboards: 'read', reports: 'write',
    exports: 'write', mapping: 'read', alerts: 'write',
  },
  agent: {
    users: 'none', roles: 'none', system: 'none', thresholds: 'none', audit: 'none',
    sites: 'write', collections: 'write', samples: 'write', lab_analysis: 'none',
    lab_results: 'none', validation: 'none', dashboards: 'none', reports: 'none',
    exports: 'none', mapping: 'none', alerts: 'none',
  },
  lab: {
    users: 'none', roles: 'none', system: 'none', thresholds: 'read', audit: 'none',
    sites: 'read', collections: 'read', samples: 'write', lab_analysis: 'write',
    lab_results: 'write', validation: 'none', dashboards: 'none', reports: 'none',
    exports: 'none', mapping: 'none', alerts: 'none',
  },
  visitor: {
    users: 'none', roles: 'none', system: 'none', thresholds: 'none', audit: 'none',
    sites: 'read', collections: 'none', samples: 'none', lab_analysis: 'none',
    lab_results: 'none', validation: 'none', dashboards: 'read', reports: 'read',
    exports: 'none', mapping: 'read', alerts: 'read',
  },
};

const STORAGE_KEY = 'mali-coton.rbac.matrix.v1';

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
