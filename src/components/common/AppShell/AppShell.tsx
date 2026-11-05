import type { ReactNode } from 'react';
import clsx from 'clsx';
import { OfflineBanner } from '../OfflineBanner/OfflineBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { NavSection } from './Sidebar';
import { useSidebar } from '@/app/providers/SidebarProvider';
import styles from './AppShell.module.css';

export interface AppShellProps {
  sections: NavSection[];
  children: ReactNode;
}

export function AppShell({ sections, children }: AppShellProps) {
  const { collapsed } = useSidebar();
  /* data-app-shell / data-app-content : points d'accroche pour les mises en
   * page d'impression des pages (ex. Cartographie) qui masquent la navigation. */
  return (
    <div className={clsx(styles.shell, collapsed && styles.shellCollapsed)} data-app-shell>
      <Sidebar sections={sections} />
      <div className={styles.main}>
        <OfflineBanner />
        <Topbar />
        <div className={styles.content} data-app-content>
          {children}
        </div>
      </div>
    </div>
  );
}
