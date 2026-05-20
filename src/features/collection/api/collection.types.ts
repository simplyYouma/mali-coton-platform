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

/**
 * Cycle de vie complet d'un échantillon physique :
 * - prepared : flacon préparé et étiqueté côté agent (Kobo), pas encore parti.
 * - sent : remis au coursier / en transit vers le labo.
 * - received_at_lab : scanné/accusé à l'arrivée par le labo.
 * - in_analysis : technicien dessus.
 * - bordereau_returned : analyse rendue, en attente d'acceptation superviseur.
 * - accepted : superviseur a accepté la valeur (la mesure passe à lab_received).
 * - refused_by_lab : le labo a refusé (flacon cassé, volume insuffisant, etc.).
 * - rejected_by_supervisor : superviseur a renvoyé le bordereau pour ré-analyse.
 */
export type LabSampleStatus =
  | 'prepared'
  | 'sent'
  | 'received_at_lab'
  | 'in_analysis'
  | 'bordereau_returned'
  | 'accepted'
  | 'refused_by_lab'
  | 'rejected_by_supervisor';

export interface LabSample {
  /** Identifiant physique imprimé sur l'étiquette (QR / code-barres). */
  sampleId: string;
  /**
   * Identifiant logique du flacon physique. Plusieurs Measurement peuvent
   * partager le même containerId : ils sortent du même flacon prélevé sur le
   * terrain et sont analysés ensemble par le labo.
   */
  containerId: string;
  labId: string;
  status: LabSampleStatus;
  /** Date d'envoi (= remise au coursier). */
  sentAt: string;
  /** SLA contractuel — calculé à partir de sentAt + lab.slaBusinessDays. */
  expectedBy?: string;
  /** Réception physique au labo (accusé). */
  receivedAt?: string;
  /** Début d'analyse (technicien). */
  analysisStartedAt?: string;
  /** Date de rendu du bordereau. */
  analyzedAt?: string;
  /** ID du technicien qui a saisi le bordereau. */
  analyzedBy?: string;
  /** URL du bordereau PDF signé (stub en maquette). */
  bordereauUrl?: string;
  /** Référence interne du labo (ex. n° de rapport). */
  bordereauRef?: string;
  /** Photo de l'étiquette physique pour traçabilité. */
  labelPhotoId?: string;
  /** Motif de refus côté labo (volume insuffisant, joint cassé…). */
  refusalReason?: string;
  /** Motif de rejet du bordereau par le superviseur (ré-analyse demandée). */
  rejectionReason?: string;
  /** Superviseur qui a rejeté le bordereau. */
  rejectedBy?: string;
  /** Date du rejet superviseur. */
  rejectedAt?: string;
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
  /**
   * Validation superviseur de cette mesure (alignée backend
   * `ValidationSuperviseur` rattachée au ResultatAnalyse). Permet une
   * validation **par résultat** plutôt qu'en bloc sur toute la collecte.
   */
  validation?: ResultValidation;
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
 * Référentiel canonique des points de prélèvement physique (cf. questionnaire
 * Kobo Sahel Environnement, voir docs/CAHIER_PROJET.md §2.3).
 * Une visite (Collection) cible UN point de prélèvement précis du site.
 */
export type PointPrelevement =
  | 'effluent_sortie'
  | 'canal_drainage'
  | 'cours_eau_amont'
  | 'cours_eau_aval'
  | 'puits_temoin'
  | 'sol_direct'
  | 'sol_reference'
  | 'air_interieur'
  | 'air_exterieur';

export const POINT_PRELEVEMENT_LABEL: Record<PointPrelevement, string> = {
  effluent_sortie: 'Effluent en sortie d\'atelier',
  canal_drainage: 'Canal de drainage',
  cours_eau_amont: 'Cours d\'eau en amont',
  cours_eau_aval: 'Cours d\'eau en aval',
  puits_temoin: 'Puits témoin',
  sol_direct: 'Sol à l\'aplomb du rejet',
  sol_reference: 'Sol de référence',
  air_interieur: 'Air intérieur de l\'atelier',
  air_exterieur: 'Air extérieur (cour, périphérie)',
};

/** Milieu (eau / sol / air) déduit du point de prélèvement. */
export function milieuOf(point: PointPrelevement): 'eau' | 'sol' | 'air' {
  if (point.startsWith('sol_')) return 'sol';
  if (point.startsWith('air_')) return 'air';
  return 'eau';
}

/**
 * Un prélèvement physique effectué pendant une visite (CollecteTerrain).
 * Une même visite peut produire plusieurs prélèvements (effluent + cours d'eau
 * amont + sol direct…). Chaque prélèvement génère 0..N échantillons envoyés
 * en laboratoire.
 *
 * Aligné backend `Prelevement` (cf. CAHIER_PROJET §3.4).
 */
export interface Prelevement {
  id: string;
  /** Identifiant lisible imprimable sur étiquette (ex. PREL-SITE01-20260518-001). */
  codePrelevement: string;
  /** Eau / sol / air — déduit du pointPrelevement ou explicite. */
  typePrelevement: 'eau' | 'sol' | 'air';
  pointPrelevement: PointPrelevement;
  /** GPS précis du point physique (différent du GPS général de la visite). */
  gps?: GpsPoint;
  /** Date et heure du prélèvement (peut différer de collectedAt si plusieurs prélèvements). */
  datePrelevement: string;
  /** Nom de la personne qui a effectué le prélèvement — string libre, pas FK. */
  prelevePar: string;
  /** Mode de conditionnement (flaconnage, glace, etc.). */
  conditionnement?: string;
  /** Observations terrain spécifiques à ce prélèvement. */
  observations?: string;
  /** Échantillons (flacons) générés par ce prélèvement. */
  echantillons?: Echantillon[];
}

/**
 * Statut d'un échantillon physique côté backend
 * (champ `Echantillon.statut` API Platform). Aligné sur notre LabSampleStatus
 * existant, on garde la même sémantique pour la migration B2 → B3.
 */
export type EchantillonStatut = LabSampleStatus;

/**
 * Échantillon = un flacon physique envoyé au laboratoire.
 * Aligné backend `Echantillon` (cf. CAHIER_PROJET §3.4).
 * Entité top-level lors du branchement live ; en maquette c'est attaché à
 * Prelevement.echantillons[] et reflète aussi les sample partagés sur Measurement.
 */
export interface Echantillon {
  id: string;
  /** Identifiant physique (ECH-SITEXX-YYYYMMDD-NNN). Aligné `codeEchantillon`. */
  codeEchantillon: string;
  /** Type d'échantillon (eau brute, eau filtrée, sol, etc.). */
  typeEchantillon?: string;
  statut: EchantillonStatut;
  /** Labo destinataire. */
  laboratoireId?: string;
  dateEnvoiLaboratoire?: string;
  dateReceptionLaboratoire?: string;
  observations?: string;
  /** Demandes d'analyse rattachées à cet échantillon (typiquement 1 par labo). */
  analyses?: AnalyseLaboratoire[];
}

/**
 * Statut d'une demande d'analyse côté labo.
 */
export type AnalyseLaboStatut =
  | 'demandee'
  | 'en_cours'
  | 'rendue'
  | 'rejetee_sup'
  | 'acceptee';

/**
 * Une demande d'analyse rendue par un labo pour un échantillon.
 * Aligné backend `AnalyseLaboratoire`. Contient les résultats par paramètre.
 */
export interface AnalyseLaboratoire {
  id: string;
  /** Numéro de rapport du labo (réf. officielle, ex. LNE-2026-0421). */
  numeroRapport?: string;
  laboratoireId: string;
  dateAnalyse?: string;
  /** URL ou data-URL du PDF du bordereau. */
  fichierRapport?: string;
  statut: AnalyseLaboStatut;
  observations?: string;
  /** Résultats individuels par paramètre. */
  resultats?: ResultatAnalyse[];
}

/**
 * Un résultat d'analyse pour un paramètre donné.
 * Aligné backend `ResultatAnalyse`. En maquette, doublé par `Measurement` qui
 * reste la source d'affichage principale pour rétrocompat.
 */
export interface ResultatAnalyse {
  id: string;
  indicatorId: string;
  /** Valeur en string pour gérer les "<0.01" — aligné backend. */
  valeur: string;
  /** Unité au moment de la mesure (snapshot). */
  unite?: string;
  /** Seuil de référence au moment de l'analyse (snapshot historique). */
  seuilNorme?: string;
  conforme?: boolean;
  commentaire?: string;
  /** Validation par le superviseur (par résultat, pas par collecte). */
  validation?: ResultValidation;
}

/**
 * Validation superviseur d'un résultat individuel.
 * Aligné backend `ValidationSuperviseur`.
 */
export interface ResultValidation {
  statut: 'en_attente' | 'valide' | 'rejete' | 'correction_demandee';
  decision?: string;
  commentaire?: string;
  validePar?: string;
  dateValidation?: string;
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
  kind:
    | 'correction_requested'
    | 'rejected'
    | 'validated'
    | 'sample_sent_to_lab'
    | 'sample_refused_by_lab'
    | 'bordereau_returned'
    | 'bordereau_rejected_by_supervisor';
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
  /**
   * @deprecated Utiliser `prelevements[].pointPrelevement` à la place. Conservé
   * pour rétrocompat pendant la migration Phase B.
   */
  pointPrelevement?: PointPrelevement;
  /**
   * Prélèvements physiques effectués pendant cette visite. Aligné backend
   * `CollecteTerrain.prelevements`. Si vide, c'est une visite sans
   * prélèvement (observation seule).
   */
  prelevements?: Prelevement[];
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
  awaiting_lab: 'Analyses lab en cours',
  lab_complete: 'Analyses reçues',
  /** @deprecated retiré du workflow : la correction se fait inline par le sup. */
  needs_correction: 'À corriger',
  validated: 'Validée',
  rejected: 'Annulée',
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

export const LAB_SAMPLE_STATUS_LABEL: Record<LabSampleStatus, string> = {
  prepared: 'Préparé',
  sent: 'Envoyé',
  received_at_lab: 'Reçu au labo',
  in_analysis: 'En analyse',
  bordereau_returned: 'Bordereau rendu',
  accepted: 'Accepté',
  refused_by_lab: 'Refusé par le labo',
  rejected_by_supervisor: 'Renvoyé pour ré-analyse',
};

export const LAB_SAMPLE_STATUS_VARIANT: Record<
  LabSampleStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  prepared: 'neutral',
  sent: 'info',
  received_at_lab: 'info',
  in_analysis: 'info',
  bordereau_returned: 'warning',
  accepted: 'success',
  refused_by_lab: 'danger',
  rejected_by_supervisor: 'warning',
};
