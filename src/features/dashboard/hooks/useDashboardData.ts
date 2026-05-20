import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { ConformityLevel } from '@/types/common';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import {
  computeLocalConformity,
  findRule,
} from '@/features/collection/lib/indicatorRules';
import type {
  Collection,
  IndicatorDomain,
  Measurement,
} from '@/features/collection/api/collection.types';
import type { Site } from '@/features/sites/api/site.types';

/**
 * Agrégations dashboard à partir des fixtures (ou du backend en prod).
 *
 * - Évolution pH : timeseries par site sur N jours (bucket par jour)
 * - PM2.5 récent par site : dernière valeur disponible
 * - Heatmap conformité : worst level par site × domaine sur N jours
 */

const DOMAIN_LABEL: Record<IndicatorDomain, string> = {
  water: 'Eaux',
  soil: 'Sol',
  air: 'Air',
  waste: 'Déchets',
  health: 'Santé',
  socio: 'Socio',
};

const SEVERITY_RANK: Record<ConformityLevel, number> = {
  conforming: 0,
  warning: 1,
  critical: 2,
};

function asNumeric(value: Measurement['value']): number | null {
  if (value === null) return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

function withinDays(iso: string, days: number): boolean {
  const cutoff = Date.now() - days * 86_400_000;
  return new Date(iso).getTime() >= cutoff;
}

function buildPhTimeseries(
  collections: Collection[],
  sites: Site[],
  days: number,
): { labels: string[]; series: Array<{ label: string; values: Array<number | null> }> } {
  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    dayKeys.push(format(subDays(today, i), 'dd/MM'));
  }

  const series = sites.slice(0, 5).map((site) => {
    const buckets = new Map<string, number[]>();
    for (const collection of collections) {
      if (collection.siteId !== site.id) continue;
      if (!withinDays(collection.collectedAt, days)) continue;
      const ph = collection.measurements.find((m) => m.indicatorId === 'water.ph');
      const value = ph ? asNumeric(ph.value) : null;
      if (value === null) continue;
      const key = format(new Date(collection.collectedAt), 'dd/MM');
      const list = buckets.get(key) ?? [];
      list.push(value);
      buckets.set(key, list);
    }
    const values = dayKeys.map((k) => {
      const list = buckets.get(k);
      if (!list || list.length === 0) return null;
      return list.reduce((a, b) => a + b, 0) / list.length;
    });
    return { label: site.shortName, values };
  });

  return { labels: dayKeys, series };
}

function buildLatestPm25(
  collections: Collection[],
  sites: Site[],
): { labels: string[]; values: number[] } {
  const labels: string[] = [];
  const values: number[] = [];
  for (const site of sites) {
    const siteCollections = collections
      .filter((c) => c.siteId === site.id)
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
    let found: number | null = null;
    for (const c of siteCollections) {
      const m = c.measurements.find((x) => x.indicatorId === 'air.pm25');
      const v = m ? asNumeric(m.value) : null;
      if (v !== null) {
        found = v;
        break;
      }
    }
    if (found !== null) {
      labels.push(site.shortName);
      values.push(Number(found.toFixed(1)));
    }
  }
  return { labels, values };
}

function buildHeatmap(
  collections: Collection[],
  sites: Site[],
  days: number,
): {
  domains: IndicatorDomain[];
  cells: Record<
    string,
    Partial<Record<IndicatorDomain, { level: ConformityLevel | null; display: string; tooltip?: string }>>
  >;
} {
  const domains: IndicatorDomain[] = ['water', 'soil', 'air', 'waste', 'health', 'socio'];
  const cells: Record<
    string,
    Partial<Record<IndicatorDomain, { level: ConformityLevel | null; display: string; tooltip?: string }>>
  > = {};

  for (const site of sites) {
    cells[site.id] = {};
    for (const domain of domains) {
      const relevant: Array<{ level: ConformityLevel; value: number; label: string; source: string }> = [];
      for (const collection of collections) {
        if (collection.siteId !== site.id) continue;
        if (!withinDays(collection.collectedAt, days)) continue;
        for (const m of collection.measurements) {
          const rule = findRule(m.indicatorId);
          if (!rule || rule.domain !== domain) continue;
          const numeric = asNumeric(m.value);
          if (numeric === null) continue;
          const level = computeLocalConformity(rule, numeric);
          relevant.push({ level, value: numeric, label: rule.label, source: rule.source });
        }
      }
      if (relevant.length === 0) {
        cells[site.id]![domain] = { level: null, display: '—' };
        continue;
      }
      const worst = relevant.reduce((a, b) =>
        SEVERITY_RANK[a.level] >= SEVERITY_RANK[b.level] ? a : b,
      );
      const criticalCount = relevant.filter((r) => r.level === 'critical').length;
      const warningCount = relevant.filter((r) => r.level === 'warning').length;
      const conformingCount = relevant.filter((r) => r.level === 'conforming').length;
      const breakdownParts: string[] = [];
      if (criticalCount > 0) breakdownParts.push(`${criticalCount} critique${criticalCount > 1 ? 's' : ''}`);
      if (warningCount > 0) breakdownParts.push(`${warningCount} a surveiller`);
      if (conformingCount > 0) breakdownParts.push(`${conformingCount} conforme${conformingCount > 1 ? 's' : ''}`);
      cells[site.id]![domain] = {
        level: worst.level,
        display:
          domain === 'water' && relevant.find((r) => r.label === 'pH eaux usées')
            ? relevant.find((r) => r.label === 'pH eaux usées')!.value.toFixed(2)
            : worst.value.toFixed(1),
        tooltip: `${breakdownParts.join(' · ')} | pire : ${worst.label} ${worst.value.toFixed(2)} (${worst.source})`,
      };
    }
  }
  return { domains, cells };
}

