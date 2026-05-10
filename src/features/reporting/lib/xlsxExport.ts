import * as XLSX from 'xlsx';
import type { ReportAggregate } from './aggregator';
import type { ReportTemplate } from './reportSpec';
import { findRule } from '@/features/collection/lib/indicatorRules';

/**
 * Export XLSX du rapport — feuilles séparées avec mise en page pro :
 * couverture éditoriale, panes figés sur les listes longues, auto-filters
 * sur les en-têtes, formats numériques (pourcentages, dates, décimales).
 *
 * NB : la version communautaire de SheetJS ne sérialise pas les styles de
 * cellule (font/fill) dans le fichier produit. Mais elle gère `!cols`,
 * `!rows`, `!merges`, `!autofilter`, `!views` (panes), formats `z`. Ce sont
 * ces leviers que l'on utilise pour produire un classeur lisible et pro.
 */
export function exportReportToXlsx(
  agg: ReportAggregate,
  template: ReportTemplate,
  siteShortName?: string,
): void {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `${template.title} — ${formatPeriod(agg.period.from, agg.period.to)}`,
    Subject: 'PASET Mali — Rapport de suivi socio-environnemental',
    Author: 'PASET Mali',
    Company: 'PASET Mali',
    CreatedDate: new Date(agg.generatedAt),
  };

  addCoverSheet(wb, agg, template, siteShortName);
  addSummarySheet(wb, agg);
  addDomainSheet(wb, agg);
  addExceedancesSheet(wb, agg);
  addCollectionsSheet(wb, agg);
  addMeasurementsSheet(wb, agg);
  if (agg.silences.length > 0) addSilencesSheet(wb, agg);

  const filename = `rapport_${template.id}_${slugDate(agg.period.from)}_${slugDate(agg.period.to)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ─────────── Couverture ─────────── */
function addCoverSheet(
  wb: XLSX.WorkBook,
  agg: ReportAggregate,
  template: ReportTemplate,
  siteShortName?: string,
): void {
  const rows: Array<Array<string | number | null>> = [
    [],
    ['', 'PASET MALI · PLATEFORME DE SUIVI SOCIO-ENVIRONNEMENTAL'],
    [],
    ['', template.title.toUpperCase()],
    [],
    ['', 'Document', template.title],
    ['', 'Cadence', template.cadenceLabel],
    [
      '',
      'Période',
      `${formatLong(agg.period.from)} → ${formatLong(agg.period.to)}`,
    ],
    [
      '',
      'Périmètre',
      agg.scope.siteId
        ? `Mono-site · ${siteShortName ?? agg.scope.siteId}`
        : `Multi-sites · ${agg.siteCount} ateliers`,
    ],
    ['', 'Audience', template.audience],
    ['', 'Généré le', formatLongDateTime(agg.generatedAt)],
    [],
    ['', 'INDICATEURS CLÉS DE LA PÉRIODE'],
    [],
    ['', 'Collectes soumises', agg.validation.total],
    ['', 'Collectes validées', agg.validation.validated],
    ['', 'Taux de validation', agg.validation.validationRate / 100],
    ['', 'Alertes critiques', agg.alerts.critical],
    ['', 'Alertes résolues', agg.alerts.resolved],
    ['', 'Bordereaux laboratoire reçus', `${agg.lab.received} / ${agg.lab.total}`],
    [
      '',
      'Délai médian labo',
      agg.lab.medianTurnaroundDays == null
        ? '—'
        : `${agg.lab.medianTurnaroundDays.toFixed(1)} jours`,
    ],
    ['', 'Sites silencieux >14 j', agg.silences.length],
    [],
    [],
    [
      '',
      'Document généré automatiquement par la plateforme PASET Mali à partir des données terrain validées.',
    ],
    ['', 'Indicateurs et seuils alignés sur les Directives OMS et la Norme malienne MN-03-02/002:2006.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 2 }, { wch: 36 }, { wch: 60 }];
  ws['!rows'] = [
    { hpt: 8 },
    { hpt: 22 },
    { hpt: 8 },
    { hpt: 32 }, // titre rapport
    { hpt: 12 },
  ];
  // Format pourcentage sur le taux de validation
  setCellFormat(ws, 'C17', '0%');
  // Fusion des titres
  ws['!merges'] = [
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 12, c: 1 }, e: { r: 12, c: 2 } },
    { s: { r: 25, c: 1 }, e: { r: 25, c: 2 } },
    { s: { r: 26, c: 1 }, e: { r: 26, c: 2 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Couverture');
}

/* ─────────── Synthèse KPI ─────────── */
function addSummarySheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const rows: Array<Array<string | number | null>> = [
    ['Section', 'Indicateur', 'Valeur'],
    ['Validation', 'Total collectes', agg.validation.total],
    ['Validation', 'Validées', agg.validation.validated],
    ['Validation', 'À corriger', agg.validation.needsCorrection],
    ['Validation', 'Rejetées', agg.validation.rejected],
    ['Validation', 'Taux validation', agg.validation.validationRate / 100],
    ['Alertes', 'Total déclenchées', agg.alerts.total],
    ['Alertes', 'Critiques', agg.alerts.critical],
    ['Alertes', 'Surveillance', agg.alerts.warning],
    ['Alertes', 'Actives', agg.alerts.active],
    ['Alertes', 'Résolues', agg.alerts.resolved],
    [
      'Alertes',
      'Délai médian résolution (h)',
      agg.alerts.medianResolutionHours == null
        ? '—'
        : Math.round(agg.alerts.medianResolutionHours),
    ],
    ['Laboratoire', 'Échantillons envoyés', agg.lab.total],
    ['Laboratoire', 'Bordereaux reçus', agg.lab.received],
    ['Laboratoire', 'En attente', agg.lab.pending],
    [
      'Laboratoire',
      'Délai médian (jours)',
      agg.lab.medianTurnaroundDays == null ? '—' : Number(agg.lab.medianTurnaroundDays.toFixed(1)),
    ],
    ['Laboratoire', 'Retards (>10 j)', agg.lab.overdue],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 16 }];
  ws['!autofilter'] = { ref: `A1:C${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  setCellFormat(ws, 'C6', '0%');
  setCellFormat(ws, 'C16', '0.0');
  XLSX.utils.book_append_sheet(wb, ws, 'Synthèse');
}

