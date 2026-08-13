/**
 * Adapter SiteTeinture (backend API Platform) ↔ Site (frontend).
 *
 * Le backend renvoie des objets avec des noms snake_case et certains champs
 * IRI ; on doit re-mapper pour que les composants existants (qui s'attendent
 * à `Site`) continuent à fonctionner sans changement.
 */
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

/** Élément codé (teinture, équipement, EPI, risque, formation, appui, besoin). */
export interface KoboCodedItem {
  id: number;
  siteTeintureId?: number;
  collecteSiteId?: number;
  code: string;
  libelle: string;
  createdAt?: string | null;
}

/** Photo renvoyée dans le détail d'un site. */
export interface KoboPhotoBackend {
  id: number;
  siteTeintureId?: number;
  collecteSiteId?: number;
  questionXpath?: string | null;
  mediaFileBasename?: string | null;
  mimeType?: string | null;
  /** Nouveau format : chemin relatif backend, ex. "/api/site_teintures/photos/100/afficher". */
  url?: string | null;
  /** Ancien format Kobo (rétrocompatibilité). */
  downloadUrl?: string | null;
  downloadLargeUrl?: string | null;
  downloadMediumUrl?: string | null;
  downloadSmallUrl?: string | null;
}

/** Données de la collecte terrain associée au site (Kobo). */
export interface CollecteSiteBackend {
  id: number;
  koboSubmissionId?: string | null;
  koboUuid?: string | null;
  koboFormUid?: string | null;
  idSiteKobo?: string | null;
  dateVisite?: string | null;
  siteCode?: string | null;
  ville?: string | null;
  agent?: string | null;
  gpsSiteRaw?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nomResponsable?: string | null;
  genreResponsable?: string | null;
  anneeCreation?: number | string | null;
  statutJuridique?: string | null;
  typesTeinture?: string | null;
  nbEmployesTotal?: number | null;
  nbFemmes?: number | null;
  nbHommes?: number | null;
  sourceEau?: string | null;
  etatSourcePrincipale?: string | null;
  consommationEauM3?: number | string | null;
  observationsEau?: string | null;
  equipementsDisponibles?: string | null;
  etatGeneralEquipements?: string | null;
  observationsEquipements?: string | null;
  epiDisponibles?: string | null;
  qualiteEpi?: string | null;
  formationEpiRecue?: string | boolean | null;
  observationsEpiSite?: string | null;
  cloture?: string | boolean | null;
  eclairage?: string | boolean | null;
  surveillance?: string | boolean | null;
  risquesSecurite?: string | null;
  accidentsRecents?: string | boolean | null;
  descriptionAccidents?: string | null;
  observationsSecurite?: string | null;
  comptabilite?: string | null;
  couvertureSociale?: string | null;
  formationsRecues?: string | null;
  formationsAutre?: string | null;
  appuisRecus?: string | null;
  besoinsPrioritaires?: string | null;
  observationsGenerales?: string | null;
  recommandations?: string | null;
  photoSite1?: string | null;
  photoSite2?: string | null;
  photoEquipements?: string | null;
  photoEpi?: string | null;
  photoSecurite?: string | null;
  statutImport?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Réponse complète de GET /api/site_teintures/{id} avec données enrichies. */
export interface SiteTeintureDetailBackend extends SiteTeintureBackend {
  collecteSite?: CollecteSiteBackend | null;
  typesTeinture?: KoboCodedItem[];
  equipements?: KoboCodedItem[];
  epis?: KoboCodedItem[];
  risquesSecurite?: KoboCodedItem[];
  formationsRecues?: KoboCodedItem[];
  appuisRecus?: KoboCodedItem[];
  besoinsPrioritaires?: KoboCodedItem[];
  photos?: KoboPhotoBackend[];
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

function cap(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
    shortName: b.nomSite.replace(/^Teinturerie\s+/i, '').split(/[_—]/)[0]!.trim() || b.codeSite,
    legalStatus: mapStatutFoncier(b.statutFoncier),
    niveauFormalisation: b.niveauFormalisation ?? undefined,
    location: {
      commune: cap(
        b.communeAdministrative ??
        (b.commune && !b.commune.startsWith('/') ? b.commune : null) ??
        '',
      ),
      city: cap(b.region),
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
