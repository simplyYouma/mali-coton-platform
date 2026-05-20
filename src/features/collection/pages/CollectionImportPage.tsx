import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { findRule } from '../lib/indicatorRules';
import {
  buildCollections,
  detectMapping,
  parseFile,
  type MappingHint,
  type ParsedRow,
  type RowDiagnostic,
} from '../lib/csvImport';
import { enqueueSync, upsertLocalCollection } from '../lib/offlineDb';
import styles from './CollectionImportPage.module.css';

type Phase = 'upload' | 'preview' | 'done';
type ImportSource = 'kobo' | 'lab';

const SOURCE_OPTIONS: Array<{ value: ImportSource; label: string; sublabel: string }> = [
  { value: 'kobo', label: 'Données terrain', sublabel: 'Export Kobo / ODK' },
  { value: 'lab', label: 'Résultats laboratoire', sublabel: 'Export LNE / LIMS' },
];

export function CollectionImportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sitesPage } = useSites();
  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);

  const [phase, setPhase] = useState<Phase>('upload');
  const [, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<MappingHint | null>(null);
  const [diagnostics, setDiagnostics] = useState<RowDiagnostic[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [source, setSource] = useState<ImportSource>('kobo');
  const [isCommitting, setIsCommitting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        toast.error('Le fichier est vide ou illisible.');
        return;
      }
      const detected = detectMapping(parsed);
      setRows(parsed);
      setMapping(detected);

      if (user) {
        const diag = buildCollections(parsed, detected, {
          agentId: user.id,
          sites,
        });
        setDiagnostics(diag);
      }
      setPhase('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de lecture du fichier.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const onCommit = async () => {
    if (!diagnostics.length) return;
    setIsCommitting(true);
    let count = 0;
    try {
      for (const d of diagnostics) {
        if (d.status === 'rejected' || !d.collection) continue;
        await upsertLocalCollection(d.collection);
        await enqueueSync(d.collection);
        count += 1;
      }
      setImportedCount(count);
      setPhase('done');
      toast.success(
        `${count} collecte${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} et placée${count > 1 ? 's' : ''} en file de synchronisation.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'import.');
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setPhase('upload');
    setRows([]);
    setMapping(null);
    setDiagnostics([]);
    setFileName(null);
    setImportedCount(0);
  };

  const stats = useMemo(() => {
    const ok = diagnostics.filter((d) => d.status === 'ok').length;
    const partial = diagnostics.filter((d) => d.status === 'partial').length;
    const rejected = diagnostics.filter((d) => d.status === 'rejected').length;
    return { total: diagnostics.length, ok, partial, rejected };
  }, [diagnostics]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Source terrain · KoboToolbox / ODK</span>
          <h1 className={styles.heroTitle}>Importer depuis Kobo</h1>
          <p className={styles.heroDescription}>
            Téléverser un export CSV depuis Kobo Toolbox pour ingestion.
          </p>
        </div>
        <Button
          variant="ghost"
          iconLeft={<ArrowLeft size={14} />}
          onClick={() => navigate('/collecte')}
        >
          Retour aux collectes
        </Button>
      </header>

      {phase === 'upload' ? (
        <>
          <div className={styles.sourcePicker} role="radiogroup" aria-label="Type de fichier">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={source === opt.value}
                className={`${styles.sourceOption} ${source === opt.value ? styles.sourceOptionActive : ''}`}
                onClick={() => setSource(opt.value)}
              >
                <span className={styles.sourceLabel}>{opt.label}</span>
                <span className={styles.sourceSublabel}>{opt.sublabel}</span>
              </button>
            ))}
          </div>

          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <span className={styles.dropIcon} aria-hidden="true">
              <UploadCloud size={26} />
            </span>
            <h2 className={styles.dropTitle}>
              {source === 'kobo'
                ? 'Déposez l\'export Kobo'
                : 'Déposez le fichier de résultats labo'}
            </h2>
            <p className={styles.dropHint}>
              <strong>.xlsx</strong> · <strong>.xls</strong> · <strong>.csv</strong>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </>
      ) : null}

      {phase === 'preview' && mapping ? (
        <>
          <section className={styles.summary} aria-label="Synthèse de l'import">
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Lignes lues</span>
              <span className={styles.summaryValue}>{stats.total}</span>
              <span className={styles.summaryHint}>{fileName}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Valides</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-success)' }}>
                {stats.ok}
              </span>
              <span className={styles.summaryHint}>prêtes à l'import</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Partielles</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-warning)' }}>
                {stats.partial}
              </span>
              <span className={styles.summaryHint}>importées avec lacunes</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Rejetées</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-danger)' }}>
                {stats.rejected}
              </span>
              <span className={styles.summaryHint}>non importables</span>
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Mapping détecté</h3>
              <span className={styles.panelCaption}>
                colonnes du fichier → champs plateforme
              </span>
            </header>
            <div className={styles.panelBody}>
              <MappingRow label="Site (id ou code)" value={mapping.siteCol} />
              <MappingRow label="Date de collecte" value={mapping.collectedCol} />
              <MappingRow label="Latitude GPS" value={mapping.latCol} />
              <MappingRow label="Longitude GPS" value={mapping.lngCol} />
              <div className={styles.mappingRow}>
                <span className={styles.mappingLabel}>Indicateurs détectés</span>
                {mapping.measurementColumns.size === 0 ? (
                  <span className={styles.mappingMissing}>aucun</span>
                ) : (
                  <div className={styles.indicatorList}>
                    {Array.from(mapping.measurementColumns.entries()).map(([col, id]) => (
                      <span key={col} className={styles.indicatorChip}>
                        {findRule(id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Aperçu — 10 premières lignes</h3>
              <span className={styles.panelCaption}>vérifiez avant validation</span>
            </header>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Statut</th>
                    <th>Site</th>
                    <th>Date</th>
                    <th>GPS</th>
                    <th>Mesures</th>
                    <th>Anomalies</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.slice(0, 10).map((d) => {
                    const c = d.collection;
                    const statusClass =
                      d.status === 'ok'
                        ? styles.statusOk
                        : d.status === 'partial'
                          ? styles.statusPartial
                          : styles.statusRejected;
                    return (
                      <tr key={d.rowIndex}>
                        <td>{d.rowIndex}</td>
                        <td>
                          <span className={statusClass}>
                            {d.status === 'ok'
                              ? 'OK'
                              : d.status === 'partial'
                                ? 'Partielle'
                                : 'Rejetée'}
                          </span>
                        </td>
                        <td>
                          {c
                            ? sites.find((s) => s.id === c.siteId)?.shortName ?? c.siteId
                            : '—'}
                        </td>
                        <td>
                          {c ? new Date(c.collectedAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td>
                          {c?.gps
                            ? `${c.gps.lat.toFixed(4)}, ${c.gps.lng.toFixed(4)}`
                            : '—'}
                        </td>
                        <td>{c?.measurements.length ?? 0}</td>
                        <td className={styles.issuesCell}>
                          {d.issues.length > 0 ? d.issues.join(' · ') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" iconLeft={<RefreshCw size={14} />} onClick={reset}>
                Recommencer
              </Button>
              <div className={styles.actionsRight}>
                <Button
                  variant="success"
                  iconLeft={<CloudUpload size={14} />}
                  onClick={onCommit}
                  loading={isCommitting}
                  disabled={stats.ok + stats.partial === 0}
                >
                  Importer {stats.ok + stats.partial} collecte
                  {stats.ok + stats.partial > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {phase === 'done' ? (
        <div className={styles.successBox} role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>{importedCount} collectes importées avec succès.</strong>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              Elles sont en file de synchronisation. Vous pouvez continuer à importer ou retourner
              à la liste des collectes.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <Button variant="ghost" iconLeft={<FileSpreadsheet size={14} />} onClick={reset}>
                Importer un autre fichier
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/collecte')}
                iconLeft={<ArrowLeft size={14} />}
              >
                Voir la liste des collectes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MappingRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.mappingRow}>
      <span className={styles.mappingLabel}>{label}</span>
      {value ? (
        <span className={styles.mappingValue}>{value}</span>
      ) : (
        <span className={styles.mappingMissing}>colonne non détectée</span>
      )}
    </div>
  );
}
