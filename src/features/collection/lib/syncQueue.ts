import { syncCollection } from '../api/collections';
import { HttpError } from '@/lib/http';
import {
  countOutbox,
  listOutbox,
  markOutboxAttempt,
  removeOutboxEntry,
  upsertLocalCollection,
  type OutboxEntry,
} from './offlineDb';

/**
 * Outbox processor — CDC §3.3 mode offline + tech-spec §6.2 cycle de vie
 * d'une collecte offline.
 *
 * Comportement :
 *  - lit toutes les entrées en attente (FIFO sur createdAt)
 *  - tente un POST /collections/sync avec Idempotency-Key persisté
 *  - succès 2xx → met à jour la collecte locale (statut serveur, syncedAt) +
 *    supprime l'entrée outbox
 *  - 4xx (sauf 408/429) → considéré non-retryable : suppression de l'outbox
 *    + flag local d'erreur (le superviseur verra la collecte en 'rejected'
 *    après remontée backend). En maquette, on s'arrête à abandon outbox
 *    + log d'erreur.
 *  - 5xx / 408 / 429 / network → retryable : on incrémente `attempts` et
 *    laisse l'entrée pour le prochain cycle.
 *
 * Pas de boucle interne ici : c'est `useSyncQueue` qui orchestre la cadence
 * via 'online' event + retry exponentiel borné.
 */

export const MAX_ATTEMPTS = 6;

export interface SyncCycleResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

function isRetryableHttpError(err: unknown): boolean {
  if (!(err instanceof HttpError)) return true; // network / unknown → on retente
  if (err.status >= 500) return true;
  if (err.status === 408 || err.status === 429) return true;
  return false;
}

async function processEntry(entry: OutboxEntry): Promise<'success' | 'retry' | 'abandoned'> {
  try {
    const updated = await syncCollection(entry.payload, entry.idempotencyKey);
    await upsertLocalCollection(updated);
    await removeOutboxEntry(entry.id);
    return 'success';
  } catch (err) {
    if (entry.attempts + 1 >= MAX_ATTEMPTS) {
      await markOutboxAttempt(
        entry.id,
        err instanceof Error ? err.message : 'unknown_error',
      );
      // Au-delà de MAX_ATTEMPTS on retire l'entrée et on log côté console —
      // en prod, ça remontera dans un endpoint d'erreurs / Sentry.
      await removeOutboxEntry(entry.id);
      // eslint-disable-next-line no-console
      console.warn(
        `[sync] entry ${entry.id} abandonnée après ${entry.attempts + 1} tentatives`,
        err,
      );
      return 'abandoned';
    }
    if (isRetryableHttpError(err)) {
      await markOutboxAttempt(
        entry.id,
        err instanceof Error ? err.message : 'unknown_error',
      );
      return 'retry';
    }
    // Erreur non retryable (4xx hors 408/429) : on retire et on log.
    await removeOutboxEntry(entry.id);
    // eslint-disable-next-line no-console
    console.warn(`[sync] entry ${entry.id} non retryable, supprimée`, err);
    return 'abandoned';
  }
}

export async function runSyncCycle(): Promise<SyncCycleResult> {
  const entries = await listOutbox();
  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    const outcome = await processEntry(entry);
    if (outcome === 'success') succeeded += 1;
    else if (outcome === 'retry') failed += 1;
    // 'abandoned' n'est ni succeeded ni failed (nettoyé)
  }

  const remaining = await countOutbox();
  return {
    processed: entries.length,
    succeeded,
    failed,
    remaining,
  };
}

export function getOutboxCount(): Promise<number> {
  return countOutbox();
}
