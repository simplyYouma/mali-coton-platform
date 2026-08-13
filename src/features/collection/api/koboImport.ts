import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';

export type KoboImportType = 'sites' | 'employes' | 'all';

export interface KoboImportStats {
  totalRecupere: number;
  nombreImporte: number;
  nombreIgnore: number;
  nombreErreurs: number;
}

export interface KoboImportResult {
  success: boolean;
  type: string;
  message: string;
  // Réponse pour type = 'sites' ou 'employes'
  totalRecupere?: number | null;
  nombreImporte?: number | null;
  nombreIgnore?: number | null;
  nombreErreurs?: number | null;
  erreursDetaillees?: string[];
  // Réponse pour type = 'all'
  sites?: KoboImportStats;
  employes?: KoboImportStats;
}

export interface ImportKoboHistory {
  '@id'?: string;
  id: number | string;
  typeFormulaire: string;
  koboFormUid: string;
  nombreSoumissions: number;
  statut: 'success' | 'error' | string;
  rawPreview: Record<string, unknown> | null;
  createdAt: string;
}

export async function triggerKoboImport(type: KoboImportType): Promise<KoboImportResult> {
  return http<KoboImportResult>('/kobo/import', {
    method: 'POST',
    body: { type },
  });
}

export async function fetchImportHistory(): Promise<ImportKoboHistory[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>(resourcePath('importKobos'));
  const page = unwrapPaginated<ImportKoboHistory>(raw);
  return page.items;
}
