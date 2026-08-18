import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Trash2,
  X,
} from 'lucide-react';
import { Badge, Button, Skeleton, StructuredText } from '@/components/common';
import { useReportHistory } from '../hooks/useReportHistory';
import { useRapportAnalyseDetail, useRapportsAnalyse } from '../hooks/useRapportsAnalyse';
import styles from './ReportingPage.module.css';

// ── Labels ────────────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<string, string> = {
  confirme: 'Confirmé',
  brouillon: 'Brouillon',
  archive: 'Archivé',
};

const STATUT_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'info'> = {
  confirme: 'success',
  brouillon: 'warning',
  archive: 'neutral',
};

const MILIEU_LABEL: Record<string, string> = {
  AIR: 'Air',
  EAU_USEE: 'Eau usée',
  SEDIMENT: 'Sédiment',
  EAU_SURFACE: 'Eau de surface',
  SOL: 'Sol',
};

// Commentaire associé à chaque milieu dans le détail
const MILIEU_COMMENTAIRE_KEY: Record<string, 'commentaireAir' | 'commentaireEau' | 'commentaireSediment'> = {
  AIR: 'commentaireAir',
  EAU_USEE: 'commentaireEau',
  SEDIMENT: 'commentaireSediment',
};

function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportingPage() {
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('rapport'));
  const [activeMilieu, setActiveMilieu] = useState('');
  const detailPanelRef = useRef<HTMLElement>(null);

  const { data: rapports = [], isLoading } = useRapportsAnalyse();
  const { data: detail, isLoading: detailLoading } = useRapportAnalyseDetail(selectedId);
  const { items: history, removeEntry } = useReportHistory();

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rapports.filter((r) => {
      const date = r.dateEchantillonnage.slice(0, 10);
      if (fromFilter && date < fromFilter) return false;
      if (toFilter && date > toFilter) return false;
      if (siteFilter && !r.siteNom.toLowerCase().includes(siteFilter.toLowerCase())) return false;
      return true;
    });
  }, [rapports, fromFilter, toFilter, siteFilter]);

  // ── Stats scope strip ─────────────────────────────────────────────────────────
  const confirmes = rapports.filter((r) => r.statut === 'confirme').length;
  const uniqueSites = new Set(rapports.map((r) => r.siteNom)).size;
  const uniqueLabs = new Set(rapports.map((r) => r.laboratoireNom)).size;
  const totalAnalyses = rapports.reduce((s, r) => s + r.nombreAnalyses, 0);
  const avecFichier = rapports.filter((r) => r.fichierDisponible).length;

  // ── Onglets milieu ─────────────────────────────────────────────────────────────
  const milieus = detail ? Object.keys(detail.analysesParMilieu) : [];
  const currentMilieu =
    activeMilieu && milieus.includes(activeMilieu) ? activeMilieu : (milieus[0] ?? '');
  const analysesMilieu = detail ? (detail.analysesParMilieu[currentMilieu] ?? []) : [];
  const commentaireKey = MILIEU_COMMENTAIRE_KEY[currentMilieu];
  const currentCommentaire = detail && commentaireKey ? (detail[commentaireKey] as string | undefined) ?? '' : '';

  const openDetail = (id: string) => {
    setSelectedId(id);
    setActiveMilieu('');
  };
  const closeDetail = () => setSelectedId(null);

  // Amène directement au panneau de détail (previewSurface) du rapport sélectionné.
  useEffect(() => {
    if (selectedId) {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Reporting</span>
          <h1 className={styles.heroTitle}>Rapports</h1>
          <p className={styles.heroDescription}>
            Bordereaux d'analyse laboratoire — résultats par milieu (air, eau usée, sédiment),
            conclusion et recommandations.
          </p>
        </div>
      </header>

      {/* ── Scope strip ── */}
      <section className={styles.scope} aria-label="Données incluses">
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Total rapports</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : rapports.length}</span>
        </div>
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Confirmés</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : confirmes}</span>
        </div>
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Sites couverts</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : uniqueSites}</span>
        </div>
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Laboratoires</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : uniqueLabs}</span>
        </div>
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Analyses totales</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : totalAnalyses}</span>
        </div>
        <div className={styles.scopeItem}>
          <span className={styles.scopeLabel}>Avec fichier</span>
          <span className={styles.scopeValue}>{isLoading ? '—' : avecFichier}</span>
        </div>
      </section>

      {/* ── Filtres ── */}
      <section className={styles.controls} aria-label="Filtres">
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="ra-from">Du</label>
          <input
            id="ra-from"
            type="date"
            className={styles.controlInput}
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
          />
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="ra-to">au</label>
          <input
            id="ra-to"
            type="date"
            className={styles.controlInput}
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
          />
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="ra-site">Site</label>
          <input
            id="ra-site"
            type="text"
            className={styles.controlInput}
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            placeholder="Rechercher un site…"
          />
        </div>
        {(fromFilter || toFilter || siteFilter) && (
          <div className={styles.controlActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setFromFilter('');
                setToFilter('');
                setSiteFilter('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </section>

      {/* ── Liste des rapports ── */}
      <section className={styles.rapportsList} aria-label="Liste des rapports">
        <header className={styles.rapportsHead}>
          <div className={styles.previewHeadText}>
            <h2 className={styles.previewTitle}>Rapports d'analyse</h2>
            <p className={styles.previewMeta}>
              {isLoading
                ? 'Chargement…'
                : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.rapportsSkeleton}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={96} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.rapportsEmpty}>
            <FileText size={32} />
            <span>
              {rapports.length === 0
                ? 'Aucun rapport disponible'
                : 'Aucun résultat pour ces filtres'}
            </span>
          </div>
        ) : (
          <ul className={styles.rapportsGrid}>
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`${styles.rapportCard} ${selectedId === r.id ? styles.rapportCardActive : ''}`}
                  onClick={() => openDetail(r.id)}
                  aria-pressed={selectedId === r.id}
                >
                  {selectedId === r.id && <span className={styles.rapportCardBar} />}
                  <div className={styles.rapportCardTop}>
                    <span className={styles.rapportSite}>{r.siteCode || r.siteNom || '—'}</span>
                    <Badge variant={STATUT_VARIANT[r.statut] ?? 'neutral'} size="sm">
                      {STATUT_LABEL[r.statut] ?? r.statut}
                    </Badge>
                  </div>
                  {r.typeOuvrage && (
                    <span className={styles.rapportTypeOuvrage}>{r.typeOuvrage}</span>
                  )}
                  <span className={styles.rapportLab}>{r.laboratoireNom || '—'}</span>
                  <footer className={styles.rapportCardFoot}>
                    <span>{r.mission}</span>
                    <span className={styles.rapportDot}>·</span>
                    <span>{fmtDate(r.dateEchantillonnage)}</span>
                    <span className={styles.rapportDot}>·</span>
                    <span>{r.nombreAnalyses} analyse{r.nombreAnalyses !== 1 ? 's' : ''}</span>
                  </footer>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Panneau de détail ── */}
      {selectedId && (
        <section className={styles.detailPanel} aria-label="Détail du rapport" ref={detailPanelRef}>
          <header className={styles.previewHead}>
            <div className={styles.previewHeadText}>
              <h2 className={styles.previewTitle}>
                {detailLoading ? 'Chargement…' : (detail?.typeOuvrage || detail?.siteNom || '—')}
              </h2>
              <p className={styles.previewMeta}>
                {detail
                  ? `${detail.laboratoireNom} · ${detail.mission} · Échantillonnage ${fmtDate(detail.dateEchantillonnage)}`
                  : ''}
              </p>
            </div>
            <div className={styles.detailHeadActions}>
              <button
                type="button"
                className={styles.detailClose}
                onClick={closeDetail}
                aria-label="Fermer le détail"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className={styles.previewSurface}>
            {detailLoading ? (
              <div className={styles.previewLoading}>
                <Skeleton width="100%" height={240} />
              </div>
            ) : detail ? (
              <div className={styles.detailBody}>
                {/* Onglets milieu */}
                {milieus.length > 0 && (
                  <>
                    <div className={styles.milieuTabs} role="tablist" aria-label="Milieu">
                      {milieus.map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={m === currentMilieu}
                          className={`${styles.milieuTab} ${m === currentMilieu ? styles.milieuTabActive : ''}`}
                          onClick={() => setActiveMilieu(m)}
                        >
                          {MILIEU_LABEL[m] ?? m}
                          <span className={styles.milieuCount}>
                            {detail.analysesParMilieu[m]?.length ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Tableau des résultats */}
                    <div className={styles.analysesWrap}>
                      {analysesMilieu.length === 0 ? (
                        <p className={styles.detailEmpty}>Aucune analyse pour ce milieu.</p>
                      ) : (
                        <table className={styles.analysesTable}>
                          <thead>
                            <tr>
                              <th>Paramètre</th>
                              <th>Valeur</th>
                              <th>Unité</th>
                              <th>Conformité</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysesMilieu.map((a) => (
                              <tr
                                key={a.id}
                                className={a.conforme === false ? styles.rowNonConforme : ''}
                              >
                                <td className={styles.tdParam}>{a.libelle || a.parametre || '—'}</td>
                                <td className={styles.tdNum}>{a.valeurBrute || (a.valeur ?? '—')}</td>
                                <td className={styles.tdMuted}>{a.unite || '—'}</td>
                                <td>
                                  {a.conforme === null ? (
                                    <span className={styles.conformeNd}>—</span>
                                  ) : a.conforme ? (
                                    <span className={styles.conformeOk}>
                                      <CheckCircle2 size={13} />
                                      Conforme
                                    </span>
                                  ) : (
                                    <span className={styles.conformeNok}>
                                      <AlertTriangle size={13} />
                                      Non conforme
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Commentaire du milieu actif */}
                    {currentCommentaire && (
                      <div className={styles.detailTextBlock}>
                        <h3 className={styles.detailTextTitle}>
                          Observations — {MILIEU_LABEL[currentMilieu] ?? currentMilieu}
                        </h3>
                        <p className={styles.detailTextBody}>{currentCommentaire}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Conclusion et recommandations */}
                {(detail.conclusion || detail.recommandations.length > 0) && (
                  <div className={styles.detailTexts}>
                    {detail.conclusion && (
                      <div className={styles.detailTextBlock}>
                        <h3 className={styles.detailTextTitle}>Conclusion</h3>
                        <p className={styles.detailTextBody}>{detail.conclusion}</p>
                      </div>
                    )}
                    {detail.recommandations.length > 0 && (
                      <div className={styles.detailTextBlock}>
                        <h3 className={styles.detailTextTitle}>Recommandations</h3>
                        {detail.recommandations.map((rec, i) => (
                          <StructuredText key={i} text={rec} className={styles.detailTextBody} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Historique ── */}
      <section className={styles.history} aria-label="Historique">
        <header className={styles.historyHead}>
          <h2 className={styles.historyTitle}>Historique</h2>
          <p className={styles.historyMeta}>
            {history.length === 0
              ? 'Aucun rapport généré sur cet appareil pour le moment.'
              : `${history.length} rapport${history.length > 1 ? 's' : ''} généré${history.length > 1 ? 's' : ''} récemment — stocké${history.length > 1 ? 's' : ''} localement.`}
          </p>
        </header>
        {history.length > 0 ? (
          <ul className={styles.historyList}>
            {history.map((h) => (
              <li key={h.id} className={styles.historyRow}>
                <span className={styles.historyIcon} aria-hidden="true">
                  {h.exportedFormats.includes('XLSX') && !h.exportedFormats.includes('PDF') ? (
                    <FileSpreadsheet size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                </span>
                <div className={styles.historyMain}>
                  <span className={styles.historyName}>{h.templateTitle}</span>
                  <span className={styles.historySub}>
                    {h.periodLabel} · {h.scopeLabel}
                    {h.generatedBy ? ` · ${h.generatedBy}` : ''}
                  </span>
                </div>
                <span className={styles.historyFormat}>
                  {h.exportedFormats.map((f) => (
                    <Badge key={f} variant={f === 'PDF' ? 'info' : 'success'} size="sm">
                      {f}
                    </Badge>
                  ))}
                </span>
                <span className={styles.historyDate}>
                  {new Date(h.generatedAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <button
                  type="button"
                  className={styles.historyDelete}
                  onClick={() => void removeEntry(h.id)}
                  aria-label="Supprimer de l'historique"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
