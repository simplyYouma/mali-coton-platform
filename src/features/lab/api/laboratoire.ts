import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';
import { unwrapPaginated, iriToId } from '@/lib/jsonld';
import type { Paginated } from '@/types/common';

export const TYPE_PRELEVEMENT_LABEL: Record<string, string> = {
  // Types /api/prelevements (uppercase)
  EAU_SURFACE: 'Eau de surface',
  EAU_SOUTERRAINE: 'Eau souterraine',
  EAU_PLUIE: 'Eau de pluie',
  EAU_USEE: 'Eau usée',
  SEDIMENT: 'Sédiment',
  SOL: 'Sol',
  AIR: 'Air',
  DECHETS: 'Déchets',
  // Types /api/resultats-analyse (snake_case)
  effluent_sortie: 'Effluent sortie',
  sol_zone_teinturerie: 'Sol — zone teinturerie',
  caniveau_adjacent: 'Caniveau adjacent',
  eau_de_puit: 'Eau de puit',
  eau_surface: 'Eau de surface',
};

export const STATUT_PRELEVEMENT_LABEL: Record<string, string> = {
  PRELEVE: 'Prélevé',
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
};

export const STATUT_PRELEVEMENT_VARIANT: Record<string, 'neutral' | 'info' | 'success' | 'danger'> = {
  PRELEVE: 'success',
  EN_ATTENTE: 'neutral',
  EN_COURS: 'info',
  VALIDE: 'success',
  REJETE: 'danger',
};

/* ── Prélèvements ── */

export interface Prelevement {
  id: string;
  codePrelevement: string;
  siteId: string;
  typePrelevement: string;
  pointPrelevement: string | null;
  methodePrelevement: string | null;
  datePrelevement: string;
  statut: string;
  source: string | null;
  latitude: number;
  longitude: number;
  nombreEchantillons: number;
}

export interface PrelevementsQuery {
  site?: string;
  typePrelevement?: string;
  statut?: string;
}

/** Extrait l'ID numérique du site depuis un IRI Prelevement.
 *  La relation peut valoir "/api/site_teintures/22/employes" ou "/api/site_teintures/22". */
function siteIdFromIri(iri: string): string {
  const m = iri.match(/site_teintures\/(\d+)/);
  return m ? m[1]! : iriToId(iri);
}

export async function fetchPrelevements(query: PrelevementsQuery = {}): Promise<Paginated<Prelevement>> {
  if (API_MODE !== 'live') return { items: [], total: 0, page: 1, pageSize: 0 };

  const params = new URLSearchParams({ pagination: 'false' });
  // L'API attend l'IRI complet : /api/site_teintures/{id}
  if (query.site) params.set('site', `/api/site_teintures/${query.site}`);
  if (query.typePrelevement) params.set('typePrelevement', query.typePrelevement);
  if (query.statut) params.set('statut', query.statut);

  const raw = await http<unknown>(`/prelevements?${params}`);
  const page = unwrapPaginated<any>(raw);

  return {
    ...page,
    items: page.items.map((r: any) => ({
      id: String(r.id ?? iriToId(r['@id'])),
      codePrelevement: r.codePrelevement ?? `#${r.id}`,
      siteId: typeof r.site === 'string' ? siteIdFromIri(r.site) : '',
      typePrelevement: r.typePrelevement ?? '',
      pointPrelevement: r.pointPrelevement ?? null,
      methodePrelevement: r.methodePrelevement ?? null,
      datePrelevement: r.datePrelevement ?? '',
      statut: r.statut ?? '',
      source: r.source ?? null,
      latitude: r.latitude ?? 0,
      longitude: r.longitude ?? 0,
      nombreEchantillons: Array.isArray(r.echantillons) ? r.echantillons.length : 0,
    })),
  };
}

/* ── Laboratoires ── */

export interface Laboratoire {
  id: string;
  nom: string;
  code: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  typeLaboratoire: string | null;
}

export async function fetchLaboratoires(): Promise<Laboratoire[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/laboratoires?pagination=false');
  const page = unwrapPaginated<any>(raw);
  return page.items.map((r: any) => ({
    id: String(r.id ?? iriToId(r['@id'])),
    nom: r.nom ?? '',
    code: r.code ?? null,
    adresse: r.adresse ?? null,
    telephone: r.telephone ?? null,
    email: r.email ?? null,
    typeLaboratoire: r.typeLaboratoire ?? null,
  }));
}

/* ── Échantillons ── */

export const STATUT_ECHANTILLON_LABEL: Record<string, string> = {
  RECU: 'Reçu',
  EN_ANALYSE: 'En analyse',
  ANALYSE: 'Analysé',
  REJETE: 'Rejeté',
};

export const STATUT_ECHANTILLON_VARIANT: Record<string, 'neutral' | 'info' | 'success' | 'danger'> = {
  RECU: 'info',
  EN_ANALYSE: 'info',
  ANALYSE: 'success',
  REJETE: 'danger',
};

