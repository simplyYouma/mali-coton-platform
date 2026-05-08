import type {
  Collection,
  IndicatorDomain,
  Measurement,
} from '@/features/collection/api/collection.types';
import type { AlertEntry } from '@/features/alerts/api/alerts.types';
import type { Site } from '@/features/sites/api/site.types';
import { computeLocalConformity, findRule } from '@/features/collection/lib/indicatorRules';
import type { ConformityLevel } from '@/types/common';

/**
 * Couche d'agrégation pure du module Reporting (CDC §5.3 Module 7).
 *
 * Toutes les fonctions ci-dessous prennent en entrée des données brutes
 * (collections, alertes, sites) déjà chargées via React Query — elles ne
 * font aucun appel réseau. Elles produisent des indicateurs déterministes
 * que la couche narrative consomme pour rédiger des phrases factuelles.
 *
 * Aucune valeur n'est inventée. Si une donnée manque, le KPI est à zéro
 * ou à null — jamais simulé.
 */

export type ReportPeriod = {
  /** Date de début incluse (ISO). */
  from: string;
  /** Date de fin incluse (ISO). */
  to: string;
  /** Libellé de période (ex. « Mars 2026 »). */
  label: string;
};

export interface ReportScope {
  /** Si défini, le rapport est mono-site. Sinon : multi-sites (tous). */
  siteId?: string;
}

export interface ValidationStats {
  total: number;
  validated: number;
  rejected: number;
  needsCorrection: number;
  pending: number;
  validationRate: number;
}

export interface DomainConformity {
  domain: IndicatorDomain;
  /** Nb de mesures du domaine sur la période. */
  total: number;
  conforming: number;
  warning: number;
  critical: number;
  /** Niveau dominant (la pire catégorie présente). */
  worst: ConformityLevel;
}

export interface TopExceedance {
  indicatorId: string;
  indicatorLabel: string;
  unit: string;
  value: number;
  threshold: { min?: number; max?: number };
  source: string;
  siteId: string;
  collectionId: string;
  collectedAt: string;
  level: 'warning' | 'critical';
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  acknowledged: number;
  critical: number;
  warning: number;
  /** Délai médian entre déclenchement et résolution (en heures). null si aucune résolue. */
  medianResolutionHours: number | null;
}

export interface LabStats {
  total: number;
  received: number;
  pending: number;
  /** Délai médian entre envoi et réception du bordereau (en jours). null si vide. */
  medianTurnaroundDays: number | null;
  /** Nombre de retards (>SLA contractuel — 10 jours par défaut). */
  overdue: number;
}

export interface SiteSilence {
  siteId: string;
  shortName: string;
  /** Nombre de jours sans collecte sur la période (vs aujourd'hui). */
  daysSilent: number;
  lastCollectionAt: string | null;
}

export interface ReportAggregate {
  period: ReportPeriod;
  scope: ReportScope;
  generatedAt: string;
  siteCount: number;
  validation: ValidationStats;
  domains: DomainConformity[];
  topExceedances: TopExceedance[];
  alerts: AlertStats;
  lab: LabStats;
  silences: SiteSilence[];
  /** Liste des collectes incluses (pour annexes XLSX). */
  collections: Collection[];
}

const DOMAINS: IndicatorDomain[] = ['water', 'soil', 'air', 'waste', 'health', 'socio'];
const LAB_SLA_DAYS = 10;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function inPeriod(iso: string, period: ReportPeriod): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(period.from).getTime() && t <= new Date(period.to).getTime();
}

/**
 * Calcule la conformité locale d'une mesure numérique selon les seuils
 * du référentiel CDC §4. Renvoie null si l'indicateur est inconnu ou la
 * valeur non numérique.
 */
function levelOf(m: Measurement): ConformityLevel | null {
  if (typeof m.value !== 'number') return null;
  const rule = findRule(m.indicatorId);
  if (!rule) return null;
  if (m.conformity) return m.conformity;
  return computeLocalConformity(rule, m.value);
}

function worstLevel(levels: ConformityLevel[]): ConformityLevel {
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('warning')) return 'warning';
  return 'conforming';
}

