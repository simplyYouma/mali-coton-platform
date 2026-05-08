import Dexie, { type Table } from 'dexie';
import { uuid } from '@/lib/uuid';
import type { Collection } from '../api/collection.types';
import type { Lab } from '../api/labs.types';

/**
 * Outbox = file de mutations à rejouer dès reconnexion.
 * Idempotency-Key généré côté client pour permettre une reprise sûre.
 */
export interface OutboxEntry {
  id: string;
  collectionId: string;
  payload: Collection;
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

class MaliCotonDb extends Dexie {
  collections!: Table<Collection, string>;
  outbox!: Table<OutboxEntry, string>;
  labs!: Table<Lab, string>;

  constructor() {
    super('mali-coton');
    this.version(1).stores({
      collections: 'id, siteId, agentId, status, collectedAt',
      outbox: 'id, collectionId, createdAt',
    });
    this.version(2).stores({
      collections: 'id, siteId, agentId, status, collectedAt',
      drafts: 'id, agentId, siteId, updatedAt',
      outbox: 'id, collectionId, createdAt, attempts',
      photos: 'id, collectionId, draftId, kind, takenAt',
      labs: 'id',
    });
    // v3 — wizard supprimé : drafts/photos retirés du modèle.
    this.version(3).stores({
      collections: 'id, siteId, agentId, status, collectedAt',
      outbox: 'id, collectionId, createdAt, attempts',
      labs: 'id',
      drafts: null,
      photos: null,
    });
  }
}

export const offlineDb = new MaliCotonDb();

/* ── Collections (cache local) ───────────────── */

export function getLocalCollection(id: string): Promise<Collection | undefined> {
  return offlineDb.collections.get(id);
}

export function listLocalCollectionsForAgent(agentId: string): Promise<Collection[]> {
  return offlineDb.collections.where('agentId').equals(agentId).toArray();
}

export function upsertLocalCollection(collection: Collection): Promise<string> {
  return offlineDb.collections.put(collection);
}

export function deleteLocalCollection(id: string): Promise<void> {
  return offlineDb.collections.delete(id);
}

/* ── Outbox (file de synchro import → API) ───── */

export async function enqueueSync(collection: Collection): Promise<void> {
  await offlineDb.outbox.put({
    id: uuid(),
    collectionId: collection.id,
    payload: collection,
    idempotencyKey: uuid(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

export function countOutbox(): Promise<number> {
  return offlineDb.outbox.count();
}

export function listOutbox(): Promise<OutboxEntry[]> {
  return offlineDb.outbox.orderBy('createdAt').toArray();
}

export function markOutboxAttempt(id: string, error?: string): Promise<number> {
  return offlineDb.outbox
    .where('id')
    .equals(id)
    .modify((entry) => {
      entry.attempts += 1;
      if (error !== undefined) entry.lastError = error;
    });
}

export function removeOutboxEntry(id: string): Promise<void> {
  return offlineDb.outbox.delete(id);
}

/* ── Labs (référentiel cache) ────────────────── */

export async function listCachedLabs(): Promise<Lab[]> {
  const all = await offlineDb.labs.toArray();
  return all.filter((lab) => lab.isActive);
}

export function listAllCachedLabs(): Promise<Lab[]> {
  return offlineDb.labs.toArray();
}

export async function cacheLabs(labs: Lab[]): Promise<void> {
  await offlineDb.labs.bulkPut(labs);
}
