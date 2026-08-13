import { http } from '@/lib/http';
import { API_BASE } from '@/lib/apiConfig';

export interface MediaEnvironnemental {
  id: string;
  typeMedia: string;
  categorie: string;
  url: string;
}

export interface DonneeEnvironnementale {
  id: string;
  uuidKobo?: string | null;
  submissionId?: string | null;
  // Eau — mesures in situ
  temperatureEau?: string | null;
  phEau?: string | null;
  conductiviteEau?: string | null;
  turbiditeEau?: string | null;
  tdsEau?: string | null;
  // Eau — analyses laboratoire
  mesEau?: string | null;
  dbo5Eau?: string | null;
  dcoEau?: string | null;
  sulfatesEau?: string | null;
  nh4Eau?: string | null;
  // Gestion de l'eau
  puisardExistant?: boolean | null;
  volumePuisardM3?: string | null;
  etatPuisard?: string | null;
  frequenceVidange?: string | null;
  systemeTraitementExistant?: boolean | null;
  pointPrelevement?: string | null;
  observationsGestionEau?: string | null;
  modeEvacuation?: string | null;
  // Sol
  phSol?: string | null;
  ceSol?: string | null;
  ferSol?: string | null;
  chromeSol?: string | null;
  zincSol?: string | null;
  conformiteSol?: string | null;
  // Air ambiant
  pm25?: string | null;
  pm10?: string | null;
  coAir?: string | null;
  no2Air?: string | null;
  so2Air?: string | null;
  covAir?: string | null;
  pointMesureAir?: string | null;
  // Déchets
  conformiteDechets?: string | null;
  // Conformité globale
  conformiteGlobale?: string | null;
  conformiteSyntheseEau?: string | null;
  conformiteSyntheseSol?: string | null;
  conformiteSyntheseAir?: string | null;
  conformiteSyntheseDechets?: string | null;
  niveauRisqueGlobal?: string | null;
  // Médias
  medias: MediaEnvironnemental[];
}

export interface DonneesEnvResponse {
  site: { id: number; codeSite: string; nomSite: string; commune: string };
  total: number;
  resultats: DonneeEnvironnementale[];
}

/** Origine du serveur backend (ex: https://api.back-paset.com) */
export const SERVER_ORIGIN: string = (() => {
  try { return new URL(API_BASE).origin; } catch { return ''; }
})();

/** Construit l'URL absolue d'un média backend (nécessite l'auth Bearer). */
export function mediaAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SERVER_ORIGIN}${path}`;
}

export async function fetchDonneesEnvironnementales(siteId: string): Promise<DonneesEnvResponse> {
  const data = await http<{
    site: { id: number; codeSite: string; nomSite: string; commune: string };
    total: number;
    resultats: any[];
  }>(`/site_teintures/${siteId}/donnees-environnementales`);

  return {
    site: data.site,
    total: data.total,
    resultats: (data.resultats ?? []).map((r: any) => {
      const raw: Record<string, unknown> = r.rawData ?? {};
      // Cherche une valeur dans rawData — essaie grp_x/key puis camelCase
      const g = (...keys: string[]): string | null => {
        for (const k of keys) {
          const v = raw[k];
          if (v != null && v !== '') return String(v);
        }
        return null;
      };
      return {
        id: r.id,
        uuidKobo: r.uuidKobo ?? null,
        submissionId: r.submissionId ?? null,
        // Eau in situ
        temperatureEau: r.temperatureEau ?? null,
        phEau: r.phEau ?? null,
        conductiviteEau: r.conductiviteEau ?? null,
        turbiditeEau: r.turbiditeEau ?? null,
        tdsEau: r.tdsEau ?? null,
        // Eau labo
        mesEau: r.mesEau ?? null,
        dbo5Eau: r.dbo5Eau ?? null,
        dcoEau: r.dcoEau ?? null,
        sulfatesEau: r.sulfatesEau ?? null,
        nh4Eau: r.nh4Eau ?? null,
        // Gestion eau
        puisardExistant: r.puisardExistant ?? null,
        volumePuisardM3: r.volumePuisardM3 ?? null,
        etatPuisard: r.etatPuisard ?? null,
        frequenceVidange: r.frequenceVidange ?? null,
        systemeTraitementExistant: r.systemeTraitementExistant ?? null,
        pointPrelevement: r.pointPrelevement ?? null,
        observationsGestionEau: g('grp_b/observations_gestion_eau', 'observationsGestionEau'),
        modeEvacuation: g('grp_b/mode_evacuation', 'modeEvacuation'),
        // Sol (rawData grp_f)
        phSol: g('grp_f/ph_sol', 'phSol'),
        ceSol: g('grp_f/ce_sol', 'ceSol'),
        ferSol: g('grp_f/fer_sol', 'ferSol'),
        chromeSol: g('grp_f/chrome_sol', 'chromeSol'),
        zincSol: g('grp_f/zinc_sol', 'zincSol'),
        conformiteSol: g('grp_f/conformite_sol', 'conformiteSol'),
        // Air (rawData grp_g)
        pm25: g('grp_g/pm25', 'pm25'),
        pm10: g('grp_g/pm10', 'pm10'),
        coAir: g('grp_g/co_air', 'coAir'),
        no2Air: g('grp_g/no2_air', 'no2Air'),
        so2Air: g('grp_g/so2_air', 'so2Air'),
        covAir: g('grp_g/cov_air', 'covAir'),
        pointMesureAir: g('grp_g/point_mesure_air', 'pointMesureAir'),
        // Déchets (rawData grp_h)
        conformiteDechets: g('grp_h/conformite_dechets', 'conformiteDechets'),
        // Conformité globale (rawData grp_i)
        conformiteGlobale: g('grp_i/conformite_globale', 'conformiteGlobale'),
        conformiteSyntheseEau: g('grp_i/conformite_synthese_eau', 'conformiteSyntheseEau'),
        conformiteSyntheseSol: g('grp_i/conformite_synthese_sol', 'conformiteSyntheseSol'),
        conformiteSyntheseAir: g('grp_i/conformite_synthese_air', 'conformiteSyntheseAir'),
        conformiteSyntheseDechets: g('grp_i/conformite_synthese_dechets', 'conformiteSyntheseDechets'),
        niveauRisqueGlobal: g('grp_i/niveau_risque_global', 'niveauRisqueGlobal'),
        medias: (r.medias ?? []).map((m: any) => ({
          id: m.id,
          typeMedia: m.typeMedia,
          categorie: m.categorie,
          url: m.url,
        })),
      };
    }),
  };
}
