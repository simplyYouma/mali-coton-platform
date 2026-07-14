import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Layers } from 'lucide-react';
import { Badge } from '@/components/common';
import type { FormulaireCollecte } from '../api/formulaires.types';
import { STATUT_FORMULAIRE_LABEL, STATUT_FORMULAIRE_VARIANT } from '../api/formulaires.types';
import styles from './FormulaireCard.module.css';

interface FormulaireCardProps {
  formulaire: FormulaireCollecte;
  siteId?: string;
}

export function FormulaireCard({ formulaire, siteId }: FormulaireCardProps) {
  const champsActifs = formulaire.champs.filter((c) => c.actif).length;
  const champsObligatoires = formulaire.champs.filter((c) => c.obligatoire && c.actif).length;

  const href = siteId
    ? `/formulaires/${formulaire.id}/saisir?siteId=${siteId}`
    : `/formulaires/${formulaire.id}/saisir`;

  return (
    <div className={styles.card}>
      <div className={styles.icon} aria-hidden="true">
        <ClipboardList size={20} />
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.type}>{formulaire.typeFormulaire}</span>
          <Badge variant={STATUT_FORMULAIRE_VARIANT[formulaire.statut]}>
            {STATUT_FORMULAIRE_LABEL[formulaire.statut]}
          </Badge>
        </div>
        <h3 className={styles.titre}>{formulaire.titre}</h3>
        {formulaire.description ? (
          <p className={styles.description}>{formulaire.description}</p>
        ) : null}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Layers size={13} />
            {champsActifs} champ{champsActifs > 1 ? 's' : ''}
            {champsObligatoires > 0 ? ` · ${champsObligatoires} obligatoire${champsObligatoires > 1 ? 's' : ''}` : ''}
          </span>
          <span className={styles.metaItem}>v{formulaire.version}</span>
        </div>
      </div>

      {formulaire.statut === 'publie' ? (
        <Link to={href} className={styles.action} aria-label={`Remplir ${formulaire.titre}`}>
          Remplir
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={styles.actionDisabled} aria-disabled="true">
          Non disponible
        </span>
      )}
    </div>
  );
}
