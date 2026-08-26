import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSetSiteActif } from './useSites';
import type { Site } from '../api/site.types';

/**
 * Bascule active/inactive d'un site, partagée par `SitesListPage` et
 * `SiteDetailPage` : confirmation légère (la mutation elle-même est
 * optimiste, voir `useSetSiteActif`), avec le message qui dit la vraie
 * conséquence — sortir des statistiques n'est pas devinable depuis un simple
 * libellé de bouton.
 */
export function useSiteToggleFlow() {
  const confirm = useConfirm();
  const toast = useToast();
  const toggleMut = useSetSiteActif();

  const basculer = async (site: Site) => {
    const activation = !site.actif;
    const ok = await confirm({
      title: activation ? `Réactiver « ${site.name} » ?` : `Désactiver « ${site.name} » ?`,
      message: activation
        ? 'Le site réintègre les statistiques, la carte et les listes.'
        : 'Le site sortira des statistiques, de la carte et des cibles de collecte — il restera consultable depuis sa fiche.',
      confirmLabel: activation ? 'Réactiver' : 'Désactiver',
      tone: 'primary',
    });
    if (!ok) return;
    try {
      await toggleMut.mutateAsync({ id: site.id, actif: activation });
      toast.success(
        activation ? `« ${site.name} » a été réactivé.` : `« ${site.name} » a été désactivé.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'L’opération a échoué.');
    }
  };

  return { basculer, enCours: toggleMut.isPending };
}
