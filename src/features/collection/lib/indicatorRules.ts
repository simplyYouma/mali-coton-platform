import type { SiteType } from '@/features/sites/api/site.types';
import type {
  AcquisitionMode,
  ConditionalContext,
  IndicatorDomain,
  Measurement,
} from '../api/collection.types';

/**
 * Logique conditionnelle de saisie — CDC §5.2 ("logiques conditionnelles,
 * questions dépendantes") + §4 (cadre d'indicateurs par domaine).
 *
 * Cette table dérive du référentiel CDC §4 et précise pour chaque indicateur :
 * - son domaine (eaux, sol, air, déchets, santé, socio)
 * - son mode d'acquisition par défaut (in_situ via capteur portable, ou labo)
 * - sa pertinence selon le type de site et le contexte (cours d'eau à proximité)
 *
 * Garde la fonction `isIndicatorApplicable` pure et testable —
 * la logique ne doit jamais être inlinée dans les composants.
 */

export interface IndicatorRule {
  id: string;
  domain: IndicatorDomain;
  label: string;
  unit: string;
  defaultAcquisition: AcquisitionMode;
  /** Méthode d'analyse / instrument (pH-mètre portable, spectrométrie AAS, etc.) — aligné questionnaire Sahel Env. */
  method?: string;
  /** Si défini, restreint l'indicateur à certains types de site. */
  applicableSiteTypes?: SiteType[];
  /** Si vrai, l'indicateur ne s'affiche que si le contexte indique un cours d'eau proche. */
  requiresNearbyWatercourse?: boolean;
  /** Borne basse de **validité physique** — saisir une valeur < validMin = impossible (rejet ingestion). */
  validMin?: number;
  /** Borne haute de **validité physique** — saisir une valeur > validMax = impossible. */
  validMax?: number;
  /** Borne basse de **conformité normative** (OMS / norme malienne). */
  minOk?: number;
  /** Borne haute de **conformité normative**. */
  maxOk?: number;
  /** Source normative à afficher. */
  source: string;
}

/* ─────────────────────────────────────────────
 * Référentiel des indicateurs MVP Phase 1 (CDC §4)
 *
 * Note: liste réduite à ce qui est réellement saisissable au L2.
 * La table complète sera étendue Phase 2 / par admin via /thresholds.
 * ───────────────────────────────────────────── */

