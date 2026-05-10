import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Printer,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Select, Skeleton } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { useSites } from '@/features/sites/hooks/useSites';
import { mockUsers } from '@/mocks/fixtures/users';
import { buildAggregate } from '../lib/aggregator';
import {
  REPORT_TEMPLATES,
  defaultPeriod,
  periodLabel,
  templateById,
  type ReportTemplateId,
} from '../lib/reportSpec';
import { exportReportToXlsx } from '../lib/xlsxExport';
import { ReportPreview } from '../components/ReportPreview';
import { useReportHistory } from '../hooks/useReportHistory';
import styles from './ReportingPage.module.css';

const TEMPLATE_TONES: Record<ReportTemplateId, string> = {
  monthly: 'primary',
  quarterly: 'navy',
  final: 'accent',
};

const SECTION_LABEL: Record<string, string> = {
  cover: 'Couverture',
  executive: 'Synthèse exécutive',
  kpis: 'Indicateurs clés',
  domains: 'Conformité par domaine',
  exceedances: 'Dépassements',
  alerts: 'Alertes',
  lab: 'Laboratoire',
  silences: 'Présence terrain',
  baseline: 'Comparaison référence 2025',
  recommendations: 'Recommandations',
  legal: 'Cadre légal',
  appendix: 'Annexe',
};

function sectionLabelOf(id?: string): string {
  if (!id) return '';
  return SECTION_LABEL[id] ?? id;
}

