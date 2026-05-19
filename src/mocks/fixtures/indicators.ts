import type { Indicator } from '@/features/collection/api/collection.types';

/**
 * Catalogue complet des indicateurs (paramètres d'analyse) alignés sur le
 * questionnaire Sahel Environnement + TDR.
 *
 * 7 sections :
 *   A. Eaux usées in-situ (T°, pH, conductivité, turbidité, TDS)
 *   B. Eaux usées labo (MES, coloration, DBO5, DCO, NH4, NO2, NO3, P, sulfates)
 *   C. Métaux lourds dans les eaux (12 éléments)
 *   D. Sol in-situ (pH, conductivité)
 *   E. Métaux lourds dans le sol (7 éléments en mg/kg)
 *   F. Air in-situ (PM10, PM2.5, CO, NO, NO2, CO2, SO2)
 *   G. Air labo (COV par PID)
 *   + Déchets, Santé/SST, Socio-économique
 */
export const mockIndicators: Indicator[] = [
  // ── A. Eaux usées in-situ ───────────────────────────────────────
  { id: 'water.temperature', domain: 'water', label: 'Température eaux', unit: '°C', method: 'Thermomètre portable', source: 'OMS / MN-03-02/002:2006', minOk: 15, maxOk: 35 },
  { id: 'water.ph', domain: 'water', label: 'pH eaux usées', unit: '', method: 'pH-mètre portable', source: 'OMS / MN-03-02/002:2006', minOk: 6.5, maxOk: 8.5 },
  { id: 'water.conductivity', domain: 'water', label: 'Conductivité', unit: 'µS/cm', method: 'Conductimètre portable', source: 'Norme malienne' },
  { id: 'water.turbidity', domain: 'water', label: 'Turbidité', unit: 'NTU', method: 'Turbidimètre portable', source: 'Norme malienne' },
  { id: 'water.tds', domain: 'water', label: 'Solides dissous totaux (TDS)', unit: 'mg/L', method: 'Capteur portable', source: 'OMS 2017' },

  // ── B. Eaux usées labo ──────────────────────────────────────────
  { id: 'water.mes', domain: 'water', label: 'Matières en suspension (MES)', unit: 'mg/L', method: 'Gravimétrie', source: 'OMS 2012', labOnly: true },
  { id: 'water.color', domain: 'water', label: 'Coloration', unit: 'Pt-Co', method: 'Spectrophotométrie', source: 'Norme malienne', labOnly: true },
  { id: 'water.dbo5', domain: 'water', label: 'DBO5', unit: 'mg O₂/L', method: 'Méthode dilution / incubation 5 jours', source: 'OMS / Norme malienne', labOnly: true },
  { id: 'water.dco', domain: 'water', label: 'DCO', unit: 'mg O₂/L', method: 'Dichromate (oxydation acide)', source: 'OMS / Norme malienne', labOnly: true },
  { id: 'water.nh4', domain: 'water', label: 'Ammonium (NH₄⁺)', unit: 'mg/L', method: 'Spectrophotométrie', source: 'OMS 2017', labOnly: true },
  { id: 'water.no2', domain: 'water', label: 'Nitrites (NO₂⁻)', unit: 'mg/L', method: 'Spectrophotométrie', source: 'OMS 2017', labOnly: true, maxOk: 3 },
  { id: 'water.no3', domain: 'water', label: 'Nitrates (NO₃⁻)', unit: 'mg/L', method: 'Spectrophotométrie', source: 'OMS 2017', labOnly: true, maxOk: 50 },
  { id: 'water.phosphorus', domain: 'water', label: 'Phosphore total (Pt)', unit: 'mg/L', method: 'Spectrophotométrie', source: 'OMS 2017', labOnly: true },
  { id: 'water.sulfates', domain: 'water', label: 'Sulfates', unit: 'mg/L', method: 'Spectrophotométrie', source: 'OMS 2017', labOnly: true, maxOk: 250 },

  // ── C. Métaux lourds dans les eaux (labo, AAS) ──────────────────
  { id: 'water.metals.fe', domain: 'water', label: 'Fer (Fe)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS / Norme malienne', labOnly: true },
  { id: 'water.metals.cr3', domain: 'water', label: 'Chrome trivalent (Cr³⁺)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS EHC', labOnly: true },
  { id: 'water.metals.cr6', domain: 'water', label: 'Chrome hexavalent (Cr⁶⁺)', unit: 'mg/L', method: 'Spectrophotométrie diphénylcarbazide', source: 'OMS EHC — critique en teinture', labOnly: true, maxOk: 0.05 },
  { id: 'water.metals.cu', domain: 'water', label: 'Cuivre (Cu)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS 2017', labOnly: true },
  { id: 'water.metals.zn', domain: 'water', label: 'Zinc (Zn)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS 2017', labOnly: true },
  { id: 'water.metals.pb', domain: 'water', label: 'Plomb (Pb)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'EHC 165 (OMS, 1995)', labOnly: true, maxOk: 0.01 },
  { id: 'water.metals.ni', domain: 'water', label: 'Nickel (Ni)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS EHC', labOnly: true },
  { id: 'water.metals.co', domain: 'water', label: 'Cobalt (Co)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS EHC', labOnly: true },
  { id: 'water.metals.mn', domain: 'water', label: 'Manganèse (Mn)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS 2017', labOnly: true },
  { id: 'water.metals.na', domain: 'water', label: 'Sodium (Na)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS 2017', labOnly: true },
  { id: 'water.metals.k', domain: 'water', label: 'Potassium (K)', unit: 'mg/L', method: 'Spectrométrie absorption atomique', source: 'OMS 2017', labOnly: true },
  { id: 'water.metals.cd', domain: 'water', label: 'Cadmium (Cd)', unit: 'µg/L', method: 'Spectrométrie absorption atomique', source: 'EHC 223 (OMS, 2000)', labOnly: true, maxOk: 3 },

  // ── D. Sol in-situ ──────────────────────────────────────────────
  { id: 'soil.ph', domain: 'soil', label: 'pH du sol', unit: '', method: 'pH-mètre sol portable', source: 'Directives UE 86/278', minOk: 5.5, maxOk: 8.5 },
  { id: 'soil.conductivity', domain: 'soil', label: 'Conductivité électrique sol', unit: 'µS/cm', method: 'Conductimètre sol portable', source: 'Directives UE 86/278' },

  // ── E. Métaux lourds dans le sol ────────────────────────────────
  { id: 'soil.metals.fe', domain: 'soil', label: 'Fer dans le sol (Fe)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'EHC OMS', labOnly: true },
  { id: 'soil.metals.cr3', domain: 'soil', label: 'Chrome trivalent sol (Cr³⁺)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'OMS EHC', labOnly: true },
  { id: 'soil.metals.cr6', domain: 'soil', label: 'Chrome hexavalent sol (Cr⁶⁺)', unit: 'mg/kg', method: 'Spectrophotométrie diphénylcarbazide', source: 'OMS EHC', labOnly: true },
  { id: 'soil.metals.cu', domain: 'soil', label: 'Cuivre sol (Cu)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'Directives UE 86/278', labOnly: true },
  { id: 'soil.metals.zn', domain: 'soil', label: 'Zinc sol (Zn)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'Directives UE 86/278', labOnly: true },
  { id: 'soil.metals.pb', domain: 'soil', label: 'Plomb sol (Pb)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'Directives UE 86/278', labOnly: true },
  { id: 'soil.metals.cd', domain: 'soil', label: 'Cadmium sol (Cd)', unit: 'mg/kg', method: 'Spectrométrie absorption atomique', source: 'Directives UE 86/278', labOnly: true },

  // ── F. Air in-situ ──────────────────────────────────────────────
  { id: 'air.pm10', domain: 'air', label: 'PM10', unit: 'µg/m³', method: 'Capteur gravimétrique portable', source: 'OMS — directives qualité air', maxOk: 50 },
  { id: 'air.pm25', domain: 'air', label: 'PM2,5', unit: 'µg/m³', method: 'Capteur gravimétrique portable', source: 'OMS — directives qualité air', maxOk: 25 },
  { id: 'air.co', domain: 'air', label: 'Monoxyde de carbone (CO)', unit: 'ppm', method: 'Capteur électrochimique portable', source: 'OMS air ambiant', maxOk: 9 },
  { id: 'air.no', domain: 'air', label: 'Monoxyde d\'azote (NO)', unit: 'ppm', method: 'Capteur électrochimique portable', source: 'OMS air ambiant' },
  { id: 'air.no2', domain: 'air', label: 'Dioxyde d\'azote (NO₂)', unit: 'µg/m³', method: 'Capteur électrochimique portable', source: 'OMS air ambiant', maxOk: 40 },
  { id: 'air.co2', domain: 'air', label: 'CO₂', unit: 'ppm', method: 'Capteur NDIR portable', source: 'Seuils OMS', maxOk: 1000 },
  { id: 'air.so2', domain: 'air', label: 'Dioxyde de soufre (SO₂)', unit: 'µg/m³', method: 'Capteur électrochimique portable', source: 'OMS air ambiant', maxOk: 40 },

  // ── G. Air labo ─────────────────────────────────────────────────
  { id: 'air.voc', domain: 'air', label: 'Composés organiques volatils (COV)', unit: 'µg/m³', method: 'PID (photoionisation détection)', source: 'OMS air intérieur', labOnly: true },

  // ── Déchets ─────────────────────────────────────────────────────
  { id: 'waste.quantity', domain: 'waste', label: 'Quantité de déchets produits', unit: 'kg/semaine', method: 'Balance', source: 'UNEP Solid Waste Mgmt 2005' },
  { id: 'waste.collected', domain: 'waste', label: 'Quantité collectée et évacuée conformément', unit: 'kg/semaine', method: 'Balance', source: 'Décret n°01-394/P-RM' },

  // ── Santé / SST ────────────────────────────────────────────────
  { id: 'health.epi', domain: 'health', label: 'Taux d\'utilisation des EPI', unit: '%', method: 'Observation directe + questionnaire', source: 'Conv. OIT 148 ; Décret n°96-178/P-RM', minOk: 80 },
  { id: 'health.derma', domain: 'health', label: 'Affections dermatologiques constatées', unit: '%', method: 'Questionnaire + observation', source: 'OMS ; IARC vol. 100', maxOk: 10 },
  { id: 'health.ocular', domain: 'health', label: 'Troubles oculaires (rougeurs, brûlures)', unit: '%', method: 'Questionnaire + observation', source: 'OMS', maxOk: 10 },

  // ── Socio-économique ──────────────────────────────────────────
  { id: 'socio.employees', domain: 'socio', label: 'Nombre d\'employés permanents', unit: '', method: 'Questionnaire', source: 'Loi n°99-041' },
  { id: 'socio.coverage', domain: 'socio', label: 'Couverture sociale des employés', unit: '%', method: 'Questionnaire', source: 'Loi n°99-041' },
];

export const INDICATORS_BY_DOMAIN = mockIndicators.reduce<
  Record<string, Indicator[]>
>((acc, ind) => {
  if (!acc[ind.domain]) acc[ind.domain] = [];
  acc[ind.domain]!.push(ind);
  return acc;
}, {});
