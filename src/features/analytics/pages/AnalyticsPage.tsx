import { useMemo, useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
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

  /* Trend explorer — timeseries par site */
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
      const dayLabel = format(new Date(c.collectedAt), 'dd MMM');
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

  /* Comparateur — moyenne par site sur la période + min/max + série pour sparkline */
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

  /* Indice composite — moyenne pondérée environnement (60%) + social (40%)
   * Conformité calculée à la volée via les règles d'indicateurs (pas de field
   * `conformity` figé en fixture). */
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

  /* Quick stats sur l'indicateur sélectionné */
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
      return { count: 0, avg: 0, min: 0, max: 0, exceedRate: 0 };
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, indicatorId, days, activeSiteIds, rule]);

  const fmt = (v: number) => v.toFixed(rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1);

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
            {rule?.unit ? (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginLeft: 6 }}>
                {rule.unit}
              </span>
            ) : null}
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
                <TrendingUp size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
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
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                Pas assez de données pour cet indicateur sur la période.
              </p>
            ) : (
              <>
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
                <div className={styles.legend} style={{ marginTop: 'var(--space-3)' }}>
                  {trend.series.map((s) => (
                    <span key={s.label} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
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
          <div className={styles.compositeRing}>
            <CircleGauge value={composite.overall} size={148} stroke={12} />
            <div className={styles.compositeRingLabel}>
              <span className={styles.compositeRingValue}>{composite.overall}</span>
              <span className={styles.compositeRingUnit}>/ 100</span>
            </div>
          </div>
          <div className={styles.compositeSplit}>
            <div className={styles.compositeSubScore}>
              <CircleGauge value={composite.env} size={68} stroke={6} accent="primary" />
              <div>
                <span className={styles.subScoreLabel}>Environnement</span>
                <span className={styles.subScoreValue}>{composite.env}</span>
              </div>
            </div>
            <div className={styles.compositeSubScore}>
              <CircleGauge value={composite.soc} size={68} stroke={6} accent="accent" />
              <div>
                <span className={styles.subScoreLabel}>Social / SST</span>
                <span className={styles.subScoreValue}>{composite.soc}</span>
              </div>
            </div>
          </div>
          <p className={styles.compositeFootnote}>
            Pondération 60 % environnement · 40 % social. ≥ 80 conforme · 60-79 à surveiller · &lt; 60 critique.
          </p>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="comparator-heading">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h2 id="comparator-heading" className={styles.panelTitle}>
              <BarChart3 size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Aucune mesure pour cet indicateur sur la période.
            </p>
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
                      <span className={styles.comparatorValue}>
                        {item.avg.toFixed(rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1)}
                      </span>
                      <span className={styles.comparatorUnit}>{rule?.unit}</span>
                    </span>
                    <span className={styles.comparatorRangeText}>
                      {item.min.toFixed(rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1)}
                      {' – '}
                      {item.max.toFixed(rule?.unit === 'pH' || rule?.unit === '' ? 2 : 1)}
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

interface CircleGaugeProps {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  accent?: 'primary' | 'accent' | 'auto';
}

function CircleGauge({ value, size = 120, stroke = 10, accent = 'auto' }: CircleGaugeProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  const tone =
    accent === 'auto'
      ? value >= 80
        ? 'var(--color-success)'
        : value >= 60
          ? 'var(--color-amber)'
          : 'var(--color-danger)'
      : accent === 'accent'
        ? 'var(--color-accent)'
        : 'var(--color-primary)';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.gaugeSvg}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-surface-sunken)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
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
