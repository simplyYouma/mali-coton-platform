/**
 * Adapter SiteTeinture (backend API Platform) ↔ Site (frontend).
 *
 * Le backend renvoie des objets avec des noms snake_case et certains champs
 * IRI ; on doit re-mapper pour que les composants existants (qui s'attendent
 * à `Site`) continuent à fonctionner sans changement.
 */
import { iriToId } from '@/lib/jsonld';
import type { ConformityLevel } from '@/types/common';
import type { Site, SiteLegalStatus, SiteType } from './site.types';

/**
 * Forme renvoyée par GET /api/site_teintures (resp. /:id) en JSON-LD.
 * On déclare uniquement les champs qu'on consomme.
 */
export interface SiteTeintureBackend {
  '@id'?: string;
  '@type'?: string;
  id: number;
  codeSite: string;
  nomSite: string;
  region?: string | null;
  commune?: string | null; // peut être un IRI ("/api/communes/3") ou un libellé
  communeAdministrative?: string | null;
  quartier?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  typeSite?: string | null;
  statutFoncier?: string | null;
  superficie?: string | null;
  responsableNom?: string | null;
  responsableContact?: string | null;
  nombreFemmes?: number | null;
  nombreHommes?: number | null;
  nombreTotal?: number | null;
  niveauFormalisation?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function mapType(raw?: string | null): SiteType {
  if (!raw) return 'NATURELLE';
  const up = raw.toUpperCase();
  if (up.includes('INDIGO') && up.includes('GALA')) return 'GALA_INDIGO';
  if (up.includes('INDIGO')) return 'INDIGO';
  if (up.includes('GALA')) return 'GALA';
  return 'NATURELLE';
}

function mapStatutFoncier(raw?: string | null): SiteLegalStatus {
  if (!raw) return 'informel';
  return raw.toLowerCase().includes('formel') ? 'formel' : 'informel';
}

const defaultConformity: ConformityLevel = 'conforming';

/**
 * Mappe un SiteTeinture backend → Site frontend.
 * Pour la maquette, les champs non renseignés côté backend
 * (conformité par domaine, dernière collecte…) prennent des valeurs neutres.
 */
export function toSite(b: SiteTeintureBackend): Site {
  return {
    id: String(b.id),
    codeSite: b.codeSite,
    name: b.nomSite,
    shortName: b.nomSite.replace(/^Teinturerie\s+/i, '').split('—')[0]!.trim() || b.codeSite,
    legalStatus: mapStatutFoncier(b.statutFoncier),
    niveauFormalisation: b.niveauFormalisation ?? undefined,
    location: {
      commune: b.commune ? iriToId(b.commune) : '',
      city: b.region ?? '',
      quartier: b.quartier ?? undefined,
    },
    coordinates: {
      lat: b.latitude ?? 0,
      lng: b.longitude ?? 0,
    },
    type: mapType(b.typeSite),
    workforce: b.nombreTotal ?? 0,
    workforceWomen: b.nombreFemmes ?? undefined,
    workforceMen: b.nombreHommes ?? undefined,
    superficie: b.superficie ?? undefined,
    responsableName: b.responsableNom ?? undefined,
    responsableContact: b.responsableContact ?? undefined,
    createdYear: b.createdAt ? new Date(b.createdAt).getFullYear() : 0,
    isReference: false,
    photos: [],
    conformity: defaultConformity,
    conformityByDomain: {
      water: defaultConformity,
      soil: defaultConformity,
      air: defaultConformity,
      waste: defaultConformity,
      health: defaultConformity,
    },
    lastCollectionAt: null,
    collectionsCount: 0,
  };
}
