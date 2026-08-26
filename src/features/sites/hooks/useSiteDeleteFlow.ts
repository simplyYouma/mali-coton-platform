import { useState } from 'react';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { HttpError } from '@/lib/http';
import { useDeleteSite, useSetSiteActif } from './useSites';
import type { Site } from '../api/site.types';

export interface ConflitSuppression {
  site: Site;
  message: string;
}

/**
 * Parcours de suppression d'un site, partagé par `SitesListPage` et
 * `SiteDetailPage`.
 *
 * Un site portant des collectes ou des employés est refusé par le serveur
 * (409, contrainte de clé étrangère) — c'est le cas réel, pas l'exception :
 * les 5 sites pilotes en portent tous. Plutôt qu'un toast d'échec sec, le
 * message serveur est repris et la désactivation proposée dans la foulée,
 * dans la même boîte de dialogue — c'est le chemin que l'utilisateur doit
 * réellement suivre.
 */
export function useSiteDeleteFlow(onDeleted?: (site: Site) => void) {
  const confirm = useConfirm();
  const toast = useToast();
  const deleteMut = useDeleteSite();
  const toggleMut = useSetSiteActif();
  const [conflit, setConflit] = useState<ConflitSuppression | null>(null);

  const supprimer = async (site: Site) => {
    const ok = await confirm({
      title: `Supprimer « ${site.name} » ?`,
      message: 'Cette suppression est définitive et ne peut pas être annulée.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(site.id);
      toast.success('Site supprimé.');
      onDeleted?.(site);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setConflit({ site, message: err.payload.message });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'La suppression a échoué.');
    }
  };

  const desactiverDepuisConflit = async () => {
    if (!conflit) return;
    await toggleMut.mutateAsync({ id: conflit.site.id, actif: false });
    toast.success(`« ${conflit.site.name} » a été désactivé et sort des statistiques.`);
    setConflit(null);
  };

  return {
    supprimer,
    conflit,
    fermerConflit: () => setConflit(null),
    desactiverDepuisConflit,
    suppressionEnCours: deleteMut.isPending,
    desactivationEnCours: toggleMut.isPending,
  };
}
