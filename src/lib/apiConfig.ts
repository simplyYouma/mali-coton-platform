/**
 * Configuration des modes API — switch maquette ↔ backend live.
 *
 *   VITE_API_MODE = 'mock' (défaut) → MSW intercepte tout. Base /api/v1.
 *   VITE_API_MODE = 'live'          → MSW désactivé. Base = VITE_API_BASE_URL.
 *
 * Voir docs/CAHIER_PROJET.md §11 (Phase E).
 */

export type ApiMode = 'mock' | 'live';

const envMode = (import.meta.env.VITE_API_MODE as ApiMode | undefined) ?? 'live';
const envBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://api.back-paset.com';

export const API_MODE: ApiMode = envMode === 'live' ? 'live' : 'mock';

/**
 * Préfixe du proxy de développement (voir `server.proxy` dans vite.config.ts).
 *
 * En développement, les appels au backend passent par le serveur Vite au lieu
 * de partir directement vers l'API. Ils deviennent ainsi des requêtes de même
 * origine, hors du champ de CORS : la liste blanche du backend n'a plus besoin
 * de connaître le port local, qui change d'un poste et d'un lancement à l'autre.
 *
 * Distinct de `/api` pour ne pas recouvrir `/api/v1`, utilisé par MSW en mock.
 */
const DEV_PROXY = '/backend';

/** Préfixe utilisé côté client pour construire les URLs. */
export const API_BASE: string =
  API_MODE === 'mock'
    ? '/api/v1'
    : import.meta.env.DEV
      ? `${DEV_PROXY}/api`
      : `${envBaseUrl}/api`;

/** Origine du serveur backend (sans chemin), pour construire des URLs médias absolues. */
export const API_ORIGIN: string = API_MODE === 'live' ? envBaseUrl : window.location.origin;

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
  collections: API_MODE === 'live' ? 'import_kobos' : 'collections',
  labs: API_MODE === 'live' ? 'laboratoires' : 'labs',
  users: 'users',
  roles: 'roles',
  permissions: 'permissions',
  indicators: API_MODE === 'live' ? 'parametre_analyses' : 'indicators',
  units: 'parametre_unites',
  thresholds: API_MODE === 'live' ? 'norme_rejets' : 'thresholds',
  recommandations: 'recommandations',
  // entités présentes seulement en live (Phase A3 + Phase B)
  regions: 'regions',
  cercles: 'cercles',
  communes: 'communes',
  prelevements: 'prelevements',
  echantillons: 'echantillons',
  analyses: 'analyse_laboratoires',
  resultats: 'resultat_analyses',
  validations: 'validation_superviseurs',
  // imports Kobo
  importKobos: 'import_kobos',
  collectePhotos: 'collecte_photos',
  // formulaires dynamiques (Phase C)
  formulaires: API_MODE === 'live' ? 'formulaire_collectes' : 'formulaires',
  champFormulaires: 'champ_formulaires',
  soumissions: API_MODE === 'live' ? 'soumission_formulaires' : 'soumissions',
  reponses: 'reponse_champs',
};

/** Helper pour construire un path complet à partir d'une ressource logique. */
export function resourcePath(resource: keyof typeof RESOURCE_PATH | string, id?: string): string {
  const segment = RESOURCE_PATH[resource] ?? resource;
  return id ? `/${segment}/${id}` : `/${segment}`;
}
