import type { ConformityLevel } from '@/types/common';

export type AlertSeverity = 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type AlertCategory =
  | 'threshold_exceeded'
  | 'lab_overdue'
  | 'site_silence'
  | 'data_quality';

export interface AlertEntry {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  raisedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  /** Site impacté (FK Site.id). Optionnel pour les alertes plateforme. */
  siteId?: string;
  /** Indicateur impacté (FK indicatorId). Optionnel selon catégorie. */
  indicatorId?: string;
  /** Collecte source de l'alerte. Optionnel. */
  collectionId?: string;
  title: string;
  /** Description humaine concise affichée dans la liste. */
  summary: string;
  /** Valeur mesurée et seuil — affichés en monoespace pour lisibilité. */
  measured?: { value: number; unit: string };
  threshold?: { value: number; comparator: '>' | '<' | '>=' | '<='; unit: string };
  /** Source normative pour traçabilité. */
  thresholdSource?: string;
  /** Suggestion d'action proposée à l'utilisateur. */
  recommendedAction?: string;
  conformity?: ConformityLevel;
}

export interface AlertResolveInput {
  resolvedBy: string;
  notes?: string;
}

export interface AlertAcknowledgeInput {
  acknowledgedBy: string;
}

export type AlertFilter = {
  severity?: AlertSeverity;
  status?: AlertStatus;
  siteId?: string;
  category?: AlertCategory;
};
