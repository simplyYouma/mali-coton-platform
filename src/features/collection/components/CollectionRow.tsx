import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Beaker,
  CheckCircle2,
  FlaskConical,
  Inbox,
  MapPin,
  Pencil,
  XCircle,
} from 'lucide-react';
import {
  STATUS_LABEL,
  type Collection,
  type CollectionStatus,
} from '../api/collection.types';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import styles from './CollectionRow.module.css';

interface SiteSummary {
  id: string;
  shortName: string;
  city: string;
}

export interface CollectionRowProps {
  collection: Collection;
  site?: SiteSummary;
  agentName?: string;
  href?: string;
}

const STATUS_ICONS: Record<CollectionStatus, typeof Inbox> = {
  submitted: Inbox,
  awaiting_lab: FlaskConical,
  lab_complete: Beaker,
  needs_correction: Pencil,
  validated: CheckCircle2,
  rejected: XCircle,
};

export function CollectionRow({ collection, site, agentName, href }: CollectionRowProps) {
  const phMeasurement = collection.measurements.find((m) => m.indicatorId === 'water.ph');
  const StatusIcon = STATUS_ICONS[collection.status];

  const content = (
    <>
      <span className={styles.statusDot} aria-hidden="true">
        <StatusIcon size={14} />
      </span>

      <div className={styles.mainCol}>
        <span className={styles.siteLine}>
          {site?.shortName ?? collection.siteId}
          {site?.city ? <span className={styles.siteCity}>· {site.city}</span> : null}
        </span>
        <span className={styles.statusLabel}>{STATUS_LABEL[collection.status]}</span>
      </div>

      <div className={styles.metaCol}>
        <span className={styles.metaTop}>
          <span className={styles.id}>{collection.id}</span>
          {agentName ? <span>par {agentName}</span> : null}
        </span>
        {collection.gps ? (
          <span className={styles.gps}>
            <MapPin size={11} aria-hidden="true" />
            {collection.gps.lat.toFixed(3)}°, {collection.gps.lng.toFixed(3)}°
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-disabled)' }}>GPS non capturé</span>
        )}
      </div>

      {phMeasurement && typeof phMeasurement.value === 'number' ? (
        <span className={styles.measuresCol}>
          <span className={styles.measureLabel}>pH</span>
          <span className={styles.measureValue}>{phMeasurement.value.toFixed(2)}</span>
        </span>
      ) : (
        <span className={styles.measureEmpty}>—</span>
      )}

      <div className={styles.dateCol}>
        <span className={styles.dateValue}>
          {formatDateTime(collection.collectedAt, 'dd MMM · HH:mm')}
        </span>
        <span className={styles.dateRelative}>
          {formatRelativeTime(collection.collectedAt)}
        </span>
      </div>

      {href ? (
        <span className={styles.arrow} aria-hidden="true">
          <ArrowUpRight size={14} />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={styles.row} data-status={collection.status}>
        {content}
      </Link>
    );
  }
  return (
    <div className={styles.row} data-status={collection.status}>
      {content}
    </div>
  );
}
