import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import { useAutorisations } from './providers/AuthzProvider';
import { GardePage } from './GardePage';
import { premierePagePour } from './navigation';
import { AucunAcces, PageLoader } from '@/components/common';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { SitesListPage, SiteDetailPage } from '@/features/sites';
import {
  CollectionsListPage,
  CollectionDetailPage,
  LabResultsPage,
  CollectionsReviewPage,
  CollectionImportPage,
} from '@/features/collection';
import {
  ComptesPage,
  RolesPermissionsPage,
  AuditLogsPage,
  RefDataPage,
} from '@/features/admin';
import { AlertsPage } from '@/features/alerts';
import { RecommandationsPage } from '@/features/recommandations';
import { TeamListPage, AgentDetailPage } from '@/features/team';
import { MappingPage } from '@/features/mapping';
import { AnalyticsPage } from '@/features/analytics';
import { ReportingPage } from '@/features/reporting';
import { LabSamplesPage, PrelevementsPage, AnalysesPage } from '@/features/lab';
import {
  BrouillonsPage,
  ModelesFormulairePage,
  StructureFormulairePage,
  SaisieFormulairePage,
  ConstructeurFormulairePage,
} from '@/features/formulaires';

export function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const { peutUneDe, isLoading, isError } = useAutorisations();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  /* Les droits conditionnent la page d'accueil : trancher avant de les
   * connaître enverrait l'utilisateur sur un écran qui lui est fermé. */
  if (isLoading) return <PageLoader label="Chargement de votre profil…" />;

  const accueil = isError ? null : premierePagePour(peutUneDe);
  if (!accueil) return <AucunAcces profilIndisponible={isError} />;

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={accueil} replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={accueil} replace />} />

        <Route
          path="/dashboard"
          element={<GardePage to="/dashboard"><DashboardPage /></GardePage>}
        />
        <Route path="/sites" element={<GardePage to="/sites"><SitesListPage /></GardePage>} />
        <Route
          path="/sites/:id"
          element={<GardePage to="/sites/:id"><SiteDetailPage /></GardePage>}
        />

        <Route
          path="/collecte"
          element={<GardePage to="/collecte"><CollectionsListPage /></GardePage>}
        />
        <Route
          path="/collecte/validation"
          element={<GardePage to="/collecte/validation"><CollectionsReviewPage /></GardePage>}
        />
        <Route
          path="/collecte/import"
          element={<GardePage to="/collecte/import"><CollectionImportPage /></GardePage>}
        />
        <Route
          path="/collecte/:id"
          element={<GardePage to="/collecte/:id"><CollectionDetailPage /></GardePage>}
        />
        <Route
          path="/collecte/:id/resultats-labo"
          element={
            <GardePage to="/collecte/:id/resultats-labo"><LabResultsPage /></GardePage>
          }
        />

        <Route
          path="/labo/echantillons"
          element={<GardePage to="/labo/echantillons"><LabSamplesPage /></GardePage>}
        />
        <Route
          path="/labo/prelevements"
          element={<GardePage to="/labo/prelevements"><PrelevementsPage /></GardePage>}
        />
        <Route
          path="/labo/analyses"
          element={<GardePage to="/labo/analyses"><AnalysesPage /></GardePage>}
        />

        <Route path="/alertes" element={<GardePage to="/alertes"><AlertsPage /></GardePage>} />
        <Route
          path="/recommandations"
          element={<GardePage to="/recommandations"><RecommandationsPage /></GardePage>}
        />

        <Route path="/agents" element={<GardePage to="/agents"><TeamListPage /></GardePage>} />
        <Route
          path="/agents/:id"
          element={<GardePage to="/agents/:id"><AgentDetailPage /></GardePage>}
        />

        {/* Collecte native — agent */}
        <Route
          path="/formulaires"
          element={<GardePage to="/formulaires"><ModelesFormulairePage /></GardePage>}
        />
        <Route
          path="/formulaires/brouillons"
          element={<GardePage to="/formulaires/brouillons"><BrouillonsPage /></GardePage>}
        />
        <Route
          path="/formulaires/:code"
          element={<GardePage to="/formulaires/:code"><StructureFormulairePage /></GardePage>}
        />
        <Route
          path="/formulaires/:code/saisir"
          element={
            <GardePage to="/formulaires/:code/saisir"><SaisieFormulairePage /></GardePage>
          }
        />

        {/* Collecte native — constructeur */}
        <Route
          path="/admin/formulaires"
          element={<GardePage to="/admin/formulaires"><ModelesFormulairePage /></GardePage>}
        />
        <Route
          path="/admin/formulaires/:id/constructeur"
          element={
            <GardePage to="/admin/formulaires/:id/constructeur">
              <ConstructeurFormulairePage />
            </GardePage>
          }
        />

        <Route
          path="/cartographie"
          element={<GardePage to="/cartographie"><MappingPage /></GardePage>}
        />
        <Route
          path="/analytics"
          element={<GardePage to="/analytics"><AnalyticsPage /></GardePage>}
        />
        <Route
          path="/reporting"
          element={<GardePage to="/reporting"><ReportingPage /></GardePage>}
        />

        <Route
          path="/admin/utilisateurs"
          element={<GardePage to="/admin/utilisateurs"><ComptesPage /></GardePage>}
        />
        <Route
          path="/admin/roles"
          element={<GardePage to="/admin/roles"><RolesPermissionsPage /></GardePage>}
        />
        {/* Indicateurs : intégré comme onglet de Référentiels.
            On préserve l'URL héritée en redirigeant vers ?tab=indicateurs. */}
        <Route
          path="/admin/indicateurs"
          element={<Navigate to="/admin/referentiels?tab=indicateurs" replace />}
        />
        <Route
          path="/admin/referentiels"
          element={<GardePage to="/admin/referentiels"><RefDataPage /></GardePage>}
        />
        <Route
          path="/admin/audit"
          element={<GardePage to="/admin/audit"><AuditLogsPage /></GardePage>}
        />

        <Route path="*" element={<Navigate to={accueil} replace />} />
      </Route>
    </Routes>
  );
}
