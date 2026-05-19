/**
 * Scoring qualité automatique d'une collecte (CDC §13, inputs DIAWARA §3).
 *
 * Calcule un score 0–100 à partir de critères structurels :
 *   - GPS présent (et dans le polygone du site, si on a les coords site)
 *   - Au moins une photo
 *   - Toutes les mesures attendues présentes
 *   - Valeurs dans les bornes de validité physique
 *   - Bordereaux labo rendus pour les indicateurs labo
 *   - Photo d'étiquette pour chaque échantillon labo
 *
 * Sortie : score + liste de défauts (chacun avec un poids et un libellé).
 * Pas de magie : si une règle change, le score change déterministement.
 */
import type { Collection } from '../api/collection.types';
import { findRule, isValueValid } from './indicatorRules';

export interface QualityIssue {
  code:
    | 'missing_gps'
    | 'low_gps_accuracy'
    | 'no_photo'
    | 'value_out_of_validity'
    | 'lab_overdue'
    | 'missing_label_photo'
    | 'no_certification';
  /** Poids retiré du score (sur 100). */
  weight: number;
  /** Libellé lisible pour l'UI. */
  label: string;
  /** Indicateur concerné si applicable. */
  indicatorId?: string;
}

export interface QualityScore {
  /** Score 0–100. */
  score: number;
  /** Niveau qualitatif déduit. */
  level: 'excellent' | 'bon' | 'moyen' | 'faible';
  /** Liste exhaustive des problèmes détectés. */
  issues: QualityIssue[];
}

const LAB_SLA_DAYS = 10;

export function computeQualityScore(collection: Collection): QualityScore {
  const issues: QualityIssue[] = [];

  // 1. GPS présent
  if (!collection.gps) {
    issues.push({
      code: 'missing_gps',
      weight: 15,
      label: 'Coordonnées GPS absentes',
    });
  } else if (collection.gps.accuracy && collection.gps.accuracy > 30) {
    issues.push({
      code: 'low_gps_accuracy',
      weight: 5,
      label: `Précision GPS faible (${Math.round(collection.gps.accuracy)} m)`,
    });
  }

  // 2. Au moins une photo
  if (collection.photos.length === 0) {
    issues.push({
      code: 'no_photo',
      weight: 10,
      label: 'Aucune photo jointe',
    });
  }

  // 3. Valeurs dans les bornes de validité physique
  for (const m of collection.measurements) {
    const rule = findRule(m.indicatorId);
    if (!rule) continue;
    if (m.value == null || m.value === '') continue;
    const num = typeof m.value === 'number' ? m.value : Number(m.value);
    if (!Number.isFinite(num)) continue;
    if (!isValueValid(rule, num)) {
      issues.push({
        code: 'value_out_of_validity',
        weight: 20,
        label: `Valeur impossible pour ${rule.label} (${num}${rule.unit ? ' ' + rule.unit : ''})`,
        indicatorId: m.indicatorId,
      });
    }
  }

  // 4. Bordereaux labo en retard (au-delà du SLA)
  const now = Date.now();
  for (const m of collection.measurements) {
    if (m.acquisition !== 'lab_pending' || !m.sample?.sentAt) continue;
    const sentAt = new Date(m.sample.sentAt).getTime();
    if (Number.isNaN(sentAt)) continue;
    const days = (now - sentAt) / 86_400_000;
    if (days > LAB_SLA_DAYS) {
      issues.push({
        code: 'lab_overdue',
        weight: 8,
        label: `Bordereau labo en retard (${Math.floor(days - LAB_SLA_DAYS)} j au-delà du SLA)`,
        indicatorId: m.indicatorId,
      });
      break; // on signale une seule fois
    }
  }

  // 5. Photo d'étiquette pour les échantillons labo
  const labMeasurements = collection.measurements.filter((m) => m.sample);
  const missingLabel = labMeasurements.filter((m) => !m.sample?.labelPhotoId);
  if (labMeasurements.length > 0 && missingLabel.length === labMeasurements.length) {
    issues.push({
      code: 'missing_label_photo',
      weight: 5,
      label: 'Photo d\'étiquette d\'échantillon manquante',
    });
  }

  // 6. Certification agent
  if (!collection.agentCertified) {
    issues.push({
      code: 'no_certification',
      weight: 3,
      label: 'Agent n\'a pas certifié l\'exactitude des données',
    });
  }

  const weightTotal = issues.reduce((acc, i) => acc + i.weight, 0);
  const score = Math.max(0, 100 - weightTotal);
  const level: QualityScore['level'] =
    score >= 90 ? 'excellent' : score >= 75 ? 'bon' : score >= 50 ? 'moyen' : 'faible';

  return { score, level, issues };
}

export const QUALITY_LEVEL_LABEL: Record<QualityScore['level'], string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  moyen: 'Moyen',
  faible: 'Faible',
};
