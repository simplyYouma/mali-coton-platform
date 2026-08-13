import { http } from '@/lib/http';

export interface EmployeCodedItem {
  id: number;
  code: string;
  libelle: string;
  collecteEmployeId: number;
}

export interface DerniereCollecteEmploye {
  id: number;
  dateCollecte?: string | null;
  agent?: string | null;
  trancheAge?: string | null;
  eauSuffisante?: string | null;
  qualiteEau?: string | null;
  typesEpiUtilises?: string | null;
  frequenceEpi?: string | null;
  obstaclesEpi?: string | null;
  qualiteEpiPercue?: string | null;
  affecDermato?: string | null;
  affecRespi?: string | null;
  affecOculaire?: string | null;
  bilanSanteRecu?: string | null;
  suiviMedical?: string | null;
  structureSante?: string | null;
  obsSante?: string | null;
  expositions?: string | null;
  confortPoste?: string | null;
  accidentsPersonnels?: string | null;
  connaissanceRisques?: string | null;
  formationSecuRecue?: string | null;
  modeRemuneration?: string | null;
  revenuSuffisant?: string | null;
  revenuUnique?: string | null;
  couvertureSociale?: boolean | string | null;
  besoinsPrioritaires?: string | null;
  suggestionsEmploye?: string | null;
  observations?: string | null;
}

export interface Employe {
  id: number;
  codeEmploye: string;
  numeroEmploye: string;
  /* Exposes par le backend (schema Employe.jsonld-employe.read) mais absents
   * de cette interface : la liste n'affichait donc que le code. */
  nom?: string | null;
  prenom?: string | null;
  genre?: string | null;
  fonction?: string | null;
  statut?: string | null;
  anciennete?: string | null;
  niveauInstruction?: string | null;
  typeContrat?: string | null;
  situationMatrimoniale?: string | null;
  siteTeintureId: number;
  derniereCollecte?: DerniereCollecteEmploye | null;
  equipementsProtection: EmployeCodedItem[];
  santeSecurite: EmployeCodedItem[];
  besoins: EmployeCodedItem[];
  photos: unknown[];
}

export interface SiteEmployesResponse {
  totalEmployes: number;
  employes: Employe[];
}

export async function fetchSiteEmployes(id: string): Promise<SiteEmployesResponse> {
  return http<SiteEmployesResponse>(`/site_teintures/${id}/employes`);
}
