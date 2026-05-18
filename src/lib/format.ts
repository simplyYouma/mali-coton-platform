/**
 * Formatters — locale-aware. Centralised for consistency.
 */

import { formatDistanceToNow, format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

function safeDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  const date = safeDate(iso);
  if (!date) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function formatDateTime(
  iso: string | null | undefined,
  pattern = 'dd MMM yyyy · HH:mm',
): string {
  const date = safeDate(iso);
  if (!date) return '—';
  return formatDate(date, pattern, { locale: fr });
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatMeasurement(value: number, unit: string, fractionDigits = 2): string {
  return `${formatNumber(value, fractionDigits)} ${unit}`;
}

export function formatGps(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(4)}° ${latDir} · ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}
