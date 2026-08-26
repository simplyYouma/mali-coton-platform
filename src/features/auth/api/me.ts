import { http } from '@/lib/http';
import type { CodePermission } from '../lib/permissions';

/**
 * Profil du compte connecté.
 *
 * `/api/me` est le **seul** endpoint de ce périmètre ouvert à tout compte
 * authentifié : `/api/users` exige `utilisateur.manage` et répondrait 403 à un
 * agent collecteur. C'est donc lui, et lui seul, qui doit servir à établir le
 * profil après connexion.
 */
export interface ProfilCourant {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  /** Codes de rôle bruts — conservés pour l'affichage, jamais pour décider d'un droit. */
  roles: string[];
  permissions: CodePermission[];
}

export async function fetchMe(): Promise<ProfilCourant> {
  const brut = await http<Partial<ProfilCourant>>('/me');
  return {
    id: brut.id ?? 0,
    email: brut.email ?? '',
    nom: brut.nom ?? '',
    prenom: brut.prenom ?? '',
    roles: Array.isArray(brut.roles) ? brut.roles : [],
    permissions: Array.isArray(brut.permissions) ? brut.permissions : [],
  };
}

export function nomComplet(p: Pick<ProfilCourant, 'nom' | 'prenom'>): string {
  return `${p.prenom} ${p.nom}`.trim();
}
