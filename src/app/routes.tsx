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
  ThresholdsPage,
  AuditLogsPage,
  IndicatorsPage,
  RefDataPage,
} from '@/features/admin';
import { AlertsPage } from '@/features/alerts';
import { TeamListPage, AgentDetailPage } from '@/features/team';
import { MappingPage } from '@/features/mapping';
import { AnalyticsPage } from '@/features/analytics';
import { ReportingPage } from '@/features/reporting';
import { LabSamplesPage } from '@/features/lab';
import { RoleGuard } from '@/components/common';
import type { UserRole } from '@/types/common';

export function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

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
      <Route path="/login" element={<Navigate to={defaultRoute(role)} replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={defaultRoute(role)} replace />} />
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
            <RoleGuard roles={['agent', 'admin', 'superviseur']}>
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
            <RoleGuard roles={['lab', 'admin', 'superviseur']}>
              <LabSamplesPage />
            </RoleGuard>
          }
        />
        <Route path="/alertes" element={<AlertsPage />} />
        <Route
          path="/equipe"
          element={
            <RoleGuard roles={['admin', 'superviseur']}>
              <TeamListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/equipe/:id"
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
        <Route
          path="/admin/seuils"
          element={
            <RoleGuard roles={['admin']}>
              <ThresholdsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/indicateurs"
          element={
            <RoleGuard roles={['admin']}>
              <IndicatorsPage />
            </RoleGuard>
          }
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
        <Route path="*" element={<Navigate to={defaultRoute(role)} replace />} />
      </Route>
    </Routes>
  );
}

function defaultRoute(role: UserRole | null): string {
  if (role === 'agent') return '/collecte';
  if (role === 'lab') return '/labo/echantillons';
  return '/dashboard';
}
