import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';

function fixMojibake(s: string | null | undefined): string {
  if (!s) return '';
  try {
    const bytes = new Uint8Array([...s].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.includes('�') ? s : decoded;
  } catch {
    return s;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatutConformite =
  | 'CONFORME'
  | 'A_SURVEILLER'
  | 'CRITIQUE'
  | 'NON_EVALUE';

// Au niveau paramètre, l'API peut aussi renvoyer NON_CONFORME
export type StatutParametre = StatutConformite | 'NON_CONFORME';

export type NiveauRisque = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';

export interface ConformiteGlobaleResume {
  nombreSites: number;
  sitesConformes: number;
  sitesASurveiller: number;
  sitesCritiques: number;
  sitesNonEvalues: number;
  tauxConformiteGlobal: number;
  couvertureEvaluationGlobale: number;
  niveauRisqueGlobal: NiveauRisque;
}

export interface ConformiteSiteSummary {
  id: number;
  nom: string;
  statut: StatutConformite;
  niveauRisque: NiveauRisque;
  tauxConformite: number;
  composantes: Record<string, StatutConformite>;
}

export interface ConformiteGlobale {
  resume: ConformiteGlobaleResume;
  sites: ConformiteSiteSummary[];
}

// ── Seuil et paramètre ────────────────────────────────────────────────────────

export interface SeuilConformite {
  id: string;
  valeurMin: number | null;
  valeurMax: number | null;
  unite: string;
  norme: { code: string; libelle: string };
}

export interface ParametreConformite {
  id: number;
  code: string;
  libelle: string;
  valeur: number | null;
  valeurBrute: string;
  unite: string | null;
  statut: StatutParametre;
  conforme: boolean | null;
  raison?: string;
  seuil?: SeuilConformite;
}

export interface ComposanteConformite {
  code: string;                    // "AIR" | "EAU" | "SOL"
  statut: StatutConformite;
  conforme: boolean | null;
  total: number;
  evaluables: number;
  conformes: number;
  nonConformes: number;
  nonEvalues: number;
  tauxConformite: number | null;
  couvertureEvaluation: number;
  parametres: ParametreConformite[];
}

export interface ConformiteSiteResume {
  statut: StatutConformite;
  niveauRisque: NiveauRisque;
  totalEvaluables: number;
  conformes: number;
  nonConformes: number;
  nonEvalues: number;
  tauxConformite: number;
  couvertureEvaluation: number;
}

export interface ConformiteSiteDetail {
  site: { id: number; nom: string };
  resume: ConformiteSiteResume;
  composantes: ComposanteConformite[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapParametre(p: any): ParametreConformite {
  return {
    id: p.id,
    code: p.code ?? '',
    libelle: fixMojibake(p.libelle),
    valeur: p.valeur ?? null,
    valeurBrute: p.valeurBrute ?? '',
    unite: fixMojibake(p.unite),
    statut: p.statut ?? 'NON_EVALUE',
    conforme: p.conforme ?? null,
    raison: p.raison,
    seuil: p.seuil
      ? {
          id: p.seuil.id,
          valeurMin: p.seuil.valeurMin ?? null,
          valeurMax: p.seuil.valeurMax ?? null,
          unite: fixMojibake(p.seuil.unite),
          norme: {
            code: p.seuil.norme?.code ?? '',
            libelle: fixMojibake(p.seuil.norme?.libelle),
          },
        }
      : undefined,
  };
}

function mapComposante(c: any): ComposanteConformite {
  return {
    code: c.code ?? '',
    statut: c.statut ?? 'NON_EVALUE',
    conforme: c.conforme ?? null,
    total: c.total ?? 0,
    evaluables: c.evaluables ?? 0,
    conformes: c.conformes ?? 0,
    nonConformes: c.nonConformes ?? 0,
    nonEvalues: c.nonEvalues ?? 0,
    tauxConformite: c.tauxConformite ?? null,
    couvertureEvaluation: c.couvertureEvaluation ?? 0,
    parametres: (c.parametres ?? []).map(mapParametre),
  };
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchConformiteGlobale(): Promise<ConformiteGlobale> {
  if (API_MODE !== 'live') return { resume: emptyResume(), sites: [] };
  const raw: any = await http('/donnees-environnementales/conformite');
  return {
    resume: raw.resume ?? emptyResume(),
    sites: (raw.sites ?? []).map((s: any): ConformiteSiteSummary => ({
      id: s.id,
      nom: fixMojibake(s.nom),
      statut: s.statut ?? 'NON_EVALUE',
      niveauRisque: s.niveauRisque ?? 'FAIBLE',
      tauxConformite: s.tauxConformite ?? 0,
      composantes: s.composantes ?? {},
    })),
  };
}

export async function fetchConformiteSite(siteId: string): Promise<ConformiteSiteDetail> {
  const raw: any = await http(`/site_teintures/${siteId}/conformite-environnementale`);
  return {
    site: { id: raw.site?.id, nom: fixMojibake(raw.site?.nom) },
    resume: raw.resume ?? { statut: 'NON_EVALUE', niveauRisque: 'FAIBLE', totalEvaluables: 0, conformes: 0, nonConformes: 0, nonEvalues: 0, tauxConformite: 0, couvertureEvaluation: 0 },
    composantes: (raw.composantes ?? []).map(mapComposante),
  };
}

function emptyResume(): ConformiteGlobaleResume {
  return { nombreSites: 0, sitesConformes: 0, sitesASurveiller: 0, sitesCritiques: 0, sitesNonEvalues: 0, tauxConformiteGlobal: 0, couvertureEvaluationGlobale: 0, niveauRisqueGlobal: 'FAIBLE' };
}