export interface Echantillon {
  id: string;
  codeEchantillon: string;
  prelevementId: string;
  typeEchantillon: string;
  statut: string;
  dateReceptionLaboratoire: string;
  laboratoireId: string;
  nombreAnalyses: number;
}

export interface EchantillonsQuery {
  site?: string;
  statut?: string;
  laboratoire?: string;
}

export async function fetchEchantillons(query: EchantillonsQuery = {}): Promise<Paginated<Echantillon>> {
  if (API_MODE !== 'live') return { items: [], total: 0, page: 1, pageSize: 0 };

  const params = new URLSearchParams({ pagination: 'false' });
  if (query.site) params.set('prelevement.site', `/api/site_teintures/${query.site}`);
  if (query.statut) params.set('statut', query.statut);
  if (query.laboratoire) params.set('laboratoire', `/api/laboratoires/${query.laboratoire}`);

  const raw = await http<unknown>(`/echantillons?${params}`);
  const page = unwrapPaginated<any>(raw);

  return {
    ...page,
    items: page.items.map((r: any) => ({
      id: String(r.id ?? iriToId(r['@id'])),
      codeEchantillon: r.codeEchantillon ?? `#${r.id}`,
      prelevementId: iriToId(typeof r.prelevement === 'string' ? r.prelevement : ''),
      typeEchantillon: r.typeEchantillon ?? '',
      statut: r.statut ?? '',
      dateReceptionLaboratoire: r.dateReceptionLaboratoire ?? '',
      laboratoireId: iriToId(typeof r.laboratoire === 'string' ? r.laboratoire : ''),
      nombreAnalyses: Array.isArray(r.analyseLaboratoires) ? r.analyseLaboratoires.length : 0,
    })),
  };
}

/* ── Résultats d'analyse ── */

/** Les valeurs analytiques sont des nombres parsés depuis les strings de l'API. */
export interface ValeursAnalytiques {
  temperature?: number | null;
  ph?: number | null;
  conductivite?: number | null;
  turbidite?: number | null;
  tds?: number | null;
  mes?: number | null;
  dbo5?: number | null;
  dco?: number | null;
  couleur?: number | null;
  sulfates?: number | null;
  nh4?: number | null;
  no2?: number | null;
  no3?: number | null;
  phosphate_total?: number | null;
  chrome?: number | null;
  fer?: number | null;
  nickel?: number | null;
  cuivre?: number | null;
  zinc?: number | null;
  manganese?: number | null;
  plomb?: number | null;
}

export interface ResultatAnalyse {
  id: string;
  siteId: string | null;
  siteCode: string | null;
  siteNom: string | null;
  typePrelevement: string | null;
  echantillon: string | null;
  dateUtilisee: string;
  statut: string | null;
  nombreFichiers: number;
  presenceRapport: boolean;
  parametresDisponibles: string[];
  valeursAnalytiques: ValeursAnalytiques;
}

export interface ResultatsQuery {
  site?: string;
  typePrelevement?: string;
}

/** /api/resultats-analyse retourne un format custom (non Hydra). */
export async function fetchResultatsAnalyse(query: ResultatsQuery = {}): Promise<Paginated<ResultatAnalyse>> {
  if (API_MODE !== 'live') return { items: [], total: 0, page: 1, pageSize: 0 };

  const params = new URLSearchParams();
  if (query.site) params.set('site', query.site);
  if (query.typePrelevement) params.set('typePrelevement', query.typePrelevement);

  const raw = await http<{ total: number; page: number; limite: number; resultats: any[] }>(
    `/resultats-analyse?${params}`,
  );

  const items: ResultatAnalyse[] = (raw.resultats ?? []).map((r: any) => ({
    id: String(r.id),
    siteId: r.site ? String(r.site.id) : null,
    siteCode: r.site?.code ?? null,
    siteNom: r.site?.nom ?? null,
    typePrelevement: r.typePrelevement ?? null,
    echantillon: r.echantillon ?? null,
    dateUtilisee: r.dateUtilisee ?? '',
    statut: r.statut ?? null,
    nombreFichiers: r.nombreFichiers ?? 0,
    presenceRapport: r.presenceRapportLaboratoire ?? false,
    parametresDisponibles: r.parametresDisponibles ?? [],
    // Les valeurs sont des strings — on les parse en float
    valeursAnalytiques: Object.fromEntries(
      Object.entries(r.valeursAnalytiques ?? {}).map(([k, v]) => {
        const n = parseFloat(String(v).replace(',', '.'));
        return [k, Number.isNaN(n) ? null : n];
      }),
    ) as ValeursAnalytiques,
  }));

  return {
    items,
    total: raw.total ?? items.length,
    page: raw.page ?? 1,
    pageSize: raw.limite ?? 50,
  };
}
