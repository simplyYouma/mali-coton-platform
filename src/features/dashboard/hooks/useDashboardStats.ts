/**
 * Hooks React Query pour les indicateurs Sites & Employés.
 *
 * Chaque indicateur n'est chargé qu'à l'ouverture de son onglet (`enabled`) —
 * vingt requêtes ne partent jamais toutes au montage. La clé inclut les
 * filtres tels quels : un changement de période ou de site déclenche un
 * nouveau fetch, React Query se chargeant du hachage stable de l'objet.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchEmployesBesoins,
  fetchEmployesEquipementsProtection,
  fetchEmployesEvolutionCollectes,
  fetchEmployesParSite,
  fetchEmployesRepartitionContrat,
  fetchEmployesRepartitionGenre,
  fetchEmployesRepartitionInstruction,
  fetchEmployesSanteSecurite,
  fetchEmployesVueEnsemble,
  fetchSitesAppuisRecus,
  fetchSitesBesoinsPrioritaires,
  fetchSitesEpi,
  fetchSitesEquipements,
  fetchSitesEvolutionVisites,
  fetchSitesFormationsRecues,
  fetchSitesRepartitionRegion,
  fetchSitesRepartitionType,
  fetchSitesRisquesSecurite,
  fetchSitesTypesTeinture,
  fetchSitesVueEnsemble,
  type FiltresDashboard,
} from '../api/dashboardStats';

const STALE = 60 * 1000;

function useIndicateur<T>(
  cle: string,
  fetchFn: (filtres: FiltresDashboard) => Promise<T>,
  filtres: FiltresDashboard,
  actif: boolean,
) {
  return useQuery({
    queryKey: ['dashboard-stats', cle, filtres],
    queryFn: () => fetchFn(filtres),
    enabled: actif,
    staleTime: STALE,
  });
}

/* ═══ Sites ═══ */

export const useSitesVueEnsemble = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-vue-ensemble', fetchSitesVueEnsemble, f, actif);

export const useSitesRepartitionRegion = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-repartition-region', fetchSitesRepartitionRegion, f, actif);

export const useSitesRepartitionType = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-repartition-type', fetchSitesRepartitionType, f, actif);

export const useSitesEpi = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-epi', fetchSitesEpi, f, actif);

export const useSitesRisquesSecurite = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-risques-securite', fetchSitesRisquesSecurite, f, actif);

export const useSitesBesoinsPrioritaires = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-besoins-prioritaires', fetchSitesBesoinsPrioritaires, f, actif);

export const useSitesFormationsRecues = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-formations-recues', fetchSitesFormationsRecues, f, actif);

export const useSitesAppuisRecus = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-appuis-recus', fetchSitesAppuisRecus, f, actif);

export const useSitesTypesTeinture = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-types-teinture', fetchSitesTypesTeinture, f, actif);

export const useSitesEquipements = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-equipements', fetchSitesEquipements, f, actif);

export const useSitesEvolutionVisites = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('sites-evolution-visites', fetchSitesEvolutionVisites, f, actif);

/* ═══ Employés ═══ */

export const useEmployesVueEnsemble = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-vue-ensemble', fetchEmployesVueEnsemble, f, actif);

export const useEmployesRepartitionGenre = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-repartition-genre', fetchEmployesRepartitionGenre, f, actif);

export const useEmployesRepartitionContrat = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-repartition-contrat', fetchEmployesRepartitionContrat, f, actif);

export const useEmployesRepartitionInstruction = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-repartition-instruction', fetchEmployesRepartitionInstruction, f, actif);

export const useEmployesEquipementsProtection = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-equipements-protection', fetchEmployesEquipementsProtection, f, actif);

export const useEmployesBesoins = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-besoins', fetchEmployesBesoins, f, actif);

export const useEmployesSanteSecurite = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-sante-securite', fetchEmployesSanteSecurite, f, actif);

export const useEmployesParSite = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-par-site', fetchEmployesParSite, f, actif);

export const useEmployesEvolutionCollectes = (f: FiltresDashboard, actif: boolean) =>
  useIndicateur('employes-evolution-collectes', fetchEmployesEvolutionCollectes, f, actif);
