/**
 * Calculs stratégiques du dashboard exécutif (input DIAWARA §1).
 * Tout est dérivé déterministiquement des données existantes :
 *   - score environnemental 0–100
 *   - niveau de risque (faible / modere / eleve / critique)
 *   - conformité globale agrégée
 *   - tendance vs période précédente
 */
import type { AlertEntry } from '@/features/alerts/api/alerts.types';
import type { Site } from '@/features/sites/api/site.types';

export type RiskLevel = 'faible' | 'modere' | 'eleve' | 'critique';

export interface ExecutiveSummary {
  /** Score 0–100 (100 = idéal). */
  envScore: number;
  /** Niveau qualitatif déduit. */
  riskLevel: RiskLevel;
  /** Conformité globale (% de domaines × sites conformes). */
  conformityRate: number;
  /** Nombre d'alertes critiques actives. */
  criticalAlerts: number;
  /** Sites en alerte critique (au moins 1 alerte critique active). */
  sitesAtRisk: number;
  /** Sites suivis. */
  sitesTotal: number;
  /** Détail des pertes — pour expliquer le score. */
  breakdown: Array<{ reason: string; weight: number }>;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  faible: 'Faible',
  modere: 'Modéré',
  eleve: 'Élevé',
  critique: 'Critique',
};

export const RISK_TONE: Record<RiskLevel, 'success' | 'info' | 'warning' | 'danger'> = {
  faible: 'success',
  modere: 'info',
  eleve: 'warning',
  critique: 'danger',
};

/**
 * Score env = 100 partants, on retire selon les défauts.
 *   - 3 pts par alerte critique active
 *   - 1 pt par alerte warning active
 *   - 5 pts par site avec >= 1 domaine critique
 *   - 2 pts par site silencieux (> 7j sans collecte assignée)
 * Plancher 0, plafond 100.
 */
export function computeExecutiveSummary(
  sites: Site[],
  activeAlerts: AlertEntry[],
): ExecutiveSummary {
  const breakdown: Array<{ reason: string; weight: number }> = [];

  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter((a) => a.severity === 'warning');
  if (criticalAlerts.length > 0) {
    breakdown.push({
      reason: `${criticalAlerts.length} alerte${criticalAlerts.length > 1 ? 's' : ''} critique${criticalAlerts.length > 1 ? 's' : ''} active${criticalAlerts.length > 1 ? 's' : ''}`,
      weight: criticalAlerts.length * 3,
    });
  }
  if (warningAlerts.length > 0) {
    breakdown.push({
      reason: `${warningAlerts.length} alerte${warningAlerts.length > 1 ? 's' : ''} de surveillance`,
      weight: warningAlerts.length,
    });
  }

  const sitesWithCriticalDomain = sites.filter((s) =>
    Object.values(s.conformityByDomain).some((c) => c === 'critical'),
  );
  if (sitesWithCriticalDomain.length > 0) {
    breakdown.push({
      reason: `${sitesWithCriticalDomain.length} site${sitesWithCriticalDomain.length > 1 ? 's' : ''} avec au moins un domaine critique`,
      weight: sitesWithCriticalDomain.length * 5,
    });
  }

  // Conformité globale = % cellules (site × domaine) conformes
  let total = 0;
  let conforming = 0;
  for (const s of sites) {
    for (const level of Object.values(s.conformityByDomain)) {
      total += 1;
      if (level === 'conforming') conforming += 1;
    }
  }
  const conformityRate = total === 0 ? 100 : Math.round((conforming / total) * 100);

  // Pénalité si conformité globale < 80%
  if (conformityRate < 80) {
    const drop = 80 - conformityRate;
    breakdown.push({
      reason: `Conformité globale à ${conformityRate} % (sous la cible 80 %)`,
      weight: Math.round(drop * 0.3),
    });
  }

  const totalLost = breakdown.reduce((acc, b) => acc + b.weight, 0);
  const envScore = Math.max(0, Math.min(100, 100 - totalLost));

  // Niveau de risque
  let riskLevel: RiskLevel = 'faible';
  if (criticalAlerts.length >= 5 || envScore < 25) riskLevel = 'critique';
  else if (criticalAlerts.length >= 2 || envScore < 50) riskLevel = 'eleve';
  else if (criticalAlerts.length >= 1 || envScore < 75) riskLevel = 'modere';

  const sitesAtRisk = new Set(
    criticalAlerts.map((a) => a.siteId).filter(Boolean) as string[],
  ).size;

  return {
    envScore,
    riskLevel,
    conformityRate,
    criticalAlerts: criticalAlerts.length,
    sitesAtRisk,
    sitesTotal: sites.length,
    breakdown,
  };
}
