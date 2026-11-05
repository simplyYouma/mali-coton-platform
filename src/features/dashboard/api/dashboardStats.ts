/**
 * Indicateurs Sites & Employés — `/api/dashboard/{sites,employes}/...`.
 *
 * Source : fiches Site et Employé importées de Kobo (déjà normalisées côté
 * backend), pas les formulaires natifs de collecte — voir la note affichée
 * dans les onglets Sites/Employés du tableau de bord.
 *
 * Chaque réponse a la forme `{ filtres: {...}, "<clé>": ... }`, où la clé de
 * payload varie par endpoint (parfois `repartition`/`evolution` génériques,
 * parfois le nom de la ressource, parfois avec un tiret — `equipements-protection`).
 * Un seul lecteur générique par forme de réponse (kpi / repartition /
 * classement / évolution / par-site), paramétré par le chemin et la clé,
 * plutôt que vingt fonctions ou types quasi identiques.
 */
import { http } from '@/lib/http';

/* ═══ Filtres communs ═══ */

export interface FiltresDashboard {
  dateDebut?: string;
  dateFin?: string;
  siteId?: number;
  codeSite?: string;
  /** Sites uniquement — sans effet sur les endpoints Employés (le champ n'y existe pas). */
  region?: string;
}

function query(filtres: FiltresDashboard) {
  return {
    dateDebut: filtres.dateDebut,
    dateFin: filtres.dateFin,
    siteId: filtres.siteId,
    codeSite: filtres.codeSite,
    region: filtres.region,
  };
}

/** Ce que le backend a effectivement reçu, en écho — sert au débogage des filtres, pas à l'affichage. */
export interface FiltresEcho {
  dateDebut: string | null;
  dateFin: string | null;
  siteId: number | null;
  codeSite: string | null;
  region: string | null;
}

/** Réponse brute générique : `{ filtres, "<clé>": T }`. */
type ReponseDashboard<T> = { filtres: FiltresEcho } & Record<string, T | FiltresEcho>;

async function lireCle<T>(chemin: string, cle: string, filtres: FiltresDashboard): Promise<T> {
  const brut = await http<ReponseDashboard<unknown>>(`/dashboard/${chemin}`, { query: query(filtres) });
  return (brut[cle] ?? (Array.isArray(brut[cle]) ? [] : {})) as T;
}

/*
 * Un 400 de validation (date mal formée, siteId ≤ 0, dateDebut > dateFin)
 * porte un message explicite côté backend, déjà propagé par `http()` dans
 * `HttpError.payload.message` — les appelants font `err instanceof HttpError`
 * (import depuis `@/lib/http`) pour l'afficher tel quel, jamais un texte
 * générique.
 */

/* ═══ Formes de réponse ═══ */

/** Vue d'ensemble Sites. */
export interface KpiSites {
  totalSites: number;
  sitesGeolocalises: number;
  effectifTotal: number;
  effectifFemmes: number;
  effectifHommes: number;
  nombreVisites: number;
  tauxFormationEpi: number;
}

/** Vue d'ensemble Employés. */
export interface KpiEmployes {
  totalEmployes: number;
  nombreCollectes: number;
  tauxUtilisationEpi: number;
  tauxAccidentTravail: number;
  tauxAccesEauPotable: number;
  revenuMensuelMoyen: number;
}

/** Répartition — le champ de libellé source varie (`region`, `genre`, `contrat`…), normalisé ici. */
export interface EntreeRepartition {
  libelle: string;
  nombre: number;
}

/** Classement `{code, libelle, nombreSites|nombreEmployes}` — six indicateurs Sites, trois Employés. */
export interface EntreeClassement {
  code: string;
  libelle: string;
  nombre: number;
}

/** Série mensuelle — visites (Sites) ou collectes (Employés). */
export interface EntreeEvolution {
  periode: string;
  nombre: number;
}

/** Effectif par site (Employés, top 10). */
export interface EntreeParSite {
  siteId: number;
  codeSite: string;
  nomSite: string;
  nombreEmployes: number;
}

function nombreDe(o: Record<string, unknown>): number {
  const entree = Object.entries(o).find(([k]) => k.toLowerCase().startsWith('nombre'));
  const v = entree?.[1];
  return typeof v === 'number' ? v : Number(v ?? 0) || 0;
}

/**
 * Normalise une entrée de répartition. Le champ de libellé attendu est passé
 * en indice — non confirmé pour tous les endpoints (seuls `region` et `genre`
 * sont vus dans la documentation livrée) — avec repli générique sur le
 * premier champ texte qui n'est pas le champ `nombre*`, pour rester correct
 * même si le nom exact diffère de l'hypothèse.
 */
