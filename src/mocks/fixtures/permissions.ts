/**
 * Référentiel `Permission` — actions atomiques RBAC.
 * Source : cahier §3.4 (id, code, libelle).
 *
 * Couvre les modules utilisés par la matrice RBAC frontend (cf.
 * src/features/admin/lib/rbacMatrix.ts).
 */

export interface MockPermission {
  id: string;
  code: string;
  libelle: string;
}

export const mockPermissions: MockPermission[] = [
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
