import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Hash,
  Layers,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/common';
import type { FormulaireCollecte } from '../api/formulaires.types';
import { STATUT_FORMULAIRE_LABEL, STATUT_FORMULAIRE_VARIANT } from '../api/formulaires.types';
import styles from './FormulaireCard.module.css';

interface TypeConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  visite_initiale:      { label: 'Visite initiale',     icon: <MapPin size={18} />,         color: '#0468b1' },
  controle_mensuel:     { label: 'Contrôle mensuel',     icon: <ClipboardCheck size={18} />, color: '#059669' },
  signalement_incident: { label: 'Signalement incident', icon: <TriangleAlert size={18} />,  color: '#d97706' },
};

const DEFAULT_TYPE: TypeConfig = {
  label: 'Formulaire',
  icon: <ClipboardList size={18} />,
  color: '#6b7280',
};

interface FormulaireCardProps {
  formulaire: FormulaireCollecte;
  siteId?: string;
}

export function FormulaireCard({ formulaire, siteId }: FormulaireCardProps) {
  const champsActifs       = formulaire.champs.filter((c) => c.actif).length;
  const champsObligatoires = formulaire.champs.filter((c) => c.obligatoire && c.actif).length;
  const typeConfig         = TYPE_CONFIG[formulaire.typeFormulaire] ?? DEFAULT_TYPE;
  const canFill            = formulaire.statut === 'publie';

  const href = siteId
    ? `/formulaires/${formulaire.id}/saisir?siteId=${siteId}`
    : `/formulaires/${formulaire.id}/saisir`;

  return (
    <div
      className={styles.card}
      data-statut={formulaire.statut}
      style={{ '--type-color': typeConfig.color } as React.CSSProperties}
    >
      {/* Icône typée */}
      <div className={styles.icon} aria-hidden="true">
        {typeConfig.icon}
      </div>

      {/* Contenu principal */}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.typePill}>{typeConfig.label}</span>
          <Badge variant={STATUT_FORMULAIRE_VARIANT[formulaire.statut]}>
            {STATUT_FORMULAIRE_LABEL[formulaire.statut]}
          </Badge>
        </div>

        <h3 className={styles.titre}>{formulaire.titre}</h3>

        {formulaire.description ? (
          <p className={styles.description}>{formulaire.description}</p>
        ) : null}

        {/* Footer meta */}
        <div className={styles.footer}>
          <span className={styles.codePill}>
            <Hash size={10} />
            {formulaire.code}
          </span>
          <span className={styles.metaItem}>
            <Layers size={12} />
            {champsActifs} champ{champsActifs > 1 ? 's' : ''}
            {champsObligatoires > 0
              ? ` · ${champsObligatoires} oblig.`
              : ''}
          </span>
          <span className={styles.metaItem}>v{formulaire.version}</span>
        </div>
      </div>

      {/* CTA */}
      {canFill ? (
        <Link to={href} className={styles.action} aria-label={`Remplir ${formulaire.titre}`}>
          Remplir
          <ChevronRight size={15} />
        </Link>
      ) : (
        <span className={styles.actionDisabled} aria-disabled="true">
          Non disponible
        </span>
      )}
    </div>
  );
}
