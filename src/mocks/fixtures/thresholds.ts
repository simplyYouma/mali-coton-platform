import { INDICATOR_RULES } from '@/features/collection/lib/indicatorRules';
import type { ThresholdConfig } from '@/features/admin/api/admin.types';

/**
 * Fixtures des seuils configurables par l'admin — dérivées du référentiel
 * d'indicateurs CDC §4 (single source of truth).
 *
 * Le backend remplacera cette source par une table `thresholds` éditable.
 */

const REFERENCE_DATE = '2026-01-15T10:00:00.000Z';

export const mockThresholds: ThresholdConfig[] = INDICATOR_RULES.map((rule) => ({
  indicatorId: rule.id,
  indicatorLabel: rule.label,
  domain: rule.domain,
  unit: rule.unit,
  minOk: rule.minOk ?? null,
  maxOk: rule.maxOk ?? null,
  source: rule.source,
  updatedAt: REFERENCE_DATE,
  updatedBy: 'u-admin-1',
}));
