import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  Clock,
  CloudOff,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  Select,
  Skeleton,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import type {
  AlertCategory,
  AlertEntry,
  AlertFilter,
  AlertSeverity,
  AlertStatus,
} from '../api/alerts.types';
import {
  useAcknowledgeAlert,
  useAlerts,
  useResolveAlert,
} from '../hooks/useAlerts';
import { formatAlertSummary } from '../lib/alertSummary';
import { mockUsers } from '@/mocks/fixtures/users';
import styles from './AlertsPage.module.css';

const SEVERITY_OPTIONS = [
  { value: '', label: 'Toutes sévérités' },
  { value: 'critical', label: 'Critique' },
  { value: 'warning', label: 'À surveiller' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous statuts' },
  { value: 'active', label: 'Actives' },
  { value: 'acknowledged', label: 'Prises en compte' },
  { value: 'resolved', label: 'Résolues' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes catégories' },
  { value: 'threshold_exceeded', label: 'Dépassement de seuil' },
  { value: 'lab_overdue', label: 'Bordereau labo en retard' },
  { value: 'site_silence', label: 'Silence site' },
  { value: 'data_quality', label: 'Qualité des données' },
];

const STATUS_LABEL: Record<AlertStatus, string> = {
  active: 'Active',
  acknowledged: 'Prise en compte',
  resolved: 'Résolue',
};

const CATEGORY_ICON: Record<AlertCategory, typeof AlertTriangle> = {
  threshold_exceeded: ShieldAlert,
  lab_overdue: Beaker,
  site_silence: CloudOff,
  data_quality: Eye,
};

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  threshold_exceeded: 'Seuil dépassé',
  lab_overdue: 'Bordereau en retard',
  site_silence: 'Silence site',
  data_quality: 'Qualité données',
};

export function AlertsPage() {
  const { user, role } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<AlertFilter>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useAlerts(filter);
  const { data: sitesPage } = useSites();
  const ackMut = useAcknowledgeAlert();
  const resolveMut = useResolveAlert();

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesPage?.items.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  /* Filtre par sites assignés au superviseur — l'admin et le visiteur voient tout */
  const scopedItems = useMemo(() => {
    const raw = data?.items ?? [];
    if (!user) return raw;
    if (user.role === 'admin' || user.role === 'visitor') return raw;
    if (user.assignedSiteIds.length === 0) return raw;
    return raw.filter((a) => !a.siteId || user.assignedSiteIds.includes(a.siteId));
  }, [data, user]);

  /* Filtre échéance : alertes actives >24h sans prise en compte */
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const items = useMemo(() => {
    if (!showOverdueOnly) return scopedItems;
    const now = Date.now();
    return scopedItems.filter((a) => {
      if (a.status !== 'active') return false;
      return now - new Date(a.raisedAt).getTime() > 24 * 3600_000;
    });
  }, [scopedItems, showOverdueOnly]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return scopedItems.filter(
      (a) => a.status === 'active' && now - new Date(a.raisedAt).getTime() > 24 * 3600_000,
    ).length;
  }, [scopedItems]);

  const selected = useMemo(
    () => items.find((a) => a.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    mockUsers.forEach((u) => m.set(u.id, u.fullName));
    return m;
  }, []);

  const stats = useMemo(() => {
    const critical = scopedItems.filter(
      (a) => a.status === 'active' && a.severity === 'critical',
    ).length;
    const warning = scopedItems.filter(
      (a) => a.status === 'active' && a.severity === 'warning',
    ).length;
    const resolved = scopedItems.filter((a) => a.status === 'resolved').length;
    return { critical, warning, resolved, total: scopedItems.length };
  }, [scopedItems]);

  const update = (patch: Partial<AlertFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const handleAcknowledge = async () => {
    if (!selected || !user) return;
    try {
      await ackMut.mutateAsync({ id: selected.id, input: { acknowledgedBy: user.id } });
      toast.info('Alerte prise en compte. Le suivi reste ouvert.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const handleResolve = async () => {
    if (!selected || !user) return;
    try {
      await resolveMut.mutateAsync({ id: selected.id, input: { resolvedBy: user.id } });
      toast.success('Alerte résolue.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const canAct = role === 'superviseur' || role === 'admin';

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Surveillance temps réel</span>
          <h1 className={styles.heroTitle}>Alertes</h1>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat} data-tone="critical">
            <span className={styles.heroStatValue}>{stats.critical}</span>
            <span className={styles.heroStatLabel}>Critiques</span>
          </div>
          <div className={styles.heroStat} data-tone="warning">
            <span className={styles.heroStatValue}>{stats.warning}</span>
            <span className={styles.heroStatLabel}>À surveiller</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{stats.resolved}</span>
            <span className={styles.heroStatLabel}>Résolues</span>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarSelect}>
          <Select<AlertSeverity | ''>
            options={SEVERITY_OPTIONS as Array<{ value: AlertSeverity | ''; label: string }>}
            value={filter.severity ?? ''}
            onChange={(v) => update({ severity: v || undefined })}
            placeholder="Sévérité"
            aria-label="Filtrer par sévérité"
          />
        </div>
        <div className={styles.toolbarSelect}>
          <Select<AlertStatus | ''>
            options={STATUS_OPTIONS as Array<{ value: AlertStatus | ''; label: string }>}
            value={filter.status ?? ''}
            onChange={(v) => update({ status: v || undefined })}
            placeholder="Statut"
            aria-label="Filtrer par statut"
          />
        </div>
        <div className={styles.toolbarSelect}>
          <Select<AlertCategory | ''>
            options={CATEGORY_OPTIONS as Array<{ value: AlertCategory | ''; label: string }>}
            value={filter.category ?? ''}
            onChange={(v) => update({ category: v || undefined })}
            placeholder="Catégorie"
            aria-label="Filtrer par catégorie"
          />
        </div>
        <button
          type="button"
          className={`${styles.overdueToggle} ${showOverdueOnly ? styles.overdueToggleActive : ''}`}
          onClick={() => setShowOverdueOnly((v) => !v)}
          aria-pressed={showOverdueOnly}
          title="Afficher uniquement les alertes actives sans prise en compte depuis > 24 h"
        >
          <Clock size={12} />
          Échéance dépassée
          {overdueCount > 0 ? <span className={styles.overdueBadge}>{overdueCount}</span> : null}
        </button>
      </div>

      {isLoading ? (
        <Skeleton height={420} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="Aucune alerte"
          description="Tous les sites sont conformes ou les filtres actuels ne renvoient aucun résultat."
        />
      ) : (
        <div className={styles.split}>
          <aside className={styles.list} aria-label="Liste des alertes">
            <header className={styles.listHeader}>
              <span className={styles.listTitle}>{items.length} alerte{items.length > 1 ? 's' : ''}</span>
              <span className={styles.listCount}>filtrées</span>
            </header>
            <div className={styles.listScroll}>
              {items.map((alert) => {
                const Icon = CATEGORY_ICON[alert.category];
                const isActive = (selected?.id ?? items[0]?.id) === alert.id;
                const siteName = alert.siteId ? sitesById.get(alert.siteId) : null;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    className={`${styles.row} ${isActive ? styles.rowSelected : ''}`}
                    onClick={() => setSelectedId(alert.id)}
                    aria-current={isActive ? 'true' : undefined}
                    data-severity={alert.severity}
                    data-status={alert.status}
                  >
                    <span className={styles.rowIcon} aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>{alert.title}</span>
                      <span className={styles.rowMeta}>
                        {siteName ?? CATEGORY_LABEL[alert.category]} · {STATUS_LABEL[alert.status]}
                      </span>
                    </div>
                    <span className={styles.rowAge} title={formatDateTime(alert.raisedAt)}>
                      {formatRelativeTime(alert.raisedAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.detail} aria-label="Détail de l'alerte">
            {!selected ? (
              <div className={styles.empty}>Sélectionnez une alerte pour voir le détail.</div>
            ) : (
              <AlertDetail
                alert={selected}
                siteName={selected.siteId ? sitesById.get(selected.siteId) ?? selected.siteId : null}
                canAct={canAct}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                ackLoading={ackMut.isPending}
                resolveLoading={resolveMut.isPending}
                userNameById={userNameById}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

interface AlertDetailProps {
  alert: AlertEntry;
  siteName: string | null;
  canAct: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  ackLoading: boolean;
  resolveLoading: boolean;
  userNameById: Map<string, string>;
}

function AlertDetail({
  alert,
  siteName,
  canAct,
  onAcknowledge,
  onResolve,
  ackLoading,
  resolveLoading,
  userNameById,
}: AlertDetailProps) {
  return (
    <>
      <header className={styles.detailHead}>
        <span className={styles.detailEyebrow} data-severity={alert.severity}>
          <AlertTriangle size={12} aria-hidden="true" />
          {alert.severity === 'critical' ? 'Alerte critique' : 'À surveiller'} ·{' '}
          {STATUS_LABEL[alert.status]}
        </span>
        <h2 className={styles.detailTitle}>{alert.title}</h2>
        <div className={styles.detailMeta}>
          {siteName ? (
            <span className={styles.detailSite}>
              site <strong>{siteName}</strong>
            </span>
          ) : null}
          <ul className={styles.detailTimeline} aria-label="Actions effectuées">
            <li className={styles.detailTimelineRow} data-step="raised">
              <span className={styles.detailTimelineDot} aria-hidden="true" />
              <span className={styles.detailTimelineLabel}>Levée</span>
              <span className={styles.detailTimelineTime}>
                {formatRelativeTime(alert.raisedAt)}
              </span>
            </li>
            {alert.acknowledgedAt ? (
              <li className={styles.detailTimelineRow} data-step="acknowledged">
                <span className={styles.detailTimelineDot} aria-hidden="true" />
                <span className={styles.detailTimelineLabel}>Vue</span>
                <span className={styles.detailTimelineTime}>
                  {formatRelativeTime(alert.acknowledgedAt)}
                </span>
              </li>
            ) : null}
            {alert.resolvedAt ? (
              <li className={styles.detailTimelineRow} data-step="resolved">
                <span className={styles.detailTimelineDot} aria-hidden="true" />
                <span className={styles.detailTimelineLabel}>Résolue</span>
                <span className={styles.detailTimelineTime}>
                  {formatRelativeTime(alert.resolvedAt)}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
        <p className={styles.detailDescription}>{formatAlertSummary(alert)}</p>
      </header>

      <div className={styles.detailBody}>
        {alert.measured ? (
          <section className={styles.measurementBlock} aria-label="Mesure vs seuil">
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Valeur mesurée</span>
              <span className={`${styles.metricValue} ${styles.metricMeasured}`}>
                {alert.measured.value}
                {alert.measured.unit ? (
                  <span className={styles.metricUnit}>{alert.measured.unit}</span>
                ) : null}
              </span>
            </div>
            {alert.threshold ? (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>
                  Seuil ({alert.threshold.comparator})
                </span>
                <span className={styles.metricValue}>
                  {alert.threshold.value}
                  {alert.threshold.unit ? (
                    <span className={styles.metricUnit}>{alert.threshold.unit}</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {alert.thresholdSource ? (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Source normative</span>
                <span className={styles.metricSource}>{alert.thresholdSource}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        <AlertTimeline alert={alert} userNameById={userNameById} />
      </div>

      {canAct && alert.status !== 'resolved' ? (
        <footer className={styles.actions}>
          {alert.status === 'active' ? (
            <Button
              variant="ghost"
              iconLeft={<Eye size={14} />}
              onClick={onAcknowledge}
              loading={ackLoading}
            >
              Prendre en compte
            </Button>
          ) : null}
          <Button
            variant="success"
            iconLeft={<CheckCircle2 size={14} />}
            onClick={onResolve}
            loading={resolveLoading}
          >
            Marquer résolue
          </Button>
        </footer>
      ) : null}
    </>
  );
}

interface AlertTimelineProps {
  alert: AlertEntry;
  userNameById: Map<string, string>;
}

function AlertTimeline({ alert, userNameById }: AlertTimelineProps) {
  const events: Array<{
    label: string;
    when: string;
    who?: string;
    tone: 'raised' | 'ack' | 'resolved';
  }> = [];

  events.push({
    label: 'Alerte levée',
    when: alert.raisedAt,
    tone: 'raised',
  });
  if (alert.acknowledgedAt) {
    events.push({
      label: 'Prise en compte',
      when: alert.acknowledgedAt,
      who: alert.acknowledgedBy ? userNameById.get(alert.acknowledgedBy) ?? alert.acknowledgedBy : undefined,
      tone: 'ack',
    });
  }
  if (alert.resolvedAt) {
    events.push({
      label: 'Résolue',
      when: alert.resolvedAt,
      who: alert.resolvedBy ? userNameById.get(alert.resolvedBy) ?? alert.resolvedBy : undefined,
      tone: 'resolved',
    });
  }

  return (
    <section className={styles.timeline} aria-label="Historique de l'alerte">
      <span className={styles.timelineLabel}>Historique</span>
      <ol className={styles.timelineList}>
        {events.map((e, i) => (
          <li key={i} className={styles.timelineItem} data-tone={e.tone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div className={styles.timelineContent}>
              <span className={styles.timelineEventLabel}>{e.label}</span>
              <span className={styles.timelineMeta}>
                {formatDateTime(e.when, 'dd MMM HH:mm')}
                {e.who ? ` · ${e.who}` : ''}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
