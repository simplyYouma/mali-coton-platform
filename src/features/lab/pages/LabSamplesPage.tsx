import { useMemo, useState } from 'react';
import { Beaker, FileSpreadsheet } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@/components/common';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { formatDateTime } from '@/lib/format';
import { useSites } from '@/features/sites/hooks/useSites';
import { useEchantillons, useLaboratoires } from '../hooks/useLaboratoire';
import {
  TYPE_PRELEVEMENT_LABEL,
  STATUT_ECHANTILLON_LABEL,
  STATUT_ECHANTILLON_VARIANT,
} from '../api/laboratoire';
import styles from './LabSamplesPage.module.css';

export function LabSamplesPage() {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [labFilter, setLabFilter] = useState('');

  /* inclureInactifs : un site désactivé ne doit pas devenir orphelin à
   * l'écran (nom vide sur une collecte/analyse/alerte existante) — seul
   * l'agrégat l'exclut, jamais la résolution d'un libellé déjà rattaché. */
  const { data: sitesPage } = useSites({ inclureInactifs: true });
  const { data: labs } = useLaboratoires();
  const { data: page, isLoading } = useEchantillons({
    site: siteFilter || undefined,
    statut: statutFilter || undefined,
    laboratoire: labFilter || undefined,
  });

  const sites = sitesPage?.items ?? [];

  const labsById = useMemo(() => {
    const map = new Map<string, string>();
    (labs ?? []).forEach((l) => map.set(l.id, l.nom));
    return map;
  }, [labs]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (page?.items ?? []).filter((e) => {
      if (!q) return true;
      return (
        e.codeEchantillon.toLowerCase().includes(q) ||
        (labsById.get(e.laboratoireId) ?? '').toLowerCase().includes(q)
      );
    });
  }, [page, search, labsById]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Échantillons</h1>
          <span className={styles.heroEyebrow}>{page?.total ?? 0} au total</span>
          <p className={styles.heroDesc}>
            Flacons envoyés ou reçus au laboratoire, avec leur statut d'analyse.
          </p>
        </div>
        <Button
          variant="excel"
          iconLeft={<FileSpreadsheet size={16} />}
          disabled={items.length === 0}
          onClick={() =>
            exportRowsToXlsx({
              filename: 'echantillons',
              sheetName: 'Échantillons',
              columns: [
                { header: 'Code', accessor: (e) => e.codeEchantillon },
                { header: 'Type', accessor: (e) => TYPE_PRELEVEMENT_LABEL[e.typeEchantillon] ?? e.typeEchantillon },
                { header: 'Statut', accessor: (e) => STATUT_ECHANTILLON_LABEL[e.statut] ?? e.statut },
                { header: 'Date réception', accessor: (e) => e.dateReceptionLaboratoire },
                { header: 'Laboratoire', accessor: (e) => labsById.get(e.laboratoireId) ?? e.laboratoireId },
                { header: 'Prélèvement ID', accessor: (e) => e.prelevementId },
                { header: 'Nb analyses', accessor: (e) => e.nombreAnalyses },
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
          placeholder="Rechercher code, laboratoire…"
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
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_ECHANTILLON_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={labFilter}
          onChange={(e) => setLabFilter(e.target.value)}
        >
          <option value="">Tous les laboratoires</option>
          {(labs ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
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
          icon={<Beaker size={24} />}
          title="Aucun échantillon"
          description={
            search || siteFilter || statutFilter || labFilter
              ? 'Aucun résultat pour ces filtres.'
              : 'Les échantillons envoyés au laboratoire apparaîtront ici.'
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code échantillon</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Date réception labo</th>
                <th>Laboratoire</th>
                <th className={styles.thCenter}>Analyses</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td className={styles.code}>{e.codeEchantillon}</td>
                  <td>
                    {(TYPE_PRELEVEMENT_LABEL[e.typeEchantillon] ?? e.typeEchantillon) || '—'}
                  </td>
                  <td>
                    <Badge
                      size="sm"
                      variant={STATUT_ECHANTILLON_VARIANT[e.statut] ?? 'neutral'}
                    >
                      {STATUT_ECHANTILLON_LABEL[e.statut] ?? e.statut}
                    </Badge>
                  </td>
                  <td className={styles.date}>
                    {e.dateReceptionLaboratoire
                      ? formatDateTime(e.dateReceptionLaboratoire, 'dd MMM yyyy')
                      : '—'}
                  </td>
                  <td>{(labsById.get(e.laboratoireId) ?? e.laboratoireId) || '—'}</td>
                  <td className={styles.thCenter}>
                    <span
                      className={styles.pill}
                      data-nonzero={e.nombreAnalyses > 0 ? 'true' : 'false'}
                    >
                      {e.nombreAnalyses}
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
