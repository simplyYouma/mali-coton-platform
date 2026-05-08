import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/types/common';

export interface RoleGuardProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ roles, children, fallback, redirectTo = '/login' }: RoleGuardProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace />;
  }

  if (!roles.includes(role)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