function normaliserRepartition(brut: unknown[], champLibelleAttendu: string): EntreeRepartition[] {
  return brut.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const attendu = o[champLibelleAttendu];
    const libelle =
      typeof attendu === 'string' && attendu
        ? attendu
        : ((Object.entries(o).find(
            ([k, v]) => typeof v === 'string' && !k.toLowerCase().startsWith('nombre'),
          )?.[1] as string | undefined) ?? 'Non renseigné');
    return { libelle, nombre: nombreDe(o) };
  });
}

function normaliserClassement(brut: unknown[]): EntreeClassement[] {
  return brut.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const code = typeof o.code === 'string' ? o.code : '';
    const libelle = typeof o.libelle === 'string' && o.libelle ? o.libelle : code;
    return { code, libelle, nombre: nombreDe(o) };
  });
}

function normaliserEvolution(brut: unknown[]): EntreeEvolution[] {
  return brut.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return { periode: typeof o.periode === 'string' ? o.periode : '', nombre: nombreDe(o) };
  });
}

function normaliserParSite(brut: unknown[]): EntreeParSite[] {
  return brut.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      siteId: Number(o.siteId ?? 0),
      codeSite: typeof o.codeSite === 'string' ? o.codeSite : '',
      nomSite: typeof o.nomSite === 'string' ? o.nomSite : '',
      nombreEmployes: Number(o.nombreEmployes ?? 0),
    };
  });
}

/* ═══ Sites ═══ */

export function fetchSitesVueEnsemble(filtres: FiltresDashboard): Promise<KpiSites> {
  return lireCle<KpiSites>('sites/vue-ensemble', 'kpi', filtres);
}

export async function fetchSitesRepartitionRegion(filtres: FiltresDashboard): Promise<EntreeRepartition[]> {
  return normaliserRepartition(await lireCle('sites/repartition-region', 'repartition', filtres), 'region');
}

export async function fetchSitesRepartitionType(filtres: FiltresDashboard): Promise<EntreeRepartition[]> {
  return normaliserRepartition(await lireCle('sites/repartition-type', 'repartition', filtres), 'type');
}

export async function fetchSitesEpi(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/epi', 'epi', filtres));
}

export async function fetchSitesRisquesSecurite(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/risques-securite', 'risques-securite', filtres));
}

export async function fetchSitesBesoinsPrioritaires(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/besoins-prioritaires', 'besoins-prioritaires', filtres));
}

export async function fetchSitesFormationsRecues(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/formations-recues', 'formations-recues', filtres));
}

export async function fetchSitesAppuisRecus(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/appuis-recus', 'appuis-recus', filtres));
}

export async function fetchSitesTypesTeinture(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/types-teinture', 'types-teinture', filtres));
}

export async function fetchSitesEquipements(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('sites/equipements', 'equipements', filtres));
}

export async function fetchSitesEvolutionVisites(filtres: FiltresDashboard): Promise<EntreeEvolution[]> {
  return normaliserEvolution(await lireCle('sites/graphiques/evolution-visites', 'evolution', filtres));
}

/* ═══ Employés ═══ */

export function fetchEmployesVueEnsemble(filtres: FiltresDashboard): Promise<KpiEmployes> {
  return lireCle<KpiEmployes>('employes/vue-ensemble', 'kpi', filtres);
}

export async function fetchEmployesRepartitionGenre(filtres: FiltresDashboard): Promise<EntreeRepartition[]> {
  return normaliserRepartition(await lireCle('employes/repartition-genre', 'repartition', filtres), 'genre');
}

export async function fetchEmployesRepartitionContrat(filtres: FiltresDashboard): Promise<EntreeRepartition[]> {
  return normaliserRepartition(await lireCle('employes/repartition-contrat', 'repartition', filtres), 'contrat');
}

export async function fetchEmployesRepartitionInstruction(filtres: FiltresDashboard): Promise<EntreeRepartition[]> {
  return normaliserRepartition(
    await lireCle('employes/repartition-instruction', 'repartition', filtres),
    'instruction',
  );
}

export async function fetchEmployesEquipementsProtection(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('employes/equipements-protection', 'equipements-protection', filtres));
}

export async function fetchEmployesBesoins(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('employes/besoins', 'besoins', filtres));
}

export async function fetchEmployesSanteSecurite(filtres: FiltresDashboard): Promise<EntreeClassement[]> {
  return normaliserClassement(await lireCle('employes/sante-securite', 'sante-securite', filtres));
}

export async function fetchEmployesParSite(filtres: FiltresDashboard): Promise<EntreeParSite[]> {
  return normaliserParSite(await lireCle('employes/par-site', 'parSite', filtres));
}

export async function fetchEmployesEvolutionCollectes(filtres: FiltresDashboard): Promise<EntreeEvolution[]> {
  return normaliserEvolution(await lireCle('employes/graphiques/evolution-collectes', 'evolution', filtres));
}
