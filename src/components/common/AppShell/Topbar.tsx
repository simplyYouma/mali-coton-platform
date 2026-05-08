import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CloudOff, RefreshCw, LogOut, UserRound } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/app/providers/AuthProvider';
import { useOffline } from '@/app/providers/OfflineProvider';
import { useSyncQueue } from '@/features/collection/hooks/useSyncQueue';
import { IconButton } from '../IconButton/IconButton';
import { Select } from '../Select/Select';
import { Switch } from '../Switch/Switch';
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
  const { user, logout, switchRole } = useAuth();
  const { isOnline, simulatedOffline, toggleSimulatedOffline, pendingSyncCount } = useOffline();
  const { trigger: triggerSync } = useSyncQueue();

  const avatarSrc =
    user?.role === 'admin'
      ? '/user_profils/im1.png'
      : user?.role === 'superviseur'
        ? '/user_profils/im2.png'
        : null;

  return (
    <header className={styles.topbar}>
      <div className={styles.leading} />

      <div className={styles.actions}>
        <Switch
          label="Mode hors-ligne"
          checked={simulatedOffline}
          onChange={toggleSimulatedOffline}
        />

        <button
          type="button"
          className={clsx(
            styles.syncPill,
            !isOnline && styles.syncPillOffline,
            isOnline && pendingSyncCount === 0 && styles.syncPillIdle,
          )}
          onClick={() => void triggerSync()}
          disabled={!isOnline}
          aria-label={
            !isOnline
              ? `Hors-ligne — ${pendingSyncCount} collectes en file d'attente`
              : pendingSyncCount > 0
                ? `Synchroniser ${pendingSyncCount} collectes en attente`
                : 'Toutes les collectes sont synchronisées'
          }
        >
          {!isOnline ? (
            <>
              <CloudOff size={13} aria-hidden="true" />
              <span>{pendingSyncCount} en attente</span>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <RefreshCw size={13} aria-hidden="true" className={styles.syncSpin} />
              <span>{pendingSyncCount} à synchroniser</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Synchronisé</span>
            </>
          )}
        </button>

        {user ? (
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
            <Select<UserRole>
              value={user.role}
              onChange={(role) => {
                switchRole(role);
                if (role === 'agent') navigate('/collecte');
                else if (role === 'lab') navigate('/labo/echantillons');
                else navigate('/dashboard');
              }}
              options={[
                { value: 'admin', label: 'Administrateur' },
                { value: 'superviseur', label: 'Superviseur' },
                { value: 'agent', label: 'Agent terrain' },
                { value: 'lab', label: 'Agent laboratoire' },
                { value: 'visitor', label: 'Observateur' },
              ]}
              size="sm"
              aria-label="Changer de rôle (démo)"
            />
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
        ) : null}
      </div>
    </header>
  );
}
