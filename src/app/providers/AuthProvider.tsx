import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthenticatedUser, UserRole } from '@/types/common';

interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (user: AuthenticatedUser) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      switchRole: (role) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, role } });
      },
    }),
    {
      name: 'mc.auth',
    },
  ),
);

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const switchRole = useAuthStore((s) => s.switchRole);
  return { user, isAuthenticated, role: user?.role ?? null, login, logout, switchRole };
}
