import { Routes, Route, Navigate } from 'react-router-dom';
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
import { LabSamplesPage } from '@/features/lab';
import { RoleGuard } from '@/components/common';

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

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
      <Route path="/login" element={<Navigate to={defaultRoute()} replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={defaultRoute()} replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
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
            <RoleGuard roles={['admin', 'superviseur']}>
              <LabSamplesPage />
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
        <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
      </Route>
    </Routes>
  );
}

function defaultRoute(): string {
  return '/dashboard';
}
