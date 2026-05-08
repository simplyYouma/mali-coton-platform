import { CloudOff, RefreshCw } from 'lucide-react';
import { useOffline } from '@/app/providers/OfflineProvider';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const { isOnline, simulatedOffline, pendingSyncCount } = useOffline();

  if (isOnline && pendingSyncCount === 0) return null;

  if (!isOnline) {
    return (
      <div role="status" className={styles.banner}>
        <CloudOff size={16} aria-hidden="true" />
        <span>
          {simulatedOffline ? 'Mode hors-ligne (démo)' : 'Hors-ligne'} — vos saisies sont
          enregistrées localement.
        </span>
      </div>
    );
  }

  return (
    <div role="status" className={`${styles.banner} ${styles.syncing}`}>
      <RefreshCw size={16} aria-hidden="true" className={styles.spin} />
      <span>{pendingSyncCount} enregistrement(s) en attente de synchronisation.</span>
    </div>
  );
}
