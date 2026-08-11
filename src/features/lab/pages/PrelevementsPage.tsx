import { useMemo, useState } from 'react';
import { FileSpreadsheet, Pipette } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@/components/common';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { formatDateTime } from '@/lib/format';
import { useSites } from '@/features/sites/hooks/useSites';
import { usePrelevements } from '../hooks/useLaboratoire';
import {
  TYPE_PRELEVEMENT_LABEL,
  STATUT_PRELEVEMENT_LABEL,
  STATUT_PRELEVEMENT_VARIANT,
} from '../api/laboratoire';
import styles from './PrelevementsPage.module.css';

export function PrelevementsPage() {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const { data: sitesPage } = useSites();
  const { data: page, isLoading } = usePrelevements({
    site: siteFilter || undefined,
    typePrelevement: typeFilter || undefined,
    statut: statutFilter || undefined,
  });

  const sites = sitesPage?.items ?? [];

  // Carte siteId → nom court pour affichage
  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sites.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sites]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (page?.items ?? []).filter((p) => {
      if (!q) return true;
      return (
        p.codePrelevement.toLowerCase().includes(q) ||
        (sitesById.get(p.siteId) ?? p.siteId).toLowerCase().includes(q) ||
        (p.pointPrelevement ?? '').toLowerCase().includes(q)
      );
    });
  }, [page, search, sitesById]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Prélèvements</h1>
          <span className={styles.heroCount}>{page?.total ?? 0} au total</span>
          <p className={styles.heroDesc}>
            Suivi des prélèvements terrain : eau usée, sédiment, sol, air.
          </p>
        </div>
        <Button
          variant="excel"
          iconLeft={<FileSpreadsheet size={16} />}
          disabled={items.length === 0}
          onClick={() =>
            exportRowsToXlsx({
              filename: 'prelevements',
              sheetName: 'Prélèvements',
              columns: [
                { header: 'Code', accessor: (p) => p.codePrelevement },
                { header: 'Site', accessor: (p) => sitesById.get(p.siteId) ?? p.siteId },
                {
                  header: 'Type',
                  accessor: (p) =>
                    TYPE_PRELEVEMENT_LABEL[p.typePrelevement] ?? p.typePrelevement,
                },
                { header: 'Point', accessor: (p) => p.pointPrelevement ?? '' },
                { header: 'Méthode', accessor: (p) => p.methodePrelevement ?? '' },
                { header: 'Date', accessor: (p) => p.datePrelevement },
                {
                  header: 'Statut',
                  accessor: (p) => STATUT_PRELEVEMENT_LABEL[p.statut] ?? p.statut,
                },
                { header: 'Source', accessor: (p) => p.source ?? '' },
                { header: 'Échantillons', accessor: (p) => p.nombreEchantillons },
              ],
              rows: items,
            })
          }
        >
          Exporter XLSX
        </Button>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder="Rechercher code, site, point…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
        >
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.shortName}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {(['EAU_USEE', 'EAU_SURFACE', 'EAU_SOUTERRAINE', 'EAU_PLUIE', 'SEDIMENT', 'SOL', 'AIR', 'DECHETS'] as const).map((k) => (
            <option key={k} value={k}>
              {TYPE_PRELEVEMENT_LABEL[k] ?? k}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_PRELEVEMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} radius={8} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Pipette size={24} />}
          title="Aucun prélèvement"
          description={
            search || siteFilter || typeFilter || statutFilter
              ? 'Aucun résultat pour ces filtres.'
              : 'Les prélèvements terrain apparaîtront ici une fois importés.'
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Site</th>
                <th>Type</th>
                <th>Point</th>
                <th>Méthode</th>
                <th>Date</th>
                <th>Statut</th>
                <th className={styles.thCenter}>Échant.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className={styles.code}>{p.codePrelevement}</td>
                  <td>{sitesById.get(p.siteId) ?? (p.siteId || '—')}</td>
                  <td>
                    {(TYPE_PRELEVEMENT_LABEL[p.typePrelevement] ?? p.typePrelevement) || '—'}
                  </td>
                  <td className={styles.muted}>{p.pointPrelevement || '—'}</td>
                  <td className={styles.muted}>{p.methodePrelevement || '—'}</td>
                  <td className={styles.date}>
                    {p.datePrelevement
                      ? formatDateTime(p.datePrelevement, 'dd MMM yyyy')
                      : '—'}
                  </td>
                  <td>
                    <Badge size="sm" variant={STATUT_PRELEVEMENT_VARIANT[p.statut] ?? 'neutral'}>
                      {STATUT_PRELEVEMENT_LABEL[p.statut] ?? p.statut}
                    </Badge>
                  </td>
                  <td className={styles.thCenter}>
                    <span
                      className={styles.pill}
                      data-nonzero={p.nombreEchantillons > 0 ? 'true' : 'false'}
                    >
                      {p.nombreEchantillons}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
