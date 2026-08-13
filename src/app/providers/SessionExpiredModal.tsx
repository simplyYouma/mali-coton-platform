import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Clock } from 'lucide-react';
import { useAuthStore } from './AuthProvider';
import styles from './SessionExpiredModal.module.css';

export function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  if (!visible) return null;

  const handleReconnect = () => {
    logout();
    setVisible(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div className={styles.dialog}>
        <div className={styles.iconWrap}>
          <Clock size={28} className={styles.iconClock} />
        </div>
        <h2 id="session-title" className={styles.title}>Session expirée</h2>
        <p className={styles.message}>
          Votre session a expiré par mesure de sécurité.
          Veuillez vous reconnecter pour continuer.
        </p>
        <button className={styles.btn} onClick={handleReconnect}>
          <LogIn size={16} />
          Se reconnecter
        </button>
      </div>
    </div>
  );
}
