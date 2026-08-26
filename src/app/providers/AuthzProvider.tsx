import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';
import { fetchMe, type ProfilCourant } from '@/features/auth/api/me';
import { estObsolete, type CodePermission } from '@/features/auth/lib/permissions';

interface Autorisations {
  profil: ProfilCourant | null;
  /** Vrai tant que le profil n'est pas connu — évite de masquer l'écran par défaut. */
  isLoading: boolean;
  isError: boolean;
  /** Détient cette permission. */
  peut: (code: CodePermission) => boolean;
  /** Détient au moins une des permissions listées. */
  peutUneDe: (codes: readonly CodePermission[]) => boolean;
}

const AutorisationsContext = createContext<Autorisations | null>(null);

/**
 * Profil et droits du compte connecté, chargés une fois puis gardés en cache
 * pour la session : les permissions ne changent pas en cours de navigation, et
 * chaque garde de route les consulte.
 */
export function AuthzProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  /* Les permissions obsolètes sont écartées à l'entrée : ainsi aucune
   * vérification ne peut accidentellement s'appuyer dessus. */
  const accordees = useMemo(
    () => new Set((data?.permissions ?? []).filter((c) => !estObsolete(c))),
    [data],
  );

  const peut = useCallback((code: CodePermission) => accordees.has(code), [accordees]);
  const peutUneDe = useCallback(
    (codes: readonly CodePermission[]) => codes.some((c) => accordees.has(c)),
    [accordees],
  );

  const valeur = useMemo<Autorisations>(
    () => ({
      profil: data ?? null,
      isLoading: isAuthenticated && isLoading,
      isError,
      peut,
      peutUneDe,
    }),
    [data, isAuthenticated, isLoading, isError, peut, peutUneDe],
  );

  return <AutorisationsContext.Provider value={valeur}>{children}</AutorisationsContext.Provider>;
}

export function useAutorisations(): Autorisations {
  const ctx = useContext(AutorisationsContext);
  if (!ctx) throw new Error('useAutorisations doit être utilisé dans un AuthzProvider.');
  return ctx;
}

/** Raccourci pour les usages qui n'ont besoin que du test de permission. */
export function usePeut(): Autorisations['peut'] {
  return useAutorisations().peut;
}
