/**
 * Photos rattachées à la fiche terrain d'un site — onglet « Photos ».
 *
 * `fetchSitePhotos` renvoyait `[]` hors mode live, et aucun handler mock ne
 * servait `collecte_photos` : l'onglet restait vide.
 *
 * Les champs suivent `CollectePhotoBackend` de
 * `src/features/sites/api/sitePhotos.ts`. Le rattachement se fait par IRI de
 * `collecteSite`, comme le filtre API Platform employé en live
 * (`?collecteSite=/api/collecte_sites/{id}`).
 *
 * Les visuels sont ceux produits par `tools/generate-photos.mjs` : locaux,
 * donc consultables hors ligne, et portant la mention « visuel de
 * démonstration ».
 */

import type { CollectePhotoBackend } from '@/features/sites/api/sitePhotos';

const MS_JOUR = 86_400_000;

/** Prises de vue d'une visite de site, dans l'ordre du questionnaire Kobo. */
const PRISES = [
  { xpath: 'photo_site_1', fichier: 'pnud-workshop-3', legende: "Vue d'ensemble du site" },
  { xpath: 'photo_site_2', fichier: 'pnud-vats-1', legende: 'Cuves de teinture' },
  { xpath: 'photo_equipements', fichier: 'pnud-rinse-6', legende: 'Bac de rinçage' },
  { xpath: 'photo_epi', fichier: 'pnud-ppe-4', legende: 'Équipement de protection' },
  { xpath: 'photo_securite', fichier: 'pnud-drain-8', legende: 'Point de rejet' },
];

/**
 * Photos d'une fiche terrain, par identifiant de `collecteSite`.
 * Les identifiants sont ceux attribués dans `siteTerrain.ts` (1001 à 1005).
 */
export function photosDeCollecteSite(collecteSiteId: number): CollectePhotoBackend[] {
  if (!Number.isFinite(collecteSiteId) || collecteSiteId <= 1000 || collecteSiteId > 1005) {
    return [];
  }
  const numero = collecteSiteId - 1000;
  const prisLe = new Date(Date.now() - (12 + numero * 9) * MS_JOUR).toISOString();

  return PRISES.map((p, idx) => {
    const url = `/img/collectes/${p.fichier}.jpg`;
    return {
      '@id': `/api/v1/collecte_photos/${collecteSiteId * 10 + idx}`,
      id: collecteSiteId * 10 + idx,
      collecteSite: `/api/collecte_sites/${collecteSiteId}`,
      koboFilename: `${p.fichier}.jpg`,
      downloadUrl: url,
      mimetype: 'image/jpeg',
      rawMetadata: {
        media_file_basename: `${p.fichier}.jpg`,
        download_medium_url: url,
        download_large_url: url,
        download_small_url: url,
        question_xpath: p.xpath,
      },
      createdAt: prisLe,
    };
  });
}
