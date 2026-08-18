import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';

// Corrige le mojibake UTF-8-encodé-comme-Latin-1 renvoyé par le backend.
// Ex : "Âµg/m3" → "µg/m3", "SÃ©gou" → "Ségou".
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

export interface RapportAnalyseSummary {
  id: string;
  siteCode: string;
  siteNom: string;
  laboratoireNom: string;
  typeOuvrage: string;
  mission: string;
  dateEchantillonnage: string;
  dateEmission: string;
  statut: string;        // normalized lowercase: "confirme" | "brouillon" | "archive"
  nombreAnalyses: number;
  fichierDisponible: boolean;
}

export interface AnalyseResultat {
  id: number;
  parametre: string;    // code ex. "water.chlorides"
  libelle: string;      // display name ex. "Chlorures"
  valeurBrute: string;  // raw string with French decimal
  valeur: number | null;
  unite: string;
  conforme: boolean | null;
}

export interface RapportAnalyseDetail extends RapportAnalyseSummary {
  client: string;
  methodeAnalyse: string;
  lieu: string;
  dateReception: string;
  analysesParMilieu: Record<string, AnalyseResultat[]>;
  commentaireAir: string;
  commentaireEau: string;
  commentaireSediment: string;
  conclusion: string;
  recommandations: string[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function normalizeStatut(s: string): string {
  return (s ?? '').toLowerCase();
}

function mapSummary(m: any): RapportAnalyseSummary {
  return {
    id: m.id ?? '',
    siteCode: m.site?.codeSite ?? '',
    siteNom: fixMojibake(m.site?.nomSite ?? m.site?.nom),
    laboratoireNom: fixMojibake(m.laboratoire?.nom),
    typeOuvrage: fixMojibake(m.typeOuvrage),
    mission: fixMojibake(m.mission),
    dateEchantillonnage: m.dateEchantillonnage ?? '',
    dateEmission: m.dateEmission ?? '',
    statut: normalizeStatut(m.statut),
    nombreAnalyses: m.nombreAnalyses ?? 0,
    fichierDisponible: m.fichierDisponible ?? false,
  };
}

function mapResultats(resultats: any[]): AnalyseResultat[] {
  return (resultats ?? []).map((r: any) => ({
    id: r.id,
    parametre: r.parametre ?? '',
    libelle: fixMojibake(r.libelle),
    valeurBrute: r.valeurBrute ?? '',
    valeur: r.valeurNumerique ?? null,
    unite: fixMojibake(r.unite),
    conforme: r.conforme ?? null,
  }));
}

// Chaque milieu est un tableau de blocs ; on aplatit tous les resultats.
function mapAnalysesParMilieu(raw: unknown): Record<string, AnalyseResultat[]> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, AnalyseResultat[]> = {};
  for (const [milieu, blocs] of Object.entries(raw as Record<string, any[]>)) {
    const allResultats: AnalyseResultat[] = [];
    for (const bloc of blocs ?? []) {
      allResultats.push(...mapResultats(bloc.resultats ?? []));
    }
    result[milieu] = allResultats;
  }
  return result;
}

function joinComments(v: unknown): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.map((s: string) => fixMojibake(s)).join('\n\n');
  return fixMojibake(String(v));
}

function joinRecommandations(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((s: string) => fixMojibake(s)).filter(Boolean);
  return fixMojibake(String(v)) ? [fixMojibake(String(v))] : [];
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchRapportsAnalyse(): Promise<RapportAnalyseSummary[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<{ resultats: any[] }>('/rapports-analyse');
  return (raw.resultats ?? []).map(mapSummary);
}

export async function fetchRapportAnalyseDetail(id: string): Promise<RapportAnalyseDetail> {
  const m: any = await http(`/rapports-analyse/${id}`);
  return {
    ...mapSummary(m),
    client: fixMojibake(m.client),
    methodeAnalyse: fixMojibake(m.methodeAnalyse),
    lieu: fixMojibake(m.lieu),
    dateReception: m.dateReception ?? '',
    analysesParMilieu: mapAnalysesParMilieu(m.analysesParMilieu),
    commentaireAir: joinComments(m.commentaireAir),
    commentaireEau: joinComments(m.commentaireEau),
    commentaireSediment: joinComments(m.commentaireSediment),
    conclusion: joinComments(m.conclusion),
    recommandations: joinRecommandations(m.recommandations),
  };
}
