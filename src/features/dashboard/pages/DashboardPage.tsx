import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Beaker,
  CloudOff,
  Download,
  Eye,
  FlaskConical,
  Gauge,
  Siren,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { AlertCategory } from '@/features/alerts/api/alerts.types';
import { Badge, Button, Select, Skeleton, Tabs } from '@/components/common';
import { LineChart } from '@/components/common/charts';
import { useSites } from '@/features/sites/hooks/useSites';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { mockUsers } from '@/mocks/fixtures/users';
import { formatRelativeTime } from '@/lib/format';
import { ConformityHeatmap } from '../components/ConformityHeatmap';
import { useDashboardData } from '../hooks/useDashboardData';
import { computeExecutiveSummary, RISK_LABEL, RISK_TONE } from '../lib/executiveSummary';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import styles from './DashboardPage.module.css';

const PERIODS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
];

const PM25_OMS_24H = 25;
const PH_LIMIT_HIGH = 8.5;

const CATEGORY_ICON: Record<AlertCategory, typeof ShieldAlert> = {
  threshold_exceeded: ShieldAlert,
  lab_overdue: Beaker,
  site_silence: CloudOff,
  data_quality: Eye,
};

interface Pm25RankingProps {
  labels: string[];
  values: number[];
  threshold: number;
}

