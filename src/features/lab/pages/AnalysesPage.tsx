import { useMemo, useState } from 'react';
import { ChevronRight, FileSpreadsheet, Microscope, Paperclip } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@/components/common';
import { exportRowsToXlsx, noteScopeSitesActifs } from '@/lib/xlsxExport';
import { formatDateTime } from '@/lib/format';
import { useSites } from '@/features/sites/hooks/useSites';
import type { Site } from '@/features/sites/api/site.types';
import { useResultatsAnalyse } from '../hooks/useLaboratoire';
import { TYPE_PRELEVEMENT_LABEL } from '../api/laboratoire';
import type { ResultatAnalyse, ValeursAnalytiques } from '../api/laboratoire';
import styles from './AnalysesPage.module.css';

/* ── Paramètres affichés dans le tableau (colonnes visibles) ── */
const TABLE_PARAMS: { key: keyof ValeursAnalytiques; label: string; unit: string }[] = [
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'conductivite', label: 'Cond.', unit: 'µS/cm' },
  { key: 'turbidite', label: 'Turb.', unit: 'NTU' },
  { key: 'mes', label: 'MES', unit: 'mg/L' },
  { key: 'dbo5', label: 'DBO₅', unit: 'mg/L' },
];

/* ── Tous les paramètres pour le panneau expansé ── */
const ALL_PARAMS: { key: keyof ValeursAnalytiques; label: string; unit: string }[] = [
  { key: 'temperature', label: 'Température', unit: '°C' },
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'conductivite', label: 'Conductivité', unit: 'µS/cm' },
  { key: 'turbidite', label: 'Turbidité', unit: 'NTU' },
  { key: 'tds', label: 'TDS', unit: 'mg/L' },
  { key: 'mes', label: 'MES', unit: 'mg/L' },
  { key: 'dbo5', label: 'DBO₅', unit: 'mg/L' },
  { key: 'dco', label: 'DCO', unit: 'mg/L' },
  { key: 'couleur', label: 'Couleur', unit: 'mg/L Pt-Co' },
  { key: 'sulfates', label: 'Sulfates', unit: 'mg/L' },
  { key: 'nh4', label: 'NH₄⁺', unit: 'mg/L' },
  { key: 'no2', label: 'NO₂⁻', unit: 'mg/L' },
  { key: 'no3', label: 'NO₃⁻', unit: 'mg/L' },
  { key: 'phosphate_total', label: 'Phosphate total', unit: 'mg/L' },
  { key: 'chrome', label: 'Chrome', unit: 'mg/L' },
  { key: 'fer', label: 'Fer', unit: 'mg/L' },
  { key: 'nickel', label: 'Nickel', unit: 'mg/L' },
  { key: 'cuivre', label: 'Cuivre', unit: 'mg/L' },
  { key: 'zinc', label: 'Zinc', unit: 'mg/L' },
  { key: 'manganese', label: 'Manganèse', unit: 'mg/L' },
  { key: 'plomb', label: 'Plomb', unit: 'mg/L' },
];

function fmtNum(v: number | null | undefined, unit: string): string {
  if (v == null || Number.isNaN(v)) return '—';
  const s = Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, '');
  return unit ? `${s} ${unit}` : s;
}

