import type { Indicator } from '@/features/collection/api/collection.types';

/**
 * Sous-ensemble représentatif des indicateurs du CDC §4 — utilisé pour démo maquette.
 * Le référentiel complet (40+) sera finalisé en intégration backend.
 */
export const mockIndicators: Indicator[] = [
  // Eaux usées — physiques
  { id: 'ind-temp', domain: 'water', label: 'Température', unit: '°C', method: 'Thermomètre électronique portable', source: 'OMS / Norme MN-03-02/002:2006', minOk: 5, maxOk: 35 },
  { id: 'ind-ph', domain: 'water', label: 'pH eaux usées', unit: '', method: 'pH-mètre portable', source: 'OMS ; Norme MN-03-02/002:2006', minOk: 6.5, maxOk: 8.5 },
  { id: 'ind-cond', domain: 'water', label: 'Conductivité', unit: 'µS/cm', method: 'Conductimètre portable', source: 'Norme malienne' },
  { id: 'ind-mes', domain: 'water', label: 'Matières en suspension (MES)', unit: 'mg/L', method: 'Gravimétrie en laboratoire', source: 'OMS 2012' },
  { id: 'ind-turb', domain: 'water', label: 'Turbidité', unit: 'NTU', method: 'Turbidimètre portable + labo', source: 'Norme malienne' },
  { id: 'ind-sulfates', domain: 'water', label: 'Sulfates effluents', unit: 'mg/L', method: 'Spectrophotométrie laboratoire', source: 'Norme malienne', maxOk: 1000 },

  // Sol
  { id: 'ind-ph-sol', domain: 'soil', label: 'pH du sol', unit: '', method: 'pH-mètre portable (ZD-07-4 IN 1)', source: 'Directives UE 86/278', minOk: 5.5, maxOk: 8 },
  { id: 'ind-ce-sol', domain: 'soil', label: 'Conductivité électrique du sol', unit: 'µS/cm', method: 'Conductimètre', source: 'Directives UE 86/278' },

  // Air
  { id: 'ind-pm25', domain: 'air', label: 'PM2,5 (particules fines)', unit: 'µg/m³', method: 'Capteur Temtop M2000C', source: 'OMS Air Quality', maxOk: 25 },
  { id: 'ind-pm10', domain: 'air', label: 'PM10 (particules grossières)', unit: 'µg/m³', method: 'Capteur Temtop M2000C', source: 'OMS Air Quality', maxOk: 50 },
  { id: 'ind-co2', domain: 'air', label: 'CO2', unit: 'ppm', method: 'Capteur électronique intégré', source: 'OMS', maxOk: 1000 },

  // Déchets
  { id: 'ind-waste-qty', domain: 'waste', label: 'Quantité de déchets produits', unit: 'kg/semaine', method: 'Balance', source: 'UNEP Solid Waste Mgmt 2005' },
  { id: 'ind-waste-collect', domain: 'waste', label: 'Quantité collectée et évacuée conformément', unit: 'kg/semaine', method: 'Balance', source: 'Décret n°01-394/P-RM' },

  // Santé / SST
  { id: 'ind-epi', domain: 'health', label: 'Utilisation des EPI (gants, masques, lunettes, bottes)', unit: '%', method: 'Observation directe + questionnaire', source: 'Conv. OIT 148 ; Décret n°96-178/P-RM', minOk: 80 },
  { id: 'ind-derma', domain: 'health', label: 'Affections dermatologiques constatées', unit: '%', method: 'Questionnaire + observation', source: 'OMS ; IARC vol. 100', maxOk: 10 },
  { id: 'ind-ocular', domain: 'health', label: 'Troubles oculaires (rougeurs, brûlures)', unit: '%', method: 'Questionnaire + observation', source: 'OMS', maxOk: 10 },

  // Socio-éco
  { id: 'ind-employees', domain: 'socio', label: 'Nombre d\'employés permanents', unit: '', method: 'Questionnaire', source: 'Loi n°99-041' },
  { id: 'ind-cov-soc', domain: 'socio', label: 'Couverture sociale des employés', unit: '%', method: 'Questionnaire', source: 'Loi n°99-041' },
];

export const INDICATORS_BY_DOMAIN = mockIndicators.reduce<
  Record<string, Indicator[]>
>((acc, ind) => {
  if (!acc[ind.domain]) acc[ind.domain] = [];
  acc[ind.domain]!.push(ind);
  return acc;
}, {});
