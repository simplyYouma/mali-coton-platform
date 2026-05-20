import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
}

export function Sidebar({
  sections,
  workspaceName = 'PASET Mali',
}: SidebarProps) {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      ) : null}
    <aside
      className={clsx(
        styles.sidebar,
        collapsed && styles.collapsed,
        mobileOpen && styles.mobileOpen,
      )}
      aria-label="Navigation principale"
      data-collapsed={collapsed}
    >
      <header className={styles.workspace}>
        {!collapsed ? (
          <span className={styles.workspaceName}>{workspaceName}</span>
        ) : null}
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
                    onClick={() => setMobileOpen(false)}
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

    </aside>
    </>
  );
}
