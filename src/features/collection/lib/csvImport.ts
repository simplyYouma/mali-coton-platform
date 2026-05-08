import * as XLSX from 'xlsx';
import { uuid } from '@/lib/uuid';
import { findRule, INDICATOR_RULES } from './indicatorRules';
import type { Collection, Measurement } from '../api/collection.types';
import type { Site } from '@/features/sites/api/site.types';

/**
 * Import bulk de collectes depuis un export CSV/XLSX (ex. Kobo Collect).
 *
 * Hypothèses :
 * - 1 ligne = 1 collecte
 * - Colonnes site_id, site, collected_at, gps_lat, gps_lng détectées par alias
 * - Toute autre colonne dont le nom matche un indicator id devient une mesure
 */

export interface ParsedRow {
  raw: Record<string, string>;
  rowIndex: number;
}

export interface RowDiagnostic {
  rowIndex: number;
  status: 'ok' | 'rejected' | 'partial';
  issues: string[];
  /** Si construite, la collecte prête à être ingestée. */
  collection?: Collection;
}

const SITE_ALIASES = ['site_id', 'site', 'site_code', 'siteid', 'shortname', 'short_name'];
const COLLECTED_ALIASES = [
  'collected_at',
  'date',
  'datetime',
  'timestamp',
  'submitted_at',
  '_submission_time',
];
const LAT_ALIASES = ['gps_lat', 'lat', 'latitude', '_geolocation_latitude'];
const LNG_ALIASES = ['gps_lng', 'lng', 'lon', 'longitude', '_geolocation_longitude'];

function pickAlias(headers: string[], aliases: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return headers[idx]!;
  }
  return null;
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
    raw: false,
    defval: '',
  });

  return rows.map((raw, idx) => ({
    raw: Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === undefined || v === null ? '' : String(v)]),
    ) as Record<string, string>,
    rowIndex: idx + 2, // +2 = entête + base 1
  }));
}

export interface MappingHint {
  siteCol: string | null;
  collectedCol: string | null;
  latCol: string | null;
  lngCol: string | null;
  /** Map column name -> indicator id (auto-detected) */
  measurementColumns: Map<string, string>;
}

export function detectMapping(rows: ParsedRow[]): MappingHint {
  if (rows.length === 0) {
    return {
      siteCol: null,
      collectedCol: null,
      latCol: null,
      lngCol: null,
      measurementColumns: new Map(),
    };
  }
  const headers = Object.keys(rows[0]!.raw);
  const measurementColumns = new Map<string, string>();
  for (const h of headers) {
    const norm = h.toLowerCase().trim().replace(/\s+/g, '_');
    const rule = INDICATOR_RULES.find(
      (r) => r.id.toLowerCase() === norm || r.id.split('.')[1] === norm,
    );
    if (rule) measurementColumns.set(h, rule.id);
  }
  return {
    siteCol: pickAlias(headers, SITE_ALIASES),
    collectedCol: pickAlias(headers, COLLECTED_ALIASES),
    latCol: pickAlias(headers, LAT_ALIASES),
    lngCol: pickAlias(headers, LNG_ALIASES),
    measurementColumns,
  };
}

export function buildCollections(
  rows: ParsedRow[],
  mapping: MappingHint,
  options: { agentId: string; sites: Site[] },
): RowDiagnostic[] {
  return rows.map(({ raw, rowIndex }) => {
    const issues: string[] = [];

    /* Site resolution */
    const siteRaw = mapping.siteCol ? (raw[mapping.siteCol] ?? '').trim() : '';
    let siteId: string | null = null;
    if (siteRaw) {
      const exact = options.sites.find(
        (s) =>
          s.id.toLowerCase() === siteRaw.toLowerCase() ||
          s.shortName.toLowerCase() === siteRaw.toLowerCase(),
      );
      if (exact) siteId = exact.id;
    }
    if (!siteId) issues.push('site introuvable');

    /* Date */
    const collectedRaw = mapping.collectedCol
      ? (raw[mapping.collectedCol] ?? '').trim()
      : '';
    let collectedAt: string;
    if (collectedRaw) {
      const d = new Date(collectedRaw);
      if (Number.isNaN(d.getTime())) {
        issues.push('date invalide');
        collectedAt = new Date().toISOString();
      } else {
        collectedAt = d.toISOString();
      }
    } else {
      issues.push('date absente');
      collectedAt = new Date().toISOString();
    }

    /* GPS */
    const lat = mapping.latCol ? Number(raw[mapping.latCol]) : NaN;
    const lng = mapping.lngCol ? Number(raw[mapping.lngCol]) : NaN;
    const gps =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, accuracyMeters: 50 }
        : null;
    if (!gps) issues.push('GPS manquant');

    /* Measurements */
    const measurements: Measurement[] = [];
    mapping.measurementColumns.forEach((indicatorId, col) => {
      const v = (raw[col] ?? '').trim();
      if (v === '') return;
      const num = Number(v);
      const value: number | string = Number.isFinite(num) ? num : v;
      const rule = findRule(indicatorId);
      const m: Measurement = {
        indicatorId,
        acquisition: rule?.defaultAcquisition ?? 'in_situ',
        value,
        unit: rule?.unit,
      };
      measurements.push(m);
    });
    if (measurements.length === 0) issues.push('aucune mesure');

    if (!siteId) {
      return { rowIndex, status: 'rejected', issues };
    }

    const collection: Collection = {
      id: `c-import-${uuid().slice(0, 8)}`,
      siteId,
      agentId: options.agentId,
      collectedAt,
      status: 'pending_sync',
      syncedAt: null,
      gps,
      measurements,
      photos: [],
      notes: 'Import en lot',
      agentCertified: true,
    };

    return {
      rowIndex,
      status: issues.length === 0 ? 'ok' : 'partial',
      issues,
      collection,
    };
  });
}
