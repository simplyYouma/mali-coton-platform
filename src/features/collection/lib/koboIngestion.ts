/**
 * Schéma minimal d'une soumission Kobo `mali_coton_se_v2` (cf. CAHIER_PROJET §5).
 * Pas de Zod / Yup pour la maquette — juste des types + une validation manuelle
 * dont le verdict est documenté (chaque cas d'échec a son code d'erreur).
 */
import type { PointPrelevement } from '../api/collection.types';

export interface KoboSubmission {
  /** Identifiant logique stable de la collecte (clé d'idempotence). */
  id_collecte_sa: string;
  /** Identifiant du flacon physique. */
  id_echantillon?: string;
  /** Username Kobo de l'agent qui a soumis. */
  agent: string;
  /** Code officiel du site (SITE01, SITE02…). */
  site_code: string;
  /** Point de prélèvement (référentiel canonique). */
  point_prelev?: PointPrelevement;
  /** Date du prélèvement (ISO 8601). */
  date_prelevement: string;
  /** GPS du prélèvement. */
  gps_prelevement?: { lat: number; lng: number; accuracy?: number };
  /** Mesures par indicateur (clés = indicatorId, valeurs = numériques ou null). */
  mesures: Record<string, number | string | null>;
  /** Conformité globale déclarée par l'agent. */
  conformite_globale?: 'conforme' | 'non_conforme' | 'partiel' | 'non_evalue';
  /** Référence officielle du rapport labo (si applicable). */
  ref_rapport_labo?: string;
  /** Observations générales. */
  obs_generales?: string;
  /** Numéro de version Kobo (incrémente à chaque re-soumission). */
  _version?: number;
}

export interface IngestionResult {
  ok: boolean;
  /** Code d'erreur si rejet. */
  errorCode?:
    | 'missing_id_collecte_sa'
    | 'unknown_site_code'
    | 'unknown_agent'
    | 'invalid_date'
    | 'value_out_of_validity';
  /** Message lisible. */
  message?: string;
  /** ID de la collection créée ou mise à jour. */
  collectionId?: string;
  /** Version Kobo de la soumission ingérée. */
  koboVersion?: number;
  /** True si c'est une mise à jour d'une collection existante. */
  isUpdate?: boolean;
}

/**
 * Valide la structure minimale d'une soumission Kobo avant de l'accepter.
 * Renvoie un IngestionResult avec ok=false + un errorCode si invalide.
 */
export function validateKoboSubmission(
  payload: Partial<KoboSubmission>,
  knownSiteCodes: string[],
): IngestionResult {
  if (!payload.id_collecte_sa || payload.id_collecte_sa.length === 0) {
    return {
      ok: false,
      errorCode: 'missing_id_collecte_sa',
      message: 'id_collecte_sa requis (clé d\'idempotence de la collecte).',
    };
  }
  if (!payload.site_code) {
    return {
      ok: false,
      errorCode: 'unknown_site_code',
      message: 'site_code requis.',
    };
  }
  if (!knownSiteCodes.includes(payload.site_code)) {
    return {
      ok: false,
      errorCode: 'unknown_site_code',
      message: `Site inconnu : ${payload.site_code}. Connus : ${knownSiteCodes.join(', ')}.`,
    };
  }
  if (!payload.date_prelevement || Number.isNaN(new Date(payload.date_prelevement).getTime())) {
    return {
      ok: false,
      errorCode: 'invalid_date',
      message: 'date_prelevement invalide ou manquante.',
    };
  }
  return { ok: true };
}
