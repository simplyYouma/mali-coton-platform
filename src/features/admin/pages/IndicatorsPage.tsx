import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { Button, Skeleton, EmptyState } from '@/components/common';
import { useIndicateurs } from '../hooks/useAdmin';
import type { Indicateur } from '../api/referentiels';
import styles from './IndicatorsPage.module.css';

const DOMAINE_LABEL: Record<string, string> = {
  chimique: 'Physico-chimique',
  physique: 'Physico-chimique',
};

const FILTER_OPTIONS = [
  { value: 'all',           label: 'Tous' },
  { value: 'chimique',      label: 'Physico-chimique' },
  { value: 'configure',     label: 'Configurés' },
  { value: 'non_configure', label: 'Non configurés' },
];

interface IndicatorsPageProps {
  /** Mode embarque dans un autre conteneur (ex: onglet de RefDataPage) :
   *  on n'affiche ni le hero ni les stat cards, deja rendus par l'hote. */
  embedded?: boolean;
  /** En mode embarque, bascule vers l'onglet Seuils au lieu de naviguer. */
  onNavigateSeuils?: () => void;
}

export function IndicatorsPage({
  embedded = false,
  onNavigateSeuils,
}: IndicatorsPageProps = {}) {
  const { data: indicateurs = [], isLoading } = useIndicateurs();

  const [q, setQ]         = useState('');
  const [filtre, setFiltre] = useState('all');

  const total      = indicateurs.length;
  const configures = indicateurs.filter((i) => i.configure).length;
  const nonConfig  = total - configures;

  const filtered = useMemo(() => {
    let items = indicateurs;
    if (filtre === 'chimique') items = items.filter((i) => i.domaine === 'chimique' || i.domaine === 'physique');
    if (filtre === 'configure')     items = items.filter((i) => i.configure);
    if (filtre === 'non_configure') items = items.filter((i) => !i.configure);
    if (q.trim()) {
      const s = q.toLowerCase();
      items = items.filter(
        (i) =>
          i.libelle.toLowerCase().includes(s) ||
          i.code.toLowerCase().includes(s) ||
          (i.sourceNormative?.code ?? '').toLowerCase().includes(s),
      );
    }
    return items;
  }, [indicateurs, filtre, q]);

  const exportButton = (
    <Button
      variant="excel"
      iconLeft={<FileSpreadsheet size={14} />}
      disabled={filtered.length === 0}
      onClick={() =>
        exportRowsToXlsx({
          filename: 'indicateurs',
          sheetName: 'Indicateurs',
          columns: [
            { header: 'ID',              accessor: (i: Indicateur) => i.id },
            { header: 'Code',            accessor: (i: Indicateur) => i.code },
            { header: 'Libellé',         accessor: (i: Indicateur) => i.libelle },
            { header: 'Domaine',         accessor: (i: Indicateur) => DOMAINE_LABEL[i.domaine] ?? i.domaine },
            { header: 'Unité',           accessor: (i: Indicateur) => i.unite ?? '' },
            { header: 'Seuil min',       accessor: (i: Indicateur) => i.seuilMinimal ?? '' },
            { header: 'Seuil max',       accessor: (i: Indicateur) => i.seuilMaximal ?? '' },
            { header: 'Source normative',accessor: (i: Indicateur) => i.sourceNormative?.code ?? '' },
            { header: 'Configuré',       accessor: (i: Indicateur) => i.configure ? 'Oui' : 'Non' },
          ],
          rows: filtered,
        })
      }
    >
      Exporter XLSX
    </Button>
  );

  /* Embarque, "Gerer les seuils" bascule d'onglet ; en page pleine il navigue. */
  const seuilsAction = embedded ? (
    onNavigateSeuils && (
      <Button variant="primary" iconLeft={<ArrowRight size={14} />} onClick={onNavigateSeuils}>
        Gérer les seuils
      </Button>
    )
  ) : (
    <Link to="/admin/referentiels">
      <Button variant="primary" iconLeft={<ArrowRight size={14} />}>
        Gérer les seuils
      </Button>
    </Link>
  );

  const actionBar = (
    <div className={styles.heroRight}>
      {exportButton}
      {seuilsAction}
    </div>
  );

  return (
    <div className={embedded ? styles.embeddedRoot : styles.page}>
      {embedded ? (
        <div className={styles.embeddedActions}>{actionBar}</div>
      ) : (
        <>
          {/* Hero */}
          <header className={styles.hero} data-page-header>
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>
                <FlaskConical size={0} /> Administration
              </span>
              <h1 className={styles.heroTitle}>Indicateurs</h1>
              <p className={styles.heroDescription}>
                Vue consolidée des paramètres de mesure avec l'état de configuration de leurs seuils normatifs.
              </p>
            </div>
            {actionBar}
          </header>

          {/* Stat cards */}
          <div className={styles.statsRow}>
            <div className={styles.statCard} data-tone="primary">
              <span className={styles.statIcon}><FlaskConical size={18} /></span>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Indicateurs</span>
            </div>
            <div className={styles.statCard} data-tone="success">
              <span className={styles.statIcon}><CheckCircle2 size={18} /></span>
              <span className={styles.statValue}>{configures}</span>
              <span className={styles.statLabel}>Configurés</span>
            </div>
            <div className={styles.statCard} data-tone={nonConfig > 0 ? 'warning' : 'neutral'}>
              <span className={styles.statIcon}><AlertCircle size={18} /></span>
              <span className={styles.statValue}>{nonConfig}</span>
              <span className={styles.statLabel}>Sans seuil</span>
            </div>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un indicateur…"
            aria-label="Rechercher"
          />
        </div>
        <div className={styles.chips} role="group" aria-label="Filtrer">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.chip} ${filtre === opt.value ? styles.chipActive : ''}`}
              onClick={() => setFiltre(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className={styles.skeletonStack}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={48} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={24} />}
          title="Aucun indicateur trouvé"
          description="Ajustez les filtres ou connectez-vous en mode live."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Libellé</th>
                <th>Code</th>
                <th>Domaine</th>
                <th>Unité</th>
                <th>Seuil min</th>
                <th>Seuil max</th>
                <th>Source normative</th>
                <th className={styles.centerCell}>Configuré</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className={!i.configure ? styles.rowWarning : ''}>
                  <td><code className={styles.code}>{i.id}</code></td>
                  <td><span className={styles.label}>{i.libelle}</span></td>
                  <td><code className={styles.code}>{i.code}</code></td>
                  <td>
                    <span className={styles.catBadge} data-cat={i.domaine}>
                      {DOMAINE_LABEL[i.domaine] ?? i.domaine}
                    </span>
                  </td>
                  <td className={styles.muted}>
                    {i.unite ? <code className={styles.code}>{i.unite}</code> : '—'}
                  </td>
                  <td className={styles.muted}>{i.seuilMinimal ?? '—'}</td>
                  <td className={styles.muted}>{i.seuilMaximal ?? '—'}</td>
                  <td>
                    {i.sourceNormative ? (
                      <span className={styles.normeTag} title={i.sourceNormative.organisme}>
                        {i.sourceNormative.code}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.centerCell}>
                    {i.configure ? (
                      <CheckCircle2 size={16} className={styles.iconOk} aria-label="Configuré" />
                    ) : (
                      <AlertCircle size={16} className={styles.iconWarn} aria-label="Non configuré" />
                    )}
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
