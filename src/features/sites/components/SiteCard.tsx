import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Clock, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Badge, IconButton } from '@/components/common';
import type { Site } from '../api/site.types';
import { SITE_SOURCE_LABEL, SITE_TYPE_SHORT } from '../api/site.types';
import { ConformityBadge } from './ConformityBadge';
import { formatRelativeTime } from '@/lib/format';
import styles from './SiteCard.module.css';

export interface SiteCardProps {
  site: Site;
  onEdit?: (site: Site) => void;
  onDelete?: (site: Site) => void;
  /** Absent = action masquée, pas grisée — décidé par l'appelant via `peut()`. */
  onToggleActif?: (site: Site) => void;
}

export function SiteCard({ site, onEdit, onDelete, onToggleActif }: SiteCardProps) {
  const stop = (handler?: (s: Site) => void) => (e: MouseEvent) => {
    if (!handler) return;
    e.preventDefault();
    e.stopPropagation();
    handler(site);
  };

  const adminActions: ReactNode | null =
    onEdit || onDelete || onToggleActif ? (
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
        {onToggleActif ? (
          <IconButton
            aria-label={site.actif ? `Désactiver ${site.shortName}` : `Réactiver ${site.shortName}`}
            variant="ghost"
            onClick={stop(onToggleActif)}
          >
            {site.actif ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        ) : null}
        {/* Séparée visuellement de désactiver/réactiver : les deux actions ne
         * se rattrapent pas de la même façon (l'une réversible, l'autre non). */}
        {onDelete ? (
          <IconButton
            aria-label={`Supprimer ${site.shortName}`}
            variant="ghost"
            className={styles.deleteAction}
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
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{site.shortName}</h3>
            {/* Se lit sans ouvrir la fiche — c'est le point du badge. */}
            {!site.actif ? (
              <Badge size="sm" variant="neutral">Inactif</Badge>
            ) : null}
          </div>
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
          <span className={styles.metaGroup}>
            {/* Discret : les deux provenances coexistent dans le même
             * référentiel mais n'offrent pas le même niveau de détail — le
             * savoir avant d'ouvrir la fiche évite de la croire incomplète. */}
            <span className={styles.metaSource}>{SITE_SOURCE_LABEL[site.source]}</span>
            <span className={styles.metaType}>{SITE_TYPE_SHORT[site.type]}</span>
          </span>
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
