import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Gauge, MapPin, TrendingDown, TrendingUp } from 'lucide-react';
import { Select, Skeleton, Tabs } from '@/components/common';
import { LineChart } from '@/components/common/charts';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import {
  INDICATOR_RULES,
  computeLocalConformity,
  findRule,
} from '@/features/collection/lib/indicatorRules';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './AnalyticsPage.module.css';

const PERIODS = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '180', label: '6 mois' },
];

const FEATURED_INDICATORS = [
  'water.ph',
  'water.sulfate',
  'water.codm',
  'air.pm25',
  'soil.lead',
];

export function AnalyticsPage() {
  const [period, setPeriod] = useState('90');
  const days = Number(period);

  const [indicatorId, setIndicatorId] = useState<string>('water.ph');
  const [activeSiteIds, setActiveSiteIds] = useState<Set<string>>(new Set());

  const { data: sitesPage } = useSites();
  const { data: collectionsPage, isLoading } = useCollections({});

  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);
  const collections = useMemo(() => collectionsPage?.items ?? [], [collectionsPage]);

  const isAllSelected = activeSiteIds.size === 0;
  const toggleSite = (siteId: string) => {
    setActiveSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };
  const isSiteVisible = (id: string) => isAllSelected || activeSiteIds.has(id);

  const indicatorOptions = useMemo(
    () =>
      INDICATOR_RULES.filter((r) => FEATURED_INDICATORS.includes(r.id)).map((r) => ({
        value: r.id,
        label: `${r.label} (${r.unit})`,
      })),
    [],
  );

  const rule = useMemo(
    () => INDICATOR_RULES.find((r) => r.id === indicatorId),
    [indicatorId],
  );

  const fmtUnit = rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1;
  const fmt = (v: number) => v.toFixed(fmtUnit);

  /* ── Hero KPIs : période courante vs période précédente ── */
  const heroKpis = useMemo(() => {
    const now = Date.now();
    const periodStart = now - days * 86_400_000;
    const prevStart = periodStart - days * 86_400_000;

    const inPeriod = collections.filter((c) => {
      const t = new Date(c.collectedAt).getTime();
      return t >= periodStart && t <= now;
    });
    const inPrev = collections.filter((c) => {
      const t = new Date(c.collectedAt).getTime();
      return t >= prevStart && t < periodStart;
    });

    const computeConformityScore = (list: typeof collections): number => {
      let total = 0;
      let conformingCount = 0;
      for (const c of list) {
        for (const m of c.measurements) {
          const r = findRule(m.indicatorId);
          if (!r) continue;
          const num = typeof m.value === 'number' ? m.value : Number(m.value);
          if (!Number.isFinite(num)) continue;
          total += 1;
          const level = computeLocalConformity(r, num);
          if (level === 'conforming') conformingCount += 1;
        }
      }
      return total > 0 ? Math.round((conformingCount / total) * 100) : 0;
    };

    const conformity = computeConformityScore(inPeriod);
    const conformityPrev = computeConformityScore(inPrev);

    const measureCount = inPeriod.reduce((sum, c) => sum + c.measurements.length, 0);
    const measureCountPrev = inPrev.reduce((sum, c) => sum + c.measurements.length, 0);

    const sitesMonitored = new Set(inPeriod.map((c) => c.siteId)).size;
    const sitesMonitoredPrev = new Set(inPrev.map((c) => c.siteId)).size;

    const hotIndicators = new Set<string>();
    for (const c of inPeriod) {
      for (const m of c.measurements) {
        const r = findRule(m.indicatorId);
        if (!r) continue;
        const num = typeof m.value === 'number' ? m.value : Number(m.value);
        if (!Number.isFinite(num)) continue;
        if (computeLocalConformity(r, num) === 'critical') hotIndicators.add(m.indicatorId);
      }
    }
    const hotIndicatorsCount = hotIndicators.size;

    const hotPrev = new Set<string>();
    for (const c of inPrev) {
      for (const m of c.measurements) {
        const r = findRule(m.indicatorId);
        if (!r) continue;
        const num = typeof m.value === 'number' ? m.value : Number(m.value);
        if (!Number.isFinite(num)) continue;
        if (computeLocalConformity(r, num) === 'critical') hotPrev.add(m.indicatorId);
      }
    }

    return {
      conformity,
      conformityDelta: conformity - conformityPrev,
      measureCount,
      measureDelta: measureCount - measureCountPrev,
      sitesMonitored,
      sitesDelta: sitesMonitored - sitesMonitoredPrev,
      hotIndicatorsCount,
      hotDelta: hotIndicatorsCount - hotPrev.size,
    };
  }, [collections, days]);

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
  }, [collections, indicatorId, days, sites, activeSiteIds]);

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
      if (!isAllSelected && !activeSiteIds.has(c.siteId)) continue;
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
  }, [collections, indicatorId, days, activeSiteIds, rule]);

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
      if (!isAllSelected && !activeSiteIds.has(c.siteId)) continue;
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
  }, [collections, indicatorId, days, rule, sites, activeSiteIds]);

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
        </div>
      </header>

      {/* ── KPI hero strip ── */}
      <section className={styles.kpiGrid} aria-label="Indicateurs clés de la période">
        <KpiCard
          icon={<Gauge size={18} />}
          tone="primary"
          label="Indice conformité"
          value={`${heroKpis.conformity}`}
          unit="/ 100"
          delta={heroKpis.conformityDelta}
          deltaSuffix=" pts"
          hint="part des mesures conformes"
        />
        <KpiCard
          icon={<Activity size={18} />}
          tone="neutral"
          label="Mesures collectées"
          value={heroKpis.measureCount.toLocaleString('fr-FR')}
          delta={heroKpis.measureDelta}
          deltaIsRelative
          hint={`sur ${days} jours`}
        />
        <KpiCard
          icon={<MapPin size={18} />}
          tone="neutral"
          label="Sites surveillés"
          value={heroKpis.sitesMonitored.toString()}
          delta={heroKpis.sitesDelta}
          hint="avec au moins 1 collecte"
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          tone={heroKpis.hotIndicatorsCount > 0 ? 'danger' : 'success'}
          label="Indicateurs critiques"
          value={heroKpis.hotIndicatorsCount.toString()}
          delta={heroKpis.hotDelta}
          deltaInverse
          hint="au moins 1 dépassement franc"
        />
      </section>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.toolbarField}>
            <span className={styles.toolbarLabel}>Indicateur</span>
            <div className={styles.toolbarSelect}>
              <Select<string>
                value={indicatorId}
                onChange={setIndicatorId}
                options={indicatorOptions}
                aria-label="Indicateur à explorer"
              />
            </div>
          </div>
          <div className={styles.toolbarField}>
            <span className={styles.toolbarLabel}>Période</span>
            <Tabs
              value={period}
              onChange={setPeriod}
              items={PERIODS}
              variant="pill"
              aria-label="Période"
            />
          </div>
        </div>
        <div className={styles.toolbarRow}>
          <span className={styles.toolbarLabel}>Sites</span>
          <div className={styles.siteChips} role="group" aria-label="Filtrer par site">
            <button
              type="button"
              className={`${styles.siteChip} ${isAllSelected ? styles.siteChipActive : ''}`}
              onClick={() => setActiveSiteIds(new Set())}
            >
              Tous
            </button>
            {sites.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.siteChip} ${activeSiteIds.has(s.id) ? styles.siteChipActive : ''}`}
                onClick={() => toggleSite(s.id)}
                aria-pressed={activeSiteIds.has(s.id)}
              >
                {s.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="trend-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="trend-heading" className={styles.panelTitle}>
                <TrendingUp size={16} className={styles.panelTitleIcon} />
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

      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="distribution-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="distribution-heading" className={styles.panelTitle}>
                <BarChart3 size={16} className={styles.panelTitleIcon} />
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
            <div className={styles.panelTitleGroup}>
              <h2 id="outliers-heading" className={styles.panelTitle}>
                <TrendingDown size={16} className={styles.panelTitleIcon} />
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

      <section className={styles.panel} aria-labelledby="comparator-heading">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h2 id="comparator-heading" className={styles.panelTitle}>
              <BarChart3 size={16} className={styles.panelTitleIcon} />
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
    </div>
  );
}

/* ─────────────────────────────────────
 * KPI Card (widget hero)
 * ─────────────────────────────────────*/
interface KpiCardProps {
  icon: React.ReactNode;
  tone: 'primary' | 'success' | 'danger' | 'neutral';
  label: string;
  value: string;
  unit?: string;
  delta: number;
  deltaSuffix?: string;
  deltaIsRelative?: boolean;
  deltaInverse?: boolean;
  hint: string;
}

function KpiCard({ icon, tone, label, value, unit, delta, deltaSuffix, deltaIsRelative, deltaInverse, hint }: KpiCardProps) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const isGood = deltaInverse ? delta < 0 : delta > 0;
  const deltaTone = isNeutral ? 'neutral' : isGood ? 'pos' : 'neg';
  const arrow = isNeutral ? '·' : isPositive ? '▲' : '▼';
  const deltaText = deltaIsRelative && delta !== 0
    ? `${arrow} ${Math.abs(delta).toLocaleString('fr-FR')}`
    : `${arrow} ${Math.abs(delta)}${deltaSuffix ?? ''}`;
  return (
    <div className={styles.kpiCard} data-tone={tone}>
      <div className={styles.kpiHead}>
        <span className={styles.kpiIcon} aria-hidden="true">{icon}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>
          {value}
          {unit ? <span className={styles.kpiUnit}>{unit}</span> : null}
        </span>
        <span className={styles.kpiDelta} data-tone={deltaTone}>
          {deltaText}
        </span>
      </div>
      <span className={styles.kpiHint}>{hint}</span>
    </div>
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