function ExpandPanel({ valeurs }: { valeurs: ValeursAnalytiques }) {
  return (
    <div className={styles.expandPanel}>
      {ALL_PARAMS.map(({ key, label, unit }) => {
        const v = valeurs[key];
        return (
          <div key={key} className={styles.paramItem}>
            <span className={styles.paramLabel}>{label}</span>
            {v == null || Number.isNaN(v) ? (
              <span className={styles.paramEmpty}>—</span>
            ) : (
              <span className={styles.paramValue}>{fmtNum(v, unit)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultRow({ r, sitesById }: { r: ResultatAnalyse; sitesById: Map<string, Site> }) {
  const [open, setOpen] = useState(false);

  const site = r.siteId ? sitesById.get(r.siteId) : undefined;
  const siteName = r.siteId
    ? (site?.shortName ?? r.siteCode ?? r.siteNom ?? r.siteId)
    : (r.siteCode ?? r.siteNom ?? '—');

  return (
    <>
      <tr onClick={() => setOpen((o) => !o)}>
        <td>
          <button
            type="button"
            className={styles.expandToggle}
            data-open={open ? 'true' : 'false'}
            aria-label={open ? 'Réduire' : 'Développer'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            <ChevronRight size={14} />
          </button>
        </td>
        <td className={styles.muted}>{r.echantillon || '—'}</td>
        <td>
          {siteName}
          {site?.actif === false ? (
            <Badge size="sm" variant="neutral" style={{ marginLeft: 6 }}>Inactif</Badge>
          ) : null}
        </td>
        <td className={styles.muted}>
          {(TYPE_PRELEVEMENT_LABEL[r.typePrelevement ?? ''] ?? r.typePrelevement) || '—'}
        </td>
        <td className={styles.date}>
          {r.dateUtilisee ? formatDateTime(r.dateUtilisee, 'dd MMM yyyy') : '—'}
        </td>
        <td>
          {r.nombreFichiers > 0 ? (
            <span className={styles.fichierBadge}>
              <Paperclip size={11} /> {r.nombreFichiers}
            </span>
          ) : (
            <span className={styles.empty2}>—</span>
          )}
        </td>
        {TABLE_PARAMS.map(({ key, unit }) => (
          <td key={key} className={styles.num}>
            {fmtNum(r.valeursAnalytiques[key], unit)}
          </td>
        ))}
      </tr>
      {open ? (
        <tr className={styles.expandRow}>
          <td colSpan={6 + TABLE_PARAMS.length}>
            <ExpandPanel valeurs={r.valeursAnalytiques} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AnalysesPage() {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  /* inclureInactifs : un site désactivé ne doit pas devenir orphelin à
   * l'écran (nom vide sur une collecte/analyse/alerte existante) — seul
   * l'agrégat l'exclut, jamais la résolution d'un libellé déjà rattaché. */
  const { data: sitesPage } = useSites({ inclureInactifs: true });
  const { data: page, isLoading } = useResultatsAnalyse({
    site: siteFilter || undefined,
  });

  const sites = sitesPage?.items ?? [];

  const sitesById = useMemo(() => {
    const map = new Map<string, Site>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

  const items = useMemo<ResultatAnalyse[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return page?.items ?? [];
    return (page?.items ?? []).filter(
      (r) =>
        (r.echantillon ?? '').toLowerCase().includes(q) ||
        (r.siteNom ?? '').toLowerCase().includes(q) ||
        (r.siteCode ?? '').toLowerCase().includes(q) ||
        (r.siteId ? sitesById.get(r.siteId)?.shortName ?? '' : '').toLowerCase().includes(q),
    );
  }, [page, search, sitesById]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Résultats d'analyse</h1>
          <span className={styles.heroCount}>{page?.total ?? 0} résultats</span>
          <p className={styles.heroDesc}>
            21 paramètres physico-chimiques consolidés par site et type de prélèvement.
            Cliquez sur une ligne pour tout voir.
          </p>
        </div>
        <Button
          variant="excel"
          iconLeft={<FileSpreadsheet size={16} />}
          disabled={items.length === 0}
          onClick={() =>
            exportRowsToXlsx({
              filename: 'resultats-analyse',
              sheetName: 'Résultats',
              columns: [
                { header: 'Échantillon', accessor: (r) => r.echantillon ?? '' },
                {
                  header: 'Site',
                  accessor: (r) =>
                    (r.siteId ? sitesById.get(r.siteId)?.shortName : null) ??
                    r.siteCode ??
                    r.siteNom ??
                    '',
                },
                { header: 'Type prélèvement', accessor: (r) => r.typePrelevement ?? '' },
                { header: 'Date', accessor: (r) => r.dateUtilisee },
                { header: 'Statut', accessor: (r) => r.statut ?? '' },
                { header: 'Fichiers', accessor: (r) => r.nombreFichiers },
                ...ALL_PARAMS.map(({ key, label, unit }) => ({
                  header: unit ? `${label} (${unit})` : label,
                  accessor: (r: ResultatAnalyse) => {
                    const v = r.valeursAnalytiques[key];
                    return v == null || Number.isNaN(v) ? '' : v;
                  },
                })),
              ],
              rows: items,
              note: noteScopeSitesActifs(),
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
          placeholder="Rechercher échantillon, site…"
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
      </div>

      {isLoading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={52} radius={8} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Microscope size={24} />}
          title="Aucun résultat d'analyse"
          description={
            search || siteFilter
              ? 'Aucun résultat pour ces filtres.'
              : "Les résultats d'analyse transmis apparaîtront ici."
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th>Échantillon</th>
                <th>Site</th>
                <th>Type</th>
                <th>Date</th>
                <th>Fichiers</th>
                {TABLE_PARAMS.map(({ label, unit }) => (
                  <th key={label} className={styles.thRight}>
                    {label}
                    {unit ? (
                      <> <span className={styles.unit}>{unit}</span></>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <ResultRow key={r.id} r={r} sitesById={sitesById} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
