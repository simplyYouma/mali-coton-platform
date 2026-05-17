import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import type { Collection, Indicator, Measurement } from './collection.types';

export interface CollectionsQuery {
  siteId?: string;
  status?: string;
  agentId?: string;
}

export function fetchCollections(query: CollectionsQuery = {}): Promise<Paginated<Collection>> {
  return http<Paginated<Collection>>('/collections', { query: { ...query } });
}

export function fetchCollection(id: string): Promise<Collection> {
  return http<Collection>(`/collections/${id}`);
}

export function fetchIndicators(): Promise<Paginated<Indicator>> {
  return http<Paginated<Indicator>>('/indicators');
}

/**
 * Soumet une collecte au backend (utilisée par la sync queue) — CDC §3.3.
 * Header `Idempotency-Key` exigé pour permettre une reprise sûre.
 */
export function syncCollection(
  collection: Collection,
  idempotencyKey: string,
): Promise<Collection> {
  return http<Collection>('/collections/sync', {
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
  return http<Collection>(`/collections/${id}`, {
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
  return http<Collection>(`/collections/${id}`, {
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
 * Demande une correction ciblée à l'agent — moins violent que le rejet.
 * La collecte revient en statut `needs_correction`, l'agent peut rouvrir
 * le wizard à l'étape concernée et resoumettre. CDC §5.2.3 « Corriger ».
 */
export function requestCorrection(
  id: string,
  requestedBy: string,
  notes: string,
  targetSteps?: string[],
): Promise<Collection> {
  return http<Collection>(`/collections/${id}`, {
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
 * Patch d'une mesure individuelle — utilisé pour la saisie différée des
 * résultats labo (CDC §7.2 modèle hybride).
 */
export function patchMeasurement(
  collectionId: string,
  indicatorId: string,
  patch: Partial<Measurement>,
): Promise<Collection> {
  return http<Collection>(`/collections/${collectionId}/measurements/${indicatorId}`, {
    method: 'PATCH',
    body: patch,
  });
}

/* ─── Workflow labo : actions sur un flacon (containerId) ─── */

export interface SendSampleInput {
  collectionId: string;
  containerId: string;
  sentBy: string;
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
  /** Valeurs analysées par indicateur du flacon. */
  values: Array<{ indicatorId: string; value: number | string }>;
}

export interface RejectBordereauInput {
  collectionId: string;
  containerId: string;
  rejectedBy: string;
  reason: string;
}

export function markSampleSent(input: SendSampleInput): Promise<Collection> {
  return http<Collection>(`/collections/${input.collectionId}/lab-samples/${input.containerId}/send`, {
    method: 'POST',
    body: { sentBy: input.sentBy },
  });
}

export function markSampleReceived(input: ReceiveSampleInput): Promise<Collection> {
  return http<Collection>(`/collections/${input.collectionId}/lab-samples/${input.containerId}/receive`, {
    method: 'POST',
    body: { receivedBy: input.receivedBy },
  });
}

export function refuseSample(input: RefuseSampleInput): Promise<Collection> {
  return http<Collection>(`/collections/${input.collectionId}/lab-samples/${input.containerId}/refuse`, {
    method: 'POST',
    body: { reason: input.reason, refusedBy: input.refusedBy },
  });
}

export function transmitBordereau(input: TransmitBordereauInput): Promise<Collection> {
  return http<Collection>(`/collections/${input.collectionId}/lab-samples/${input.containerId}/transmit`, {
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
  return http<Collection>(`/collections/${input.collectionId}/lab-samples/${input.containerId}/reject`, {
    method: 'POST',
    body: { reason: input.reason, rejectedBy: input.rejectedBy },
  });
}
