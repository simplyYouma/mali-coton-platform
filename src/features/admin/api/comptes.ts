/**
 * Comptes, rôles et permissions — administration des accès.
 *
 * Tout ce périmètre exige `utilisateur.manage`, hormis `/api/me`. Les
 * collections arrivent en Hydra : on réutilise `unwrapPaginated` et le client
 * `http` plutôt qu'une couche de fetch dédiée.
 */

import { http } from '@/lib/http';
import { unwrapPaginated } from '@/lib/jsonld';
import type { CodePermission } from '@/features/auth/lib/permissions';

/* ═══ Types ═══ */

export interface CompteAdmin {
  id: string;
  iri: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  email: string;
  actif: boolean;
  /** IRIs des rôles portés (`/api/roles/3`). */
  rolesIris: string[];
  permissionCodes: CodePermission[];
  createdAt: string;
}

export interface RoleAdmin {
  id: string;
  iri: string;
  code: string;
  libelle: string;
  description: string;
  /** IRIs des permissions attachées. */
  permissionsIris: string[];
}

export interface PermissionAdmin {
  id: string;
  iri: string;
  code: CodePermission;
  libelle: string;
  description: string;
}

export interface CompteInput {
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  /** IRIs — le backend refuse les codes texte. */
  roles: string[];
  /** Champ d'écriture seule ; jamais renvoyé en lecture. */
  plainPassword?: string;
}

export interface RoleInput {
  code: string;
  libelle: string;
  description?: string;
  permissions: string[];
}

/* ═══ Adaptateurs ═══ */

function iriDe(brut: { '@id'?: string }, segment: string, id: string | number): string {
  return brut['@id'] ?? `/api/${segment}/${id}`;
}

function toCompte(b: Record<string, unknown>): CompteAdmin {
  const id = String(b.id ?? '');
  const nom = String(b.nom ?? '');
  const prenom = String(b.prenom ?? '');
  return {
    id,
    iri: iriDe(b as { '@id'?: string }, 'users', id),
    nom,
    prenom,
    nomComplet: [prenom, nom].filter(Boolean).join(' ') || String(b.email ?? id),
    email: String(b.email ?? ''),
    actif: b.actif !== false,
    rolesIris: Array.isArray(b.roles) ? (b.roles as string[]) : [],
    permissionCodes: Array.isArray(b.permissionCodes) ? (b.permissionCodes as string[]) : [],
    createdAt: String(b.createdAt ?? ''),
  };
}

function toRole(b: Record<string, unknown>): RoleAdmin {
  const id = String(b.id ?? '');
  return {
    id,
    iri: iriDe(b as { '@id'?: string }, 'roles', id),
    code: String(b.code ?? ''),
    libelle: String(b.libelle ?? b.code ?? ''),
    description: String(b.description ?? ''),
    permissionsIris: Array.isArray(b.permissions) ? (b.permissions as string[]) : [],
  };
}

function toPermission(b: Record<string, unknown>): PermissionAdmin {
  const id = String(b.id ?? '');
  return {
    id,
    iri: iriDe(b as { '@id'?: string }, 'permissions', id),
    code: String(b.code ?? ''),
    libelle: String(b.libelle ?? b.code ?? ''),
    description: String(b.description ?? ''),
  };
}

/* ═══ Comptes ═══ */

export async function fetchComptes(): Promise<CompteAdmin[]> {
  const raw = await http<unknown>('/users');
  return unwrapPaginated<Record<string, unknown>>(raw).items.map(toCompte);
}

export async function fetchCompte(id: string): Promise<CompteAdmin> {
  return toCompte(await http<Record<string, unknown>>(`/users/${id}`));
}

/**
 * Crée un compte, puis relit la fiche pour connaître son état réel.
 *
 * ⚠ Comportement backend constaté le 2026-08-23 : `POST /api/users` répond
 * `roles: []` et `permissionCodes: []` alors que la requête portait bien un
 * rôle (`{"roles": ["/api/roles/3"]}`). Se fier au corps de la réponse
 * afficherait un compte sans rôle. On relit donc la fiche ; si le rôle n'a
 * réellement pas été attaché — bug serveur à signaler — un PATCH de suivi le
 * rattache.
 */
export async function creerCompte(input: CompteInput): Promise<CompteAdmin> {
  const cree = toCompte(await http<Record<string, unknown>>('/users', { method: 'POST', body: input }));

  if (input.roles.length === 0) return cree;

  const relu = await fetchCompte(cree.id);
  if (relu.rolesIris.length > 0) return relu;

  await modifierCompte(cree.id, { roles: input.roles });
  return fetchCompte(cree.id);
}

export async function modifierCompte(
  id: string,
  patch: Partial<CompteInput>,
): Promise<CompteAdmin> {
  return toCompte(
    await http<Record<string, unknown>>(`/users/${id}`, { method: 'PATCH', body: patch }),
  );
}

export function supprimerCompte(id: string): Promise<void> {
  return http<void>(`/users/${id}`, { method: 'DELETE' });
}

/* ═══ Rôles ═══ */

export async function fetchRolesAdmin(): Promise<RoleAdmin[]> {
  const raw = await http<unknown>('/roles');
  return unwrapPaginated<Record<string, unknown>>(raw).items.map(toRole);
}

export function creerRole(input: RoleInput): Promise<RoleAdmin> {
  return http<Record<string, unknown>>('/roles', { method: 'POST', body: input }).then(toRole);
}

export function modifierRole(id: string, patch: Partial<RoleInput>): Promise<RoleAdmin> {
  return http<Record<string, unknown>>(`/roles/${id}`, {
    method: 'PATCH',
    body: patch,
  }).then(toRole);
}

export function supprimerRole(id: string): Promise<void> {
  return http<void>(`/roles/${id}`, { method: 'DELETE' });
}

/* ═══ Permissions ═══ */

export async function fetchPermissionsAdmin(): Promise<PermissionAdmin[]> {
  const raw = await http<unknown>('/permissions');
  return unwrapPaginated<Record<string, unknown>>(raw).items.map(toPermission);
}
