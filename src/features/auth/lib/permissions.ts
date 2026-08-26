/**
 * Catalogue des permissions — vocabulaire d'autorisation de la plateforme.
 *
 * Les droits se lisent **exclusivement** dans le tableau `permissions` de
 * `/api/me`. Les codes de rôle sont incohérents en base (`ROLE_ADMIN`,
 * `ROLE_AGENT_COLLECTEUR`, mais aussi `superviseur` en minuscules sans
 * préfixe) : en déduire un droit produirait des autorisations fausses dès
 * qu'un rôle est renommé ou créé. Aucun cas particulier n'est codé pour
 * l'administrateur — le backend lui sert déjà la liste complète.
 */

export type CodePermission = string;

/** Domaines fonctionnels, dans l'ordre d'affichage de l'éditeur de rôles. */
export const DOMAINES = [
  'sites',
  'collectes',
  'alertes',
  'rapports',
  'utilisateurs',
  'formulaires',
  'soumissions',
] as const;
export type Domaine = (typeof DOMAINES)[number];

export const LIBELLE_DOMAINE: Record<Domaine, string> = {
  sites: 'Sites',
  collectes: 'Collectes',
  alertes: 'Alertes',
  rapports: 'Rapports & Analytics',
  utilisateurs: 'Utilisateurs',
  formulaires: 'Formulaires',
  soumissions: 'Soumissions',
};

/**
 * Permissions héritées d'un ancien modèle, sans domaine ni usage.
 *
 * Le backend en sert 21 quand la documentation en annonce 19 : ces deux-là
 * sont l'écart. Elles restent attachées à des comptes existants, donc on ne
 * peut pas les faire disparaître de `/api/me` — on se contente de ne jamais
 * les proposer à l'édition ni fonder de logique dessus.
 */
export const PERMISSIONS_OBSOLETES = new Set<CodePermission>(['PERM_READ', 'PERM_ADD']);

export function estObsolete(code: CodePermission): boolean {
  return PERMISSIONS_OBSOLETES.has(code);
}

/**
 * Domaine d'une permission, déduit du préfixe de son code (`site.create` →
 * Sites). Dériver plutôt qu'énumérer permet à une permission ajoutée côté
 * backend d'apparaître au bon endroit sans modification du client.
 */
const PREFIXE_VERS_DOMAINE: Record<string, Domaine> = {
  site: 'sites',
  collecte: 'collectes',
  alerte: 'alertes',
  rapport: 'rapports',
  analytics: 'rapports',
  utilisateur: 'utilisateurs',
  formulaire: 'formulaires',
  soumission: 'soumissions',
};

export function domaineDe(code: CodePermission): Domaine | null {
  if (estObsolete(code)) return null;
  const prefixe = code.split('.')[0] ?? '';
  return PREFIXE_VERS_DOMAINE[prefixe] ?? null;
}

/* ═══════════════════════════════════════════════════════════
   Permissions citées dans le code
   Nommer les codes ici évite les chaînes libres disséminées, qu'une faute
   de frappe rendrait silencieusement permissives ou bloquantes.
═══════════════════════════════════════════════════════════ */

export const PERM = {
  siteRead: 'site.read',
  siteCreate: 'site.create',
  siteUpdate: 'site.update',
  siteDelete: 'site.delete',
  collecteRead: 'collecte.read',
  collecteCreate: 'collecte.create',
  collecteValidate: 'collecte.validate',
  alerteRead: 'alerte.read',
  alerteManage: 'alerte.manage',
  rapportGenerate: 'rapport.generate',
  analyticsRead: 'analytics.read',
  utilisateurManage: 'utilisateur.manage',
  formulaireRead: 'formulaire.read',
  formulaireCreate: 'formulaire.create',
  formulaireUpdate: 'formulaire.update',
  formulaireDelete: 'formulaire.delete',
  soumissionRead: 'soumission.read',
  soumissionCreate: 'soumission.create',
  soumissionValidate: 'soumission.validate',
} as const;
