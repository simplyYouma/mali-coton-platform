/**
 * Données environnementales d'un site — onglet « Données env. » de la fiche.
 *
 * `fetchDonneesEnvironnementales` renvoyait une enveloppe vide hors mode live,
 * et aucun handler mock ne servait
 * `/site_teintures/:id/donnees-environnementales` : l'onglet restait vide.
 *
 * Les champs suivent `DonneeEnvironnementale` de
 * `src/features/sites/api/donneesEnv.ts`. Les valeurs ne sont pas tirées au
 * hasard : elles reprennent le profil documenté de chaque site — Dianéguéla
 * en cas critique (pH 11,25 et sulfates 4 332 mg/L relevés au cahier des
 * charges), Ndomo en site de référence à procédés végétaux. Les campagnes
 * plus anciennes sont légèrement décalées, pour qu'une évolution soit
 * lisible d'une visite à l'autre.
 */

import type {
  DonneeEnvironnementale,
  DonneesEnvResponse,
  MediaEnvironnemental,
} from '@/features/sites/api/donneesEnv';
import { mockSites } from './sites';
import { numeroDeSite } from './siteTerrain';

const MS_JOUR = 86_400_000;

/** Seuils de référence, pour situer les valeurs ci-dessous. */
const PH_MIN = 6.5;
const PH_MAX = 8.5;

interface ProfilEnv {
  /** pH de l'effluent lors de la campagne la plus récente. */
  ph: number;
  conductivite: number;
  turbidite: number;
  tds: number;
  mes: number;
  dbo5: number;
  dco: number;
  sulfates: number;
  nh4: number;
  puisardExistant: boolean;
  volumePuisardM3: string;
  etatPuisard: string;
  frequenceVidange: string;
  systemeTraitementExistant: boolean;
  modeEvacuation: string;
  observationsGestionEau: string;
  phSol: number;
  ceSol: number;
  fer: number;
  chrome: number;
  zinc: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  cov: number;
  conformiteDechets: string;
}

const PROFILS: Record<string, ProfilEnv> = {
  'site-atpek': {
    ph: 9.4, conductivite: 3850, turbidite: 62, tds: 1920, mes: 210,
    dbo5: 320, dco: 890, sulfates: 1850, nh4: 18,
    puisardExistant: true, volumePuisardM3: '12', etatPuisard: 'Saturé',
    frequenceVidange: 'Trimestrielle', systemeTraitementExistant: false,
    modeEvacuation: 'Caniveau municipal',
    observationsGestionEau:
      'Bassin de décantation non étanche, saturé au moment de la visite. Rejet direct au caniveau.',
    phSol: 8.4, ceSol: 1250, fer: 42, chrome: 0.18, zinc: 3.1,
    pm25: 34, pm10: 68, co: 4.2, no2: 28, so2: 12, cov: 180,
    conformiteDechets: 'Non conforme',
  },
  'site-dianeguela': {
    ph: 11.25, conductivite: 8420, turbidite: 148, tds: 4210, mes: 520,
    dbo5: 610, dco: 1840, sulfates: 4332, nh4: 46,
    puisardExistant: false, volumePuisardM3: '', etatPuisard: 'Inexistant',
    frequenceVidange: 'Sans objet', systemeTraitementExistant: false,
    modeEvacuation: 'Rejet direct au caniveau',
    observationsGestionEau:
      'Aucun ouvrage de rétention ni de traitement. Effluent déversé tel quel dans le caniveau '
      + 'longeant le site, connecté au collecteur du quartier.',
    phSol: 9.1, ceSol: 2840, fer: 78, chrome: 0.42, zinc: 6.8,
    pm25: 41, pm10: 84, co: 5.1, no2: 34, so2: 19, cov: 240,
    conformiteDechets: 'Non conforme',
  },
  'site-galanimassiriw': {
    ph: 9.8, conductivite: 2960, turbidite: 54, tds: 1480, mes: 165,
    dbo5: 240, dco: 620, sulfates: 980, nh4: 12,
    puisardExistant: false, volumePuisardM3: '', etatPuisard: 'Inexistant',
    frequenceVidange: 'Sans objet', systemeTraitementExistant: false,
    modeEvacuation: 'Épandage en fond de parcelle',
    observationsGestionEau:
      'Rejets épandus à même le sol en fond de parcelle. Volume faible, mais contamination '
      + 'directe du sol sur une zone non délimitée.',
    phSol: 8.8, ceSol: 1680, fer: 51, chrome: 0.24, zinc: 4.2,
    pm25: 26, pm10: 52, co: 3.1, no2: 21, so2: 8, cov: 120,
    conformiteDechets: 'Non conforme',
  },
  'site-djiguiyaso': {
    ph: 8.1, conductivite: 1240, turbidite: 22, tds: 620, mes: 68,
    dbo5: 110, dco: 260, sulfates: 320, nh4: 5,
    puisardExistant: true, volumePuisardM3: '8', etatPuisard: 'Bon',
    frequenceVidange: 'Bimestrielle', systemeTraitementExistant: true,
    modeEvacuation: 'Bassin de décantation puis épandage contrôlé',
    observationsGestionEau:
      "Bassin de décantation étanche, vidangé tous les deux mois. Teinture à l'indigo naturel : "
      + 'charge chimique nettement inférieure aux ateliers GALA.',
    phSol: 7.4, ceSol: 640, fer: 28, chrome: 0.06, zinc: 1.4,
    pm25: 14, pm10: 30, co: 1.8, no2: 12, so2: 3, cov: 45,
    conformiteDechets: 'Conforme',
  },
  'site-ndomo': {
    ph: 7.4, conductivite: 780, turbidite: 15, tds: 390, mes: 42,
    dbo5: 86, dco: 175, sulfates: 145, nh4: 3,
    puisardExistant: true, volumePuisardM3: '6', etatPuisard: 'Bon',
    frequenceVidange: 'Semestrielle', systemeTraitementExistant: true,
    modeEvacuation: 'Épandage contrôlé sur parcelle dédiée',
    observationsGestionEau:
      'Teintures exclusivement végétales (bogolan). Effluents chargés en matière organique '
      + 'mais sans intrant chimique de synthèse.',
    phSol: 7.1, ceSol: 420, fer: 19, chrome: 0.03, zinc: 0.9,
    pm25: 9, pm10: 21, co: 1.1, no2: 8, so2: 2, cov: 28,
    conformiteDechets: 'Conforme',
  },
};