/* ─────────── Conformité par domaine ─────────── */
function addDomainSheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const headers = [
    'Domaine',
    'Mesures',
    'Conformes',
    'Surveillance',
    'Critiques',
    '% conformes',
    'Niveau dominant',
  ];
  const rows: Array<Array<string | number>> = [headers];
  for (const d of agg.domains) {
    const pct = d.total === 0 ? 0 : d.conforming / d.total;
    rows.push([
      domainLabel(d.domain),
      d.total,
      d.conforming,
      d.warning,
      d.critical,
      pct,
      worstLabel(d.worst),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
  ];
  ws['!autofilter'] = { ref: `A1:G${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  // Format % sur la colonne F
  for (let r = 1; r < rows.length; r += 1) {
    setCellFormat(ws, `F${r + 1}`, '0%');
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Conformité');
}

/* ─────────── Top dépassements ─────────── */
function addExceedancesSheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const headers = [
    'Niveau',
    'Indicateur',
    'Valeur',
    'Unité',
    'Seuil min',
    'Seuil max',
    'Source',
    'Site',
    'Collecte',
    'Date',
  ];
  const rows: Array<Array<string | number | Date>> = [headers];
  for (const e of agg.topExceedances) {
    rows.push([
      e.level === 'critical' ? 'Critique' : 'Surveillance',
      e.indicatorLabel,
      Number(e.value.toFixed(2)),
      e.unit,
      e.threshold.min ?? '—',
      e.threshold.max ?? '—',
      e.source,
      e.siteId,
      e.collectionId.slice(-6).toUpperCase(),
      new Date(e.collectedAt),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 26 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
  ];
  ws['!autofilter'] = { ref: `A1:J${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  for (let r = 1; r < rows.length; r += 1) {
    setCellFormat(ws, `J${r + 1}`, 'dd/mm/yyyy hh:mm');
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Dépassements');
}

/* ─────────── Collectes ─────────── */
function addCollectionsSheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const headers = [
    'Collecte',
    'Site',
    'Agent',
    'Date',
    'Statut',
    'Mesures',
    'Photos',
    'Météo',
    'Temp. °C',
    'GPS lat',
    'GPS lng',
  ];
  const rows: Array<Array<string | number | Date>> = [headers];
  for (const c of agg.collections) {
    rows.push([
      c.id.slice(-6).toUpperCase(),
      c.siteId,
      c.agentId,
      new Date(c.collectedAt),
      statusLabel(c.status),
      c.measurements.length,
      c.photos.length,
      c.context?.weather ?? '',
      c.context?.ambientTempC ?? '',
      c.gps?.lat ?? '',
      c.gps?.lng ?? '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
  ];
  ws['!autofilter'] = { ref: `A1:K${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  for (let r = 1; r < rows.length; r += 1) {
    setCellFormat(ws, `D${r + 1}`, 'dd/mm/yyyy hh:mm');
    setCellFormat(ws, `J${r + 1}`, '0.0000');
    setCellFormat(ws, `K${r + 1}`, '0.0000');
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Collectes');
}

/* ─────────── Mesures détaillées ─────────── */
function addMeasurementsSheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const headers = [
    'Collecte',
    'Site',
    'Date',
    'Domaine',
    'Indicateur',
    'Valeur',
    'Unité',
    'Acquisition',
    'Source',
  ];
  const rows: Array<Array<string | number | Date>> = [headers];
  for (const c of agg.collections) {
    for (const m of c.measurements) {
      const rule = findRule(m.indicatorId);
      rows.push([
        c.id.slice(-6).toUpperCase(),
        c.siteId,
        new Date(c.collectedAt),
        domainLabel(rule?.domain ?? '—'),
        rule?.label ?? m.indicatorId,
        typeof m.value === 'number' ? Number(m.value.toFixed(3)) : (m.value ?? ''),
        m.unit ?? rule?.unit ?? '',
        acquisitionLabel(m.acquisition),
        rule?.source ?? '',
      ]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 26 },
  ];
  ws['!autofilter'] = { ref: `A1:I${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  for (let r = 1; r < rows.length; r += 1) {
    setCellFormat(ws, `C${r + 1}`, 'dd/mm/yyyy');
    setCellFormat(ws, `F${r + 1}`, '0.000');
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Mesures');
}

/* ─────────── Sites silencieux ─────────── */
function addSilencesSheet(wb: XLSX.WorkBook, agg: ReportAggregate): void {
  const headers = ['Site', 'Jours sans collecte', 'Dernière collecte'];
  const rows: Array<Array<string | number | Date>> = [headers];
  for (const s of agg.silences) {
    rows.push([
      s.shortName,
      s.daysSilent,
      s.lastCollectionAt ? new Date(s.lastCollectionAt) : 'Aucune',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 22 }];
  ws['!autofilter'] = { ref: `A1:C${rows.length}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  for (let r = 1; r < rows.length; r += 1) {
    setCellFormat(ws, `C${r + 1}`, 'dd/mm/yyyy hh:mm');
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Silences');
}

/* ─────────── Helpers ─────────── */

function setCellFormat(ws: XLSX.WorkSheet, addr: string, fmt: string): void {
  const cell = ws[addr];
  if (cell) cell.z = fmt;
}

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
function formatLongDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function formatPeriod(from: string, to: string): string {
  return `${new Date(from).toLocaleDateString('fr-FR')} – ${new Date(to).toLocaleDateString('fr-FR')}`;
}
function slugDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function domainLabel(d: string): string {
  const map: Record<string, string> = {
    water: 'Eaux usées',
    soil: 'Sol',
    air: 'Air',
    waste: 'Déchets',
    health: 'Santé / SST',
    socio: 'Socio-éco',
  };
  return map[d] ?? d;
}
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    draft: 'Brouillon',
    pending_sync: 'En attente synchro',
    submitted: 'Soumise',
    awaiting_lab: 'Bordereau attendu',
    lab_complete: 'Bordereaux reçus',
    needs_correction: 'À corriger',
    validated: 'Validée',
    rejected: 'Rejetée',
  };
  return map[s] ?? s;
}
function acquisitionLabel(a: string): string {
  const map: Record<string, string> = {
    in_situ: 'Sur site',
    lab_pending: 'Labo en attente',
    lab_received: 'Labo reçu',
  };
  return map[a] ?? a;
}
function worstLabel(l: string): string {
  if (l === 'critical') return 'Critique';
  if (l === 'warning') return 'À surveiller';
  return 'Conforme';
}
