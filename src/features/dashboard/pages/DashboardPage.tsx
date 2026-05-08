import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  Users,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import { Badge, Button, Select, Skeleton, Tabs } from '@/components/common';
import { LineChart } from '@/components/common/charts';
import { useSites } from '@/features/sites/hooks/useSites';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { mockUsers } from '@/mocks/fixtures/users';
import { formatRelativeTime } from '@/lib/format';
import { ConformityHeatmap } from '../components/ConformityHeatmap';
import { useDashboardData } from '../hooks/useDashboardData';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import styles from './DashboardPage.module.css';

const PERIODS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
];

const PM25_OMS_24H = 25;
const PH_LIMIT_HIGH = 8.5;

interface KpiProps {
  label: string;
  value: string;
  unit?: string;
  hint: React.ReactNode;
  icon: React.ReactNode;
  iconTone?: 'primary' | 'warn' | 'accent' | 'navy';
}

function Kpi({ label, value, unit, hint, icon, iconTone = 'primary' }: KpiProps) {
  const iconClass =
    iconTone === 'warn'
      ? styles.kpiIconWarn
      : iconTone === 'accent'
        ? styles.kpiIconAccent
        : iconTone === 'navy'
          ? styles.kpiIconNavy
          : '';
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiHeader}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={`${styles.kpiIcon} ${iconClass}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className={styles.kpiValue}>
        {value}
        {unit ? <span className={styles.kpiUnit}>{unit}</span> : null}
      </div>
      <div className={styles.kpiHint}>{hint}</div>
    </div>
  );
}

interface Pm25RankingProps {
  labels: string[];
  values: number[];
  threshold: number;
}

function Pm25Ranking({ labels, values, threshold }: Pm25RankingProps) {
  /* Échelle : seuil OMS = 80% de la barre, on laisse 20% de réserve pour visualiser
   * les dépassements proprement. Si une mesure dépasse 1.25× le seuil, elle sature. */
  const visualMax = threshold * 1.25;
  const thresholdPct = (threshold / visualMax) * 100;

  const items = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
  const sorted = [...items].sort((a, b) => b.value - a.value);

  return (
    <div className={styles.rankingList}>
      {sorted.map(({ label, value }) => {
        const pct = Math.min(100, (value / visualMax) * 100);
        const fillClass =
          value > threshold
            ? styles.rankingFillCrit
            : value > threshold * 0.8
              ? styles.rankingFillWarn
              : styles.rankingFillOk;
        return (
          <div key={label} className={styles.rankingRow}>
            <span className={styles.rankingLabel}>{label}</span>
            <div className={styles.rankingTrack}>
              <div className={fillClass} style={{ width: `${pct}%`, height: '100%' }} />
              <span
                className={styles.rankingThreshold}
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className={styles.rankingValue}>{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConformityDonut({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className={styles.donutSvg}>
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--color-primary-soft)"
        strokeWidth="14"
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
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

  const activeAlerts = useMemo(
    () =>
      (alertsPage?.items ?? [])
        .filter((a) => !filterSiteId || a.siteId === filterSiteId)
        .slice(0, 5),
    [alertsPage, filterSiteId],
  );

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

  const conformity = isLoading ? 0 : kpis.conformityRate;
  const nonConform = 100 - conformity;
  const lastSyncLabel = kpis.lastSyncAt ? formatRelativeTime(kpis.lastSyncAt) : '—';

  const siteOptions = [
    { value: 'all', label: 'Tous les sites' },
    ...(sitesPage?.items.map((s) => ({ value: s.id, label: s.shortName })) ?? []),
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.heroEyebrow}>{sites.length} sites · {today}</span>
            <h1 className={styles.heroTitle}>Tableau de bord</h1>
          </div>
          <div className={styles.heroFooter}>
            <div className={styles.heroActions}>
              <Button variant="secondary" iconLeft={<Download size={14} />}>
                Exporter
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.donutCard}>
          <div className={styles.donutHead}>
            <span className={styles.donutLabel}>Conformité globale</span>
            <h3 className={styles.donutTitle}>Tous indicateurs · {days}j</h3>
          </div>
          <div className={styles.donutBody}>
            <ConformityDonut value={conformity} />
            <div className={styles.donutCenter}>
              <span className={styles.donutValue}>
                {isLoading ? '—' : `${conformity}%`}
              </span>
              <span className={styles.donutCaption}>conformes aux seuils</span>
              <div className={styles.donutLegend} style={{ marginTop: 'var(--space-2)' }}>
                <span className={styles.donutLegendItem}>
                  <span
                    className={styles.donutDot}
                    style={{ background: 'var(--color-primary)' }}
                  />
                  Conformes · {conformity}%
                </span>
                <span className={styles.donutLegendItem}>
                  <span
                    className={styles.donutDot}
                    style={{ background: 'var(--color-primary-soft)' }}
                  />
                  Hors seuil · {nonConform}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Période</span>
        <Tabs
          value={period}
          onChange={setPeriod}
          items={PERIODS}
          variant="pill"
          aria-label="Période"
        />
        <span className={styles.toolbarLabel} style={{ marginLeft: 'var(--space-3)' }}>
          Site
        </span>
        <div className={styles.toolbarSelect}>
          <Select<string>
            value={siteFilter}
            onChange={setSiteFilter}
            options={siteOptions}
            aria-label="Filtrer par site"
          />
        </div>
        <div className={styles.toolbarRight}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {kpis.totalCollections30d} collectes sur la période
          </span>
        </div>
      </div>

      <section className={styles.kpiGrid} aria-label="Indicateurs clés">
        <Kpi
          label="Sites"
          value={String(sites.length)}
          hint=""
          icon={<MapPin size={14} />}
          iconTone="primary"
        />
        <Kpi
          label={`Collectes ${days}j`}
          value={isLoading ? '—' : String(kpis.totalCollections30d)}
          hint={
            <span className={styles.kpiTrendUp}>
              <ArrowUpRight size={12} /> +12%
            </span>
          }
          icon={<ClipboardCheck size={14} />}
          iconTone="navy"
        />
        <Kpi
          label="Conformité"
          value={isLoading ? '—' : String(kpis.conformityRate)}
          unit="%"
          hint={
            <span className={styles.kpiTrendUp}>
              <ArrowUpRight size={12} /> +3 pts
            </span>
          }
          icon={<ShieldCheck size={14} />}
          iconTone="primary"
        />
        <Kpi
          label="Alertes critiques"
          value={isLoading ? '—' : String(kpis.criticalAlerts)}
          hint={
            <span className={styles.kpiTrendDown}>
              <ArrowDownRight size={12} /> −2
            </span>
          }
          icon={<AlertTriangle size={14} />}
          iconTone="warn"
        />
        <Kpi
          label="Agents actifs"
          value={isLoading ? '—' : String(kpis.activeAgents)}
          hint=""
          icon={<Users size={14} />}
          iconTone="navy"
        />
        <Kpi
          label="Dernière sync"
          value={lastSyncLabel === '—' ? '—' : lastSyncLabel}
          hint=""
          icon={<RefreshCw size={14} />}
          iconTone="accent"
        />
      </section>

      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="ph-trend-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="ph-trend-heading" className={styles.panelTitle}>
                Évolution du pH des eaux usées
              </h2>
              <span className={styles.panelCaption}>par site · {days} derniers jours</span>
            </div>
            <span className={`${styles.pill} ${styles.pillNeutral}`}>OMS 6,5–8,5</span>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={260} />
            ) : (
              <LineChart
                labels={phTimeseries.labels}
                series={phTimeseries.series}
                height={260}
                threshold={{ value: PH_LIMIT_HIGH, label: 'Seuil OMS pH 8,5' }}
                fillArea
              />
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="pm25-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="pm25-heading" className={styles.panelTitle}>
                PM2,5 air — par site
              </h2>
              <span className={styles.panelCaption}>dernière mesure · µg/m³</span>
            </div>
            <span className={`${styles.pill} ${styles.pillNavy}`}>OMS 25 µg/m³</span>
          </header>
          <div className={styles.panelBody}>
            {isLoading ? (
              <Skeleton height={260} />
            ) : pm25.values.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                Aucune mesure
              </p>
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

      <section className={styles.panel} aria-labelledby="heatmap-heading">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h2 id="heatmap-heading" className={styles.panelTitle}>
              Heatmap de conformité
            </h2>
            <span className={styles.panelCaption}>
              sites × domaines d'indicateurs · fenêtre {days}j
            </span>
          </div>
          <div className={styles.panelTabs}>
            <span className={`${styles.pill} ${styles.pillSuccess}`}>Conforme</span>
            <span className={`${styles.pill} ${styles.pillWarning}`}>À surveiller</span>
            <span
              className={styles.pill}
              style={{
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
              }}
            >
              Critique
            </span>
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

      {/* ───── Bottom split view : Collectes récentes ↔ Alertes actives ───── */}
      <div className={styles.bottomSplit}>
        <section className={styles.panel} aria-labelledby="recent-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="recent-heading" className={styles.panelTitle}>
                Dernières collectes
              </h2>
              <span className={styles.panelCaption}>activité terrain temps réel</span>
            </div>
          </header>
          {isLoading ? (
            <div style={{ padding: 'var(--space-4)' }}>
              <Skeleton height={220} />
            </div>
          ) : recentCollections.length === 0 ? (
            <p
              style={{
                padding: 'var(--space-5)',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Aucune collecte
            </p>
          ) : (
            <>
              {recentCollections.map((c) => (
                <Link
                  key={c.id}
                  to={`/collecte/${c.id}`}
                  className={styles.recentRow}
                >
                  <div className={styles.recentMain}>
                    <span className={styles.recentSite}>{c.siteName}</span>
                    <span className={styles.recentMeta}>
                      {usersById.get(c.agentId) ?? c.agentId} · {c.measurementsCount} mesures
                    </span>
                  </div>
                  <Badge size="sm" variant={STATUS_VARIANT[c.status]}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  <span className={styles.recentTime}>
                    {formatRelativeTime(c.collectedAt)}
                  </span>
                </Link>
              ))}
              <div className={styles.viewAll}>
                <Link to="/collecte">
                  <Button variant="ghost" iconRight={<ArrowRight size={14} />}>
                    Voir toutes les collectes
                  </Button>
                </Link>
              </div>
            </>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="alerts-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 id="alerts-heading" className={styles.panelTitle}>
                Alertes actives
              </h2>
              <span className={styles.panelCaption}>
                {activeAlerts.length} ouverte{activeAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
          </header>
          {activeAlerts.length === 0 ? (
            <p
              style={{
                padding: 'var(--space-5)',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Aucune alerte active
            </p>
          ) : (
            <>
              {activeAlerts.map((a) => {
                const site = sitesPage?.items.find((s) => s.id === a.siteId);
                return (
                  <Link key={a.id} to="/alertes" className={styles.alertRow}>
                    <span
                      className={styles.alertSeverity}
                      data-severity={a.severity}
                      aria-hidden="true"
                    />
                    <div className={styles.alertContent}>
                      <span className={styles.alertTitle}>{a.title}</span>
                      <span className={styles.alertMeta}>
                        {site?.shortName ?? '—'} · {formatRelativeTime(a.raisedAt)}
                      </span>
                      {a.recommendedAction ? (
                        <span className={styles.alertAction}>{a.recommendedAction}</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
              <div className={styles.viewAll}>
                <Link to="/alertes">
                  <Button variant="ghost" iconRight={<ArrowRight size={14} />}>
                    Voir toutes les alertes
                  </Button>
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
