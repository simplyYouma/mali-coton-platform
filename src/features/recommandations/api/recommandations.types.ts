/**
 * Recommandation — action à entreprendre pour corriger une non-conformité ou
 * améliorer une situation observée. Aligné backend `Recommandation`
 * (API Platform, cf. CAHIER_PROJET §3.4).
 *
 * Une recommandation peut être rattachée à :
 *   - un site (recommandation transversale au site),
 *   - une collecte (recommandation issue d'une visite),
 *   - un résultat d'analyse (recommandation ciblée sur un paramètre).
 */
export type RecommandationPriorite = 'basse' | 'moyenne' | 'haute' | 'critique';
export type RecommandationStatut =
  | 'proposee'
  | 'en_cours'
  | 'suivie'
  | 'resolue'
  | 'annulee';

/**
 * Notification mock envoyée au responsable d'une recommandation. Aligne le
 * pattern utilisé sur les collectes (e-mail + SMS, traçabilité dans la fiche).
 */
export interface RecommandationNotification {
  id: string;
  channel: 'email' | 'sms';
  recipient: string;
  recipientName: string;
  kind: 'created' | 'status_changed' | 'reminder';
  /** Statut snapshot au moment de l'envoi (pour kind=status_changed). */
  statutSnapshot?: RecommandationStatut;
  sentAt: string;
  ref?: string;
}

export interface Recommandation {
  id: string;
  titre: string;
  description: string;
  niveauPriorite: RecommandationPriorite;
  statut: RecommandationStatut;
  /** Cible de la recommandation (au moins une référence). */
  siteId?: string;
  collectionId?: string;
  /** indicatorId du résultat ciblé, si applicable. */
  resultatIndicatorId?: string;
  /** Responsable du suivi (nom libre — pas FK User côté backend). */
  responsableSuivi?: string;
  dateEcheance?: string;
  createdAt: string;
  updatedAt?: string;
  /** Auteur de la recommandation. */
  createdBy?: string;
  /** Journal des notifications mock envoyées au responsable. */
  notifications?: RecommandationNotification[];
}

export interface RecommandationCreateInput {
  titre: string;
  description: string;
  niveauPriorite: RecommandationPriorite;
  siteId?: string;
  collectionId?: string;
  resultatIndicatorId?: string;
  responsableSuivi?: string;
  dateEcheance?: string;
  createdBy: string;
}

export interface RecommandationUpdateInput {
  titre?: string;
  description?: string;
  niveauPriorite?: RecommandationPriorite;
  statut?: RecommandationStatut;
  responsableSuivi?: string;
  dateEcheance?: string;
}

export const PRIORITE_LABEL: Record<RecommandationPriorite, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

export const STATUT_LABEL: Record<RecommandationStatut, string> = {
  proposee: 'Proposée',
  en_cours: 'En cours',
  suivie: 'Suivie',
  resolue: 'Résolue',
  annulee: 'Annulée',
};

export const PRIORITE_VARIANT: Record<
  RecommandationPriorite,
  'neutral' | 'info' | 'warning' | 'danger'
> = {
  basse: 'neutral',
  moyenne: 'info',
  haute: 'warning',
  critique: 'danger',
};

export const STATUT_VARIANT: Record<
  RecommandationStatut,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  proposee: 'info',
  en_cours: 'warning',
  suivie: 'warning',
  resolue: 'success',
  annulee: 'neutral',
};
