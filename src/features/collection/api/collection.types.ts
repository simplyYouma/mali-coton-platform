import type { ConformityLevel, GpsPoint } from '@/types/common';

/**
 * Statuts d'une collecte — alignés sur l'approche hybride CDC §7.2 + §5.2.3.
 *
 * draft             : édition locale en cours, non soumise
 * pending_sync      : prête à être envoyée, en attente de connectivité
 * submitted         : reçue côté serveur, sans prélèvement labo
 * awaiting_lab      : reçue côté serveur, ≥1 prélèvement labo en attente de bordereau
 * lab_complete      : tous bordereaux reçus, en attente validation superviseur
 * needs_correction  : superviseur a demandé une correction ciblée à l'agent (cf. CDC §5.2.3 « Corriger »)
 * validated         : validée par le superviseur (transmission définitive)
 * rejected          : rejetée par le superviseur (motif obligatoire)
 */
export type CollectionStatus =
  | 'draft'
  | 'pending_sync'
  | 'submitted'
  | 'awaiting_lab'
  | 'lab_complete'
  | 'needs_correction'
  | 'validated'
  | 'rejected';

export type IndicatorDomain = 'water' | 'soil' | 'air' | 'waste' | 'health' | 'socio';

/**
 * Mode d'acquisition d'une mesure — distingue les valeurs immédiates
 * des prélèvements destinés au labo agréé (résultats différés).
 */
export type AcquisitionMode = 'in_situ' | 'lab_pending' | 'lab_received';

export interface Indicator {
  id: string;
  domain: IndicatorDomain;
  label: string;
  unit: string;
  method: string;
  source: string;
  /** Si vrai, l'indicateur exige un prélèvement labo (jamais saisi sur tablette). */
  labOnly?: boolean;
  minOk?: number;
  maxOk?: number;
  /** Désactivé par l'admin — masqué dans le wizard de collecte. */
  isActive?: boolean;
  /** Ajouté manuellement par un admin (vs référentiel CDC §4). */
  isCustom?: boolean;
}

export interface LabSample {
  sampleId: string;
  labId: string;
  sentAt: string;
  expectedBy?: string;
  receivedAt?: string;
  bordereauUrl?: string;
  /** Photo de l'étiquette physique pour traçabilité. */
  labelPhotoId?: string;
}

export interface Measurement {
  indicatorId: string;
  acquisition: AcquisitionMode;
  value: number | string | null;
  unit?: string;
  conformity?: ConformityLevel;
  thresholdSource?: string;
  sample?: LabSample;
  notes?: string;
}

export interface PhotoAttachment {
  id: string;
  url: string;
  takenAt: string;
  note?: string;
}

export interface ConditionalContext {
  hasNearbyWatercourse: boolean;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'windy';
  ambientTempC?: number;
  observations?: string;
}

export interface Collection {
  id: string;
  siteId: string;
  agentId: string;
  collectedAt: string;
  status: CollectionStatus;
  syncedAt: string | null;
  gps: GpsPoint | null;
  context?: ConditionalContext;
  measurements: Measurement[];
  photos: PhotoAttachment[];
  notes?: string;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
  rejectionReason?: string;
  /** Demande de correction (statut needs_correction) — détail des points à revoir par l'agent. */
  correctionRequest?: {
    requestedBy: string;
    requestedAt: string;
    /** Étape(s) du wizard à corriger (réfs. step.id du wizard). */
    targetSteps?: string[];
    /** Commentaire libre du superviseur — ce qui doit être corrigé concrètement. */
    notes: string;
  };
  /** Marqué true par l'agent en étape 6, vaut "Je certifie l'exactitude des données". */
  agentCertified?: boolean;
}

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  draft: 'Brouillon',
  pending_sync: 'En attente de synchro',
  submitted: 'Soumise',
  awaiting_lab: 'Bordereau labo attendu',
  lab_complete: 'Bordereaux reçus',
  needs_correction: 'À corriger',
  validated: 'Validée',
  rejected: 'Rejetée',
};

export const STATUS_VARIANT: Record<
  CollectionStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  draft: 'neutral',
  pending_sync: 'warning',
  submitted: 'info',
  awaiting_lab: 'warning',
  lab_complete: 'info',
  needs_correction: 'warning',
  validated: 'success',
  rejected: 'danger',
};

/**
 * Indique si une collecte attend encore au moins un bordereau labo.
 * Utilisé pour basculer le statut `submitted` → `awaiting_lab` ou
 * `awaiting_lab` → `lab_complete`.
 */
export function hasPendingLabSamples(collection: Collection): boolean {
  return collection.measurements.some((m) => m.acquisition === 'lab_pending');
}
