/**
 * Référentiel `Role` — rôles RBAC et permissions attachées.
 *
 * Ces données manquaient : la page « Rôles & permissions » interrogeait
 * `/roles`, route pour laquelle aucun handler mock n'existait. L'écran
 * restait donc vide en mode démonstration, sans qu'aucune erreur ne
 * l'explique.
 *
 * Les cinq rôles du système sont représentés, y compris ceux qui ne se
 * connectent pas à la plateforme (`agent`, `lab`) : ils existent côté
 * backend et doivent apparaître dans l'administration, même si leur usage
 * passe aujourd'hui par d'autres canaux.
 *
 * Les permissions sont référencées par IRI, comme le fait API Platform en
 * mode live (cf. `BackendRole.permissions`).
 */

import { mockPermissions } from './permissions';

export interface MockRole {
  id: string;
  code: string;
  libelle: string;
  description: string;
  /** IRIs des permissions accordées. */
  permissions: string[];
}

/** Construit l'IRI d'une permission à partir de son code. */
function iri(...codes: string[]): string[] {
  return codes.map((code) => {
    const permission = mockPermissions.find((p) => p.code === code);
    if (!permission) {
      throw new Error(`Permission inconnue dans la fixture des rôles : ${code}`);
    }
    return `/api/v1/permissions/${permission.id}`;
  });
}

/** Toutes les permissions — utilisé par l'administrateur. */
const TOUTES = mockPermissions.map((p) => `/api/v1/permissions/${p.id}`);

export const mockRoles: MockRole[] = [
  {
    id: 'role-admin',
    code: 'ROLE_ADMIN',
    libelle: 'Administrateur',
    description:
      "Accès complet à la plateforme, y compris la configuration des référentiels, " +
      'des utilisateurs et des rôles.',
    permissions: TOUTES,
  },
  {
    id: 'role-superviseur',
    code: 'ROLE_SUPERVISEUR',
    libelle: 'Superviseur',
    description:
      'Pilote le suivi terrain : valide ou rejette les collectes, traite les alertes ' +
      'et produit les rapports. Ne configure pas les référentiels.',
    permissions: iri(
      'collections.read',
      'collections.write',
      'validation.write',
      'lab_samples.read',
      'lab_samples.write',
      'sites.read',
      'sites.write',
      'alerts.read',
      'alerts.write',
      'recommandations.read',
      'recommandations.write',
      'analytics.read',
      'reports.write',
    ),
  },
  {
    id: 'role-agent',
    code: 'ROLE_AGENT',
    libelle: 'Agent terrain',
    description:
      'Saisit les collectes sur le terrain, depuis une tablette, y compris hors ligne. ' +
      "Ne voit que ses propres sites d'affectation.",
    permissions: iri('collections.read', 'collections.write', 'sites.read'),
  },
  {
    id: 'role-lab',
    code: 'ROLE_LAB',
    libelle: 'Laboratoire',
    description:
      "Laboratoire agréé : réceptionne les échantillons et saisit les résultats d'analyse. " +
      "Aucun écran ne lui est ouvert à ce jour dans l'application.",
    permissions: iri('lab_samples.read', 'lab_samples.write', 'collections.read'),
  },
  {
    id: 'role-visitor',
    code: 'ROLE_VISITOR',
    libelle: 'Observateur',
    description:
      'Consultation seule — destiné aux partenaires du projet (PNUD, bailleurs). ' +
      'Aucune action de modification.',
    permissions: iri(
      'collections.read',
      'sites.read',
      'alerts.read',
      'recommandations.read',
      'analytics.read',
    ),
  },
];