export const INDICATOR_RULES: IndicatorRule[] = [
  // Section B — Eaux usées in-situ (Sahel Environnement)
  {
    id: 'water.temperature',
    domain: 'water',
    label: 'Température eaux',
    unit: '°C',
    defaultAcquisition: 'in_situ',
    method: 'Thermomètre portable',
    validMin: -5,
    validMax: 90,
    minOk: 15,
    maxOk: 35,
    source: 'OMS / Norme MN-03-02/002:2006',
  },
  {
    id: 'water.ph',
    domain: 'water',
    label: 'pH eaux usées',
    unit: '',
    defaultAcquisition: 'in_situ',
    method: 'pH-mètre portable',
    validMin: 0,
    validMax: 14,
    minOk: 6.5,
    maxOk: 8.5,
    source: 'OMS / Norme MN-03-02/002:2006',
  },
  {
    id: 'water.conductivity',
    domain: 'water',
    label: 'Conductivité',
    unit: 'µS/cm',
    defaultAcquisition: 'in_situ',
    method: 'Conductimètre portable',
    validMin: 0,
    source: 'Norme malienne',
  },
  {
    id: 'water.turbidity',
    domain: 'water',
    label: 'Turbidité',
    unit: 'NTU',
    defaultAcquisition: 'in_situ',
    method: 'Turbidimètre portable',
    validMin: 0,
    source: 'Norme malienne',
  },
  {
    id: 'water.tds',
    domain: 'water',
    label: 'Solides dissous totaux (TDS)',
    unit: 'mg/L',
    defaultAcquisition: 'in_situ',
    method: 'Capteur portable',
    validMin: 0,
    source: 'OMS 2017',
  },

  // Section C — Eaux usées labo (LNE et autres labos agréés)
  {
    id: 'water.mes',
    domain: 'water',
    label: 'Matières en suspension (MES)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Gravimétrie',
    validMin: 0,
    source: 'OMS 2012',
  },
  {
    id: 'water.color',
    domain: 'water',
    label: 'Coloration',
    unit: 'Pt-Co',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    validMin: 0,
    source: 'Norme malienne',
  },
  {
    id: 'water.dbo5',
    domain: 'water',
    label: 'DBO5',
    unit: 'mg O₂/L',
    defaultAcquisition: 'lab_pending',
    method: 'Méthode dilution / incubation 5 jours',
    validMin: 0,
    source: 'OMS / Norme malienne',
  },
  {
    id: 'water.dco',
    domain: 'water',
    label: 'DCO',
    unit: 'mg O₂/L',
    defaultAcquisition: 'lab_pending',
    method: 'Dichromate (oxydation acide)',
    validMin: 0,
    source: 'OMS / Norme malienne',
  },
  {
    id: 'water.nh4',
    domain: 'water',
    label: 'Azote ammoniacal (NH₄⁺)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.no2',
    domain: 'water',
    label: 'Nitrites (NO₂⁻)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.no3',
    domain: 'water',
    label: 'Nitrates (NO₃⁻)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.phosphorus',
    domain: 'water',
    label: 'Phosphore total (Pt)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    validMin: 0,
    source: 'OMS 2017',
  },
  // Sulfates : indicateur critique sur sites GALA / INDIGO (hydrosulfite)
  {
    id: 'water.sulfates',
    domain: 'water',
    label: 'Sulfates',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie',
    applicableSiteTypes: ['GALA', 'INDIGO', 'GALA_INDIGO'],
    validMin: 0,
    maxOk: 250,
    source: 'OMS 2017',
  },

  // Section C bis — Métaux lourds eaux (labo, spectrométrie absorption atomique)
  // Le chrome est séparé Cr³⁺ (peu toxique) / Cr⁶⁺ (hautement toxique, critique en teinture)
  {
    id: 'water.metals.fe',
    domain: 'water',
    label: 'Fer (Fe)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS / Norme malienne',
  },
  {
    id: 'water.metals.cr3',
    domain: 'water',
    label: 'Chrome trivalent (Cr³⁺)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS EHC',
  },
  {
    id: 'water.metals.cr6',
    domain: 'water',
    label: 'Chrome hexavalent (Cr⁶⁺)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie diphénylcarbazide',
    validMin: 0,
    maxOk: 0.05,
    source: 'OMS EHC — critique en teinture',
  },
  {
    id: 'water.metals.cu',
    domain: 'water',
    label: 'Cuivre (Cu)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.metals.zn',
    domain: 'water',
    label: 'Zinc (Zn)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.metals.pb',
    domain: 'water',
    label: 'Plomb (Pb)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'EHC 165 (OMS, 1995)',
  },
  {
    id: 'water.metals.ni',
    domain: 'water',
    label: 'Nickel (Ni)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS EHC',
  },
  {
    id: 'water.metals.co',
    domain: 'water',
    label: 'Cobalt (Co)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS EHC',
  },
  {
    id: 'water.metals.mn',
    domain: 'water',
    label: 'Manganèse (Mn)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.metals.na',
    domain: 'water',
    label: 'Sodium (Na)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.metals.k',
    domain: 'water',
    label: 'Potassium (K)',
    unit: 'mg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS 2017',
  },
  {
    id: 'water.metals.cd',
    domain: 'water',
    label: 'Cadmium (Cd)',
    unit: 'µg/L',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'EHC 223 (OMS, 2000)',
  },

  // Section D — Sol in-situ
  {
    id: 'soil.ph',
    domain: 'soil',
    label: 'pH du sol',
    unit: '',
    defaultAcquisition: 'in_situ',
    method: 'pH-mètre sol portable',
    validMin: 0,
    validMax: 14,
    minOk: 5.5,
    maxOk: 8.5,
    source: 'Directives UE 86/278',
  },
  {
    id: 'soil.conductivity',
    domain: 'soil',
    label: 'Conductivité électrique sol',
    unit: 'µS/cm',
    defaultAcquisition: 'in_situ',
    method: 'Conductimètre sol portable',
    validMin: 0,
    source: 'Directives UE 86/278',
  },

  // Section E — Sol labo (mêmes métaux que eaux, en mg/kg)
  {
    id: 'soil.metals.fe',
    domain: 'soil',
    label: 'Fer dans le sol (Fe)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'EHC OMS',
  },
  {
    id: 'soil.metals.cr3',
    domain: 'soil',
    label: 'Chrome trivalent sol (Cr³⁺)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'OMS EHC',
  },
  {
    id: 'soil.metals.cr6',
    domain: 'soil',
    label: 'Chrome hexavalent sol (Cr⁶⁺)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrophotométrie diphénylcarbazide',
    validMin: 0,
    source: 'OMS EHC',
  },
  {
    id: 'soil.metals.cu',
    domain: 'soil',
    label: 'Cuivre sol (Cu)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'Directives UE 86/278',
  },
  {
    id: 'soil.metals.zn',
    domain: 'soil',
    label: 'Zinc sol (Zn)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'Directives UE 86/278',
  },
  {
    id: 'soil.metals.pb',
    domain: 'soil',
    label: 'Plomb sol (Pb)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'Directives UE 86/278',
  },
  {
    id: 'soil.metals.cd',
    domain: 'soil',
    label: 'Cadmium sol (Cd)',
    unit: 'mg/kg',
    defaultAcquisition: 'lab_pending',
    method: 'Spectrométrie absorption atomique',
    validMin: 0,
    source: 'Directives UE 86/278',
  },

  // Section F — Air in-situ (capteurs portables type Temtop)
  {
    id: 'air.pm10',
    domain: 'air',
    label: 'PM10',
    unit: 'µg/m³',
    defaultAcquisition: 'in_situ',
    method: 'Capteur gravimétrique portable',
    validMin: 0,
    maxOk: 50,
    source: 'OMS — directives qualité air',
  },
  {
    id: 'air.pm25',
    domain: 'air',
    label: 'PM2,5',
    unit: 'µg/m³',
    defaultAcquisition: 'in_situ',
    method: 'Capteur gravimétrique portable',
    validMin: 0,
    maxOk: 25,
    source: 'OMS — directives qualité air',
  },
  {
    id: 'air.co',
    domain: 'air',
    label: 'Monoxyde de carbone (CO)',
    unit: 'ppm',
    defaultAcquisition: 'in_situ',
    method: 'Capteur électrochimique portable',
    validMin: 0,
    maxOk: 9,
    source: 'OMS air ambiant',
  },
  {
    id: 'air.no',
    domain: 'air',
    label: 'Monoxyde d\'azote (NO)',
    unit: 'ppm',
    defaultAcquisition: 'in_situ',
    method: 'Capteur électrochimique portable',
    validMin: 0,
    source: 'OMS air ambiant',
  },
  {
    id: 'air.no2',
    domain: 'air',
    label: 'Dioxyde d\'azote (NO₂)',
    unit: 'µg/m³',
    defaultAcquisition: 'in_situ',
    method: 'Capteur électrochimique portable',
    validMin: 0,
    maxOk: 40,
    source: 'OMS air ambiant',
  },
  {
    id: 'air.co2',
    domain: 'air',
    label: 'CO₂',
    unit: 'ppm',
    defaultAcquisition: 'in_situ',
    method: 'Capteur NDIR portable',
    validMin: 0,
    maxOk: 1000,
    source: 'Seuils OMS',
  },
  {
    id: 'air.so2',
    domain: 'air',
    label: 'Dioxyde de soufre (SO₂)',
    unit: 'µg/m³',
    defaultAcquisition: 'in_situ',
    method: 'Capteur électrochimique portable',
    validMin: 0,
    maxOk: 40,
    source: 'OMS air ambiant',
  },

  // Section G — Air labo (COV par PID au labo)
  {
    id: 'air.voc',
    domain: 'air',
    label: 'Composés organiques volatils (COV)',
    unit: 'µg/m³',
    defaultAcquisition: 'lab_pending',
    method: 'PID (photoionisation détection)',
    validMin: 0,
    source: 'OMS air intérieur',
  },

  // §4.6 — Déchets solides (questionnaire / observation)
  {
    id: 'waste.quantity',
    domain: 'waste',
    label: 'Quantité de déchets produits',
    unit: 'kg/semaine',
    defaultAcquisition: 'in_situ',
    source: 'UNEP Solid Waste Mgmt 2005',
  },
  {
    id: 'waste.collected',
    domain: 'waste',
    label: 'Quantité collectée et évacuée conformément',
    unit: 'kg/semaine',
    defaultAcquisition: 'in_situ',
    source: 'Décret n°01-394/P-RM',
  },
  {
    id: 'waste.management',
    domain: 'waste',
    label: 'Mode de gestion',
    unit: '',
    defaultAcquisition: 'in_situ',
    source: 'Décret n°01-394/P-RM',
  },

  // §4.7 — Santé / SST (questionnaire + observation)
  {
    id: 'health.epi_usage',
    domain: 'health',
    label: 'Taux utilisation EPI',
    unit: '%',
    defaultAcquisition: 'in_situ',
    minOk: 80,
    source: 'Conv. OIT 148 ; Décret n°96-178/P-RM',
  },
  {
    id: 'health.skin_disorders',
    domain: 'health',
    label: 'Affections dermatologiques observées',
    unit: 'cas',
    defaultAcquisition: 'in_situ',
    source: 'OMS ; IARC vol. 100',
  },
  {
    id: 'health.eye_burns',
    domain: 'health',
    label: 'Troubles oculaires (rougeurs, brûlures)',
    unit: 'cas',
    defaultAcquisition: 'in_situ',
    source: 'OMS',
  },
  {
    id: 'health.respiratory',
    domain: 'health',
    label: 'Troubles respiratoires (toux, dyspnée)',
    unit: 'cas',
    defaultAcquisition: 'in_situ',
    source: 'WHO global air quality 2021',
  },

  // §4.8 — Socio-économique (questionnaire)
  {
    id: 'socio.workforce_present',
    domain: 'socio',
    label: 'Effectifs présents le jour de la collecte',
    unit: 'pers.',
    defaultAcquisition: 'in_situ',
    source: 'Loi n°99-041',
  },
  {
    id: 'socio.social_coverage',
    domain: 'socio',
    label: "Couverture sociale (taux d'employés couverts)",
    unit: '%',
    defaultAcquisition: 'in_situ',
    source: 'Loi n°99-041',
  },
];

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

