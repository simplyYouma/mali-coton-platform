import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOffline, useOfflineStore } from '@/app/providers/OfflineProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { getOutboxCount, runSyncCycle } from '../lib/syncQueue';

/**
 * Coordonne l'exécution du sync queue :
 *  - met à jour `pendingSyncCount` (badge topbar) à intervalles réguliers
 *  - déclenche un cycle dès qu'on repasse online
 *  - retry exponentiel borné si des entrées échouent (network/5xx)
 *
 * Doit être monté UNE seule fois au top de l'AppLayout.
 */

const POLL_MS = 5000;
const RETRY_BASE_MS = 8_000;
const RETRY_MAX_MS = 60_000;

export function useSyncQueue() {
  const { isOnline, simulatedOffline } = useOffline();
  const setPendingSyncCount = useOfflineStore((s) => s.setPendingSyncCount);
  const queryClient = useQueryClient();
  const toast = useToast();

  const retryDelayRef = useRef<number>(RETRY_BASE_MS);
  const inFlightRef = useRef<boolean>(false);
  const retryTimerRef = useRef<number | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await getOutboxCount();
    setPendingSyncCount(count);
    return count;
  }, [setPendingSyncCount]);

  const trigger = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!isOnline || simulatedOffline) {
      await refreshCount();
      return;
    }
    inFlightRef.current = true;
    try {
      const before = await refreshCount();
      if (before === 0) return;

      const result = await runSyncCycle();
      await refreshCount();

      if (result.succeeded > 0) {
        retryDelayRef.current = RETRY_BASE_MS;
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        toast.success(
          result.succeeded === 1
            ? '1 collecte synchronisée.'
            : `${result.succeeded} collectes synchronisées.`,
        );
      }

      if (result.failed > 0) {
        // backoff exponentiel borné
        const delay = Math.min(retryDelayRef.current * 2, RETRY_MAX_MS);
        retryDelayRef.current = delay;
        if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = window.setTimeout(() => {
          void trigger();
        }, delay);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [isOnline, simulatedOffline, refreshCount, queryClient, toast]);

  // Polling régulier du compteur (badge topbar reste à jour si soumissions externes)
  useEffect(() => {
    void refreshCount();
    const id = window.setInterval(() => {
      void refreshCount();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  // Déclenche un cycle quand on repasse online (vrai ou simulé)
  useEffect(() => {
    if (isOnline && !simulatedOffline) {
      void trigger();
    }
  }, [isOnline, simulatedOffline, trigger]);

  // Cleanup timer au démontage
  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  return { trigger, refreshCount };
}
