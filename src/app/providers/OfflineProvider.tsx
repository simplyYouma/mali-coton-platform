import { create } from 'zustand';
import { useEffect } from 'react';

interface OfflineState {
  isOnline: boolean;
  simulatedOffline: boolean;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  toggleSimulatedOffline: () => void;
  setPendingSyncCount: (n: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  simulatedOffline: false,
  pendingSyncCount: 0,
  setOnline: (online) => set({ isOnline: online }),
  toggleSimulatedOffline: () => set((s) => ({ simulatedOffline: !s.simulatedOffline })),
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),
}));

export function useOffline() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const simulatedOffline = useOfflineStore((s) => s.simulatedOffline);
  const pendingSyncCount = useOfflineStore((s) => s.pendingSyncCount);
  const toggleSimulatedOffline = useOfflineStore((s) => s.toggleSimulatedOffline);
  return {
    isOnline: isOnline && !simulatedOffline,
    simulatedOffline,
    pendingSyncCount,
    toggleSimulatedOffline,
  };
}

export function OfflineListener() {
  const setOnline = useOfflineStore((s) => s.setOnline);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOnline]);
  return null;
}