function conformite(valeur: number, min: number, max: number): string {
  return valeur >= min && valeur <= max ? 'Conforme' : 'Non conforme';
}

function risqueGlobal(p: ProfilEnv): string {
  if (p.ph > 10.5 || p.sulfates > 3000) return 'Élevé';
  if (p.ph > PH_MAX || p.sulfates > 500) return 'Modéré';
  return 'Faible';
}

/** Médias rattachés à une campagne de mesure. */
function medias(base: string): MediaEnvironnemental[] {
  return [
    { id: `${base}-1`, typeMedia: 'photo', categorie: 'Effluent', url: '/img/collectes/pnud-effluent-2.jpg' },
    { id: `${base}-2`, typeMedia: 'photo', categorie: 'Point de rejet', url: '/img/collectes/pnud-drain-8.jpg' },
    { id: `${base}-3`, typeMedia: 'photo', categorie: 'Prélèvement', url: '/img/collectes/pnud-sample-5.jpg' },
  ];
}

/**
 * Une campagne de mesure. `recul` décale la campagne dans le passé et atténue
 * légèrement les valeurs, pour qu'une tendance soit lisible.
 */
function campagne(siteId: string, numero: number, rang: number): DonneeEnvironnementale {
  const p = PROFILS[siteId]!;
  // Les campagnes anciennes sont un peu moins marquees que la derniere.
  const attenuation = 1 - rang * 0.08;
  const v = (x: number, dec = 1) => (x * attenuation).toFixed(dec);
  const ph = Number((p.ph - rang * 0.15).toFixed(2));
  const sulfates = Number(v(p.sulfates, 0));
  const jours = 20 + rang * 45 + numero * 3;

  return {
    id: `env-${numero}-${rang + 1}`,
    uuidKobo: `env-${numero}${rang}-4c5d-9e6f-7a8b9c0d1e2f`,
    submissionId: `${520_000 + numero * 10 + rang}`,

    temperatureEau: v(29.5 - rang * 0.4),
    phEau: String(ph),
    conductiviteEau: v(p.conductivite, 0),
    turbiditeEau: v(p.turbidite, 0),
    tdsEau: v(p.tds, 0),

    mesEau: v(p.mes, 0),
    dbo5Eau: v(p.dbo5, 0),
    dcoEau: v(p.dco, 0),
    sulfatesEau: String(sulfates),
    nh4Eau: v(p.nh4),

    puisardExistant: p.puisardExistant,
    volumePuisardM3: p.volumePuisardM3,
    etatPuisard: p.etatPuisard,
    frequenceVidange: p.frequenceVidange,
    systemeTraitementExistant: p.systemeTraitementExistant,
    pointPrelevement: rang === 0 ? 'Exutoire principal' : 'Bassin de décantation',
    observationsGestionEau: p.observationsGestionEau,
    modeEvacuation: p.modeEvacuation,

    phSol: v(p.phSol, 1),
    ceSol: v(p.ceSol, 0),
    ferSol: v(p.fer, 1),
    chromeSol: v(p.chrome, 2),
    zincSol: v(p.zinc, 2),
    conformiteSol: conformite(p.phSol, 6.0, 8.5),

    pm25: v(p.pm25, 0),
    pm10: v(p.pm10, 0),
    coAir: v(p.co),
    no2Air: v(p.no2, 0),
    so2Air: v(p.so2, 0),
    covAir: v(p.cov, 0),
    pointMesureAir: "Atelier — hauteur d'homme",

    conformiteDechets: p.conformiteDechets,

    conformiteGlobale: risqueGlobal(p) === 'Faible' ? 'Conforme' : 'Non conforme',
    conformiteSyntheseEau: conformite(ph, PH_MIN, PH_MAX),
    conformiteSyntheseSol: conformite(p.phSol, 6.0, 8.5),
    conformiteSyntheseAir: p.pm25 <= 25 ? 'Conforme' : 'Non conforme',
    conformiteSyntheseDechets: p.conformiteDechets,
    niveauRisqueGlobal: risqueGlobal(p),

    medias: medias(`env-${numero}-${rang + 1}`),
    // Date de la campagne, exposee pour l'affichage chronologique.
    dateReleve: new Date(Date.now() - jours * MS_JOUR).toISOString(),
  } as DonneeEnvironnementale;
}

/** Réponse `/site_teintures/:id/donnees-environnementales`. */
export function donneesEnvDuSite(siteId: string): DonneesEnvResponse {
  const site = mockSites.find((s) => s.id === siteId);
  const numero = numeroDeSite(siteId);

  if (!site || numero === undefined || !PROFILS[siteId]) {
    return { site: { id: 0, codeSite: '', nomSite: '', commune: '' }, total: 0, resultats: [] };
  }

  // Trois campagnes : la plus recente en tete.
  const resultats = [0, 1, 2].map((rang) => campagne(siteId, numero, rang));

  return {
    site: {
      id: numero,
      codeSite: site.codeSite,
      nomSite: site.shortName ?? site.name,
      commune: site.location.commune,
    },
    total: resultats.length,
    resultats,
  };
}
