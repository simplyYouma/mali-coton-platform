import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LifeBuoy } from 'lucide-react';
import clsx from 'clsx';
import { useSidebar } from '@/app/providers/SidebarProvider';
import styles from './Sidebar.module.css';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  badgeTone?: 'default' | 'danger' | 'warning';
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  sections: NavSection[];
  workspaceName?: string;
  workspacePlan?: string;
}

export function Sidebar({
  sections,
  workspaceName = 'PASET Mali',
  workspacePlan = 'Suivi socio-environnemental',
}: SidebarProps) {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={clsx(styles.sidebar, collapsed && styles.collapsed)}
      aria-label="Navigation principale"
      data-collapsed={collapsed}
    >
      <header className={styles.workspace}>
        <div className={styles.workspaceButton}>
          <span className={styles.brandMark} aria-hidden="true">
            P
          </span>
          {!collapsed ? (
            <span className={styles.workspaceMeta}>
              <span className={styles.workspaceName}>{workspaceName}</span>
              <span className={styles.workspacePlan}>{workspacePlan}</span>
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
          className={styles.collapseToggle}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </header>

      <nav className={styles.nav}>
        {sections.map((section, idx) => (
          <div key={idx} className={styles.section}>
            {!collapsed && section.title ? (
              <p className={styles.sectionTitle}>{section.title}</p>
            ) : null}
            <ul className={styles.sectionList}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.exact}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(styles.link, isActive && styles.linkActive)
                    }
                  >
                    <span className={styles.linkIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    {!collapsed ? (
                      <>
                        <span className={styles.linkLabel}>{item.label}</span>
                        {item.badge !== undefined ? (
                          <span
                            className={clsx(
                              styles.linkBadge,
                              item.badgeTone === 'danger' && styles.linkBadgeDanger,
                              item.badgeTone === 'warning' && styles.linkBadgeWarning,
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <button type="button" className={styles.footerCard}>
        <span className={styles.footerIcon} aria-hidden="true">
          <LifeBuoy size={16} />
        </span>
        {!collapsed ? (
          <span className={styles.footerText}>
            <span className={styles.footerTitle}>Aide & manuel</span>
          </span>
        ) : null}
      </button>
    </aside>
  );
}
