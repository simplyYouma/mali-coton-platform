import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Menu, UserRound } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
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
  const confirm = useConfirm();
  const canGoBack = window.history.length > 1;

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: 'Vous allez être redirigé vers la page de connexion.',
      confirmLabel: 'Se déconnecter',
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };


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
        {canGoBack ? (
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Retour à la page précédente"
            title="Retour"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Retour</span>
          </button>
        ) : null}
      </div>

      <div className={styles.actions}>
        <div className={styles.partnerLogos} aria-label="Partenaires du projet">
          <img
            src="/logos/Armoiries_Mali.png"
            alt="République du Mali"
            className={styles.partnerLogo}
          />
          <span className={styles.partnerDivider} aria-hidden="true" />
          <img
            src="/logos/Flag_of_Japan.png"
            alt="Japon — Gouvernement du Japon"
            className={styles.partnerLogo}
          />
          <span className={styles.partnerDivider} aria-hidden="true" />
          <img
            src="/logos/logo_pnud.png"
            alt="PNUD"
            className={styles.partnerLogo}
          />
        </div>
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            <UserRound size={16} />
          </div>
          <div className={styles.profileText}>
            <span className={styles.profileName}>{user.fullName}</span>
            <span className={styles.profileRole}>{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <IconButton
          aria-label="Se déconnecter"
          variant="danger"
          onClick={handleLogout}
        >
          <LogOut size={16} />
        </IconButton>
      </div>
    </header>
  );
}
