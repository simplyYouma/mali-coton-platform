import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
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

export function fetchSites(query: SitesQuery = {}): Promise<Paginated<Site>> {
  return http<Paginated<Site>>('/sites', { query: { ...query } });
}

export function fetchSite(id: string): Promise<Site> {
  return http<Site>(`/sites/${id}`);
}

export function createSite(input: SiteInput): Promise<Site> {
  return http<Site>('/sites', { method: 'POST', body: input });
}

export function updateSite(id: string, patch: Partial<SiteInput>): Promise<Site> {
  return http<Site>(`/sites/${id}`, { method: 'PUT', body: patch });
}

export function deleteSite(id: string): Promise<void> {
  return http<void>(`/sites/${id}`, { method: 'DELETE' });
}
