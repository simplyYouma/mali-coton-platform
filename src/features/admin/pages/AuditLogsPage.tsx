import { useMemo, useState } from 'react';
import {
  Badge,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/common';
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
  'site.create': 'Création site',
  'site.update': 'Modification site',
  'collection.submit': 'Soumission collecte',
  'collection.validate': 'Validation collecte',
  'collection.reject': 'Rejet collecte',
  'collection.lab_result': 'Résultat labo saisi',
  'threshold.update': 'Modification seuil',
};

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label })),
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'Toutes les ressources' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'site', label: 'Site' },
  { value: 'collection', label: 'Collecte' },
  { value: 'threshold', label: 'Seuil' },
  { value: 'auth', label: 'Authentification' },
];

const ROLE_VARIANT: Record<AuditLogEntry['actorRole'], 'success' | 'info' | 'warning'> = {
  admin: 'warning',
  superviseur: 'info',
  agent: 'success',
};

export function AuditLogsPage() {
  const [filter, setFilter] = useState<AuditFilter>({});
  const { data, isLoading } = useAuditLogs(filter);

  const items = useMemo(() => data?.items ?? [], [data]);

  const update = (patch: Partial<AuditFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Journal d'audit"
        description="Trace complète des actions sur la plateforme — auditabilité légale et conformité à la Loi malienne sur la protection des données."
      />

      <div className={styles.toolbar}>
        <Select
          options={ACTION_OPTIONS}
          value={filter.action ?? ''}
          onChange={(v) => update({ action: v || undefined })}
          placeholder="Action"
          aria-label="Filtrer par action"
        />
        <Select
          options={RESOURCE_OPTIONS}
          value={filter.resourceType ?? ''}
          onChange={(v) => update({ resourceType: v || undefined })}
          placeholder="Type de ressource"
          aria-label="Filtrer par ressource"
        />
        <Input
          type="date"
          value={filter.from?.slice(0, 10) ?? ''}
          onChange={(e) =>
            update({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })
          }
          aria-label="Du (date début)"
        />
        <Input
          type="date"
          value={filter.to?.slice(0, 10) ?? ''}
          onChange={(e) =>
            update({ to: e.target.value ? new Date(e.target.value).toISOString() : undefined })
          }
          aria-label="Au (date fin)"
        />
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <th>Ressource</th>
                <th>Détails</th>
                <th>Contexte</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td className={styles.timeCell} title={formatDateTime(entry.occurredAt)}>
                    {formatRelativeTime(entry.occurredAt)}
                  </td>
                  <td>
                    <div className={styles.actorCell}>
                      <span className={styles.actorName}>{entry.actorName}</span>
                      <Badge variant={ROLE_VARIANT[entry.actorRole]} size="sm">
                        {entry.actorRole}
                      </Badge>
                    </div>
                  </td>
                  <td>
                    <code className={styles.actionCode}>
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </code>
                  </td>
                  <td>
                    <div>
                      <span className={styles.resourceLabel}>
                        {entry.resourceLabel ?? entry.resourceType}
                      </span>
                      {entry.resourceId ? (
                        <div className={styles.resourceMeta}>{entry.resourceId}</div>
                      ) : null}
                    </div>
                  </td>
                  <td className={styles.detailsCell}>{entry.details ?? '—'}</td>
                  <td className={styles.contextCell}>
                    {entry.ipAddress ?? '—'}
                    {entry.userAgent ? <div>{entry.userAgent}</div> : null}
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
