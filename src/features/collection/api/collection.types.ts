import type { ConformityLevel, GpsPoint } from '@/types/common';

/**
 * Statuts d'une collecte sur la plateforme — workflow post-ingestion Kobo.
 * (Les états « draft » / « pending_sync » sont gérés par Kobo côté terrain
 * et n'apparaissent jamais sur la plateforme.)
 *
 * submitted         : reçue depuis Kobo, sans prélèvement labo
 * awaiting_lab      : reçue, ≥1 prélèvement labo en attente de bordereau
 * lab_complete      : tous bordereaux reçus, en attente validation superviseur
 * needs_correction  : superviseur a demandé une correction (l'agent re-saisit via Kobo)
 * validated         : validée par le superviseur (transmission définitive)
 * rejected          : rejetée par le superviseur (motif obligatoire)
 */
export type CollectionStatus =
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

/**
 * Une révision = un état antérieur de la collecte (avant ré-soumission Kobo).
 * Chaque ré-soumission Kobo conserve le `koboSubmissionUuid` d'origine mais
 * incrémente la version — c'est ainsi qu'on relie sans ambiguïté la
 * collecte renvoyée pour correction et sa version corrigée.
 */
export interface CollectionRevision {
  version: number;
  submittedAt: string;
  /** Empreinte de l'état (mesures + photos) au moment de la révision. */
  measurementsCount: number;
  photosCount: number;
  /** Cause de la révision : correction demandée par le superviseur. */
  reason?: 'correction_requested' | 'rejected_resubmit';
  /** Auteur de la demande qui a déclenché cette révision. */
  triggeredBy?: string;
}

/**
 * Notification mock — trace ce que le système a envoyé à l'agent
 * (la plateforme n'expose rien à l'agent ; tout transite par e-mail / SMS).
 */
export interface CollectionNotification {
  id: string;
  channel: 'email' | 'sms';
  /** Adresse e-mail ou numéro de téléphone destinataire (snapshot). */
  recipient: string;
  /** Identité de l'agent destinataire au moment de l'envoi. */
  recipientUserId: string;
  /** Catégorie déterministe — le contenu est généré côté UI. */
  kind: 'correction_requested' | 'rejected' | 'validated';
  sentAt: string;
  /** Référence libre (numéro de ticket SMS, message-id e-mail). */
  ref?: string;
}

export interface Collection {
  id: string;
  /**
   * UUID stable côté Kobo Toolbox (champ `_uuid` de la soumission).
   * Reste IDENTIQUE entre la première soumission et toutes les ré-soumissions
   * suivantes après correction — c'est ce qui prouve que c'est la même collecte.
   */
  koboSubmissionUuid: string;
  /**
   * Version Kobo de la soumission (1, 2, 3…). Incrémentée à chaque
   * ré-soumission. Permet de tracer combien de fois l'agent a corrigé.
   */
  koboVersion: number;
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
  /** Historique des versions Kobo précédentes (n'inclut pas la version actuelle). */
  revisions?: CollectionRevision[];
  /** Journal mock des notifications envoyées à l'agent (e-mail / SMS). */
  notifications?: CollectionNotification[];
  /** Marqué true par l'agent en étape 6, vaut "Je certifie l'exactitude des données". */
  agentCertified?: boolean;
}

export const STATUS_LABEL: Record<CollectionStatus, string> = {
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
