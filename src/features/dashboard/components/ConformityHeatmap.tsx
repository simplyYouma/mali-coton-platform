import { useMemo } from 'react';
import clsx from 'clsx';
import type { ConformityLevel } from '@/types/common';
import type { IndicatorDomain } from '@/features/collection/api/collection.types';
import styles from './ConformityHeatmap.module.css';

export interface HeatmapSite {
  id: string;
  shortName: string;
  meta?: string;
}

export interface HeatmapCellValue {
  level: ConformityLevel | null;
  /** Texte affiché dans la cellule (ex : "9.62" ou "—"). */
  display: string;
  /** Tooltip détaillé (source normative, dernière mesure). */
  tooltip?: string;
}

export interface ConformityHeatmapProps {
  sites: HeatmapSite[];
  domains: IndicatorDomain[];
  /** Cellule indexée par siteId puis domaine. */
  cells: Record<string, Partial<Record<IndicatorDomain, HeatmapCellValue>>>;
  domainLabels: Record<IndicatorDomain, string>;
}

const CELL_CLASS: Record<ConformityLevel, string> = {
  conforming: styles.cellConforming!,
  warning: styles.cellWarning!,
  critical: styles.cellCritical!,
};

export function ConformityHeatmap({
  sites,
  domains,
  cells,
  domainLabels,
}: ConformityHeatmapProps) {
  const gridTemplate = useMemo(
    () => `minmax(160px, 1.2fr) repeat(${domains.length}, minmax(72px, 1fr))`,
    [domains.length],
  );

  return (
    <div className={styles.heatmap}>
      <div className={styles.grid} style={{ gridTemplateColumns: gridTemplate }} role="table">
        <div className={clsx(styles.headerCell, styles.headerSite)} role="columnheader">
          Site
        </div>
        {domains.map((d) => (
          <div key={d} className={styles.headerCell} role="columnheader">
            {domainLabels[d]}
          </div>
        ))}

        {sites.map((site) => (
          <div key={site.id} style={{ display: 'contents' }} role="row">
            <div className={styles.siteCell}>
              <span>{site.shortName}</span>
              {site.meta ? <span className={styles.siteMeta}>{site.meta}</span> : null}
            </div>
            {domains.map((d) => {
              const cell = cells[site.id]?.[d];
              const level = cell?.level ?? null;
              return (
                <div
                  key={`${site.id}-${d}`}
                  className={clsx(
                    styles.cell,
                    level ? CELL_CLASS[level] : styles.cellEmpty,
                  )}
                  title={cell?.tooltip}
                  role="cell"
                  aria-label={`${site.shortName} · ${domainLabels[d]} · ${
                    level ? `niveau ${level}` : 'aucune donnée'
                  }`}
                >
                  {cell?.display ?? '—'}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.legend} aria-label="Légende des niveaux de conformité">
        <span className={styles.legendItem}>
          <span className={clsx(styles.legendDot, styles.legendDotConforming)} aria-hidden="true" />
          Conforme
        </span>
        <span className={styles.legendItem}>
          <span className={clsx(styles.legendDot, styles.legendDotWarning)} aria-hidden="true" />
          À surveiller
        </span>
        <span className={styles.legendItem}>
          <span className={clsx(styles.legendDot, styles.legendDotCritical)} aria-hidden="true" />
          Hors seuil
        </span>
      </div>
    </div>
  );
}
