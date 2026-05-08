import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Beaker, Clock } from 'lucide-react';
import { Badge, Button } from '@/components/common';
import { useSites } from '@/features/sites/hooks/useSites';
import type { Collection } from '../api/collection.types';
import { findRule } from '../lib/indicatorRules';
import { useCollections } from '../hooks/useCollections';
import { useLabs } from '../hooks/useLabs';
import styles from './LabBackorderWidget.module.css';

interface BackorderRow {
  collectionId: string;
  indicatorLabel: string;
  siteShortName: string;
  labLabel: string;
  daysLate: number;
  isOverdue: boolean;
}

function buildBackorderRows(
  collections: Collection[],
  sitesById: Map<string, string>,
  labsById: Map<string, string>,
): BackorderRow[] {
  const rows: BackorderRow[] = [];
  const now = Date.now();
  for (const collection of collections) {
    if (collection.status !== 'awaiting_lab' && collection.status !== 'submitted') continue;
    for (const m of collection.measurements) {
      if (m.acquisition !== 'lab_pending' || !m.sample) continue;
      const expected = m.sample.expectedBy ? new Date(m.sample.expectedBy).getTime() : null;
      if (expected === null) continue;
      const isOverdue = expected < now;
      if (!isOverdue) continue;
      const rule = findRule(m.indicatorId);
      rows.push({
        collectionId: collection.id,
        indicatorLabel: rule?.label ?? m.indicatorId,
        siteShortName: sitesById.get(collection.siteId) ?? collection.siteId,
        labLabel: m.sample.labId ? labsById.get(m.sample.labId) ?? m.sample.labId : '—',
        daysLate: Math.ceil((now - expected) / (1000 * 60 * 60 * 24)),
        isOverdue,
      });
    }
  }
  return rows.sort((a, b) => b.daysLate - a.daysLate);
}

export function LabBackorderWidget() {
  const { data: collectionsPage } = useCollections();
  const { data: sitesPage } = useSites();
  const { data: labs } = useLabs();

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesPage?.items.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const labsById = useMemo(() => {
    const map = new Map<string, string>();
    (labs ?? []).forEach((l) => map.set(l.id, `${l.name} — ${l.city}`));
    return map;
  }, [labs]);

  const rows = useMemo(
    () => buildBackorderRows(collectionsPage?.items ?? [], sitesById, labsById),
    [collectionsPage, sitesById, labsById],
  );

  return (
    <section className={styles.panel} aria-labelledby="lab-backorder-heading">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="lab-backorder-heading" className={styles.panelTitle}>
            Bordereaux laboratoire en retard
          </h2>
          <p className={styles.panelSubtitle}>
            Bordereaux dépassant le délai contractuel des laboratoires agréés.
          </p>
        </div>
        <Badge variant={rows.length > 0 ? 'danger' : 'success'} size="sm">
          {rows.length} en retard
        </Badge>
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <Beaker size={28} aria-hidden="true" />
          <p>Aucun bordereau en retard. Tous les laboratoires respectent leurs délais.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.slice(0, 6).map((row) => (
            <div key={`${row.collectionId}-${row.indicatorLabel}`} className={styles.row}>
              <span className={styles.indicator}>{row.indicatorLabel}</span>
              <span className={styles.site}>{row.siteShortName}</span>
              <span className={styles.lab}>{row.labLabel}</span>
              <span className={styles.delay}>
                <Clock size={12} aria-hidden="true" /> +{row.daysLate} j
              </span>
            </div>
          ))}
          {rows.length > 6 ? (
            <Link to="/alertes">
              <Button variant="ghost" size="sm">
                Voir les {rows.length - 6} retards supplémentaires
              </Button>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