export function buildAggregate(
  rawCollections: Collection[],
  rawAlerts: AlertEntry[],
  sites: Site[],
  period: ReportPeriod,
  scope: ReportScope,
): ReportAggregate {
  // Filtrage périmètre : période + (optionnel) site unique
  const collections = rawCollections.filter((c) => {
    if (!inPeriod(c.collectedAt, period)) return false;
    if (scope.siteId && c.siteId !== scope.siteId) return false;
    return true;
  });

  const scopedSites = scope.siteId
    ? sites.filter((s) => s.id === scope.siteId)
    : sites;

  // — Validation —
  const total = collections.length;
  const validated = collections.filter((c) => c.status === 'validated').length;
  const rejected = collections.filter((c) => c.status === 'rejected').length;
  const needsCorrection = collections.filter((c) => c.status === 'needs_correction').length;
  const pending = total - validated - rejected - needsCorrection;
  const validation: ValidationStats = {
    total,
    validated,
    rejected,
    needsCorrection,
    pending,
    validationRate: total === 0 ? 0 : Math.round((validated / total) * 100),
  };

  // — Conformité par domaine —
  const domains: DomainConformity[] = DOMAINS.map((d) => {
    let totalM = 0;
    let conforming = 0;
    let warning = 0;
    let critical = 0;
    for (const c of collections) {
      for (const m of c.measurements) {
        const rule = findRule(m.indicatorId);
        if (!rule || rule.domain !== d) continue;
        const lvl = levelOf(m);
        if (!lvl) continue;
        totalM += 1;
        if (lvl === 'conforming') conforming += 1;
        else if (lvl === 'warning') warning += 1;
        else if (lvl === 'critical') critical += 1;
      }
    }
    const worst = worstLevel([
      ...(critical > 0 ? ['critical' as const] : []),
      ...(warning > 0 ? ['warning' as const] : []),
      ...(conforming > 0 ? ['conforming' as const] : []),
    ]);
    return { domain: d, total: totalM, conforming, warning, critical, worst };
  }).filter((d) => d.total > 0);

  // — Top dépassements —
  const exceedances: TopExceedance[] = [];
  for (const c of collections) {
    for (const m of c.measurements) {
      if (typeof m.value !== 'number') continue;
      const rule = findRule(m.indicatorId);
      if (!rule) continue;
      const lvl = levelOf(m);
      if (lvl !== 'warning' && lvl !== 'critical') continue;
      exceedances.push({
        indicatorId: m.indicatorId,
        indicatorLabel: rule.label,
        unit: rule.unit ?? '',
        value: m.value,
        threshold: { min: rule.minOk, max: rule.maxOk },
        source: rule.source ?? '—',
        siteId: c.siteId,
        collectionId: c.id,
        collectedAt: c.collectedAt,
        level: lvl,
      });
    }
  }
  // Trié : critical d'abord, puis dépassement relatif décroissant
  exceedances.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'critical' ? -1 : 1;
    const dA = a.threshold.max ? a.value / a.threshold.max : 0;
    const dB = b.threshold.max ? b.value / b.threshold.max : 0;
    return dB - dA;
  });
  const topExceedances = exceedances.slice(0, 10);

  // — Alertes —
  const scopedAlerts = rawAlerts.filter((a) => {
    if (!inPeriod(a.raisedAt, period)) return false;
    if (scope.siteId && a.siteId !== scope.siteId) return false;
    return true;
  });
  const resolved = scopedAlerts.filter((a) => a.status === 'resolved');
  const resolutionHours = resolved
    .filter((a) => a.resolvedAt)
    .map(
      (a) => (new Date(a.resolvedAt!).getTime() - new Date(a.raisedAt).getTime()) / 3_600_000,
    );
  const alerts: AlertStats = {
    total: scopedAlerts.length,
    active: scopedAlerts.filter((a) => a.status === 'active').length,
    resolved: resolved.length,
    acknowledged: scopedAlerts.filter((a) => a.status === 'acknowledged').length,
    critical: scopedAlerts.filter((a) => a.severity === 'critical').length,
    warning: scopedAlerts.filter((a) => a.severity === 'warning').length,
    medianResolutionHours: median(resolutionHours),
  };

  // — Bordereaux labo —
  const samples = collections.flatMap((c) =>
    c.measurements.filter((m) => m.sample).map((m) => ({ collection: c, m })),
  );
  const labReceived = samples.filter((s) => s.m.acquisition === 'lab_received').length;
  const labPending = samples.filter((s) => s.m.acquisition === 'lab_pending').length;
  const turnarounds: number[] = [];
  let overdue = 0;
  const now = Date.now();
  for (const s of samples) {
    const sample = s.m.sample!;
    if (s.m.acquisition === 'lab_received' && sample.receivedAt) {
      const days = (new Date(sample.receivedAt).getTime() - new Date(sample.sentAt).getTime()) / 86_400_000;
      turnarounds.push(days);
    } else if (s.m.acquisition === 'lab_pending') {
      const days = (now - new Date(sample.sentAt).getTime()) / 86_400_000;
      if (days > LAB_SLA_DAYS) overdue += 1;
    }
  }
  const lab: LabStats = {
    total: samples.length,
    received: labReceived,
    pending: labPending,
    medianTurnaroundDays: median(turnarounds),
    overdue,
  };

  // — Silences sites —
  const silenceThresholdDays = 14;
  const silences: SiteSilence[] = scopedSites
    .map((s): SiteSilence => {
      const last = collections
        .filter((c) => c.siteId === s.id)
        .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())[0];
      const lastIso = last?.collectedAt ?? s.lastCollectionAt;
      const days = lastIso
        ? Math.round((Date.now() - new Date(lastIso).getTime()) / 86_400_000)
        : Number.POSITIVE_INFINITY;
      return {
        siteId: s.id,
        shortName: s.shortName,
        daysSilent: Number.isFinite(days) ? days : 999,
        lastCollectionAt: lastIso ?? null,
      };
    })
    .filter((s) => s.daysSilent >= silenceThresholdDays)
    .sort((a, b) => b.daysSilent - a.daysSilent);

  return {
    period,
    scope,
    generatedAt: new Date().toISOString(),
    siteCount: scopedSites.length,
    validation,
    domains,
    topExceedances,
    alerts,
    lab,
    silences,
    collections,
  };
}
