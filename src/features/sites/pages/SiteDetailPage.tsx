import { useMemo, useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
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

  const photos = useMemo(() => {
    /* Agrégation : toutes les photos des collectes du site, ordonnées par date */
    const all: Array<{ url: string; collectionId: string; date: string }> = [];
    siteCollections.forEach((c) => {
      c.photos.forEach((p) => {
        all.push({ url: p.url, collectionId: c.id, date: c.collectedAt });
      });
    });
    return all;
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
    if (!window.confirm(`Supprimer définitivement ${site.shortName} ?`)) return;
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

      <section className={styles.summary}>
        <div className={styles.summaryItem}>
          <p className={styles.summaryLabel}>Localisation</p>
          <p className={styles.summaryValue}>
            <MapPin size={14} aria-hidden="true" />
            {site.location.commune}, {site.location.city}
          </p>
          <p className={`${styles.summaryHint} mono`}>
            {formatGps(site.coordinates.lat, site.coordinates.lng)}
          </p>
        </div>
        <div className={styles.summaryItem}>
          <p className={styles.summaryLabel}>Effectif</p>
          <p className={styles.summaryValue}>
            <Users size={14} aria-hidden="true" />
            {site.workforce} membres
          </p>
          <p className={styles.summaryHint}>
            Statut juridique : {site.legalStatus === 'formel' ? 'Formel' : 'Informel'}
          </p>
        </div>
        <div className={styles.summaryItem}>
          <p className={styles.summaryLabel}>Année de création</p>
          <p className={styles.summaryValue}>
            <Calendar size={14} aria-hidden="true" />
            {site.createdYear}
          </p>
          <p className={styles.summaryHint}>
            {siteCollections.length} collecte{siteCollections.length > 1 ? 's' : ''} enregistrée
            {siteCollections.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className={styles.summaryItem}>
          <p className={styles.summaryLabel}>Conformité globale</p>
          <p className={styles.summaryValue}>
            <ConformityBadge level={site.conformity} size="md" withDot />
          </p>
          <p className={styles.summaryHint}>
            Dernière collecte ·{' '}
            {site.lastCollectionAt ? formatRelativeTime(site.lastCollectionAt) : '—'}
          </p>
        </div>
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
                    <ConformityBadge level={site.conformityByDomain[d.key]} size="sm" withDot />
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
