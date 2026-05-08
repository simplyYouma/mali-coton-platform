import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
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
import { getRecommendedAction } from '../lib/actionRules';
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

  const items = data?.items ?? [];
  const selected = useMemo(
    () => items.find((a) => a.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const stats = useMemo(() => {
    const critical = items.filter(
      (a) => a.status === 'active' && a.severity === 'critical',
    ).length;
    const warning = items.filter(
      (a) => a.status === 'active' && a.severity === 'warning',
    ).length;
    const resolved = items.filter((a) => a.status === 'resolved').length;
    return { critical, warning, resolved, total: items.length };
  }, [items]);

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
          <p className={styles.heroDescription}>
            Dépassements de seuils OMS et maliens, retards laboratoire et silences sites — toutes les actions
            sont tracées dans le journal d'audit.
          </p>
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
                      <span className={styles.rowSummary}>{alert.summary}</span>
                      <div className={styles.rowMeta}>
                        <span className={styles.rowSiteName}>
                          {siteName ?? CATEGORY_LABEL[alert.category]}
                        </span>
                        <span>·</span>
                        <span>{STATUS_LABEL[alert.status]}</span>
                      </div>
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
}

function AlertDetail({
  alert,
  siteName,
  canAct,
  onAcknowledge,
  onResolve,
  ackLoading,
  resolveLoading,
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
            <span>
              site <strong>{siteName}</strong>
            </span>
          ) : null}
          <span>levée {formatRelativeTime(alert.raisedAt)}</span>
          {alert.acknowledgedAt ? (
            <span>vue {formatRelativeTime(alert.acknowledgedAt)}</span>
          ) : null}
          {alert.resolvedAt ? (
            <span>résolue {formatRelativeTime(alert.resolvedAt)}</span>
          ) : null}
        </div>
        <p className={styles.detailDescription}>{alert.summary}</p>
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

        {(() => {
          const resolved = getRecommendedAction(alert, { siteName: siteName ?? undefined });
          if (!resolved) return null;
          return (
            <div className={styles.actionBlock}>
              <header className={styles.actionHead}>
                <span className={styles.actionLabel}>Action recommandée</span>
                <span className={styles.actionRule}>
                  <code>{resolved.ruleId}</code>
                </span>
              </header>
              <p className={styles.actionText}>{resolved.text}</p>
            </div>
          );
        })()}
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
            variant="primary"
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
