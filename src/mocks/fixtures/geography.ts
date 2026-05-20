/**
 * Hiérarchie administrative Mali — Region → Cercle → Commune.
 * Alignée sur le cahier §3.4 (champs : id, nom, code, IRIs parents/enfants).
 *
 * Couverture : Région de Bamako (district capital + Ségou) — 2 régions, 2
 * cercles, 6 communes pilotes. Les sites pilotes pointent vers ces communes.
 */

export interface MockRegion {
  id: string;
  nom: string;
  code: string;
}

export interface MockCercle {
  id: string;
  nom: string;
  code: string;
  regionId: string;
}

export interface MockCommune {
  id: string;
  nom: string;
  code: string;
  cercleId: string;
}

export const mockRegions: MockRegion[] = [
  { id: 'reg-bamako', nom: 'District de Bamako', code: 'BKO' },
  { id: 'reg-segou', nom: 'Région de Ségou', code: 'SGU' },
];

export const mockCercles: MockCercle[] = [
  { id: 'cer-bamako', nom: 'Cercle de Bamako', code: 'CER-BKO', regionId: 'reg-bamako' },
  { id: 'cer-segou', nom: 'Cercle de Ségou', code: 'CER-SGU', regionId: 'reg-segou' },
];

export const mockCommunes: MockCommune[] = [
  { id: 'com-bamako-1', nom: 'Commune I', code: 'BKO-C1', cercleId: 'cer-bamako' },
  { id: 'com-bamako-3', nom: 'Commune III', code: 'BKO-C3', cercleId: 'cer-bamako' },
  { id: 'com-bamako-4', nom: 'Commune IV', code: 'BKO-C4', cercleId: 'cer-bamako' },
  { id: 'com-bamako-5', nom: 'Commune V', code: 'BKO-C5', cercleId: 'cer-bamako' },
  { id: 'com-bamako-6', nom: 'Commune VI', code: 'BKO-C6', cercleId: 'cer-bamako' },
  { id: 'com-segou', nom: 'Ségou', code: 'SGU-C1', cercleId: 'cer-segou' },
];
