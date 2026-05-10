import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Star, Clock, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/common';
import type { Site } from '../api/site.types';
import { SITE_TYPE_SHORT } from '../api/site.types';
import { ConformityBadge } from './ConformityBadge';
import { formatRelativeTime } from '@/lib/format';
import styles from './SiteCard.module.css';

export interface SiteCardProps {
  site: Site;
  onEdit?: (site: Site) => void;
  onDelete?: (site: Site) => void;
}

export function SiteCard({ site, onEdit, onDelete }: SiteCardProps) {
  const stop = (handler?: (s: Site) => void) => (e: MouseEvent) => {
    if (!handler) return;
    e.preventDefault();
    e.stopPropagation();
    handler(site);
  };

  const adminActions: ReactNode | null =
    onEdit || onDelete ? (
      <div className={styles.adminActions}>
        {onEdit ? (
          <IconButton
            aria-label={`Modifier ${site.shortName}`}
            variant="ghost"
            onClick={stop(onEdit)}
          >
            <Pencil size={14} />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton
            aria-label={`Supprimer ${site.shortName}`}
            variant="ghost"
            onClick={stop(onDelete)}
          >
            <Trash2 size={14} />
          </IconButton>
        ) : null}
      </div>
    ) : null;

  /* Sous-titre nettoyé : on retire le shortName qui est déjà dans le titre */
  const subtitle = site.name
    .replace(`${site.shortName} — `, '')
    .replace(`${site.shortName} `, '')
    .trim();

  return (
    <Link
      to={`/sites/${site.id}`}
      className={styles.card}
      data-conformity={site.conformity}
      aria-label={`Détail du site ${site.shortName}`}
    >
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          {site.isReference ? (
            <span className={styles.refMark}>
              <Star size={10} aria-hidden="true" />
              Site de référence
            </span>
          ) : null}
          <h3 className={styles.title}>{site.shortName}</h3>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {adminActions}
      </header>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <MapPin size={14} aria-hidden="true" />
            {site.location.commune}, {site.location.city}
          </span>
          <span className={styles.metaType}>{SITE_TYPE_SHORT[site.type]}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <Users size={14} aria-hidden="true" />
            {site.workforce} membres
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            depuis {site.createdYear}
          </span>
        </div>
      </div>

      <footer className={styles.footer}>
        <ConformityBadge level={site.conformity} size="sm" />
        <span className={styles.lastUpdate}>
          <Clock size={11} aria-hidden="true" />
          {site.lastCollectionAt ? formatRelativeTime(site.lastCollectionAt) : 'jamais'}
        </span>
      </footer>
    </Link>
  );
}
