import type { CompteAdmin, PermissionAdmin, RoleAdmin } from '../api/comptes';

/**
 * Rôle dont les droits ne sont pas pilotés par la liste `permissions`.
 *
 * `GET /api/roles` renvoie `permissions: []` pour ROLE_ADMIN, qui dispose
 * pourtant d'un accès complet : le privilège est accordé en dur côté backend.
 * Afficher « 0 permission » serait faux, et proposer d'éditer cette liste
 * laisserait croire qu'on peut restreindre l'administrateur depuis l'écran —
 * l'enregistrement n'aurait aucun effet.
 *
 * Le test porte sur le code exact, seul cas connu ; les autres rôles sont bien
 * pilotés par leur liste, y compris ceux au code non préfixé (`superviseur`).
 */
export function estRolePrivilegie(role: Pick<RoleAdmin, 'code'>): boolean {
  return role.code === 'ROLE_ADMIN';
}

/** Nombre de comptes portant ce rôle — dérivé de la liste des utilisateurs. */
export function compterPorteurs(role: RoleAdmin, comptes: CompteAdmin[]): number {
  return comptes.filter((c) => c.rolesIris.includes(role.iri)).length;
}

/** Libellés lisibles des rôles d'un compte ; jamais les codes. */
export function libellesRoles(compte: CompteAdmin, roles: RoleAdmin[]): string[] {
  return compte.rolesIris
    .map((iri) => roles.find((r) => r.iri === iri)?.libelle)
    .filter((l): l is string => Boolean(l));
}

/** Index IRI → permission, pour retrouver un libellé depuis une liste de rôles. */
export function indexPermissions(permissions: PermissionAdmin[]): Map<string, PermissionAdmin> {
  return new Map(permissions.map((p) => [p.iri, p]));
}
