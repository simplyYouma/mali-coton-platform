/**
 * Helpers JSON-LD / Hydra (API Platform) — cf. CAHIER §3.
 *
 * En mode 'live' le backend renvoie des réponses du type :
 *
 *   {
 *     "@context": "/api/contexts/SiteTeinture",
 *     "@id": "/api/site_teintures",
 *     "@type": "hydra:Collection",
 *     "hydra:member": [ { "@id": "/api/site_teintures/1", ... }, ... ],
 *     "hydra:totalItems": 6
 *   }
 *
 * Ces helpers cachent ce protocole pour que les hooks React Query
 * continuent à manipuler des `Paginated<T>` simples.
 */
import type { Paginated } from '@/types/common';
import { API_MODE } from './apiConfig';

/** Document Hydra (collection paginée). */
interface HydraCollection<T> {
  '@id'?: string;
  '@type'?: string;
  'hydra:member': T[];
  'hydra:totalItems': number;
  'hydra:view'?: {
    'hydra:first'?: string;
    'hydra:next'?: string;
    'hydra:last'?: string;
  };
}

/**
 * Convertit une réponse Hydra (live) en notre `Paginated<T>` standard.
 * En mode mock, on suppose que la réponse est déjà au format Paginated.
 */
export function unwrapPaginated<T>(raw: unknown): Paginated<T> {
  if (API_MODE === 'mock') return raw as Paginated<T>;
  const h = raw as HydraCollection<T>;
  return {
    items: h['hydra:member'] ?? [],
    total: h['hydra:totalItems'] ?? 0,
    page: 1,
    pageSize: h['hydra:member']?.length ?? 0,
  };
}

/**
 * Extrait l'ID numérique/string d'un IRI ("/api/site_teintures/3" → "3").
 * Retourne tel quel si l'argument ne ressemble pas à un IRI.
 */
export function iriToId(iri: string | null | undefined): string {
  if (!iri) return '';
  const m = iri.match(/\/([^/]+)\/?$/);
  return m ? m[1]! : iri;
}

/**
 * Construit un IRI à partir d'un segment + ID (à utiliser sur les POST/PATCH
 * en live, là où le backend attend une réf IRI plutôt qu'un ID brut).
 *
 *   iriOf('site_teintures', '3') → '/api/site_teintures/3'
 */
export function iriOf(segment: string, id: string | number): string {
  return `/api/${segment}/${id}`;
}
