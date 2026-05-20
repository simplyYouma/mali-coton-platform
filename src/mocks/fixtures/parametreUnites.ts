/**
 * Référentiel `ParametreUnite` — unités utilisées par les indicateurs.
 * Source : cahier §3.4 + tableau §9.1.
 */

export interface MockParametreUnite {
  id: string;
  libelle: string;
  sigle: string;
}

export const mockParametreUnites: MockParametreUnite[] = [
  { id: 'u-mgl', libelle: 'Milligramme par litre', sigle: 'mg/L' },
  { id: 'u-mgkg', libelle: 'Milligramme par kilogramme', sigle: 'mg/kg' },
  { id: 'u-ugm3', libelle: 'Microgramme par mètre cube', sigle: 'µg/m³' },
  { id: 'u-mgm3', libelle: 'Milligramme par mètre cube', sigle: 'mg/m³' },
  { id: 'u-uscm', libelle: 'Microsiemens par centimètre', sigle: 'µS/cm' },
  { id: 'u-ntu', libelle: 'Nephelometric Turbidity Unit', sigle: 'NTU' },
  { id: 'u-celsius', libelle: 'Degré Celsius', sigle: '°C' },
  { id: 'u-ppm', libelle: 'Partie par million', sigle: 'ppm' },
  { id: 'u-ptco', libelle: 'Platine-Cobalt', sigle: 'Pt-Co' },
  { id: 'u-pct', libelle: 'Pourcent', sigle: '%' },
  { id: 'u-mgo2l', libelle: 'Milligramme O₂ par litre', sigle: 'mg O₂/L' },
];
