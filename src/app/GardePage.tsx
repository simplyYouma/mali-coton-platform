import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AucunAcces, PageLoader } from '@/components/common';
import { useAutorisations } from './providers/AuthzProvider';
import { permissionsDe, premierePagePour, type CheminPage } from './navigation';

interface GardePageProps {
  /** Chemin déclaré dans `navigation.tsx` — la garde y lit les permissions. */
  to: CheminPage;
  children: ReactNode;
}

/**
 * Garde de route adossée à la table de navigation.
 *
 * Elle lit les mêmes permissions que l'entrée de menu : filtrer le menu ne
 * protège rien, une URL saisie à la main atteindrait la page sans cela.
 */
export function GardePage({ to, children }: GardePageProps) {
  const { peutUneDe, isLoading, isError } = useAutorisations();
  const location = useLocation();

  /* Tant que les droits sont inconnus, ne rien masquer ni rediriger : un menu
   * vide affiché puis rechargé se lit comme un défaut d'affichage. */
  if (isLoading) return <PageLoader label="Vérification de vos accès…" />;

  if (!isError && peutUneDe(permissionsDe(to))) return <>{children}</>;

  /* Page interdite : on ramène à l'accueil réellement ouvert plutôt que
   * d'afficher un refus brut. Sans aucune page ouverte, rediriger bouclerait :
   * on l'explique alors franchement. */
  const accueil = isError ? null : premierePagePour(peutUneDe);
  if (!accueil) return <AucunAcces profilIndisponible={isError} />;
  if (accueil === location.pathname) return <AucunAcces />;
  return <Navigate to={accueil} replace />;
}
