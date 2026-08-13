import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';
import type {
  Recommandation,
  RecommandationCreateInput,
  RecommandationUpdateInput,
} from './recommandations.types';

export interface RecommandationsQuery {
  siteId?: string;
  collectionId?: string;
  statut?: string;
  niveauPriorite?: string;
  [key: string]: string | number | boolean | undefined;
}

export async function fetchRecommandations(
  query: RecommandationsQuery = {},
): Promise<Paginated<Recommandation>> {
  const raw = await http<unknown>(resourcePath('recommandations'), { query });
  if (API_MODE === 'live') return unwrapPaginated<Recommandation>(raw);
  return raw as Paginated<Recommandation>;
}

export async function fetchRecommandation(id: string): Promise<Recommandation> {
  return http<Recommandation>(resourcePath('recommandations', id));
}

export function createRecommandation(input: RecommandationCreateInput): Promise<Recommandation> {
  return http<Recommandation>(resourcePath('recommandations'), { method: 'POST', body: input });
}

export function updateRecommandation(
  id: string,
  patch: RecommandationUpdateInput,
): Promise<Recommandation> {
  return http<Recommandation>(resourcePath('recommandations', id), {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteRecommandation(id: string): Promise<void> {
  return http<void>(resourcePath('recommandations', id), { method: 'DELETE' });
}
