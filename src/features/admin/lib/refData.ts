/**
 * Référentiels métier contrôlés — single source of truth pour les vocabulaires
 * affichés dans tous les formulaires (indicateurs, sites, résultats labo…).
 *
 * Persistance : localStorage côté maquette ; en prod, à remplacer par des
 * endpoints CRUD admin.
 */

export type RefCategory =
  | 'units'
  | 'methods'
  | 'sources'
  | 'siteTypes'
  | 'legalStatus'
  | 'domains'
  | 'labCapabilities';

export interface RefEntry {
  id: string;
  /** Code court / clé technique. Immutable côté API (sert de FK). */
  code: string;
  /** Libellé affiché dans l'UI. */
  label: string;
  /** Description optionnelle (tooltip, glossaire). */
  description?: string;
  isActive: boolean;
  /** True = entrée de socle CDC. Suppression bloquée, modification possible. */
  locked?: boolean;
}

export const CATEGORY_LABEL: Record<RefCategory, string> = {
  units: 'Unités de mesure',
  methods: 'Méthodes de mesure',
  sources: 'Sources normatives',
  siteTypes: 'Types de site',
  legalStatus: 'Statuts juridiques',
  domains: 'Domaines d\'indicateur',
  labCapabilities: 'Capacités laboratoire',
};

export const CATEGORY_HINT: Record<RefCategory, string> = {
  units: 'Unités utilisées dans les indicateurs et résultats labo.',
  methods: 'Capteurs, techniques ou protocoles de mesure.',
  sources: 'Textes normatifs cités sur chaque indicateur.',
  siteTypes: 'Catégories d\'ateliers de teinture suivis.',
  legalStatus: 'Statut juridique d\'un site (formel / informel).',
  domains: 'Familles d\'indicateurs métier.',
  labCapabilities: 'Familles d\'analyses qu\'un laboratoire peut prendre en charge.',
};

