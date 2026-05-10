import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  /** Sidebar repliée en desktop. Persistée. */
  collapsed: boolean;
  /** Drawer ouverte en mobile (< 1024px). Volatile. */
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
  setMobileOpen: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
      toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
      setMobileOpen: (v) => set({ mobileOpen: v }),
    }),
    {
      name: 'mc.sidebar',
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);

export function useSidebar() {
  return useSidebarStore();
}