function Pm25Ranking({ labels, values, threshold }: Pm25RankingProps) {
  const visualMax = threshold * 1.25;
  const thresholdPct = (threshold / visualMax) * 100;
  const items = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
  const sorted = [...items].sort((a, b) => b.value - a.value);

  return (
    <div className={styles.rankingList}>
      {sorted.map(({ label, value }) => {
        const pct = Math.min(100, (value / visualMax) * 100);
        const tone =
          value > threshold ? 'crit' : value > threshold * 0.8 ? 'warn' : 'ok';
        const fillClass =
          tone === 'crit'
            ? styles.rankingFillCrit
            : tone === 'warn'
              ? styles.rankingFillWarn
              : styles.rankingFillOk;
        return (
          <div key={label} className={styles.rankingRow}>
            <div className={styles.rankingHead}>
              <span className={styles.rankingLabel}>{label}</span>
              <span className={styles.rankingValue} data-tone={tone}>
                {value.toFixed(1)} <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>µg/m³</span>
              </span>
            </div>
            <div className={styles.rankingTrack}>
              <div className={fillClass} style={{ width: `${pct}%` }} />
              <span
                className={styles.rankingThreshold}
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<string>('30');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const days = Number(period);
  const filterSiteId = siteFilter === 'all' ? null : siteFilter;

  const { isLoading, sites, phTimeseries, pm25, heatmap, kpis, recentCollections } =
    useDashboardData(days, filterSiteId);

  const { data: sitesPage } = useSites();
  const { data: alertsPage } = useAlerts({ status: 'active' });
  const { data: alertsAllPage } = useAlerts();
  const { data: collectionsAllPage } = useCollections();

  /* ── Sparklines + comparaisons période précédente ── */
  const periodInsights = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const cutoffCurrent = now - days * dayMs;
    const cutoffPrev = now - 2 * days * dayMs;

    const allColl = (collectionsAllPage?.items ?? []).filter(
      (c) => !filterSiteId || c.siteId === filterSiteId,
    );
    const allAlerts = (alertsAllPage?.items ?? []).filter(
      (a) => !filterSiteId || a.siteId === filterSiteId,
    );

    /* Sparkline = N buckets sur la période courante */
    const buckets = Math.min(8, days);
    const bucketMs = (days * dayMs) / buckets;
    const collectionsSpark = Array(buckets).fill(0) as number[];
    const alertsSpark = Array(buckets).fill(0) as number[];

    for (const c of allColl) {
      const t = new Date(c.collectedAt).getTime();
      if (t < cutoffCurrent) continue;
      const idx = Math.min(buckets - 1, Math.floor((t - cutoffCurrent) / bucketMs));
      collectionsSpark[idx] = (collectionsSpark[idx] ?? 0) + 1;
    }
    for (const a of allAlerts) {
      if (a.severity !== 'critical') continue;
      const t = new Date(a.raisedAt).getTime();
      if (t < cutoffCurrent) continue;
      const idx = Math.min(buckets - 1, Math.floor((t - cutoffCurrent) / bucketMs));
      alertsSpark[idx] = (alertsSpark[idx] ?? 0) + 1;
    }

    const collectionsCurrent = allColl.filter(
      (c) => new Date(c.collectedAt).getTime() >= cutoffCurrent,
    ).length;
    const collectionsPrev = allColl.filter((c) => {
      const t = new Date(c.collectedAt).getTime();
      return t >= cutoffPrev && t < cutoffCurrent;
    }).length;

    const alertsCurrent = allAlerts.filter(
      (a) => a.severity === 'critical' && new Date(a.raisedAt).getTime() >= cutoffCurrent,
    ).length;
    const alertsPrev = allAlerts.filter((a) => {
      if (a.severity !== 'critical') return false;
      const t = new Date(a.raisedAt).getTime();
      return t >= cutoffPrev && t < cutoffCurrent;
    }).length;

    const collectionsTrend =
      collectionsPrev > 0
        ? Math.round(((collectionsCurrent - collectionsPrev) / collectionsPrev) * 100)
        : 0;

    return {
      collectionsSpark,
      alertsSpark,
      collectionsPrev,
      collectionsTrend,
      alertsPrev,
      alertsDelta: alertsCurrent - alertsPrev,
    };
  }, [collectionsAllPage, alertsAllPage, days, filterSiteId]);

  const activeAlerts = useMemo(
    () =>
      (alertsPage?.items ?? [])
        .filter((a) => !filterSiteId || a.siteId === filterSiteId)
        .slice(0, 5),
    [alertsPage, filterSiteId],
  );

  const execSummary = useMemo(() => {
    const filteredSites =
      filterSiteId
        ? (sitesPage?.items ?? []).filter((s) => s.id === filterSiteId)
        : (sitesPage?.items ?? []);
    const filteredAlerts = (alertsPage?.items ?? []).filter(
      (a) => !filterSiteId || a.siteId === filterSiteId,
    );
    return computeExecutiveSummary(filteredSites, filteredAlerts);
  }, [sitesPage, alertsPage, filterSiteId]);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const siteOptions = [
    { value: 'all', label: 'Tous les sites' },
    ...(sitesPage?.items.map((s) => ({ value: s.id, label: s.shortName })) ?? []),
  ];

  return (
    <div className={styles.page}>
      {/* ─── Hero + barre de contrôle (période, site, export) ─── */}
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>{sites.length} sites · {today}</span>
          <h1 className={styles.heroTitle}>Tableau de bord</h1>
          <p className={styles.heroDescription}>
            Vue stratégique consolidée — score environnemental, conformité, alertes et activité récente.
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
          <Select<string>
            value={siteFilter}
            onChange={setSiteFilter}
            options={siteOptions}
            aria-label="Filtrer par site"
          />
          <Button variant="secondary" iconLeft={<Download size={14} />}>
            Exporter
          </Button>
        </div>
      </header>

      {/* ─── Vue stratégique (4 tiles : Score · Risque · Conformité · Alertes) ─── */}
      <section className={styles.execGrid} aria-label="Vue stratégique">
        <article
          className={styles.execTile}
          data-tone={
            execSummary.envScore >= 75
              ? 'success'
              : execSummary.envScore >= 50
                ? 'info'
                : execSummary.envScore >= 25
                  ? 'warning'
                  : 'danger'
          }
        >
          <header className={styles.execTileHead}>
            <Gauge size={14} aria-hidden="true" />
            <span className={styles.execLabel}>Score environnemental</span>
          </header>
          <div className={styles.execMain}>
            <span className={styles.execValue}>
              {isLoading ? '—' : execSummary.envScore}
            </span>
            <span className={styles.execUnit}>/ 100</span>
          </div>
          <span className={styles.execCaption}>
            {execSummary.envScore >= 75
              ? 'Performance globale satisfaisante'
              : execSummary.envScore >= 50
                ? 'À surveiller, plusieurs points d\'attention'
                : execSummary.envScore >= 25
                  ? 'Situation préoccupante, actions requises'
                  : 'Crise environnementale, intervention urgente'}
          </span>
        </article>

        <article className={styles.execTile} data-tone={RISK_TONE[execSummary.riskLevel]}>
          <header className={styles.execTileHead}>
            <Siren size={14} aria-hidden="true" />
            <span className={styles.execLabel}>Niveau de risque</span>
          </header>
          <div className={styles.execMain}>
            <span className={styles.execLevel}>
              {RISK_LABEL[execSummary.riskLevel]}
            </span>
          </div>
          <span className={styles.execCaption}>
            {execSummary.criticalAlerts === 0
              ? 'Aucune alerte critique active'
              : `${execSummary.criticalAlerts} alerte${execSummary.criticalAlerts > 1 ? 's' : ''} critique${execSummary.criticalAlerts > 1 ? 's' : ''} en cours`}
          </span>
        </article>

        <article
          className={styles.execTile}
          data-tone={execSummary.conformityRate >= 80 ? 'success' : 'warning'}
        >
          <header className={styles.execTileHead}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span className={styles.execLabel}>Conformité globale</span>
          </header>
          <div className={styles.execMain}>
            <span className={styles.execValue}>
              {isLoading ? '—' : execSummary.conformityRate}
            </span>
            <span className={styles.execUnit}>%</span>
          </div>
          <span className={styles.execCaption}>
            {execSummary.conformityRate >= 80
              ? 'Cible 80 % atteinte'
              : `${80 - execSummary.conformityRate} pts sous la cible 80 %`}
          </span>
          <ConformityBar value={execSummary.conformityRate} />
        </article>

        <article
          className={styles.execTile}
          data-tone={execSummary.criticalAlerts === 0 ? 'success' : 'danger'}
        >
          <header className={styles.execTileHead}>
            <ShieldAlert size={14} aria-hidden="true" />
            <span className={styles.execLabel}>Alertes critiques</span>
          </header>
          <div className={styles.execMain}>
            <span className={styles.execValue}>{execSummary.criticalAlerts}</span>
          </div>
          <span className={styles.execCaption}>
            {execSummary.sitesAtRisk === 0
              ? 'Aucun site en alerte'
              : `${execSummary.sitesAtRisk} site${execSummary.sitesAtRisk > 1 ? 's' : ''} sur ${execSummary.sitesTotal} concerné${execSummary.sitesAtRisk > 1 ? 's' : ''}`}
          </span>
        </article>
      </section>

      {/* ─── Activité opérationnelle (collectes · agents · bordereaux) ─── */}
      <section className={styles.activityCard} aria-label="Activité opérationnelle">
        <header className={styles.activityHead}>
          <h2 className={styles.activityTitle}>Activité sur la période</h2>
          <span className={styles.activityMeta}>
            {kpis.totalCollections30d} collecte{kpis.totalCollections30d > 1 ? 's' : ''} · {days} derniers jours
          </span>
        </header>
        <div className={styles.activityGrid}>
          <div className={styles.activityItem}>
            <header className={styles.activityItemHead}>
              <FlaskConical size={14} aria-hidden="true" />
              <span>Collectes {days} j</span>
              {periodInsights.collectionsTrend !== 0 ? (
                <span
                  className={styles.activityTrend}
                  data-tone={periodInsights.collectionsTrend >= 0 ? 'positive' : 'warning'}
                >
                  {periodInsights.collectionsTrend > 0 ? '+' : ''}
                  {periodInsights.collectionsTrend}%
                </span>
              ) : null}
            </header>
            <span className={styles.activityValue}>
              {isLoading ? '—' : kpis.totalCollections30d}
            </span>
            <footer className={styles.activityFoot}>
              <span>précédent · {periodInsights.collectionsPrev}</span>
              {periodInsights.collectionsSpark.length > 1 ? (
                <Sparkline values={periodInsights.collectionsSpark} color="var(--color-primary)" />
              ) : null}
            </footer>
          </div>

          <div className={styles.activityItem}>
            <header className={styles.activityItemHead}>
              <UsersRound size={14} aria-hidden="true" />
              <span>Agents actifs</span>
            </header>
            <span className={styles.activityValue}>
              {isLoading ? '—' : kpis.activeAgents}
            </span>
            <footer className={styles.activityFoot}>
              <span>sur {sites.length} sites couverts</span>
            </footer>
          </div>

          <div className={styles.activityItem}>
            <header className={styles.activityItemHead}>
              <Beaker size={14} aria-hidden="true" />
              <span>Bordereaux en attente</span>
              {(kpis.pendingLab ?? 0) > 5 ? (
                <span className={styles.activityTrend} data-tone="warning">
                  élevé
                </span>
              ) : null}
            </header>
            <span className={styles.activityValue}>
              {isLoading ? '—' : (kpis.pendingLab ?? 0)}
            </span>
            <footer className={styles.activityFoot}>
              <span>à transmettre au laboratoire</span>
            </footer>
          </div>
        </div>
      </section>

      {/* ─── Charts ─── */}
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="ph-trend-heading">
          <header className={styles.panelHeader}>
            <h2 id="ph-trend-heading" className={styles.panelTitle}>
              Évolution du pH
            </h2>
            <span className={styles.panelTag}>OMS 6,5–8,5</span>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={260} />
            ) : (
              <LineChart
                labels={phTimeseries.labels}
                series={phTimeseries.series}
                height={260}
                threshold={{ value: PH_LIMIT_HIGH, label: 'Seuil OMS 8,5' }}
                fillArea
              />
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="pm25-heading">
          <header className={styles.panelHeader}>
            <h2 id="pm25-heading" className={styles.panelTitle}>
              PM2,5 air par site
            </h2>
            <span className={styles.panelTag}>OMS 25 µg/m³</span>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={260} />
            ) : pm25.values.length === 0 ? (
              <p className={styles.empty}>Aucune mesure</p>
            ) : (
              <Pm25Ranking
                labels={pm25.labels}
                values={pm25.values}
                threshold={PM25_OMS_24H}
              />
            )}
          </div>
        </section>
      </div>

      {/* ─── Heatmap ─── */}
      <section className={styles.panel} aria-labelledby="heatmap-heading">
        <header className={styles.panelHeader}>
          <h2 id="heatmap-heading" className={styles.panelTitle}>
            Conformité par site × domaine
          </h2>
          <div className={styles.heatmapLegend}>
            <span className={styles.legendDot} data-tone="ok" /> Conforme
            <span className={styles.legendDot} data-tone="warn" /> À surveiller
            <span className={styles.legendDot} data-tone="crit" /> Critique
          </div>
        </header>
        <div className={styles.panelBody}>
          {isLoading ? (
            <Skeleton height={280} />
          ) : (
            <ConformityHeatmap
              sites={heatmap.sites}
              domains={heatmap.domains}
              cells={heatmap.cells}
              domainLabels={heatmap.domainLabels}
            />
          )}
        </div>
      </section>

      {/* ─── Collectes + Alertes ─── */}
      <div className={styles.bottomSplit}>
        <section className={styles.panel} aria-labelledby="recent-heading">
          <header className={styles.panelHeader}>
            <h2 id="recent-heading" className={styles.panelTitle}>
              Dernières collectes
            </h2>
            <Link to="/collecte" className={styles.panelLink}>
              Tout voir <ArrowRight size={12} />
            </Link>
          </header>
          {isLoading ? (
            <div style={{ padding: 'var(--space-4)' }}>
              <Skeleton height={220} />
            </div>
          ) : recentCollections.length === 0 ? (
            <p className={styles.empty}>Aucune collecte</p>
          ) : (
            recentCollections.slice(0, 6).map((c) => {
              const initials = c.siteName.slice(0, 2).toUpperCase();
              return (
                <Link key={c.id} to={`/collecte/${c.id}`} className={styles.recentRow}>
                  <span className={styles.recentInitials} aria-hidden="true">{initials}</span>
                  <div className={styles.recentMain}>
                    <span className={styles.recentSite}>{c.siteName}</span>
                    <span className={styles.recentMeta}>
                      {usersById.get(c.agentId) ?? c.agentId} · {c.measurementsCount} mesures
                    </span>
                  </div>
                  <div className={styles.recentTrailing}>
                    <Badge size="sm" variant={STATUS_VARIANT[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                    <span className={styles.recentTime}>
                      {formatRelativeTime(c.collectedAt)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </section>

        <section className={styles.panel} aria-labelledby="alerts-heading">
          <header className={styles.panelHeader}>
            <h2 id="alerts-heading" className={styles.panelTitle}>
              Alertes actives
              <span className={styles.panelCount}>{activeAlerts.length}</span>
            </h2>
            <Link to="/alertes" className={styles.panelLink}>
              Tout voir <ArrowRight size={12} />
            </Link>
          </header>
          {activeAlerts.length === 0 ? (
            <p className={styles.empty}>Aucune alerte active</p>
          ) : (
            activeAlerts.map((a) => {
              const site = sitesPage?.items.find((s) => s.id === a.siteId);
              const Icon = CATEGORY_ICON[a.category];
              return (
                <Link key={a.id} to="/alertes" className={styles.alertRow} data-severity={a.severity}>
                  <span className={styles.alertIcon} aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <div className={styles.alertContent}>
                    <span className={styles.alertTitle}>{a.title}</span>
                    <span className={styles.alertMeta}>
                      {site?.shortName ?? '—'} · {formatRelativeTime(a.raisedAt)}
                    </span>
                  </div>
                  <span className={styles.alertSeverityDot} data-severity={a.severity} aria-hidden="true" />
                </Link>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

/* ─────────── Headline composants ─────────── */

function ConformityBar({ value }: { value: number }) {
  return (
    <div className={styles.confBar} aria-hidden="true">
      <div className={styles.confBarFill} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 56;
  const h = 18;
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
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={styles.sparkline}
      aria-hidden="true"
    >
      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
