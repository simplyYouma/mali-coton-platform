import { useMemo, useState } from 'react';
import { BarChart3, BoxIcon, LineChart as LineChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Select, Skeleton, Tabs } from '@/components/common';
import { LineChart } from '@/components/common/charts';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import {
  INDICATOR_RULES,
  computeLocalConformity,
  findRule,
} from '@/features/collection/lib/indicatorRules';
import type { IndicatorDomain } from '@/features/collection/api/collection.types';
import { format, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './AnalyticsPage.module.css';

const PERIODS = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '180', label: '6 mois' },
];

/** Indicateurs disponibles à l'analyse : ceux qui ont à la fois une règle
 * normative ET des mesures dans les collectes. */
const FEATURED_INDICATORS = [
  'water.ph',
  'water.sulfates',
  'air.pm25',
  'soil.ph',
  'waste.quantity',
  'health.epi_usage',
  'socio.workforce_present',
];

type DomainFilter = 'all' | IndicatorDomain;
const DOMAIN_CHIPS: Array<{ value: DomainFilter; label: string }> = [
  { value: 'all', label: 'Tous domaines' },
  { value: 'water', label: 'Eaux' },
  { value: 'air', label: 'Air' },
  { value: 'soil', label: 'Sol' },
  { value: 'waste', label: 'Déchets' },
  { value: 'health', label: 'Santé' },
  { value: 'socio', label: 'Socio' },
];

