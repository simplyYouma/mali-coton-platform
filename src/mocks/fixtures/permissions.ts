/**
 * Référentiel `Permission` — actions atomiques RBAC.
 * Source : cahier §3.4 (id, code, libelle).
 *
 * Couvre les modules utilisés par la matrice RBAC frontend (cf.
 * src/features/admin/lib/rbacMatrix.ts).
 */

export interface MockPermission {
  /**
   * IRI JSON-LD de la ressource.
   *
   * API Platform l'émet sur chaque entité en mode live, et l'interface s'en
   * sert comme clé : `RolesPage` construit sa table de correspondance sur
   * `p['@id']` et coche ses cases en comparant les IRI du rôle à ce champ.
   * Sans lui, les permissions d'un rôle s'affichaient en IRI brutes et
   * aucune case n'était cochée dans le formulaire d'édition.
   */
  '@id': string;
  id: string;
  code: string;
  libelle: string;
}

/** Construit l'IRI d'une permission — même forme qu'en live. */
export function permissionIri(id: string): string {
  return `/api/v1/permissions/${id}`;
}

const DEFINITIONS: Array<Omit<MockPermission, '@id'>> = [
  // Collectes & validation
  { id: 'perm-coll-read', code: 'collections.read', libelle: 'Consulter les collectes' },
  { id: 'perm-coll-write', code: 'collections.write', libelle: 'Saisir et modifier les collectes' },
  { id: 'perm-valid-write', code: 'validation.write', libelle: 'Valider / rejeter les collectes' },
  // Échantillons labo
  { id: 'perm-lab-read', code: 'lab_samples.read', libelle: 'Consulter les échantillons labo' },
  { id: 'perm-lab-write', code: 'lab_samples.write', libelle: 'Gérer les échantillons labo' },
  // Sites
  { id: 'perm-sites-read', code: 'sites.read', libelle: 'Consulter les sites' },
  { id: 'perm-sites-write', code: 'sites.write', libelle: 'Créer / modifier les sites' },
  // Alertes
  { id: 'perm-alerts-read', code: 'alerts.read', libelle: 'Consulter les alertes' },
  { id: 'perm-alerts-write', code: 'alerts.write', libelle: 'Acquitter / résoudre les alertes' },
  // Recommandations
  { id: 'perm-reco-read', code: 'recommandations.read', libelle: 'Consulter les recommandations' },
  { id: 'perm-reco-write', code: 'recommandations.write', libelle: 'Gérer les recommandations' },
  // Analytics / Cartographie / Rapports
  { id: 'perm-analytics-read', code: 'analytics.read', libelle: 'Consulter les analyses' },
  { id: 'perm-reports-write', code: 'reports.write', libelle: 'Générer des rapports' },
  // Administration
  { id: 'perm-users-write', code: 'users.write', libelle: 'Gérer les utilisateurs' },
  { id: 'perm-roles-write', code: 'roles.write', libelle: 'Modifier rôles & permissions' },
  { id: 'perm-indicators-write', code: 'indicators.write', libelle: 'Modifier le référentiel indicateurs' },
  { id: 'perm-refdata-write', code: 'refdata.write', libelle: 'Modifier les vocabulaires contrôlés' },
  { id: 'perm-audit-read', code: 'audit.read', libelle: "Consulter le journal d'audit" },
];

export const mockPermissions: MockPermission[] = DEFINITIONS.map((p) => ({
  '@id': permissionIri(p.id),
  ...p,
}));
