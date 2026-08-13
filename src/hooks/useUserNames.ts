import { useMemo } from 'react';
import { useUsers } from '@/features/admin/hooks/useAdmin';

/**
 * Table `identifiant d'utilisateur` → `nom complet`.
 *
 * Les collectes ne stockent pas le nom de leur auteur mais son identifiant :
 * les écrans qui veulent afficher « Aïcha Touré » plutôt que « u-agent-bko »
 * ont besoin de cette traduction.
 *
 * La table était auparavant construite à partir des fixtures de démonstration,
 * importées directement par sept pages. Elles se retrouvaient donc dans le
 * bundle de production, et des écrans réels dépendaient de données fictives.
 * La source est désormais l'API des utilisateurs — servie par MSW en mode
 * mock, par le backend en mode live.
 *
 * En cas d'échec de la requête, la table est vide : les appelants retombent
 * alors sur l'identifiant brut. En live ce n'est pas gênant, le backend
 * renseignant `agentCollecte` avec un libellé déjà lisible.
 */
export function useUserNames(): Map<string, string> {
  const { data } = useUsers();

  return useMemo(() => {
    const table = new Map<string, string>();
    (data?.items ?? []).forEach((u) => table.set(u.id, u.fullName));
    return table;
  }, [data]);
}
