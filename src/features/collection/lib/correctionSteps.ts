/**
 * Domaines qu'un superviseur peut cibler dans une demande de correction.
 * L'agent re-saisit la collecte dans Kobo et resoumet.
 */
export interface CorrectionStepOption {
  id: string;
  label: string;
  hint: string;
}

export const CORRECTION_STEP_OPTIONS: CorrectionStepOption[] = [
  { id: 'context', label: 'Contexte', hint: 'Site, météo, observations' },
  { id: 'water', label: 'Eaux usées', hint: 'pH, sulfates, DCO, métaux' },
  { id: 'soilair', label: 'Sol & air', hint: 'Conductivité, PM, CO₂' },
  { id: 'wastehealth', label: 'Déchets & santé', hint: 'Volumes, EPI, incidents' },
  { id: 'socio', label: 'Socio-éco', hint: 'Effectifs, couverture sociale' },
  { id: 'review', label: 'GPS & photos', hint: 'Géolocalisation, album' },
];

export function correctionStepLabel(id: string): string {
  return CORRECTION_STEP_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
