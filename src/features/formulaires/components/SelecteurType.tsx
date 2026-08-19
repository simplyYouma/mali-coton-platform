import { Modal } from '@/components/common';
import { ICONE_TYPE, LIBELLE_TYPE } from '../pages/StructureFormulairePage';
import type { TypeChampNatif } from '../api/formulairesNatifs.types';
import styles from './SelecteurType.module.css';

/** Types groupés par famille : le choix se fait par intention, pas par liste à plat. */
const FAMILLES: Array<{ titre: string; types: Array<{ type: TypeChampNatif; aide: string }> }> = [
  {
    titre: 'Texte',
    types: [
      { type: 'TEXTE', aide: 'Réponse courte sur une ligne' },
      { type: 'TEXTE_LONG', aide: 'Paragraphe, observations libres' },
    ],
  },
  {
    titre: 'Nombre',
    types: [
      { type: 'ENTIER', aide: 'Effectif, année, quantité entière' },
      { type: 'DECIMAL', aide: 'Mesure à virgule (pH, m³…)' },
    ],
  },
  {
    titre: 'Choix',
    types: [
      { type: 'CHOIX_SIMPLE', aide: 'Une seule réponse possible' },
      { type: 'CHOIX_MULTIPLE', aide: 'Plusieurs réponses possibles' },
    ],
  },
  {
    titre: 'Autre',
    types: [
      { type: 'DATE', aide: 'Date de visite, d’enquête' },
      { type: 'GEOPOINT', aide: 'Coordonnées GPS relevées sur place' },
      { type: 'FICHIER', aide: 'Photo prise avec l’appareil, document' },
    ],
  },
];

interface SelecteurTypeProps {
  open: boolean;
  onClose: () => void;
  onChoisir: (type: TypeChampNatif) => void;
}

export function SelecteurType({ open, onClose, onChoisir }: SelecteurTypeProps) {
  return (
    <Modal open={open} onClose={onClose} title="Ajouter une question" width={640}>
      <div className={styles.familles}>
        {FAMILLES.map((famille) => (
          <section key={famille.titre} className={styles.famille}>
            <h3 className={styles.familleTitre}>{famille.titre}</h3>
            <div className={styles.grille}>
              {famille.types.map(({ type, aide }) => {
                const Icone = ICONE_TYPE[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className={styles.tuile}
                    onClick={() => onChoisir(type)}
                  >
                    <span className={styles.tuileIcone} aria-hidden="true">
                      <Icone size={16} />
                    </span>
                    <span className={styles.tuileNom}>{LIBELLE_TYPE[type]}</span>
                    <span className={styles.tuileAide}>{aide}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
