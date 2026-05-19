import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { formatRelativeTime } from '@/lib/format';
import { IconButton } from '../IconButton/IconButton';
import type { UserRole } from '@/types/common';
import styles from './Topbar.module.css';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  agent: 'Agent terrain',
  lab: 'Agent laboratoire',
  visitor: 'Observateur',
};

export function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleMobile } = useSidebar();
  const { data: collectionsPage } = useCollections();

  const lastSyncAt = useMemo(() => {
    const items = collectionsPage?.items ?? [];
    if (items.length === 0) return null;
    return items
      .map((c) => c.syncedAt ?? c.collectedAt)
      .filter(Boolean)
      .sort()
      .at(-1) as string | undefined;
  }, [collectionsPage]);

  const avatarSrc =
    user?.role === 'admin'
      ? '/user_profils/im1.png'
      : user?.role === 'superviseur'
        ? '/user_profils/im2.png'
        : null;

  if (!user) return <header className={styles.topbar} />;

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.mobileMenuBtn}
        onClick={toggleMobile}
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>
      <div className={styles.leading}>
        {lastSyncAt ? (
          <span className={styles.syncIndicator} aria-label="Dernière collecte reçue">
            <RefreshCw size={12} aria-hidden="true" />
            <span className={styles.syncLabel}>Dernière collecte</span>
            <span className={styles.syncValue}>{formatRelativeTime(lastSyncAt)}</span>
          </span>
        ) : null}
      </div>

      <div className={styles.actions}>
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className={styles.avatarImg} />
            ) : (
              <UserRound size={16} />
            )}
          </div>
          <div className={styles.profileText}>
            <span className={styles.profileName}>{user.fullName}</span>
            <span className={styles.profileRole}>{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <IconButton
          aria-label="Se déconnecter"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
        </IconButton>
      </div>
    </header>
  );
}