export function ReportingPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [templateId, setTemplateId] = useState<ReportTemplateId>('monthly');
  const initial = defaultPeriod('monthly');
  const [from, setFrom] = useState<string>(initial.from.slice(0, 10));
  const [to, setTo] = useState<string>(initial.to.slice(0, 10));
  const [siteId, setSiteId] = useState<string>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<'next' | 'prev' | null>(null);
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);

  const pickTemplate = (id: ReportTemplateId) => {
    setTemplateId(id);
    setIsCustomPeriod(false);
    const p = defaultPeriod(id);
    setFrom(p.from.slice(0, 10));
    setTo(p.to.slice(0, 10));
  };
  const onChangeFrom = (v: string) => {
    setFrom(v);
    setIsCustomPeriod(true);
  };
  const onChangeTo = (v: string) => {
    setTo(v);
    setIsCustomPeriod(true);
  };

  // Reset à la page 0 quand le périmètre du rapport change
  useEffect(() => {
    setPageIndex(0);
    setFlipDir(null);
  }, [templateId, from, to, siteId]);

  const { data: collectionsPage, isLoading: cLoad } = useCollections();
  const { data: alertsPage, isLoading: aLoad } = useAlerts();
  const { data: sitesPage, isLoading: sLoad } = useSites();
  const isLoading = cLoad || aLoad || sLoad;

  const { items: history, recordGeneration, removeEntry } = useReportHistory();

  const template = templateById(templateId);
  const sites = sitesPage?.items ?? [];
  const selectedSite = sites.find((s) => s.id === siteId);
  const totalPages = template.sections.length;
  const currentPage = Math.min(pageIndex, totalPages - 1);

  const goPrev = () => {
    if (currentPage <= 0) return;
    setFlipDir('prev');
    setPageIndex(currentPage - 1);
  };
  const goNext = () => {
    if (currentPage >= totalPages - 1) return;
    setFlipDir('next');
    setPageIndex(currentPage + 1);
  };

  // Navigation clavier ← / → (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const aggregate = useMemo(() => {
    if (!collectionsPage || !alertsPage || !sitesPage) return null;
    const fromIso = new Date(`${from}T00:00:00`).toISOString();
    const toIso = new Date(`${to}T23:59:59`).toISOString();
    return buildAggregate(
      collectionsPage.items,
      alertsPage.items,
      sitesPage.items,
      { from: fromIso, to: toIso, label: periodLabel(fromIso, toIso) },
      { siteId: siteId === 'all' ? undefined : siteId },
    );
  }, [collectionsPage, alertsPage, sitesPage, from, to, siteId]);

  const generatedByName = useMemo(() => {
    if (!user) return undefined;
    return mockUsers.find((u) => u.id === user.id)?.fullName ?? user.id;
  }, [user]);

  const handlePrint = () => {
    if (!aggregate) return;
    const root = document.getElementById('report-print-root');
    if (!root) return;

    // Hoist le rapport à <body> : sort des parents avec transform/overflow
    // qui le clipperaient à l'impression. On rétablit après.
    const parent = root.parentNode!;
    const nextSibling = root.nextSibling;
    document.body.appendChild(root);

    // Force toutes les pages visibles dans la sortie PDF
    const hiddenPages = Array.from(
      root.querySelectorAll<HTMLElement>('[data-active="false"]'),
    );
    hiddenPages.forEach((el) => el.setAttribute('data-active', 'true'));

    document.body.classList.add('printing-report');
    window.print();
    document.body.classList.remove('printing-report');

    // Restore l'état d'aperçu
    hiddenPages.forEach((el) => el.setAttribute('data-active', 'false'));
    if (nextSibling) parent.insertBefore(root, nextSibling);
    else parent.appendChild(root);

    void recordGeneration({
      templateId,
      templateTitle: template.title,
      periodLabel: aggregate.period.label,
      scopeLabel: selectedSite ? selectedSite.shortName : 'Multi-sites',
      generatedBy: generatedByName,
      exportedFormats: ['PDF'],
    });
    toast.success('Boîte d\'impression ouverte — choisissez « Enregistrer en PDF ».');
  };

  const handleXlsx = () => {
    if (!aggregate) return;
    try {
      exportReportToXlsx(aggregate, template, selectedSite?.shortName);
      void recordGeneration({
        templateId,
        templateTitle: template.title,
        periodLabel: aggregate.period.label,
        scopeLabel: selectedSite ? selectedSite.shortName : 'Multi-sites',
        generatedBy: generatedByName,
        exportedFormats: ['XLSX'],
      });
      toast.success('Export XLSX téléchargé.');
    } catch {
      toast.error('Échec de l\'export XLSX.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Reporting automatisé</span>
          <h1 className={styles.heroTitle}>Rapports</h1>
        </div>
      </header>

      <section className={styles.templateGrid} aria-label="Templates disponibles">
        {(Object.keys(REPORT_TEMPLATES) as ReportTemplateId[]).map((id) => {
          const t = REPORT_TEMPLATES[id];
          const active = id === templateId && !isCustomPeriod;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pickTemplate(id)}
              className={`${styles.templateCard} ${active ? styles.templateCardActive : ''}`}
              data-tone={TEMPLATE_TONES[id]}
              aria-pressed={active}
            >
              <header className={styles.templateHead}>
                <span className={styles.templateIcon} aria-hidden="true">
                  <FileText size={18} />
                </span>
                <span className={styles.templateCadence}>{t.cadenceLabel}</span>
              </header>
              <h3 className={styles.templateTitle}>{t.title}</h3>
              <p className={styles.templateDesc}>{t.description}</p>
              <footer className={styles.templateFoot}>
                <span>{t.audience}</span>
                <span>· ~{t.approxPages} pages</span>
              </footer>
            </button>
          );
        })}
      </section>

      <section className={styles.controls} aria-label="Paramètres du rapport">
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            <Calendar size={12} aria-hidden="true" /> Du
          </label>
          <input
            type="date"
            className={styles.controlInput}
            value={from}
            onChange={(e) => onChangeFrom(e.target.value)}
          />
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>au</label>
          <input
            type="date"
            className={styles.controlInput}
            value={to}
            onChange={(e) => onChangeTo(e.target.value)}
          />
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            <Globe2 size={12} aria-hidden="true" /> Périmètre
          </label>
          <Select
            value={siteId}
            onChange={setSiteId}
            options={[
              { value: 'all', label: 'Multi-sites (tous)' },
              ...sites.map((s) => ({ value: s.id, label: `Mono · ${s.shortName}` })),
            ]}
          />
        </div>
        <div className={styles.controlActions}>
          <Button
            variant="secondary"
            iconLeft={<FileSpreadsheet size={14} />}
            onClick={handleXlsx}
            disabled={!aggregate}
          >
            Exporter XLSX
          </Button>
          <Button
            variant="primary"
            iconLeft={<Printer size={14} />}
            onClick={handlePrint}
            disabled={!aggregate}
          >
            Générer PDF
          </Button>
        </div>
      </section>

      <section className={styles.previewWrap} aria-label="Aperçu du rapport">
        <header className={styles.previewHead}>
          <div>
            <span className={styles.previewEyebrow}>Aperçu live</span>
            <h2 className={styles.previewTitle}>{template.title}</h2>
            <p className={styles.previewMeta}>
              {aggregate?.period.label ?? '—'} ·{' '}
              {selectedSite ? `Mono-site · ${selectedSite.shortName}` : 'Multi-sites'}
            </p>
          </div>
          {aggregate ? (
            <Badge variant="info" size="sm">
              {aggregate.collections.length} collectes incluses
            </Badge>
          ) : null}
        </header>

        <div className={styles.previewSurface}>
          {isLoading || !aggregate ? (
            <div className={styles.previewLoading}>
              <Skeleton width="210mm" height="297mm" />
            </div>
          ) : (
            <div className={styles.previewStage}>
              <button
                type="button"
                className={`${styles.flipNav} ${styles.flipPrev}`}
                onClick={goPrev}
                disabled={currentPage <= 0}
                aria-label="Page précédente"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                key={`${templateId}-${currentPage}-${flipDir ?? 'none'}`}
                className={`${styles.previewScale} ${flipDir === 'next' ? styles.flipNext : flipDir === 'prev' ? styles.flipPrevAnim : ''}`}
              >
                <ReportPreview
                  template={template}
                  aggregate={aggregate}
                  siteShortName={selectedSite?.shortName}
                  generatedByName={generatedByName}
                  activePageIndex={currentPage}
                />
              </div>

              <button
                type="button"
                className={`${styles.flipNav} ${styles.flipNext}`}
                onClick={goNext}
                disabled={currentPage >= totalPages - 1}
                aria-label="Page suivante"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {aggregate ? (
          <footer className={styles.previewFooter} data-print-hide="true">
            <span className={styles.pageCounter}>
              Page <strong>{currentPage + 1}</strong> sur {totalPages}
              <span className={styles.pageSection}>
                · {sectionLabelOf(template.sections[currentPage])}
              </span>
            </span>
            <div className={styles.pageDots}>
              {template.sections.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.pageDot} ${i === currentPage ? styles.pageDotActive : ''}`}
                  onClick={() => {
                    setFlipDir(i > currentPage ? 'next' : 'prev');
                    setPageIndex(i);
                  }}
                  aria-label={`Aller à la page ${i + 1}`}
                  title={sectionLabelOf(id)}
                />
              ))}
            </div>
          </footer>
        ) : null}
      </section>

      <section className={styles.history} aria-label="Historique des rapports générés">
        <header className={styles.historyHead}>
          <div>
            <h2 className={styles.historyTitle}>Historique</h2>
            <p className={styles.historyMeta}>
              {history.length === 0
                ? 'Aucun rapport généré sur cet appareil pour le moment.'
                : `${history.length} dernier${history.length > 1 ? 's' : ''} rapport${history.length > 1 ? 's' : ''} généré${history.length > 1 ? 's' : ''} — stocké${history.length > 1 ? 's' : ''} localement.`}
            </p>
          </div>
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
        ) : (
          <div className={styles.historyEmpty}>
            <Download size={20} aria-hidden="true" />
            <span>L'historique se remplit dès que vous générez un rapport.</span>
          </div>
        )}
      </section>
    </div>
  );
}
