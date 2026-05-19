import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
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
}

export function fetchRecommandations(
  query: RecommandationsQuery = {},
): Promise<Paginated<Recommandation>> {
  return http<Paginated<Recommandation>>('/recommandations', { query });
}

export function fetchRecommandation(id: string): Promise<Recommandation> {
  return http<Recommandation>(`/recommandations/${id}`);
}

export function createRecommandation(
  input: RecommandationCreateInput,
): Promise<Recommandation> {
  return http<Recommandation>('/recommandations', {
    method: 'POST',
    body: input,
  });
}

export function updateRecommandation(
  id: string,
  patch: RecommandationUpdateInput,
): Promise<Recommandation> {
  return http<Recommandation>(`/recommandations/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteRecommandation(id: string): Promise<void> {
  return http<void>(`/recommandations/${id}`, { method: 'DELETE' });
}
