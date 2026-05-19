/**
 * Configuration des modes API — switch maquette ↔ backend live.
 *
 *   VITE_API_MODE = 'mock' (défaut) → MSW intercepte tout. Base /api/v1.
 *   VITE_API_MODE = 'live'          → MSW désactivé. Base = VITE_API_BASE_URL.
 *
 * Voir docs/CAHIER_PROJET.md §11 (Phase E).
 */

export type ApiMode = 'mock' | 'live';

const envMode = (import.meta.env.VITE_API_MODE as ApiMode | undefined) ?? 'mock';
const envBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://187.127.225.182';

export const API_MODE: ApiMode = envMode === 'live' ? 'live' : 'mock';

/** Préfixe utilisé côté client pour construire les URLs. */
export const API_BASE: string = API_MODE === 'mock' ? '/api/v1' : `${envBaseUrl}/api`;

/** True si MSW doit démarrer au bootstrap. */
export const USE_MSW: boolean = API_MODE === 'mock';

/**
 * Mapping {ressource frontend → segment backend}.
 *
 * En mock : tout est sous /api/v1/<segment-frontend>.
 * En live : sous /api/<segment-backend> (API Platform — snake_case).
 *
 * Permet de centraliser les écarts de nommage (cf. mapping CAHIER §3.2).
 */
export const RESOURCE_PATH: Record<string, string> = {
  // ressource frontend → segment URL effectif (sans préfixe)
  sites: API_MODE === 'live' ? 'site_teintures' : 'sites',
  collections: API_MODE === 'live' ? 'collecte_terrains' : 'collections',
  labs: API_MODE === 'live' ? 'laboratoires' : 'labs',
  users: 'users',
  roles: 'roles',
  permissions: 'permissions',
  indicators: API_MODE === 'live' ? 'parametre_analyses' : 'indicators',
  thresholds: API_MODE === 'live' ? 'norme_rejets' : 'thresholds',
  recommandations: 'recommandations',
  // entités présentes seulement en live
  regions: 'regions',
  cercles: 'cercles',
  communes: 'communes',
  prelevements: 'prelevements',
  echantillons: 'echantillons',
  analyses: 'analyse_laboratoires',
  resultats: 'resultat_analyses',
  validations: 'validation_superviseurs',
};

/** Helper pour construire un path complet à partir d'une ressource logique. */
export function resourcePath(resource: keyof typeof RESOURCE_PATH | string, id?: string): string {
  const segment = RESOURCE_PATH[resource] ?? resource;
  return id ? `/${segment}/${id}` : `/${segment}`;
}