export function isIndicatorApplicable(
  rule: IndicatorRule,
  siteType: SiteType,
  context: Partial<ConditionalContext>,
): boolean {
  if (rule.applicableSiteTypes && !rule.applicableSiteTypes.includes(siteType)) {
    return false;
  }
  if (rule.requiresNearbyWatercourse && !context.hasNearbyWatercourse) {
    return false;
  }
  return true;
}

export function getApplicableIndicators(
  domain: IndicatorDomain,
  siteType: SiteType,
  context: Partial<ConditionalContext>,
): IndicatorRule[] {
  return INDICATOR_RULES.filter(
    (rule) => rule.domain === domain && isIndicatorApplicable(rule, siteType, context),
  );
}

export function findRule(indicatorId: string): IndicatorRule | undefined {
  return INDICATOR_RULES.find((r) => r.id === indicatorId);
}

/**
 * Vérifie qu'une valeur respecte les bornes de **validité physique** d'un
 * indicateur (ex. pH ∈ [0,14], conductivité ≥ 0). Différent de la conformité
 * normative (minOk/maxOk). Une valeur hors validité = erreur de saisie, à
 * rejeter à l'ingestion.
 */
export function isValueValid(rule: IndicatorRule, value: number): boolean {
  if (rule.validMin !== undefined && value < rule.validMin) return false;
  if (rule.validMax !== undefined && value > rule.validMax) return false;
  return true;
}

