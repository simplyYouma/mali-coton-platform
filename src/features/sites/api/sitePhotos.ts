import { http } from '@/lib/http';
import { unwrapPaginated } from '@/lib/jsonld';
import { resourcePath } from '@/lib/apiConfig';

export interface CollectePhotoBackend {
  '@id'?: string;
  id: number;
  /** IRI de la collecte associée, ex. "/api/collecte_sites/2" */
  collecteSite: string;
  koboFilename?: string | null;
  downloadUrl: string;
  mimetype?: string | null;
  rawMetadata?: {
    media_file_basename?: string;
    download_medium_url?: string;
    download_large_url?: string;
    download_small_url?: string;
    question_xpath?: string;
  } | null;
  createdAt?: string | null;
}

/**
 * Récupère les photos d'un site à partir de l'ID de sa collecteSite.
 * Filtre via le paramètre API Platform : collecteSite=/api/collecte_sites/{csId}
 */
export async function fetchSitePhotos(collecteSiteId: number): Promise<CollectePhotoBackend[]> {
  const iri = `/api/collecte_sites/${collecteSiteId}`;
  const raw = await http<unknown>(resourcePath('collectePhotos'), {
    query: { collecteSite: iri },
  });
  const page = unwrapPaginated<CollectePhotoBackend>(raw);
  return page.items;
}
