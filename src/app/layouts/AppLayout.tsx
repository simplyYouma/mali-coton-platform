import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Map,
  BarChart3,
  FileText,
  Lightbulb,
  Users,
  UsersRound,
  ListChecks,
  ScrollText,
  Beaker,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { AppShell } from '@/components/common/AppShell';
import type { NavItem, NavSection } from '@/components/common/AppShell';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSyncQueue } from '@/features/collection/hooks/useSyncQueue';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import type { UserRole } from '@/types/common';

interface NavSpec extends NavItem {
  roles: UserRole[];
  section: 'main' | 'tools' | 'admin';
}

const ALL_NAV: NavSpec[] = [
  {
    to: '/dashboard',
    label: 'Tableau de bord',
    icon: <LayoutDashboard size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'main',
  },
  {
    to: '/sites',
    label: 'Sites',
    icon: <MapPin size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'main',
  },
  {
    to: '/collecte',
    label: 'Collectes',
    icon: <ClipboardList size={18} />,
    roles: ['admin', 'superviseur'],
    section: 'main',
  },
  {
    to: '/collecte/validation',
    label: 'Validation',
    icon: <ClipboardCheck size={18} />,
    roles: ['admin', 'superviseur'],
    section: 'main',
  },
  {
    to: '/labo/echantillons',
    label: 'Échantillons labo',
    icon: <Beaker size={18} />,
    roles: ['admin', 'superviseur'],
    section: 'main',
  },
  {
    to: '/alertes',
    label: 'Alertes',
    icon: <AlertTriangle size={18} />,
    roles: ['admin', 'superviseur'],
    section: 'main',
  },
  {
    to: '/recommandations',
    label: 'Recommandations',
    icon: <Lightbulb size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'main',
  },
  {
    to: '/agents',
    label: 'Agents',
    icon: <UsersRound size={18} />,
    roles: ['admin', 'superviseur'],
    section: 'main',
  },
  {
    to: '/cartographie',
    label: 'Cartographie',
    icon: <Map size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'tools',
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: <BarChart3 size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'tools',
  },
  {
    to: '/reporting',
    label: 'Rapports',
    icon: <FileText size={18} />,
    roles: ['admin', 'superviseur', 'visitor'],
    section: 'tools',
  },
  {
    to: '/admin/utilisateurs',
    label: 'Utilisateurs',
    icon: <Users size={18} />,
    roles: ['admin'],
    section: 'admin',
  },
  {
    to: '/admin/roles',
    label: 'Rôles & permissions',
    icon: <ShieldCheck size={18} />,
    roles: ['admin'],
    section: 'admin',
  },
  {
    to: '/admin/indicateurs',
    label: 'Indicateurs',
    icon: <ListChecks size={18} />,
    roles: ['admin'],
    section: 'admin',
  },
  {
    to: '/admin/referentiels',
    label: 'Référentiels',
    icon: <Database size={18} />,
    roles: ['admin'],
    section: 'admin',
  },
  {
    to: '/admin/audit',
    label: 'Journal d\'audit',
    icon: <ScrollText size={18} />,
    roles: ['admin'],
    section: 'admin',
  },
];

const SECTION_TITLES: Record<NavSpec['section'], string> = {
  main: 'Menu principal',
  tools: 'Outils & analyse',
  admin: 'Administration',
};

export function AppLayout() {
  const { role } = useAuth();
  // Démarre le sync queue processor (s'auto-déclenche au passage online).
  useSyncQueue();

  /* Compteurs dynamiques pour la sidebar */
  const canReview = role === 'admin' || role === 'superviseur';
  const submittedQ = useCollections(canReview ? { status: 'submitted' } : undefined);
  const labCompleteQ = useCollections(canReview ? { status: 'lab_complete' } : undefined);
  const validationCount = canReview
    ? (submittedQ.data?.items.length ?? 0) + (labCompleteQ.data?.items.length ?? 0)
    : 0;

  const alertsQ = useAlerts(canReview ? { status: 'active' } : undefined);
  const criticalAlertsCount = canReview
    ? (alertsQ.data?.items ?? []).filter((a) => a.severity === 'critical').length
    : 0;

  const groups: Record<string, NavItem[]> = { main: [], tools: [], admin: [] };
  ALL_NAV.forEach((item) => {
    if (!role || !item.roles.includes(role)) return;
    const { roles: _r, section, ...rest } = item;
    /* Injecte les badges dynamiques */
    if (rest.to === '/collecte/validation' && validationCount > 0) {
      rest.badge = validationCount;
    }
    if (rest.to === '/alertes' && criticalAlertsCount > 0) {
      rest.badge = criticalAlertsCount;
      rest.badgeTone = 'danger';
    }
    groups[section]!.push(rest);
  });

  const sections: NavSection[] = (Object.keys(groups) as Array<NavSpec['section']>)
    .filter((key) => groups[key]!.length > 0)
    .map((key) => ({ title: SECTION_TITLES[key], items: groups[key]! }));

  return (
    <AppShell sections={sections}>
      <Outlet />
    </AppShell>
  );
}
