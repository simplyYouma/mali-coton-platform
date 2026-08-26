import { Outlet } from 'react-router-dom';
import { AppShell } from '@/components/common/AppShell';
import type { NavSection } from '@/components/common/AppShell';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { navigationPour } from '@/app/navigation';
import { PERM } from '@/features/auth/lib/permissions';
import { useSyncQueue } from '@/features/collection/hooks/useSyncQueue';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { useRecommandations } from '@/features/recommandations/hooks/useRecommandations';

/**
 * Coquille applicative et menu latéral.
 *
 * Les entrées viennent de `src/app/navigation.tsx`, que partagent aussi les
 * gardes de route : décrire le menu ici en plus aurait laissé les deux
 * critères diverger, comme c'était le cas auparavant.
 */
export function AppLayout() {
  const { peut, peutUneDe } = useAutorisations();
  // Démarre le sync queue processor (s'auto-déclenche au passage online).
  useSyncQueue();

  /* Compteurs de la sidebar — conditionnés à la permission qui ouvre la page
   * concernée, pour ne pas interroger une ressource fermée à l'utilisateur. */
  const peutValider = peut(PERM.collecteValidate);
  const submittedQ = useCollections(peutValider ? { status: 'submitted' } : undefined);
  const labCompleteQ = useCollections(peutValider ? { status: 'lab_complete' } : undefined);
  const validationCount = peutValider
    ? (submittedQ.data?.items.length ?? 0) + (labCompleteQ.data?.items.length ?? 0)
    : 0;

  const peutVoirAlertes = peutUneDe([PERM.alerteRead, PERM.alerteManage]);
  const alertsQ = useAlerts(peutVoirAlertes ? { status: 'active' } : undefined);
  const criticalAlertsCount = peutVoirAlertes
    ? (alertsQ.data?.items ?? []).filter((a) => a.severity === 'critical').length
    : 0;

  const recoQ = useRecommandations();
  const openRecoCount = peutVoirAlertes
    ? (recoQ.data?.items ?? []).filter(
        (r) => r.statut === 'proposee' || r.statut === 'en_cours',
      ).length
    : 0;

  const sections: NavSection[] = navigationPour(peutUneDe).map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.to === '/collecte/validation' && validationCount > 0) {
        return { ...item, badge: validationCount };
      }
      if (item.to === '/alertes' && criticalAlertsCount > 0) {
        return { ...item, badge: criticalAlertsCount, badgeTone: 'danger' as const };
      }
      if (item.to === '/recommandations' && openRecoCount > 0) {
        return { ...item, badge: openRecoCount, badgeTone: 'warning' as const };
      }
      return item;
    }),
  }));

  return (
    <AppShell sections={sections}>
      <Outlet />
    </AppShell>
  );
}