function buildKpis(
  collections: Collection[],
  daysWindow: number,
): {
  totalCollections30d: number;
  conformityRate: number;
  criticalAlerts: number;
  pendingLab: number;
  activeAgents: number;
  lastSyncAt: string | null;
} {
  const recent = collections.filter((c) => withinDays(c.collectedAt, daysWindow));
  let conforming = 0;
  let total = 0;
  let critical = 0;
  let pendingLab = 0;
  const agents = new Set<string>();
  let lastSyncAt: string | null = null;

  for (const c of recent) {
    if (c.agentId) agents.add(c.agentId);
    if (c.syncedAt) {
      if (!lastSyncAt || new Date(c.syncedAt).getTime() > new Date(lastSyncAt).getTime()) {
        lastSyncAt = c.syncedAt;
      }
    }
    for (const m of c.measurements) {
      const rule = findRule(m.indicatorId);
      if (!rule) continue;
      if (m.acquisition === 'lab_pending') pendingLab += 1;
      const numeric = asNumeric(m.value);
      if (numeric === null) continue;
      const level = computeLocalConformity(rule, numeric);
      total += 1;
      if (level === 'conforming') conforming += 1;
      if (level === 'critical') critical += 1;
    }
  }

  if (!lastSyncAt && recent.length > 0) {
    /* Fallback : dernière collecte même non sync */
    lastSyncAt = recent.reduce(
      (a, b) => (new Date(b.collectedAt).getTime() > new Date(a).getTime() ? b.collectedAt : a),
      recent[0]!.collectedAt,
    );
  }

  return {
    totalCollections30d: recent.length,
    conformityRate: total === 0 ? 100 : Math.round((conforming / total) * 100),
    criticalAlerts: critical,
    pendingLab,
    activeAgents: agents.size,
    lastSyncAt,
  };
}

interface RecentCollection {
  id: string;
  siteId: string;
  siteName: string;
  agentId: string;
  collectedAt: string;
  status: Collection['status'];
  measurementsCount: number;
}

function buildRecentCollections(
  collections: Collection[],
  sites: Site[],
  limit = 8,
): RecentCollection[] {
  return [...collections]
    .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      siteId: c.siteId,
      siteName: sites.find((s) => s.id === c.siteId)?.shortName ?? c.siteId,
      agentId: c.agentId,
      collectedAt: c.collectedAt,
      status: c.status,
      measurementsCount: c.measurements.length,
    }));
}

export function useDashboardData(daysWindow: number = 30, siteId: string | null = null) {
  const { data: collectionsPage, isLoading: loadingCollections } = useCollections();
  const { data: sitesPage, isLoading: loadingSites } = useSites();

  const allCollections = collectionsPage?.items ?? [];
  const allSites = sitesPage?.items ?? [];

  /* Filtre site appliqué globalement (sauf KPI "sites suivis" qui reflète l'ensemble) */
  const collections = useMemo(
    () => (siteId ? allCollections.filter((c) => c.siteId === siteId) : allCollections),
    [allCollections, siteId],
  );
  const filteredSites = useMemo(
    () => (siteId ? allSites.filter((s) => s.id === siteId) : allSites),
    [allSites, siteId],
  );

  const phTimeseries = useMemo(
    () => buildPhTimeseries(collections, filteredSites, daysWindow),
    [collections, filteredSites, daysWindow],
  );

  const pm25 = useMemo(
    () => buildLatestPm25(collections, filteredSites),
    [collections, filteredSites],
  );

  const heatmap = useMemo(
    () => buildHeatmap(collections, filteredSites, daysWindow),
    [collections, filteredSites, daysWindow],
  );

  const kpis = useMemo(() => buildKpis(collections, daysWindow), [collections, daysWindow]);

  const recentCollections = useMemo(
    () => buildRecentCollections(collections, allSites, 8),
    [collections, allSites],
  );

  const heatmapSites = useMemo(
    () =>
      filteredSites.map((s) => ({
        id: s.id,
        shortName: s.shortName,
        meta: s.location.commune,
      })),
    [filteredSites],
  );

  return {
    isLoading: loadingCollections || loadingSites,
    sites: allSites,
    phTimeseries,
    pm25,
    heatmap: {
      ...heatmap,
      sites: heatmapSites,
      domainLabels: DOMAIN_LABEL,
    },
    kpis,
    recentCollections,
  };
}
