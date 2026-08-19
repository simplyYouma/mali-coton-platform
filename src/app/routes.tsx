import { Routes, Route, Navigate } from 'react-router-dom';
import type { UserRole } from '@/types/common';
import { useAuth } from './providers/AuthProvider';
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
  UsersPage,
  RolesPage,
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
  ModelesFormulairePage,
  StructureFormulairePage,
  SaisieFormulairePage,
  ConstructeurFormulairePage,
} from '@/features/formulaires';
import { RoleGuard } from '@/components/common';

export function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  const accueil = defaultRoute(role);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={accueil} replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={accueil} replace />} />
        <Route
          path="/dashboard"
          element={
            <RoleGuard roles={['admin', 'superviseur', 'visitor']}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route path="/sites" element={<SitesListPage />} />
        <Route path="/sites/:id" element={<SiteDetailPage />} />
        <Route path="/collecte" element={<CollectionsListPage />} />
        <Route
          path="/collecte/validation"
          element={
            <RoleGuard roles={['superviseur', 'admin']}>
              <CollectionsReviewPage />
            </RoleGuard>
          }
        />
        <Route
          path="/collecte/import"
          element={
            <RoleGuard roles={['admin', 'superviseur']}>
              <CollectionImportPage />
            </RoleGuard>
          }
        />
        <Route path="/collecte/:id" element={<CollectionDetailPage />} />
        <Route
          path="/collecte/:id/resultats-labo"
          element={
            <RoleGuard roles={['superviseur', 'admin']}>
              <LabResultsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/labo/echantillons"
          element={
            <RoleGuard roles={['admin', 'superviseur', 'lab']}>
              <LabSamplesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/labo/prelevements"
          element={
            <RoleGuard roles={['admin', 'superviseur', 'lab']}>
              <PrelevementsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/labo/analyses"
          element={
            <RoleGuard roles={['admin', 'superviseur', 'lab']}>
              <AnalysesPage />
            </RoleGuard>
          }
        />
        <Route path="/alertes" element={<AlertsPage />} />
        <Route
          path="/recommandations"
          element={
            <RoleGuard roles={['admin', 'superviseur', 'visitor']}>
              <RecommandationsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/agents"
          element={
            <RoleGuard roles={['admin', 'superviseur']}>
              <TeamListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/agents/:id"
          element={
            <RoleGuard roles={['admin', 'superviseur']}>
              <AgentDetailPage />
            </RoleGuard>
          }
        />
        {/* Collecte native — agent */}
        <Route path="/formulaires" element={<ModelesFormulairePage />} />
        <Route path="/formulaires/:code" element={<StructureFormulairePage />} />
        <Route path="/formulaires/:code/saisir" element={<SaisieFormulairePage />} />
        {/* Collecte native — constructeur (admin) */}
        <Route path="/admin/formulaires" element={<ModelesFormulairePage />} />
        <Route
          path="/admin/formulaires/:id/constructeur"
          element={
            <RoleGuard roles={['admin']}>
              <ConstructeurFormulairePage />
            </RoleGuard>
          }
        />

        <Route path="/cartographie" element={<MappingPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route
          path="/admin/utilisateurs"
          element={
            <RoleGuard roles={['admin']}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <RoleGuard roles={['admin']}>
              <RolesPage />
            </RoleGuard>
          }
        />
        {/* Indicateurs : integre comme onglet de Referentiels.
            On preserve l'URL legacy en redirigeant vers ?tab=indicateurs. */}
        <Route
          path="/admin/indicateurs"
          element={<Navigate to="/admin/referentiels?tab=indicateurs" replace />}
        />
        <Route
          path="/admin/referentiels"
          element={
            <RoleGuard roles={['admin']}>
              <RefDataPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RoleGuard roles={['admin']}>
              <AuditLogsPage />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to={accueil} replace />} />
      </Route>
    </Routes>
  );
}

/**
 * Page d'entree selon le role.
 *
 * L'agent terrain n'a acces ni au tableau de bord ni aux pages de pilotage :
 * sa navigation ne contient que les formulaires de collecte. L'envoyer sur
 * /dashboard le deposerait sur un ecran absent de son propre menu.
 */
/**
 * Ecran d'arrivee apres connexion, selon le role.
 *
 * Le role `lab` existait dans le typage et dans le mapping d'authentification
 * sans qu'aucune route ni entree de menu ne lui soit ouverte : un utilisateur
 * laboratoire atterrissait sur /dashboard, qui lui est interdit, avec un menu
 * vide. Il est desormais dirige vers la section qui le concerne.
 */
function defaultRoute(role: UserRole | null): string {
  switch (role) {
    case 'agent':
      return '/formulaires';
    case 'lab':
      return '/labo/analyses';
    default:
      return '/dashboard';
  }
}
