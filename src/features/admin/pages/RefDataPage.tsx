import { useMemo, useState } from 'react';
import { FileSpreadsheet, Search, FlaskConical, Ruler } from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { Button, Skeleton } from '@/components/common';
import { useParametreAnalyses, useParametreUnites } from '../hooks/useAdmin';
import styles from './RefDataPage.module.css';

type Tab = 'analyses' | 'unites';

const TABS: Array<{ value: Tab; label: string; icon: React.ReactNode }> = [
  { value: 'analyses', label: 'Paramètres d\'analyse', icon: <FlaskConical size={13} /> },
  { value: 'unites',   label: 'Unités de mesure',      icon: <Ruler size={13} /> },
];

const CAT_LABEL: Record<string, string> = {
  physique: 'Physique',
  chimique: 'Chimique',
};

export function RefDataPage() {
  const [tab, setTab] = useState<Tab>('analyses');
  const [query, setQuery] = useState('');

  const { data: analyses = [], isLoading: loadingA } = useParametreAnalyses();
  const { data: unites  = [], isLoading: loadingU } = useParametreUnites();

  const filteredAnalyses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return analyses;
    return analyses.filter(
      (a) =>
        a.nom.toLowerCase().includes(q) ||
        a.categorie.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q),
    );
  }, [analyses, query]);

  const filteredUnites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unites;
    return unites.filter(
      (u) =>
        u.libelle.toLowerCase().includes(q) ||
        u.sigle.toLowerCase().includes(q),
    );
  }, [unites, query]);

  const isLoading = loadingA || loadingU;
  const totalCount = analyses.length + unites.length;

  const handleExport = () => {
    if (tab === 'analyses') {
      exportRowsToXlsx({
        filename: 'parametre-analyses',
        sheetName: 'Paramètres',
        columns: [
          { header: 'ID',          accessor: (a) => a.id },
          { header: 'Nom',         accessor: (a) => a.nom },
          { header: 'Catégorie',   accessor: (a) => a.categorie },
          { header: 'Description', accessor: (a) => a.description ?? '' },
        ],
        rows: filteredAnalyses,
      });
    } else {
      exportRowsToXlsx({
        filename: 'parametre-unites',
        sheetName: 'Unités',
        columns: [
          { header: 'ID',      accessor: (u) => u.id },
          { header: 'Libellé', accessor: (u) => u.libelle },
          { header: 'Sigle',   accessor: (u) => u.sigle },
        ],
        rows: filteredUnites,
      });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Référentiels</h1>
          <span className={styles.heroCount}>
            {totalCount} entrée{totalCount > 1 ? 's' : ''} · {TABS.length} catégories
          </span>
          <p className={styles.heroDescription}>
            Paramètres d'analyse et unités de mesure du référentiel backend.
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher"
            />
          </div>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            onClick={handleExport}
            disabled={isLoading}
          >
            Exporter XLSX
          </Button>
        </div>
      </header>

      <div className={styles.chips} role="tablist" aria-label="Section">
        {TABS.map((t) => {
          const count = t.value === 'analyses' ? analyses.length : unites.length;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={t.value === tab}
              className={`${styles.chip} ${t.value === tab ? styles.chipActive : ''}`}
              onClick={() => { setTab(t.value); setQuery(''); }}
            >
              {t.icon}
              {t.label}
              <span className={styles.chipCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} />)}
        </div>
      ) : tab === 'analyses' ? (
        <AnalysesTable rows={filteredAnalyses} />
      ) : (
        <UnitesTable rows={filteredUnites} />
      )}
    </div>
  );
}

/* ── Tableau paramètres d'analyse ── */
import type { ParametreAnalyse, ParametreUnite } from '../api/referentiels';

function AnalysesTable({ rows }: { rows: ParametreAnalyse[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className={styles.empty}>Aucun paramètre trouvé.</td></tr>
          ) : rows.map((a) => (
            <tr key={a.id}>
              <td><code className={styles.code}>{a.id}</code></td>
              <td><span className={styles.label}>{a.nom}</span></td>
              <td>
                <span
                  className={styles.catBadge}
                  data-cat={a.categorie}
                >
                  {CAT_LABEL[a.categorie] ?? a.categorie}
                </span>
              </td>
              <td className={styles.description}>
                {a.description ?? <span className={styles.muted}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tableau unités ── */
function UnitesTable({ rows }: { rows: ParametreUnite[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Libellé</th>
            <th>Sigle</th>
            <th>Paramètres liés</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className={styles.empty}>Aucune unité trouvée.</td></tr>
          ) : rows.map((u) => (
            <tr key={u.id}>
              <td><code className={styles.code}>{u.id}</code></td>
              <td><span className={styles.label}>{u.libelle}</span></td>
              <td><code className={styles.code}>{u.sigle}</code></td>
              <td className={styles.description}>{u.parametreAnalyses.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