/* ─────────── Socle par défaut (CDC §1, §4, §7.6) ─────────── */
export const DEFAULT_REF: Record<RefCategory, RefEntry[]> = {
  units: [
    { id: 'u-mgl', code: 'mg/L', label: 'mg/L', description: 'milligramme par litre', isActive: true, locked: true },
    { id: 'u-ugl', code: 'µg/L', label: 'µg/L', description: 'microgramme par litre', isActive: true, locked: true },
    { id: 'u-ugm3', code: 'µg/m³', label: 'µg/m³', description: 'microgramme par mètre cube', isActive: true, locked: true },
    { id: 'u-uscm', code: 'µS/cm', label: 'µS/cm', description: 'microsiemens par cm — conductivité', isActive: true, locked: true },
    { id: 'u-c', code: '°C', label: '°C', description: 'degré Celsius', isActive: true, locked: true },
    { id: 'u-ph', code: 'pH', label: 'pH', description: 'échelle 0–14', isActive: true, locked: true },
    { id: 'u-ppm', code: 'ppm', label: 'ppm', description: 'parties par million', isActive: true, locked: true },
    { id: 'u-ntu', code: 'NTU', label: 'NTU', description: 'turbidité néphélométrique', isActive: true, locked: true },
    { id: 'u-pct', code: '%', label: '%', description: 'pourcentage', isActive: true, locked: true },
    { id: 'u-kgw', code: 'kg/semaine', label: 'kg/semaine', isActive: true, locked: true },
    { id: 'u-pers', code: 'pers.', label: 'pers.', description: 'personnes', isActive: true, locked: true },
    { id: 'u-mgo2', code: 'mg O₂/L', label: 'mg O₂/L', description: 'demande en oxygène', isActive: true, locked: true },
    { id: 'u-mgkg', code: 'mg/kg', label: 'mg/kg', description: 'concentration sol', isActive: true, locked: true },
  ],
  methods: [
    { id: 'm-ph-portable', code: 'PH_PORTABLE', label: 'pH-mètre portable', isActive: true, locked: true },
    { id: 'm-conduct', code: 'CONDUCT', label: 'Conductimètre portable', isActive: true, locked: true },
    { id: 'm-thermo', code: 'THERMO', label: 'Thermomètre électronique', isActive: true, locked: true },
    { id: 'm-spectro', code: 'SPECTRO', label: 'Spectrophotomètre', isActive: true, locked: true },
    { id: 'm-aas', code: 'AAS', label: 'Spectrométrie absorption atomique (AAS) — labo', isActive: true, locked: true },
    { id: 'm-pid', code: 'PID', label: 'Détecteur PID / tubes adsorbants', isActive: true, locked: true },
    { id: 'm-balance', code: 'BALANCE', label: 'Balance + observation terrain', isActive: true, locked: true },
    { id: 'm-questionnaire', code: 'QUESTIONNAIRE', label: 'Questionnaire structuré', isActive: true, locked: true },
    { id: 'm-gravim', code: 'GRAVIM', label: 'Gravimétrie — labo', isActive: true, locked: true },
  ],
  sources: [
    { id: 's-oms-water', code: 'OMS_WATER_2017', label: 'OMS — Directives qualité de l\'eau (2017)', isActive: true, locked: true },
    { id: 's-oms-air', code: 'OMS_AIR_2021', label: 'OMS — Lignes directrices qualité de l\'air (2021)', isActive: true, locked: true },
    { id: 's-oms-ehc', code: 'OMS_EHC', label: 'OMS — EHC métaux lourds (Pb, Zn, Cd, As)', isActive: true, locked: true },
    { id: 's-norme-ml', code: 'MN_03_02_002', label: 'Norme malienne MN-03-02/002:2006 — eaux usées', isActive: true, locked: true },
    { id: 's-loi-2021-032', code: 'LOI_2021_032', label: 'Loi n°2021-032 — Pollutions et nuisances', isActive: true, locked: true },
    { id: 's-loi-02-006', code: 'LOI_02_006', label: 'Loi n°02-006 — Code de l\'eau', isActive: true, locked: true },
    { id: 's-decret-01-394', code: 'DECRET_01_394', label: 'Décret n°01-394/P-RM — gestion eaux usées', isActive: true, locked: true },
    { id: 's-decret-96-178', code: 'DECRET_96_178', label: 'Décret n°96-178/P-RM — hygiène et sécurité au travail', isActive: true, locked: true },
    { id: 's-oit-148', code: 'OIT_148', label: 'Convention OIT n°148 — protection des travailleurs', isActive: true, locked: true },
    { id: 's-iarc', code: 'IARC_VOL_100', label: 'IARC Monographs vol. 100 — risques cancérogènes', isActive: true, locked: true },
    { id: 's-loi-2013-015', code: 'LOI_2013_015', label: 'Loi n°2013-015 — protection des données personnelles', isActive: true, locked: true },
    { id: 's-unep-waste', code: 'UNEP_WASTE_2005', label: 'UNEP — Solid Waste Management (2005)', isActive: true, locked: true },
  ],
  siteTypes: [
    { id: 'st-gala', code: 'GALA', label: 'GALA — teinture chimique', isActive: true, locked: true },
    { id: 'st-indigo', code: 'INDIGO', label: 'INDIGO — teinture naturelle Indigofera', isActive: true, locked: true },
    { id: 'st-mixed', code: 'GALA_INDIGO', label: 'GALA + INDIGO', isActive: true, locked: true },
    { id: 'st-natural', code: 'NATURELLE', label: 'Teinture naturelle', isActive: true, locked: true },
  ],
  legalStatus: [
    { id: 'ls-formal', code: 'formel', label: 'Formel', isActive: true, locked: true },
    { id: 'ls-informal', code: 'informel', label: 'Informel', isActive: true, locked: true },
  ],
  domains: [
    { id: 'd-water', code: 'water', label: 'Eaux usées', isActive: true, locked: true },
    { id: 'd-soil', code: 'soil', label: 'Sol', isActive: true, locked: true },
    { id: 'd-air', code: 'air', label: 'Qualité de l\'air', isActive: true, locked: true },
    { id: 'd-waste', code: 'waste', label: 'Déchets solides', isActive: true, locked: true },
    { id: 'd-health', code: 'health', label: 'Santé / SST', isActive: true, locked: true },
    { id: 'd-socio', code: 'socio', label: 'Socio-économique', isActive: true, locked: true },
  ],
  labCapabilities: [
    { id: 'lc-water', code: 'water_chem', label: 'Chimie des eaux', isActive: true, locked: true },
    { id: 'lc-soil', code: 'soil_chem', label: 'Chimie des sols', isActive: true, locked: true },
    { id: 'lc-metals', code: 'heavy_metals', label: 'Métaux lourds (AAS)', isActive: true, locked: true },
    { id: 'lc-voc', code: 'voc', label: 'COV — composés organiques volatils', isActive: true, locked: true },
  ],
};

const STORAGE_KEY = 'mali-coton.refdata.v1';

export function loadRefData(): Record<RefCategory, RefEntry[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_REF);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return structuredClone(DEFAULT_REF);
    /* Fusionne avec le socle pour ne pas perdre les nouvelles entrées par défaut. */
    const merged: Record<RefCategory, RefEntry[]> = structuredClone(DEFAULT_REF);
    for (const [k, v] of Object.entries(parsed) as Array<[RefCategory, RefEntry[]]>) {
      if (Array.isArray(v)) merged[k] = v;
    }
    return merged;
  } catch {
    return structuredClone(DEFAULT_REF);
  }
}

export function saveRefData(data: Record<RefCategory, RefEntry[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetRefData(): Record<RefCategory, RefEntry[]> {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_REF);
}

/** Helper : option list pour un Select. */
export function refOptions(
  category: RefCategory,
  data: Record<RefCategory, RefEntry[]> = loadRefData(),
): Array<{ value: string; label: string }> {
  return data[category]
    .filter((e) => e.isActive)
    .map((e) => ({ value: e.code, label: e.label }));
}
