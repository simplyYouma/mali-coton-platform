import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@/components/common';
import type { ConflitSuppression } from '../hooks/useSiteDeleteFlow';

interface ConflitSuppressionModalProps {
  conflit: ConflitSuppression | null;
  onFermer: () => void;
  onDesactiver: () => void;
  enCours: boolean;
}

/**
 * Suite d'un échec de suppression (409, clé étrangère) : reprend le message
 * du serveur et propose la désactivation dans la foulée — c'est le parcours
 * réel pour un site qui porte des collectes ou des employés.
 */
export function ConflitSuppressionModal({
  conflit,
  onFermer,
  onDesactiver,
  enCours,
}: ConflitSuppressionModalProps) {
  return (
    <Modal
      open={conflit !== null}
      onClose={onFermer}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="var(--color-danger)" aria-hidden="true" />
          Suppression impossible
        </span>
      }
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onFermer} disabled={enCours}>
            Fermer
          </Button>
          <Button variant="primary" onClick={onDesactiver} loading={enCours}>
            Désactiver à la place
          </Button>
        </>
      }
    >
      <p>{conflit?.message ?? 'Le serveur a refusé cette suppression.'}</p>
      <p>
        Désactiver « {conflit?.site.name} » retire le site des statistiques sans supprimer les
        collectes et employés qui y sont rattachés.
      </p>
    </Modal>
  );
}
