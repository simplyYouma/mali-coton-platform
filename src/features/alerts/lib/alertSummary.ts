import type { AlertEntry } from '../api/alerts.types';

/**
 * Génère un résumé déterministe d'une alerte à partir de ses champs structurés
 * (measured.value, threshold.value, category…). Aucun texte écrit à la main —
 * tout vient des données : si on change le seuil, le texte change tout seul.
 */
export function formatAlertSummary(alert: AlertEntry): string {
  switch (alert.category) {
    case 'threshold_exceeded':
      return summaryThresholdExceeded(alert);
    case 'lab_overdue':
      return summaryLabOverdue(alert);
    case 'site_silence':
      return summarySiteSilence(alert);
    case 'data_quality':
      return summaryDataQuality(alert);
    default:
      return '—';
  }
}

function summaryThresholdExceeded(alert: AlertEntry): string {
  if (!alert.measured) return '—';
  const v = formatValue(alert.measured.value);
  const unit = alert.measured.unit ? ` ${alert.measured.unit}` : '';

  if (!alert.threshold) {
    return `Valeur mesurée ${v}${unit}.`;
  }

  const cmp = alert.threshold.comparator;
  const t = formatValue(alert.threshold.value);
  const tunit = alert.threshold.unit ? ` ${alert.threshold.unit}` : '';

  if (cmp === '<=') {
    const ratio = Number(alert.measured.value) / Number(alert.threshold.value);
    if (ratio >= 5) {
      return `Valeur mesurée ${v}${unit} — plus de 5× le seuil ${t}${tunit}.`;
    }
    if (ratio >= 2) {
      return `Valeur mesurée ${v}${unit} — environ ${ratio.toFixed(1)}× le seuil ${t}${tunit}.`;
    }
    return `Valeur mesurée ${v}${unit} — au-delà du seuil ${t}${tunit}.`;
  }
  if (cmp === '>=') {
    return `Valeur mesurée ${v}${unit} — en deçà du seuil minimal ${t}${tunit}.`;
  }
  return `Valeur mesurée ${v}${unit} — hors plage ${t}${tunit}.`;
}

function summaryLabOverdue(alert: AlertEntry): string {
  const days = daysSince(alert.raisedAt);
  return `Délai contractuel dépassé de ${Math.max(0, days)} jour${days > 1 ? 's' : ''} depuis envoi au laboratoire.`;
}

function summarySiteSilence(alert: AlertEntry): string {
  const days = daysSince(alert.raisedAt);
  return `Aucune collecte reçue depuis ${Math.max(7, days)} jours. Visite de rattrapage requise pour maintenir la continuité du suivi.`;
}

function summaryDataQuality(_alert: AlertEntry): string {
  return 'Incohérence de saisie signalée par le superviseur — vérification de la collecte requise.';
}

function formatValue(v: number | string): string {
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1000) return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  }
  return String(v);
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
