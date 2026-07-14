import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated, iriToId } from '@/lib/jsonld';
import type { Collection, Indicator, Measurement } from './collection.types';
import {
  toCollection,
  toCollectionFromKoboImport,
  type CollecteTerrain,
} from './collections.adapter';
import type { ImportKoboHistory } from './koboImport';

export interface CollectionsQuery {
  siteId?: string;
  status?: string;
  agentId?: string;
}

export async function fetchCollections(
  _query: CollectionsQuery = {},
): Promise<Paginated<Collection>> {
  // En live : les collectes proviennent des imports Kobo (GET /api/import_kobos)
  const raw = await http<unknown>(resourcePath('collections'));
  if (API_MODE === 'live') {
    const page = unwrapPaginated<ImportKoboHistory>(raw);
    return { ...page, items: page.items.map(toCollectionFromKoboImport) };
  }
  return raw as Paginated<Collection>;
}

export async function fetchCollection(id: string): Promise<Collection> {
  const raw = await http<CollecteTerrain>(resourcePath('collections', id));
  return API_MODE === 'live' ? toCollection(raw) : (raw as unknown as Collection);
}

export async function fetchIndicators(): Promise<Paginated<Indicator>> {
  const raw = await http<unknown>(resourcePath('indicators'));
  if (API_MODE === 'live') return unwrapPaginated<Indicator>(raw);
  return raw as Paginated<Indicator>;
}

/**
 * Soumet une collecte au backend — CDC §3.3.
 * Header `Idempotency-Key` exigé pour permettre une reprise sûre.
 */
export function syncCollection(
  collection: Collection,
  idempotencyKey: string,
): Promise<Collection> {
  return http<Collection>(resourcePath('collections') + '/sync', {
    method: 'POST',
    body: collection,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

/**
 * Valide une collecte (action superviseur — CDC §5.1).
 */
export function validateCollection(
  id: string,
  validatedBy: string,
  notes?: string,
): Promise<Collection> {
  return http<Collection>(resourcePath('collections', id), {
    method: 'PATCH',
    body: {
      status: 'validated',
      validatedBy,
      validatedAt: new Date().toISOString(),
      validationNotes: notes,
    },
  });
}

/**
 * Rejette une collecte avec motif obligatoire (CDC §5.1 + §7.5).
 */
export function rejectCollection(
  id: string,
  validatedBy: string,
  rejectionReason: string,
): Promise<Collection> {
  return http<Collection>(resourcePath('collections', id), {
    method: 'PATCH',
    body: {
      status: 'rejected',
      validatedBy,
      validatedAt: new Date().toISOString(),
      rejectionReason,
    },
  });
}

/**
 * Demande une correction ciblée à l'agent — CDC §5.2.3.
 */
export function requestCorrection(
  id: string,
  requestedBy: string,
  notes: string,
  targetSteps?: string[],
): Promise<Collection> {
  return http<Collection>(resourcePath('collections', id), {
    method: 'PATCH',
    body: {
      status: 'needs_correction',
      correctionRequest: {
        requestedBy,
        requestedAt: new Date().toISOString(),
        notes,
        targetSteps,
      },
    },
  });
}

/**
 * Patch d'une mesure individuelle — CDC §7.2 modèle hybride.
 */
export function patchMeasurement(
  collectionId: string,
  indicatorId: string,
  patch: Partial<Measurement>,
): Promise<Collection> {
  return http<Collection>(
    `${resourcePath('collections', collectionId)}/measurements/${indicatorId}`,
    { method: 'PATCH', body: patch },
  );
}

/* ─── Workflow labo ─── */

export interface SendSampleInput {
  collectionId: string;
  containerId: string;
  sentBy: string;
  labId: string;
}

export interface ReceiveSampleInput {
  collectionId: string;
  containerId: string;
  receivedBy: string;
}

export interface RefuseSampleInput {
  collectionId: string;
  containerId: string;
  reason: string;
  refusedBy: string;
}

export interface TransmitBordereauInput {
  collectionId: string;
  containerId: string;
  analyzedBy: string;
  bordereauRef?: string;
  bordereauUrl?: string;
  values: Array<{ indicatorId: string; value: number | string }>;
}

export interface RejectBordereauInput {
  collectionId: string;
  containerId: string;
  rejectedBy: string;
  reason: string;
}

export function markSampleSent(input: SendSampleInput): Promise<Collection> {
  const base = resourcePath('collections', input.collectionId);
  return http<Collection>(`${base}/lab-samples/${input.containerId}/send`, {
    method: 'POST',
    body: { sentBy: input.sentBy, labId: input.labId },
  });
}

export function markSampleReceived(input: ReceiveSampleInput): Promise<Collection> {
  const base = resourcePath('collections', input.collectionId);
  return http<Collection>(`${base}/lab-samples/${input.containerId}/receive`, {
    method: 'POST',
    body: { receivedBy: input.receivedBy },
  });
}

export function refuseSample(input: RefuseSampleInput): Promise<Collection> {
  const base = resourcePath('collections', input.collectionId);
  return http<Collection>(`${base}/lab-samples/${input.containerId}/refuse`, {
    method: 'POST',
    body: { reason: input.reason, refusedBy: input.refusedBy },
  });
}

export function transmitBordereau(input: TransmitBordereauInput): Promise<Collection> {
  const base = resourcePath('collections', input.collectionId);
  return http<Collection>(`${base}/lab-samples/${input.containerId}/transmit`, {
    method: 'POST',
    body: {
      analyzedBy: input.analyzedBy,
      bordereauRef: input.bordereauRef,
      bordereauUrl: input.bordereauUrl,
      values: input.values,
    },
  });
}

export function rejectBordereau(input: RejectBordereauInput): Promise<Collection> {
  const base = resourcePath('collections', input.collectionId);
  return http<Collection>(`${base}/lab-samples/${input.containerId}/reject`, {
    method: 'POST',
    body: { reason: input.reason, rejectedBy: input.rejectedBy },
  });
}

// Évite un import inutilisé du lint
void iriToId;