/**
 * Calcule le niveau de conformité d'une mesure numérique selon les bornes
 * du référentiel. Les valeurs hors plage stricte → 'critical' ; en zone
 * tampon (10% au-delà des bornes) → 'warning' ; sinon 'conforming'.
 *
 * Note CDC §13 — la valeur de conformité côté serveur reste autoritaire ;
 * cette fonction donne un feedback immédiat à l'agent pour autocontrôle.
 */
export function computeLocalConformity(
  rule: IndicatorRule,
  value: number,
): 'conforming' | 'warning' | 'critical' {
  const { minOk, maxOk } = rule;
  if (minOk === undefined && maxOk === undefined) return 'conforming';

  const tolerance = 0.1;
  const bufferLow = minOk !== undefined ? minOk * (1 - tolerance) : -Infinity;
  const bufferHigh = maxOk !== undefined ? maxOk * (1 + tolerance) : Infinity;

  if (value < (minOk ?? -Infinity) || value > (maxOk ?? Infinity)) {
    if (value < bufferLow || value > bufferHigh) return 'critical';
    return 'warning';
  }
  return 'conforming';
}

/**
 * Vérifie qu'un brouillon a au moins une mesure non vide par domaine
 * pertinent — utilisé pour activer le bouton "Soumettre" en étape 6.
 */
export function getMissingDomainsForSubmission(
  measurements: Measurement[],
  siteType: SiteType,
  context: Partial<ConditionalContext>,
): IndicatorDomain[] {
  const expectedDomains: IndicatorDomain[] = ['water', 'soil', 'air', 'waste', 'health', 'socio'];
  const filledDomains = new Set<IndicatorDomain>();

  for (const m of measurements) {
    const rule = findRule(m.indicatorId);
    if (!rule) continue;
    const hasValue = m.value !== null && m.value !== '';
    const hasSample = !!m.sample?.sampleId;
    if (hasValue || hasSample) filledDomains.add(rule.domain);
  }

  return expectedDomains.filter((d) => {
    const applicable = INDICATOR_RULES.some(
      (r) => r.domain === d && isIndicatorApplicable(r, siteType, context),
    );
    return applicable && !filledDomains.has(d);
  });
}
