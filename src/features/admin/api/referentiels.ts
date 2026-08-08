import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';

// ── Encoding fix ──────────────────────────────────────────────────────────────
// L'API renvoie parfois des chaînes UTF-8 interprétées en Latin-1 ("RÃ©" → "é").
function fixEncoding(s: string | null | undefined): string {
  if (!s) return '';
  try {
    return new TextDecoder('utf-8').decode(
      new Uint8Array([...s].map((c) => c.charCodeAt(0))),
    );
  } catch {
    return s;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParametreUnite {
  id: number;
  libelle: string;
  sigle: string;
  parametreAnalyses: string[];
}

export interface ParametreAnalyse {
  id: number;
  nom: string;
  categorie: string;
  description?: string | null;
  actif: boolean;
  unite?: string | null;
  createdAt?: string | null;
}

export interface NormeReference {
  id: string; // UUID
  code: string;
  libelle: string;
  organisme?: string | null;
  version?: string | null;
  description?: string | null;
  actif: boolean;
  dateDebutValidite?: string | null;
  dateFinValidite?: string | null;
}

export interface SeuilNormatif {
  id: string; // UUID
  parametreAnalyse: string; // IRI → ParametreAnalyse
  normeReference?: string | null; // IRI → NormeReference
  milieu?: string | null; // EAU_USEE | EAU_SURFACE | AIR_AMBIANT | SOL …
  unite?: string | null; // plain string ex. "mg/L"
  valeurMin?: string | null;
  valeurMax?: string | null;
  commentaire?: string | null;
  actif: boolean;
}

export interface SeuilNonConfigure {
  id: number;
  libelle: string;
  domaine: string;
}

export interface Indicateur {
  id: number;
  code: string;
  libelle: string;
  domaine: string; // 'chimique' | 'physique'
  unite: string | null;
  sourceNormative: {
    id: string;
    code: string;
    libelle: string;
    organisme: string;
  } | null;
  seuilMinimal: string | null;
  seuilMaximal: string | null;
  actif: boolean;
  configure: boolean;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface ParametreAnalyseInput {
  nom: string;
  categorie: string;
  description?: string;
  actif?: boolean;
  unite?: string | null;
}

export interface ParametreUniteInput {
  libelle: string;
  sigle: string;
}

export interface NormeReferenceInput {
  code: string;
  libelle: string;
  organisme?: string;
  version?: string;
  description?: string;
  actif?: boolean;
  dateDebutValidite?: string | null;
  dateFinValidite?: string | null;
}

export interface SeuilNormatifInput {
  parametreAnalyse: string; // IRI
  normeReference?: string | null; // IRI
  milieu?: string;
  unite?: string;
  valeurMin?: string;
  valeurMax?: string;
  commentaire?: string;
  actif?: boolean;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ReferentielsSummary {
  parametres: number;
  unites: number;
  normes: number;
  seuils: number;
}

export async function fetchReferentielsSummary(): Promise<ReferentielsSummary> {
  if (API_MODE !== 'live') return { parametres: 0, unites: 0, normes: 0, seuils: 0 };
  const data = await http<{ categories: Array<{ code: string; total: number }> }>('/referentiels');
  const get = (code: string) => data.categories.find((c) => c.code === code)?.total ?? 0;
  return { parametres: get('parametres'), unites: get('unites'), normes: get('normes'), seuils: get('seuils') };
}

// ── ParametreUnite ────────────────────────────────────────────────────────────

export async function fetchParametreUnites(): Promise<ParametreUnite[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/parametre_unites');
  return unwrapPaginated<any>(raw).items.map((b: any) => ({
    id: b.id,
    libelle: b.libelle,
    sigle: b.sigle,
    parametreAnalyses: b.parametreAnalyses ?? [],
  }));
}

export async function createParametreUnite(input: ParametreUniteInput): Promise<ParametreUnite> {
  return http<ParametreUnite>('/parametre_unites', { method: 'POST', body: input });
}

export async function updateParametreUnite(id: number, input: Partial<ParametreUniteInput>): Promise<ParametreUnite> {
  return http<ParametreUnite>(`/parametre_unites/${id}`, { method: 'PATCH', body: input });
}

// ── ParametreAnalyse ──────────────────────────────────────────────────────────

async function fetchAnalysesPage(page: number): Promise<{ items: ParametreAnalyse[]; total: number }> {
  const raw = await http<unknown>(`/parametre_analyses?page=${page}`);
  const paged = unwrapPaginated<any>(raw);
  return {
    items: paged.items.map((b: any) => ({
      id: b.id,
      nom: b.nom,
      categorie: b.categorie,
      description: b.description ?? null,
      actif: b.actif ?? true,
      unite: b.unite ?? null,
      createdAt: b.createdAt ?? null,
    })),
    total: paged.total,
  };
}

export async function fetchParametreAnalyses(): Promise<ParametreAnalyse[]> {
  if (API_MODE !== 'live') return [];
  const first = await fetchAnalysesPage(1);
  if (first.items.length >= first.total) return first.items;
  const pageSize = first.items.length || 30;
  const pageCount = Math.ceil(first.total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => fetchAnalysesPage(i + 2)),
  );
  return [...first.items, ...rest.flatMap((p) => p.items)];
}

export async function createParametreAnalyse(input: ParametreAnalyseInput): Promise<ParametreAnalyse> {
  return http<ParametreAnalyse>('/parametre_analyses', { method: 'POST', body: input });
}

export async function updateParametreAnalyse(id: number, input: Partial<ParametreAnalyseInput>): Promise<ParametreAnalyse> {
  return http<ParametreAnalyse>(`/parametre_analyses/${id}`, { method: 'PATCH', body: input });
}

export async function deleteParametreAnalyse(id: number): Promise<void> {
  return http<void>(`/parametre_analyses/${id}`, { method: 'DELETE' });
}

// ── NormeReference ────────────────────────────────────────────────────────────

export async function fetchNormeReferences(): Promise<NormeReference[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/norme_references');
  return unwrapPaginated<any>(raw).items.map((b: any) => ({
    id: String(b.id),
    code: b.code,
    libelle: fixEncoding(b.libelle),
    organisme: fixEncoding(b.organisme) || null,
    version: b.version ?? null,
    description: fixEncoding(b.description) || null,
    actif: b.actif ?? true,
    dateDebutValidite: b.dateDebutValidite ?? null,
    dateFinValidite: b.dateFinValidite ?? null,
  }));
}

export async function createNormeReference(input: NormeReferenceInput): Promise<NormeReference> {
  return http<NormeReference>('/norme_references', { method: 'POST', body: input });
}

export async function updateNormeReference(id: string, input: Partial<NormeReferenceInput>): Promise<NormeReference> {
  return http<NormeReference>(`/norme_references/${id}`, { method: 'PATCH', body: input });
}

// ── SeuilNormatif ─────────────────────────────────────────────────────────────

export async function fetchSeuilNormatifs(): Promise<SeuilNormatif[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/seuil_normatifs');
  return unwrapPaginated<any>(raw).items.map((b: any) => ({
    id: String(b.id),
    parametreAnalyse: b.parametreAnalyse ?? b.parametre ?? '',
    normeReference: b.normeReference ?? null,
    milieu: b.milieu ?? null,
    unite: b.unite ?? null,
    valeurMin: b.valeurMin ?? null,
    valeurMax: b.valeurMax ?? null,
    commentaire: b.commentaire ?? null,
    actif: b.actif ?? true,
  }));
}

export async function fetchSeuilsNonConfigures(): Promise<{ total: number; resultats: SeuilNonConfigure[] }> {
  if (API_MODE !== 'live') return { total: 0, resultats: [] };
  const data = await http<{ total: number; resultats: any[] }>('/seuil_normatifs/non-configures');
  return {
    total: data.total,
    resultats: (data.resultats ?? []).map((r: any) => ({
      id: r.id,
      libelle: fixEncoding(r.libelle),
      domaine: r.domaine,
    })),
  };
}

export async function createSeuilNormatif(input: SeuilNormatifInput): Promise<SeuilNormatif> {
  return http<SeuilNormatif>('/seuil_normatifs', { method: 'POST', body: input });
}

export async function updateSeuilNormatif(id: string, input: Partial<SeuilNormatifInput>): Promise<SeuilNormatif> {
  return http<SeuilNormatif>(`/seuil_normatifs/${id}`, { method: 'PATCH', body: input });
}

export async function deleteSeuilNormatif(id: string): Promise<void> {
  return http<void>(`/seuil_normatifs/${id}`, { method: 'DELETE' });
}

// ── Indicateurs (vue consolidée) ──────────────────────────────────────────────

export async function fetchIndicateurs(): Promise<Indicateur[]> {
  if (API_MODE !== 'live') return [];
  const data = await http<{ total: number; resultats: any[] }>('/indicateurs');
  return (data.resultats ?? []).map((r: any) => ({
    id: r.id,
    code: r.code,
    libelle: fixEncoding(r.libelle),
    domaine: r.domaine,
    unite: r.unite ?? null,
    sourceNormative: r.sourceNormative
      ? {
          id: String(r.sourceNormative.id),
          code: r.sourceNormative.code,
          libelle: fixEncoding(r.sourceNormative.libelle),
          organisme: fixEncoding(r.sourceNormative.organisme ?? ''),
        }
      : null,
    seuilMinimal: r.seuilMinimal ?? null,
    seuilMaximal: r.seuilMaximal ?? null,
    actif: r.actif ?? true,
    configure: r.configure ?? false,
  }));
}
