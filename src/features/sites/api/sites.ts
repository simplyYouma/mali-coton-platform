import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';
import { toSite, type SiteTeintureBackend, type SiteTeintureDetailBackend } from './sites.adapter';
import type { Site } from './site.types';

export interface SitesQuery {
  q?: string;
  type?: string;
  conformity?: string;
}

/** Données acceptées par création/édition côté API. */
export interface SiteInput {
  name: string;
  shortName: string;
  legalStatus: Site['legalStatus'];
  type: Site['type'];
  workforce: number;
  createdYear: number;
  isReference: boolean;
  description?: string;
  location: Site['location'];
  coordinates: Site['coordinates'];
}

export async function fetchSites(query: SitesQuery = {}): Promise<Paginated<Site>> {
  if (API_MODE === 'live') {
    const raw = await http<unknown>(resourcePath('sites'), { query: { ...query } });
    const page = unwrapPaginated<SiteTeintureBackend>(raw);
    return {
      items: page.items.map(toSite),
      total: page.total,
      page: 1,
      pageSize: page.items.length,
    };
  }
  return http<Paginated<Site>>(resourcePath('sites'), { query: { ...query } });
}

export async function fetchSite(id: string): Promise<Site> {
  if (API_MODE === 'live') {
    const raw = await http<SiteTeintureBackend>(resourcePath('sites', id));
    return toSite(raw);
  }
  return http<Site>(resourcePath('sites', id));
}

/** Retourne les données brutes backend enrichies (collecteSite, photos, listes codées). */
export async function fetchSiteDetail(id: string): Promise<SiteTeintureDetailBackend | null> {
  /* En mock, MSW sert la fiche terrain sur cette meme URL : le detail y est
   * fusionne avec la forme frontend attendue par fetchSite. */
  return http<SiteTeintureDetailBackend>(resourcePath('sites', id));
}

export function createSite(input: SiteInput): Promise<Site> {
  return http<Site>(resourcePath('sites'), { method: 'POST', body: input });
}

export function updateSite(id: string, patch: Partial<SiteInput>): Promise<Site> {
  return http<Site>(resourcePath('sites', id), { method: 'PUT', body: patch });
}

/**
 * Active/désactive un site — jamais via `updateSite` : un PUT partiel sur
 * API Platform peut écraser les champs absents du corps envoyé, alors qu'un
 * PATCH ne porte que la différence (voir `http()` pour le Content-Type
 * `merge-patch+json` requis).
 */
export function setSiteActif(id: string, actif: boolean): Promise<Site> {
  if (API_MODE === 'live') {
    return http<SiteTeintureBackend>(resourcePath('sites', id), {
      method: 'PATCH',
      body: { actif },
    }).then(toSite);
  }
  return http<Site>(resourcePath('sites', id), { method: 'PATCH', body: { actif } });
}

export function deleteSite(id: string): Promise<void> {
  return http<void>(resourcePath('sites', id), { method: 'DELETE' });
}
