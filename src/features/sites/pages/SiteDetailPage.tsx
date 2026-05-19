import { useMemo, useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  Star,
  Droplet,
  Mountain,
  Wind,
  Trash2,
  HeartPulse,
  ClipboardList,
  ImageOff,
  Pencil,
} from 'lucide-react';
import {
  Button,
  Tabs,
  Skeleton,
  EmptyState,
  Badge,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { mockUsers } from '@/mocks/fixtures/users';
import { findRule, computeLocalConformity } from '@/features/collection/lib/indicatorRules';
import type {
  Collection,
  Measurement,
} from '@/features/collection/api/collection.types';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import type { ConformityLevel } from '@/types/common';
import { useSite, useDeleteSite } from '../hooks/useSites';
import { ConformityBadge } from '../components/ConformityBadge';
import { SiteForm } from '../components/SiteForm';
import { SITE_TYPE_LABEL } from '../api/site.types';
import { formatRelativeTime, formatDateTime, formatGps } from '@/lib/format';
import styles from './SiteDetailPage.module.css';

const DOMAINS: Array<{
  key: 'water' | 'soil' | 'air' | 'waste' | 'health';
  label: string;
  icon: ReactNode;
}> = [
  { key: 'water', label: 'Eaux usées', icon: <Droplet size={16} /> },
  { key: 'soil', label: 'Sol', icon: <Mountain size={16} /> },
  { key: 'air', label: 'Qualité de l\'air', icon: <Wind size={16} /> },
  { key: 'waste', label: 'Déchets solides', icon: <Trash2 size={16} /> },
  { key: 'health', label: 'Santé & sécurité', icon: <HeartPulse size={16} /> },
];

function highlightsOf(measurements: Measurement[]): string {
  const sample = measurements
    .slice(0, 3)
    .map((m) => {
      const rule = findRule(m.indicatorId);
      const label = rule?.label ?? m.indicatorId;
      const v = m.value === null || m.value === undefined ? '—' : m.value;
      const unit = m.unit ?? rule?.unit ?? '';
      return `${label}: ${v}${unit ? ' ' + unit : ''}`;
    })
    .join(' · ');
  return sample || '—';
}

function worstConformity(measurements: Measurement[]): ConformityLevel {
  let worst: ConformityLevel = 'conforming';
  for (const m of measurements) {
    const rule = findRule(m.indicatorId);
    if (!rule) continue;
    const v = typeof m.value === 'number' ? m.value : Number(m.value);
    if (!Number.isFinite(v)) continue;
    const level = computeLocalConformity(rule, v);
    if (level === 'critical') return 'critical';
    if (level === 'warning' && worst === 'conforming') worst = 'warning';
  }
  return worst;
}

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: site, isLoading, isError } = useSite(id);
  const deleteMut = useDeleteSite();

  const { data: collectionsPage } = useCollections({ siteId: id });
  const siteCollections = useMemo(
    () =>
      [...(collectionsPage?.items ?? [])].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      ),
    [collectionsPage],
  );

  const [tab, setTab] = useState<'overview' | 'history' | 'photos'>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const isAdmin = role === 'admin';

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const siteMetrics = useMemo(() => {
    const windowDays = 60;
    const dayMs = 86_400_000;
    const now = Date.now();
    const cutoff = now - windowDays * dayMs;
    const cutoffPrev = now - 2 * windowDays * dayMs;

    const ordered = [...siteCollections].sort(
      (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
    );

    const phSeries: number[] = [];
    const pm25Series: number[] = [];
    for (const c of ordered.slice(-12)) {
      const ph = c.measurements.find((m) => m.indicatorId === 'water.ph')?.value;
      const pm = c.measurements.find((m) => m.indicatorId === 'air.pm25')?.value;
      if (typeof ph === 'number') phSeries.push(ph);
      if (typeof pm === 'number') pm25Series.push(pm);
    }

    const latestPh = phSeries.at(-1) ?? null;
    const latestPm25 = pm25Series.at(-1) ?? null;

    /* Sparkline collectes : 6 buckets sur la fenêtre */
    const buckets = 6;
    const bucketMs = (windowDays * dayMs) / buckets;
    const collectionsSpark = Array(buckets).fill(0) as number[];
    let collectionsCount = 0;
    let collectionsPrev = 0;
    for (const c of siteCollections) {
      const t = new Date(c.collectedAt).getTime();
      if (t >= cutoff) {
        collectionsCount += 1;
        const idx = Math.min(buckets - 1, Math.floor((t - cutoff) / bucketMs));
        collectionsSpark[idx] = (collectionsSpark[idx] ?? 0) + 1;
      } else if (t >= cutoffPrev) {
        collectionsPrev += 1;
      }
    }
    const collectionsTrend =
      collectionsPrev > 0
        ? Math.round(((collectionsCount - collectionsPrev) / collectionsPrev) * 100)
        : 0;

    return {
      windowDays,
      collectionsCount,
      collectionsPrev,
      collectionsTrend,
      collectionsSpark,
      phSeries,
      pm25Series,
      latestPh,
      latestPm25,
    };
  }, [siteCollections]);

  const photos = useMemo(() => {
    /* Agrégation déduplicquée : une URL n'apparaît qu'une fois (la collecte la plus récente). */
    const seen = new Map<string, { url: string; collectionId: string; date: string }>();
    siteCollections.forEach((c) => {
      c.photos.forEach((p) => {
        if (seen.has(p.url)) return;
        seen.set(p.url, { url: p.url, collectionId: c.id, date: c.collectedAt });
      });
    });
    return Array.from(seen.values());
  }, [siteCollections]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton height={48} width="40%" />
        <Skeleton height={200} radius={14} />
      </div>
    );
  }

  if (isError || !site) {
    return (
      <EmptyState
        title="Site introuvable"
        description="Ce site n'existe pas ou a été supprimé."
        action={
          <Link to="/sites">
            <Button variant="secondary" iconLeft={<ArrowLeft size={16} />}>
              Retour à la liste
            </Button>
          </Link>
        }
      />
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Supprimer ${site.shortName} ?`,
      message: 'Suppression définitive du site et de toutes ses données associées.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(site.id);
      toast.success(`${site.shortName} supprimé.`);
      window.location.href = '/sites';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  return (
    <>
      <Link to="/sites" className={styles.back}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Tous les sites</span>
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            {site.isReference ? (
              <span className={styles.refMark}>
                <Star size={11} aria-hidden="true" /> Site de référence
              </span>
            ) : null}
            {SITE_TYPE_LABEL[site.type]}
          </span>
          <h1 className={styles.heroTitle}>{site.shortName}</h1>
          {site.description ? (
            <p className={styles.heroDescription}>{site.description}</p>
          ) : null}
        </div>
        <div className={styles.heroActions}>
          {isAdmin ? (
            <>
              <Button
                variant="secondary"
                iconLeft={<Pencil size={16} />}
                onClick={() => setEditOpen(true)}
              >
                Modifier
              </Button>
              <Button variant="ghost" onClick={handleDelete} loading={deleteMut.isPending}>
                Supprimer
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {/* ── Info strip compact ── */}
      <section className={styles.infoStrip} aria-label="Informations site">
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Localisation</span>
          <span className={styles.infoValue}>
            <MapPin size={12} aria-hidden="true" />
            {site.location.commune}, {site.location.city}
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Effectif</span>
          <span className={styles.infoValue}>
            <Users size={12} aria-hidden="true" />
            {site.workforce} membres
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Statut</span>
          <span className={styles.infoValue}>
            {site.legalStatus === 'formel' ? 'Formel' : 'Informel'} · {site.createdYear}
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>GPS</span>
          <span className={`${styles.infoValue} mono`}>
            {formatGps(site.coordinates.lat, site.coordinates.lng)}
          </span>
        </div>
      </section>

      {/* ── Cartes metrics avec sparklines ── */}
      <section className={styles.metricGrid} aria-label="Indicateurs clés">
        <MetricCard
          label="Conformité"
          value={
            site.conformity === 'conforming'
              ? 'Conforme'
              : site.conformity === 'warning'
                ? 'À surveiller'
                : 'Hors seuil'
          }
          tone={
            site.conformity === 'conforming'
              ? 'ok'
              : site.conformity === 'warning'
                ? 'warn'
                : 'crit'
          }
          caption={
            site.lastCollectionAt
              ? `dernière · ${formatRelativeTime(site.lastCollectionAt)}`
              : 'aucune collecte'
          }
        />
        <MetricCard
          label={`Collectes ${siteMetrics.windowDays} j`}
          value={String(siteMetrics.collectionsCount)}
          caption={
            siteMetrics.collectionsTrend === 0
              ? `précédent · ${siteMetrics.collectionsPrev}`
              : `${siteMetrics.collectionsTrend > 0 ? '+' : ''}${siteMetrics.collectionsTrend}% vs ${siteMetrics.windowDays} j`
          }
          spark={siteMetrics.collectionsSpark}
          sparkColor="var(--color-primary)"
        />
        <MetricCard
          label="pH eaux usées"
          value={
            siteMetrics.latestPh != null ? siteMetrics.latestPh.toFixed(2) : '—'
          }
          tone={
            siteMetrics.latestPh == null
              ? undefined
              : siteMetrics.latestPh > 8.5 || siteMetrics.latestPh < 6.5
                ? 'crit'
                : siteMetrics.latestPh > 8.2 || siteMetrics.latestPh < 6.8
                  ? 'warn'
                  : 'ok'
          }
          caption={`OMS 6,5 – 8,5`}
          spark={siteMetrics.phSeries}
          sparkColor="var(--chart-2)"
        />
        <MetricCard
          label="PM2,5 air"
          value={
            siteMetrics.latestPm25 != null
              ? `${siteMetrics.latestPm25.toFixed(0)}`
              : '—'
          }
          unit={siteMetrics.latestPm25 != null ? 'µg/m³' : undefined}
          tone={
            siteMetrics.latestPm25 == null
              ? undefined
              : siteMetrics.latestPm25 > 25
                ? 'crit'
                : siteMetrics.latestPm25 > 20
                  ? 'warn'
                  : 'ok'
          }
          caption="OMS 25 µg/m³ · 24 h"
          spark={siteMetrics.pm25Series}
          sparkColor="var(--chart-5)"
        />
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Vue d\'ensemble' },
          { value: 'history', label: 'Historique', badge: siteCollections.length || undefined },
          { value: 'photos', label: 'Photos', badge: photos.length || undefined },
        ]}
        aria-label="Sections de la fiche site"
      />

      <div className={styles.body}>
        {tab === 'overview' ? (
          <div className={styles.split}>
            <section className={styles.panel} aria-labelledby="domains-heading">
              <header className={styles.panelHeader}>
                <h2 id="domains-heading" className={styles.panelTitle}>
                  Conformité par domaine
                </h2>
                <Badge variant="neutral" size="sm">
                  Sources : OMS · Normes maliennes
                </Badge>
              </header>
              <ul className={styles.domainList}>
                {DOMAINS.map((d) => (
                  <li key={d.key} className={styles.domainRow}>
                    <span className={styles.domainIcon} aria-hidden="true">
                      {d.icon}
                    </span>
                    <span className={styles.domainLabel}>{d.label}</span>
                    <ConformityBadge level={site.conformityByDomain[d.key]} size="sm" />
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.panel} aria-labelledby="loc-heading">
              <header className={styles.panelHeader}>
                <h2 id="loc-heading" className={styles.panelTitle}>
                  Localisation
                </h2>
                <Link to="/cartographie">
                  <Button variant="ghost" size="sm">
                    Ouvrir dans la carte
                  </Button>
                </Link>
              </header>
              <div className={styles.mapPreview}>
                <div className={styles.mapDot} aria-hidden="true">
                  <MapPin size={20} />
                </div>
                <div className={styles.mapInfo}>
                  <p className={styles.mapTitle}>{site.shortName}</p>
                  <p className={styles.mapSubtitle}>
                    {site.location.address ? `${site.location.address} · ` : ''}
                    {site.location.commune}, {site.location.city}
                  </p>
                  <p className={`${styles.mapCoords} mono`}>
                    {formatGps(site.coordinates.lat, site.coordinates.lng)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'history' ? (
          <section className={styles.panel} aria-label="Historique des collectes">
            {siteCollections.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={24} />}
                title="Aucune collecte enregistrée"
                description="Ce site n'a pas encore été visité par un agent."
              />
            ) : (
              <ul className={styles.timeline}>
                {siteCollections.slice(0, 12).map((entry: Collection, i) => {
                  const conformity = worstConformity(entry.measurements);
                  const isLast = i === Math.min(siteCollections.length, 12) - 1;
                  return (
                    <li key={entry.id} className={styles.timelineItem}>
                      <span
                        className={styles.timelineDot}
                        data-conformity={conformity}
                        aria-hidden="true"
                      />
                      {!isLast ? <span className={styles.timelineLine} aria-hidden="true" /> : null}
                      <div className={styles.timelineCard}>
                        <header className={styles.timelineHeader}>
                          <div>
                            <p className={styles.timelineDate}>
                              {formatDateTime(entry.collectedAt)}
                            </p>
                            <p className={styles.timelineAgent}>
                              par {usersById.get(entry.agentId) ?? entry.agentId}
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANT[entry.status]} size="sm">
                            {STATUS_LABEL[entry.status]}
                          </Badge>
                        </header>
                        <p className={styles.timelineHighlights}>
                          {highlightsOf(entry.measurements)}
                        </p>
                        <footer className={styles.timelineFooter}>
                          <ConformityBadge level={conformity} size="sm" />
                          <Link to={`/collecte/${entry.id}`}>
                            <Button variant="ghost" size="sm">
                              Détail de la collecte
                            </Button>
                          </Link>
                        </footer>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {tab === 'photos' ? (
          photos.length === 0 ? (
            <EmptyState
              icon={<ImageOff size={24} />}
              title="Pas encore de photos pour ce site"
              description="Les photos sont prises horodatées par les agents lors de la collecte terrain. Elles apparaîtront ici une fois synchronisées."
            />
          ) : (
            <div className={styles.photoGrid}>
              {photos.map((p) => (
                <Link
                  key={`${p.collectionId}-${p.url}`}
                  to={`/collecte/${p.collectionId}`}
                  className={styles.photoCard}
                >
                  <img src={p.url} alt="Collecte terrain" />
                  <span className={styles.photoMeta}>
                    {formatRelativeTime(p.date)}
                  </span>
                </Link>
              ))}
            </div>
          )
        ) : null}
      </div>

      {isAdmin ? (
        <SiteForm open={editOpen} onClose={() => setEditOpen(false)} site={site} />
      ) : null}
    </>
  );
}

/* ─────────── Metric Card + Sparkline ─────────── */

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  tone?: 'ok' | 'warn' | 'crit';
  spark?: number[];
  sparkColor?: string;
}

function MetricCard({ label, value, unit, caption, tone, spark, sparkColor }: MetricCardProps) {
  return (
    <div className={styles.metricCard} data-tone={tone}>
      <span className={styles.metricLabel}>{label}</span>
      <div className={styles.metricValueRow}>
        <span className={styles.metricValue}>{value}</span>
        {unit ? <span className={styles.metricUnit}>{unit}</span> : null}
      </div>
      <div className={styles.metricFoot}>
        {caption ? <span className={styles.metricCaption}>{caption}</span> : null}
        {spark && spark.length > 1 ? (
          <Sparkline values={spark} color={sparkColor ?? 'var(--color-primary)'} />
        ) : null}
      </div>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 60;
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
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={styles.sparkline} aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