export function AnalyticsPage() {
  const [period, setPeriod] = useState('90');
  const days = Number(period);

  const [indicatorId, setIndicatorId] = useState<string>('water.ph');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [tab, setTab] = useState<'trend' | 'distribution' | 'comparison'>('trend');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');

  const { data: sitesPage } = useSites();
  const { data: collectionsPage, isLoading } = useCollections({});

  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);
  const collections = useMemo(() => collectionsPage?.items ?? [], [collectionsPage]);

  const isAllSelected = siteFilter === 'all';
  const isSiteVisible = (id: string) => isAllSelected || siteFilter === id;

  const indicatorOptions = useMemo(
    () =>
      INDICATOR_RULES.filter(
        (r) =>
          FEATURED_INDICATORS.includes(r.id) &&
          (domainFilter === 'all' || r.domain === domainFilter),
      ).map((r) => ({
        value: r.id,
        label: r.unit ? `${r.label} (${r.unit})` : r.label,
      })),
    [domainFilter],
  );

  /* Si l'indicateur sélectionné n'est plus dans le domaine choisi, on bascule
   * sur le premier indicateur disponible. */
  if (
    indicatorOptions.length > 0 &&
    !indicatorOptions.some((o) => o.value === indicatorId)
  ) {
    queueMicrotask(() => setIndicatorId(indicatorOptions[0]!.value));
  }

  const rule = useMemo(
    () => INDICATOR_RULES.find((r) => r.id === indicatorId),
    [indicatorId],
  );

  const fmtUnit = rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1;
  const fmt = (v: number) => v.toFixed(fmtUnit);

  /* ── Tendance — timeseries par site ── */
  const trend = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const labelsSet = new Set<string>();
    const buckets = new Map<string, Map<string, number[]>>();

    for (const c of collections) {
      const t = new Date(c.collectedAt).getTime();
      if (t < cutoff) continue;
      const m = c.measurements.find(
        (x) => x.indicatorId === indicatorId && typeof x.value === 'number',
      );
      if (!m) continue;
      const dayLabel = format(new Date(c.collectedAt), 'dd MMM', { locale: fr });
      labelsSet.add(dayLabel);
      if (!buckets.has(c.siteId)) buckets.set(c.siteId, new Map());
      const siteMap = buckets.get(c.siteId)!;
      if (!siteMap.has(dayLabel)) siteMap.set(dayLabel, []);
      siteMap.get(dayLabel)!.push(Number(m.value));
    }

    const labels = Array.from(labelsSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const series = Array.from(buckets.entries())
      .filter(([siteId]) => isSiteVisible(siteId))
      .slice(0, 5)
      .map(([siteId, siteMap], idx) => {
        const site = sites.find((s) => s.id === siteId);
        return {
          label: site?.shortName ?? siteId,
          color: `var(--chart-${(idx % 6) + 1})`,
          values: labels.map((l) => {
            const arr = siteMap.get(l);
            if (!arr || arr.length === 0) return null;
            return arr.reduce((sum, v) => sum + v, 0) / arr.length;
          }),
        };
      });

    return { labels, series };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, indicatorId, days, sites, siteFilter]);

  /* ── Comparator — moyenne / amplitude par site ── */
  const comparator = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const map = new Map<string, Array<{ value: number; ts: number }>>();
    for (const c of collections) {
      const ts = new Date(c.collectedAt).getTime();
      if (ts < cutoff) continue;
      const m = c.measurements.find(
        (x) => x.indicatorId === indicatorId && typeof x.value === 'number',
      );
      if (!m) continue;
      if (!map.has(c.siteId)) map.set(c.siteId, []);
      map.get(c.siteId)!.push({ value: Number(m.value), ts });
    }
    const items = Array.from(map.entries())
      .map(([siteId, points]) => {
        const site = sites.find((s) => s.id === siteId);
        const sortedByTs = [...points].sort((a, b) => a.ts - b.ts);
        const values = sortedByTs.map((p) => p.value);
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return {
          siteId,
          name: site?.shortName ?? siteId,
          avg,
          min,
          max,
          n: values.length,
          series: sortedByTs.map((p) => p.value),
        };
      })
      .sort((a, b) => b.avg - a.avg);
    const globalMax = Math.max(...items.map((i) => i.max), 1);
    const globalMin = Math.min(...items.map((i) => i.min), 0);
    return { items, globalMax, globalMin };
  }, [collections, indicatorId, days, sites]);

  /* ── Indice composite ── */
  const composite = useMemo(() => {
    let envScore = 0;
    let socScore = 0;
    let envCount = 0;
    let socCount = 0;
    const cutoff = subDays(new Date(), days).getTime();
    for (const c of collections) {
      if (new Date(c.collectedAt).getTime() < cutoff) continue;
      for (const m of c.measurements) {
        const r = findRule(m.indicatorId);
        if (!r) continue;
        const numeric = typeof m.value === 'number' ? m.value : Number(m.value);
        if (!Number.isFinite(numeric)) continue;
        const level = computeLocalConformity(r, numeric);
        const score = level === 'conforming' ? 100 : level === 'warning' ? 60 : 20;
        if (r.domain === 'socio' || r.domain === 'health') {
          socScore += score;
          socCount += 1;
        } else {
          envScore += score;
          envCount += 1;
        }
      }
    }
    const env = envCount > 0 ? Math.round(envScore / envCount) : 0;
    const soc = socCount > 0 ? Math.round(socScore / socCount) : 0;
    const overall = Math.round(env * 0.6 + soc * 0.4);
    return { env, soc, overall };
  }, [collections, days]);

  /* ── Quick stats sur l'indicateur sélectionné ── */
  const indicatorStats = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const values: number[] = [];
    for (const c of collections) {
      if (new Date(c.collectedAt).getTime() < cutoff) continue;
      if (!isAllSelected && siteFilter !== c.siteId) continue;
      const m = c.measurements.find(
        (x) => x.indicatorId === indicatorId && typeof x.value === 'number',
      );
      if (m) values.push(Number(m.value));
    }
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, exceedRate: 0, values: [] };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const exceeds = values.filter((v) => {
      if (!rule) return false;
      if (rule.minOk !== undefined && v < rule.minOk) return true;
      if (rule.maxOk !== undefined && v > rule.maxOk) return true;
      return false;
    }).length;
    return {
      count: values.length,
      avg,
      min,
      max,
      exceedRate: Math.round((exceeds / values.length) * 100),
      values,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, indicatorId, days, siteFilter, rule]);

  /* ── Évolution de la conformité (% conformes par semaine) ── */
  const conformityEvolution = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    // bucket par début de semaine ISO (lundi)
    type Bucket = { conforming: number; total: number; ts: number };
    const buckets = new Map<string, Bucket>();
    for (const c of collections) {
      const t = new Date(c.collectedAt).getTime();
      if (t < cutoff) continue;
      const weekStart = startOfWeek(new Date(c.collectedAt), { weekStartsOn: 1, locale: fr });
      const key = format(weekStart, 'yyyy-MM-dd');
      const b = buckets.get(key) ?? { conforming: 0, total: 0, ts: weekStart.getTime() };
      for (const m of c.measurements) {
        const r = findRule(m.indicatorId);
        if (!r) continue;
        const num = typeof m.value === 'number' ? m.value : Number(m.value);
        if (!Number.isFinite(num)) continue;
        b.total += 1;
        if (computeLocalConformity(r, num) === 'conforming') b.conforming += 1;
      }
      buckets.set(key, b);
    }
    const sorted = Array.from(buckets.entries())
      .map(([, b]) => b)
      .sort((a, b) => a.ts - b.ts);
    const labels = sorted.map((b) => format(new Date(b.ts), "'S'ww", { locale: fr }));
    const values = sorted.map((b) => (b.total > 0 ? Math.round((b.conforming / b.total) * 100) : null));
    return { labels, values };
  }, [collections, days]);

  /* ── Distribution histogram (10 bins) ── */
  const distribution = useMemo(() => {
    const { values } = indicatorStats;
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return null;
    const BINS = 10;
    const range = max - min;
    const bins = Array.from({ length: BINS }, () => 0);
    for (const v of values) {
      let idx = Math.floor(((v - min) / range) * BINS);
      if (idx >= BINS) idx = BINS - 1;
      bins[idx]! += 1;
    }
    const maxBin = Math.max(...bins);
    return { min, max, bins, maxBin, total: values.length };
  }, [indicatorStats]);

  /* ── Quartiles par site (Q1, médiane, Q3, min, max) ── */
  const quartilesBySite = useMemo(() => {
    const cutoff = subDays(new Date(), days).getTime();
    const map = new Map<string, number[]>();
    for (const c of collections) {
      const ts = new Date(c.collectedAt).getTime();
      if (ts < cutoff) continue;
      const m = c.measurements.find(
        (x) => x.indicatorId === indicatorId && typeof x.value === 'number',
      );
      if (!m) continue;
      if (!map.has(c.siteId)) map.set(c.siteId, []);
      map.get(c.siteId)!.push(Number(m.value));
    }
    const q = (arr: number[], p: number) => {
      const idx = (arr.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return arr[lo]!;
      return arr[lo]! + (arr[hi]! - arr[lo]!) * (idx - lo);
    };
    const rows = Array.from(map.entries())
      .filter(([, arr]) => arr.length >= 2)
      .map(([siteId, arrRaw]) => {
        const arr = [...arrRaw].sort((a, b) => a - b);
        return {
          siteId,
          name: sites.find((s) => s.id === siteId)?.shortName ?? siteId,
          n: arr.length,
          min: arr[0]!,
          q1: q(arr, 0.25),
          median: q(arr, 0.5),
          q3: q(arr, 0.75),
          max: arr[arr.length - 1]!,
        };
      })
      .sort((a, b) => b.median - a.median);
    const all = rows.flatMap((r) => [r.min, r.max]);
    const globalMin = all.length ? Math.min(...all) : 0;
    const globalMax = all.length ? Math.max(...all) : 1;
    return { rows, globalMin, globalMax };
  }, [collections, indicatorId, days, sites]);

  /* ── Top dépassements : 5 mesures les plus éloignées du seuil ── */
  const topOutliers = useMemo(() => {
    if (!rule) return [];
    const cutoff = subDays(new Date(), days).getTime();
    type Outlier = {
      siteId: string;
      siteName: string;
      value: number;
      excessPct: number;
      collectedAt: string;
    };
    const rows: Outlier[] = [];
    for (const c of collections) {
      if (new Date(c.collectedAt).getTime() < cutoff) continue;
      if (!isAllSelected && siteFilter !== c.siteId) continue;
      const m = c.measurements.find(
        (x) => x.indicatorId === indicatorId && typeof x.value === 'number',
      );
      if (!m) continue;
      const v = Number(m.value);
      let excessPct = 0;
      if (rule.maxOk !== undefined && v > rule.maxOk) {
        excessPct = ((v - rule.maxOk) / rule.maxOk) * 100;
      } else if (rule.minOk !== undefined && v < rule.minOk) {
        excessPct = ((rule.minOk - v) / rule.minOk) * 100;
      } else {
        continue;
      }
      const site = sites.find((s) => s.id === c.siteId);
      rows.push({
        siteId: c.siteId,
        siteName: site?.shortName ?? c.siteId,
        value: v,
        excessPct,
        collectedAt: c.collectedAt,
      });
    }
    return rows.sort((a, b) => b.excessPct - a.excessPct).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, indicatorId, days, rule, sites, siteFilter]);

  const isWithinThreshold = (v: number): boolean => {
    if (!rule) return true;
    if (rule.minOk !== undefined && v < rule.minOk) return false;
    if (rule.maxOk !== undefined && v > rule.maxOk) return false;
    return true;
  };

  const exceededFraction = (v: number): 'ok' | 'warn' | 'crit' => {
    if (isWithinThreshold(v)) return 'ok';
    if (!rule) return 'warn';
    if (rule.maxOk !== undefined && v > rule.maxOk * 1.5) return 'crit';
    if (rule.minOk !== undefined && v < rule.minOk * 0.7) return 'crit';
    return 'warn';
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Tendances inter-sites</span>
          <h1 className={styles.heroTitle}>Analytics</h1>
          <p className={styles.heroDescription}>
            Drilldown indicateur par indicateur, par site et par période.
          </p>
        </div>
        <div className={styles.heroControls}>
          <Tabs
            value={period}
            onChange={setPeriod}
            items={PERIODS}
            variant="pill"
            aria-label="Période"
          />
          <Select<DomainFilter>
            value={domainFilter}
            onChange={setDomainFilter}
            options={DOMAIN_CHIPS.map((d) => ({ value: d.value, label: d.label }))}
            aria-label="Filtrer par domaine"
          />
          <Select<string>
            value={indicatorId}
            onChange={setIndicatorId}
            options={indicatorOptions}
            aria-label="Indicateur à explorer"
          />
          <Select<string>
            value={siteFilter}
            onChange={setSiteFilter}
            options={[
              { value: 'all', label: 'Tous les sites' },
              ...sites.map((s) => ({ value: s.id, label: s.shortName })),
            ]}
            aria-label="Filtrer par site"
          />
        </div>
      </header>

      <section className={styles.statsStrip} aria-label="Statistiques de l'indicateur sélectionné">
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Mesures</span>
          <span className={styles.statValue}>{indicatorStats.count}</span>
          <span className={styles.statHint}>sur la période</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Moyenne</span>
          <span className={styles.statValue}>
            {indicatorStats.count === 0 ? '—' : fmt(indicatorStats.avg)}
            {rule?.unit ? <span className={styles.statUnit}>{rule.unit}</span> : null}
          </span>
          <span className={styles.statHint}>tous sites sélectionnés</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Min — Max</span>
          <span className={styles.statValue}>
            {indicatorStats.count === 0
              ? '—'
              : `${fmt(indicatorStats.min)} – ${fmt(indicatorStats.max)}`}
          </span>
          <span className={styles.statHint}>amplitude observée</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Hors seuil</span>
          <span
            className={styles.statValue}
            data-tone={
              indicatorStats.exceedRate > 30
                ? 'crit'
                : indicatorStats.exceedRate > 0
                  ? 'warn'
                  : 'ok'
            }
          >
            {indicatorStats.count === 0 ? '—' : `${indicatorStats.exceedRate}%`}
          </span>
          <span className={styles.statHint}>{rule?.source ?? '—'}</span>
        </div>
      </section>

      <div className={styles.analyticsTabs}>
        <Tabs<'trend' | 'distribution' | 'comparison'>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'trend', label: 'Tendance & composite' },
            { value: 'distribution', label: 'Distribution & dépassements' },
            { value: 'comparison', label: 'Comparaison multi-sites' },
          ]}
          variant="underline"
          aria-label="Vue d'analyse"
        />
      </div>

      {tab === 'trend' ? (
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="trend-heading">
          <header className={styles.panelHeader}>
            <span className={styles.panelHeaderIcon} aria-hidden="true">
              <TrendingUp size={18} />
            </span>
            <div className={styles.panelTitleGroup}>
              <h2 id="trend-heading" className={styles.panelTitle}>
                Tendance — {rule?.label}
              </h2>
              <span className={styles.panelCaption}>
                par site · {days} derniers jours · {rule?.source}
              </span>
            </div>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={280} />
            ) : trend.labels.length === 0 ? (
              <p className={styles.empty}>
                Pas assez de données pour cet indicateur sur la période.
              </p>
            ) : (
              <LineChart
                labels={trend.labels}
                series={trend.series}
                height={280}
                threshold={
                  rule?.maxOk !== undefined
                    ? { value: rule.maxOk, label: `Seuil ${rule.unit}` }
                    : undefined
                }
                fillArea
              />
            )}
          </div>
        </section>

        <section className={styles.compositeCard} aria-labelledby="composite-heading">
          <header className={styles.compositeHead}>
            <span className={styles.compositeLabel}>Indice composite</span>
            <h2 id="composite-heading" className={styles.compositeTitle}>
              Environnement &amp; social
            </h2>
          </header>

          <CompositeRings overall={composite.overall} env={composite.env} soc={composite.soc} />

          <div className={styles.compositeRows}>
            <div className={styles.compositeRow}>
              <span className={styles.compositeRowDot} data-tone="env" aria-hidden="true" />
              <span className={styles.compositeRowLabel}>Environnement</span>
              <span className={styles.compositeRowWeight}>60 %</span>
              <span className={styles.compositeRowValue}>{composite.env}</span>
            </div>
            <div className={styles.compositeRow}>
              <span className={styles.compositeRowDot} data-tone="soc" aria-hidden="true" />
              <span className={styles.compositeRowLabel}>Social / SST</span>
              <span className={styles.compositeRowWeight}>40 %</span>
              <span className={styles.compositeRowValue}>{composite.soc}</span>
            </div>
          </div>

          <p className={styles.compositeFootnote}>
            ≥ 80 conforme · 60-79 à surveiller · &lt; 60 critique
          </p>
        </section>
      </div>
      ) : null}

      {tab === 'trend' ? (
      <section className={styles.panel} aria-labelledby="evolution-heading">
        <header className={styles.panelHeader}>
          <span className={styles.panelHeaderIcon} aria-hidden="true">
            <LineChartIcon size={18} />
          </span>
          <div className={styles.panelTitleGroup}>
            <h2 id="evolution-heading" className={styles.panelTitle}>
              Évolution de la conformité
            </h2>
            <span className={styles.panelCaption}>
              % de mesures conformes par semaine · tous indicateurs confondus
            </span>
          </div>
        </header>
        <div className={styles.panelBody}>
          {isLoading ? (
            <Skeleton height={220} />
          ) : conformityEvolution.labels.length === 0 ? (
            <p className={styles.empty}>Pas de données sur la période.</p>
          ) : (
            <LineChart
              labels={conformityEvolution.labels}
              series={[
                {
                  label: '% conformes',
                  values: conformityEvolution.values,
                },
              ]}
              height={220}
              threshold={{ value: 80, label: 'Cible 80 %' }}
              fillArea
            />
          )}
        </div>
      </section>
      ) : null}

      {tab === 'distribution' ? (
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="distribution-heading">
          <header className={styles.panelHeader}>
            <span className={styles.panelHeaderIcon} aria-hidden="true">
              <BarChart3 size={18} />
            </span>
            <div className={styles.panelTitleGroup}>
              <h2 id="distribution-heading" className={styles.panelTitle}>
                Distribution — {rule?.label}
              </h2>
              <span className={styles.panelCaption}>
                {distribution
                  ? `${distribution.total} mesures · ${distribution.bins.length} classes`
                  : 'pas assez de données'}
              </span>
            </div>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={220} />
            ) : !distribution ? (
              <p className={styles.empty}>Au moins 2 mesures distinctes requises.</p>
            ) : (
              <DistributionChart
                bins={distribution.bins}
                min={distribution.min}
                max={distribution.max}
                rule={rule}
                fmt={fmt}
              />
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="outliers-heading">
          <header className={styles.panelHeader}>
            <span className={styles.panelHeaderIcon} data-tone="danger" aria-hidden="true">
              <TrendingDown size={18} />
            </span>
            <div className={styles.panelTitleGroup}>
              <h2 id="outliers-heading" className={styles.panelTitle}>
                Top dépassements
              </h2>
              <span className={styles.panelCaption}>5 mesures les plus éloignées du seuil</span>
            </div>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={220} />
            ) : topOutliers.length === 0 ? (
              <p className={styles.empty}>Aucun dépassement sur la période.</p>
            ) : (
              <ul className={styles.outliersList}>
                {topOutliers.map((o, i) => (
                  <li key={`${o.siteId}-${o.collectedAt}-${i}`} className={styles.outlierRow}>
                    <span className={styles.outlierRank}>#{i + 1}</span>
                    <span className={styles.outlierBody}>
                      <span className={styles.outlierSite}>{o.siteName}</span>
                      <span className={styles.outlierDate}>
                        {format(new Date(o.collectedAt), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </span>
                    <span className={styles.outlierValue}>
                      {fmt(o.value)}
                      <span className={styles.outlierUnit}>{rule?.unit}</span>
                    </span>
                    <span
                      className={styles.outlierExcess}
                      data-tone={o.excessPct > 50 ? 'crit' : 'warn'}
                    >
                      +{o.excessPct.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      ) : null}

      {tab === 'distribution' ? (
      <section className={styles.panel} aria-labelledby="quartiles-heading">
        <header className={styles.panelHeader}>
          <span className={styles.panelHeaderIcon} aria-hidden="true">
            <BoxIcon size={18} />
          </span>
          <div className={styles.panelTitleGroup}>
            <h2 id="quartiles-heading" className={styles.panelTitle}>
              Quartiles par site — {rule?.label}
            </h2>
            <span className={styles.panelCaption}>
              Boîte = Q1→Q3 · trait = médiane · barres = min/max
            </span>
          </div>
        </header>
        <div className={styles.panelBody}>
          {isLoading ? (
            <Skeleton height={200} />
          ) : quartilesBySite.rows.length === 0 ? (
            <p className={styles.empty}>
              Au moins 2 mesures par site requises pour calculer les quartiles.
            </p>
          ) : (
            <QuartilesChart
              rows={quartilesBySite.rows}
              globalMin={quartilesBySite.globalMin}
              globalMax={quartilesBySite.globalMax}
              rule={rule}
              fmt={fmt}
            />
          )}
        </div>
      </section>
      ) : null}

      {tab === 'comparison' ? (
      <section className={styles.panel} aria-labelledby="comparator-heading">
        <header className={styles.panelHeader}>
          <span className={styles.panelHeaderIcon} aria-hidden="true">
            <BarChart3 size={18} />
          </span>
          <div className={styles.panelTitleGroup}>
            <h2 id="comparator-heading" className={styles.panelTitle}>
              Comparateur multi-sites — {rule?.label}
            </h2>
            <span className={styles.panelCaption}>
              moyenne {rule?.unit} sur {days} jours
            </span>
          </div>
        </header>
        <div className={styles.panelBody}>
          {isLoading ? (
            <Skeleton height={200} />
          ) : comparator.items.length === 0 ? (
            <p className={styles.empty}>Aucune mesure pour cet indicateur sur la période.</p>
          ) : (
            <div className={styles.comparator}>
              {comparator.items.map((item) => {
                const status = exceededFraction(item.avg);
                const range = comparator.globalMax - comparator.globalMin || 1;
                const minPct = ((item.min - comparator.globalMin) / range) * 100;
                const maxPct = ((item.max - comparator.globalMin) / range) * 100;
                const avgPct = ((item.avg - comparator.globalMin) / range) * 100;
                return (
                  <div key={item.siteId} className={styles.comparatorRow} data-tone={status}>
                    <span className={styles.comparatorLabel}>
                      {item.name}
                      <span className={styles.comparatorN}>{item.n} mesures</span>
                    </span>
                    <span className={styles.comparatorTrack} aria-hidden="true">
                      <span
                        className={styles.comparatorRange}
                        style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
                      />
                      <span
                        className={styles.comparatorAvg}
                        style={{ left: `${avgPct}%` }}
                      />
                    </span>
                    <span className={styles.comparatorMeta}>
                      <span className={styles.comparatorValue}>{fmt(item.avg)}</span>
                      <span className={styles.comparatorUnit}>{rule?.unit}</span>
                    </span>
                    <span className={styles.comparatorRangeText}>
                      {fmt(item.min)} – {fmt(item.max)}
                    </span>
                    <Sparkline values={item.series} tone={status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────
 * Quartiles par site — box plot (widget)
 * ─────────────────────────────────────*/
interface QuartileRow {
  siteId: string;
  name: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface QuartilesChartProps {
  rows: QuartileRow[];
  globalMin: number;
  globalMax: number;
  rule: ReturnType<typeof findRule>;
  fmt: (v: number) => string;
}

function QuartilesChart({ rows, globalMin, globalMax, rule, fmt }: QuartilesChartProps) {
  const rowH = 40;
  const W = 720;
  const H = rows.length * rowH + 40;
  const padL = 110;
  const padR = 60;
  const padT = 16;
  const innerW = W - padL - padR;
  const range = globalMax - globalMin || 1;
  const xFor = (v: number) => padL + ((v - globalMin) / range) * innerW;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Quartiles par site"
      className={styles.distSvg}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Lignes de seuils */}
      {rule?.maxOk !== undefined && rule.maxOk >= globalMin && rule.maxOk <= globalMax ? (
        <g>
          <line
            x1={xFor(rule.maxOk)}
            x2={xFor(rule.maxOk)}
            y1={padT - 4}
            y2={H - 16}
            stroke="var(--color-amber)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={xFor(rule.maxOk)}
            y={padT - 6}
            textAnchor="middle"
            className={styles.distThresholdText}
          >
            seuil {fmt(rule.maxOk)}
          </text>
        </g>
      ) : null}
      {rule?.minOk !== undefined && rule.minOk >= globalMin && rule.minOk <= globalMax ? (
        <line
          x1={xFor(rule.minOk)}
          x2={xFor(rule.minOk)}
          y1={padT - 4}
          y2={H - 16}
          stroke="var(--color-amber)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      ) : null}

      {/* Rows */}
      {rows.map((r, i) => {
        const yMid = padT + i * rowH + rowH / 2;
        const xMin = xFor(r.min);
        const xMax = xFor(r.max);
        const xQ1 = xFor(r.q1);
        const xQ3 = xFor(r.q3);
        const xMed = xFor(r.median);
        const inThreshold =
          (rule?.maxOk === undefined || r.median <= rule.maxOk) &&
          (rule?.minOk === undefined || r.median >= rule.minOk);
        const fill = inThreshold ? 'var(--color-primary-soft)' : 'var(--color-danger-bg)';
        const stroke = inThreshold ? 'var(--color-primary)' : 'var(--color-danger)';
        return (
          <g key={r.siteId}>
            {/* Label site */}
            <text x={padL - 10} y={yMid + 4} textAnchor="end" className={styles.qLabel}>
              {r.name}
            </text>
            {/* whisker line min→max */}
            <line x1={xMin} x2={xMax} y1={yMid} y2={yMid} stroke="var(--color-border-strong)" strokeWidth={1} />
            {/* end caps */}
            <line x1={xMin} x2={xMin} y1={yMid - 6} y2={yMid + 6} stroke="var(--color-border-strong)" strokeWidth={1.5} />
            <line x1={xMax} x2={xMax} y1={yMid - 6} y2={yMid + 6} stroke="var(--color-border-strong)" strokeWidth={1.5} />
            {/* IQR box */}
            <rect
              x={xQ1}
              y={yMid - 10}
              width={Math.max(2, xQ3 - xQ1)}
              height={20}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
              rx={3}
            />
            {/* median */}
            <line x1={xMed} x2={xMed} y1={yMid - 10} y2={yMid + 10} stroke={stroke} strokeWidth={2.5} />
            {/* n mesures à droite */}
            <text x={W - 6} y={yMid + 4} textAnchor="end" className={styles.qN}>
              {r.n} · méd. {fmt(r.median)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────
 * Distribution histogram (widget)
 * ─────────────────────────────────────*/
interface DistributionChartProps {
  bins: number[];
  min: number;
  max: number;
  rule: ReturnType<typeof findRule>;
  fmt: (v: number) => string;
}

function DistributionChart({ bins, min, max, rule, fmt }: DistributionChartProps) {
  const W = 600;
  const H = 200;
  const padL = 40;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxBin = Math.max(...bins, 1);
  const binW = innerW / bins.length;
  const range = max - min;

  const xForValue = (v: number) => padL + ((v - min) / range) * innerW;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Histogramme de distribution"
      className={styles.distSvg}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* axe Y ticks */}
      {[0, 0.5, 1].map((p, i) => {
        const y = padT + innerH - p * innerH;
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeDasharray={p === 0 ? '0' : '2 4'}
              strokeWidth={1}
            />
            <text x={padL - 6} y={y + 3} textAnchor="end" className={styles.distAxisText}>
              {Math.round(p * maxBin)}
            </text>
          </g>
        );
      })}
      {/* barres */}
      {bins.map((count, i) => {
        const h = (count / maxBin) * innerH;
        const x = padL + i * binW;
        const y = padT + innerH - h;
        const binMid = min + ((i + 0.5) / bins.length) * range;
        const inThreshold =
          (rule?.maxOk === undefined || binMid <= rule.maxOk) &&
          (rule?.minOk === undefined || binMid >= rule.minOk);
        const fill = inThreshold ? 'var(--color-primary)' : 'var(--color-danger)';
        return (
          <rect
            key={i}
            x={x + 1}
            y={y}
            width={binW - 2}
            height={h}
            rx={2}
            fill={fill}
            opacity={0.85}
          >
            <title>
              {fmt(min + (i / bins.length) * range)} – {fmt(min + ((i + 1) / bins.length) * range)} {rule?.unit ?? ''} : {count} mesures
            </title>
          </rect>
        );
      })}
      {/* lignes seuils */}
      {rule?.maxOk !== undefined && rule.maxOk >= min && rule.maxOk <= max ? (
        <g>
          <line
            x1={xForValue(rule.maxOk)}
            x2={xForValue(rule.maxOk)}
            y1={padT}
            y2={padT + innerH}
            stroke="var(--color-amber)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <text
            x={xForValue(rule.maxOk)}
            y={padT - 2}
            textAnchor="middle"
            className={styles.distThresholdText}
          >
            seuil {fmt(rule.maxOk)}
          </text>
        </g>
      ) : null}
      {rule?.minOk !== undefined && rule.minOk >= min && rule.minOk <= max ? (
        <line
          x1={xForValue(rule.minOk)}
          x2={xForValue(rule.minOk)}
          y1={padT}
          y2={padT + innerH}
          stroke="var(--color-amber)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      ) : null}
      {/* axe X labels */}
      <text x={padL} y={H - 6} className={styles.distAxisText} textAnchor="start">
        {fmt(min)} {rule?.unit ?? ''}
      </text>
      <text x={W - padR} y={H - 6} className={styles.distAxisText} textAnchor="end">
        {fmt(max)} {rule?.unit ?? ''}
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────
 * Composite rings (existant)
 * ─────────────────────────────────────*/
interface CompositeRingsProps {
  overall: number;
  env: number;
  soc: number;
}

function CompositeRings({ overall, env, soc }: CompositeRingsProps) {
  const size = 200;
  const center = size / 2;
  const stroke = 8;
  const gap = 6;

  const rOuter = center - stroke / 2;
  const rMid = rOuter - stroke - gap;
  const rInner = rMid - stroke - gap;

  const arc = (r: number, value: number) => {
    const c = 2 * Math.PI * r;
    const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
    return { c, dash };
  };

  const overallArc = arc(rOuter, overall);
  const envArc = arc(rMid, env);
  const socArc = arc(rInner, soc);

  const overallTone =
    overall >= 80 ? 'var(--color-success)' : overall >= 60 ? 'var(--color-amber)' : 'var(--color-danger)';

  return (
    <div className={styles.ringsWrap}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.ringsSvg}
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={rOuter} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={stroke} />
        <circle cx={center} cy={center} r={rMid} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={stroke} />
        <circle cx={center} cy={center} r={rInner} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={rOuter}
          fill="none"
          stroke={overallTone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${overallArc.dash} ${overallArc.c - overallArc.dash}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={rMid}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${envArc.dash} ${envArc.c - envArc.dash}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={rInner}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${socArc.dash} ${socArc.c - socArc.dash}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className={styles.ringsLabel}>
        <span className={styles.ringsValue}>{overall}</span>
        <span className={styles.ringsUnit}>/ 100</span>
      </div>
    </div>
  );
}

interface SparklineProps {
  values: number[];
  tone: 'ok' | 'warn' | 'crit';
}

function Sparkline({ values, tone }: SparklineProps) {
  if (values.length < 2) return <span className={styles.sparklineEmpty} />;
  const w = 70;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${pts.join(' L')}`;
  const color =
    tone === 'crit'
      ? 'var(--color-danger)'
      : tone === 'warn'
        ? 'var(--color-amber)'
        : 'var(--color-success)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={styles.sparkline} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
