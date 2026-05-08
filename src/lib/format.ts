/**
 * Formatters — locale-aware. Centralised for consistency.
 */

import { formatDistanceToNow, format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function formatDateTime(iso: string, pattern = 'dd MMM yyyy · HH:mm'): string {
  return formatDate(new Date(iso), pattern, { locale: fr });
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
