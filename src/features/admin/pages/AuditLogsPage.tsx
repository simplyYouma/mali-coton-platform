import { useMemo, useState } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
import { Button, EmptyState, Input, Skeleton } from '@/components/common';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { useAuditLogs } from '../hooks/useAdmin';
import type { AuditFilter, AuditLogEntry } from '../api/admin.types';
import styles from './AuditLogsPage.module.css';

const ACTION_LABEL: Record<string, string> = {
  'user.login': 'Connexion',
  'user.logout': 'Déconnexion',
  'user.create': 'Création utilisateur',
  'user.update': 'Modification utilisateur',
  'user.delete': 'Suppression utilisateur',
  'role.update': 'Modification rôle',
  'site.create': 'Création site',
  'site.update': 'Modification site',
  'collection.import': 'Import collecte',
  'collection.submit': 'Soumission collecte',
  'collection.validate': 'Validation collecte',
  'collection.reject': 'Rejet collecte',
  'collection.correction_requested': 'Demande de correction',
  'collection.lab_result': 'Résultat labo saisi',
  'sample.transmitted': 'Bordereau labo transmis',
  'sample.sent': 'Échantillon envoyé',
  'sample.received': 'Échantillon reçu',
  'report.generated': 'Rapport généré',
  'threshold.update': 'Modification seuil',
  'alert.acknowledged': 'Alerte prise en compte',
  'alert.resolved': 'Alerte résolue',
};

type ResourceChip = '' | 'collection' | 'site' | 'user' | 'role' | 'alert' | 'sample' | 'report' | 'threshold' | 'auth';

const RESOURCE_CHIPS: Array<{ value: ResourceChip; label: string }> = [
  { value: '', label: 'Tout' },
  { value: 'collection', label: 'Collectes' },
  { value: 'site', label: 'Sites' },
  { value: 'sample', label: 'Échantillons' },
  { value: 'alert', label: 'Alertes' },
  { value: 'user', label: 'Utilisateurs' },
  { value: 'role', label: 'Rôles' },
  { value: 'report', label: 'Rapports' },
  { value: 'threshold', label: 'Seuils' },
  { value: 'auth', label: 'Auth' },
];

const ROLE_LABEL: Record<AuditLogEntry['actorRole'], string> = {
  admin: 'Admin',
  superviseur: 'Superviseur',
  agent: 'Agent',
  lab: 'Labo',
  visitor: 'Observateur',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AuditLogsPage() {
  const [filter, setFilter] = useState<AuditFilter>({});
  const [q, setQ] = useState('');
  const { data, isLoading } = useAuditLogs(filter);

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (!q) return list;
    const needle = q.toLowerCase();
    return list.filter(
      (e) =>
        e.actorName.toLowerCase().includes(needle) ||
        (e.resourceLabel ?? '').toLowerCase().includes(needle) ||
        (e.details ?? '').toLowerCase().includes(needle) ||
        (ACTION_LABEL[e.action] ?? e.action).toLowerCase().includes(needle),
    );
  }, [data, q]);

  const update = (patch: Partial<AuditFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Journal d'audit</h1>
          <span className={styles.heroCount}>
            {items.length} entrée{items.length > 1 ? 's' : ''}
          </span>
          <p className={styles.heroDescription}>
            Journal complet des actions tracées sur la plateforme.
          </p>
        </div>
        <div className={styles.heroRight}>
          <label className={styles.search}>
            <Search size={14} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher acteur, ressource, détail…"
              aria-label="Rechercher dans le journal"
            />
          </label>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            disabled={items.length === 0}
            onClick={() => {
              exportRowsToXlsx({
                filename: 'audit',
                sheetName: 'Audit',
                columns: [
                  { header: 'Horodatage', accessor: (e) => e.occurredAt },
                  { header: 'Acteur', accessor: (e) => e.actorName ?? e.actorId },
                  { header: 'Rôle', accessor: (e) => e.actorRole },
                  { header: 'Action', accessor: (e) => ACTION_LABEL[e.action] ?? e.action },
                  { header: 'Type ressource', accessor: (e) => e.resourceType },
                  { header: 'ID ressource', accessor: (e) => e.resourceId ?? '' },
                  { header: 'Libellé', accessor: (e) => e.resourceLabel ?? '' },
                  { header: 'Détails', accessor: (e) => e.details ?? '' },
                ],
                rows: items,
              });
            }}
          >
            Exporter XLSX
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.chips} role="tablist" aria-label="Filtrer par type">
          {RESOURCE_CHIPS.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              role="tab"
              aria-selected={(filter.resourceType ?? '') === c.value}
              className={`${styles.chip} ${(filter.resourceType ?? '') === c.value ? styles.chipActive : ''}`}
              onClick={() => update({ resourceType: c.value || undefined })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className={styles.dateRange}>
          <Input
            type="date"
            value={filter.from?.slice(0, 10) ?? ''}
            onChange={(e) =>
              update({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
            aria-label="Du"
          />
          <span className={styles.dateSep}>→</span>
          <Input
            type="date"
            value={filter.to?.slice(0, 10) ?? ''}
            onChange={(e) =>
              update({ to: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
            aria-label="Au"
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.skeletonStack}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune entrée"
            description="Aucune action ne correspond aux filtres sélectionnés."
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Quand</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Sur</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className={styles.row}>
                  <td className={styles.timeCell} title={formatDateTime(entry.occurredAt)}>
                    {formatRelativeTime(entry.occurredAt)}
                  </td>
                  <td>
                    <div className={styles.actor}>
                      <span className={`${styles.avatar} ${styles[`avatar-${entry.actorRole}`] ?? ''}`}>
                        {initials(entry.actorName)}
                      </span>
                      <div className={styles.actorInfo}>
                        <span className={styles.actorName}>{entry.actorName}</span>
                        <span className={styles.actorRole}>{ROLE_LABEL[entry.actorRole]}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.actionCell}>
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </td>
                  <td className={styles.resourceCell}>
                    {entry.resourceLabel ?? <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.detailsCell}>
                    {entry.details ?? <span className={styles.muted}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
